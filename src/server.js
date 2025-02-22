import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

import logger from "./logger.js";

import completionsController from "./controllers/completionsController.js";
import tokensController from "./controllers/tokensController.js";
import systemMessagesController from "./controllers/systemMessagesController.js";
import referralController from "./controllers/referralController.js";
import transcriptionsController from "./controllers/transcriptionsController.js";
import dialogsController from "./controllers/dialogsController.js";

const app = express();
const PORT = process.env.PORT;

app.use(bodyParser.json({ limit: '300mb' })); // Увеличиваем лимит для JSON
app.use(bodyParser.urlencoded({ limit: '300mb', extended: true })); // Увеличиваем лимит для URL-encoded
app.use(cors());

app.use("/", completionsController);
app.use("/", tokensController);
app.use("/", systemMessagesController);
app.use("/", referralController);
app.use("/", transcriptionsController);
app.use("/", dialogsController);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
