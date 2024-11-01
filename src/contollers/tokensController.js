import express from "express";

import {rest} from "../rest/rest.js";
import {completionsService, tokensService} from "../services/index.js";
import {HttpResponse} from "../rest/HttpResponse.js";

const tokensController = express.Router();

tokensController.get(
    "/token",
    rest(async ({req}) => {
        await tokensService.isValidMasterToken(req.query.masterToken);

        return new HttpResponse(200, await tokensService.getTokenByUserId(req.query.userId));
    }),
);

tokensController.get(
    "/token/has",
    rest(async ({req}) => {
        await tokensService.isValidMasterToken(req.query.masterToken);

        const hasUser = await tokensService.hasUserToken(req.query.userId);
        return new HttpResponse(200, {hasUser});
    }),
);

tokensController.put(
    "/token",
    rest(async ({req}) => {
        await tokensService.isValidMasterToken(req.query.masterToken);

        const {operation, amount} = req.body;

        const token = await tokensService.getTokenByUserId(req.query.userId);

        return new HttpResponse(200, await completionsService.updateCompletionTokens(token.user_id, amount, operation));
    }),
);

tokensController.post(
    "/token",
    rest(async ({req}) => {
        await tokensService.isValidMasterToken(req.query.masterToken);

        return new HttpResponse(200, await tokensService.regenerateToken(req.query.userId));
    }),
);

export default tokensController;
