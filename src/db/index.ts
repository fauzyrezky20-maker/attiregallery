import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "attiregallery.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const globalForDb = globalThis as unknown as { sqlite?: Database.Database; migrated?: boolean };
const sqlite = globalForDb.sqlite ?? new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");
globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });

// Jalankan migrasi otomatis saat aplikasi pertama kali terhubung ke database.
if (!globalForDb.migrated) {
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  globalForDb.migrated = true;
}
export type DB = typeof db;
export { schema };
