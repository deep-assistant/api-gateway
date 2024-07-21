import { generateAdminToken, generateUserToken } from '../src/utils/dbManager.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';


const argv = yargs(hideBin(process.argv))
  .option('type', {
    alias: 't',
    description: 'Тип токена (admin/user)',
    type: 'string',
    choices: ['admin', 'user'],
    demandOption: true,
  })
  .option('userName', {
    alias: 'u',
    description: 'Имя пользователя (только для user)',
    type: 'string',
  })
  .option('token', {
    alias: 'ut',
    description: 'Количество токенов',
    type: 'number'
  })
  .help()
  .alias('help', 'h')
  .argv;


  const run = async () => {
    try {
      if (argv.type === 'admin') {
        const expires = argv.expires || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();
        const newAdminToken = await generateAdminToken(argv.token);
        console.log(`Новый административный токен создан успешно: ${newAdminToken.token}`);
      } else if (argv.type === 'user') {
        if (!argv.userName) {
          throw new Error('Имя пользователя обязательно для токена типа user');
        }
        const newUserToken = await generateUserToken(argv.userName, argv.userTokenLimit, argv.chatGptTokenLimit);
        console.log(`Новый пользовательский токен создан успешно: ${newUserToken.token}`);
      }
    } catch (error) {
      console.error('Ошибка при генерации токена:', error);
    }
  };
  

run();
