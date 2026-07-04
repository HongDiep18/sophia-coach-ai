import { apiRequest } from "./client";
import type { ChatbotRequest, ChatbotResponse } from "./types";

// Talks to the RAG help bot (POST /api/chatbot), which answers questions
// about the app using the knowledge base. Separate from the English coach.
export function postChatbotReply(payload: ChatbotRequest) {
  return apiRequest<ChatbotResponse>("/api/chatbot", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
