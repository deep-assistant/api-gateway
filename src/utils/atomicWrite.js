import fs from 'fs';
import path from 'path';

/**
 * Атомарная запись JSON с backup и rollback
 */
export async function atomicWriteJSON(filePath, data, options = {}) {
  const {
    createBackup = true,
    keepBackups = 3,
    validateJSON = true
  } = options;

  const dir = path.dirname(filePath);
  const filename = path.basename(filePath);
  const tempPath = path.join(dir, `.${filename}.tmp.${Date.now()}`);
  const backupDir = path.join(dir, 'backups');
  
  try {
    // 1. Валидация данных
    if (validateJSON) {
      JSON.stringify(data); // Проверка что данные сериализуемы
    }
    
    // 2. Создать директорию для backups
    if (createBackup && !fs.existsSync(backupDir)) {
      await fs.promises.mkdir(backupDir, { recursive: true });
    }
    
    // 3. Создать backup текущего файла
    if (createBackup && fs.existsSync(filePath)) {
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const backupPath = path.join(backupDir, `${filename}.${timestamp}.backup`);
      await fs.promises.copyFile(filePath, backupPath);
      
      // Очистить старые backups
      await cleanupOldBackups(backupDir, filename, keepBackups);
    }
    
    // 4. Записать во временный файл
    const jsonString = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(tempPath, jsonString, 'utf8');
    
    // 5. Верификация записи
    const written = await fs.promises.readFile(tempPath, 'utf8');
    const parsed = JSON.parse(written);
    
    // 6. Атомарное переименование
    await fs.promises.rename(tempPath, filePath);
    
    return true;
    
  } catch (error) {
    // Откат: удалить temp файл
    try {
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
    } catch {}
    
    throw new Error(`Atomic write failed for ${filePath}: ${error.message}`);
  }
}

/**
 * Очистка старых backups
 */
async function cleanupOldBackups(backupDir, filename, keepCount) {
  try {
    const files = await fs.promises.readdir(backupDir);
    const backupFiles = files
      .filter(f => f.startsWith(filename) && f.endsWith('.backup'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time); // Новые первые
    
    // Удалить старые
    const toDelete = backupFiles.slice(keepCount);
    for (const file of toDelete) {
      await fs.promises.unlink(file.path);
    }
  } catch (error) {
    console.error('Cleanup backups error:', error);
  }
}

/**
 * Восстановить из последнего backup
 */
export async function restoreFromBackup(filePath) {
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath);
  const backupDir = path.join(dir, 'backups');
  
  try {
    const files = await fs.promises.readdir(backupDir);
    const backupFiles = files
      .filter(f => f.startsWith(filename) && f.endsWith('.backup'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time);
    
    if (backupFiles.length === 0) {
      throw new Error('No backups found');
    }
    
    const latestBackup = backupFiles[0];
    await fs.promises.copyFile(latestBackup.path, filePath);
    
    console.log(`Restored from backup: ${latestBackup.name}`);
    return true;
    
  } catch (error) {
    throw new Error(`Restore failed: ${error.message}`);
  }
}

export default atomicWriteJSON;

