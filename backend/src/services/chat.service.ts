import { z } from "zod";
import { generateStructuredJson } from "./gemini.service.js";
import { buildChatReplyPrompt } from "../prompts/chat.prompt.js";
import type { ChatReply } from "../types/ai.js";

const chatReplySchema = z.object({
  english: z.string().min(1),
  corrected: z.string().default(""),
  vietnamese: z.string().min(1),
  analysis: z.string().min(1),
  suggestions: z.array(z.string()).default([]),
});

export async function generateChatReply(input: {
  message: string;
  level: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<ChatReply> {
  const prompt = buildChatReplyPrompt(input);
  const result = await generateStructuredJson<ChatReply>(prompt);
  return chatReplySchema.parse(result);
}
