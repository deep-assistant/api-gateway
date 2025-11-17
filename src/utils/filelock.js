import fs from 'fs';
import os from 'os';

/**
 * File-based locking mechanism для предотвращения race conditions
 * Использует lock файлы с поддержкой stale lock detection
 */
export class FileLock {
  constructor(filePath) {
    this.filePath = filePath;
    this.lockPath = `${filePath}.lock`;
    this.maxRetries = 50;          // Увеличено для высокой нагрузки
    this.retryDelay = 50;           // Уменьшено для быстрой реакции
    this.staleLockTimeout = 5000;   // 5 секунд = мертвый lock
  }

  /**
   * Захватить эксклюзивный lock
   */
  async acquire() {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        // Попытка создать lock файл (атомарная операция)
        await fs.promises.writeFile(
          this.lockPath,
          JSON.stringify({
            pid: process.pid,
            acquired_at: Date.now(),
            host: os.hostname()
          }),
          { flag: 'wx' } // Exclusive write
        );
        
        return true;
      } catch (error) {
        if (error.code === 'EEXIST') {
          // Lock уже существует
          const lockAge = await this.getLockAge();
          
          if (lockAge > this.staleLockTimeout) {
            // Stale lock - принудительно удалить
            console.warn(`Removing stale lock for ${this.filePath} (age: ${lockAge}ms)`);
            await this.forceRelease();
            continue;
          }
          
          // Подождать с exponential backoff
          const delay = this.retryDelay * Math.pow(1.5, Math.min(i, 10));
          await this.sleep(delay);
        } else {
          throw error;
        }
      }
    }
    
    throw new Error(`Failed to acquire lock for ${this.filePath} after ${this.maxRetries} retries`);
  }

  /**
   * Освободить lock
   */
  async release() {
    try {
      await fs.promises.unlink(this.lockPath);
    } catch (error) {
      // Игнорировать если уже удален
      if (error.code !== 'ENOENT') {
        console.error(`Error releasing lock for ${this.filePath}:`, error);
      }
    }
  }

  /**
   * Принудительно освободить (для stale locks)
   */
  async forceRelease() {
    await this.release();
  }

  /**
   * Получить возраст lock файла
   */
  async getLockAge() {
    try {
      const content = await fs.promises.readFile(this.lockPath, 'utf8');
      const lockData = JSON.parse(content);
      return Date.now() - lockData.acquired_at;
    } catch {
      return 0;
    }
  }

  /**
   * Получить информацию о текущем lock
   */
  async getLockInfo() {
    try {
      const content = await fs.promises.readFile(this.lockPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default FileLock;

