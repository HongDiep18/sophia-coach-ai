import { apiRequest } from "../client";
import type { WordLookupRequest, WordLookupResponse } from "./word.types";

export function postWordLookup(payload: WordLookupRequest) {
  return apiRequest<WordLookupResponse>("/api/word/lookup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
