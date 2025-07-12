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
        
        console.log(`[${requestId}] 🚀 Starting connection attempts to providers for model ${params.model}`);
        
        // Show endpoints with their baseURL
        const endpointsInfo = endpoints.map(endpoint => {
            const config = llmsConfig[endpoint];
            if (config) {
                const baseURL = config.endpoint.baseURL || 'Unknown';
                const shortURL = baseURL.replace(/^https?:\/\//, '').replace(/\/$/, '');
                const modelName = config.modelName || endpoint;
                return `${endpoint} → ${modelName} (${shortURL})`;
            }
            return endpoint;
        });
        console.log(`[${requestId}] 📋 Available endpoints:`, endpointsInfo);
        
        for (let i = 0; i < endpoints.length; i++) {
            const endpoint = endpoints[i];
            const config = llmsConfig[endpoint];
            
            if (!config) {
                console.log(`[${requestId}] ⚠️  Unknown endpoint: ${endpoint}`);
                continue;
            }
            
            const baseURL = config.endpoint.baseURL || 'Unknown';
            const shortURL = baseURL.replace(/^https?:\/\//, '').replace(/\/$/, '');
            const modelName = config.modelName || endpoint;
            
            console.log(`\n[${requestId}] 🔄 Attempt ${i + 1}/${endpoints.length}: ${endpoint} → ${modelName} (${shortURL})`);
            
            try {
                const lastMessage = params.messages[params.messages.length-1];
                const messagePreview = typeof lastMessage.content === 'string' 
                    ? lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : '')
                    : JSON.stringify(lastMessage.content).substring(0, 100) + '...';
                
                console.log(`[${requestId}] 💬 User message: "${messagePreview}"`);
                
                const completionEndpoint = config.endpoint;
                
                // Special message processing only for deepseek-reasoner
                let processedParams = {...params};
                if (modelName === 'deepseek-reasoner') {
                    processedParams.messages = this.processDialogHistory(params.messages);
                    console.log(`[${requestId}] 🔧 Applied special processing for deepseek-reasoner`);
                }
                
                // Log parameters before request
                console.log(`[${requestId}] 📤 Sending request to ${shortURL}:`, {
                    endpoint: endpoint,
                    targetModel: modelName,
                    actualModel: modelName,
                    messagesCount: processedParams.messages.length,
                    stream: processedParams.stream,
                    timestamp: new Date().toISOString()
                });
                
                const startTime = Date.now();
                let response;
                
                try {
                    response = await completionEndpoint.chat.completions.create({
                        ...processedParams,
                        model: modelName
                    });
                    
                    const responseTime = Date.now() - startTime;
                    console.log(`[${requestId}] ✅ Successful response from ${shortURL} in ${responseTime}ms`);
                    
                } catch (err) {
                    const responseTime = Date.now() - startTime;
                    console.log(`[${requestId}] ❌ Error from ${shortURL} in ${responseTime}ms:`, err.message);
                    
                    // Error type details
                    if (err.message.includes('429')) {
                        console.log(`[${requestId}] ⚠️  Rate limit exceeded (429) at ${shortURL}`);
                    } else if (err.message.includes('401')) {
                        console.log(`[${requestId}] 🔑 API key issue (401) at ${shortURL}`);
                    } else if (err.message.includes('503')) {
                        console.log(`[${requestId}] 🔧 Service unavailable (503) at ${shortURL}`);
                    } else if (err.message.includes('500')) {
                        console.log(`[${requestId}] 🛠️  Internal server error (500) at ${shortURL}`);
                    }
                    
                    throw err;
                }

                // Process response - if it comes as string, parse to JSON
                if (typeof response === 'string') {
                    try {
                        response = JSON.parse(response);
                        console.log(`[${requestId}] 🔄 Response from ${shortURL} was string, successfully parsed`);
                    } catch (e) {
                        console.log(`[${requestId}] ❌ Error parsing response from ${shortURL}:`, e.message);
                        throw new Error(`Failed to parse response from ${shortURL}`);
                    }
                }

                // Detailed logging of successful response
                console.log(`[${requestId}] 📥 Response details from ${shortURL}:`, {
                    endpoint: endpoint,
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
                    console.log(`[${requestId}] 🤖 AI response: "${contentPreview}"`);
                }

                console.log(`[${requestId}] 🎉 Successfully received response from ${shortURL}`);
                return response;
                
            } catch (e) {
                // Извлекаем реальное сообщение об ошибке от провайдера
                let providerError = e.message;
                
                if (e.response && e.response.data) {
                    console.log(`[${requestId}] 📋 Error details from ${shortURL}:`, JSON.stringify(e.response.data, null, 2));
                    
                    // Try to extract error message from provider response
                    if (e.response.data.error && e.response.data.error.message) {
                        providerError = e.response.data.error.message;
                    } else if (e.response.data.message) {
                        providerError = e.response.data.message;
                    } else if (e.response.data.detail) {
                        providerError = e.response.data.detail;
                    }
                }
                // Brief description
                let errorMessage = 'Unknown error';
                if (providerError.includes('429')) errorMessage = 'Rate limit exceeded';
                else if (providerError.includes('401')) errorMessage = 'API key expired';
                else if (providerError.includes('503')) errorMessage = 'No available resources';
                else if (providerError.includes('500')) errorMessage = 'Internal server error';
                
                errors.push({
                    endpoint,
                    modelName,
                    shortURL,
                    errorMessage,
                    providerError
                });
                const errorMsg = `${endpoint} → ${modelName} (${shortURL}): ${errorMessage}\n    ${providerError}`;
                console.log(`[${requestId}] ❌ ${errorMsg}`);
            }
        }
        
        // If all endpoints failed - summary version
        console.log(`\n[${requestId}] 💥 All ${endpoints.length} providers unavailable`);
        
        // Structured summary with details
        console.log(`[${requestId}] 📊 Detailed summary:`);
        errors.forEach((err, index) => {
            console.log(`[${requestId}]   ${index + 1}. ${err.endpoint} → ${err.modelName} (${err.shortURL}): ${err.errorMessage}`);
            console.log(`    ${err.providerError}`);
        });
        
        // Brief error message
        const shortErrors = errors.map(err => err.errorMessage);
        
        throw new Error(`All providers unavailable: ${shortErrors.join(', ')}`);
    }

    async completions(params) {
        const requestId = Math.random().toString(36).substring(2, 15);
        const modelsChain = tryCompletionsConfig[params.model];

        console.log(`\n[${requestId}] 🎯 Starting request processing for model ${params.model}`);
        console.log(`[${requestId}] 🔗 Model chain:`, modelsChain || [params.model, `${params.model}_guo`, "gpt-auto"]);

        try {
            const result = await this.tryEndpoints(params, modelsChain || [params.model, `${params.model}_guo`, "gpt-auto"]);
            console.log(`[${requestId}] ✅ Request successfully processed by model ${params.model}`);
            return result;
        } catch (error) {
            throw error;
        }
    }
}
