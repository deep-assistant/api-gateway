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
            console.log(`[ executing streaming model ${model} ]`);
            
            try {
                const completion = await completionsService.completions({ ...body, stream: false });

                if (!completion || !completion.usage) {
                    console.error(`[ Error: completion or completion.usage not defined for model ${model} ]`);
                    return new HttpResponse(500, { 
                        error: "Сервис нейросети временно недоступен. Попробуйте позже или выберите другую модель.",
                        message: "Сервис нейросети временно недоступен. Попробуйте позже или выберите другую модель.",
                        status: "error"
                    });
                }

                const tokens = completion.usage.total_tokens;
                await completionsService.updateCompletionTokensByModel({ model, tokenId, tokens });
            } catch (error) {
                console.error(`[ Error executing streaming model ${model} ]:`, error.message);
                
                // Передаём пользователю реальное сообщение об ошибке от провайдера
                let userMessage = error.message;
                
                // Если это наше общее сообщение о недоступности всех провайдеров, 
                // берём первое сообщение об ошибке от конкретного провайдера
                if (error.message.includes("All providers unavailable")) {
                    const lines = error.message.split('\n');
                    for (const line of lines) {
                        if (line.includes(' → ') && line.includes(': ')) {
                            userMessage = line.split(': ')[1] || line;
                            break;
                        }
                    }
                }
                
                return new HttpResponse(500, { error: userMessage });
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
                    console.error(`[ Error: completion or completion.usage not defined for model ${model} ]`);
                    return new HttpResponse(500, { 
                        error: "Сервис нейросети временно недоступен. Попробуйте позже или выберите другую модель.",
                        message: "Сервис нейросети временно недоступен. Попробуйте позже или выберите другую модель.",
                        status: "error"
                    });
                }
                
                const tokens = completion.usage.total_tokens;
                await completionsService.updateCompletionTokensByModel({ model, tokenId, tokens });

                console.log(`[ processing completed for model ${model}, tokens spent: ${tokens} ]`);
                return new HttpResponse(200, completion);
            } catch (error) {
                console.error(`[ Error executing model ${model} ]:`, error.message);
                
                // Передаём пользователю реальное сообщение об ошибке от провайдера
                let userMessage = error.message;
                
                // Если это наше общее сообщение о недоступности всех провайдеров, 
                // берём первое сообщение об ошибке от конкретного провайдера
                if (error.message.includes("All providers unavailable")) {
                    const lines = error.message.split('\n');
                    for (const line of lines) {
                        if (line.includes(' → ') && line.includes(': ')) {
                            userMessage = line.split(': ')[1] || line;
                            break;
                        }
                    }
                }
                
                return new HttpResponse(500, { error: userMessage });
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
            // Передаём пользователю реальное сообщение об ошибке от провайдера
            let userMessage = error.message;
            
            // Если это наше общее сообщение о недоступности всех провайдеров, 
            // берём первое сообщение об ошибке от конкретного провайдера
            if (error.message.includes("All providers unavailable")) {
                const lines = error.message.split('\n');
                for (const line of lines) {
                    if (line.includes(' → ') && line.includes(': ')) {
                        userMessage = line.split(': ')[1] || line;
                        break;
                    }
                }
            }
            
            console.log(`[${requestId}] 📤 To user: "${userMessage}"`);
            
            return new HttpResponse(500, { 
                error: userMessage,
                message: userMessage,
                status: "error"
            });
        }
    })
);

completionsController.post(
    "/completions",
    rest(async ({req}) => {
        const requestId = Math.random().toString(36).substring(2, 15);

        const masterToken = tokensService.getMasterTokenFromRequest(req);
        await tokensService.isValidMasterToken(masterToken);
        console.log(`[${requestId}] 📨 POST /completions`);

        const body = req.body;
        const model = body.model;
        const content = body.content;
        const systemMessage = body.systemMessage;
        const userId = body.userId;
 
        console.log(`[${requestId}] 👤 User ${userId} requesting model ${model}`);
        console.log(`[${requestId}] 💬 Message: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);
        
        const token = await tokensService.getTokenByUserId(userId);
        console.log(`[${requestId}] 🔑 User token obtained, ID: ${token.id}`);

        await dialogsService.addMessageToDialog(userId, content);
        console.log(`[${requestId}] 💾 Message added to dialog`);

        const messages = await dialogsService.getDialogWithSystem(userId, systemMessage, model);
        console.log(`[${requestId}] 📝 Dialog history loaded, messages: ${messages.length}`);

        try {
            const completion = await completionsService.completions({stream: false, model, messages});
            
            if (!completion || !completion.usage) {
                console.error(`[${requestId}] ❌ Error: completion or completion.usage not defined for model ${model}`);
                return new HttpResponse(500, { 
                    error: "Модель временно недоступна. Попробуйте позже или выберите другую модель.",
                    message: "Модель временно недоступна. Попробуйте позже или выберите другую модель.",
                    status: "error"
                });
            }
            
            const tokens = completion.usage.total_tokens;
            console.log(`[${requestId}] 🎯 Received response from model ${model}, tokens: ${tokens}`);

            await dialogsService.addMessageToDialog(userId, completion.choices[0].message.content);
            console.log(`[${requestId}] 💾 AI response added to dialog`);

            completion.usage.energy = await completionsService.updateCompletionTokensByModel({
                model,
                tokenId: token.id,
                tokens,
            });
            
            console.log(`[${requestId}] ✅ Request completed successfully. Energy: ${completion.usage.energy}`);
            return new HttpResponse(200, completion);
            
        } catch (error) {
            // Передаём пользователю реальное сообщение об ошибке от провайдера
            let userMessage = error.message;
            
            // Если это наше общее сообщение о недоступности всех провайдеров, 
            // берём первое сообщение об ошибке от конкретного провайдера
            if (error.message.includes("All providers unavailable")) {
                const lines = error.message.split('\n');
                for (const line of lines) {
                    if (line.includes(' → ') && line.includes(': ')) {
                        userMessage = line.split(': ')[1] || line;
                        break;
                    }
                }
            }
            
            console.log(`[${requestId}] 📤 To user: "${userMessage}"`);
            
            return new HttpResponse(500, { 
                error: userMessage,
                message: userMessage,
                status: "error"
            });
        }
    }),
);

export default completionsController;
