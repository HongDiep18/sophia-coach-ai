export type WordLookupRequest = {
  word: string;
  contextSentence?: string;
};

export type WordLookupResponse = {
  definition: string;
  vietnamese: string;
  example: string;
  part_of_speech: string;
  transliterations: [string, string];
};
