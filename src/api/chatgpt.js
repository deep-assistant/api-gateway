
import axios from 'axios';
import path, { dirname } from 'path';
import { saveTokensData, syncContextData, loadData, makeDeepClient, requestBody, deleteFirstMessage } from '../utils/dbManager.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tokensFilePath = path.join(__dirname, '..', 'db', 'tokens.json');
const spaceIdArgument = process.env.SPACE_ID_ARGUMENT;
const token = process.env.GQL_TOKEN;
const GQL_URN = process.env.GQL_URN;
const GQL_SSL = process.env.GQL_SSL === 'true';

let role = "";

// Конфигурация для моделей
const deploymentConfig = {
  'gpt-4o': {
      modelName: 'gpt-4o',
      endpoint: 'https://deep-ai-west-us-3.openai.azure.com/',
      apiKey: process.env.AZURE_OPENAI_KEY,
      apiVersion: '2024-05-13'
  },
  'gpt-35-turbo-16k': {
      modelName: 'gpt-35-turbo-16k',
      endpoint: 'https://deep-ai.openai.azure.com/',
      apiKey: process.env.AZURE_OPENAI_KEY_TURBO,
      apiVersion: '2023-03-15-preview'
  }
};

async function queryChatGPT(userQuery, token, dialogName, model = 'gpt-4o', systemMessageContent = '', tokenLimit = Infinity, singleMessage = false) {
  const deep = makeDeepClient(token);
  const config = deploymentConfig[model] || deploymentConfig['gpt-4o']; // Если модель не найдена, используем gpt-4o
  if (!config) {
    console.error(`Deployment config for ${model} not found`);
    return;
  }

  const validLimitToken = await loadData(tokensFilePath);
  const tokenBounded = validLimitToken.tokens.find(t => t.token === token);
  if (!tokenBounded || new Date(tokenBounded.expires) < new Date()) {
    throw new Error('Токен не действителен или уже истек.');
  }
  if (tokenBounded.used.user > tokenBounded.limits.user || tokenBounded.used.chatGpt > tokenBounded.limits.chatGpt) {
    throw new Error('Превышен лимит использования токенов.');
  }

  if (!dialogName) {
    singleMessage = true;
  }

  const systemMessage = { role: 'system', content: systemMessageContent || 'You are chatting with an AI assistant.' };
  role = "user";
  const userMessage = { role: 'user', content: userQuery };

  const messageAllContextUser = singleMessage ? [systemMessage, userMessage] : await syncContextData(dialogName, userMessage.content, role, systemMessage.content, spaceIdArgument, deep);

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
    await saveTokensData(validLimitToken);

    if (!singleMessage) {
      // Логика обработки переполнения токенов
      const totalTokensUsed = requestTokensUsed + responseTokensUsed;
      if (totalTokensUsed > tokenLimit) {
        await deleteFirstMessage(deep, dialogName, spaceIdArgument, /* нужное значение для удаления */);
      }
      role = "assistant";
      await syncContextData(dialogName, gptReply, role, systemMessage.content, spaceIdArgument, deep);
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
      history: await requestBody(deep, dialogName) // Получаем историю диалога
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
