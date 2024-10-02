import OpenAI from "openai";

const openai_original = new OpenAI({
    timeout: 50 * 1000,
    apiKey: process.env.OPENAI_ORIGINAL_API_KEY,
    baseURL: process.env.OPENAI_ORIGINAL_BASE_URL,
});

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
        modelName: "gpt-4o",
        endpoint: openai_original,
        convertationEnergy: 0.8,
    },
    "gpt-4o-plus": {
        modelName: "gpt-4o",
        endpoint: openai_original,
        convertationEnergy: 0.8,
    },
    "gpt-4o-mini": {
        modelName: "gpt-4o-mini",
        endpoint: openai_original,
        convertationEnergy: 13.6,
    },
    "gpt-auto": {
        modelName: "gpt-auto",
        endpoint: openai,
        convertationEnergy: 13.9,
    },
    "meta-llama/Meta-Llama-3.1-405B": {
        modelName: "meta-llama/Meta-Llama-3.1-405B-Instruct",
        endpoint: openai_opensource,
        convertationEnergy: 1.7,
    },
    "meta-llama/Meta-Llama-3.1-70B": {
        modelName: "meta-llama/Meta-Llama-3.1-70B-Instruct",
        endpoint: openai_opensource,
        convertationEnergy: 3.7,
    },
    "meta-llama/Meta-Llama-3.1-8B": {
        modelName: "meta-llama/Meta-Llama-3.1-8B-Instruct",
        endpoint: openai_opensource,
        convertationEnergy: 49.9,
    },
    "meta-llama/Meta-Llama-3-70B": {
        modelName: "accounts/fireworks/models/llama-v3-70b-instruct",
        endpoint: openai_opensource,
        convertationEnergy: 3.9,
    },
    "gpt-3.5-turbo": {
        modelName: "gpt-3.5-turbo",
        endpoint: openai_original,
        convertationEnergy: 14.7,
    },
    "gpt-4o-mini_guo": {
        modelName: "gpt-4o-mini",
        endpoint: openai_aiguoguo,
        convertationEnergy: 14.6,
    },
    "o1-mini": {
        modelName: "o1-mini",
        endpoint: openai_original,
        convertationEnergy: 0.8,
    },
    "o1-preview": {
        modelName: "o1-preview",
        endpoint: openai_original,
        convertationEnergy: 0.13,
    },
    "claude-3-haiku": {
        modelName: "claude-3-haiku-20240307",
        endpoint: openai_aiguoguo,
        convertationEnergy: 10,
    },
    "claude-3-5-sonnet": {
        modelName: "claude-3-5-sonnet-20240620",
        endpoint: openai_aiguoguo,
        convertationEnergy: 0.7,
    },
    "claude-3-opus": {
        modelName: "claude-3-opus-20240229",
        endpoint: openai_aiguoguo,
        convertationEnergy: 0.07,
    },
    uncensored: {
        modelName: "uncensored-small-32k-20240717",
        endpoint: openai,
        convertationEnergy: 9.9,
    },
    "gpt-4o_guo": {
        modelName: "gpt-4o",
        endpoint: openai_aiguoguo,
        convertationEnergy: 0.7,
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
};

export const tryCompletionsConfig = {
    "o1-preview": [
        "o1-preview",
        "o1-mini",
        "gpt-4o-plus",
        "gpt-4o-mini",
        "gpt-auto",
        "gpt-3.5-turbo",
        "gpt-4o_guo",
        "gpt-4o-mini_guo",
        "gpt-3.5-turbo_guo",
        "gpt-3.5-turbo-0125_guo",
    ],
    "o1-mini": [
        "o1-mini",
        "gpt-4o-mini",
        "gpt-auto",
        "gpt-3.5-turbo",
        "gpt-4o-mini_guo",
        "gpt-3.5-turbo_guo",
        "gpt-3.5-turbo-0125_guo",
    ],
    "gpt-4o-plus": [
        "gpt-4o",
        "o1-mini",
        "gpt-4o-plus",
        "gpt-4o-mini",
        "gpt-auto",
        "gpt-3.5-turbo",
        "gpt-4o_guo",
        "gpt-4o-mini_guo",
        "gpt-3.5-turbo_guo",
        "gpt-3.5-turbo-0125_guo",
    ],
    "gpt-4o": [
        "gpt-4o",
        "o1-mini",
        "gpt-4o-mini",
        "gpt-auto",
        "gpt-3.5-turbo",
        "gpt-4o_guo",
        "gpt-4o-mini_guo",
        "gpt-3.5-turbo_guo",
        "gpt-3.5-turbo-0125_guo",
    ],
    "gpt-4o-mini": [
        "gpt-4o-mini",
        "gpt-auto",
        "gpt-3.5-turbo",
        "gpt-4o-mini_guo",
        "gpt-3.5-turbo_guo",
        "gpt-3.5-turbo-0125_guo",
    ],
    "claude-3-opus": [
        "claude-3-opus",
        "claude-3-5-sonnet",
        "claude-3-haiku",
        "gpt-4o-plus",
        "gpt-4o",
        "o1-mini",
        "gpt-4o-mini",
        "gpt-auto",
        "gpt-3.5-turbo",
        "gpt-4o_guo",
        "gpt-4o-mini_guo",
        "gpt-3.5-turbo_guo",
        "gpt-3.5-turbo-0125_guo",
    ],
    "claude-3-5-sonnet": [
        "claude-3-5-sonnet",
        "claude-3-haiku",
        "gpt-4o-plus",
        "gpt-4o",
        "o1-mini",
        "gpt-4o-mini",
        "gpt-auto",
        "gpt-3.5-turbo",
        "gpt-4o_guo",
        "gpt-4o-mini_guo",
        "gpt-3.5-turbo_guo",
        "gpt-3.5-turbo-0125_guo",
    ],
    "claude-3-haiku": [
        "claude-3-haiku",
        "gpt-4o-mini",
        "gpt-auto",
        "gpt-3.5-turbo",
        "gpt-4o-mini_guo",
        "gpt-3.5-turbo_guo",
        "gpt-3.5-turbo-0125_guo",
    ],
};
