import { z } from "zod";
import { generateTextStream, generateStructuredJson } from "./gemini.service.js";
import {
  buildVoiceCoachPrompt,
  buildVoiceCoachingPrompt,
} from "../prompts/voice.prompt.js";
import type { VoiceCoaching } from "../types/ai.js";

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

const voiceCoachingSchema = z.object({
  corrected: z.string().default(""),
  hints: z.array(z.string()).default([]),
});

/**
 * Produce the on-screen "learning card" for a voice turn: a corrected version
 * of the learner's sentence plus one next-line hint. Takes Sophia's spoken
 * `reply` so the hint can answer the follow-up question she just asked. This is
 * a nice-to-have that runs after (not inside) the spoken reply, so callers
 * should treat a failure here as non-fatal and never let it break the turn.
 */
export async function generateVoiceCoaching(input: {
  message: string;
  reply: string;
  level: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<VoiceCoaching> {
  const prompt = buildVoiceCoachingPrompt(input);
  const result = await generateStructuredJson<VoiceCoaching>(prompt);
  return voiceCoachingSchema.parse(result);
}
