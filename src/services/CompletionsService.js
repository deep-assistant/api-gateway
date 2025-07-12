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
        console.log('updateCompletionTokens', 'energy', energy);

	if (!energy) return false;

        console.log('updateCompletionTokens', 'operation', operation);

	if (operation !== "subtract" && operation !== "add") return false;

        const tokenBonus = await this.tokensRepository.getTokenByUserId("666");

	console.log('updateCompletionTokens', 'tokenBonus', tokenBonus);

	const currentBonusTokens = tokenBonus && +tokenBonus.tokens_gpt || 0;

        console.log('updateCompletionTokens', 'currentBonusTokens', currentBonusTokens);

        const token = currentBonusTokens > 100000 && operation === "subtract" ? tokenBonus : await this.tokensService.getTokenByUserId(tokenId);

	console.log('updateCompletionTokens', 'token', token);

        if (!token) return false;

        const oldEnergy = +token.tokens_gpt || 0;

	console.log('updateCompletionTokens', 'oldEnergy', oldEnergy);

	const energyToSpend = +energy || 0;

	console.log('updateCompletionTokens', 'energyToSpend', energyToSpend);

        const newEnergy = operation === "add" ? oldEnergy + energyToSpend : oldEnergy - energyToSpend;

	console.log('updateCompletionTokens', 'newEnergy', newEnergy);

	await this.tokensRepository.updateTokenByUserId(token.user_id, { tokens_gpt: newEnergy });

        return true;
    }

    async updateCompletionTokensByModel({ model, tokenId, tokens }) {
        console.log('updateCompletionTokensByModel', 'arguments', { model, tokenId, tokens });

	const convertationEnergy = llmsConfig[model].convertationEnergy;
	console.log('updateCompletionTokensByModel', 'convertationEnergy', convertationEnergy);

        let energy = Math.round(tokens / convertationEnergy);
	console.log('updateCompletionTokensByModel', 'energy before profit margin', energy);

	let defaultProfitMargin = 0.5;
        console.log('updateCompletionTokensByModel', 'profit margin', defaultProfitMargin);

	energy *= (1 + defaultProfitMargin);
	console.log('updateCompletionTokensByModel', 'energy after profit margin', energy);

	const token = await this.tokensRepository.getTokenById(tokenId);
	console.log('updateCompletionTokensByModel', 'token', token);

        await this.updateCompletionTokens(token.user_id, energy, "subtract");

        return energy;
    }

    async tryEndpoints(params, endpoints) {
        const errors = [];
        const requestId = Math.random().toString(36).substring(2, 15);
        
        console.log(`[${requestId}] 🚀 Начинаем попытки подключения к провайдерам для модели ${params.model}`);
        console.log(`[${requestId}] 📋 Доступные эндпоинты:`, endpoints.map(endpoint => llmsConfig[endpoint]?.modelName || endpoint));
        
        for (let i = 0; i < endpoints.length; i++) {
            const endpoint = endpoints[i];
            const providerName = llmsConfig[endpoint]?.providerName || 'Unknown';
            const modelName = llmsConfig[endpoint]?.modelName || endpoint;
            
            console.log(`\n[${requestId}] 🔄 Попытка ${i + 1}/${endpoints.length}: ${providerName} (${modelName})`);
            
            try {
                const lastMessage = params.messages[params.messages.length-1];
                const messagePreview = typeof lastMessage.content === 'string' 
                    ? lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : '')
                    : JSON.stringify(lastMessage.content).substring(0, 100) + '...';
                
                console.log(`[${requestId}] 💬 Сообщение пользователя: "${messagePreview}"`);
                
                const completionEndpoint = llmsConfig[endpoint].endpoint;
                const model = llmsConfig[endpoint].modelName;
                
                // Обработка сообщений только для deepseek-reasoner
                let processedParams = {...params};
                if (model === 'deepseek-reasoner') {
                    processedParams.messages = this.processDialogHistory(params.messages);
                    console.log(`[${requestId}] 🔧 Применена специальная обработка для deepseek-reasoner`);
                }
                
                // Логируем параметры перед запросом
                console.log(`[${requestId}] 📤 Отправляем запрос к ${providerName}:`, {
                    provider: providerName,
                    model: modelName,
                    messagesCount: processedParams.messages.length,
                    stream: processedParams.stream,
                    timestamp: new Date().toISOString()
                });
                
                const startTime = Date.now();
                let response;
                
                try {
                    response = await completionEndpoint.chat.completions.create({
                        ...processedParams,
                        model
                    });
                    
                    const responseTime = Date.now() - startTime;
                    console.log(`[${requestId}] ✅ Успешный ответ от ${providerName} за ${responseTime}ms`);
                    
                } catch (err) {
                    const responseTime = Date.now() - startTime;
                    console.log(`[${requestId}] ❌ Ошибка от ${providerName} за ${responseTime}ms:`, err.message);
                    
                    // Детализация ошибок по типам
                    if (err.message.includes('429')) {
                        console.log(`[${requestId}] ⚠️  Превышен лимит запросов (429) у ${providerName}`);
                    } else if (err.message.includes('401')) {
                        console.log(`[${requestId}] 🔑 Проблема с API ключом (401) у ${providerName}`);
                    } else if (err.message.includes('503')) {
                        console.log(`[${requestId}] 🔧 Сервис недоступен (503) у ${providerName}`);
                    } else if (err.message.includes('500')) {
                        console.log(`[${requestId}] 🛠️  Внутренняя ошибка сервера (500) у ${providerName}`);
                    }
                    
                    throw err;
                }

                // Обрабатываем ответ - если приходит как строка, парсим в JSON
                if (typeof response === 'string') {
                    try {
                        response = JSON.parse(response);
                        console.log(`[${requestId}] 🔄 Ответ от ${providerName} был строкой, успешно распарсен`);
                    } catch (e) {
                        console.log(`[${requestId}] ❌ Ошибка парсинга ответа от ${providerName}:`, e.message);
                        throw new Error(`Не удалось распарсить ответ от ${providerName}`);
                    }
                }

                // Детальное логирование успешного ответа
                console.log(`[${requestId}] 📥 Детали ответа от ${providerName}:`, {
                    provider: providerName,
                    model: response.model,
                    responseId: response.id,
                    hasUsage: !!response.usage,
                    totalTokens: response.usage?.total_tokens || 'N/A',
                    promptTokens: response.usage?.prompt_tokens || 'N/A',
                    completionTokens: response.usage?.completion_tokens || 'N/A',
                    hasChoices: !!response.choices,
                    choicesCount: response.choices?.length || 0,
                    finishReason: response.choices?.[0]?.finish_reason || 'N/A',
                    responseTime: `${Date.now() - startTime}ms`
                });

                if (response.choices?.[0]?.message?.content) {
                    const contentPreview = response.choices[0].message.content.substring(0, 150) + 
                        (response.choices[0].message.content.length > 150 ? '...' : '');
                    console.log(`[${requestId}] 🤖 Ответ ИИ: "${contentPreview}"`);
                }

                console.log(`[${requestId}] 🎉 Успешно получили ответ от ${providerName}`);
                return response;
                
            } catch (e) {
                const errorMsg = `Ошибка обращения к нейросети "${llmsConfig[endpoint]?.modelName || endpoint}": ${e.message}`;
                console.log(`[${requestId}] ❌ ${errorMsg}`);
                errors.push(errorMsg);
                
                if (e.response && e.response.data) {
                    console.log(`[${requestId}] 📋 Детали ошибки от ${providerName}:`, JSON.stringify(e.response.data, null, 2));
                }
            }
        }
        
        // Если все эндпоинты завершились с ошибкой
        console.log(`\n[${requestId}] 💥 Все ${endpoints.length} провайдеров недоступны:`);
        errors.forEach((error, index) => {
            console.log(`[${requestId}]   ${index + 1}. ${error}`);
        });
        
        throw new Error(`Все доступные эндпоинты недоступны. Ошибки: ${errors.join('; ')}`);
    }

    async completions(params) {
        const requestId = Math.random().toString(36).substring(2, 15);
        const modelsChain = tryCompletionsConfig[params.model];

        console.log(`\n[${requestId}] 🎯 Начинаем обработку запроса к модели ${params.model}`);
        console.log(`[${requestId}] 🔗 Цепочка моделей:`, modelsChain || [params.model, `${params.model}_guo`, "gpt-auto"]);

        try {
            const result = await this.tryEndpoints(params, modelsChain || [params.model, `${params.model}_guo`, "gpt-auto"]);
            console.log(`[${requestId}] ✅ Запрос успешно обработан моделью ${params.model}`);
            return result;
        } catch (error) {
            console.error(`[${requestId}] 💥 Ошибка в completions для модели ${params.model}:`, error.message);
            throw error;
        }
    }
}
