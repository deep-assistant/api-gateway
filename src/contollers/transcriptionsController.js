import express from "express";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";

import { rest } from "../rest/rest.js";
import { HttpResponse } from "../rest/HttpResponse.js";

const transcriptionsController = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

transcriptionsController.post(
  "/v1/audio/transcriptions",
  upload.single("file"),
  rest(async ({ req, res }) => {
    const { model, language } = req.body;
    const file = req.file;

    if (!file || !model) {
      return new HttpResponse(400, { error: "File and model are required" });
    }

    const formData = new FormData();
    formData.append("file", file.buffer, file.originalname);
    formData.append("model", model);
    formData.append("language", language);

    const response = await fetch("https://api.goapi.ai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    console.log(response);

    const responseData = await response.json(); // Парсим JSON ответ

    return new HttpResponse(response.status, responseData);
  }),
);

transcriptionsController.options("/v1/audio/transcriptions", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.sendStatus(200);
});

export default transcriptionsController;
