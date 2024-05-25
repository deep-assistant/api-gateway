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
