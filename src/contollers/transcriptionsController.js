import express from "express";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";
import { rest } from "../rest/rest.js";
import { HttpResponse } from "../rest/HttpResponse.js";
import { completionsService, tokensService } from "../services/index.js";

const transcriptionsController = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

function estimateDuration(buffer, bitrateKbps) {
  const fileSizeBytes = buffer.length; // Получаем размер буфера в байтах
  const bitrateBps = bitrateKbps * 1000; // Приводим битрейт к битам в секунду

  return (fileSizeBytes * 8) / bitrateBps; // Возвращаем примерную длительность в секундах
}

transcriptionsController.post(
  "/v1/audio/transcriptions",
  upload.single("file"),
  rest(async ({ req, res }) => {
    const { model, language } = req.body;
    const file = req.file;

    if (!file || !model) {
      return new HttpResponse(400, { error: "File and model are required" });
    }

    const tokenId = tokensService.getTokenFromAuthorization(req.headers.authorization);
    await tokensService.isAdminToken(tokenId);
    await tokensService.isHasBalanceToken(tokenId);

    const formData = new FormData();
    formData.append("file", file.buffer, file.originalname);
    formData.append("model", model);
    formData.append("language", language);
    formData.append("response_format", "verbose_json");

    const response = await fetch("https://api.goapi.ai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (response.ok) {
      const duration = Math.ceil(estimateDuration(file.buffer, 128) * 1.2);
      await completionsService.updateCompletionTokens(tokenId, duration * 15);
    }

    const responseData = await response.json();

    return new HttpResponse(response.status, responseData);
  }),
);

transcriptionsController.options("/v1/audio/transcriptions", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "43200");

  res.sendStatus(204);
});

export default transcriptionsController;
