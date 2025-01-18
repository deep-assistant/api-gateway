import { HttpException } from "../rest/HttpException.js";
import crypto from "crypto";

export class TokensService {
  constructor(tokensRepository) {
    this.tokensRepository = tokensRepository;
  }

  async getTokenById(tokenId) {
    console.log(`[ запрос на токен ${tokenId} ]`)
    return this.tokensRepository.getTokenById(tokenId);
  }

  async hasUserToken(userId) {
    console.log(`[ запрос на Юзертокен ${userId} ]`)
    return this.tokensRepository.hasUserToken(userId);
  }

  async getTokenByUserId(userId) {
    console.log(`[ запрос на токен Юзера ${userId} ]`)
    return this.tokensRepository.getTokenByUserId(userId);
  }

  async regenerateToken(userId) {
    console.log(`[ перегенерация токена у юзера ${userId} ]`)
    await this.tokensRepository.updateTokenByUserId(userId, { id: crypto.randomBytes(16).toString("hex") });
    return this.tokensRepository.getTokenByUserId(userId);
  }

  async isValidMasterToken(token) {
    console.log(`[ проверка мастер токена ${token}...`)
    if (token !== process.env.ADMIN_FIRST) {
      console.log(` не пройдена ]`)
      throw new HttpException(401, "Невалидный мастер токен!");
    }
    console.log(` пройдена ]`)
  }

  async isAdminToken(tokenId) {
    const tokensData = await this.tokensRepository.getAllTokens();
    const token = tokensData.tokens.find((token) => token.id === tokenId);
    console.log(`[ проверка админ токена ${token}...`)
    if (!token) {
      console.log(` не пройдена ]`)
      throw new HttpException(401, "Невалидный админ токен!");
    }
    console.log(` пройдена ]`)
  }

  async isHasBalanceToken(tokenId) {
    const tokensData = await this.tokensRepository.getAllTokens();
    const token = tokensData.tokens.find((token) => token.id === tokenId);

    console.log(`[ проверка баналса у пользователя ${token}...`)

    if(token.tokens_gpt == null) {
      console.log(` значение "null". выставлен баланс в 10к ]`)
      token.tokens_gpt = 10000;
    }
    if (token.tokens_gpt <= 0) {
      console.log(` не хватает баланса ]`)
      throw new HttpException(429, "Не хватает баланса!");
    }
    console.log(` проверка пройдена. баланс: ${token.tokens_gpt}]`)
  }

  getTokenFromAuthorization(authorization) {
    return authorization.split("Bearer ")[1];
  }
}
