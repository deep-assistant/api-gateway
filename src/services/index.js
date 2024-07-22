import { TokensService } from "./TokensService.js";
import { CompletionsService } from "./CompletionsService.js";

export const tokensService = new TokensService();
export const completionsService = new CompletionsService(tokensService);
