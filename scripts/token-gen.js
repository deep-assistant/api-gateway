const { generateToken } = require('../src/utils/tokenManager');
const yargs = require('yargs');

const argv = yargs
  .option('expires', {
    alias: 'e',
    description: 'Дата истечения токена в формате ISO (например, 2023-12-31)',
    type: 'string',
    demandOption: true,
  })
  .option('userTokenLimit', {
    alias: 'u',
    description: 'Лимит токенов, который пользователь может потратить на запросы',
    type: 'number',
    demandOption: true,
  })
  .option('chatGptTokenLimit', {
    alias: 'c',
    description: 'Лимит токенов, который ChatGPT может потратить на ответы',
    type: 'number',
    demandOption: true,
  })
  .help()
  .alias('help', 'h')
  .argv;

const run = async () => {
  try {
    const newToken = await generateToken(
      argv.expires,
      argv.userTokenLimit,
      argv.chatGptTokenLimit
    );

    console.log(`Новый токен сгенерирован успешно: ${newToken.token}`);
    console.log(`Дата истечения: ${newToken.expires}`);
    console.log(`Лимит токенов пользователя: ${newToken.limits.user}`);
    console.log(`Лимит токенов ChatGPT: ${newToken.limits.chatGpt}`);
  } catch (error) {
    console.error('Ошибка при генерации токена:', error);
  }
};

run();