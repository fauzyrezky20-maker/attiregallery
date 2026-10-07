import "server-only";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Role } from "@/db/schema";

/** Buat akun login (users + accounts credential) — dipakai halaman setup & menu Karyawan. */
export async function createLoginUser(input: { name: string; email: string; password: string; role: Role }) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) throw new Error("Email sudah dipakai akun lain.");
  if (input.password.length < 6) throw new Error("Kata sandi minimal 6 karakter.");
  const hash = await hashPassword(input.password);
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(schema.users).values({ id, name: input.name, email, role: input.role, emailVerified: true }).run();
    await tx.insert(schema.accounts).values({ accountId: id, providerId: "credential", userId: id, password: hash }).run();
  });
  return id;
}

export async function setUserPassword(userId: string, password: string) {
  if (password.length < 6) throw new Error("Kata sandi minimal 6 karakter.");
  const hash = await hashPassword(password);
  await db
    .update(schema.accounts)
    .set({ password: hash })
    .where(eq(schema.accounts.userId, userId));
}

export async function hasAnyUser() {
  const u = await db.query.users.findFirst({ columns: { id: true } });
  return !!u;
}
