import { llmsConfig } from "../utils/llmsConfig.js";

export class CompletionsService {
  constructor(tokensService) {
    this.tokensService = tokensService;
  }

  async updateCompletionTokens(tokenId, energy) {
    const adminToken = await this.tokensService.getAdminTokenById(tokenId);
    if (!adminToken) return;

    await this.tokensService.updateAdminToken(tokenId, energy);

    const user_token = adminToken.user_id;
    if (!user_token) return;

    await this.tokensService.updateUserToken(user_token, energy);
  }

  async updateCompletionTokensByModel({ model, tokenId, tokens }) {
    const convertationEnergy = llmsConfig[model].convertationEnergy;
    const energy = Math.round(tokens / convertationEnergy);

    await this.updateCompletionTokens(tokenId, energy);
  }

  async tryEndpoints(params, endpoints) {
    for await (const endpoint of endpoints) {
      try {
        const completionEndpoint = llmsConfig[endpoint].endpoint;
        const model = llmsConfig[endpoint].modelName;

        return await completionEndpoint.chat.completions.create({ ...params, model });
      } catch (e) {
        console.log(e);
      }
    }
  }

  async completions(params) {
    return this.tryEndpoints(params, [params.model, `${params.model}_guo`, "gpt-auto"]);
  }
}
