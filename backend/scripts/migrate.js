import { pool } from "../src/db.js";
import { initializeDatabase } from "../src/stateService.js";

try {
  await initializeDatabase();
  console.log("Database migration selesai.");
} catch (error) {
  console.error("Database migration gagal:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
