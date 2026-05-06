/** Offline fallback lookup when API is unavailable. */

export type WordDefinitionResult = {
  word: string;
  definition: string;
  vietnamese: string;
  example: string;
  part_of_speech: string;
};

export async function lookupWordDefinition(
  word: string,
  contextSentence = "",
): Promise<WordDefinitionResult> {
  const w = word.trim().toLowerCase();
  await new Promise<void>((r) => setTimeout(r, 400));

  const generic: WordDefinitionResult = {
    word,
    definition: `Common English word "${word}". Practice using it in short sentences.`,
    vietnamese: `Từ tiếng Anh "${word}" — tra từ điển song ngữ khi học.`,
    example: contextSentence
      ? `Example in context: ${contextSentence.slice(0, 120)}${contextSentence.length > 120 ? "…" : ""}`
      : `I use "${word}" when I explain my work clearly.`,
    part_of_speech: "word",
  };

  const hints: Record<string, Omit<WordDefinitionResult, "word">> = {
    project: {
      definition: "A planned piece of work with a goal and timeline.",
      vietnamese: "Dự án — công việc có mục tiêu và thời hạn.",
      example: "I'm leading a frontend project for our team.",
      part_of_speech: "noun",
    },
    code: {
      definition: "Instructions written for a computer program.",
      vietnamese: "Mã nguồn / code — hướng dẫn cho máy tính.",
      example: "I review code every morning.",
      part_of_speech: "noun",
    },
  };

  for (const [key, val] of Object.entries(hints)) {
    if (w.includes(key)) return { ...val, word };
  }

  return generic;
}
