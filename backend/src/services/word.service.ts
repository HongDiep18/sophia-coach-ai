import { z } from "zod";
import { generateStructuredJson } from "./gemini.service.js";
import type { WordLookupReply } from "../types/ai.js";

const wordReplySchema = z.object({
  definition: z.string().min(1),
  vietnamese: z.string().min(1),
  example: z.string().min(1),
  part_of_speech: z.string().min(1),
});

export async function lookupWord(input: {
  word: string;
  contextSentence?: string;
}): Promise<WordLookupReply> {
  const prompt = `
Define this English word for a Vietnamese learner.
Return STRICT JSON with keys: definition, vietnamese, example, part_of_speech.
Word: ${input.word}
Context sentence: ${input.contextSentence || "(none)"}
`.trim();

  const result = await generateStructuredJson<WordLookupReply>(prompt);
  return wordReplySchema.parse(result);
}
