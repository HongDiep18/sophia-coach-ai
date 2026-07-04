import { Pool } from "pg";
import { env } from "../config/env.js";

// Single shared connection pool for the whole process. Import this
// everywhere that talks to Postgres (init script, RAG ingest/retrieval)
// instead of constructing new Pool instances — one pool per process is
// the correct pattern and avoids exhausting the database connection limit.
export const pool = new Pool({ connectionString: env.DATABASE_URL });
