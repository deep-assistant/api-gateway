import express from "express";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";
import {rest} from "../rest/rest.js";
import {HttpResponse} from "../rest/HttpResponse.js";
import {completionsService, tokensService} from "../services/index.js";

const transcriptionsController = express.Router();
const storage = multer.memoryStorage();
const upload = multer({storage});

function getModel(model) {
    if (model === "whisper-1") {
        return 'openai/whisper-large-v3-turbo'
    }

    return model;
}

transcriptionsController.post(
    "/v1/audio/transcriptions",
    upload.single("file"),
    rest(async ({req, res}) => {
        const {model, language} = req.body;
        const file = req.file;

        if (!file || !model) {
            return new HttpResponse(400, {error: "File and model are required"});
        }


        const tokenId = tokensService.getTokenFromAuthorization(req.headers.authorization);
        await tokensService.isAdminToken(tokenId);
        await tokensService.isHasBalanceToken(tokenId);

        console.log(getModel(model))
        const formData = new FormData();
        formData.append("file", file.buffer, file.originalname);
        formData.append("language", language);
        formData.append("model", getModel(model));
        formData.append('response_format', "verbose_json");

        const response = await fetch("https://api.deepinfra.com/v1/openai/audio/transcriptions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.FREE_OPENAI_KEY}`,
                ...formData.getHeaders(),
            },
            body: formData,
        });

        const responseData = await response.json();

        if (response.ok) {
            const duration = (Math.ceil(responseData.duration) * 15);
            const token = await tokensService.getTokenById(tokenId)
            console.log(duration, 'duration')
            console.log(token, 'token')
            await completionsService.updateCompletionTokens(token.user_id, duration, "subtract");
        }

        console.log(responseData);

        return new HttpResponse(response.status, responseData);
    }),
);

transcriptionsController.options("/v1/audio/transcriptions", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Max-Age", "43200");

    res.sendStatus(204);
});

export default transcriptionsController;

