import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Исправленные пути к JSON файлам
const tokensFilePath = path.join(__dirname, '..', 'db', 'tokens.json');
const dialogsFilePath = path.join(__dirname, '..', 'db', 'dialogs.json');
const userTokensFilePath = path.join(__dirname, '..', 'db', 'user_tokens.json');

// Инициализация JSON-файлов, если они отсутствуют
async function initializeFiles() {
  const files = [tokensFilePath, dialogsFilePath, userTokensFilePath];
  for (const file of files) {
    try {
      await fs.access(file);
    } catch {
      const initialData = file === dialogsFilePath ? { dialogs: [] } : { tokens: [] };
      await saveData(file, initialData);
    }
  }
}

// Сохранение данных в хранилище
async function saveData(filePath, data) {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonData, { encoding: 'utf8' });
  } catch (error) {
    console.error('Ошибка при сохранении данных:', error);
  }
}

// Загрузка данных из хранилища
async function loadData(filePath) {
  try {
    const data = await fs.readFile(filePath, { encoding: 'utf8' });
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
    return null;
  }
}

// Генерация токена пользователя с начальным количеством токенов
async function generateUserToken(userName) {
  const tokensData = await loadData(userTokensFilePath);
  if (!tokensData) {
    console.error('Ошибка при загрузке токенов пользователей.');
    return null;
  }
}

async function generateAdminToken(expires, userTokenLimit, chatGptTokenLimit) {
  const tokensData = await loadData(tokensFilePath);
  if (!tokensData) {
    console.error('Ошибка при загрузке токенов админа.');
    return null;
  }
  
  const newToken = {
    token: crypto.randomBytes(16).toString('hex'),
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
  await saveData(tokensFilePath, tokensData);
  return newToken;
}

// Проверка, является ли предоставленный токен валидным пользовательским токеном
async function isValidUserToken(userName) {
  const tokensData = await loadData(userTokensFilePath);
  return tokensData?.tokens.some(tokenEntry => tokenEntry.id === userName);
}

// Функция синхронизации контекста данных
async function syncContextData(dialogName, messageContent, senderRole, systemMessageContent = '') {
  const dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) dialogsData = { dialogs: [] };

  let dialog = dialogsData.dialogs.find(d => d.name === dialogName);
  if (!dialog) {
    dialog = {
      name: dialogName,
      messages: [{ role: 'system', content: systemMessageContent }]
    };
    dialogsData.dialogs.push(dialog);
  }
  const newMessage = { role: senderRole, content: messageContent };
  dialog.messages.push(newMessage);
  await saveData(dialogsFilePath, dialogsData);
  return dialog.messages;
}

// Функция удаления первого сообщения в диалоге
async function deleteFirstMessage(dialogName) {
  const dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) return;
  
  let dialog = dialogsData.dialogs.find(d => d.name === dialogName);
  if (dialog && dialog.messages.length > 1) {
    dialog.messages.splice(1, 1);
    await saveData(dialogsFilePath, dialogsData);
  }
}

// Функция получения истории диалога
async function requestBody(dialogName) {
  const dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) return { messages: [] };
  
  const dialog = dialogsData.dialogs.find(d => d.name === dialogName);
  if (dialog) {
    return { messages: dialog.messages };
  } else {
    console.error(`Диалог "${dialogName}" не найден.`);
    return { messages: [] };
  }
}

// Функция полной очистки диалога
async function clearDialog(dialogName) {
  const dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) return false;
  
  const dialogIndex = dialogsData.dialogs.findIndex(d => d.name === dialogName);
  if (dialogIndex !== -1) {
    dialogsData.dialogs.splice(dialogIndex, 1);
    await saveData(dialogsFilePath, dialogsData);
    console.log(`Диалог "${dialogName}" успешно очищен.`);
    return true;
  } else {
    console.error(`Диалог "${dialogName}" не найден.`);
    return false;
  }
}

// Проверка, является ли предоставленный токен валидным администраторским токеном
async function isValidAdminToken(providedToken) {
  const tokensData = await loadData(tokensFilePath);
  return tokensData?.tokens.some(tokenEntry => tokenEntry.token === providedToken);
}

export {
  initializeFiles,
  generateUserToken,
  generateAdminToken,
  saveData,
  loadData,
  syncContextData,
  requestBody,
  deleteFirstMessage,
  clearDialog,
  isValidAdminToken,
  isValidUserToken
};
