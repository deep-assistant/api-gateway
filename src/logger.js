import pino from 'pino';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { count } from 'console';

const STDOUT = 1; // File descriptor for standard output (console)

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logDir = join(__dirname, 'logs');

const logger = pino({
  transport: {
    targets: [
      { target: 'pino/file', options: { destination: STDOUT } }, // Console
      { 
        target: 'pino-roll', 
        options: {
          file: join(logDir, 'server'),
          dateFormat: 'yyyy-MM-dd',
          limit: {
            count: 7,
          },
          size: '20m',
          frequency: 'daily',
          mkdir: true,
          extension: '.log'
        }
      }
    ]
  }
});

export default logger;