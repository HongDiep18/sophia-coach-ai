const STORAGE_KEY = "sophia-vocab-bank";

export function loadVocabFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** @param {{ word: string; meaning?: string; example?: string; vietnamese?: string; context_sentence?: string; conversation_id?: string }} entry */
export function appendVocabToStorage(entry) {
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
