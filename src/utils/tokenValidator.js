// src/utils/tokenValidator.js
const { loadTokensData } = require('./tokenManager');

async function validateToken(providedToken) {
  const tokensData = await loadTokensData();

  const tokenRecord = tokensData.tokens.find(token => token.token === providedToken);

  if (!tokenRecord) {
    return false; // Токен не найден
  }

  // Проверка даты истечения токена
  const now = new Date();
  const expirationDate = new Date(tokenRecord.expires);
  if (now > expirationDate) {
    return false; // Токен истек
  }

  return true;
}

module.exports = { validateToken };