import { useCallback, useState } from "react";
import { postWordLookup } from "./word.service";
import type { WordLookupRequest, WordLookupResponse } from "./word.types";

// Manages a single word lookup: the result plus loading/error state.
export function useWordLookup() {
  const [data, setData] = useState<WordLookupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const lookup = useCallback(
    async (payload: WordLookupRequest): Promise<WordLookupResponse> => {
      setIsLoading(true);
      setError(null);
      setData(null);
      try {
        const result = await postWordLookup(payload);
        setData(result);
        return result;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, isLoading, error, lookup, reset };
}
