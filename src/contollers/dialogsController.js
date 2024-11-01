import express from "express";
import {rest} from "../rest/rest.js";
import {HttpResponse} from "../rest/HttpResponse.js";
import {dialogsService} from "../services/index.js";

const dialogsController = express.Router();

dialogsController.delete('/dialogs', rest(async ({req, res}) => {

    return new HttpResponse(200, {status: await dialogsService.clearDialog(req.query.userId)});
}))

export default dialogsController;
