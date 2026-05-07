import { z } from "zod";
import { generateStructuredJson, generateTextStream } from "./gemini.service.js";
import type { ChatReply } from "../types/ai.js";

const chatReplySchema = z.object({
  english: z.string().min(1),
  vietnamese: z.string().min(1),
  analysis: z.string().min(1),
  suggestions: z.array(z.string()).default([]),
});

export async function generateChatReply(input: {
  message: string;
  level: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<ChatReply> {
  const historyText = input.history
    .slice(-12)
    .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
    .join("\n");

  const prompt = `
You are an English speaking coach for software developers.
Reply in STRICT JSON with keys: english, vietnamese, analysis, suggestions.
- english: 2-4 short sentences, clear and friendly.
- vietnamese: natural Vietnamese translation.
- analysis: one short improvement tip.
- suggestions: 3 concise reply options.
- learner level: ${input.level}

Conversation history:
${historyText || "(empty)"}

Latest user message:
${input.message}
`.trim();

  const result = await generateStructuredJson<ChatReply>(prompt);
  return chatReplySchema.parse(result);
}

export async function* streamChatEnglishReply(input: {
  message: string;
  level: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): AsyncGenerator<string, void, void> {
  const historyText = input.history
    .slice(-12)
    .map(
      (item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`,
    )
    .join("\n");

  const prompt = `
You are an English speaking coach for software developers.
Reply ONLY in English. No JSON. No markdown.
- 2-4 short sentences, clear and friendly.
- learner level: ${input.level}

Conversation history:
${historyText || "(empty)"}

Latest user message:
${input.message}
`.trim();

  yield* generateTextStream(prompt);
}
