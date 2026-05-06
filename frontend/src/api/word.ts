import { apiRequest } from "./client";
import type { WordLookupRequest, WordLookupResponse } from "./types";

export function postWordLookup(payload: WordLookupRequest) {
  return apiRequest<WordLookupResponse>("/api/word/lookup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
