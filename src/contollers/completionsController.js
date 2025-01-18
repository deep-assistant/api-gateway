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
            const completion = await completionsService.completions({ ...body, stream: false });

            const tokens = completion.usage.total_tokens;
            await completionsService.updateCompletionTokensByModel({ model, tokenId, tokens });

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

                const tokens = completion.usage.total_tokens;

                completion.usage.energy = await completionsService.updateCompletionTokensByModel({
                    model,
                    tokenId,
                    tokens,
                });

                res.write(SSEResponse.sendSSEEvent("[DONE]"));
                res.end();
            });
        }

        if (!stream) {
            const completion = await completionsService.completions(body);
            const tokens = completion.usage.total_tokens;
            await completionsService.updateCompletionTokensByModel({ model, tokenId, tokens });

            console.log(`[ обработка завершена для модели ${model}, токены израсходованы: ${tokens} ]`);
            return new HttpResponse(200, completion);
        }

        const completion = await completionsService.completions(body);

        return new SSEResponse(async () => {
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
    })
);

completionsController.post(
    "/completions",
    rest(async ({ req }) => {
        console.log(`[ POST /completions ]`);
        await tokensService.isValidMasterToken(req.query.masterToken);

        const body = req.body;
        const model = body.model;
        const userId = body.userId;

        console.log(`[ начало обработки для пользователя ${userId}, модель ${model} ]`);
        const token = await tokensService.getTokenByUserId(userId);

        const messages = await dialogsService.getDialogWithSystem(userId, body.systemMessage, model);
        const completion = await completionsService.completions({ stream: false, model, messages });

        const tokens = completion.usage.total_tokens;
        completion.usage.energy = await completionsService.updateCompletionTokensByModel({
            model,
            tokenId: token.id,
            tokens,
        });

        console.log(`[ завершение обработки для пользователя ${userId}, токены израсходованы: ${tokens} ]`);
        return new HttpResponse(200, completion);
    })
);

export default completionsController;
