import {TokensService} from "./TokensService.js";
import {CompletionsService} from "./CompletionsService.js";
import {SystemMessageService} from "./SystemMessageService.js";
import {ReferralService} from "./ReferralService.js";

export const tokensService = new TokensService();
export const completionsService = new CompletionsService(tokensService);

export const systemMessageService = new SystemMessageService()

export const referralService = new ReferralService(tokensService)
