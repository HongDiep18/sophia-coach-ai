import { Router } from "express";
import { postChatReply } from "../controllers/chat.controller.js";
import { postWordLookup } from "../controllers/word.controller.js";
import { chatbotRouter } from "../chatbot/chatbot.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

apiRouter.post("/chat/reply", postChatReply);
apiRouter.post("/word/lookup", postWordLookup);
apiRouter.use("/chatbot", chatbotRouter);
