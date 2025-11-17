# Тестовое окружение API Gateway

## Настройка

1. Скопируйте пример конфигурации:
```bash
cp docker-compose.test.example.yml docker-compose.test.yml
```

2. Отредактируйте `docker-compose.test.yml` и замените все placeholder'ы на реальные ключи:
   - `YOUR_TEST_ADMIN_TOKEN_HERE` - новый тестовый токен
   - `YOUR_*_KEY` - соответствующие API ключи

3. Убедитесь, что скопированы базы данных из PROD:
```bash
cp ../../resale-chatgpt-azure/src/db/*.json ./src/db/
```

## Запуск

```bash
docker-compose -f docker-compose.test.yml up -d --build
```

## Проверка работы

```bash
# Проверить статус
docker ps | grep chatgpt_proxy_test

# Посмотреть логи
docker logs -f chatgpt_proxy_test

# Тестовый запрос
curl http://localhost:8089/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"test"}]}'
```

## Отличия от PROD

- **Контейнер**: `chatgpt_proxy_test` вместо `chatgpt_proxy_prod`
- **Порт**: `8089` (прямой доступ) вместо через Traefik
- **Без Traefik**: работает автономно
- **Без Portainer**: для упрощения
- **Базы данных**: изолированная копия из PROD

## Доступ

- **С того же сервера**: `http://localhost:8089`
- **Извне**: `http://173.212.230.201:8089`
- **Admin Token**: `test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

## Подключение тестового бота

В конфигурации вашего тестового бота используйте:
```
API_URL=http://localhost:8089
# или если бот не на этом сервере:
API_URL=http://173.212.230.201:8089
```

