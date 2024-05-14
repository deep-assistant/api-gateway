const axios = require('axios');
const { validateAndUpdateTokensUsage, loadTokensData } = require('../utils/tokenManager');


// Замените на свои данные
const deploymentConfig = {
  'gpt-4-128k': {
      modelName: process.env.GPT_MODEL_NAME,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_KEY,
      apiVersion: process.env.GPT_VERSION
  }
};
async function queryChatGPT(userQuery, token) {
  const model = process.env.GPT_MODEL_NAME;
  const config = deploymentConfig[model];
  if (!config) {
      console.error(`Deployment config for ${config} not found`);
      return;
  }
  const validLimitToken = await loadTokensData();
  const tokenBounded = validLimitToken.tokens.find(t => t.token === token);
  if (tokenBounded.used.user > tokenBounded.limits.user || 
    tokenBounded.used.chatGpt > tokenBounded.limits.chatGpt) {
    throw new Error('Превышен лимит использования токенов.');
}   

  try {
    const endpointAll = `${config.endpoint}/openai/deployments/${config.modelName}/chat/completions?api-version=${config.apiVersion}`;
    const response = await axios.post(endpointAll, {
        messages: [{
            'role': 'system',
            'content': 'You are chatting with an AI assistant.'
        },
        {
            'role': 'user',
            'content': userQuery
        }]
    }, {
        headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey
        }
    });
      const requestTokensUsed = response.data.usage.prompt_tokens;
      const responseTokensUsed = response.data.usage.completion_tokens;
      await validateAndUpdateTokensUsage(token, requestTokensUsed, responseTokensUsed);

      return {
          success: true,
          response: response.data.choices[0].message.content.trim(),
          requestTokensUsed,
          responseTokensUsed
      };
  } catch (error) {
      console.error('Ошибка при запросе к ChatGPT:', error);
      return {
          success: false,
          error: error.response ? error.response.data : error.message,
      };
  }
}

module.exports = { queryChatGPT };
