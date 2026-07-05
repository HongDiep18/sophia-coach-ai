export type LearningStatus = "new" | "learning" | "mastered";

export type VocabItem = {
  id: string;
  word: string;
  meaning: string;
  vietnamese: string;
  example: string;
  learning_status: LearningStatus;
};

export type SaveVocabRequest = {
  word: string;
  meaning?: string;
  vietnamese?: string;
  example?: string;
};

// `status` is the "tag" telling the UI whether the word was newly stored
// or was already in the vocabulary bank (duplicate).
export type SaveVocabResponse = {
  status: "created" | "already_exists";
  item: VocabItem;
};

export type ListVocabResponse = {
  items: VocabItem[];
};
