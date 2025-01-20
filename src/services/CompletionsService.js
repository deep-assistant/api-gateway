import {llmsConfig, tryCompletionsConfig} from "../utils/llmsConfig.js";

export class CompletionsService {
    constructor(tokensService, tokensRepository) {
        this.tokensService = tokensService;
        this.tokensRepository = tokensRepository;
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
                // console.log(llmsConfig[endpoint]);
                const completionEndpoint = llmsConfig[endpoint].endpoint;
                const model = llmsConfig[endpoint].modelName;

                return await completionEndpoint.chat.completions.create({...params, model});
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
