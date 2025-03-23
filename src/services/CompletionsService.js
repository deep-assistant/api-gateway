import {llmsConfig, tryCompletionsConfig} from "../utils/llmsConfig.js";

export class CompletionsService {
    constructor(tokensService, tokensRepository) {
        this.tokensService = tokensService;
        this.tokensRepository = tokensRepository;
    }

    // Функция для преобразования контента сообщения в строку
    processMessageContent(content) {
        if (typeof content === 'string') {
            return content;
        }
        if (Array.isArray(content)) {
            // Собираем только текстовые части из массива контента
            return content
                .filter(item => item.type === 'text')
                .map(item => item.text)
                .join('\n');
        }
        return '';
    }

    // Функция для обеспечения правильного чередования сообщений
    ensureCorrectMessageOrder(messages) {
        const result = [];
        let lastRole = null;

        for (const message of messages) {
            // Если это первое сообщение
            if (lastRole === null) {
                result.push(message);
                lastRole = message.role;
                continue;
            }

            // Если роли повторяются, добавляем промежуточное сообщение
            if (message.role === lastRole) {
                if (lastRole === 'user') {
                    result.push({
                        role: 'assistant',
                        content: 'Понятно, продолжайте.'
                    });
                } else {
                    result.push({
                        role: 'user',
                        content: 'Продолжай.'
                    });
                }
            }

            result.push(message);
            lastRole = message.role;
        }

        // Если последнее сообщение от ассистента, добавляем сообщение пользователя
        if (result.length > 0 && result[result.length - 1].role === 'assistant') {
            result.push({
                role: 'user',
                content: 'Продолжай'
            });
        }

        return result;
    }

    // Функция для корректной обработки истории диалога
    processDialogHistory(messages) {
        const processedMessages = [];
        
        // Проходим по всем сообщениям и разбиваем их по строкам
        for (const message of messages) {
            const content = this.processMessageContent(message.content);
            
            // Разбиваем контент на строки
            const lines = content.split('\n').filter(line => line.trim());
            
            let currentMessage = {
                role: message.role,
                content: []
            };

            // Проходим по каждой строке
            for (const line of lines) {
                // Если строка похожа на ответ ассистента (начинается с типичных маркеров)
                if (line.startsWith('**') || 
                    line.startsWith('Отвечаю как') || 
                    line.startsWith('I\'ll answer as') ||
                    line.startsWith('Я отвечу как')) {
                    
                    // Если у текущего сообщения есть контент, сохраняем его
                    if (currentMessage.content.length > 0) {
                        processedMessages.push({
                            role: currentMessage.role,
                            content: currentMessage.content.join('\n')
                        });
                        currentMessage.content = [];
                    }
                    
                    // Меняем роль на assistant
                    currentMessage.role = 'assistant';
                    currentMessage.content.push(line);
                }
                // Если это похоже на новый вопрос пользователя
                else if (line.endsWith('?') || 
                        line.toLowerCase().includes('что') || 
                        line.toLowerCase().includes('как') || 
                        line.toLowerCase().includes('почему')) {
                    
                    // Если у текущего сообщения есть контент, сохраняем его
                    if (currentMessage.content.length > 0) {
                        processedMessages.push({
                            role: currentMessage.role,
                            content: currentMessage.content.join('\n')
                        });
                        currentMessage.content = [];
                    }
                    
                    // Меняем роль на user
                    currentMessage.role = 'user';
                    currentMessage.content.push(line);
                }
                else {
                    // Добавляем строку к текущему сообщению
                    currentMessage.content.push(line);
                }
            }
            
            // Сохраняем последнее сообщение, если в нем есть контент
            if (currentMessage.content.length > 0) {
                processedMessages.push({
                    role: currentMessage.role,
                    content: currentMessage.content.join('\n')
                });
            }
        }

        // Обеспечиваем правильное чередование и последнее сообщение от пользователя
        return this.ensureCorrectMessageOrder(processedMessages);
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
                const lastMessage = params.messages[params.messages.length-1];
                console.log(`[обращение к модели нейросети "${llmsConfig[endpoint].modelName}", сообщение:`, JSON.stringify(lastMessage.content, null, 2), ']');
                
                const completionEndpoint = llmsConfig[endpoint].endpoint;
                const model = llmsConfig[endpoint].modelName;
                
                // Обработка сообщений только для deepseek-reasoner
                let processedParams = {...params};
                if (model === 'deepseek-reasoner') {
                    processedParams.messages = this.processDialogHistory(params.messages);
                    console.log('[История сообщений для deepseek-reasoner]:', JSON.stringify(processedParams.messages, null, 2));
                }
                
                const response = await completionEndpoint.chat.completions.create({
                    ...processedParams,
                    model
                });

                return response;
            } catch (e) {
                console.log(`[Ошибка обращение к нейросети "${llmsConfig[endpoint].modelName}":`, JSON.stringify(e.message, null, 2), ']');
                if (e.response && e.response.data) {
                    console.log('[Детали ошибки]:', JSON.stringify(e.response.data, null, 2));
                }
            }
        }
    }

    async completions(params) {
        const modelsChain = tryCompletionsConfig[params.model];

        return this.tryEndpoints(params, modelsChain || [params.model, `${params.model}_guo`, "gpt-auto"]);
    }
}
