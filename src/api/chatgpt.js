import path from "path";
import { fileURLToPath } from "url";
import {
  addNewDialogs,
  addNewMessage,
  deleteFirstMessage,
  loadData,
  requestBody,
  saveData,
} from "../utils/dbManager.js";
import { llmsConfig } from "../utils/llmsConfig.js";
import { tokensService } from "../services/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokensFilePath = path.join(__dirname, "..", "db", "tokens.json");
const dialogsFilePath = path.join(__dirname, "..", "db", "dialogs.json");
const userTokensFilePath = path.join(__dirname, "..", "db", "user_tokens.json");

let role = "";

const stream = false; // or true

async function queryChatGPT(
  userQuery,
  userToken,
  dialogName,
  model = "gpt-4o-plus",
  systemMessageContent = "",
  tokenLimit = Infinity,
  singleMessage = false,
  tokenAdmin,
) {
  const config = llmsConfig[model];

  if (!config) {
    console.error(`Deployment config for ${model} not found`);
    return;
  }

  const validLimitToken = await loadData(tokensFilePath);
  const validLimitTokenUser = await loadData(userTokensFilePath);
  const tokenBounded = validLimitToken.tokens.find((t) => t.id === tokenAdmin);
  const tokenBoundedUser = validLimitTokenUser.tokens.find((t) => t.id === userToken);
  if (tokenAdmin == process.env.ADMIN_FIRST) tokenBounded.tokens_gpt = 999999999999999;
  if (tokenBounded.tokens_gpt <= 0) {
    console.log("Превышен лимит использования токенов Админа");
    throw new Error("Превышен лимит использования токенов Админа.");
  }
  if (tokenBoundedUser.tokens_gpt <= 0) {
    console.log("Превышен лимит использования токенов Юзера");
    throw new Error("Превышен лимит использования токенов.");
  }

  if (!dialogName) {
    singleMessage = true;
  }

  const systemMessage = { role: "system", content: systemMessageContent || "You are chatting with an AI assistant." };
  role = "user";
  const userMessage = { role: "user", content: userQuery };

  let messageAllContextUser;
  if (singleMessage) {
    messageAllContextUser = [systemMessage, userMessage];
  } else {
    messageAllContextUser = await addNewMessage(dialogName, userMessage.content, role, systemMessage.content);
    if (messageAllContextUser === undefined) {
      // Возможно, нужно создать новый диалог, если его нет
      messageAllContextUser = await addNewDialogs(dialogName, userMessage.content, role, systemMessage.content);
      // Проверяем, был ли диалог создан
      if (messageAllContextUser === undefined) {
        // Возвращаем undefined, если диалог не был создан 
        return undefined; 
      }
    }
  }
  
  if (model.startsWith("o1")) {
    messageAllContextUser = messageAllContextUser.filter(({ role }) => role !== "system");
  }

  console.log('messageAllContextUser11111111111')
  console.log(messageAllContextUser)
  console.log('messageAllContextUser1111111')
  try {
    const endpoint = config.endpoint;
    const response = await endpoint.chat.completions.create({
      messages: messageAllContextUser,
      model: config.modelName,
      stream: stream,
    });
    const gptReply = response.choices[0].message.content;
    const requestTokensUsed = response.usage.prompt_tokens;
    const responseTokensUsed = response.usage.completion_tokens;

    let energyCoeff = config.convertationEnergy;
    const allTokenSent = Math.round((requestTokensUsed + responseTokensUsed) / energyCoeff);
    tokenBounded.tokens_gpt = tokenBounded.tokens_gpt - allTokenSent;
    tokenBoundedUser.tokens_gpt = tokenBoundedUser.tokens_gpt - allTokenSent;
    await saveData(tokensFilePath, validLimitToken);
    await saveData(userTokensFilePath, validLimitTokenUser);
    await tokensService.updateAdminTokenByUserId(tokenBoundedUser.id);

    if (!singleMessage) {
      const totalTokensUsed = requestTokensUsed + responseTokensUsed;
      if (totalTokensUsed > tokenLimit) {
        await deleteFirstMessage(dialogName);
      }
      role = "assistant";
      await addNewMessage(dialogName, gptReply, role, systemMessage.content);
    }

    return {
      success: true,
      response: gptReply,
      allTokenSent,
      requestTokensUsed,
      responseTokensUsed,
      history: await requestBody(dialogName),
      model,
    };
  } catch (error) {
    console.error("Ошибка при запросе к ChatGPT:", error);
    return {
      success: false,
      error: error.response ? error.response.data : error.message,
    };
  }
}

export { queryChatGPT };
