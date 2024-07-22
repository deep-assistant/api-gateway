import OpenAI from "openai";

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
    convertationEnergy: 15,
  },
  "gpt-auto": {
    modelName: "gpt-auto",
    endpoint: openai,
    convertationEnergy: 15,
  },
  "nvidia/Nemotron-4-340B-Instruct": {
    modelName: "nvidia/Nemotron-4-340B-Instruct",
    endpoint: openai_deepinfra,
    convertationEnergy: 1.2,
  },
  "meta-llama/Meta-Llama-3-70B-Instruct": {
    modelName: "meta-llama/Meta-Llama-3-70B-Instruct",
    endpoint: openai_deepinfra,
    convertationEnergy: 3.5,
  },
  "deepinfra/deepinfra2-72B-Instruct": {
    modelName: "deepinfra/deepinfra2-72B-Instruct",
    endpoint: openai_deepinfra,
    convertationEnergy: 3.5,
  },
  "codellama/CodeLlama-70b-Instruct-hf": {
    modelName: "codellama/CodeLlama-70b-Instruct-hf",
    endpoint: openai_deepinfra,
    convertationEnergy: 3.5,
  },
  "microsoft/WizardLM-2-8x22B": {
    modelName: "microsoft/WizardLM-2-8x22B",
    endpoint: openai_deepinfra,
    convertationEnergy: 3.5,
  },
  "gpt-3.5-turbo": {
    modelName: "gpt-3.5-turbo",
    endpoint: openai,
    convertationEnergy: 15,
  },
  "meta-llama/Meta-Llama-3-8B-Instruct": {
    modelName: "meta-llama/Meta-Llama-3-8B-Instruct",
    endpoint: openai_deepinfra,
    convertationEnergy: 50,
  },
  "microsoft/WizardLM-2-7B": {
    modelName: "microsoft/WizardLM-2-7B",
    endpoint: openai_deepinfra,
    convertationEnergy: 50,
  },
  "gpt-4o-mini_guo": {
    modelName: "gpt-4o-mini",
    endpoint: openai_aiguoguo,
    convertationEnergy: 15,
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
