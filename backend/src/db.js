import pg from "pg";
import { config } from "./config.js";

const { Client, Pool } = pg;

let databaseEnsured = false;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
});

function getDatabaseName(connectionString) {
  const url = new URL(connectionString);
  return decodeURIComponent(url.pathname.replace(/^\/+/, "")) || "postgres";
}

function buildAdminConnectionString(connectionString) {
  const url = new URL(connectionString);
  url.pathname = "/postgres";
  return url.toString();
}

function assertSafeDatabaseName(databaseName) {
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(databaseName)) {
    throw new Error(`Nama database "${databaseName}" tidak aman untuk dibuat otomatis.`);
  }
}

export async function ensureDatabaseExists() {
  if (databaseEnsured) {
    return;
  }

  const targetDatabase = getDatabaseName(config.databaseUrl);
  const adminClient = new Client({
    connectionString: buildAdminConnectionString(config.databaseUrl),
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  });

  await adminClient.connect();

  try {
    const result = await adminClient.query("select 1 from pg_database where datname = $1", [targetDatabase]);

    if (!result.rowCount) {
      assertSafeDatabaseName(targetDatabase);
      await adminClient.query(`create database "${targetDatabase}"`);
    }

    databaseEnsured = true;
  } finally {
    await adminClient.end();
  }
}

export async function withTransaction(work) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
