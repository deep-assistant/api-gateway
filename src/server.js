import express from 'express';
import bodyParser from 'body-parser';
import { queryChatGPT } from './api/chatgpt.js';
import { makeDeepClient, generateToken, syncContextData, updateTokensData, selectTokensData, requestBody, isValidAdminToken } from './utils/dbManager.js';
import path from 'path';

const app = express();
const PORT = process.env.PORT;

//const tokensFilePath = path.join(path.dirname(''), 'src', 'db', 'tokens.json');

// Создаем клиента Deep в начале кода
const deep = makeDeepClient(process.env.GQL_TOKEN);

app.use(bodyParser.json());

app.post('/chatgpt', async (req, res) => {
  const { token, query, dialogName, model, systemMessageContent, tokenLimit, singleMessage, userNameToken } = req.body;

  if (!await isValidAdminToken(token)) {
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  }

  try {
    const spaceIdArgument = process.env.SPACE_ID_ARGUMENT;

    await syncContextData(dialogName, query, 'user', systemMessageContent, spaceIdArgument, deep, userNameToken, token);
    
    const chatGptResponse = await queryChatGPT(query, token, dialogName, model, systemMessageContent, tokenLimit, singleMessage);

    if (!chatGptResponse.success) {
      res.status(500).send({ success: false, message: chatGptResponse.error });
      return;
    }

    res.send({
      success: true,
      response: chatGptResponse.response,
      tokensUsed: {
        requestTokensUsed: chatGptResponse.requestTokensUsed,
        responseTokensUsed: chatGptResponse.responseTokensUsed
      },
      remainingTokens: {
        remainingUserTokens: chatGptResponse.remainingUserTokens,
        remainingChatGptTokens: chatGptResponse.remainingChatGptTokens
      }
    });
  } catch (error) {
    console.error('Ошибка:', error.message, error.stack);
    res.status(error.message.includes('Превышен лимит использования токенов.') ? 429 : 500).send({
      success: false,
      message: error.message
    });
  }
});

// Эндпоинт для создания ограниченного токена в Deep
app.post('/generate-token', async (req, res) => {
  const { token, userName, userTokenLimit, chatGptTokenLimit } = req.body;

  if (!await isValidAdminToken(token)) {
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  }

  try {
    console.log('Запрос на создание токена:', { userName, userTokenLimit, chatGptTokenLimit });
    const newTokenId = await generateToken(deep, userName, process.env.SPACE_ID_ARGUMENT, userTokenLimit, chatGptTokenLimit);
    
    res.send({
      success: true,
      tokenId: newTokenId
    });
  } catch (error) {
    console.error('Ошибка при создании токена:', error.message, error.stack);
    res.status(500).send({
      success: false,
      message: error.message
    });
  }
});

// Эндпоинт для обновления токенов
app.post('/update-token', async (req, res) => {
  const { token, userName, newUserTokenLimit, newChatGptTokenLimit } = req.body;

  if (!await isValidAdminToken(token)) {
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  }

  try {
    await updateTokensData(deep, userName, newUserTokenLimit, newChatGptTokenLimit);
    
    res.send({
      success: true,
      message: 'Token limits updated successfully'
    });
  } catch (error) {
    console.error('Ошибка при обновлении токена:', error.message, error.stack);
    res.status(500).send({
      success: false,
      message: error.message
    });
  }
});

// Эндпоинт для получения токенов пользователя
app.get('/tokens', async (req, res) => {
  const { token, userName } = req.body;

  if (!await isValidAdminToken(token)) {
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  }

  try {
    const tokens = await selectTokensData(deep, userName);
    
    res.send({
      success: true,
      tokens
    });
  } catch (error) {
    console.error('Ошибка при получении токенов:', error.message, error.stack);
    res.status(500).send({
      success: false,
      message: error.message
    });
  }
});

// Эндпоинт для получения тела запроса истории диалога
app.get('/dialog-history', async (req, res) => {
  const { token, dialogName } = req.body;

  if (!await isValidAdminToken(token)) {
    res.status(401).send({ success: false, message: 'Неверный токен администратора' });
    return;
  }

  try {
    const history = await requestBody(deep, dialogName);
    
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
