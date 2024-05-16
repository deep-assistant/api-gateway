const express = require('express');
const bodyParser = require('body-parser');
const { queryChatGPT } = require('./api/chatgpt');

const app = express();
const PORT = process.env.PORT;

app.use(bodyParser.json());

// Эндпоинт для отправки запросов пользователя к ChatGPT
app.post('/chatgpt', async (req, res) => {
  const { token, query, dialogName } = req.body;

  try {
    // validateAndUpdateTokensUsage уже вызывается внутри queryChatGPT для обновления использования
    const chatGptResponse = await queryChatGPT(query, token, dialogName);

    if (!chatGptResponse.success) {
      res.status(500).send({ success: false, message: chatGptResponse.error });
      return;
    }

    res.send({
      success: true,
      response: chatGptResponse.response,
      tokensUsed: {
        requestTokensUsed: chatGptResponse.requestTokensUsed,
        responseTokensUsed: chatGptResponse.responseTokensUsed
      }
    });
  } catch (error) {
    // Предполагается, что ошибка может произойти из-за исчерпания лимита токенов
    res.status(error.message.includes('Превышен лимит использования токенов.') ? 429 : 500).send({
      success: false,
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
