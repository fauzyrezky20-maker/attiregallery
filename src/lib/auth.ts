import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const auth = betterAuth({
  appName: "AttireGallery",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Akun dibuat oleh pemilik (menu Karyawan) atau lewat halaman /setup, bukan daftar mandiri.
    disableSignUp: true,
    minPasswordLength: 6,
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "staf", input: false },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 30 },
  advanced: { database: { generateId: "uuid" } },
  databaseHooks: {
    session: {
      create: {
        // Karyawan berstatus "tidak aktif" tidak bisa login.
        before: async (session) => {
          const inactive = await db.query.employees.findFirst({
            where: and(eq(schema.employees.userId, session.userId), eq(schema.employees.status, "tidak aktif")),
          });
          if (inactive) return false;
        },
      },
    },
  },
  plugins: [nextCookies()],
});
