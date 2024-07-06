import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { saveData, addNewMessage, addNewDialogs, loadData, requestBody, deleteFirstMessage } from '../utils/dbManager.js';
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokensFilePath = path.join(__dirname, '..', 'db', 'tokens.json');
const dialogsFilePath = path.join(__dirname, '..', 'db', 'dialogs.json');
const userTokensFilePath = path.join(__dirname, '..', 'db', 'user_tokens.json');

let role = "";

const openai = new OpenAI({
  apiKey: process.env.FREE_OPENAI_KEY,
  baseURL: "https://api.deepinfra.com/v1/openai",
});
const stream = false; // or true


const convertationEnergy = {
  'gpt-4o': 1,
  'gpt-35-16k': 15, 
  'Qwen/Qwen2-7B-Instruct': 40
}
// Конфигурация для моделей
const deploymentConfig = {
  'gpt-4o': {
      modelName: 'gpt-4o',
      endpoint: 'https://deep-ai-west-us-3.openai.azure.com/',
      apiKey: process.env.AZURE_OPENAI_KEY,
      apiVersion: '2023-03-15-preview'
  },
  'gpt-35-16k': {
      modelName: 'gpt-35-16k',
      endpoint: 'https://deep-ai.openai.azure.com/',
      apiKey: process.env.AZURE_OPENAI_KEY_3,     
      apiVersion: '2023-03-15-preview'
  }
};

async function queryChatGPT(userQuery, userToken, dialogName, model = 'gpt-4o', systemMessageContent = '', tokenLimit = Infinity, singleMessage = false, tokenAdmin) {
  const config = deploymentConfig[model] || deploymentConfig['gpt-4o']; 
  
  if (!config) {
    console.error(`Deployment config for ${model} not found`);
    return;
  }

  const validLimitToken = await loadData(tokensFilePath);
  const validLimitTokenUser = await loadData(userTokensFilePath);
  const tokenBounded = validLimitToken.tokens.find(t => t.id === tokenAdmin);
  const tokenBoundedUser = validLimitTokenUser.tokens.find(t => t.id === userToken);
  if (tokenBounded.tokens_gpt <= 0) {
    console.log('Превышен лимит использования токенов Админа');
    throw new Error('Превышен лимит использования токенов Админа.');
  }
  if (tokenBoundedUser.tokens_gpt <= 0) {
    console.log('Превышен лимит использования токенов Юзера');
    throw new Error('Превышен лимит использования токенов.');
  }

  if (!dialogName) {
    singleMessage = true;
  }

  const systemMessage = { role: 'system', content: systemMessageContent || 'You are chatting with an AI assistant.' };
  role = "user";
  const userMessage = { role: 'user', content: userQuery };
  let messageAllContextUser = singleMessage ? [systemMessage, userMessage] : await addNewMessage(dialogName, userMessage.content, role, systemMessage.content);
  if(messageAllContextUser==undefined){
    messageAllContextUser = await addNewDialogs(dialogName, userMessage.content, role, systemMessage.content);
  }  try {
    let response = {}
    let gptReply = {}
    let requestTokensUsed = {}
    let responseTokensUsed = {}
    if(model == 'Qwen/Qwen2-7B-Instruct'){
      response = await openai.chat.completions.create({
      messages: messageAllContextUser,
      model: "Qwen/Qwen2-7B-Instruct",
      stream: stream,
      });
      gptReply = response.choices[0].message.content.trim();
      requestTokensUsed = response.usage.prompt_tokens;
      responseTokensUsed = response.usage.completion_tokens;
    }
    else{
      const endpointAll = `${config.endpoint}openai/deployments/${config.modelName}/chat/completions?api-version=${config.apiVersion}`;
      response = await axios.post(endpointAll, { messages: messageAllContextUser }, {
        headers: { 'Content-Type': 'application/json', 'api-key': config.apiKey }
      });
      gptReply = response.data.choices[0].message.content.trim();
      requestTokensUsed = response.data.usage.prompt_tokens;
      responseTokensUsed = response.data.usage.completion_tokens;
    }
    // tokenBounded.used.user += requestTokensUsed;
    // tokenBounded.used.chatGpt += responseTokensUsed;
    let energyCoeff = convertationEnergy[model];
    if(!energyCoeff){
      energyCoeff   = 1;
    }
    console.log('requestTokensUsed:', requestTokensUsed);
    console.log('responseTokensUsed:', responseTokensUsed);
    console.log('energyCoeff:', energyCoeff);
    let allTokenSent = (requestTokensUsed+responseTokensUsed)/energyCoeff
    console.log('allTokenSent1:', allTokenSent);
    allTokenSent = Math.round(allTokenSent)
    console.log('allTokenSent2:', allTokenSent);
    tokenBounded.tokens_gpt = tokenBounded.tokens_gpt - allTokenSent;
    console.log('tokenBounded.tokens_gpt:', tokenBounded.tokens_gpt);
    tokenBoundedUser.tokens_gpt = tokenBoundedUser.tokens_gpt - allTokenSent;
    console.log('tokenBoundedUser.tokens_gpt:', tokenBoundedUser.tokens_gpt);
    await saveData(tokensFilePath, validLimitToken);
    await saveData(userTokensFilePath, validLimitTokenUser);

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
      history: await requestBody(dialogName)
    };
  } catch (error) {
    console.error('Ошибка при запросе к ChatGPT:', error);
    return {
      success: false,
      error: error.response ? error.response.data : error.message,
    };
  }
}

export { queryChatGPT };


