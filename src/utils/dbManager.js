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
      console.log(`[ файл ${file} не найден. Создано начальное содержимое ]`);
    }
  }
}

// Сохранение данных в хранилище
async function saveData(filePath, data) {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonData, { encoding: "utf8" });
    console.log(`[ данные сохранены в ${filePath} ]`);
  } catch (error) {
    console.error(`[ ошибка при сохранении данных в ${filePath}: ${error.message} ]`);
  }
}

// Загрузка данных из хранилища
async function loadData(filePath) {
  try {
    const data = await fs.readFile(filePath, { encoding: "utf8" });
    console.log(`[ данные загружены из ${filePath} ]`);
    return JSON.parse(data);
  } catch (error) {
    console.error(`[ ошибка при загрузке данных из ${filePath}: ${error.message} ]`);
    return null;
  }
}

// Генерация токена пользователя с начальным количеством токенов
async function generateUserToken(userName) {
  console.log(`[ генерация токена для пользователя ${userName} ]`);
  const tokensData = await loadData(userTokensFilePath);
  if (!tokensData) {
    console.error(`[ ошибка при загрузке токенов для пользователя ${userName} ]`);
    return null;
  }

  let userToken = tokensData.tokens.find((token) => token.id === userName);
  if (!userToken) {
    const newToken = {
      id: userName,
      tokens_gpt: 10000,
    };
    tokensData.tokens.push(newToken);
    await saveData(userTokensFilePath, tokensData);
    console.log(`[ токен для пользователя ${userName} создан с начальным балансом 10000 ]`);
    userToken = newToken;
  } else {
    console.log(`[ токен для пользователя ${userName} уже существует ]`);
  }

  return userToken;
}

// Генерация токена администратора
async function generateAdminToken(token = 15000, user_id) {
  console.log(`[ генерация админского токена для пользователя ${user_id} ]`);
  const tokensData = await loadData(tokensFilePath);
  if (!tokensData) {
    console.error(`[ ошибка при загрузке токенов админа ]`);
    return null;
  }

  const newToken = {
    id: crypto.randomBytes(16).toString("hex"),
    user_id: user_id,
    tokens_gpt: token,
  };
  tokensData.tokens.push(newToken);
  await saveData(tokensFilePath, tokensData);
  console.log(`[ админский токен с ID ${newToken.id} для пользователя ${user_id} создан с балансом ${token} ]`);
  return newToken;
}

// Проверка, является ли предоставленный токен валидным пользовательским токеном
async function isValidUserToken(userName) {
  console.log(`[ проверка валидности токена для пользователя ${userName} ]`);
  const tokensData = await loadData(userTokensFilePath);
  return tokensData?.tokens.some((tokenEntry) => tokenEntry.id === userName);
}

// Функция синхронизации контекста данных
async function addNewMessage(dialogName, messageContent, senderRole, systemMessageContent) {
  console.log(`[ добавление нового сообщения в диалог ${dialogName} ]`);
  let dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) dialogsData = { dialogs: [] };
  let dialog = dialogsData.dialogs.find((d) => d.name === dialogName);
  if (!dialog) {
    console.log(`[ диалог ${dialogName} не найден ]`);
    return undefined;
  }

  // Проверка и добавление системного сообщения
  if (
    dialog.messages[dialog.messages.length - 1].role !== senderRole ||
    dialog.messages[dialog.messages.length - 1].content !== messageContent
  ) {
    const existingSystemMessageIndex = dialog.messages.findIndex((msg) => msg.role === "system");
    if (existingSystemMessageIndex !== -1) {
      dialog.messages.splice(existingSystemMessageIndex, 1);
      console.log(`[ старое системное сообщение удалено из диалога ${dialogName} ]`);
    }

    dialog.messages.splice(dialog.messages.length - 1, 0, { role: "system", content: systemMessageContent });
    console.log(`[ добавлено новое системное сообщение в диалог ${dialogName} ]`);

    const newMessage = { role: senderRole, content: messageContent };
    dialog.messages.push(newMessage);
    await saveData(dialogsFilePath, dialogsData);
    console.log(`[ новое сообщение добавлено в диалог ${dialogName} ]`);
  }
  return dialog.messages;
}

async function addNewDialogs(dialogName, messageContent, senderRole, systemMessageContent = "") {
  console.log(`[ создание нового диалога ${dialogName} ]`);
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
  console.log(`[ диалог ${dialogName} создан с сообщением от ${senderRole} ]`);
  return dialog.messages;
}

// Функция удаления первого сообщения в диалоге
async function deleteFirstMessage(dialogName) {
  console.log(`[ удаление первого сообщения в диалоге ${dialogName} ]`);
  const dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) return;

  let dialog = dialogsData.dialogs.find((d) => d.name === dialogName);
  if (dialog && dialog.messages.length > 1) {
    dialog.messages.splice(1, 1);
    await saveData(dialogsFilePath, dialogsData);
    console.log(`[ первое сообщение удалено из диалога ${dialogName} ]`);
  }
}

// Функция получения истории диалога
async function requestBody(dialogName) {
  console.log(`[ получение истории диалога ${dialogName} ]`);
  const dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) return { messages: [] };

  const dialog = dialogsData.dialogs.find((d) => d.name === dialogName);
  if (dialog) {
    console.log(`[ история диалога ${dialogName} получена ]`);
    return { messages: dialog.messages };
  } else {
    console.error(`[ диалог ${dialogName} не найден ]`);
    return { messages: [] };
  }
}

// Функция полной очистки диалога
async function clearDialog(dialogName) {
  console.log(`[ очистка диалога ${dialogName} ]`);
  const dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) return false;

  const dialogIndex = dialogsData.dialogs.findIndex((d) => d.name === dialogName);
  if (dialogIndex!== -1) {
    dialogsData.dialogs.splice(dialogIndex, 1);
    await saveData(dialogsFilePath, dialogsData);
    console.log(`[ диалог ${dialogName} успешно очищен ]`);
    return true;
  } else {
    console.error(`[ диалог ${dialogName} не найден ]`);
    return false;
  }
}

// Проверка, является ли предоставленный токен валидным администраторским токеном
async function isValidAdminToken(providedToken) {
  console.log(`[ проверка токена администратора ${providedToken} ]`);
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