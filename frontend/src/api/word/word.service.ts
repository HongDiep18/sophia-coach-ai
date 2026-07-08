import { apiRequest } from "../client";
import type {
  WordGlossResponse,
  WordLookupRequest,
  WordLookupResponse,
} from "./word.types";

export function postWordLookup(payload: WordLookupRequest) {
  return apiRequest<WordLookupResponse>("/api/word/lookup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Cheap word translation for the hover tooltip — reuses the lookup request
// shape (word + optional context) but hits the lighter /gloss endpoint.
export function postWordGloss(payload: WordLookupRequest) {
  return apiRequest<WordGlossResponse>("/api/word/gloss", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
