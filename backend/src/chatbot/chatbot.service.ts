import { z } from "zod";
import { generateStructuredJson } from "../services/gemini.service.js";
import { retrieveRelevantChunks, formatChunksAsContext } from "./rag.service.js";

export type ChatbotMessage = { role: "user" | "assistant"; content: string };

export type ChatbotReply = {
  answer: string;
  /** Knowledge files the answer drew from, for transparency. */
  sources: string[];
  /** True when no relevant knowledge was found and we returned a fallback. */
  grounded: boolean;
};

const answerSchema = z.object({ answer: z.string().min(1) });

// Shown when the knowledge base has nothing relevant — the bot stays honest
// instead of guessing from unrelated chunks.
const FALLBACK_ANSWER =
  "I'm not sure about that one. I can help with questions about using the " +
  "app — like the Voice Assistant, Chat coach, Vocabulary Bank, or Settings. " +
  "Try asking about one of those.";

function buildPrompt(
  message: string,
  context: string,
  history: ChatbotMessage[],
): string {
  const historyText = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  return `
You are the in-app help assistant for FluentFlow (also called Sophia Coach AI),
an app for practicing English. Answer the user's question using ONLY the CONTEXT
below, which is taken from the app's help documentation.

Rules:
- If the CONTEXT does not clearly answer the question, say you are not sure and
  suggest the user ask about the app's features. Do not invent details.
- Be concise, friendly, and practical. Prefer short steps.
- Reply in the same language as the user's question (English or Vietnamese).
- Write PLAIN TEXT only. Do NOT use Markdown — no **bold**, no #, no backticks.
- Put each step or point on its own line using real line breaks (\\n). For a
  list of steps, number them 1., 2., 3. on separate lines.
- Return STRICT JSON with a single key "answer" (a string). Newlines inside the
  answer must be written as \\n.

CONTEXT:
${context}

Conversation so far:
${historyText || "(none)"}

User question:
${message}
`.trim();
}

/**
 * The floating-icon help bot. Retrieves relevant knowledge chunks, and if any
 * are found, asks Gemini to answer grounded in them; otherwise returns a safe
 * fallback without calling the model.
 */
export async function generateChatbotReply(input: {
  message: string;
  history?: ChatbotMessage[];
}): Promise<ChatbotReply> {
  const chunks = await retrieveRelevantChunks(input.message);

  if (chunks.length === 0) {
    return { answer: FALLBACK_ANSWER, sources: [], grounded: false };
  }

  const context = formatChunksAsContext(chunks);
  const prompt = buildPrompt(input.message, context, input.history ?? []);
  const result = await generateStructuredJson<{ answer: string }>(prompt);
  const { answer } = answerSchema.parse(result);

  const sources = [...new Set(chunks.map((c) => c.source).filter(Boolean))];
  return { answer, sources, grounded: true };
}
