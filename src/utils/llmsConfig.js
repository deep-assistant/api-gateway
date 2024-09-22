import OpenAI from "openai";

const openai = new OpenAI({
  timeout: 50 * 1000,
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

export const llmsConfig = {
  "gpt-4o": {
    modelName: "gpt-4o-plus",
    endpoint: openai,
    convertationEnergy: 1,
  },
  "gpt-4o-plus": {
    modelName: "gpt-4o-plus",
    endpoint: openai,
    convertationEnergy: 1,
  },
  "gpt-4o-mini": {
    modelName: "gpt-4o-mini",
    endpoint: openai,
    convertationEnergy: 14,
  },
  "gpt-auto": {
    modelName: "gpt-auto",
    endpoint: openai,
    convertationEnergy: 14,
  },
  "meta-llama/Meta-Llama-3.1-405B": {
    modelName: "meta-llama/Meta-Llama-3.1-405B-Instruct",
    endpoint: openai_opensource,
    convertationEnergy: 2,
  },
  "meta-llama/Meta-Llama-3.1-70B": {
    modelName: "meta-llama/Meta-Llama-3.1-70B-Instruct",
    endpoint: openai_opensource,
    convertationEnergy: 4,
  },
  "meta-llama/Meta-Llama-3.1-8B": {
    modelName: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    endpoint: openai_opensource,
    convertationEnergy: 50,
  },
  "meta-llama/Meta-Llama-3-70B": {
    modelName: "accounts/fireworks/models/llama-v3-70b-instruct",
    endpoint: openai_opensource,
    convertationEnergy: 4,
  },
  "gpt-3.5-turbo": {
    modelName: "gpt-3.5-turbo",
    endpoint: openai,
    convertationEnergy: 15,
  },
  "gpt-4o-mini_guo": {
    modelName: "gpt-4o-mini",
    endpoint: openai_aiguoguo,
    convertationEnergy: 15,
  },
  "o1-mini": {
    modelName: "o1-mini",
    endpoint: openai,
    convertationEnergy: 1,
  },
  "o1-preview": {
    modelName: "o1-preview",
    endpoint: openai,
    convertationEnergy: 0.15,
  },
  "claude-3": {
    modelName: "claude-3-opus-20240229",
    endpoint: openai,
    convertationEnergy: 1,
  },
  "claude-3-5": {
    modelName: "claude-3-5-sonnet-20240620",
    endpoint: openai,
    convertationEnergy: 0.15,
  },
  "uncensored": {
    modelName: "uncensored-small-32k-20240717",
    endpoint: openai,
    convertationEnergy: 10,
  },
  "gpt-4o_guo": {
    modelName: "gpt-4o",
    endpoint: openai_aiguoguo,
    convertationEnergy: 1,
  },
  "gpt-3.5-turbo_guo": {
    modelName: "gpt-3.5-turbo-0125",
    endpoint: openai_aiguoguo,
    convertationEnergy: 15,
  },
  "gpt-3.5-turbo-0125_guo": {
    modelName: "gpt-3.5-turbo-0125",
    endpoint: openai_aiguoguo,
    convertationEnergy: 15,
  },
};