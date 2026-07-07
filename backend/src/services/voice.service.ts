import { generateTextStream } from "./gemini.service.js";
import { buildVoiceCoachPrompt } from "../prompts/voice.prompt.js";

/**
 * Stream Sophia's spoken coaching reply for the VOICE feature. Yields plain
 * text deltas as they arrive so the client can speak the first sentence before
 * the whole answer is ready.
 */
export async function* streamVoiceReply(input: {
  message: string;
  level: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): AsyncGenerator<string, void, void> {
  const prompt = buildVoiceCoachPrompt(input);
  yield* generateTextStream(prompt);
}
