import fs from 'fs';
import FileLock from './filelock.js';
import atomicWriteJSON from './atomicWrite.js';

/**
 * Обертка для работы с JSON файлами с блокировками
 */
export class JsonDatabase {
  constructor(filePath, options = {}) {
    this.filePath = filePath;
    this.lock = new FileLock(filePath);
    this.options = {
      createBackup: true,
      validateJSON: true,
      ...options
    };
  }

  /**
   * Чтение без блокировки (для read-only операций)
   */
  async read() {
    const data = await fs.promises.readFile(this.filePath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * Запись с блокировкой
   */
  async write(data) {
    await atomicWriteJSON(this.filePath, data, this.options);
  }

  /**
   * Обновление с блокировкой и callback
   */
  async update(updateFn) {
    let acquired = false;
    try {
      // Захватить lock
      await this.lock.acquire();
      acquired = true;
      
      // Прочитать
      const data = await this.read();
      
      // Применить обновления
      const updated = await updateFn(data);
      
      // Записать
      await this.write(updated);
      
      return updated;
      
    } finally {
      // Всегда освободить lock
      if (acquired) {
        await this.lock.release();
      }
    }
  }

  /**
   * Транзакция с несколькими операциями
   */
  async transaction(operations) {
    let acquired = false;
    const results = [];
    
    try {
      await this.lock.acquire();
      acquired = true;
      
      for (const operation of operations) {
        const result = await operation(this);
        results.push(result);
      }
      
      return results;
      
    } catch (error) {
      throw new Error(`Transaction failed: ${error.message}`);
    } finally {
      if (acquired) {
        await this.lock.release();
      }
    }
  }
}

export default JsonDatabase;

