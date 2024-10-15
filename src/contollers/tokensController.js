import express from "express";

import { rest } from "../rest/rest.js";
import { completionsService, tokensService } from "../services/index.js";
import { HttpResponse } from "../rest/HttpResponse.js";

const tokensController = express.Router();

tokensController.get(
  "/token/admin",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    return new HttpResponse(200, await tokensService.getAdminTokenByUserId(req.query.userId));
  }),
);

tokensController.get(
  "/token/user",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    return new HttpResponse(200, await tokensService.getUserToken(req.query.userId));
  }),
);

tokensController.get(
  "/token/user/has",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    const hasUser = await tokensService.hasUserToken(req.query.userId);
    return new HttpResponse(200, { hasUser });
  }),
);

tokensController.put(
  "/token/user",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    const { operation, amount } = req.body;
    const token = await tokensService.getAdminTokenByUserId(req.query.userId);
    console.log(token);
    return new HttpResponse(200, await completionsService.updateCompletionTokens(token.id, amount, operation));
  }),
);

tokensController.post(
  "/token/admin",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    return new HttpResponse(200, await tokensService.regenerateAdminTokenByUserId(req.query.userId));
  }),
);

export default tokensController;
