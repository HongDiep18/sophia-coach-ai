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

export type LearningStatus = "new" | "learning" | "mastered";

export type VocabItem = {
  id: string;
  word: string;
  meaning: string;
  vietnamese: string;
  example: string;
  learning_status: LearningStatus;
};

export type SaveVocabRequest = {
  word: string;
  meaning?: string;
  vietnamese?: string;
  example?: string;
};

// `status` is the "tag" telling the UI whether the word was newly stored
// or was already in the vocabulary bank (duplicate).
export type SaveVocabResponse = {
  status: "created" | "already_exists";
  item: VocabItem;
};

export type ListVocabResponse = {
  items: VocabItem[];
};
