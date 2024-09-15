import { fileURLToPath } from "url";
import path from "path";

import { generateAdminToken, generateUserToken, loadData, saveData } from "../utils/dbManager.js";
import { HttpException } from "../rest/HttpException.js";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokensFilePath = path.join(__dirname, "../db", "tokens.json");
const userTokensFilePath = path.join(__dirname, "../db", "user_tokens.json");

export class TokensService {
  async getTokensData(path) {
    let tokensData = await loadData(path);

    if (!tokensData || !tokensData.tokens) {
      tokensData = { tokens: [] };
    }

    return tokensData;
  }

  async getUserTokenById(tokenId, tokensData) {
    let userToken = tokensData.tokens.find((token) => token.id === tokenId);
    if (!userToken) {
      userToken = await generateUserToken(tokenId); // Лимиты по умолчанию
    }
    return userToken;
  }

  async getTokenById(tokenId, tokensData) {
    let userToken = tokensData.tokens.find((token) => token.id === tokenId);
    if (userToken) return userToken;

    return await generateAdminToken(tokenId); // Лимиты по умолчанию
  }

  async getUserToken(tokenId) {
    return this.getUserTokenById(tokenId, await this.getTokensData(userTokensFilePath));
  }

  async getAdminTokenByUserId(userId) {
    const userToken = await this.getUserToken(userId);
    const tokensData = await this.getTokensData(tokensFilePath);
    const adminToken = tokensData.tokens.find((token) => token.user_id === userToken.id);

    if (!adminToken) return await generateAdminToken(userToken.tokens_gpt, userId);

    return adminToken;
  }

  async regenerateAdminTokenByUserId(userId) {
    const userToken = await this.getUserToken(userId);
    const tokensData = await this.getTokensData(tokensFilePath);
    const adminToken = tokensData.tokens.find((token) => token.user_id === userToken.id);

    if (!adminToken) return await generateAdminToken(userToken.tokens_gpt, userId);

    await this.updateAdminTokenHash(
        adminToken.id,
        userToken.tokens_gpt,
        crypto.randomBytes(16).toString("hex")
    );

    return (await this.getTokensData(tokensFilePath)).tokens.find((token) => token.user_id === userToken.id);
  }

  async updateAdminTokenByUserId(userId) {
    const userToken = await this.getUserToken(userId);
    const tokensData = await this.getTokensData(tokensFilePath);
    const adminToken = tokensData.tokens.find((token) => token.user_id === userToken.id);

    if (!adminToken) return await generateAdminToken(userToken.tokens_gpt, userId);

    await this.updateAdminToken(
        adminToken.id,
        userToken.tokens_gpt,
    );
  }

  async getAdminTokenById(tokenId) {
    return this.getTokenById(tokenId, await this.getTokensData(tokensFilePath));
  }

  async isValidMasterToken(token) {
    if (token !== process.env.ADMIN_FIRST) {
      throw new HttpException(401, "Невалидный мастер токен!");
    }
  }

  async isAdminToken(tokenId) {
    const tokensData = await this.getTokensData(tokensFilePath);
    const token = tokensData.tokens.find((token) => token.id === tokenId);

    if (!token) {
      throw new HttpException(401, "Невалидный админ токен!");
    }
  }

  async isHasBalanceToken(tokenId) {
    const tokensData = await this.getTokensData(tokensFilePath);
    const token = tokensData.tokens.find((token) => token.id === tokenId);

    if(token.tokens_gpt < 0) {
      throw new HttpException(429, "Не хватает баланса!");
    }
  }

  getTokenFromAuthorization(authorization) {
    return authorization.split("Bearer ")[1];
  }

  async updateAdminToken(tokenId, energy) {
    const tokensData = await loadData(tokensFilePath);
    const tokens = tokensData.tokens.map((token) =>
      token.id === tokenId ? { ...token, tokens_gpt: energy } : token,
    );

    await saveData(tokensFilePath, { tokens });
  }

  async updateAdminTokenHash(tokenId, energy, hash) {
    const tokensData = await loadData(tokensFilePath);
    const tokens = tokensData.tokens.map((token) =>
        token.id === tokenId ? { ...token, tokens_gpt: energy,  id: hash } : token,
    );

    await saveData(tokensFilePath, { tokens });
  }

  async updateUserToken(tokenId, energy, operation="subtract") {
    const tokensData = await loadData(userTokensFilePath);
    const tokens = tokensData.tokens.map((token) =>
      token.id === tokenId ? { ...token, tokens_gpt: operation === "subtract" ? token.tokens_gpt - energy : token.tokens_gpt + energy } : token,
    );

    await saveData(userTokensFilePath, { tokens });
  }
}
