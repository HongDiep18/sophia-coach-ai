import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { generateChatReply } from "../services/chat.service.js";

const chatRequestSchema = z.object({
  message: z.string().min(1).max(1200),
  level: z.string().default("B1"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(1200),
      }),
    )
    .default([]),
});

export async function postChatReply(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const payload = chatRequestSchema.parse(req.body);
    const reply = await generateChatReply(payload);
    res.status(200).json(reply);
  } catch (error) {
    next(error);
  }
}
