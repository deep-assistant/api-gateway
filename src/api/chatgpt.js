import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { saveData, syncContextData, loadData, requestBody, deleteFirstMessage } from '../utils/dbManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokensFilePath = path.join(__dirname, '..', 'db', 'tokens.json');
const dialogsFilePath = path.join(__dirname, '..', 'db', 'dialogs.json');
const userTokensFilePath = path.join(__dirname, '..', 'db', 'user_tokens.json');

let role = "";

// Конфигурация для моделей
const deploymentConfig = {
  'gpt-4o': {
      modelName: 'gpt-4o',
      endpoint: 'https://deep-ai-west-us-3.openai.azure.com/',
      apiKey: process.env.AZURE_OPENAI_KEY,
      apiVersion: '2023-03-15-preview'
  },
  'gpt-35-turbo-16k': {
      modelName: 'gpt-35-turbo-16k',
      endpoint: 'https://deep-ai.openai.azure.com/',
      apiKey: process.env.AZURE_OPENAI_KEY_TURBO,
      apiVersion: '2023-03-15-preview'
  }
};

async function queryChatGPT(userQuery, userToken, dialogName, model = 'gpt-4o', systemMessageContent = '', tokenLimit = Infinity, singleMessage = false, tokenAdmin) {
  const config = deploymentConfig[model] || deploymentConfig['gpt-4o']; 

  if (!config) {
    console.error(`Deployment config for ${model} not found`);
    return;
  }

  const validLimitToken = await loadData(tokensFilePath);
  const validLimitToken1 = await loadData(userTokensFilePath);
  const tokenBounded = validLimitToken.tokens.find(t => t.token === tokenAdmin);
  const tokenBounded1 = validLimitToken1.tokens.find(t => t.id === userToken);
  if (tokenBounded.used.user > tokenBounded.limits.user || tokenBounded.used.chatGpt > tokenBounded.limits.chatGpt) {
    console.log('Превышен лимит использования токенов Админа');
    throw new Error('Превышен лимит использования токенов Админа.');
  }
  if (tokenBounded1.tokens_gpt.user <= 0 || tokenBounded1.tokens_gpt.chatGpt <= 0) {
    console.log('Превышен лимит использования токенов Юзера');
    throw new Error('Превышен лимит использования токенов.');
  }

  if (!dialogName) {
    singleMessage = true;
  }

  const systemMessage = { role: 'system', content: systemMessageContent || 'You are chatting with an AI assistant.' };
  role = "user";
  const userMessage = { role: 'user', content: userQuery };

  const messageAllContextUser = singleMessage ? [systemMessage, userMessage] : await syncContextData(dialogName, userMessage.content, role, systemMessage.content);
  
  try {
    const endpointAll = `${config.endpoint}openai/deployments/${config.modelName}/chat/completions?api-version=${config.apiVersion}`;
    const response = await axios.post(endpointAll, { messages: messageAllContextUser }, {
      headers: { 'Content-Type': 'application/json', 'api-key': config.apiKey }
    });

    const gptReply = response.data.choices[0].message.content.trim();
    const requestTokensUsed = response.data.usage.prompt_tokens;
    const responseTokensUsed = response.data.usage.completion_tokens;

    tokenBounded.used.user += requestTokensUsed;
    tokenBounded.used.chatGpt += responseTokensUsed;
    tokenBounded1.tokens_gpt.user = tokenBounded1.tokens_gpt.user - requestTokensUsed;
    tokenBounded1.tokens_gpt.chatGpt = tokenBounded1.tokens_gpt.chatGpt - responseTokensUsed;
    await saveData(tokensFilePath, validLimitToken);
    await saveData(userTokensFilePath, validLimitToken1);

    if (!singleMessage) {
      const totalTokensUsed = requestTokensUsed + responseTokensUsed;
      if (totalTokensUsed > tokenLimit) {
        await deleteFirstMessage(dialogName);
      }
      role = "assistant";
      await syncContextData(dialogName, gptReply, role, systemMessage.content);
    }

    const remainingUserTokens = tokenBounded.limits.user - tokenBounded.used.user;
    const remainingChatGptTokens = tokenBounded.limits.chatGpt - tokenBounded.used.chatGpt;

    return {
      success: true,
      response: gptReply,
      requestTokensUsed,
      responseTokensUsed,
      remainingUserTokens,
      remainingChatGptTokens,
      history: await requestBody(dialogName)
    };
  } catch (error) {
    console.error('Ошибка при запросе к ChatGPT:', error);
    return {
      success: false,
      error: error.response ? error.response.data : error.message,
    };
  }
}

export { queryChatGPT };
