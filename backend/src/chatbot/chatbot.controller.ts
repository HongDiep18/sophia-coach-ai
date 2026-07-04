import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { generateChatbotReply } from "./chatbot.service.js";

const chatbotRequestSchema = z.object({
  message: z.string().min(1).max(1200),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(1200),
      }),
    )
    .default([]),
});

export async function postChatbotReply(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const payload = chatbotRequestSchema.parse(req.body);
    const reply = await generateChatbotReply(payload);
    res.status(200).json(reply);
  } catch (error) {
    next(error);
  }
}
