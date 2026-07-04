export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type ChatReplyRequest = {
  message: string;
  level: string;
  history: ChatHistoryItem[];
};

export type ChatReplyResponse = {
  english: string;
  vietnamese: string;
  analysis: string;
  suggestions: string[];
};

export type ChatbotRequest = {
  message: string;
  history: ChatHistoryItem[];
};

export type ChatbotResponse = {
  answer: string;
  sources: string[];
  grounded: boolean;
};

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
