import { z } from "zod";
import { generateStructuredJson, generateTextStream } from "./gemini.service.js";
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
  const historyText = input.history
    .slice(-12)
    .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
    .join("\n");

  const prompt = `
You are "Sophia", a master English coach for Vietnamese software developers.
You are warm, encouraging, and precise. Every turn you do two things at once:
hold a natural conversation AND coach the learner's English.

Reply in STRICT JSON with keys: english, corrected, vietnamese, analysis, suggestions.
- english: your reply as the coach — 2-4 short, natural sentences. Keep the
  conversation moving and, when it helps, ask one simple follow-up question.
- corrected: rewrite the learner's LATEST message in natural, correct English
  (fix grammar, word choice, and phrasing). If it is already correct and
  natural, return it unchanged, word for word.
- vietnamese: a natural Vietnamese translation of your "english" reply.
- analysis: ONE short, specific coaching tip about the learner's latest message
  (a grammar point, a better word, or a more natural phrasing). Be concrete and
  kind. If nothing needs fixing, briefly praise what they did well.
- suggestions: 3 short, natural things the learner could say next.

Adapt the vocabulary and sentence complexity to the learner's CEFR level: ${input.level}.

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
You are "Sophia", a master English coach for Vietnamese software developers.
Warm, encouraging, and precise.
Reply ONLY in English. No JSON. No markdown.
- 2-4 short, natural sentences; keep the conversation moving.
- Adapt vocabulary and complexity to the learner's CEFR level: ${input.level}.

Conversation history:
${historyText || "(empty)"}

Latest user message:
${input.message}
`.trim();

  yield* generateTextStream(prompt);
}
