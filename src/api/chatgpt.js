
import axios from 'axios';
import { syncContextData, updateTokensData, makeDeepClient, requestBody, deleteFirstMessage, selectTokensData } from '../utils/dbManager.js';

const spaceIdArgument = process.env.SPACE_ID_ARGUMENT;

let role = "";

// Конфигурация для моделей
const deploymentConfig = {
  'gpt-4o': {
      modelName: 'gpt-4o',
      endpoint: 'https://deep-ai-west-us-3.openai.azure.com',
      apiKey: process.env.AZURE_OPENAI_KEY,
      apiVersion: '2023-03-15-preview'
  },
  'gpt-35-turbo-16k': {
      modelName: 'gpt-35-turbo-16k',
      endpoint: 'https://deep-ai.openai.azure.com',
      apiKey: process.env.AZURE_OPENAI_KEY_TURBO,
      apiVersion: '2023-03-15-preview'
  }
};

async function queryChatGPT(userQuery, token, dialogName, model = 'gpt-4o', systemMessageContent = '', tokenLimit = Infinity, singleMessage = true, userNameToken, token_GQL) {
  const deep = makeDeepClient(token_GQL);
  const config = deploymentConfig[model] || deploymentConfig['gpt-4o']; // Если модель не найдена, используем gpt-4o
  if (!config) {
    console.error(`Deployment config for ${model} not found`);
    return;
  }

  const validLimitToken = await selectTokensData(deep, userNameToken);

  if (!dialogName) {
    singleMessage = true;
  }

  const systemMessage = { role: 'system', content: systemMessageContent || 'You are chatting with an AI assistant.' };
  role = "user";
  const userMessage = { role: 'user', content: userQuery };
  const messageAllContextUser = singleMessage ? [systemMessage, userMessage] : await syncContextData(dialogName, userMessage.content, role, systemMessage.content, spaceIdArgument, deep);

  try {
    const endpointAll = `${config.endpoint}/openai/deployments/${config.modelName}/chat/completions?api-version=${config.apiVersion}`;
  
    console.log('Making request to endpoint:', endpointAll);  

    const response = await axios.post(endpointAll, {
      messages: messageAllContextUser,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey
      }
    });
    const gptReply = response.data.choices[0].message.content.trim();
    const requestTokensUsed = response.data.usage.prompt_tokens;
    const responseTokensUsed = response.data.usage.completion_tokens;
    const token_user = validLimitToken[0] - requestTokensUsed;
    const token_gpt = validLimitToken[1] - responseTokensUsed;

    await updateTokensData(deep, userNameToken, token_user, token_gpt);

    if (!singleMessage) {
      // Логика обработки переполнения токенов
      const totalTokensUsed = requestTokensUsed + responseTokensUsed;
      if (totalTokensUsed > tokenLimit) {
        await deleteFirstMessage(deep, dialogName, spaceIdArgument, 1);
      }
      role = "assistant";
      await syncContextData(dialogName, gptReply, role, systemMessage.content, spaceIdArgument, deep);
    }


    return {
      success: true,
      response: gptReply,
      requestTokensUsed,
      responseTokensUsed,
      token_user,
      token_gpt,
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
