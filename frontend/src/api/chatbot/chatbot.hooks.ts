import { useCallback, useState } from "react";
import { postChatbotReply } from "./chatbot.service";
import type { ChatbotRequest, ChatbotResponse } from "./chatbot.types";

// Wraps postChatbotReply with loading/error state.
export function useChatbotReply() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const askBot = useCallback(
    async (payload: ChatbotRequest): Promise<ChatbotResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        return await postChatbotReply(payload);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { askBot, isLoading, error };
}
