#!/usr/bin/env node

import { exec } from 'child_process'; // Импортируем exec с помощью import
import OpenAI from 'openai'; 


const openai = new OpenAI({
 apiKey: "",
 baseURL: "https://api.deep-foundation.tech/v1/"
});

async function main() {
 console.log('===================================================');
 console.log(' Starting update process');
 console.log('===================================================');


 // 1. Заливка изменений в test ветку
 await new Promise((resolve, reject) => {
  exec('git add . && git commit -m "Update from test" && git push origin test', (error, stdout, stderr) => {
   if (error) {
    console.error('Error pushing to test branch:', error);
    reject(error);
   } else {
    console.log(' Changes pushed to test branch');
    resolve();
   }
  });
 });

 // 2. Слияние test ветки с main веткой
 await new Promise((resolve, reject) => {
  exec('git checkout main && git merge test && git push origin main', (error, stdout, stderr) => {
   if (error) {
    console.error('Error merging test branch into main:', error);
    reject(error);
   } else {
    console.log(' Test branch merged into main');
    resolve();
   }
  });
 });

 // 3. Запуск docker-compose
 console.log(' Starting Docker Compose');
 await new Promise((resolve, reject) => {
  exec('docker-compose -f docker-compose.prod.yml up -d --build', { cwd: '/home/resale/resale-ai/resale-chat-azure' }, (error, stdout, stderr) => {
   if (error) {
    console.error('Error running Docker Compose:', error);
    reject(error);
   } else {
    console.log(' Docker Compose started');
    resolve();
   }
  });
 });

 // 4. Вывод логов docker
 console.log(' Fetching Docker logs');
 await new Promise((resolve, reject) => {
  exec('docker logs chat_proxy_prod', { cwd: '/home/resale/resale-ai/resale-chat-azure' }, (error, stdout, stderr) => {
   if (error) {
    console.error('Error fetching Docker logs:', error);
    reject(error);
   } else {
    console.log(' Docker logs:');
    console.log(stdout);
    resolve();
   }
  });
 });

 // 5. Выполнение OpenAI API запроса
 console.log(' Running OpenAI API request');
 const chatCompletion = await openai.chat.completions.create({
  messages: [{ role: 'user', content: 'Say this is a test' }],
  model: 'gpt-4o-mini',
 });
 console.log(' OpenAI response:');
 console.log(chatCompletion.choices[0].message.content);

 console.log('===================================================');
 console.log(' Update process completed');
 console.log('===================================================');
}

main();