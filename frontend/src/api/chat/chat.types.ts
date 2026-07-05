// A single turn in a conversation. Shared by the English coach (chat) and
// the RAG help bot (chatbot).
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
  // Learner's latest message rewritten in natural, correct English.
  corrected: string;
  vietnamese: string;
  analysis: string;
  suggestions: string[];
};
