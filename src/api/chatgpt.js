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
  timeout: 50 * 1000,
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});


const openai_deepinfra = new OpenAI({
  timeout: 50 * 1000,
  apiKey: process.env.FREE_OPENAI_KEY,
  baseURL: "https://api.deepinfra.com/v1/openai",
});
const stream = false; // or true


const openai_aiguoguo = new OpenAI({
  timeout: 50 * 1000,
  apiKey: process.env.AIGUOGUO_API_KEY,
  baseURL: process.env.AIGUOGUO_BASE_URL,
});

// Конфигурация для моделей
const deploymentConfig = {
  'gpt-4o-plus': {
      modelName: 'gpt-4o-plus',
      endpoint: openai,
      convertationEnergy: 1
  },
  'gpt-4o-mini': {
      modelName: 'gpt-4o-mini',
      endpoint: openai,
      convertationEnergy: 15
  },
  'gpt-auto': {
      modelName: 'gpt-auto',
      endpoint: openai,
      convertationEnergy: 15
  },
  'nvidia/Nemotron-4-340B-Instruct': {
      modelName: 'nvidia/Nemotron-4-340B-Instruct',
      endpoint: openai_deepinfra,
      convertationEnergy: 1.2
  },
  'meta-llama/Meta-Llama-3-70B-Instruct': {
      modelName: 'meta-llama/Meta-Llama-3-70B-Instruct',
      endpoint: openai_deepinfra,
      convertationEnergy: 3.5
  },
  'deepinfra/deepinfra2-72B-Instruct': {
      modelName: 'deepinfra/deepinfra2-72B-Instruct',
      endpoint: openai_deepinfra,
      convertationEnergy: 3.5
  },
  'codellama/CodeLlama-70b-Instruct-hf': {
      modelName: 'codellama/CodeLlama-70b-Instruct-hf',
      endpoint: openai_deepinfra,
      convertationEnergy: 3.5
  },
  'microsoft/WizardLM-2-8x22B': {
      modelName: 'microsoft/WizardLM-2-8x22B',
      endpoint: openai_deepinfra,
      convertationEnergy: 3.5
  },
  'gpt-3.5-turbo': {
      modelName: 'gpt-3.5-turbo',
      endpoint: openai,
      convertationEnergy: 15
  },
  'meta-llama/Meta-Llama-3-8B-Instruct': {
      modelName: 'meta-llama/Meta-Llama-3-8B-Instruct',
      endpoint: openai_deepinfra,
      convertationEnergy: 50
  },
  'microsoft/WizardLM-2-7B': {
      modelName: 'microsoft/WizardLM-2-7B',
      endpoint: openai_deepinfra,
      convertationEnergy: 50
  },
  'gpt-4o-mini_guo': {
      modelName: 'gpt-4o-mini',
      endpoint: openai_aiguoguo,
      convertationEnergy: 15
  },
  'gpt-4o_guo': {
      modelName: 'gpt-4o',
      endpoint: openai_aiguoguo,
      convertationEnergy: 1
  },
  'gpt-3.5-turbo-0125_guo': {
      modelName: 'gpt-3.5-turbo-0125',
      endpoint: openai_aiguoguo,
      convertationEnergy: 15
  }
};

async function queryChatGPT(userQuery, userToken, dialogName, model = 'gpt-4o-plus', systemMessageContent = '', tokenLimit = Infinity, singleMessage = false, tokenAdmin) {
  const config = deploymentConfig[model]; 
  
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
  }  
  try {
    const endpoint = config.endpoint;
    const response = await endpoint.chat.completions.create({
      messages: messageAllContextUser,
      model: config.modelName,
      stream: stream,
    });
    const gptReply = response.choices[0].message.content.trim();
    const requestTokensUsed = response.usage.prompt_tokens;
    const responseTokensUsed = response.usage.completion_tokens;

    let energyCoeff = config.convertationEnergy;
    const allTokenSent = Math.round((requestTokensUsed+responseTokensUsed)/energyCoeff)
    tokenBounded.tokens_gpt = tokenBounded.tokens_gpt - allTokenSent;
    tokenBoundedUser.tokens_gpt = tokenBoundedUser.tokens_gpt - allTokenSent;
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
      history: await requestBody(dialogName),
      model
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
