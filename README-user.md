### Часть 2: Руководство для пользователя — Интеграция с ChatGPT-resale на примере Python

#### Использование Прокси для Общения с ChatGPT

Чтобы обратиться к ChatGPT через прокси:

1. **Отправьте HTTP POST запрос** на адрес прокси, указав название вашего диалога и ваше сообщение. Пример кода на Python:

```python
import requests

PROXY_URL = "http://173.212.230.201:8085/chatgpt"  # Обновите на актуальный адрес прокси
TOKEN = "ваш_временный_токен_для_доступа"  # Временный токен, предоставленный администратором прокси
DIALOG_NAME = "exampleDialog"  # Название вашего диалога
USER_MESSAGE = "Привет, как тебя зовут?"  # Ваше сообщение к ChatGPT

def query_chatgpt_via_proxy(dialog_name, message, token):
    headers = {'Content-Type': 'application/json'}
    payload = {
        'token': token,
        'dialog_name': dialog_name,
        'message': message
    }

    response = requests.post(PROXY_URL, json=payload, headers=headers)

    if response.status_code == 200:
        data = response.json()
        print("Ответ ChatGPT:", data.get('response'))
    else:
        print(f"Ошибка: {response.text}")

query_chatgpt_via_proxy(DIALOG_NAME, USER_MESSAGE, TOKEN)
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