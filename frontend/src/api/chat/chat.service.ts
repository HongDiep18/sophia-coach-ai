import { apiRequest } from "../client";
import type { ChatReplyRequest, ChatReplyResponse } from "./chat.types";

export function postChatReply(payload: ChatReplyRequest) {
  return apiRequest<ChatReplyResponse>("/api/chat/reply", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
