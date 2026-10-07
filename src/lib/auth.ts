import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

// Mode komputer toko: aplikasi dibuka lewat beberapa alamat (localhost, IP Wi-Fi toko, tautan tunnel),
// jadi alamat dasar dibaca dari tiap permintaan. Isi AUTH_ALLOWED_HOSTS (dipisah koma, boleh pakai *).
const allowedHosts = process.env.AUTH_ALLOWED_HOSTS?.split(",").map((h) => h.trim()).filter(Boolean);

// Di Vercel, alamat produksi tersedia otomatis sehingga BETTER_AUTH_URL tidak wajib diisi.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined;

export const auth = betterAuth({
  appName: "AttireGallery",
  baseURL: process.env.BETTER_AUTH_URL ?? vercelUrl,
  ...(allowedHosts?.length
    ? {
        baseURL: { allowedHosts, fallback: process.env.BETTER_AUTH_URL ?? "http://localhost:3000" },
        trustedOrigins: (request?: Request) => {
          const host = request?.headers.get("host");
          if (!host) return [];
          return [`http://${host}`, `https://${host}`];
        },
      }
    : {}),
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
  advanced: {
    database: { generateId: "uuid" },
    // Di jaringan Wi-Fi toko aplikasi dibuka lewat http://IP-komputer, jadi cookie tidak boleh berlabel Secure.
    ...(process.env.LOCAL_NETWORK_MODE === "1" ? { useSecureCookies: false } : {}),
  },
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
