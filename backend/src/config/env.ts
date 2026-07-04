import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_FALLBACK_MODELS: z.string().optional(),
  // Embedding model + output dimension for RAG. EMBEDDING_DIM MUST match
  // the vector(N) column in db/schema.sql (knowledge_chunks.embedding).
  EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),
  EMBEDDING_DIM: z.coerce.number().default(768),
});

export const env = envSchema.parse(process.env);
