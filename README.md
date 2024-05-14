### Часть 1: Руководство для владельца ChatGPT на Azure 

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
      - GPT_MODEL_NAME=gpt-4
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

---


### Часть 2:  Руководство для пользователя — Интеграция с ChatGPT-resale на примере Python

#### Предварительные требования

1. Действующий временный токен, полученный от владельца прокси-сервера
2. Адрес прокси
3. Python 3.x установлен на вашем компьютере или сервере.
4. Установленный модуль `requests` для Python. Установите его, если необходимо, используя команду:

```bash
pip install requests
```

#### Шаги по использованию ChatGPT через прокси

##### 1. Импорт модуля `requests` и подготовка данных для запроса

Откройте ваш редактор кода и создайте новый Python-скрипт. 

```python
import requests

# Замените эти значения на актуальные данные
PROXY_URL = "http://адрес_вашего_прокси/chatgpt"
TOKEN = "ваш_временный_токен"
USER_MESSAGE = "Привет, как тебя зовут?"
```

##### 2. Отправка запроса к ChatGPT через прокси

В том же скрипте добавьте функцию для выполнения запроса:

```python
def query_chatgpt_via_proxy(message, token):
    headers = {'Content-Type': 'application/json'}
    payload = {
        'token': token,
        'query': message
    }

    response = requests.post(PROXY_URL, json=payload, headers=headers)

    if response.status_code == 200:
        data = response.json()
        return data.get('response')
    else:
        return f"Ошибка: {response.text}"

# Делаем запрос и выводим ответ ChatGPT
chatgpt_response = query_chatgpt_via_proxy(USER_MESSAGE, TOKEN)
print("Ответ ChatGPT:", chatgpt_response)
```

##### 3. Запуск скрипта

Сохраните файл и запустите его из командной строки или терминала:

```bash
python имя_вашего_файла.py
```

После выполнения скрипта вы должны увидеть ответ ChatGPT на ваш запрос, переданный через прокси-сервер.

Пример:
```bash
timax@timax:~/Code/test$ python3 test.py 
Ответ ChatGPT: Привет! Меня можно называть AI ассистентом. Как я могу помочь вам сегодня?
```
