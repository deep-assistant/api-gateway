import express from "express";

import { rest } from "../rest/rest.js";
import { systemMessageService, tokensService } from "../services/index.js";
import { HttpResponse } from "../rest/HttpResponse.js";

const systemMessagesController = express.Router();

systemMessagesController.post(
  "/system-message",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    return new HttpResponse(
      200,
      await systemMessageService.createSystemMessage(String(req.body.userId), req.body.message),
    );
  }),
);

systemMessagesController.get(
  "/system-message",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    return new HttpResponse(200, await systemMessageService.getSystemMessage(String(req.query.userId)));
  }),
);

export default systemMessagesController;
