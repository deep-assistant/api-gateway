const axios = require('axios');
const { AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, YOUR_DEPLOYMENT_NAME } = require('../config');
const { validateAndUpdateTokensUsage } = require('../utils/tokenManager');


// Замените на свои данные
const deploymentConfig = {
  'gpt-4-128k': {
      deploymentName: 'gpt-4-128k',
      modelName: 'gpt-4-128k',
      endpoint: AZURE_OPENAI_ENDPOINT,
      apiKey: AZURE_OPENAI_KEY,
      apiVersion: '2023-07-01-preview'
  }
};

async function queryChatGPT(userQuery, token) {
  const model = 'gpt-4-128k';
  const config = deploymentConfig[model];
  if (!config) {
      console.error(`Deployment config for ${model} not found`);
      return;
  }

  const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
  };

  const data = {
      'max_tokens': 1000,
      'temperature': 0.8,
      'top_p': 1,
      'presence_penalty': 1,
      'messages': [
          {
              'role': 'system',
              'content': 'You are chatting with an AI assistant.'
          },
          {
              'role': 'user',
              'content': userQuery
          }
      ],
      'stream': true
  };

  try {
      const response = await axios.post(`${config.endpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`, data, { headers });
      console.log(response.data.choices[0].message.content.trim())
      const requestTokensUsed = response.data.usage.total_request_tokens;
      const responseTokensUsed = response.data.usage.total_response_tokens;
      console.log(requestTokensUsed)
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