import crypto from "crypto";
import JsonDatabase from "../utils/jsonDb.js";

export class TokensRepository {
  constructor(tokensDB) {
    this.tokensDB = tokensDB;
    this.db = new JsonDatabase('src/db/tokens.json');
  }

  getAllTokens() {
    return this.tokensDB.data.tokens || [];
  }

  async generateToken(user_id, tokens, username = null, full_name = null) {
    const token = {
      id: crypto.randomBytes(16).toString("hex"),
      user_id: user_id,
      username: username || user_id,
      full_name: full_name || "Unknown User",
      tokens_gpt: tokens,
      premium: {
        is_active: false,
        activated_at: null,
        expires_at: null,
        tier: null
      },
      transfer_stats: {
        total_sent: 0,
        total_received: 0,
        transfers_count: 0,
        last_transfer_time: null
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.tokensDB.update(({ tokens }) => tokens.push(token));

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

  async updateTokenByUserId(userId, updates) {
    return await this.db.update((data) => {
      const token = data.tokens.find((item) => item.user_id === userId);
      if (token) {
        // Обновляем только переданные поля, НЕ перезаписываем username/full_name
        for (const key in updates) {
          if (updates.hasOwnProperty(key)) {
            token[key] = updates[key];
          }
        }
        token.updated_at = new Date().toISOString();
      }
      return data;
    });
  }

  async hasUserToken(userId) {
    const tokensData = await this.getAllTokens();
    return !!tokensData.tokens.find((token) => token.user_id === userId);
  }

  // ============ NEW: Transfer Support ============

  /**
   * Получить пользователя по username
   * Ищет по: username, user_id, full_name (если начинается с @)
   */
  async getUserByUsername(username) {
    try {
      const data = await this.db.read();
      const searchInput = username.toLowerCase();
      
      // Убрать @ если есть для поиска по username
      const searchWithoutAt = searchInput.startsWith('@') ? searchInput.substring(1) : searchInput;
      
      return data.tokens.find(token => {
        // Поиск по полю username (БЕЗ @)
        if (token.username?.toLowerCase() === searchWithoutAt) {
          return true;
        }
        
        // Поиск по user_id (может быть число или строка)
        if (token.user_id?.toLowerCase() === searchInput || token.user_id?.toLowerCase() === searchWithoutAt) {
          return true;
        }
        
        // Поиск по full_name (если это @username)
        if (token.full_name) {
          const fullNameLower = token.full_name.toLowerCase();
          // Если full_name начинается с @, убираем @ и сравниваем
          if (fullNameLower.startsWith('@')) {
            const fullNameWithoutAt = fullNameLower.substring(1);
            if (fullNameWithoutAt === searchWithoutAt) {
              return true;
            }
          }
          // Или если искомый username с @
          if (fullNameLower === searchInput || fullNameLower === `@${searchWithoutAt}`) {
            return true;
          }
        }
        
        return false;
      });
    } catch (error) {
      // Fallback to old method
      const tokens = this.getAllTokens();
      const searchInput = username.toLowerCase();
      const searchWithoutAt = searchInput.startsWith('@') ? searchInput.substring(1) : searchInput;
      
      return tokens.tokens.find(token => {
        if (token.username?.toLowerCase() === searchWithoutAt) return true;
        if (token.user_id?.toLowerCase() === searchInput || token.user_id?.toLowerCase() === searchWithoutAt) return true;
        if (token.full_name?.toLowerCase() === `@${searchWithoutAt}`) return true;
        if (token.full_name?.toLowerCase().substring(1) === searchWithoutAt) return true;
        return false;
      });
    }
  }

  /**
   * Получить пользователя по ID
   */
  async getUserById(userId) {
    try {
      const data = await this.db.read();
      return data.tokens.find(t => t.user_id === userId);
    } catch (error) {
      // Fallback
      return this.getTokenByUserId(userId);
    }
  }

  /**
   * Обновить профиль пользователя
   */
  async updateUserProfile(userId, updates) {
    return await this.db.update((data) => {
      const token = data.tokens.find(t => t.user_id === userId);
      if (token) {
        Object.assign(token, updates);
        token.updated_at = new Date().toISOString();
      }
      return data;
    });
  }

  /**
   * Обновить статистику переводов
   */
  async updateTransferStats(userId, updateFn) {
    return await this.db.update((data) => {
      const token = data.tokens.find(t => t.user_id === userId);
      if (token) {
        // Инициализировать если нет
        if (!token.transfer_stats) {
          token.transfer_stats = {
            total_sent: 0,
            total_received: 0,
            transfers_count: 0,
            last_transfer_time: null
          };
        }
        updateFn(token.transfer_stats);
        token.updated_at = new Date().toISOString();
      }
      return data;
    });
  }

  /**
   * Установить премиум статус
   */
  async setPremiumStatus(userId, isPremium, expiresAt = null, tier = 'gold') {
    return await this.db.update((data) => {
      const token = data.tokens.find(t => t.user_id === userId);
      if (token) {
        if (!token.premium) {
          token.premium = {};
        }
        token.premium.is_active = isPremium;
        token.premium.activated_at = isPremium ? new Date().toISOString() : null;
        token.premium.expires_at = expiresAt;
        token.premium.tier = isPremium ? tier : null;
        token.updated_at = new Date().toISOString();
      }
      return data;
    });
  }

  /**
   * Синхронизация/миграция данных пользователя
   * Обновляет username, full_name и добавляет недостающие поля
   */
  async syncUserData(userId, userData = {}) {
    return await this.db.update((data) => {
      const token = data.tokens.find(t => t.user_id === userId);
      if (!token) {
        return data;
      }

      // Обновляем username и full_name если переданы
      if (userData.username !== undefined) {
        token.username = userData.username;
      }
      
      if (userData.full_name !== undefined) {
        token.full_name = userData.full_name;
      }

      // Добавляем premium структуру если отсутствует
      if (!token.premium) {
        token.premium = {
          is_active: false,
          activated_at: null,
          expires_at: null,
          tier: null
        };
      }

      // Добавляем transfer_stats если отсутствует
      if (!token.transfer_stats) {
        token.transfer_stats = {
          total_sent: 0,
          total_received: 0,
          transfers_count: 0,
          last_transfer_time: null
        };
      }

      // Обновляем timestamp
      if (!token.created_at) {
        token.created_at = new Date().toISOString();
      }
      token.updated_at = new Date().toISOString();

      return data;
    });
  }
}
