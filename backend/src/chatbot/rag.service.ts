import { pool } from "../db/pool.js";
import { env } from "../config/env.js";
import { embedText } from "../services/gemini.service.js";

export type RetrievedChunk = {
  content: string;
  source: string;
  heading: string;
  /** Cosine similarity (0–1) for vector hits; full-text rank for keyword hits. */
  score: number;
  match: "vector" | "keyword";
};

// If semantic search finds at least this many good chunks, we trust it and
// skip the keyword fallback. Below this, we top up with keyword matches.
const VECTOR_ENOUGH = 3;

function dedupeByContent(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const seen = new Set<string>();
  const unique: RetrievedChunk[] = [];
  for (const chunk of chunks) {
    const key = chunk.content.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(chunk);
  }
  return unique;
}

/**
 * Semantic search: embed the question (RETRIEVAL_QUERY) and find the nearest
 * chunks by cosine distance, using the HNSW index. Drops anything below the
 * similarity floor.
 */
async function vectorSearch(
  question: string,
  topK: number,
  minScore: number,
): Promise<RetrievedChunk[]> {
  const embedding = await embedText(question, "RETRIEVAL_QUERY");
  const vectorLiteral = `[${embedding.join(",")}]`;

  const { rows } = await pool.query<{
    content: string;
    source: string | null;
    heading: string | null;
    similarity: number;
  }>(
    `SELECT content,
            metadata->>'source' AS source,
            metadata->>'heading' AS heading,
            1 - (embedding <=> $1) AS similarity
       FROM knowledge_chunks
       ORDER BY embedding <=> $1
       LIMIT $2`,
    [vectorLiteral, topK],
  );

  return rows
    .map<RetrievedChunk>((row) => ({
      content: row.content,
      source: row.source ?? "",
      heading: row.heading ?? "",
      score: Number(row.similarity),
      match: "vector",
    }))
    .filter((chunk) => chunk.score >= minScore);
}

/**
 * Keyword search: Postgres full-text match on the chunk text. Catches exact
 * terms, product names, and typos that semantic search can miss. Runs only as
 * a fallback when vector search is thin, so we never pay for it unnecessarily.
 */
async function keywordSearch(
  question: string,
  topK: number,
): Promise<RetrievedChunk[]> {
  const { rows } = await pool.query<{
    content: string;
    source: string | null;
    heading: string | null;
    rank: number;
  }>(
    `SELECT content,
            metadata->>'source' AS source,
            metadata->>'heading' AS heading,
            ts_rank(to_tsvector('english', content),
                    plainto_tsquery('english', $1)) AS rank
       FROM knowledge_chunks
       WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $1)
       ORDER BY rank DESC
       LIMIT $2`,
    [question, topK],
  );

  return rows.map<RetrievedChunk>((row) => ({
    content: row.content,
    source: row.source ?? "",
    heading: row.heading ?? "",
    score: Number(row.rank),
    match: "keyword",
  }));
}

/**
 * Hybrid retrieval — the "read" side of RAG. Runs semantic vector search
 * first; if it returns fewer than VECTOR_ENOUGH strong chunks, it tops up with
 * a keyword search and merges the two (vector hits take precedence on ties).
 *
 * Returns up to topK chunks, or an empty list when nothing is relevant — which
 * the caller should treat as "the knowledge base does not cover this question."
 */
export async function retrieveRelevantChunks(
  question: string,
  opts: { topK?: number; minScore?: number } = {},
): Promise<RetrievedChunk[]> {
  const query = question.trim();
  if (!query) return [];

  const topK = opts.topK ?? env.RAG_TOP_K;
  const minScore = opts.minScore ?? env.RAG_MIN_SCORE;

  const vectorHits = await vectorSearch(query, topK, minScore);
  if (vectorHits.length >= VECTOR_ENOUGH) {
    return vectorHits.slice(0, topK);
  }

  const keywordHits = await keywordSearch(query, topK);
  // Vector hits first so they win the dedupe and keep their place.
  return dedupeByContent([...vectorHits, ...keywordHits]).slice(0, topK);
}

/**
 * Join retrieved chunks into a single context block for injecting into a
 * prompt. Returns an empty string when there is nothing relevant.
 */
export function formatChunksAsContext(chunks: RetrievedChunk[]): string {
  return chunks.map((chunk) => chunk.content).join("\n\n---\n\n");
}
