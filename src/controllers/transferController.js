import express from "express";
import { rest } from "../rest/rest.js";
import { HttpResponse } from "../rest/HttpResponse.js";
import { HttpException } from "../rest/HttpException.js";

const transferController = express.Router();

/**
 * Проверка существования пользователя по username
 * GET /transfer/check-user?masterToken=xxx&username=@TimaxLacs
 */
transferController.get(
  "/transfer/check-user",
  rest(async ({ req, tokensService, transferService }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    const username = req.query.username?.replace('@', '');
    if (!username) {
      throw new HttpException(400, "username is required");
    }

    const user = await tokensService.tokensRepository.getUserByUsername(username);

    if (!user) {
      return new HttpResponse(404, {
        exists: false,
        message: "Пользователь не найден"
      });
    }

    return new HttpResponse(200, {
      exists: true,
      user_id: user.user_id,
      username: user.username || user.user_id,
      full_name: user.full_name || "Unknown User",
      is_premium: user.premium?.is_active || false
    });
  })
);

/**
 * Выполнить перевод
 * POST /transfer/execute?masterToken=xxx
 * Body: { 
 *   senderUserId, 
 *   receiverUserId, 
 *   amount,
 *   senderData: { username, full_name }, // Опционально для синхронизации
 *   receiverData: { username, full_name } // Опционально для синхронизации
 * }
 */
transferController.post(
  "/transfer/execute",
  rest(async ({ req, tokensService, transferService }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    const { senderUserId, receiverUserId, amount, senderData } = req.body;

    // Валидация входных данных
    if (!senderUserId || !receiverUserId || !amount) {
      throw new HttpException(400, "Missing required fields: senderUserId, receiverUserId, amount");
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw new HttpException(400, "Invalid amount: must be positive number");
    }

    // Синхронизация данных отправителя перед переводом
    if (senderData && (senderData.username || senderData.full_name)) {
      await tokensService.tokensRepository.syncUserData(senderUserId, {
        username: senderData.username,
        full_name: senderData.full_name
      });
    }

    // Синхронизация данных получателя перед переводом
    const receiverData = req.body.receiverData;
    if (receiverData && (receiverData.username || receiverData.full_name)) {
      await tokensService.tokensRepository.syncUserData(receiverUserId, {
        username: receiverData.username,
        full_name: receiverData.full_name
      });
    }

    const result = await transferService.executeTransfer(
      senderUserId,
      receiverUserId,
      amount
    );

    return new HttpResponse(200, result);
  })
);

/**
 * История переводов пользователя
 * GET /transfer/history?masterToken=xxx&userId=xxx&limit=50
 */
transferController.get(
  "/transfer/history",
  rest(async ({ req, tokensService, transferService }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    const userId = req.query.userId;
    const limit = Math.min(parseInt(req.query.limit || '50'), 100); // Макс 100

    if (!userId) {
      throw new HttpException(400, "userId is required");
    }

    const history = await transferService.transferRepository.getTransferHistory(userId, limit);

    return new HttpResponse(200, {
      transfers: history,
      count: history.length
    });
  })
);

/**
 * Статистика переводов
 * GET /transfer/stats?masterToken=xxx&userId=xxx (optional)
 */
transferController.get(
  "/transfer/stats",
  rest(async ({ req, tokensService, transferService }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    const userId = req.query.userId || null;
    const stats = await transferService.getStatistics(userId);

    return new HttpResponse(200, stats);
  })
);

/**
 * Получить настройки
 * GET /transfer/settings?masterToken=xxx
 */
transferController.get(
  "/transfer/settings",
  rest(async ({ req, tokensService, transferService }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    const settings = await transferService.transferRepository.getSettings();

    return new HttpResponse(200, settings);
  })
);

/**
 * Обновить настройки (только админы)
 * PUT /transfer/settings?masterToken=xxx
 * Body: { enabled, limits: {...}, fees: {...} }
 */
transferController.put(
  "/transfer/settings",
  rest(async ({ req, tokensService, transferService }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    const updates = req.body;
    const settings = await transferService.transferRepository.updateSettings(updates);

    console.log(`[Admin] Transfer settings updated:`, updates);

    return new HttpResponse(200, settings);
  })
);

/**
 * Восстановление зависших переводов
 * POST /transfer/recover?masterToken=xxx
 */
transferController.post(
  "/transfer/recover",
  rest(async ({ req, tokensService, transferService }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    const results = await transferService.recoverIncompleteTransfers();

    return new HttpResponse(200, {
      recovered: results,
      count: results.length
    });
  })
);

/**
 * Очистка старых лимитов
 * POST /transfer/cleanup?masterToken=xxx
 */
transferController.post(
  "/transfer/cleanup",
  rest(async ({ req, tokensService, transferService }) => {
    await tokensService.isValidMasterToken(req.query.masterToken);

    await transferService.transferRepository.cleanupOldLimits();

    return new HttpResponse(200, {
      message: "Old limits cleaned up successfully"
    });
  })
);

/**
 * Health check
 * GET /transfer/health
 */
transferController.get(
  "/transfer/health",
  rest(async ({ transferService }) => {
    const health = await transferService.getHealthMetrics();
    const statusCode = health.health === 'healthy' ? 200 : 503;
    
    return new HttpResponse(statusCode, health);
  })
);

export default transferController;

