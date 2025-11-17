import JsonDatabase from "../utils/jsonDb.js";
import path from 'path';

export class TransferRepository {
  constructor() {
    this.historyDb = new JsonDatabase('src/db/transfer_history.json');
    this.settingsDb = new JsonDatabase('src/db/transfer_settings.json');
    this.limitsDb = new JsonDatabase('src/db/transfer_limits.json');
  }

  // ============ Settings ============
  
  async getSettings() {
    return await this.settingsDb.read();
  }

  async updateSettings(updates) {
    return await this.settingsDb.update((data) => {
      return {
        ...data,
        ...updates,
        metadata: {
          ...data.metadata,
          last_updated: new Date().toISOString()
        }
      };
    });
  }

  // ============ History ============
  
  async createTransferRecord(transfer) {
    return await this.historyDb.update((data) => {
      data.transfers.push(transfer);
      
      // Обновить статистику
      if (!data.stats) {
        data.stats = {
          total_transfers: 0,
          total_volume: 0,
          total_fees_collected: 0
        };
      }
      
      data.stats.total_transfers++;
      data.stats.total_volume += transfer.amounts.transfer;
      data.stats.total_fees_collected += transfer.amounts.fee;
      data.stats.last_updated = new Date().toISOString();
      
      return data;
    });
  }

  async updateTransferStatus(transferId, status, metadata = {}) {
    return await this.historyDb.update((data) => {
      const transfer = data.transfers.find(t => t.id === transferId);
      if (transfer) {
        transfer.status = status;
        
        // Обновить stages
        const now = new Date().toISOString();
        switch (status) {
          case 'debited':
            transfer.stages.debited_at = now;
            break;
          case 'completed':
            transfer.stages.credited_at = now;
            transfer.stages.completed_at = now;
            break;
          case 'failed':
          case 'rolled_back':
            transfer.stages.completed_at = now;
            break;
        }
        
        // Дополнительные метаданные
        if (Object.keys(metadata).length > 0) {
          transfer.metadata = { ...transfer.metadata, ...metadata };
        }
      }
      return data;
    });
  }

  async getTransferById(transferId) {
    const data = await this.historyDb.read();
    return data.transfers.find(t => t.id === transferId);
  }

  async getTransferHistory(userId, limit = 50) {
    const data = await this.historyDb.read();
    return data.transfers
      .filter(t => t.sender.user_id === userId || t.receiver.user_id === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  async getIncompleteTransfers() {
    const data = await this.historyDb.read();
    const now = Date.now();
    const STALE_THRESHOLD = 60000; // 1 минута
    
    return data.transfers.filter(t => {
      const isIncomplete = t.status === 'pending' || t.status === 'debited';
      if (!isIncomplete) return false;
      
      const age = now - new Date(t.timestamp).getTime();
      return age > STALE_THRESHOLD;
    });
  }

  async getStats() {
    const data = await this.historyDb.read();
    return data.stats || {
      total_transfers: 0,
      total_volume: 0,
      total_fees_collected: 0
    };
  }

  // ============ Daily Limits ============
  
  /**
   * Получить лимиты пользователя за сегодня
   */
  async getDailyLimit(userId) {
    const data = await this.limitsDb.read();
    const today = this.getTodayKey();
    
    if (!data.daily_limits[today]) {
      return null;
    }
    
    return data.daily_limits[today][`user_${userId}`] || null;
  }

  /**
   * Инкрементировать счетчик переводов
   */
  async incrementDailyLimit(userId, transferId, amount) {
    return await this.limitsDb.update((data) => {
      const today = this.getTodayKey();
      
      if (!data.daily_limits[today]) {
        data.daily_limits[today] = {};
      }
      
      const userKey = `user_${userId}`;
      
      if (!data.daily_limits[today][userKey]) {
        data.daily_limits[today][userKey] = {
          count: 0,
          total_sent: 0,
          last_transfer: null,
          transfers: []
        };
      }
      
      const userLimit = data.daily_limits[today][userKey];
      userLimit.count++;
      userLimit.total_sent += amount;
      userLimit.last_transfer = new Date().toISOString();
      userLimit.transfers.push(transferId);
      
      return data;
    });
  }

  /**
   * Очистить старые лимиты
   */
  async cleanupOldLimits() {
    return await this.limitsDb.update((data) => {
      const retentionDays = 7;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffKey = this.formatDateKey(cutoffDate);
      
      const newLimits = {};
      for (const [dateKey, limits] of Object.entries(data.daily_limits)) {
        if (dateKey >= cutoffKey) {
          newLimits[dateKey] = limits;
        }
      }
      
      data.daily_limits = newLimits;
      data.cleanup.last_cleanup = new Date().toISOString();
      
      return data;
    });
  }

  // ============ Helpers ============
  
  getTodayKey() {
    return this.formatDateKey(new Date());
  }

  formatDateKey(date) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }
}

