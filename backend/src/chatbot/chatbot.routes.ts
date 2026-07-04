import { Router } from "express";
import { postChatbotReply } from "./chatbot.controller.js";

// Self-contained router for the floating-icon help bot. Mounted at
// /api/chatbot by routes/api.ts.
export const chatbotRouter = Router();

chatbotRouter.post("/", postChatbotReply);
