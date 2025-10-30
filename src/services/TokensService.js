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
    console.log(`[ проверка админ токена ${tokenId}...`)
    if (!token) {
      console.log(` не пройдена ]`)
      throw new HttpException(401, "Невалидный админ токен!");
    }
    console.log(` пройдена ]`)
  }

  async isHasBalanceToken(tokenId) {
    const tokensData = await this.tokensRepository.getAllTokens();
    const token = tokensData.tokens.find((token) => token.id === tokenId);

    console.log(`[ проверка баналса у пользователя ${tokenId}...`)

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

  /**
   * Extract master token from request, supporting both Authorization header and query parameter.
   * Priority: Authorization header > query parameter (deprecated)
   * @param {Request} req - Express request object
   * @returns {string} Master token
   * @throws {HttpException} If no token is provided
   */
  getMasterTokenFromRequest(req) {
    // Priority 1: Check Authorization header (recommended)
    const authHeader = req.headers.authorization;
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.split('Bearer ')[1];
      }
      // Handle case where "Bearer " prefix is missing
      console.log('⚠️ [WARNING] Authorization header present but missing "Bearer " prefix');
    }

    // Priority 2: Fall back to query parameter (deprecated)
    if (req.query.masterToken) {
      console.log('⚠️ [DEPRECATED] Using masterToken in query parameter is deprecated and will be removed in v2.0.0.');
      console.log('   Please migrate to using Authorization header: "Authorization: Bearer <token>"');
      console.log('   See documentation: https://github.com/deep-assistant/api-gateway#authentication');
      return req.query.masterToken;
    }

    // No token provided
    throw new HttpException(
      401,
      "Missing authentication token. Please provide Authorization header: 'Authorization: Bearer <token>'"
    );
  }
}
