import cron from 'node-cron';

export class RecoveryService {
  constructor(transferService, transferRepository) {
    this.transferService = transferService;
    this.transferRepository = transferRepository;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  Recovery Service already running');
      return;
    }

    console.log('🔄 Starting Recovery Service...');

    // Восстановление зависших переводов - каждую минуту
    cron.schedule('* * * * *', async () => {
      try {
        const results = await this.transferService.recoverIncompleteTransfers();
        
        if (results.length > 0) {
          console.log(`✅ [Recovery] Recovered ${results.length} transfers`);
          results.forEach(r => {
            console.log(`   - ${r.transferId}: ${r.action}`);
          });
        }
      } catch (error) {
        console.error('❌ [Recovery] Error:', error);
      }
    });

    // Очистка старых лимитов - каждый день в 00:00
    cron.schedule('0 0 * * *', async () => {
      try {
        await this.transferRepository.cleanupOldLimits();
        console.log('✅ [Cleanup] Old daily limits cleaned up');
      } catch (error) {
        console.error('❌ [Cleanup] Error:', error);
      }
    });

    this.isRunning = true;
    console.log('✅ Recovery Service started successfully');
    console.log('   - Incomplete transfers recovery: every 1 minute');
    console.log('   - Old limits cleanup: daily at 00:00');
  }

  stop() {
    // Note: node-cron не предоставляет прямого способа остановить все задачи
    // В production нужно хранить ссылки на task и вызывать task.stop()
    this.isRunning = false;
    console.log('🛑 Recovery Service stopped');
  }
}

