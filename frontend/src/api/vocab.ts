import { apiRequest } from "./client";
import type {
  ListVocabResponse,
  LearningStatus,
  SaveVocabRequest,
  SaveVocabResponse,
  VocabItem,
} from "./types";

export function getVocab() {
  return apiRequest<ListVocabResponse>("/api/vocab");
}

export function saveVocab(payload: SaveVocabRequest) {
  return apiRequest<SaveVocabResponse>("/api/vocab", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateVocabStatus(id: string, learning_status: LearningStatus) {
  return apiRequest<{ item: VocabItem }>(`/api/vocab/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ learning_status }),
  });
}

export function deleteVocab(id: string) {
  return apiRequest<{ ok: boolean }>(`/api/vocab/${id}`, {
    method: "DELETE",
  });
}
