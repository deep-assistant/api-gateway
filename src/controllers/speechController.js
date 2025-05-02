import express from "express";
import fetch from "node-fetch";
import { rest } from "../rest/rest.js";
import { HttpResponse } from "../rest/HttpResponse.js";
import { tokensService, completionsService } from "../services/index.js";

const speechController = express.Router();

speechController.post(
    "/v1/audio/speech",
    rest(async ({ req, res }) => {
        console.log("[TTS: Начало обработки запроса]");
        const { model, input, voice } = req.body;
        console.log(`[TTS запрос: модель=${model}, текст=${input ? input : 'нет'}, голос=${voice}]`);

        // Проверка обязательных полей
        if (!model || !input || !voice) {
            console.log(`[TTS: Ошибка - Не указаны обязательные поля]`);
            return new HttpResponse(400, { error: "Не указаны обязательные поля: model, input, voice" });
        }

        // Проверка токена
        const tokenId = tokensService.getTokenFromAuthorization(req.headers.authorization);
        console.log(`[TTS: Токен - ${tokenId}]`);

        try {
            await tokensService.isAdminToken(tokenId);
            await tokensService.isHasBalanceToken(tokenId);
            console.log(`[TTS: Токен действителен]`);
        } catch (error) {
            console.log(`[TTS: Ошибка токена - ${error.message}]`);
            return new HttpResponse(error.status || 500, { error: error.message });
        }

        // Расчет токенов (на основе длины текста)
        const tokenCost = Math.ceil(input.length * 0.5); // 1 токен за 10 символов
        console.log(`[TTS: Предполагаемый расход токенов - ${tokenCost}]`);

        // Параметры для API GoAPI
        const requestBody = {
            model,
            input,
            voice
        };

        try {
            console.log("[TTS: Отправка запроса к GoAPI]");
            // Отправка запроса к API GoAPI с тайм-аутом
            const url = `${process.env.OPENAI_BASE_URL}audio/speech`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody),
                timeout: 30000 // Тайм-аут 30 секунд
            });

            console.log(`[TTS: Ответ от GoAPI получен, статус - ${response.status}]`);

            if (!response.ok) {
                const errorData = await response.json();
                console.log(`[TTS: Ошибка API GoAPI - ${response.status} ${response.statusText}]`, errorData);
                return new HttpResponse(response.status, errorData);
            }

            // Получение аудиофайла
            const audioBuffer = await response.buffer();
            console.log("[TTS: Аудиофайл успешно получен]");

            // Списание токенов
            const token = await tokensService.getTokenById(tokenId);
            await completionsService.updateCompletionTokens(token.user_id, tokenCost, "subtract");
            console.log(`[TTS: Списано токенов - ${tokenCost}]`);

            // Формирование ответа
            res.setHeader("Content-Type", "audio/mpeg");
            res.setHeader("Content-Disposition", 'attachment; filename="speech.mp3"');
            res.setHeader("X-Token-Cost", tokenCost);
            console.log("[TTS: Отправка аудиофайла клиенту]");
            return res.send(audioBuffer);

        } catch (error) {
            console.error(`[TTS: Ошибка - ${error.message}]`);
            return new HttpResponse(500, { error: "Внутренняя ошибка сервера: " + error.message });
        }
    })
);

speechController.options("/v1/audio/speech", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Max-Age", "43200");
    console.log(`[TTS: OPTIONS запрос]`);
    res.sendStatus(204);
});

export default speechController;