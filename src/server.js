import express from 'express';
import bodyParser from 'body-parser';
import { queryChatGPT } from './api/chatgpt.js';
import { initializeFiles, generateUserToken, generateAdminToken, addNewMessage, addNewDialogs, requestBody, deleteFirstMessage, clearDialog, isValidAdminToken, isValidUserToken, loadData, saveData } from './utils/dbManager.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from 'console';
import axios from 'axios';
import fs from 'fs';
import { pipeline }  from 'stream';
import { promisify }  from 'util';
import { multipartFormRequestOptions } from 'openai/uploads.mjs';
const asyncPipeline = promisify(pipeline);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokensFilePath = path.join(__dirname, 'db', 'tokens.json');
const dialogsFilePath = path.join(__dirname, 'db', 'dialogs.json');
const userTokensFilePath = path.join(__dirname, 'db', 'user_tokens.json');

const app = express();
const PORT = process.env.PORT;

app.use(bodyParser.json());

// Исправленный путь к файлу токенов пользователей

initializeFiles();

async function checkAndGenerateUserToken(userName) {
  let tokensData = await loadData(userTokensFilePath);
  if (!tokensData || !tokensData.tokens) {
    tokensData = { tokens: [] };
  }
  let userToken = tokensData.tokens.find(token => token.id === userName);
  if (!userToken) {
    userToken = await generateUserToken(userName); // Лимиты по умолчанию
  }
  return userToken;
}

app.post('/chatgpt', async (req, res) => {
  const { token, query, dialogName, model, systemMessageContent, tokenLimit, singleMessage, userNameToken } = req.body;

  const userToken = await checkAndGenerateUserToken(userNameToken);
  if (!await isValidUserToken(userNameToken)) {
    res.status(401).send({ success: false, message: 'Неверный пользовательский токен' });
    return;
  }

  try {
    const chatGptResponse = await queryChatGPT(query, userToken.id, dialogName, model, systemMessageContent, tokenLimit, singleMessage, token);
    if (!chatGptResponse.success) {
      console.log('chatGptResponse.success-----------')
      res.status(500).send({ success: false, message: chatGptResponse.error });
      return;
    }
    res.send({
      success: true,
      response: chatGptResponse.response,
      token_spent: chatGptResponse.allTokenSent

    });
  } catch (error) {
    res.status(error.message.includes('Превышен лимит использования токенов.') ? 429 : 500).send({
      success: false,
      message: error.message
    });
  }
});


app.post('/generate-token', async (req, res) => {
  const { admin_token, tokenNum, userName, type } = req.body;

  if (type === 'admin') {
    if (admin_token !== process.env.ADMIN_FIRST) {
      return res.status(401).send({ success: false, message: 'Неверный токен главного администратора' });
    }
  }

  if (!await isValidAdminToken(admin_token)) {
    return res.status(401).send({ success: false, message: 'Неверный токен администратора' });
  }

  try {
    let newUserToken;
    if (type === 'admin') {
      console.log('Запрос на создание токена для админа');
      newUserToken = await generateAdminToken(tokenNum);

    } else if (type === 'user') {
      console.log('Запрос на создание токена для юзера:', userName);
      newUserToken = await generateUserToken(userName);
    } else {
      return res.status(400).send({ success: false, message: 'Неверный тип пользователя' });
    }
    console.log(newUserToken, 'newUserToken----')
    return res.send({
      success: true,
      tokenName: newUserToken.id,
      tokensNum: newUserToken.tokens_gpt
    });
  } catch (error) {
    console.error('Ошибка при создании токена:', error.message, error.stack);
    return res.status(500).send({
      success: false,
      message: error.message
    });
  }
});


app.get('/tokens', async (req, res) => {
  const { admin_token, tokenName, type } = req.query;
  if (!await isValidAdminToken(admin_token)) {
    return res.status(401).send({ success: false, message: 'Invalid admin token' });
  }

  try {
    let filePath;
    if (type === 'admin') {
      filePath = tokensFilePath;
    } else if (type === 'user') {
      filePath = userTokensFilePath;
    } else {
      return res.status(400).send({ success: false, message: 'Неверный тип пользователя' });
    }
    const tokensData = await loadData(filePath);
    const tokenEntry = tokensData.tokens.find(t => t.id === tokenName);
    if (tokenEntry) {
      return res.send({
        success: true,
        id: tokenEntry.id,
        tokens: tokenEntry.tokens_gpt
      });
    } else {
      return res.status(404).send({
        success: false,
        message: 'User token not found'
      });
    }
  } catch (error) {
    console.error('Error retrieving tokens:', error.message, error.stack);
    return res.status(500).send({
      success: false,
      message: error.message
    });
  }
});




// Эндпоинт для получения тела запроса истории диалога
app.get('/dialog-history', async (req, res) => {
  const { token, dialogName } = req.query;

  if (!await isValidAdminToken(token)) {
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  }

  try {
    const history = await requestBody(dialogName);
    
    res.send({
      success: true,
      history
    });
  } catch (error) {
    console.error('Ошибка при получении истории диалога:', error.message, error.stack);
    res.status(500).send({
      success: false,
      message: error.message
    });
  }
});

// Эндпоинт для очистки диалога
app.post('/clear-dialog', async (req, res) => {
  const { token, dialogName } = req.body;

  if (!await isValidAdminToken(token)) {
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  }

  try {
    const success = await clearDialog(dialogName);
    if (success) {
      res.send({ success: true, message: `Диалог "${dialogName}" успешно очищен.` });
    } else {
      res.status(404).send({ success: false, message: `Диалог "${dialogName}" не найден.` });
    }
  } catch (error) {
    console.error('Ошибка при очистке диалога:', error.message, error.stack);
    res.status(500).send({
      success: false,
      message: error.message
    });
  }
});



app.post('/update-token', async (req, res) => {
  const { tokenAdmin, userToken, addTokenNum, operation, type } = req.body;

  if(type == 'admin'){
    if (tokenAdmin != process.env.ADMIN_FIRST) {
      res.status(401).send({ success: false, message: 'Неверный токен главного администратора' });
      return;
    }
  }
  if (!await isValidAdminToken(tokenAdmin)) {
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  }


  try {
    let filePath;

    if (type === 'admin') {
      filePath = tokensFilePath;
    } else if (type === 'user') {
      filePath = userTokensFilePath;
    } else {
      return res.status(400).send({ success: false, message: 'Неверный тип пользователя' });
    }
    const tokensData = await loadData(filePath);
    const userTokenEntry = tokensData.tokens.find(t => t.id === userToken);
    if (userTokenEntry) {
      if(operation == "add" || operation == undefined){
        userTokenEntry.tokens_gpt = userTokenEntry.tokens_gpt + addTokenNum;
      }
      if(operation == "subtract"){
        userTokenEntry.tokens_gpt = userTokenEntry.tokens_gpt - addTokenNum;
      }
      await saveData(filePath, tokensData);
      res.send({
        success: true,
        message: `Токен пользователя ${userToken} успешно обновлен`,
        tokens: userTokenEntry.tokens_gpt
      });
    } else {
      res.status(404).send({
        success: false,
        message: 'Токен пользователя не найден'
      });
    }
  } catch (error) {
    console.error('Ошибка при обновлении токена пользователя:', error.message, error.stack);
    res.status(500).send({
      success: false,
      message: error.message
    });
  }
});



app.post('/add-admin-message', async (req, res) => {
  const { token, dialogName, message } = req.body;
  if (!await isValidAdminToken(token)) {
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  }
  console.log(message)
  try {
    let newDialog = false;
    let messageHistory = await addNewMessage(dialogName, message, 'user', message)
    if(messageHistory==undefined){
      newDialog = true;
      messageHistory = await addNewDialogs(dialogName, message, 'user', message)
    }
    res.send({
      success: true,
      message: message,
      newDialog: newDialog 
    });
  } catch (error) {
    console.error('Ошибка при добавления отдельного сообщения от админа', error.message, error.stack);
    res.status(500).send({
      success: false,
      message: error.message
    });
  }
});


app.post('/text-to-speech', async (req, res) => {
  const { token, text } = req.body;

  if (!await isValidAdminToken(token)) {
    return res.status(401).send({ success: false, message: 'Invalid admin token' });
  }

  try {
    const apiKey = process.env.AZURE_OPENAI_KEY_TTS; 
    const url = process.env.AZURE_OPENAI_ENDPOINT_TTS;
    const headers = {
      "api-key": apiKey,
      "Content-Type": "application/json"
    };
    const data = {
      "model": "tts-hd",
      "input": text,
      "voice": "alloy"
    };

    const response = await axios.post(url, data, { headers, responseType: 'arraybuffer' });

    if (response.status === 200) {
      const filePath = path.join(__dirname, 'speech.ogg');
      fs.writeFileSync(filePath, response.data);
      console.log('Аудиофайл успешно сохранён как speech.ogg ', response.config.headers['Content-Length']);

      res.setHeader('Content-Type', 'audio/ogg');
      res.setHeader('Content-Length', response.config.headers['Content-Length']);

      await asyncPipeline(
        fs.createReadStream(filePath),
        res
      );

      const tokensUsed = response.config.headers['Content-Length']; // Примерное количество использованных токенов для текстового сообщения
      console.log(`Использовано ${tokensUsed} токенов`);

      fs.unlinkSync(filePath); // Удаляем файл после отправки
    } else {
      console.error('Ошибка при запросе к API: ', response.status, response.statusText);
      res.status(response.status).send({ success: false, message: `Ошибка при запросе к API: ${response.statusText}` });
    }
  } catch (error) {
    console.error('Ошибка при преобразовании текста в голос: ', error.message);
    res.status(500).send({ success: false, message: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
