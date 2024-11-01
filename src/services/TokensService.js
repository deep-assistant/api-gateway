import {HttpException} from "../rest/HttpException.js";
import crypto from "crypto";


export class TokensService {
    constructor(tokensRepository) {
        this.tokensRepository = tokensRepository;

    }

    async getTokenById(tokenId) {
        return this.tokensRepository.getTokenById(tokenId)
    }


    async hasUserToken(userId) {
        return this.tokensRepository.hasUserToken(userId);
    }

    async getTokenByUserId(userId) {
        return this.tokensRepository.getTokenByUserId(userId)
    }

    async regenerateToken(userId) {
        await this.tokensRepository.updateTokenByUserId(userId, {id: crypto.randomBytes(16).toString("hex")})
        return this.tokensRepository.getTokenByUserId(userId)
    }

    async isValidMasterToken(token) {
        if (token !== process.env.ADMIN_FIRST) {
            throw new HttpException(401, "Невалидный мастер токен!");
        }
    }

    async isAdminToken(tokenId) {
        const tokensData = await this.tokensRepository.getAllTokens();
        const token = tokensData.tokens.find((token) => token.id === tokenId);

        if (!token) {
            throw new HttpException(401, "Невалидный админ токен!");
        }
    }

    async isHasBalanceToken(tokenId) {
        const tokensData = await this.tokensRepository.getAllTokens();
        const token = tokensData.tokens.find((token) => token.id === tokenId);

        if (token.tokens_gpt <= 0) {
            throw new HttpException(429, "Не хватает баланса!");
        }
    }

    getTokenFromAuthorization(authorization) {
        return authorization.split("Bearer ")[1];
    }
}
