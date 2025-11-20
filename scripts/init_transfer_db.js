import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, '..', 'src', 'db');

console.log('🚀 Initializing Transfer Database...\n');

// Создать директорию если не существует
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log('✅ Created db directory');
}

// transfer_history.json
const historyPath = path.join(DB_DIR, 'transfer_history.json');
if (!fs.existsSync(historyPath)) {
  fs.writeFileSync(historyPath, JSON.stringify({
    transfers: [],
    stats: {
      total_transfers: 0,
      total_volume: 0,
      total_fees_collected: 0,
      last_updated: null
    }
  }, null, 2));
  console.log('✅ Created transfer_history.json');
} else {
  console.log('⚠️  transfer_history.json already exists');
}

// transfer_settings.json
const settingsPath = path.join(DB_DIR, 'transfer_settings.json');
if (!fs.existsSync(settingsPath)) {
  fs.writeFileSync(settingsPath, JSON.stringify({
    enabled: true,
    limits: {
      min_balance_required: 30000,
      min_transfer_amount: 100,
      max_transfer_amount: 100000,
      max_daily_transfers_regular: 10,
      max_daily_transfers_premium: 20,
      cooldown_seconds_regular: 60,
      cooldown_seconds_premium: 30
    },
    fees: {
      regular_percent: 1.0,
      premium_percent: 0.5,
      rounding: "ceil"
    },
    features: {
      notifications_enabled: true,
      history_retention_days: 90,
      auto_recovery_enabled: true,
      recovery_check_interval_minutes: 1
    },
    metadata: {
      version: "1.0.0",
      last_updated: new Date().toISOString(),
      updated_by: "system"
    }
  }, null, 2));
  console.log('✅ Created transfer_settings.json');
} else {
  console.log('⚠️  transfer_settings.json already exists');
}

// transfer_limits.json
const limitsPath = path.join(DB_DIR, 'transfer_limits.json');
if (!fs.existsSync(limitsPath)) {
  fs.writeFileSync(limitsPath, JSON.stringify({
    daily_limits: {},
    cleanup: {
      last_cleanup: new Date().toISOString(),
      retention_days: 7
    }
  }, null, 2));
  console.log('✅ Created transfer_limits.json');
} else {
  console.log('⚠️  transfer_limits.json already exists');
}

// Создать директорию для backups
const backupsDir = path.join(DB_DIR, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
  console.log('✅ Created backups directory');
} else {
  console.log('⚠️  backups directory already exists');
}

console.log('\n✅ Transfer database initialized successfully!');
console.log('\n📋 Next steps:');
console.log('1. npm install cron (if not installed)');
console.log('2. Restart the server');
console.log('3. Test with: POST /transfer/execute');
console.log('4. Check health: GET /transfer/health\n');

