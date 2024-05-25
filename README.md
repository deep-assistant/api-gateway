### Часть 1: Руководство для владельца ChatGPT на Azure 

#### Предварительные требования

1. Учетная запись Microsoft Azure с доступом к API ChatGPT.
2. Сервер с установленным Docker и Docker Compose.
3. Установленные `git` для клонирования проекта.

#### Шаги по развертыванию

##### 1. Клонирование репозитория

На вашем сервере выполните:

```bash
git clone https://github.com/TimaxLacs/resale-chatgpt-azure
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
      - ./src/db:/usr/src/app/src/db
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
docker-compose exec chatgpt_proxy node scripts/token-gen.js --expires "2024-06-14" --userTokenLimit 150 --chatGptTokenLimit 150
```


---


### Часть 2: Руководство для пользователя — Интеграция с ChatGPT-resale на примере Python

#### Использование Прокси для Общения с ChatGPT

Чтобы обратиться к ChatGPT через прокси:

1. **Отправьте HTTP POST запрос** на адрес прокси, указав название вашего диалога и ваше сообщение. Пример кода на Python:

```python
import requests

PROXY_URL = "http://173.212.230.201:8080/chatgpt"  # Обновите на актуальный адрес прокси
TOKEN = "ваш_временный_токен_для_доступа"  # Временный токен, предоставленный администратором прокси
DIALOG_NAME = "exampleDialog"  # Название вашего диалога
USER_MESSAGE = "Привет, как тебя зовут?"  # Ваше сообщение к ChatGPT
SYSTEM_MESSAGE = "You are chatting with an AI assistant. Please respond accordingly."  # Пользовательское контекстное сообщение
TOKEN_LIMIT = 1000  # Лимит токенов для диалога, необязательный параметр
SINGLE_MESSAGE = False  # Режим вопрос-ответ: False - ведет диалог, True - только один запрос и ответ

def query_chatgpt_via_proxy(dialog_name, message, token, system_message_content='', token_limit=None, single_message=None):
    headers = {'Content-Type': 'application/json'}
    payload = {
        'token': token,
        'dialogName': dialog_name,
        'query': message,
        'systemMessageContent': system_message_content,
    }

    if token_limit is not None:
        payload['tokenLimit'] = token_limit

    if single_message is not None:
        payload['singleMessage'] = single_message

    response = requests.post(PROXY_URL, json=payload, headers=headers)

    if response.status_code == 200:
        data = response.json()
        print("Ответ ChatGPT:", data.get('response'))
        print("Остаток токенов пользователя:", data.get('remainingTokens', {}).get('remainingUserTokens'))
        print("Остаток токенов ChatGPT:", data.get('remainingTokens', {}).get('remainingChatGptTokens'))
    else:
        print(f"Ошибка: {response.text}")

# Пример вызова функции
query_chatgpt_via_proxy(DIALOG_NAME, USER_MESSAGE, TOKEN, SYSTEM_MESSAGE, TOKEN_LIMIT, SINGLE_MESSAGE)
```

### Параметры запроса:

- `token`: Ваш временный доступный токен.
- `dialog_name`: Название диалога, к которому вы хотите обращаться или который вы хотите создать.
- `message`: Сообщение, которое вы хотите отправить.

#### Обработка ответа:

После выполнения скрипта вы должны увидеть ответ ChatGPT на ваш запрос, переданный через прокси-сервер.

Пример:
```bash
timax@timax:~/Code/test$ python3 test.py 
Ответ ChatGPT: Привет! Меня можно называть AI ассистентом. Как я могу помочь вам сегодня?
```
