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
cp ../resale-chatgpt-azure/src/db/*.json ./src/db/
```

## Запуск

```bash
docker-compose -f docker-compose.test.yml up -d --build
```

## Отличия от PROD

- **Контейнер**: `chatgpt_proxy_test` вместо `chatgpt_proxy_prod`
- **Порт**: `8089` вместо `8088`
- **Домен**: `api-test.${HOST}` вместо `api.${HOST}`
- **Без Traefik**: использует существующий Traefik из PROD
- **Без Portainer**: для упрощения

## Доступ

- API: `https://api-test.your-domain.com`
- Использует тот же Traefik что и PROD версия

