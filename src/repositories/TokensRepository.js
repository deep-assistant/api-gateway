import crypto from "crypto";

export class TokensRepository {
    constructor(tokensDB) {
        this.tokensDB = tokensDB;
    }

    getAllTokens() {
        return this.tokensDB.data;
    }


    async generateToken(user_id, tokens) {
        const token = {
            id: crypto.randomBytes(16).toString("hex"),
            user_id: user_id,
            tokens_gpt: tokens,
        };

        await this.tokensDB.update(({tokens}) => tokens.push(token))

        return token;

    }

    async getTokenByUserId(userId) {
        const token = this.tokensDB.data.tokens.find((token) => token.user_id === userId);
        if (!token) {
            return await this.generateToken(userId, 10000);
        }

        return token;
    }

    async getTokenById(tokenId) {
        return this.tokensDB.data.tokens.find((token) => token.id === tokenId);
    }

    async updateTokenByUserId(userId, token) {
        await this.tokensDB.update(({tokens}) => {
            const foundToken = tokens.find(item => item.user_id === userId);
            Object.assign(foundToken, token)
        })
    }

    async hasUserToken(userId) {
        const tokensData = await this.getAllTokens();
        return !!tokensData.tokens.find((token) => token.user_id === userId);
    }
}

