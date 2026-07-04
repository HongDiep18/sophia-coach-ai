import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";
import { embedText } from "../services/gemini.service.js";

// Files that describe how to write the knowledge base, not the knowledge
// itself — skip them so they never end up as chatbot answers.
const SKIP_FILES = new Set(["README.md"]);

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;

type Section = { headingPath: string; text: string };
type Chunk = { content: string; source: string; heading: string; index: number };

/**
 * Split a Markdown file into sections along its `#`/`##`/`###` headings, so
 * each section stays on one topic. Each section carries a breadcrumb heading
 * path like "Chat Coaching > Looking up and saving a word".
 */
function parseSections(md: string): Section[] {
  const lines = md.split(/\r?\n/);
  const sections: Section[] = [];
  let h1 = "";
  let h2 = "";
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) {
      const headingPath = [h1, h2].filter(Boolean).join(" > ");
      sections.push({ headingPath, text });
    }
    buffer = [];
  };

  for (const line of lines) {
    if (/^###\s+/.test(line)) {
      flush();
      h2 = line.replace(/^###\s+/, "").trim();
      continue;
    }
    if (/^##\s+/.test(line)) {
      flush();
      h2 = line.replace(/^##\s+/, "").trim();
      continue;
    }
    if (/^#\s+/.test(line)) {
      flush();
      h1 = line.replace(/^#\s+/, "").trim();
      h2 = "";
      continue;
    }
    buffer.push(line);
  }
  flush();
  return sections;
}

/**
 * Cut a section's text into ~CHUNK_SIZE-character pieces with CHUNK_OVERLAP
 * characters of overlap, breaking on a sentence or newline boundary near the
 * end so a sentence is not sliced in half between two chunks.
 */
function chunkText(text: string): string[] {
  const clean = text.replace(/[ \t]+\n/g, "\n").trim();
  if (clean.length <= CHUNK_SIZE) return clean ? [clean] : [];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);
    if (end < clean.length) {
      const slice = clean.slice(start, end);
      const boundary = Math.max(
        slice.lastIndexOf(". "),
        slice.lastIndexOf("? "),
        slice.lastIndexOf("! "),
        slice.lastIndexOf("\n"),
      );
      if (boundary > CHUNK_SIZE * 0.5) end = start + boundary + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(0, end - CHUNK_OVERLAP);
  }
  return chunks;
}

async function collectChunks(knowledgeDir: string): Promise<Chunk[]> {
  const entries = await readdir(knowledgeDir);
  const files = entries
    .filter((name) => name.toLowerCase().endsWith(".md"))
    .filter((name) => !SKIP_FILES.has(name))
    .sort();

  const chunks: Chunk[] = [];
  for (const file of files) {
    const raw = await readFile(path.join(knowledgeDir, file), "utf-8");
    const sections = parseSections(raw);
    let indexInFile = 0;
    for (const section of sections) {
      for (const piece of chunkText(section.text)) {
        // Prepend the breadcrumb so the stored/embedded text carries its
        // context (which page and section it came from).
        const content = section.headingPath
          ? `[${section.headingPath}]\n${piece}`
          : piece;
        chunks.push({
          content,
          source: file,
          heading: section.headingPath,
          index: indexInFile,
        });
        indexInFile += 1;
      }
    }
    console.log(`  parsed ${file}: ${indexInFile} chunk(s)`);
  }
  return chunks;
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const knowledgeDir = path.join(__dirname, "..", "..", "knowledge");

  console.log(`Reading knowledge from: ${knowledgeDir}`);
  const chunks = await collectChunks(knowledgeDir);
  if (chunks.length === 0) {
    console.log("No chunks found. Nothing to ingest.");
    await pool.end();
    return;
  }

  console.log(`Embedding ${chunks.length} chunk(s) with Gemini...`);
  const rows: Array<{ content: string; vector: string; metadata: string }> = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const embedding = await embedText(chunk.content, "RETRIEVAL_DOCUMENT");
    rows.push({
      content: chunk.content,
      vector: toVectorLiteral(embedding),
      metadata: JSON.stringify({
        source: chunk.source,
        heading: chunk.heading,
        chunk_index: chunk.index,
      }),
    });
    console.log(`  embedded ${i + 1}/${chunks.length} (${chunk.source})`);
  }

  // Replace old knowledge with fresh chunks in one transaction: if anything
  // above failed, we never got here, so the table is never left empty.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM knowledge_chunks");
    for (const row of rows) {
      await client.query(
        "INSERT INTO knowledge_chunks (content, embedding, metadata) VALUES ($1, $2, $3)",
        [row.content, row.vector, row.metadata],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  console.log(`Ingest complete: ${rows.length} chunk(s) stored in knowledge_chunks.`);
  await pool.end();
}

main().catch(async (error) => {
  console.error("Ingest failed.");
  console.error(error);
  await pool.end().catch(() => {});
  process.exit(1);
});
