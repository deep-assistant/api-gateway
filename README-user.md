### Руководство для пользователя — Интеграция с ChatGPT-resale на примере Python

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

