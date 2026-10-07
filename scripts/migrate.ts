/** Jalankan migrasi database (lokal maupun Turso). Dipanggil otomatis sebelum dev/build/start. */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const url = process.env.TURSO_DATABASE_URL ?? `file:${process.env.DATABASE_PATH ?? "./data/attiregallery.db"}`;
if (url.startsWith("file:")) fs.mkdirSync(path.dirname(url.slice(5)), { recursive: true });

async function main() {
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log(`✅ Database siap (${url.startsWith("file:") ? "lokal" : "Turso"})`);
  client.close();
}

main().catch((e) => {
  console.error("❌ Gagal menyiapkan database:", e);
  process.exit(1);
});
