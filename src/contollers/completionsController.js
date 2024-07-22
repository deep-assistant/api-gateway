import express from "express";

import { completionsService, tokensService } from "../services/index.js";

import { rest } from "../rest/rest.js";
import { HttpResponse } from "../rest/HttpResponse.js";
import { SSEResponse } from "../rest/SSEResponse.js";

const completionsController = express.Router();

completionsController.post(
  "/v1/chat/completions",
  rest(async ({ req, res }) => {
    const tokenId = tokensService.getTokenFromAuthorization(req.headers.authorization);
    await tokensService.isAdminToken(tokenId);

    const body = { ...req.body, stream_options: { include_usage: true } };

    const model = body.model;
    const stream = body.stream;

    if (!stream) {
      const completion = await completionsService.completions(body);
      const tokens = completion.usage.total_tokens;
      await completionsService.updateCompletionTokens({ model, tokenId, tokens });

      return new HttpResponse(200, completion);
    }

    const completion = await completionsService.completions(body);

    return new SSEResponse(async () => {
      for await (const chunk of completion) {
        res.write(SSEResponse.sendJSONEvent(chunk));

        if (!chunk.usage) continue;

        const tokens = chunk.usage.total_tokens;
        await completionsService.updateCompletionTokensByModel({ model, tokenId, tokens });
      }

      res.end();
    });
  }),
);

export default completionsController;
