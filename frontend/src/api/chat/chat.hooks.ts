import { useCallback, useState } from "react";
import { postChatReply } from "./chat.service";
import type { ChatReplyRequest, ChatReplyResponse } from "./chat.types";

// Wraps postChatReply with loading/error state so components don't have to
// repeat the try/catch boilerplate.
export function useChatReply() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendReply = useCallback(
    async (payload: ChatReplyRequest): Promise<ChatReplyResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        return await postChatReply(payload);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { sendReply, isLoading, error };
}
