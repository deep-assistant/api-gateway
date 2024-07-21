import express from 'express';
import bodyParser from 'body-parser';
import { queryChatGPT } from './api/chatgpt.js';
import { initializeFiles, generateUserToken, generateAdminToken, addNewMessage, addNewDialogs, requestBody, deleteFirstMessage, clearDialog, isValidAdminToken, isValidUserToken, loadData, saveData } from './utils/dbManager.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from 'console';
import axios from 'axios';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
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
  let logs = '\n Проверка токена админа...'
  if (!await isValidAdminToken(token)) {
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  } else logs += `\n Токен Админа "${token}" найден`

  logs += '\n Проверка пользователя...'
  const userToken = await checkAndGenerateUserToken(userNameToken);
  if (!await isValidUserToken(userNameToken)) {
    logs += `\n Пользователя с id "${userNameToken}" не существует. Создается новый...`;
    const tokensData = generateUserToken(await loadData(userTokensFilePath))
    logs += `\n Создан новый пользователь ${tokensData}`
  } else logs += `\n Пользователь с id "${userNameToken}" найден`

  logs += '\n Отправка сообщения нейросети...'
  try {
    const newTokenLimit = tokenLimit+999999999
    logs += `\n Пробую модель ${model}...`
    let chatGptResponse = await queryChatGPT(query, userToken.id, dialogName, model, systemMessageContent, newTokenLimit, singleMessage, token);
    if (!chatGptResponse.success) {
      logs += `\n Ошибка`
      logs += `\n Пробую модель "gpt-3.5-turbo"...`
      chatGptResponse = await queryChatGPT(query, userToken.id, dialogName, 'gpt-3.5-turbo', systemMessageContent, newTokenLimit, singleMessage, token);
      if (!chatGptResponse.success) {
        logs += `\n Ошибка`
        logs += `\n Пробую модель "nvidia/Nemotron-4-340B-Instruct"...`
        chatGptResponse = await queryChatGPT(query, userToken.id, dialogName, 'nvidia/Nemotron-4-340B-Instruct', systemMessageContent, newTokenLimit, singleMessage, token);
        if (!chatGptResponse.success) {
          res.status(500).send({ success: false, message: chatGptResponse.error });
          return;
        }
      }
    }
    logs += `\n Ответ получен ${chatGptResponse.response}`
    logs += `\n Потрачено токенов ${chatGptResponse.allTokenSent}`
    res.send({
      success: true,
      response: chatGptResponse.response,
      token_spent: chatGptResponse.allTokenSent,
      logs: logs,
      model: chatGptResponse.model
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
  let logs = '\n Проверка токена админа...'
  if (type === 'admin' && admin_token !== process.env.ADMIN_FIRST) {
    res.status(401).send({ success: false, message: 'Неверный токен главного администратора' });
    return;
  }

  if (!await isValidAdminToken(admin_token)) {
    logs += `\n Неверный токен администратора "${admin_token}"`
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  } else logs += `\n Токен Админа "${admin_token}" найден`

  try {
    let newUserToken;
    if (type === 'admin') {
      logs += `\n Запрос на создание токена для админа`
      newUserToken = await generateAdminToken(tokenNum);
    } else if (type === 'user') {
      logs += `\n Запрос на создание токена для юзера: ${userName}`
      newUserToken = await generateUserToken(userName);
    } else {
      logs += `\n Неверный тип пользователя: ${type}`
      res.status(400).send({ success: false, message: 'Неверный тип пользователя' });
      return;
    }
    logs += `\n Новый токен создан: ${newUserToken.id}`
    res.send({
      success: true,
      tokenName: newUserToken.id,
      tokensNum: newUserToken.tokens_gpt,
      logs: logs
    });
  } catch (error) {
    console.error('Ошибка при создании токена:', error.message, error.stack);
    res.status(500).send({
      success: false,
      message: error.message,
      logs: logs
    });
  }
});

app.get('/tokens', async (req, res) => {
  const { admin_token, tokenName, type } = req.query;
  let logs = '\n Проверка токена админа...'
  if (!await isValidAdminToken(admin_token)) {
    logs += `\n Неверный токен администратора "${admin_token}"`
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  } else logs += `\n Токен Админа "${admin_token}" найден`

  try {
    let filePath;
    if (type === 'admin') {
      filePath = tokensFilePath;
    } else if (type === 'user') {
      filePath = userTokensFilePath;
    } else {
      logs += `\n Неверный тип пользователя: ${type}`
      res.status(400).send({ success: false, message: 'Неверный тип пользователя' });
      return;
    }
    logs += `\n Поиск токена пользователя: ${tokenName}`
    const tokensData = await loadData(filePath);
    const tokenEntry = tokensData.tokens.find(t => t.id === tokenName);
    if (tokenEntry) {
      logs += `\n Токен пользователя найден: ${tokenEntry.id}`
      res.send({
        success: true,
        id: tokenEntry.id,
        tokens: tokenEntry.tokens_gpt,
        logs: logs
      });
    } else {
      logs += `\n Пользователь с токеном ${tokenName} не найден`
      res.status(404).send({
        success: false,
        message: 'Пользователь не найден',
        logs: logs
      });
    }
  } catch (error) {
    console.error('Error retrieving tokens:', error.message, error.stack);
    res.status(500).send({
      success: false,
      message: error.message,
      logs: logs
    });
  }
});

app.get('/dialog-history', async (req, res) => {
  const { token, dialogName } = req.query;
  let logs = '\n Проверка токена админа...'
  if (!await isValidAdminToken(token)) {
    logs += `\n Неверный токен администратора "${token}"`
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  } else logs += `\n Токен Админа "${token}" найден`

  logs += `\n Запрос истории диалога: ${dialogName}`
  try {
    const history = await requestBody(dialogName);
    logs += `\n История диалога получена`
    res.send({
      success: true,
      history,
      logs: logs
    });
  } catch (error) {
    console.error('Ошибка при получении истории диалога:', error.message, error.stack);
    logs += `\n Ошибка при получении истории диалога: ${error.message}`
    res.status(500).send({
      success: false,
      message: error.message,
      logs: logs
    });
  }
});

app.post('/clear-dialog', async (req, res) => {
  const { token, dialogName } = req.body;
  let logs = '\n Проверка токена админа...'
  if (!await isValidAdminToken(token)) {
    logs += `\n Неверный токен администратора "${token}"`
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  } else logs += `\n Токен Админа "${token}" найден`

  logs += `\n Очистка диалога: ${dialogName}`
  try {
    const success = await clearDialog(dialogName);
    if (success) {
      logs += `\n Диалог "${dialogName}" успешно очищен`
      res.send({ 
        success: true, 
        message: `Диалог "${dialogName}" успешно очищен.`,
        logs: logs 
      });
    } else {
      logs += `\n Диалог "${dialogName}" не найден`
      res.status(404).send({ 
        success: false, 
        message: `Диалог "${dialogName}" не найден.`,
        logs: logs 
      });
    }
  } catch (error) {
    console.error('Ошибка при очистке диалога:', error.message, error.stack);
    logs += `\n Ошибка при очистке диалога: ${error.message}`
    res.status(500).send({
      success: false,
      message: error.message,
      logs: logs
    });
  }
});

app.post('/update-token', async (req, res) => {
  const { tokenAdmin, userToken, addTokenNum, operation, type } = req.body;
  let logs = '\n Проверка токена админа...'

  if (type == 'admin' && tokenAdmin != process.env.ADMIN_FIRST) {
    logs += `\n Неверный токен главного администратора "${tokenAdmin}"`
    res.status(401).send({ success: false, message: 'Неверный токен главного администратора' });
    return;
  }

  if (!await isValidAdminToken(tokenAdmin)) {
    logs += `\n Неверный токен администратора "${tokenAdmin}"`
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  } else logs += `\n Токен Админа "${tokenAdmin}" найден`

  try {
    let filePath;
    if (type === 'admin') {
      filePath = tokensFilePath;
    } else if (type === 'user') {
      filePath = userTokensFilePath;
    } else {
      logs += `\n Неверный тип пользователя: ${type}`
      res.status(400).send({ success: false, message: 'Неверный тип пользователя' });
      return;
    }
    logs += `\n Обновление токена пользователя: ${userToken}`
    const tokensData = await loadData(filePath);
    const userTokenEntry = tokensData.tokens.find(t => t.id === userToken);
    if (userTokenEntry) {
      if (operation == "add" || operation == undefined) {
        userTokenEntry.tokens_gpt += addTokenNum;
        logs += `\n Токен пользователя ${userToken} увеличен на ${addTokenNum}`
      }
      if (operation == "subtract") {
        userTokenEntry.tokens_gpt -= addTokenNum;
        logs += `\n Токен пользователя ${userToken} уменьшен на ${addTokenNum}`
      }
      await saveData(filePath, tokensData);
      res.send({
        success: true,
        message: `Токен пользователя ${userToken} успешно обновлен`,
        tokens: userTokenEntry.tokens_gpt,
        logs: logs
      });
    } else {
      logs += `\n Токен пользователя ${userToken} не найден`
      res.status(404).send({
        success: false,
        message: 'Токен пользователя не найден',
        logs: logs
      });
    }
  } catch (error) {
    console.error('Ошибка при обновлении токена пользователя:', error.message, error.stack);
    logs += `\n Ошибка при обновлении токена пользователя: ${error.message}`
    res.status(500).send({
      success: false,
      message: error.message,
      logs: logs
    });
  }
});

app.post('/add-admin-message', async (req, res) => {
  const { token, dialogName, message } = req.body;
  let logs = '\n Проверка токена админа...'
  if (!await isValidAdminToken(token)) {
    logs += `\n Неверный токен администратора "${token}"`
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  } else logs += `\n Токен Админа "${token}" найден`

  logs += `\n Добавление сообщения в диалог: ${dialogName}`
  try {
    let newDialog = false;
    let messageHistory = await addNewMessage(dialogName, message, 'user', message)
    if (messageHistory == undefined) {
      newDialog = true;
      messageHistory = await addNewDialogs(dialogName, message, 'user', message)
      logs += `\n Новый диалог создан: ${dialogName}`
    } else {
      logs += `\n Сообщение добавлено в диалог: ${dialogName}`
    }
    res.send({
      success: true,
      message: message,
      newDialog: newDialog,
      logs: logs
    });
  } catch (error) {
    console.error('Ошибка при добавлении сообщения от админа:', error.message, error.stack);
    logs += `\n Ошибка при добавлении сообщения от админа: ${error.message}`
    res.status(500).send({
      success: false,
      message: error.message,
      logs: logs
    });
  }
});

app.post('/text-to-speech', async (req, res) => {
  const { token, text } = req.body;
  let logs = '\n Проверка токена админа...'
  if (!await isValidAdminToken(token)) {
    logs += `\n Неверный токен администратора "${token}"`
    res.status(401).send({ success: false, message: 'Invalid admin token' });
    return;
  } else logs += `\n Токен Админа "${token}" найден`

  logs += `\n Преобразование текста в речь: ${text}`
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
      logs += `\n Аудиофайл успешно сохранён как speech.ogg`

      res.setHeader('Content-Type', 'audio/ogg');
      res.setHeader('Content-Length', response.data.length);

      await asyncPipeline(
        fs.createReadStream(filePath),
        res
      );

      const tokensUsed = response.data.length; // Примерное количество использованных токенов для текстового сообщения
      logs += `\n Использовано ${tokensUsed} токенов`

      fs.unlinkSync(filePath); // Удаляем файл после отправки
    } else {
      logs += `\n Ошибка при запросе к API: ${response.statusText}`
      console.error('Ошибка при запросе к API: ', response.status, response.statusText);
      res.status(response.status).send({ 
        success: false, 
        message: `Ошибка при запросе к API: ${response.statusText}`,
        logs: logs
      });
    }
  } catch (error) {
    console.error('Ошибка при преобразовании текста в голос: ', error.message);
    logs += `\n Ошибка при преобразовании текста в голос: ${error.message}`
    res.status(500).send({ 
      success: false, 
      message: error.message,
      logs: logs 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

