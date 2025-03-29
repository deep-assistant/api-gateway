import OpenAI from "openai";

const openai_original = new OpenAI({
  timeout: 50 * 1000,
  apiKey: process.env.OPENAI_ORIGINAL_API_KEY,
  baseURL: process.env.OPENAI_ORIGINAL_BASE_URL,
});

const openai_goapi = new OpenAI({
  timeout: 180 * 1000,
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const openai_opensource = new OpenAI({
  timeout: 50 * 1000,
  apiKey: process.env.FREE_OPENAI_KEY,
  baseURL: process.env.FREE_OPENAI_BASE_URL,
});

const openai_aiguoguo = new OpenAI({
  timeout: 50 * 1000,
  apiKey: process.env.AIGUOGUO_API_KEY,
  baseURL: process.env.AIGUOGUO_BASE_URL,
});

const deepseek = new OpenAI({
  timeout: 180 * 1000,
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});

const openrouter = new OpenAI({
  timeout: 180 * 1000,
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
});



export const llmsConfig = {
  "meta-llama/Meta-Llama-3.1-8B": {
    modelName: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    endpoint: openai_opensource,
    convertationEnergy: 40,
  },
  "meta-llama/Meta-Llama-3.1-70B": {
    modelName: "meta-llama/Meta-Llama-3.1-70B-Instruct",
    endpoint: openai_opensource,
    convertationEnergy: 3.5,
  },
  "meta-llama/Meta-Llama-3-70B": {
    modelName: "accounts/fireworks/models/llama-v3-70b-instruct",
    endpoint: openai_opensource,
    convertationEnergy: 3.9,
  },
  "meta-llama/Meta-Llama-3.1-405B": {
    modelName: "meta-llama/Meta-Llama-3.1-405B-Instruct",
    endpoint: openai_opensource,
    convertationEnergy: 1.7,
  },
  "microsoft/WizardLM-2-7B": {
    modelName: "microsoft/WizardLM-2-7B",
    endpoint: openai_opensource,
    convertationEnergy: 40,
  },
  "microsoft/WizardLM-2-8x22B": {
    modelName: "microsoft/WizardLM-2-8x22B",
    endpoint: openai_opensource,
    convertationEnergy: 3.5,
  },
  "gpt-3.5-turbo": {
    modelName: "gpt-3.5-turbo",
    endpoint: openai_original,
    convertationEnergy: 14.7,
  },
  "gpt-3.5-turbo_go": {
    modelName: "gpt-3.5-turbo",
    endpoint: openai_goapi,
    convertationEnergy: 14.7,
  },
  "gpt-3.5-turbo_guo": {
    modelName: "gpt-3.5-turbo-0125",
    endpoint: openai_aiguoguo,
    convertationEnergy: 14.7,
  },
  "gpt-3.5-turbo-0125_guo": {
    modelName: "gpt-3.5-turbo-0125",
    endpoint: openai_aiguoguo,
    convertationEnergy: 14.7,
  },
  "gpt-4o": {
    modelName: "gpt-4o",
    endpoint: openai_original,
    convertationEnergy: 1,
  },
  "gpt-4o_go": {
    modelName: "gpt-4o",
    endpoint: openai_goapi,
    convertationEnergy: 1,
  },
  "gpt-4o_guo": {
    modelName: "gpt-4o",
    endpoint: openai_aiguoguo,
    convertationEnergy: 1,
  },
  "gpt-4o-unofficial": {
    modelName: "gpt-4-gizmo-g-pmuQfob8d",
    endpoint: openai_goapi,
    convertationEnergy: 0.8,
  },
  "gpt-auto": {
    modelName: "gpt-auto",
    endpoint: openai_goapi,
    convertationEnergy: 6.4,
  },
  "gpt-4o-mini": {
    modelName: "gpt-4o-mini",
    endpoint: openai_original,
    convertationEnergy: 13.6,
  },
  "gpt-4o-mini_go": {
    modelName: "gpt-4o-mini",
    endpoint: openai_goapi,
    convertationEnergy: 14.6,
  },
  "o1-mini": {
    modelName: "o1-mini",
    endpoint: openai_original,
    convertationEnergy: 1,
  },
  "o1-mini_go": {
    modelName: "o1-mini",
    endpoint: openai_goapi,
    convertationEnergy: 0.4,
  },
  "o1-preview": {
    modelName: "o1-preview",
    endpoint: openai_original,
    convertationEnergy: 0.15,
  },
  "o1-preview_go": {
    modelName: "o1-preview",
    endpoint: openai_goapi,
    convertationEnergy: 0.15,
  },
  "o3-mini": {
    modelName: "o3-mini",
    endpoint: openai_original,
    convertationEnergy: 1,
  },
  "o3-mini_go": {
    modelName: "o3-mini",
    endpoint: openai_goapi,
    convertationEnergy: 1,
  },
  "claude-3-5-haiku": {
    modelName: "claude-3-5-haiku-20241022",
    endpoint: openai_goapi,
    convertationEnergy: 10,
  },
  "claude-3-5-sonnet": {
    modelName: "claude-3-5-sonnet-20241022",
    endpoint: openai_goapi,
    convertationEnergy: 1,
  },
  "claude-3-opus": {
    modelName: "claude-3-opus-20240229",
    endpoint: openai_goapi,
    convertationEnergy: 0.1,
  },
  "uncensored": {
    modelName: "uncensored-small-32k-20240717",
    endpoint: openai_goapi,
    convertationEnergy: 9.9,
  },
  "deepseek-chat": {
    modelName: "deepseek-chat",
    endpoint: deepseek,
    convertationEnergy: 5,
  },
  "deepseek-chat_go": {
    modelName: "deepseek-chat",
    endpoint: openai_goapi,
    convertationEnergy: 5,
  },
  "deepseek-chat_openrouter": {
    modelName: "deepseek/deepseek-chat-v3-0324:free",
    endpoint: openrouter,
    convertationEnergy: 5,
  },
  "deepseek-reasoner": {
    modelName: "deepseek-reasoner",
    endpoint: deepseek,
    convertationEnergy: 2.5,
  },
  "deepseek-reasoner_go": {
    modelName: "deepseek-reasoner",
    endpoint: openai_goapi,
    convertationEnergy: 2.5,
  },
};

export const tryCompletionsConfig = {
  "o3-mini": [
    "o3-mini_go",
    "o3-mini",
    "o1-mini_go",
    "o1-mini",
    "deepseek-reasoner",
    "deepseek-reasoner_go",
    "gpt-4o_go",
    "gpt-4o",
    "gpt-4o_guo",
    "deepseek-chat_openrouter",
    "gpt-4o-mini_go",
    "gpt-4o-mini",
    "gpt-auto",
    "gpt-3.5-turbo_go",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo_guo",
    "gpt-3.5-turbo-0125_guo",
  ],
  "o1-preview": [
    "o1-preview_go",
    "o1-preview",
    "o3-mini_go",
    "o3-mini",
    "o1-mini_go",
    "o1-mini",
    "deepseek-reasoner",
    "deepseek-reasoner_go",
    "gpt-4o_go",
    "gpt-4o",
    "gpt-4o_guo",
    "deepseek-chat_openrouter",
    "gpt-4o-mini_go",
    "gpt-4o-mini",
    "gpt-auto",
    "gpt-3.5-turbo_go",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo_guo",
    "gpt-3.5-turbo-0125_guo",
  ],
  "o1-mini": [
    "o1-mini_go",
    "o1-mini",
    "o3-mini_go",
    "o3-mini",
    "deepseek-reasoner",
    "deepseek-reasoner_go",
    "gpt-4o_go",
    "gpt-4o",
    "gpt-4o_guo",
    "deepseek-chat_openrouter",
    "gpt-4o-mini_go",
    "gpt-4o-mini",
    "gpt-auto",
    "gpt-3.5-turbo_go",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo_guo",
    "gpt-3.5-turbo-0125_guo",
  ],
  "gpt-4o": [
    "gpt-4o_go",
    "gpt-4o",
    "gpt-4o_guo",
    "deepseek-chat_openrouter",
    "gpt-4o-mini_go",
    "gpt-4o-mini",
    "gpt-auto",
    "gpt-3.5-turbo_go",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo_guo",
    "gpt-3.5-turbo-0125_guo",
  ],
  "gpt-4o-mini": [
    "gpt-4o-mini_go",
    "gpt-4o-mini",
    "gpt-auto",
    "deepseek-chat_openrouter",
    "gpt-3.5-turbo_go",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo_guo",
    "gpt-3.5-turbo-0125_guo",
  ],
  "gpt-3.5-turbo": [
    "gpt-3.5-turbo_go",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo_guo",
    "gpt-3.5-turbo-0125_guo",
    "gpt-auto",
  ],
  "gpt-auto": [
    "gpt-auto",
    "gpt-4o_go",
    "gpt-4o",
    "gpt-4o_guo",
    "gpt-4o-mini_go",
    "gpt-4o-mini",
    "gpt-3.5-turbo_go",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo_guo",
    "gpt-3.5-turbo-0125_guo",
  ],
  "claude-3-opus": [
    "claude-3-opus",
    "o3-mini_go",
    "o3-mini",
    "o1-mini_go",
    "o1-mini",
    "deepseek-reasoner",
    "deepseek-reasoner_go",
    "claude-3-5-sonnet",
    "gpt-4o_go",
    "gpt-4o",
    "gpt-4o_guo",
    "claude-3-5-haiku",
    "gpt-4o-mini_go",
    "gpt-4o-mini",
    "gpt-auto",
    "gpt-3.5-turbo_go",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo_guo",
    "gpt-3.5-turbo-0125_guo",
  ],
  "claude-3-5-sonnet": [
    "claude-3-5-sonnet",
    "gpt-4o_go",
    "gpt-4o",
    "gpt-4o_guo",
    "claude-3-5-haiku",
    "gpt-4o-mini_go",
    "gpt-4o-mini",
    "gpt-auto",
    "gpt-3.5-turbo_go",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo_guo",
    "gpt-3.5-turbo-0125_guo",
  ],
  "claude-3-5-haiku": [
    "claude-3-5-haiku",
    "gpt-4o-mini_go",
    "gpt-4o-mini",
    "gpt-auto",
    "gpt-3.5-turbo_go",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo_guo",
    "gpt-3.5-turbo-0125_guo",
  ],
  "deepseek-chat": [
    "deepseek-chat_go",
    "deepseek-chat",
    "deepseek-chat_openrouter",
    "gpt-4o_go",
    "gpt-4o",
    "gpt-4o_guo",
    "gpt-4o-mini_go",
    "gpt-4o-mini",
    "gpt-auto",
    "gpt-3.5-turbo_go",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo_guo",
    "gpt-3.5-turbo-0125_guo",
  ],
  "deepseek-reasoner": [
    "deepseek-reasoner",
    "deepseek-reasoner_go",
    "deepseek-chat_openrouter",
    "deepseek-chat",
    "deepseek-chat_go",
    "o3-mini_go",
    "o3-mini",
    "o1-mini_go",
    "o1-mini",
    "gpt-4o_go",
    "gpt-4o",
    "gpt-4o_guo",
    "gpt-4o-mini_go",
    "gpt-4o-mini",
    "gpt-auto",
    "gpt-3.5-turbo_go",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo_guo",
    "gpt-3.5-turbo-0125_guo",
  ],
};
