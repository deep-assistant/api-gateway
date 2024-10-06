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



// Генерация токена пользователя с начальным количеством токенов
async function generateUserToken(userName) {
  const select = await deep.select({
    type_id: 22,
    from_id: {
        type_id: 3,
        from_id: "dGPT-t-storage"
    },
    string: { value: { _eq: userName } }
  })
  if (!select) {
    console.error("Ошибка при загрузке токенов пользователей.");
    return null;
  }
  print(select.data)
  if(select.data) {
    console.error("Такой юзер уже есть.");
    return null;
  } 
  const newUser = await deep.insert({
    type_id: 22,
    name: "userName",
    containerId: "dGPT-t-storage"
  })
  const newToken = await deep.insert({
    type_id: "token",
    from_id: newUser.data.id,
    to_id: newUser.data.id,
    number: { data: { value: 10000 } },
  })
  return newToken;

}

async function generateAdminToken(token = 15000, user_id) {
    let apiToken;

    const select = await deep.select({
      type_id: await deep.id(user_id)
    })
    if (!select) {
        console.error("Ошибка при загрузке api.");
        return null;
      }
    print(select.data)
    
    if(select.data[0]) {
        apiToken = await deep.update(
            { link_id: select.data[0].id},
            { value: crypto.randomBytes(16).toString("hex") },
            { table: (typeof crypto.randomBytes(16).toString("hex")) + 's' }
        );
    } 
    else {
        apiToken = await deep.insert({
            type_id: select.data[0].id,
            from_id: await deep.id(user_id),
            to_id: await deep.id(user_id),
            string: { data: { value: crypto.randomBytes(16).toString("hex") } },
        })
    }

    apiToken = {
        id: apiToken.data.id,
        user_id: user_id,
        tokens_gpt: token
    }
    
    return apiToken;
  
  }


// Проверка, является ли предоставленный токен валидным пользовательским токеном
async function isValidUserToken(userName) {
    const select = await deep.select({
        type_id: 22,
        from_id: {
            type_id: 3,
            from_id: "dGPT-t-storage"
        },
        string: { value: { _eq: userName } }
    })
    return select.data[0];
}

// Проверка, является ли предоставленный токен валидным администраторским токеном
async function isValidAdminToken(providedToken) {
    const select = await deep.select({
        from_id: {
            type_id: 22,
        },
        to_id: {
            type_id: 22,
        },
        string: { value: { _eq: providedToken } }
    })
    const tokensData = await loadData(tokensFilePath);
    return tokensData?.tokens.some((tokenEntry) => tokenEntry.id === providedToken);
  }

async function addNewMessage(dialogName, messageContent, senderRole, systemMessageContent) {
  let dialogsData = await loadData(dialogsFilePath);
  if (!dialogsData) dialogsData = { dialogs: [] };
  let dialog = dialogsData.dialogs.find((d) => d.name === dialogName);
  if (!dialog) {
    return undefined;
  }

  // Проверяем, если системного сообщения еще нет, добавляем

  if (
    dialog.messages[dialog.messages.length - 1].role != senderRole ||
    dialog.messages[dialog.messages.length - 1].content != messageContent
  ) {
    // Проверяем, если системного сообщения еще нет, добавляем
    const existingSystemMessageIndex = dialog.messages.findIndex((msg) => msg.role === "system");

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
