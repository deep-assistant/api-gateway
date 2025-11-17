import { HttpException } from "../rest/HttpException.js";

const TRANSFER_STATUS = {
  PENDING: 'pending',
  DEBITED: 'debited',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back'
};

export class TransferService {
  constructor(tokensRepository, transferRepository) {
    this.tokensRepository = tokensRepository;
    this.transferRepository = transferRepository;
  }

  /**
   * Генерация уникального ID перевода
   */
  generateTransferId(senderId, receiverId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `tf_${timestamp}_${senderId}_${receiverId}_${random}`;
  }

  /**
   * Получить применимые лимиты для пользователя
   */
  async getUserLimits(user, settings) {
    const isPremium = user.premium?.is_active || false;
    
    return {
      max_daily_transfers: isPremium 
        ? settings.limits.max_daily_transfers_premium 
        : settings.limits.max_daily_transfers_regular,
      cooldown_seconds: isPremium
        ? settings.limits.cooldown_seconds_premium
        : settings.limits.cooldown_seconds_regular,
      fee_percent: isPremium
        ? settings.fees.premium_percent
        : settings.fees.regular_percent
    };
  }

  /**
   * Полная валидация перевода
   */
  async validateTransfer(senderId, receiverId, amount) {
    const settings = await this.transferRepository.getSettings();

    // 1. Система включена?
    if (!settings.enabled) {
      throw new HttpException(503, "Переводы временно недоступны");
    }

    // 2. Не самому себе
    if (senderId === receiverId) {
      throw new HttpException(400, "Нельзя переводить самому себе");
    }

    // 3. Получить данные пользователей
    const sender = await this.tokensRepository.getUserById(senderId);
    if (!sender) {
      throw new HttpException(404, "Отправитель не найден");
    }

    const receiver = await this.tokensRepository.getUserById(receiverId);
    if (!receiver) {
      throw new HttpException(404, "Получатель не найден");
    }

    // 4. Проверка доступа: баланс ≥ 30k ИЛИ премиум
    const hasAccess = 
      sender.tokens_gpt >= settings.limits.min_balance_required || 
      sender.premium?.is_active;
      
    if (!hasAccess) {
      throw new HttpException(403, 
        `Для переводов нужен баланс от ${settings.limits.min_balance_required}⚡️ или премиум статус`
      );
    }

    // 5. Валидация суммы
    if (amount < settings.limits.min_transfer_amount) {
      throw new HttpException(400, 
        `Минимальная сумма: ${settings.limits.min_transfer_amount}⚡️`
      );
    }

    if (amount > settings.limits.max_transfer_amount) {
      throw new HttpException(400, 
        `Максимальная сумма: ${settings.limits.max_transfer_amount}⚡️`
      );
    }

    // 6. Получить лимиты пользователя
    const userLimits = await this.getUserLimits(sender, settings);

    // 7. Рассчитать комиссию
    const feePercent = userLimits.fee_percent;
    const fee = Math.ceil(amount * feePercent / 100);
    const total = amount + fee;

    // 8. Проверка баланса
    if (sender.tokens_gpt < total) {
      throw new HttpException(400, 
        `Недостаточно средств. Нужно: ${total}⚡️ (включая комиссию ${fee}⚡️)`
      );
    }

    // 9. Проверка дневного лимита
    const dailyLimit = await this.transferRepository.getDailyLimit(senderId);
    if (dailyLimit && dailyLimit.count >= userLimits.max_daily_transfers) {
      throw new HttpException(429, 
        `Достигнут дневной лимит переводов (${userLimits.max_daily_transfers}). Попробуйте завтра`
      );
    }

    // 10. Проверка cooldown
    if (sender.transfer_stats?.last_transfer_time) {
      const lastTransfer = new Date(sender.transfer_stats.last_transfer_time).getTime();
      const timePassed = Date.now() - lastTransfer;
      const cooldownMs = userLimits.cooldown_seconds * 1000;
      
      if (timePassed < cooldownMs) {
        const waitTime = Math.ceil((cooldownMs - timePassed) / 1000);
        throw new HttpException(429, 
          `Подождите ${waitTime}сек перед следующим переводом`
        );
      }
    }

    return {
      sender,
      receiver,
      amount,
      fee,
      total,
      settings,
      userLimits
    };
  }

  /**
   * Выполнить перевод (Two-Phase Commit)
   */
  async executeTransfer(senderId, receiverId, amount) {
    const transferId = this.generateTransferId(senderId, receiverId);
    
    try {
      // ========== ВАЛИДАЦИЯ ==========
      const validated = await this.validateTransfer(senderId, receiverId, amount);
      const { sender, receiver, fee, total } = validated;

      console.log(`[Transfer ${transferId}] Starting transfer: ${amount}⚡️ from ${senderId} to ${receiverId}`);

      // ========== PHASE 1: CREATE PENDING ==========
      await this.transferRepository.createTransferRecord({
        id: transferId,
        timestamp: new Date().toISOString(),
        sender: {
          user_id: sender.user_id,
          username: sender.username || sender.user_id,
          full_name: sender.full_name || "Unknown User"
        },
        receiver: {
          user_id: receiver.user_id,
          username: receiver.username || receiver.user_id,
          full_name: receiver.full_name || "Unknown User"
        },
        amounts: {
          transfer: amount,
          fee: fee,
          total_debited: total
        },
        status: TRANSFER_STATUS.PENDING,
        stages: {
          created_at: new Date().toISOString(),
          debited_at: null,
          credited_at: null,
          completed_at: null
        },
        metadata: {
          ip: null,
          user_agent: null,
          error: null
        }
      });

      console.log(`[Transfer ${transferId}] Phase 1: Record created (PENDING)`);

      // ========== PHASE 2: DEBIT SENDER ==========
      await this.tokensRepository.updateTokenByUserId(senderId, {
        tokens_gpt: sender.tokens_gpt - total
      });

      await this.tokensRepository.updateTransferStats(senderId, (stats) => {
        stats.total_sent += amount;
        stats.transfers_count++;
        stats.last_transfer_time = new Date().toISOString();
      });

      await this.transferRepository.updateTransferStatus(transferId, TRANSFER_STATUS.DEBITED);

      console.log(`[Transfer ${transferId}] Phase 2: Debited ${total}⚡️ from sender`);

      // ========== PHASE 3: CREDIT RECEIVER ==========
      await this.tokensRepository.updateTokenByUserId(receiverId, {
        tokens_gpt: receiver.tokens_gpt + amount
      });

      await this.tokensRepository.updateTransferStats(receiverId, (stats) => {
        stats.total_received += amount;
      });

      console.log(`[Transfer ${transferId}] Phase 3: Credited ${amount}⚡️ to receiver`);

      // ========== PHASE 4: UPDATE LIMITS ==========
      await this.transferRepository.incrementDailyLimit(senderId, transferId, amount);

      console.log(`[Transfer ${transferId}] Phase 4: Updated daily limits`);

      // ========== PHASE 5: COMPLETE ==========
      await this.transferRepository.updateTransferStatus(transferId, TRANSFER_STATUS.COMPLETED);

      console.log(`[Transfer ${transferId}] ✅ COMPLETED successfully`);

      return {
        success: true,
        transferId: transferId,
        amount: amount,
        fee: fee,
        total: total,
        newBalance: sender.tokens_gpt - total,
        sender: {
          username: sender.username || sender.user_id,
          full_name: sender.full_name || "Unknown User"
        },
        receiver: {
          username: receiver.username || receiver.user_id,
          full_name: receiver.full_name || "Unknown User"
        }
      };

    } catch (error) {
      // ========== ROLLBACK ==========
      console.error(`[Transfer ${transferId}] ❌ ERROR:`, error.message);
      await this.rollbackTransfer(transferId);
      throw error;
    }
  }

  /**
   * Откат перевода при ошибке
   */
  async rollbackTransfer(transferId) {
    try {
      console.log(`[Transfer ${transferId}] 🔄 Starting rollback...`);

      const transfer = await this.transferRepository.getTransferById(transferId);
      if (!transfer) {
        console.log(`[Transfer ${transferId}] No transfer found to rollback`);
        return;
      }

      if (transfer.status === TRANSFER_STATUS.DEBITED) {
        // Вернуть деньги отправителю
        const sender = await this.tokensRepository.getUserById(transfer.sender.user_id);
        
        await this.tokensRepository.updateTokenByUserId(transfer.sender.user_id, {
          tokens_gpt: sender.tokens_gpt + transfer.amounts.total_debited
        });

        // Откатить статистику
        await this.tokensRepository.updateTransferStats(transfer.sender.user_id, (stats) => {
          stats.total_sent = Math.max(0, stats.total_sent - transfer.amounts.transfer);
          stats.transfers_count = Math.max(0, stats.transfers_count - 1);
        });

        await this.transferRepository.updateTransferStatus(
          transferId,
          TRANSFER_STATUS.ROLLED_BACK,
          { error: "Rolled back due to error" }
        );

        console.log(`[Transfer ${transferId}] ✅ Rollback completed (refunded ${transfer.amounts.total_debited}⚡️)`);

      } else if (transfer.status === TRANSFER_STATUS.PENDING) {
        await this.transferRepository.updateTransferStatus(
          transferId,
          TRANSFER_STATUS.FAILED,
          { error: "Failed before debit" }
        );

        console.log(`[Transfer ${transferId}] ✅ Marked as FAILED`);
      }

    } catch (error) {
      console.error(`[Transfer ${transferId}] ❌ Rollback error:`, error);
    }
  }

  /**
   * Восстановление зависших переводов (Recovery Service)
   */
  async recoverIncompleteTransfers() {
    const incomplete = await this.transferRepository.getIncompleteTransfers();
    const results = [];

    console.log(`[Recovery] Found ${incomplete.length} incomplete transfers`);

    for (const transfer of incomplete) {
      try {
        console.log(`[Recovery] Processing transfer ${transfer.id} (status: ${transfer.status})`);

        if (transfer.status === TRANSFER_STATUS.DEBITED) {
          // Попытка завершить
          const receiver = await this.tokensRepository.getUserById(transfer.receiver.user_id);
          
          await this.tokensRepository.updateTokenByUserId(transfer.receiver.user_id, {
            tokens_gpt: receiver.tokens_gpt + transfer.amounts.transfer
          });

          await this.tokensRepository.updateTransferStats(transfer.receiver.user_id, (stats) => {
            stats.total_received += transfer.amounts.transfer;
          });

          await this.transferRepository.updateTransferStatus(
            transfer.id,
            TRANSFER_STATUS.COMPLETED,
            { error: "Recovered after crash" }
          );

          results.push({ 
            transferId: transfer.id, 
            action: 'completed',
            amount: transfer.amounts.transfer
          });

          console.log(`[Recovery] ✅ Completed transfer ${transfer.id}`);
        }

      } catch (error) {
        // Откат если не получилось
        console.error(`[Recovery] Failed to complete ${transfer.id}, rolling back:`, error);
        await this.rollbackTransfer(transfer.id);
        
        results.push({ 
          transferId: transfer.id, 
          action: 'rolled_back',
          error: error.message
        });
      }
    }

    if (results.length > 0) {
      console.log(`[Recovery] ✅ Processed ${results.length} transfers`);
    }

    return results;
  }

  /**
   * Получить статистику переводов
   */
  async getStatistics(userId = null) {
    if (userId) {
      const user = await this.tokensRepository.getUserById(userId);
      const dailyLimit = await this.transferRepository.getDailyLimit(userId);
      const history = await this.transferRepository.getTransferHistory(userId, 10);

      return {
        user_stats: user?.transfer_stats || {},
        today: dailyLimit || { count: 0, total_sent: 0 },
        recent_transfers: history.length
      };
    } else {
      return await this.transferRepository.getStats();
    }
  }

  /**
   * Получить метрики здоровья системы
   */
  async getHealthMetrics() {
    const incomplete = await this.transferRepository.getIncompleteTransfers();
    const stats = await this.transferRepository.getStats();
    const settings = await this.transferRepository.getSettings();
    
    return {
      health: incomplete.length === 0 ? 'healthy' : 'degraded',
      incomplete_transfers: incomplete.length,
      total_transfers_today: stats.total_transfers,
      system_enabled: settings.enabled,
      timestamp: new Date().toISOString()
    };
  }
}

