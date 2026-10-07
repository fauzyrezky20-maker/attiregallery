"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { ROLES, type Role } from "@/db/schema";
import { safeAction } from "@/lib/action";
import { requireUser } from "@/lib/session";
import { BizError } from "@/lib/orders";
import { createLoginUser, setUserPassword } from "@/lib/users";
import { str } from "@/lib/utils";

async function requireOwner() {
  const u = await requireUser("karyawan");
  if (u.role !== "pemilik") throw new BizError("Hanya pemilik yang boleh mengatur akun login dan peran.");
  return u;
}

export const saveEmployeeAction = safeAction(async (fd) => {
  await requireUser("karyawan");
  const id = str(fd.get("id"));
  const name = str(fd.get("name"));
  if (!name) throw new BizError("Nama karyawan wajib diisi.");
  const data = {
    name,
    position: str(fd.get("position")),
    phone: str(fd.get("phone")),
    status: (fd.get("status") === "tidak aktif" ? "tidak aktif" : "aktif") as "aktif" | "tidak aktif",
  };
  if (id) {
    await db.update(schema.employees).set(data).where(eq(schema.employees.id, id));
    const emp = await db.query.employees.findFirst({ where: eq(schema.employees.id, id) });
    if (emp?.userId) {
      await db.update(schema.users).set({ name }).where(eq(schema.users.id, emp.userId));
      if (data.status === "tidak aktif") await db.delete(schema.sessions).where(eq(schema.sessions.userId, emp.userId));
    }
    revalidatePath("/karyawan");
    return { ok: "Data karyawan diperbarui." };
  }
  const e = await db.insert(schema.employees).values(data).returning().get();
  redirect(`/karyawan/${e.id}`);
});

export const createAccountAction = safeAction(async (fd) => {
  await requireOwner();
  const emp = await db.query.employees.findFirst({ where: eq(schema.employees.id, String(fd.get("employeeId"))) });
  if (!emp) throw new BizError("Karyawan tidak ditemukan.");
  if (emp.userId) throw new BizError("Karyawan ini sudah punya akun login.");
  const role = String(fd.get("role")) as Role;
  if (!ROLES.includes(role)) throw new BizError("Peran tidak dikenal.");
  const userId = await createLoginUser({ name: emp.name, email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? ""), role });
  await db.update(schema.employees).set({ userId }).where(eq(schema.employees.id, emp.id));
  revalidatePath("/karyawan");
  return { ok: "Akun login dibuat. Bagikan email & kata sandi ke karyawan." };
});

export const updateAccountAction = safeAction(async (fd) => {
  const me = await requireOwner();
  const userId = String(fd.get("userId"));
  const role = String(fd.get("role")) as Role;
  if (!ROLES.includes(role)) throw new BizError("Peran tidak dikenal.");
  if (userId === me.id && role !== "pemilik") throw new BizError("Anda tidak bisa menurunkan peran akun Anda sendiri.");
  if (role !== "pemilik") {
    const owners = await db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.role, "pemilik"), ne(schema.users.id, userId)));
    if (owners.length === 0) throw new BizError("Harus ada minimal satu pemilik.");
  }
  await db.update(schema.users).set({ role }).where(eq(schema.users.id, userId));
  const pw = str(fd.get("password"));
  if (pw) await setUserPassword(userId, pw);
  // Akun karyawan nonaktif tidak bisa login: hapus sesi aktifnya.
  if (fd.get("revoke") === "on") await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  revalidatePath("/karyawan");
  return { ok: pw ? "Peran & kata sandi diperbarui." : "Peran diperbarui." };
});
