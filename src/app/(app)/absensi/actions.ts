"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ATTENDANCE_STATUS } from "@/db/schema";
import { safeAction } from "@/lib/action";
import { getAllowedMenus, requireUser } from "@/lib/session";
import { BizError } from "@/lib/orders";
import { str, todayStr } from "@/lib/utils";

const { attendances: a, employees: e } = schema;

/** Staf hanya boleh mengabsen dirinya sendiri; pemilik / pemegang menu Karyawan boleh semua. */
async function guard(employeeId: string) {
  const user = await requireUser("absensi");
  const canAll = (await getAllowedMenus(user.role)).includes("karyawan");
  const emp = await db.query.employees.findFirst({ where: eq(e.id, employeeId) });
  if (!emp) throw new BizError("Karyawan tidak ditemukan.");
  if (!canAll && emp.userId !== user.id) throw new BizError("Anda hanya bisa mencatat absensi sendiri.");
  return emp;
}

export const checkInAction = safeAction(async (fd) => {
  const emp = await guard(String(fd.get("employeeId")));
  const date = todayStr();
  const ex = await db.query.attendances.findFirst({ where: and(eq(a.employeeId, emp.id), eq(a.date, date)) });
  if (ex?.checkIn) throw new BizError("Sudah check-in hari ini.");
  if (ex) await db.update(a).set({ checkIn: new Date(), status: "hadir" }).where(eq(a.id, ex.id));
  else await db.insert(a).values({ employeeId: emp.id, date, checkIn: new Date(), status: "hadir" });
  revalidatePath("/absensi");
  return { ok: `${emp.name} check-in.` };
});

export const checkOutAction = safeAction(async (fd) => {
  const emp = await guard(String(fd.get("employeeId")));
  const ex = await db.query.attendances.findFirst({ where: and(eq(a.employeeId, emp.id), eq(a.date, todayStr())) });
  if (!ex?.checkIn) throw new BizError("Belum check-in hari ini.");
  await db.update(a).set({ checkOut: new Date() }).where(eq(a.id, ex.id));
  revalidatePath("/absensi");
  return { ok: `${emp.name} check-out.` };
});

export const setAttendanceStatusAction = safeAction(async (fd) => {
  const emp = await guard(String(fd.get("employeeId")));
  const status = String(fd.get("status")) as (typeof ATTENDANCE_STATUS)[number];
  if (!ATTENDANCE_STATUS.includes(status)) throw new BizError("Status tidak dikenal.");
  const date = str(fd.get("date")) ?? todayStr();
  const note = str(fd.get("note"));
  const ex = await db.query.attendances.findFirst({ where: and(eq(a.employeeId, emp.id), eq(a.date, date)) });
  if (ex) await db.update(a).set({ status, note }).where(eq(a.id, ex.id));
  else await db.insert(a).values({ employeeId: emp.id, date, status, note });
  revalidatePath("/absensi");
  return { ok: "Status kehadiran disimpan." };
});
