import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

import completionsController from "./contollers/completionsController.js";
import tokensController from "./contollers/tokensController.js";
import systemMessagesController from "./contollers/systemMessagesController.js";
import referralController from "./contollers/referralController.js";
import transcriptionsController from "./contollers/transcriptionsController.js";
import dialogsController from "./contollers/dialogsController.js";

const app = express();
const PORT = process.env.PORT;

app.use(bodyParser.json({ limit: '100mb' })); // Увеличиваем лимит для JSON
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true })); // Увеличиваем лимит для URL-encoded
app.use(cors());

app.use("/", completionsController);
app.use("/", tokensController);
app.use("/", systemMessagesController);
app.use("/", referralController);
app.use("/", transcriptionsController);
app.use("/", dialogsController);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
