import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Исправленные пути к JSON файлам
const tokensFilePath = path.join(__dirname, "..", "db", "tokens.json");
const dialogsFilePath = path.join(__dirname, "..", "db", "dialogs.json");
const userTokensFilePath = path.join(__dirname, "..", "db", "user_tokens.json");

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
    await fs.writeFile(filePath, jsonData, { encoding: "utf8" });
  } catch (error) {
    console.error("Ошибка при сохранении данных:", error);
  }
}

// Загрузка данных из хранилища
async function loadData(filePath) {
  try {
    const data = await fs.readFile(filePath, { encoding: "utf8" });
    return JSON.parse(data);
  } catch (error) {
    console.error("Ошибка при загрузке данных:", error);
    return null;
  }
}

// Генерация токена пользователя с начальным количеством токенов
async function generateUserToken(userName) {
  const tokensData = await loadData(userTokensFilePath);
  if (!tokensData) {
    console.error("Ошибка при загрузке токенов пользователей.");
    return null;
  }
  const userToken = tokensData.tokens.find((token) => token.id === userName);
  if (!userToken) {
    const newToken = {
      id: userName,
      tokens_gpt: 10000,
    };
    tokensData.tokens.push(newToken);
    await saveData(userTokensFilePath, tokensData);
    return newToken;
  }

  return userToken;
}

async function generateAdminToken(token = 15000, user_id) {
  const tokensData = await loadData(tokensFilePath);
  if (!tokensData) {
    console.error("Ошибка при загрузке токенов админа.");
    return null;
  }

  const newToken = {
    id: crypto.randomBytes(16).toString("hex"),
    user_id: user_id,
    tokens_gpt: token,
  };
  tokensData.tokens.push(newToken);
  await saveData(tokensFilePath, tokensData);
  return newToken;
}

// Проверка, является ли предоставленный токен валидным пользовательским токеном
async function isValidUserToken(userName) {
  const tokensData = await loadData(userTokensFilePath);
  return tokensData?.tokens.some((tokenEntry) => tokenEntry.id === userName);
}


// Функция синхронизации контекста данных
async function addNewMessage(dialogName, messageContent, senderRole, systemMessageContent) {

  let dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) dialogsData = { dialogs: [] };
  let dialog = dialogsData.dialogs.find((d) => d.name === dialogName);
  if (!dialog) {
    return undefined;
  }

  // Проверяем, если системного сообщения еще нет, добавляем
  
  if(dialog.messages[dialog.messages.length -1].role != senderRole ||
     dialog.messages[dialog.messages.length -1].content != messageContent){
    // Проверяем, если системного сообщения еще нет, добавляем
    const existingSystemMessageIndex = dialog.messages.findIndex(msg => msg.role === "system");

    if (existingSystemMessageIndex !== -1) {
      // Удаляем старое системное сообщение
      dialog.messages.splice(existingSystemMessageIndex, 1);
    }

    // Добавляем системное сообщение перед последним
    dialog.messages.splice(dialog.messages.length - 1, 0, { role: "system", content: systemMessageContent });

    // Добавляем новое сообщение в конец истории
    const newMessage = { role: senderRole, content: messageContent };
    dialog.messages.push(newMessage);

    await saveData(dialogsFilePath, dialogsData);
  }
  return dialog.messages;
}




// async function addNewMessage(dialogName, messageContent, senderRole, systemMessageContent) {
//   let dialogsData = await loadData(dialogsFilePath);
//   if (!dialogsData) dialogsData = { dialogs: [] };
//   let dialog = dialogsData.dialogs.find((d) => d.name === dialogName);
//   if (!dialog) {
//     return undefined;
//   }
//   const newMessage = { role: senderRole, content: messageContent };
//   dialog.messages.push(newMessage);
//   await saveData(dialogsFilePath, dialogsData);
//   return dialog.messages;
// }

async function addNewDialogs(dialogName, messageContent, senderRole, systemMessageContent = "") {
  let dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) dialogsData = { dialogs: [] };
  let dialog = {
    name: dialogName,
    messages: [{ role: "system", content: systemMessageContent }],
  };
  dialogsData.dialogs.push(dialog);

  const newMessage = { role: senderRole, content: messageContent };
  dialog.messages.push(newMessage);
  await saveData(dialogsFilePath, dialogsData);
  return dialog.messages;
}

// Функция удаления первого сообщения в диалоге
async function deleteFirstMessage(dialogName) {
  const dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) return;

  let dialog = dialogsData.dialogs.find((d) => d.name === dialogName);
  if (dialog && dialog.messages.length > 1) {
    dialog.messages.splice(1, 1);
    await saveData(dialogsFilePath, dialogsData);
  }
}

// Функция получения истории диалога
async function requestBody(dialogName) {
  const dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) return { messages: [] };

  const dialog = dialogsData.dialogs.find((d) => d.name === dialogName);
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

  const dialogIndex = dialogsData.dialogs.findIndex((d) => d.name === dialogName);
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
  return tokensData?.tokens.some((tokenEntry) => tokenEntry.id === providedToken);
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
};
