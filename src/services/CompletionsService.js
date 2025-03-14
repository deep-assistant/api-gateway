import {llmsConfig, tryCompletionsConfig} from "../utils/llmsConfig.js";

export class CompletionsService {
    constructor(tokensService, tokensRepository) {
        this.tokensService = tokensService;
        this.tokensRepository = tokensRepository;
    }

    // Функция для корректной обработки истории диалога
    processDialogHistory(messages) {
        const processedMessages = [];
        let currentRole = null;
        let currentContent = [];

        // Проходим по всем сообщениям
        for (const message of messages) {
            // Если роль изменилась или это первое сообщение
            if (message.role !== currentRole) {
                // Если есть накопленное содержимое, добавляем его
                if (currentRole && currentContent.length > 0) {
                    processedMessages.push({
                        role: currentRole,
                        content: currentContent.join('\n')
                    });
                }
                // Начинаем новое накопление
                currentRole = message.role;
                currentContent = [message.content];
            } else {
                // Добавляем содержимое к текущему накоплению
                currentContent.push(message.content);
            }
        }

        // Добавляем последнее накопленное сообщение
        if (currentRole && currentContent.length > 0) {
            processedMessages.push({
                role: currentRole,
                content: currentContent.join('\n')
            });
        }

        // Если последнее сообщение от ассистента, добавляем пустой запрос пользователя
        if (processedMessages.length > 0 && processedMessages[processedMessages.length - 1].role === 'assistant') {
            processedMessages.push({
                role: 'user',
                content: 'Продолжай'
            });
        }

        return processedMessages;
    }

    async updateCompletionTokens(tokenId, energy, operation) {
        const token = await this.tokensService.getTokenByUserId(tokenId);
        if (!token) return false;
        const newTokens = operation === "subtract" ? token.tokens_gpt - energy : token.tokens_gpt + energy;

        await this.tokensRepository.updateTokenByUserId(token.user_id, {tokens_gpt: newTokens});

        return true;
    }

    async updateCompletionTokensByModel({model, tokenId, tokens}) {
        const convertationEnergy = llmsConfig[model].convertationEnergy;
        const energy = Math.round(tokens / convertationEnergy);

        const token = await this.tokensRepository.getTokenById(tokenId)
        await this.updateCompletionTokens(token.user_id, energy, "subtract");

        return energy;
    }

    async tryEndpoints(params, endpoints) {
        for await (const endpoint of endpoints) {
            try {
                console.log(`[обращение к модели нейросети "${llmsConfig[endpoint].modelName}", сообщение: "${params.messages[params.messages.length-1].content}"]`);
                const completionEndpoint = llmsConfig[endpoint].endpoint;
                const model = llmsConfig[endpoint].modelName;
                
                // Обработка сообщений только для deepseek-reasoner
                let processedParams = {...params};
                if (model === 'deepseek-reasoner') {
                    processedParams.messages = this.processDialogHistory(params.messages);
                }
                
                return await completionEndpoint.chat.completions.create({
                    ...processedParams,
                    model
                });
            } catch (e) {
                console.log(`[Ошибка обращение к нейросети "${llmsConfig[endpoint].modelName}": "${e.message}"]`);
            }
        }
    }

    async completions(params) {
        const modelsChain = tryCompletionsConfig[params.model];

        return this.tryEndpoints(params, modelsChain || [params.model, `${params.model}_guo`, "gpt-auto"]);
    }
}
