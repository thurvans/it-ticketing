import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/db.js";
import { initializeDatabase } from "../src/stateService.js";

const currentFilePath = fileURLToPath(import.meta.url);
const backendRootDir = path.resolve(path.dirname(currentFilePath), "..");
const repoRootDir = path.resolve(backendRootDir, "..");
const seedFilePath = path.join(repoRootDir, "db", "seed.sql");

try {
  await initializeDatabase();

  const seedSql = await fs.readFile(seedFilePath, "utf8");
  await pool.query(seedSql);

  console.log("Database seed selesai.");
} catch (error) {
  console.error("Database seed gagal:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
