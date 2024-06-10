### Часть 2: Руководство для пользователя — Интеграция с ChatGPT-resale на примере Python

#### Использование Прокси для Общения с ChatGPT

Чтобы обратиться к ChatGPT через прокси:

1. **Отправьте HTTP POST запрос** на адрес прокси, указав название вашего диалога и ваше сообщение. Пример кода на Python:

```python
import requests

PROXY_URL = "https://8080-timaxhack-resalechatgpt-3ubkc4bx5ro.ws-eu114.gitpod.io/chatgpt"  # Обновите на актуальный адрес прокси
ADMIN_TOKEN = "246a07ec9c01e848b193aa3bc1f8c916"  # Токен администратора из JSON файла
USER_NAME = "exampleUser"  # Имя пользователя, для которого создается токен
USER_MESSAGE = "Привет, как тебя зовут?"  # Ваше сообщение к ChatGPT
DIALOG_NAME = "exampleDialog"  # Название вашего диалога
SYSTEM_MESSAGE = "You are chatting with an AI assistant. Please respond accordingly."  # Пользовательское контекстное сообщение
USER_TOKEN_LIMIT = 1500  # Лимит токенов для пользователя
CHATGPT_TOKEN_LIMIT = 1500  # Лимит токенов для ChatGPT
TOKEN_LIMIT = 1000  # Лимит токенов для диалога
SINGLE_MESSAGE = True  # Режим вопрос-ответ: True - только один запрос и ответ

def create_deep_token():
    URL = "https://8080-timaxhack-resalechatgpt-3ubkc4bx5ro.ws-eu114.gitpod.io/generate-token"
    PAYLOAD = {
        "token": ADMIN_TOKEN,
        "userName": USER_NAME,
        "userTokenLimit": USER_TOKEN_LIMIT,
        "chatGptTokenLimit": CHATGPT_TOKEN_LIMIT
    }

    response = requests.post(URL, json=PAYLOAD)
    if response.status_code == 200:
        data = response.json()
        print("Token ID создан успешно:", data["tokenId"])
        return data["tokenId"]
    else:
        print("Ошибка создания токена:", response.text)
        return None

def query_chatgpt_via_proxy(dialog_name, message, token, system_message_content='', token_limit=None, single_message=None):
    headers = {'Content-Type': 'application/json'}
    payload = {
        "token": token,
        "dialogName": dialog_name,
        "query": message,
        "systemMessageContent": system_message_content,
    }

    if token_limit is not None:
        payload["tokenLimit"] = token_limit

    if single_message is not None:
        payload["singleMessage"] = single_message

    response = requests.post(PROXY_URL, json=payload, headers=headers)

    if response.status_code == 200:
        data = response.json()
        print("Ответ ChatGPT:", data.get("response"))
        print("Остаток токенов пользователя:", data.get("remainingTokens", {}).get("remainingUserTokens"))
        print("Остаток токенов ChatGPT:", data.get("remainingTokens", {}).get("remainingChatGptTokens"))
    else:
        print(f"Ошибка: {response.text}")

# Создаем токен в Deep и используем его для отправки сообщения
def main():
    new_token = create_deep_token()
    if new_token:
        query_chatgpt_via_proxy(DIALOG_NAME, USER_MESSAGE, new_token, SYSTEM_MESSAGE, TOKEN_LIMIT, SINGLE_MESSAGE)

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
