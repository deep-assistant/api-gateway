import express from "express";

import { rest } from "../rest/rest.js";
import { HttpResponse } from "../rest/HttpResponse.js";
import { llmsConfig } from "../utils/llmsConfig.js";

const modelsController = express.Router();

/**
 * GET /v1/models
 * Returns a list of all available models in OpenAI-compatible format
 * This endpoint is used by Cursor and other OpenAI-compatible clients
 * to discover which models are available.
 */
modelsController.get(
  "/v1/models",
  rest(async ({ req }) => {
    console.log("[ GET /v1/models ]");

    // Get unique model names (filter out provider-specific variants like _go, _guo, etc.)
    const uniqueModels = new Set();
    const modelData = [];

    for (const [key, config] of Object.entries(llmsConfig)) {
      // Extract base model name (without provider suffix)
      const baseModelName = key.replace(/_go$|_guo$|_openrouter$/, "");

      // Only add unique base models to avoid duplicates
      if (!uniqueModels.has(baseModelName)) {
        uniqueModels.add(baseModelName);

        // Determine owner based on model name
        let owner = "openai";
        if (baseModelName.startsWith("claude")) {
          owner = "anthropic";
        } else if (baseModelName.startsWith("meta-llama")) {
          owner = "meta";
        } else if (baseModelName.startsWith("microsoft")) {
          owner = "microsoft";
        } else if (baseModelName.startsWith("deepseek")) {
          owner = "deepseek";
        } else if (baseModelName.startsWith("gpt")) {
          owner = "openai";
        } else if (baseModelName.startsWith("o1") || baseModelName.startsWith("o3")) {
          owner = "openai";
        } else if (baseModelName === "uncensored") {
          owner = "community";
        }

        modelData.push({
          id: baseModelName,
          object: "model",
          created: Math.floor(Date.now() / 1000), // Unix timestamp
          owned_by: owner,
        });
      }
    }

    // Sort models alphabetically by id for consistency
    modelData.sort((a, b) => a.id.localeCompare(b.id));

    const response = {
      object: "list",
      data: modelData,
    };

    console.log(`[ returning ${modelData.length} unique models ]`);
    return new HttpResponse(200, response);
  })
);

/**
 * GET /v1/models/:model
 * Returns information about a specific model
 * This is also part of the OpenAI-compatible API
 */
modelsController.get(
  "/v1/models/:model",
  rest(async ({ req }) => {
    const modelId = req.params.model;
    console.log(`[ GET /v1/models/${modelId} ]`);

    // Check if the model exists (with or without provider suffix)
    let modelConfig = llmsConfig[modelId];

    // If not found directly, try to find a variant with provider suffix
    if (!modelConfig) {
      const possibleKeys = Object.keys(llmsConfig).filter(key =>
        key === modelId || key.startsWith(modelId + "_")
      );

      if (possibleKeys.length > 0) {
        modelConfig = llmsConfig[possibleKeys[0]];
      }
    }

    if (!modelConfig) {
      return new HttpResponse(404, {
        error: {
          message: `The model '${modelId}' does not exist`,
          type: "invalid_request_error",
          param: null,
          code: "model_not_found",
        },
      });
    }

    // Determine owner based on model name
    let owner = "openai";
    if (modelId.startsWith("claude")) {
      owner = "anthropic";
    } else if (modelId.startsWith("meta-llama")) {
      owner = "meta";
    } else if (modelId.startsWith("microsoft")) {
      owner = "microsoft";
    } else if (modelId.startsWith("deepseek")) {
      owner = "deepseek";
    } else if (modelId.startsWith("gpt")) {
      owner = "openai";
    } else if (modelId.startsWith("o1") || modelId.startsWith("o3")) {
      owner = "openai";
    } else if (modelId === "uncensored") {
      owner = "community";
    }

    const response = {
      id: modelId,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: owner,
    };

    console.log(`[ returning model info for ${modelId} ]`);
    return new HttpResponse(200, response);
  })
);

export default modelsController;
