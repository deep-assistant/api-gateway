const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const { saveTokensData, syncContextData, loadData, dialogsFilePath } = require('../utils/dbManager');
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

async function queryChatGPT(userQuery, token, dialogName, tokenLimit = Infinity, singleMessage = false) {
  const model = process.env.GPT_MODEL_NAME;
  const config = deploymentConfig[model];
  if (!config) {
    console.error(`Deployment config for ${config} not found`);
    return;
  }

  const validLimitToken = await loadData(tokensFilePath);
  const tokenBounded = validLimitToken.tokens.find(t => t.token === token);

  if (!tokenBounded || new Date(tokenBounded.expires) < new Date()) {
    throw new Error('Токен не действителен или уже истек.');
  }
  if (tokenBounded.used.user > tokenBounded.limits.user || 
      tokenBounded.used.chatGpt > tokenBounded.limits.chatGpt) {
    throw new Error('Превышен лимит использования токенов.');
  }

  // Если имя диалога не задано или пусто, включаем режим вопрос-ответ
  if (!dialogName) {
    singleMessage = true;
  }

  role = "user";
  const messageAllContextUser = singleMessage 
    ? [{ role: 'user', content: userQuery }] 
    : await syncContextData(dialogName, userQuery, role);

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

    const gptReply = response.data.choices[0].message.content.trim();
    const requestTokensUsed = response.data.usage.prompt_tokens;
    const responseTokensUsed = response.data.usage.completion_tokens;

    tokenBounded.used.user += requestTokensUsed;
    tokenBounded.used.chatGpt += responseTokensUsed;
    await saveTokensData(validLimitToken);

    if (!singleMessage) {
      await checkAndRemoveOldMessages(dialogName, requestTokensUsed + responseTokensUsed, tokenLimit);
      role = "assistant";
      await syncContextData(dialogName, gptReply, role);
    }

    const remainingUserTokens = tokenBounded.limits.user - tokenBounded.used.user;
    const remainingChatGptTokens = tokenBounded.limits.chatGpt - tokenBounded.used.chatGpt;

    return {
      success: true,
      response: gptReply,
      requestTokensUsed,
      responseTokensUsed,
      remainingUserTokens,
      remainingChatGptTokens
    };
  } catch (error) {
    console.error('Ошибка при запросе к ChatGPT:', error);
    return {
      success: false,
      error: error.response ? error.response.data : error.message,
    };
  }
}

async function checkAndRemoveOldMessages(dialogName, totalTokensUsed, tokenLimit) {
  let dialogs = await loadData(dialogsFilePath);  // dialogsFilePath теперь должен быть определен
  dialogs = dialogs.dialogs || [];

  let dialog = dialogs.find(d => d.name === dialogName);
  if (!dialog) return;

  // Удаляем старые сообщения, пока сумма токенов не будет меньше лимита
  while (totalTokensUsed > tokenLimit && dialog.messages.length > 1) {
    const removedMessage = dialog.messages.splice(1, 1)[0]; // Удаляем самое старое сообщение
    totalTokensUsed -= removedMessage.content.length; // Уменьшаем количество токенов на длину удаленного сообщения
  }
    // Сохраняем обновленные диалоги
    await fs.writeFile(dialogsFilePath, JSON.stringify({ dialogs }, null, 2));
  }
  
  module.exports = { queryChatGPT };