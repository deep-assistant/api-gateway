const axios = require('axios');
const path = require('path');
const { saveTokensData, syncContextData, loadData } = require('../utils/dbManager');
const tokensFilePath = path.join(__dirname, '..', 'db', 'tokens.json');
let role = "";
// Замените на свои данные
const deploymentConfig = {
  'gpt-4-128k': {
      modelName: process.env.GPT_MODEL_NAME,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_KEY,
      apiVersion: process.env.GPT_VERSION
  }
};
async function queryChatGPT(userQuery, token, dialogName) {
  const model = process.env.GPT_MODEL_NAME;
  const config = deploymentConfig[model];
  if (!config) {
      console.error(`Deployment config for ${config} not found`);
      return;
  }
  const validLimitToken = await loadData(tokensFilePath);
  //console.log(validLimitToken);
  const tokenBounded = validLimitToken.tokens.find(t => t.token === token);
  
  if (!tokenBounded || new Date(tokenBounded.expires) < new Date()) {
    throw new Error('Токен не действителен или уже истек.');
  }
  if (tokenBounded.used.user > tokenBounded.limits.user || 
    tokenBounded.used.chatGpt > tokenBounded.limits.chatGpt) {
    throw new Error('Превышен лимит использования токенов.');
}   
  role = "user"
  const messageAllContextUser = await syncContextData(dialogName, userQuery, role);
  //console.log(messageAllContextUser);
  try {
    const endpointAll = `${config.endpoint}/openai/deployments/${config.modelName}/chat/completions?api-version=${config.apiVersion}`;
    const response = await axios.post(endpointAll, {
        messages: messageAllContextUser,
    }, {
        headers: {
            'Content-Type': 'application/json',
            'api-key': config.apiKey
        }
    });
      const gptReply = response.data.choices[0].message.content.trim() 
      const requestTokensUsed = response.data.usage.prompt_tokens;
      const responseTokensUsed = response.data.usage.completion_tokens;
      tokenBounded.used.user += requestTokensUsed;
      tokenBounded.used.chatGpt += responseTokensUsed;
      await saveTokensData(validLimitToken);
      role = "assistant"
      const messageAllContextGpt = await syncContextData(dialogName, gptReply, role);
      console.log(messageAllContextGpt);
      return {
          success: true,
          response: gptReply,
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
