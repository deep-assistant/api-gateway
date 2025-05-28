import express from "express";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";
import { rest } from "../rest/rest.js";
import { HttpResponse } from "../rest/HttpResponse.js";
import { completionsService, tokensService } from "../services/index.js";

const transcriptionsController = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

function getModel(model) {
    if (model === "whisper-1") {
        return 'openai/whisper-large-v3-turbo';
    }
    return model;
}

transcriptionsController.post(
    "/v1/audio/transcriptions",
    upload.single("file"),
    rest(async ({ req, res }) => {
        const { model, language } = req.body;
        const file = req.file;
        console.log(`[Транскрибация запроса: модель=${model}, файл=${file ? 'есть' : 'нет'}]`);

        if (!file || !model) {
            console.log(`[Транскрибация: Ошибка - Не указан файл или модель]`);
            return new HttpResponse(400, { error: "Не указан файл или модель" });
        }

        const tokenId = tokensService.getTokenFromAuthorization(req.headers.authorization);
        console.log(`[Транскрибация: Токен - ${tokenId}]`);

        try {
            await tokensService.isAdminToken(tokenId);
            await tokensService.isHasBalanceToken(tokenId);
            console.log(`[Транскрибация: Токен действителен]`);
        } catch (error) {
            console.log(`[Транскрибация: Ошибка токена - ${error.message}]`);
             return new HttpResponse(error.status || 500, { error: error.message });
        }

        const formData = new FormData();
        formData.append("file", file.buffer, file.originalname);
        formData.append("language", language);
        formData.append("model", getModel(model));
         formData.append('response_format', "verbose_json");


        try {
            const response = await fetch("https://api.deepinfra.com/v1/openai/audio/transcriptions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.FREE_OPENAI_KEY}`,
                    ...formData.getHeaders(),
                },
                body: formData,
            });

           const responseData = await response.json();
            console.log(`[Транскрибация: Deepinfra статус - ${response.status}]`);


            if (response.ok) {
                const duration = (Math.ceil(responseData.duration) * 15);
                const token = await tokensService.getTokenById(tokenId)
                await completionsService.updateCompletionTokens(token.user_id, duration, "subtract");
                console.log(`[Транскрибация: Списано токенов - ${duration}]`);
            }

            return new HttpResponse(response.status, responseData);

        } catch (error) {
             console.error(`[Транскрибация: Ошибка - ${error.message}]`);
             return new HttpResponse(500, { error: "Внутренняя ошибка сервера" });
        }
    }),
);

transcriptionsController.options("/v1/audio/transcriptions", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Max-Age", "43200");
   console.log(`[Транскрибация: OPTIONS]`);
    res.sendStatus(204);
});

export default transcriptionsController;

