import express from 'express';
import bodyParser from 'body-parser';
import { queryChatGPT } from './api/chatgpt.js';
import { initializeFiles, generateUserToken, syncContextData, requestBody, deleteFirstMessage, clearDialog, isValidAdminToken, isValidUserToken, loadData, saveData } from './utils/dbManager.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from 'console';
import axios from 'axios';
import fs from 'fs';
import { pipeline }  from 'stream';
import { promisify }  from 'util';
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


// Эндпоинт для создания ограниченного пользовательского токена
app.post('/generate-user-token', async (req, res) => {
  const { token, userName } = req.body;

  if (!await isValidAdminToken(token)) {
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  }

  try {
    console.log('Запрос на создание токена для пользователя:', userName );
    const newUserToken = await generateUserToken(userName);

    res.send({
      success: true,
      id: newUserToken.id, // возвращаем ID пользователя
      tokens: newUserToken['tokens-gpt'] // возвращаем токены
    });
  } catch (error) {
    console.error('Ошибка при создании токена для пользователя:', error.message, error.stack);
    res.status(500).send({
      success: false,
      message: error.message
    });
  }
});

app.get('/user-tokens', async (req, res) => {
  const { token, userName } = req.query; 
  if (!await isValidAdminToken(token)) {
    res.status(401).send({ success: false, message: 'Invalid admin token' });
    return;
  }

  try {
    const tokensData = await loadData(userTokensFilePath);
    const tokenEntry = tokensData.tokens.find(t => t.id === userName);
    console.log(tokenEntry)
    if (tokenEntry) {
      res.send({
        success: true,
        id: tokenEntry.id, // Возвращаем ID пользователя
        tokens: tokenEntry.tokens_gpt // Возвращаем токены
      });
    } else {
      res.status(404).send({
        success: false,
        message: 'User token not found'
      });
    }
  } catch (error) {
    console.error('Error retrieving tokens:', error.message, error.stack);
    res.status(500).send({
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

      let headersSent = false; // Инициализация контрольного флага

      res.sendFile(filePath, err => {
        if (err) {
          console.error('Ошибка при отправке файла: ', err);
          if (!headersSent) { // Проверка флага перед отправкой ответа
            headersSent = true;
            res.status(500).send({ success: false, message: 'Ошибка при отправке файла' });
          }
        } else {
          const tokensUsed = response.config.headers['Content-Length']; // Примерное количество использованных токенов для текстового сообщения
          console.log(`Использовано ${tokensUsed} токенов`);
          if (!headersSent) { // Проверка флага перед отправкой ответа
            headersSent = true;
            res.status(201).json({
              success: true,
              tokensUsed: tokensUsed
            });
          }
        }
        fs.unlinkSync(filePath); // Удаляем файл после отправки
      });
    } else {
      console.error('Ошибка при запросе к API: ', response.status, response.statusText);
      res.status(response.status).send({ success: false, message: `Ошибка при запросе к API: ${response.statusText}` });
    }
  } catch (error) {
    console.error('Ошибка при преобразовании текста в голос: ', error.message);
    res.status(500).send({ success: false, message: error.message });
  }
});



app.post('/update-user-token', async (req, res) => {
  const { token, userName, newToken, operation } = req.body;
  if (!await isValidAdminToken(token)) {
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  }

  try {
    const tokensData = await loadData(userTokensFilePath);
    const userTokenEntry = tokensData.tokens.find(t => t.id === userName);
    if (userTokenEntry) {
      if(operation == "add"){
        userTokenEntry.tokens_gpt = userTokenEntry.tokens_gpt + newToken;
      }
      if(operation == "subtract"){
        userTokenEntry.tokens_gpt = userTokenEntry.tokens_gpt - newToken;
      }
      await saveData(userTokensFilePath, tokensData);
      res.send({
        success: true,
        message: `Токен пользователя ${userName} успешно обновлен`,
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






app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
