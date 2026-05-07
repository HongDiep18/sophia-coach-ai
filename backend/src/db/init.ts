import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to initialize PostgreSQL schema.",
    );
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = await readFile(schemaPath, "utf-8");

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await pool.query(sql);
    console.log("PostgreSQL schema initialized successfully.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to initialize PostgreSQL schema.");
  console.error(error);
  process.exit(1);
});
