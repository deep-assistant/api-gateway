### Часть 1: Руководство для владельца ChatGPT на Azure (Обновлено для `docker-compose`)

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
      - <yourPort>
    volumes:
      - ./src/tokens:/usr/src/app/src/tokens
    environment:
      - AZURE_OPENAI_ENDPOINT=<endpoint>
      - AZURE_OPENAI_KEY=<apiKey>
      - GPT_VERSION=<versionGpt>
      - GPT_MODEL_NAME=<modelName>
      - PORT=<yourPort>
    restart: unless-stopped
```

Замените плейсхолдеры своими фактическими значениями. 

Пример:
```yaml
version: '3.8'
services:
  chatgpt_proxy:
    build: .
    container_name: chatgpt_proxy
    ports:
      - 8080:8080
    volumes:
      - ./src/tokens:/usr/src/app/src/tokens
    environment:
      - AZURE_OPENAI_ENDPOINT=https://ai.openai.azure.com/
      - AZURE_OPENAI_KEY=ca481182363434e3e63a3c1b06181
      - GPT_VERSION=2023-03-15-preview
      - GPT_MODEL_NAME=gpt-4-128k
      - PORT=8080
    restart: unless-stopped
```

##### 3. Сборка и запуск Docker-контейнера

Из корня вашего проекта запустите контейнер:

```bash
docker-compose up -d
```

Эта команда соберет образ Docker из вашего `Dockerfile` и запустит контейнер в фоновом режиме, используя настройки из `docker-compose.yml`.

##### 4. Генерация токенов
Скрипт генерации ограниченных токенов для использования с `docker-compose`:

```bash
docker-compose exec chatgpt_proxy node scripts/token-gen.js --expires "<dateRestriction>" --userTokenLimit <maxPromtToken> --chatGptTokenLimit <maxCompletionToken>
```
Пример:
```bash
docker-compose exec chatgpt_proxy node scripts/token-gen.js --expires "2024-05-14" --userTokenLimit 150 --chatGptTokenLimit 150
```
