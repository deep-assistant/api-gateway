import express from "express";

import { rest } from "../rest/rest.js";
import { completionsService, tokensService } from "../services/index.js";
import { HttpResponse } from "../rest/HttpResponse.js";
import { HttpException } from "../rest/HttpException.js";

const tokensController = express.Router();

tokensController.get(
  "/token",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    return new HttpResponse(200, await tokensService.getTokenByUserId(req.query.userId));
  }),
);

tokensController.get(
  "/token/has",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    const hasUser = await tokensService.hasUserToken(req.query.userId);
    return new HttpResponse(200, { hasUser });
  }),
);

tokensController.put(
  "/token",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    const { operation, amount } = req.body;

    const token = await tokensService.getTokenByUserId(req.query.userId);

    return new HttpResponse(200, await completionsService.updateCompletionTokens(token.user_id, amount, operation));
  }),
);

tokensController.post(
  "/token",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    return new HttpResponse(200, await tokensService.regenerateToken(req.query.userId));
  }),
);

tokensController.get(
  "/tokens",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    const tokens = await tokensService.tokensRepository.getAllTokens();
    return new HttpResponse(200, { tokens });
  }),
);

tokensController.post(
  "/tokens/sync",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    const { userId, userData } = req.body;

    if (!userId) {
      throw new HttpException(400, "userId is required");
    }

    await tokensService.tokensRepository.syncUserData(userId, userData);
    
    const updatedToken = await tokensService.getTokenByUserId(userId);
    return new HttpResponse(200, { success: true, token: updatedToken });
  }),
);

export default tokensController;
