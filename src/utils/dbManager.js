const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Путь к файлу с данными токенов
const tokensFilePath = path.join(__dirname, '..', 'db', 'tokens.json');
const dialogsFilePath = path.join(__dirname, '..', 'db', 'dialogs.json');

/**
 * Загрузка данных о токенах из хранилища.
 */
async function loadData(filePath) {
  console.log('filePath', filePath);
  try {
    const data = await fs.readFile(filePath, { encoding: 'utf8' });
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при загрузке данных о токенах:', error);
    // Если файл отсутствует, возвращаем простую структуру
    return { tokens: [] };
  }
}

async function syncContextData(dialogName, userMessage, senderRole) {
  let dialogs = await loadData(dialogsFilePath);
  dialogs = dialogs.dialogs || [];
  
  // Находим диалог или создаем новый
  let dialog = dialogs.find(d => d.name === dialogName);
  if (!dialog) {
    dialog = { name: dialogName, messages: [] };
    dialogs.push(dialog);
  }

  // Контекстное сообщение, добавляемое для каждого диалога
  const systemMessage = {
    role: 'system',
    content: 'You are chatting with an AI assistant, which is a GPT-4o model version March 13, 2024'
  };

  if (dialog.messages.length === 0) {
    dialog.messages.push(systemMessage);
  }

  // Добавляем новое сообщение
  let messageToAdd = {
    role: senderRole,
    content: userMessage
  };
  dialog.messages.push(messageToAdd);

  // Сохраняем обновленные диалоги
  await fs.writeFile(dialogsFilePath, JSON.stringify({ dialogs }, null, 2));

  // Возвращаем обновленный список сообщений диалога для передачи в ChatGPT
  return dialog.messages;
}

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
  const tokensData = await loadData(tokensFilePath);
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

module.exports = { generateToken, saveTokensData, loadData, syncContextData, dialogsFilePath };

