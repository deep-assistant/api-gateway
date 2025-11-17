import { TokensService } from "./TokensService.js";
import { CompletionsService } from "./CompletionsService.js";
import { SystemMessageService } from "./SystemMessageService.js";
import { ReferralService } from "./ReferralService.js";
import { TransferService } from "./TransferService.js";
import { RecoveryService } from "./RecoveryService.js";
import { dialogsRepository, referralRepository, tokensRepository } from "../repositories/index.js";
import { TransferRepository } from "../repositories/TransferRepository.js";
import { DialogsService } from "./DialogsService.js";

export const tokensService = new TokensService(tokensRepository);
export const completionsService = new CompletionsService(tokensService, tokensRepository);

export const systemMessageService = new SystemMessageService();

export const referralService = new ReferralService(completionsService, referralRepository, tokensRepository);
export const dialogsService = new DialogsService(dialogsRepository);

// Transfer services
export const transferRepository = new TransferRepository();
export const transferService = new TransferService(tokensRepository, transferRepository);
export const recoveryService = new RecoveryService(transferService, transferRepository);
