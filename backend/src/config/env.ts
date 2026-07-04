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
  // RAG retrieval tuning. RAG_TOP_K = how many chunks to fetch per question.
  // RAG_MIN_SCORE = a LENIENT cosine floor that only blocks truly irrelevant
  // chunks (~0.58 nonsense band). Borderline/near-miss questions pass through
  // to the model, whose prompt rules ("answer only from context, else say you
  // are not sure") judge the gray zone. Two safety nets, not one.
  RAG_TOP_K: z.coerce.number().default(4),
  RAG_MIN_SCORE: z.coerce.number().default(0.6),
});

export const env = envSchema.parse(process.env);
