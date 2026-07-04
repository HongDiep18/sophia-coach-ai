import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = await readFile(schemaPath, "utf-8");

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
