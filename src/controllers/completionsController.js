import express from "express";

import {completionsService, dialogsService, tokensService} from "../services/index.js";

import {rest} from "../rest/rest.js";
import {HttpResponse} from "../rest/HttpResponse.js";
import {SSEResponse} from "../rest/SSEResponse.js";

const completionsController = express.Router();

//todo рефакторинг
completionsController.post(
    "/v1/chat/completions",
    rest(async ({ req, res }) => {
        console.log(`[ POST /v1/chat/completions ]`);

        const tokenId = tokensService.getTokenFromAuthorization(req.headers.authorization);
        await tokensService.isAdminToken(tokenId);
        await tokensService.isHasBalanceToken(tokenId);

        const body = req.body;
        const model = body.model;
        const stream = body.stream;

        if ((model.startsWith("o1") || model.startsWith("claude")) && stream) {
            console.log(`[ выполнение потоковой модели ${model} ]`);
            
            try {
                const completion = await completionsService.completions({ ...body, stream: false });

                if (!completion || !completion.usage) {
                    console.error(`[ Ошибка: completion или completion.usage не определены для модели ${model} ]`);
                    return new HttpResponse(500, { error: "Ошибка обработки запроса" });
                }

                const tokens = completion.usage.total_tokens;
                await completionsService.updateCompletionTokensByModel({ model, tokenId, tokens });
            } catch (error) {
                console.error(`[ Ошибка при выполнении потоковой модели ${model} ]:`, error.message);
                return new HttpResponse(500, { error: "Ошибка обработки запроса" });
            }

            return new SSEResponse(async () => {
                res.write(
                    SSEResponse.sendJSONEvent({
                        choices: [{ delta: completion.choices[0].message, finish_reason: null, index: 0 }],
                        created: completion.created,
                        id: completion.id,
                        model: completion.model,
                        object: "chat.completion.chunk",
                    })
                );

                res.write(
                    SSEResponse.sendJSONEvent({
                        choices: [{delta: {}, finish_reason: "stop", index: 0}],
                        created: completion.created,
                        id: completion.id,
                        model: completion.model,
                        object: "chat.completion.chunk",
                    }),
                );

                // console.log(completion);

                const tokens = completion.usage.total_tokens;

                completion.usage.energy = await completionsService.updateCompletionTokensByModel({
                    model,
                    tokenId,
                    tokens,
                });

                res.write(
                    SSEResponse.sendJSONEvent({
                        id: completion.id,
                        object: "chat.completion.chunk",
                        created: completion.created,
                        model: completion.model,
                        system_fingerprint: "",
                        choices: [],
                        usage: completion.usage,
                    }),
                );

                res.write(SSEResponse.sendSSEEvent("[DONE]"));
                res.end();
            });
        }

        if (stream) {
            body["stream_options"] = {include_usage: true};
        }

        if (!stream) {
            try {
                const completion = await completionsService.completions(body);
                
                if (!completion || !completion.usage) {
                    console.error(`[ Ошибка: completion или completion.usage не определены для модели ${model} ]`);
                    return new HttpResponse(500, { error: "Ошибка обработки запроса" });
                }
                
                const tokens = completion.usage.total_tokens;
                await completionsService.updateCompletionTokensByModel({ model, tokenId, tokens });

                console.log(`[ обработка завершена для модели ${model}, токены израсходованы: ${tokens} ]`);
                return new HttpResponse(200, completion);
            } catch (error) {
                console.error(`[ Ошибка при выполнении модели ${model} ]:`, error.message);
                return new HttpResponse(500, { error: "Ошибка обработки запроса" });
            }
        }

        try {
            const completion = await completionsService.completions(body);

            return new SSEResponse(async () => {

                if (!completion) {
                    res.write(SSEResponse.sendSSEEvent("[DONE]"));
                    res.end();
                    return;
                }

            
            for await (const chunk of completion) {
                if (chunk.usage) {
                    const tokens = chunk.usage.total_tokens;
                    chunk.usage.energy = await completionsService.updateCompletionTokensByModel({
                        model,
                        tokenId,
                        tokens,
                    });
                }

                res.write(SSEResponse.sendJSONEvent(chunk));
            }

            res.write(SSEResponse.sendSSEEvent("[DONE]"));
            res.end();
        });
        } catch (error) {
            console.error(`[ Ошибка при выполнении потоковой модели ${model} ]:`, error.message);
            return new HttpResponse(500, { error: "Ошибка обработки запроса" });
        }
    })
);

completionsController.post(
    "/completions",
    rest(async ({req}) => {
        await tokensService.isValidMasterToken(req.query.masterToken);
        console.log(`[ POST /completions ]`);

        const body = req.body;
        const model = body.model;
        const content = body.content;
        const systemMessage = body.systemMessage;
        const userId = body.userId;
 
        console.log(`[ начало обработки для пользователя ${userId}, модель ${model} , запрос: "${content}"...`);
        const token = await tokensService.getTokenByUserId(userId);

        await dialogsService.addMessageToDialog(userId, content);

        const messages = await dialogsService.getDialogWithSystem(userId, systemMessage, model);

        try {
            const completion = await completionsService.completions({stream: false, model, messages});
            
            if (!completion || !completion.usage) {
                console.error(`[ Ошибка: completion или completion.usage не определены для модели ${model} ]`);
                return new HttpResponse(500, { error: "Ошибка обработки запроса" });
            }
            
            const tokens = completion.usage.total_tokens;

            await dialogsService.addMessageToDialog(userId, completion.choices[0].message.content);

        completion.usage.energy = await completionsService.updateCompletionTokensByModel({
            model,
            tokenId: token.id,
            tokens,
        });
        console.log(`...завершение обработки для пользователя ${userId}, токены израсходованы: ${tokens} ]`);
        return new HttpResponse(200, completion);
        } catch (error) {
            console.error(`[ Ошибка при выполнении модели ${model} для пользователя ${userId} ]:`, error.message);
            return new HttpResponse(500, { error: "Ошибка обработки запроса" });
        }
    }),
);

export default completionsController;
