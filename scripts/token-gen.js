import { saveTokensData, loadData } from '../src/utils/dbManager.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import crypto from 'crypto';
import path from 'path';

const tokensFilePath = path.join(path.dirname(''), 'src', 'db', 'tokens.json');

// Получаем параметры из командной строки
const argv = yargs(hideBin(process.argv))
  .option('expires', {
    alias: 'e',
    description: 'Дата истечения токена в формате ISO',
    type: 'string',
    demandOption: true,
  })
  .option('userTokenLimit', {
    alias: 'ut',
    description: 'Лимит токенов для пользователя',
    type: 'number',
    demandOption: true,
  })
  .option('chatGptTokenLimit', {
    alias: 'ct',
    description: 'Лимит токенов для ChatGPT',
    type: 'number',
    demandOption: true,
  })
  .help()
  .alias('help', 'h')
  .argv;

const run = async () => {
  try {
    const tokensData = await loadData(tokensFilePath);
    const newToken = {
      token: crypto.randomBytes(16).toString('hex'),
      expires: argv.expires,
      limits: {
        user: argv.userTokenLimit,
        chatGpt: argv.chatGptTokenLimit,
      },
      used: {
        user: 0,
        chatGpt: 0,
      },
    };
    tokensData.tokens.push(newToken);
    await saveTokensData(tokensData);
    console.log(`Новый токен сгенерирован успешно: ${newToken.token}`);
  } catch (error) {
    console.error('Ошибка при генерации токена:', error);
  }
};

run();
