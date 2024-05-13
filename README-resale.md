### Часть 1: Руководство для владельца ChatGPT на Azure (Обновлено для `docker-compose`)

#### Введение

Это обновленное руководство посвящено владельцам и администраторам серверов, которые хотят интегрировать ChatGPT, работающий на Microsoft Azure, со своими приложениями или сервисами, используя прокси-сервер. Теперь мы будем использовать `docker-compose` для более удобного запуска и управления контейнерами нашего приложения.

#### Предварительные требования

1. Учетная запись Microsoft Azure с доступом к API ChatGPT.
2. Сервер с установленным Docker и Docker Compose.
3. Установленные `git` для клонирования проекта.

#### Шаги по развертыванию

##### 1. Клонирование репозитория

На вашем сервере выполните:

```bash
git clone [URL вашего репозитория с проектом] resale-chatgpt-azure
cd resale-chatgpt-azure
```

##### 2. Настройка `docker-compose.yml`

Откройте или создайте файл `docker-compose.yml` в корневой директории проекта с следующим содержанием:

```yaml
version: '3.8'
services:
  chatgpt_proxy:
    build: .
    container_name: chatgpt_proxy
    ports:
      - "80:3000"
    environment:
      - AZURE_OPENAI_ENDPOINT=https://deep-ai.openai.azure.com/openai/deployments/gpt-4-128k/chat/completions
      - AZURE_OPENAI_KEY=ваш_api_key_здесь
      - GPT_VERSION=2023-03-15-preview
      - DEFAULT_USER_TOKEN_LIMIT=150
      - DEFAULT_CHATGPT_TOKEN_LIMIT=1500
    restart: unless-stopped
```

Замените плейсхолдеры своими фактическими значениями. 

##### 3. Сборка и запуск Docker-контейнера

Из корня вашего проекта запустите контейнер:

```bash
docker-compose up -d
```

Эта команда соберет образ Docker из вашего `Dockerfile` и запустит контейнер в фоновом режиме, используя настройки из `docker-compose.yml`.

##### 4. Генерация токенов
Мы также адаптировали скрипт генерации токенов для использования с `docker-compose`:

```bash
docker-compose exec chatgpt_proxy node scripts/token-gen.js --expires "2024-05-14" --userTokenLimit 100 --chatGptTokenLimit 1000
```

