import express from "express";

import {rest} from "../rest/rest.js";
import {referralService, tokensService} from "../services/index.js";
import {HttpResponse} from "../rest/HttpResponse.js";

const referralController = express.Router();

referralController.post(
    "/referral",
    rest(async ({req}) => {
        await tokensService.isValidMasterToken(req.query.masterToken);

        console.log("referralController",req.query)

        return new HttpResponse(201, await referralService.createReferral(req.query.userId, req.query.referralId || null));
    }),
);

referralController.get(
    "/referral",
    rest(async ({req}) => {
        await tokensService.isValidMasterToken(req.query.masterToken);

        return new HttpResponse(200, await referralService.getReferral(req.query.userId));
    }),
);

referralController.get(
    "/referral/award",
    rest(async ({req}) => {
        await tokensService.isValidMasterToken(req.query.masterToken);

        return new HttpResponse(200, await referralService.getAward(req.query.userId));
    }),
);



export default referralController;