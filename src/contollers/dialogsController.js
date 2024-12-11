import express from "express";
import { rest } from "../rest/rest.js";
import { HttpResponse } from "../rest/HttpResponse.js";
import { dialogsService } from "../services/index.js";
import { completionsService, tokensService } from "../services/index.js";

const dialogsController = express.Router();

dialogsController.delete(
  "/dialogs",
  rest(async ({ req, res }) => {
    return new HttpResponse(200, { status: await dialogsService.clearDialog(req.query.userId) });
  }),
);


dialogsController.get(
  "/dialog-history",
  rest(async ({ req }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);
    const token = await tokensService.getTokenByUserId(req.query.dialogName);


    const history = await dialogsService.findDialogById(token.user_id)

    if(!history.messages.length || history.messages.length==0) {
      return new HttpResponse(404, "История диалога очищена");
    }
    
    return new HttpResponse(200, history);
  }),
);

export default dialogsController;

