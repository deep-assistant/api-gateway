// Импортируем dotenv для работы с переменными окружения
require('dotenv').config();

module.exports = {
  // Параметры подключения к ChatGPT API
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_KEY: process.env.AZURE_OPENAI_KEY,
  GPT_VERSION: process.env.GPT_VERSION,
  YOUR_DEPLOYMENT_NAME: process.env.YOUR_DEPLOYMENT_NAME,
  
  // Глобальные ограничения на количество токенов (используются значения по умолчанию, если переменные окружения не установлены)
  DEFAULT_USER_TOKEN_LIMIT: parseInt(process.env.DEFAULT_USER_TOKEN_LIMIT, 10) || 1000, // Лимит на количество токенов, которые пользователь может истратить на запросы
  DEFAULT_CHATGPT_TOKEN_LIMIT: parseInt(process.env.DEFAULT_CHATGPT_TOKEN_LIMIT, 10) || 1000, // Лимит на количество токенов, которые ChatGPT может истратить на ответы
};