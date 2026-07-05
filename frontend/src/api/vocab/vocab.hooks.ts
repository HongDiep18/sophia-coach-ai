import { useCallback, useEffect, useState } from "react";
import {
  deleteVocab,
  getVocab,
  saveVocab,
  updateVocabStatus,
} from "./vocab.service";
import type {
  LearningStatus,
  SaveVocabRequest,
  SaveVocabResponse,
  VocabItem,
} from "./vocab.types";

// Loads the vocabulary list and exposes status-cycle / delete operations that
// keep the local list in sync with the server.
export function useVocabList() {
  const [items, setItems] = useState<VocabItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getVocab();
      setItems(data.items);
    } catch (err) {
      console.error(err);
      setError("Could not load your vocabulary from the server.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const cycleStatus = useCallback(async (id: string, next: LearningStatus) => {
    const { item } = await updateVocabStatus(id, next);
    setItems((prev) => prev.map((v) => (v.id === id ? item : v)));
    return item;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteVocab(id);
    setItems((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return { items, isLoading, error, reload, cycleStatus, remove };
}

// Wraps saveVocab with saving/error state for the "Save to Vocab" action.
export function useSaveVocab() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const save = useCallback(
    async (payload: SaveVocabRequest): Promise<SaveVocabResponse> => {
      setIsSaving(true);
      setError(null);
      try {
        return await saveVocab(payload);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  return { save, isSaving, error };
}
