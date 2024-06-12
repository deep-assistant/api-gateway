### Часть 2: Руководство для пользователя — Интеграция с ChatGPT-resale на примере Python

#### Использование Прокси для Общения с ChatGPT

Чтобы обратиться к ChatGPT через прокси:

1. **Отправьте HTTP POST запрос** на адрес прокси, указав название вашего диалога и ваше сообщение. Пример кода на Python:

```python
import os
import requests

# Настройки прокси-сервера и токенов
PROXY_URL_CHECK = "https://8080-timaxhack-resalechatgpt-3ubkc4bx5ro.ws-eu114.gitpod.io/tokens"
PROXY_URL_CHAT = "https://8080-timaxhack-resalechatgpt-3ubkc4bx5ro.ws-eu114.gitpod.io/chatgpt"
PROXY_URL_GENERATE = "https://8080-timaxhack-resalechatgpt-3ubkc4bx5ro.ws-eu114.gitpod.io/generate-token"
ADMIN_TOKEN = "246a07ec9c01e848b193aa3bc1f8c916"  # Токен администратора из JSON файла

USER_NAME = "exampleUser3"  # Имя пользователя, для которого создается токен
USER_MESSAGE = "перескажи всю историю нашего с тобой диалога "  # Ваше сообщение к ChatGPT
DIALOG_NAME = "44444"  # Название вашего диалога
SYSTEM_MESSAGE = "You are chatting with an AI assistant. Please respond accordingly. ты можешь помнить всю историю диалога"  # Пользовательское контекстное сообщение

USER_TOKEN_LIMIT = 11500  # Лимит токенов для пользователя
CHATGPT_TOKEN_LIMIT = 11500  # Лимит токенов для ChatGPT
TOKEN_LIMIT = 10000  # Лимит токенов для диалога
SINGLE_MESSAGE = False  # Режим вопрос-ответ: True - только один запрос и ответ

def check_token_and_create_if_needed():
    headers = {'Content-Type': 'application/json'}
    payload = {
        "token": ADMIN_TOKEN,
        "userName": USER_NAME
    }

    # Проверка наличия токена
    response = requests.get(PROXY_URL_CHECK, json=payload, headers=headers)
    print(response)
    if response.status_code == 200:
        data = response.json()
        if "tokens" in data:
            print("Токен пользователя найден:", data["tokens"])
            return True
        else:
            print("Токен не найден, создаем новый...")
            return create_new_token()
    else:
        print(f"Ошибка при проверке токена: {response.text}")
        return False

def create_new_token():
    headers = {'Content-Type': 'application/json'}
    payload = {
        "token": ADMIN_TOKEN,
        "userName": USER_NAME,
        "userTokenLimit": USER_TOKEN_LIMIT,
        "chatGptTokenLimit": CHATGPT_TOKEN_LIMIT
    }

    response = requests.post(PROXY_URL_GENERATE, json=payload, headers=headers)
    if response.status_code == 200:
        data = response.json()
        print("Новый токен создан:", data["tokenId"])
        return True
    else:
        print(f"Ошибка при создании токена: {response.text}")
        return False

def query_chatgpt_via_proxy(user_name ,dialog_name, message, token, system_message_content='', token_limit=None, single_message=True):
    print(single_message)
    headers = {'Content-Type': 'application/json'}
    payload = {
        "token": token,
        "query": message,
        "dialogName": dialog_name,
        "model": "gpt-4o",
        "systemMessageContent": system_message_content,
        "tokenLimit": token_limit,
        "singleMessage": single_message,
        "userNameToken": user_name
    }

    response = requests.post(PROXY_URL_CHAT, json=payload, headers=headers)

    if response.status_code == 200:
        data = response.json()
        print("Ответ ChatGPT:", data.get("response"))
        print("Остаток токенов пользователя:", data.get("tokensUsed"))
        print("Остаток токенов ChatGPT:", data.get("remainingTokens"))
    else:
        print(f"Ошибка: {response.text}")

# Основная логика
def main():
    if check_token_and_create_if_needed():
        query_chatgpt_via_proxy(USER_NAME, DIALOG_NAME, USER_MESSAGE, ADMIN_TOKEN, SYSTEM_MESSAGE, TOKEN_LIMIT, SINGLE_MESSAGE)


if __name__ == "__main__":
    main()
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
