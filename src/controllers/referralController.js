import express from "express";
import { rest } from "../rest/rest.js";
import { referralService, tokensService } from "../services/index.js";
import { HttpResponse } from "../rest/HttpResponse.js";

const referralController = express.Router();

referralController.post(
  "/referral",
  rest(async ({ req }) => {
    const masterToken = tokensService.getMasterTokenFromRequest(req);
    await tokensService.isValidMasterToken(masterToken);

    // Фикс: Обработка "None" и пустых значений
    let referralId = req.query.referralId?.trim() || null;
    if (referralId === "None" || referralId === "null") referralId = null;

    return new HttpResponse(
      201,
      await referralService.createReferral(req.query.userId, referralId)
    );
  })
);

referralController.get(
  "/referral",
  rest(async ({ req }) => {
    const masterToken = tokensService.getMasterTokenFromRequest(req);
    await tokensService.isValidMasterToken(masterToken);
    return new HttpResponse(200, await referralService.getReferral(req.query.userId));
  })
);

export default referralController;