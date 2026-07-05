export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type ChatReply = {
  english: string;
  /** The learner's latest message rewritten in natural, correct English.
   *  Equals the original when it was already correct. */
  corrected: string;
  vietnamese: string;
  analysis: string;
  suggestions: string[];
};

export type WordLookupReply = {
  definition: string;
  vietnamese: string;
  example: string;
  part_of_speech: string;
  /** Two IPA strings, e.g. UK vs US or two common variants */
  transliterations: [string, string];
};
