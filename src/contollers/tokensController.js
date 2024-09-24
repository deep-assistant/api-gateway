import express from "express";

import { rest } from "../rest/rest.js";
import { tokensService } from "../services/index.js";
import { HttpResponse } from "../rest/HttpResponse.js";

const tokensController = express.Router();

tokensController.get(
  "/token/admin",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    return new HttpResponse(200, await tokensService.getAdminTokenByUserId(req.query.userId));
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
