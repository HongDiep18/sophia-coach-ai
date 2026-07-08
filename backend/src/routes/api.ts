import { Router } from "express";
import { postChatReply } from "../controllers/chat.controller.js";
import {
  postWordGloss,
  postWordLookup,
} from "../controllers/word.controller.js";
import {
  getVocab,
  patchVocab,
  postVocab,
  removeVocab,
} from "../controllers/vocab.controller.js";
import { chatbotRouter } from "../chatbot/chatbot.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

apiRouter.post("/chat/reply", postChatReply);
apiRouter.post("/word/lookup", postWordLookup);
apiRouter.post("/word/gloss", postWordGloss);

apiRouter.get("/vocab", getVocab);
apiRouter.post("/vocab", postVocab);
apiRouter.patch("/vocab/:id", patchVocab);
apiRouter.delete("/vocab/:id", removeVocab);

apiRouter.use("/chatbot", chatbotRouter);
