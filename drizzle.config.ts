import { defineConfig } from "drizzle-kit";

const turso = process.env.TURSO_DATABASE_URL;

export default defineConfig(
  turso
    ? { schema: "./src/db/schema.ts", out: "./drizzle", dialect: "turso", dbCredentials: { url: turso, authToken: process.env.TURSO_AUTH_TOKEN } }
    : { schema: "./src/db/schema.ts", out: "./drizzle", dialect: "sqlite", dbCredentials: { url: process.env.DATABASE_PATH ?? "./data/attiregallery.db" } },
);
