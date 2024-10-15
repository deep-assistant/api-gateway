import express from "express";

import { completionsService, tokensService } from "../services/index.js";

import { rest } from "../rest/rest.js";
import { HttpResponse } from "../rest/HttpResponse.js";
import { SSEResponse } from "../rest/SSEResponse.js";

const completionsController = express.Router();

completionsController.post(
  "/v1/chat/completions",
  rest(async ({ req, res }) => {
    console.log(`\n проверка токена`);
    const tokenId = tokensService.getTokenFromAuthorization(req.headers.authorization);
    await tokensService.isAdminToken(tokenId);
    await tokensService.isHasBalanceToken(tokenId);
    console.log(`\n токен проверен \n`);
    console.log(tokenId);

    const body = req.body;

    const model = body.model;
    const stream = body.stream;

    if (stream) {
      body["stream_options"] = { include_usage: true };
    }

    console.log(`\n модель: \n`);
    console.log(model);
    console.log(`\n параметр stream: \n`);
    console.log(stream);

    if (!stream) {
      const completion = await completionsService.completions(body);
      const tokens = completion.usage.total_tokens;
      await completionsService.updateCompletionTokensByModel({ model, tokenId, tokens });

      console.log(`\n без stream`);
      console.log(`\n completion: \n`);
      console.log(completion);
      console.log(`\n tokens: \n`);
      console.log(tokens);
      return new HttpResponse(200, completion);
    }

    const completion = await completionsService.completions(body);

    console.log(`\n использование stream`);
    console.log(`\n completion: \n`);
    console.log(completion);

    return new SSEResponse(async () => {
      if (!completion) {
        res.write(SSEResponse.sendSSEEvent("[DONE]"));
        res.end();
        return;
      }

      for await (const chunk of completion) {
        if (chunk.usage) {
          const tokens = chunk.usage.total_tokens;

          chunk.usage.energy = await completionsService.updateCompletionTokensByModel({
            model,
            tokenId,
            tokens,
          });
        }

        res.write(SSEResponse.sendJSONEvent(chunk));
      }

      res.write(SSEResponse.sendSSEEvent("[DONE]"));
      res.end();
    });
  }),
);

export default completionsController;
