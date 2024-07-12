import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokensFilePath = path.join(__dirname, '..', 'db', 'tokens.json');
const dialogsFilePath = path.join(__dirname, '..', 'db', 'dialogs.json');
const userTokensFilePath = path.join(__dirname, '..', 'db', 'user_tokens.json');
const systemMessagesFilePath = path.join(__dirname, '..', 'db', 'system_messages.json');

// Инициализация JSON-файлов, если они отсутствуют
async function initializeFiles() {
  const files = [tokensFilePath, dialogsFilePath, userTokensFilePath, systemMessagesFilePath];
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
  const userToken = tokensData.tokens.find(token => token.id === userName);
  if (!userToken) {
    const newToken = {
      id: userName,
      'tokens_gpt': 1500
    };
    tokensData.tokens.push(newToken);
    await saveData(userTokensFilePath, tokensData);
    return newToken;
  }

  return userToken;
}


async function generateAdminToken(token=15000) {
  const tokensData = await loadData(tokensFilePath);
  if (!tokensData) {
    console.error('Ошибка при загрузке токенов админа.');
    return null;
  }
  
  const newToken = {
    id: crypto.randomBytes(16).toString('hex'),
    'tokens_gpt': token
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
async function addNewMessage(dialogName, messageContent, senderRole) {
  const dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) dialogsData = { dialogs: [] };
  let dialog = dialogsData.dialogs.find(d => d.name === dialogName);
  if (!dialog) {
    return undefined
  }
  const newMessage = { role: senderRole, content: messageContent };
  dialog.messages.push(newMessage);
  await saveData(dialogsFilePath, dialogsData);
  return dialog.messages;
}

async function addNewDialogs(dialogName, messageContent, senderRole, systemMessageContent = '') {
  const dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) dialogsData = { dialogs: [] };
  let dialog = {
    name: dialogName,
    messages: [{ role: 'system', content: systemMessageContent }]
  };
  dialogsData.dialogs.push(dialog);
  
  const newMessage = { role: senderRole, content: messageContent };
  console.log(newMessage, '3333')
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
  return tokensData?.tokens.some(tokenEntry => tokenEntry.id === providedToken);
}


// Добавление системного сообщения для пользователя
async function addSystemMessage(userId, messageContent, messageName) {
  const systemMessagesData = await loadData(systemMessagesFilePath);
  if (!systemMessagesData) systemMessagesData = { users: [] };
  
  let userMessages = systemMessagesData.users?.find(u => u.userID === userId);

  const message = userMessages?.messages?.find(msg => msg.name_model === messageName);
  if(message) return 1

  if (!userMessages) {
    userMessages = { userID: userId, messages: [] };
    systemMessagesData.users.push(userMessages);
  }
  
  const newMessage = { name_model: messageName, content: messageContent };
  userMessages.messages.push(newMessage);
  await saveData(systemMessagesFilePath, systemMessagesData);
  return newMessage;
}


// Обновление системного сообщения пользователя
async function updateSystemMessage(userId, messageName, newContent) {
  const systemMessagesData = await loadData(systemMessagesFilePath);
  if (!systemMessagesData) return null;
  
  const userMessages = systemMessagesData.users.find(u => u.userID === userId);
  if (!userMessages) return null;
  
  const message = userMessages.messages.find(msg => msg.name_model === messageName);
  if (message) {
    message.content = newContent;
    await saveData(systemMessagesFilePath, systemMessagesData);
    return message;
  }
  
  return null;
}



// Удаление системного сообщения пользователя
async function deleteSystemMessage(userId, messageName) {
  const systemMessagesData = await loadData(systemMessagesFilePath);
  if (!systemMessagesData) return null;
  
  const userMessages = systemMessagesData.users.find(u => u.userID === userId);
  if (!userMessages) return null;
  
  userMessages.messages = userMessages.messages.filter(msg => msg.name_model !== messageName);
  await saveData(systemMessagesFilePath, systemMessagesData);
  return true;
}




// Получение всех системных сообщений пользователя
async function getAllSystemMessages(userId) {
  const systemMessagesData = await loadData(systemMessagesFilePath);
  if (!systemMessagesData) return null;

  // Находим пользователя
  const userMessages = systemMessagesData.users.find(u => u.userID === userId);

  // Если пользователь найден, извлекаем все сообщения
  if (userMessages) {
    return userMessages.messages; 
  } else {
    return []; // Возвращаем пустой массив, если пользователь не найден
  }
}

export {
  initializeFiles,
  generateUserToken,
  generateAdminToken,
  saveData,
  loadData,
  addNewMessage,
  requestBody,
  deleteFirstMessage,
  clearDialog,
  isValidAdminToken,
  isValidUserToken,
  addNewDialogs,
  addSystemMessage,
  deleteSystemMessage,
  updateSystemMessage,
  getAllSystemMessages
};
