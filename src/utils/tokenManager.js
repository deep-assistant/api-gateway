const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
  
// Путь к файлу с данными токенов
const tokensFilePath = path.join(__dirname, '..', 'tokens', 'tokens.json');

/**
 * Загрузка данных о токенах из хранилища.
 */
async function loadTokensData() {
  try {
    const data = await fs.readFile(tokensFilePath, { encoding: 'utf8' });
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при загрузке данных о токенах:', error);
    // Если файл отсутствует, возвращаем простую структуру
    return { tokens: [] };
  }
}

/**
 * Сохранение данных о токенах в хранилище.
 */
async function saveTokensData(tokensData) {
  try {
    const data = JSON.stringify(tokensData, null, 2);
    await fs.writeFile(tokensFilePath, data, { encoding: 'utf8' });
  } catch (error) {
    console.error('Ошибка при сохранении данных о токенах:', error);
  }
}

/**
 * Генерация нового токена с установленными ограничениями на использование.
 */
async function generateToken(expires, userTokenLimit, chatGptTokenLimit) {
  const tokensData = await loadTokensData();
  const newToken = {
    token: crypto.randomBytes(16).toString('hex'), // Генерация уникального токена
    expires,
    limits: {
      user: userTokenLimit,
      chatGpt: chatGptTokenLimit,
    },
    used: {
      user: 0,
      chatGpt: 0,
    },
  };
  tokensData.tokens.push(newToken);
  await saveTokensData(tokensData);
  return newToken;
}

/**
 * Проверка токена и обновление информации о потраченных токенах.
 */
async function validateAndUpdateTokensUsage(tokenString, usedUserTokens, usedChatGptTokens) {
    const tokensData = await loadTokensData();
    const token = tokensData.tokens.find(t => t.token === tokenString);
  
    if (!token || new Date(token.expires) < new Date()) {
      throw new Error('Токен не действителен или уже истек.');
    }
  
    // Проверка на превышение лимита
    if (token.used.user + usedUserTokens > token.limits.user || 
        token.used.chatGpt + usedChatGptTokens > token.limits.chatGpt) {
      throw new Error('Превышен лимит использования токенов.');
    }
  
    // Обновление информации о использовании токенов
    token.used.user += usedUserTokens;
    token.used.chatGpt += usedChatGptTokens;
  
    await saveTokensData(tokensData);
  }
  
  module.exports = { generateToken, validateAndUpdateTokensUsage };