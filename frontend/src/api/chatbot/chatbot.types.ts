import type { ChatHistoryItem } from "../chat/chat.types";

export type ChatbotRequest = {
  message: string;
  history: ChatHistoryItem[];
};

export type ChatbotResponse = {
  answer: string;
  sources: string[];
  grounded: boolean;
};
