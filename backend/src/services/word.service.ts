import { z } from "zod";
import { generateStructuredJson } from "./gemini.service.js";
import type { WordLookupReply } from "../types/ai.js";

const wordReplySchema = z.object({
  definition: z.string().min(1),
  vietnamese: z.string().min(1),
  example: z.string().min(1),
  part_of_speech: z.string().min(1),
  transliterations: z
    .array(z.string().min(1))
    .length(2, "Must provide exactly two IPA transliterations"),
});

export async function lookupWord(input: {
  word: string;
  contextSentence?: string;
}): Promise<WordLookupReply> {
  const prompt = `
Define this English word for a Vietnamese learner.
Return STRICT JSON with keys: definition, vietnamese, example, part_of_speech, transliterations.
- part_of_speech: short label (e.g. noun, verb).
- transliterations: array of EXACTLY two strings in IPA (slash-notation), e.g. ["/ˈkʌstəmə(r)/", "/ˈkʌstəmər/"] — first more British-style, second more American-style when both exist; otherwise two common variants.
Word: ${input.word}
Context sentence: ${input.contextSentence || "(none)"}
`.trim();

  const result = await generateStructuredJson<WordLookupReply>(prompt);
  const parsed = wordReplySchema.parse(result);
  return {
    ...parsed,
    transliterations: [parsed.transliterations[0], parsed.transliterations[1]],
  };
}
