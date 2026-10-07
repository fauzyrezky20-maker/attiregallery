import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Database memakai libSQL:
 * - Lokal  : file SQLite biasa (default ./data/attiregallery.db)
 * - Vercel : Turso, isi TURSO_DATABASE_URL (libsql://...) dan TURSO_AUTH_TOKEN
 */
export const dbUrl =
  process.env.TURSO_DATABASE_URL ?? `file:${process.env.DATABASE_PATH ?? "./data/attiregallery.db"}`;

const globalForDb = globalThis as unknown as { libsql?: ReturnType<typeof createClient> };
const client =
  globalForDb.libsql ??
  createClient({ url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN });
globalForDb.libsql = client;

export const db = drizzle(client, { schema });
export type DB = typeof db;
export { schema };
