const STORAGE_KEY = "sophia-vocab-bank";

export type StoredVocabItem = {
  id: string;
  word: string;
  meaning: string;
  example: string;
  vietnamese: string;
  learning_status: string;
  conversation_id: string;
};

export type VocabAppendInput = {
  word: string;
  meaning?: string;
  definition?: string;
  example?: string;
  vietnamese?: string;
  context_sentence?: string;
  conversation_id?: string;
};

export function loadVocabFromStorage(): StoredVocabItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredVocabItem[]) : [];
  } catch {
    return [];
  }
}

export function appendVocabToStorage(entry: VocabAppendInput): void {
  const list = loadVocabFromStorage();
  const id = crypto.randomUUID();
  list.unshift({
    id,
    word: entry.word,
    meaning: entry.meaning ?? entry.definition ?? "",
    example: entry.example ?? entry.context_sentence ?? "",
    vietnamese: entry.vietnamese ?? "",
    learning_status: "new",
    conversation_id: entry.conversation_id ?? "",
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
