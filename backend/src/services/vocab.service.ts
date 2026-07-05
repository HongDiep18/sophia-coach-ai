import { pool } from "../db/pool.js";

// Single shared user until real accounts/login exist. MUST match the seeded
// row in db/schema.sql. Every saved vocabulary item belongs to this user.
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export type LearningStatus = "new" | "learning" | "mastered";

export type VocabItem = {
  id: string;
  word: string;
  meaning: string;
  vietnamese: string;
  example: string;
  learning_status: LearningStatus;
};

export type SaveVocabInput = {
  word: string;
  meaning?: string;
  vietnamese?: string;
  example?: string;
};

// The status "tag" the UI uses: "created" = a new row was stored,
// "already_exists" = this user had already saved that word (duplicate).
export type SaveVocabResult = {
  status: "created" | "already_exists";
  item: VocabItem;
};

// Shared column projection so every query returns the same shape the
// frontend expects (definition is exposed as `meaning`).
const VOCAB_COLUMNS =
  "id, word, definition AS meaning, vietnamese, example, learning_status";

export async function listVocab(): Promise<VocabItem[]> {
  const result = await pool.query<VocabItem>(
    `SELECT ${VOCAB_COLUMNS}
       FROM vocabulary_items
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [DEFAULT_USER_ID],
  );
  return result.rows;
}

export async function saveVocab(
  input: SaveVocabInput,
): Promise<SaveVocabResult> {
  const word = input.word.trim();

  // Duplicate-safe insert: if this user already has the word (case
  // insensitive), ON CONFLICT skips the insert and returns no rows.
  const inserted = await pool.query<VocabItem>(
    `INSERT INTO vocabulary_items (user_id, word, definition, vietnamese, example)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, lower(word)) DO NOTHING
     RETURNING ${VOCAB_COLUMNS}`,
    [
      DEFAULT_USER_ID,
      word,
      input.meaning ?? "",
      input.vietnamese ?? "",
      input.example ?? "",
    ],
  );

  if (inserted.rows.length > 0) {
    return { status: "created", item: inserted.rows[0] };
  }

  // Already saved before — fetch and return the existing row so the UI can
  // still show its details and mark it as stored.
  const existing = await pool.query<VocabItem>(
    `SELECT ${VOCAB_COLUMNS}
       FROM vocabulary_items
      WHERE user_id = $1 AND lower(word) = lower($2)
      LIMIT 1`,
    [DEFAULT_USER_ID, word],
  );
  return { status: "already_exists", item: existing.rows[0] };
}

export async function updateVocabStatus(
  id: string,
  status: LearningStatus,
): Promise<VocabItem | null> {
  const result = await pool.query<VocabItem>(
    `UPDATE vocabulary_items
        SET learning_status = $3, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING ${VOCAB_COLUMNS}`,
    [id, DEFAULT_USER_ID, status],
  );
  return result.rows[0] ?? null;
}

export async function deleteVocab(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM vocabulary_items WHERE id = $1 AND user_id = $2`,
    [id, DEFAULT_USER_ID],
  );
  return (result.rowCount ?? 0) > 0;
}
