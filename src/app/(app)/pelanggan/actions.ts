"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { FITTING_STATUS } from "@/db/schema";
import { safeAction } from "@/lib/action";
import { requireUser } from "@/lib/session";
import { BizError, topUpDeposit, spendDeposit } from "@/lib/orders";
import { parseLocalDateTime, str, toInt, toNum } from "@/lib/utils";

export const saveCustomerAction = safeAction(async (fd) => {
  await requireUser("pelanggan");
  const id = str(fd.get("id"));
  const name = str(fd.get("name"));
  if (!name) throw new BizError("Nama pelanggan wajib diisi.");
  const data = { name, phone: str(fd.get("phone")), address: str(fd.get("address")) };
  if (id) {
    await db.update(schema.customers).set(data).where(eq(schema.customers.id, id));
    revalidatePath("/pelanggan");
    return { ok: "Data pelanggan diperbarui." };
  }
  const c = await db.insert(schema.customers).values(data).returning().get();
  redirect(`/pelanggan/${c.id}`);
});

export const addMeasurementAction = safeAction(async (fd) => {
  await requireUser("pelanggan");
  const customerId = String(fd.get("customerId"));
  const v = {
    chest: toNum(fd.get("chest")), waist: toNum(fd.get("waist")), hip: toNum(fd.get("hip")),
    shoulder: toNum(fd.get("shoulder")), sleeve: toNum(fd.get("sleeve")), length: toNum(fd.get("length")),
  };
  if (Object.values(v).every((x) => x == null)) throw new BizError("Isi minimal satu ukuran.");
  await db.insert(schema.measurements).values({ customerId, orderId: str(fd.get("orderId")), notes: str(fd.get("notes")), ...v });
  revalidatePath(`/pelanggan/${customerId}`);
  return { ok: "Ukuran tersimpan." };
});

export const saveFittingAction = safeAction(async (fd) => {
  await requireUser("fitting");
  const customerId = str(fd.get("customerId"));
  const at = str(fd.get("scheduledAt"));
  if (!customerId || !at) throw new BizError("Pilih pelanggan dan tanggal/jam fitting.");
  await db.insert(schema.fittingSchedules).values({
    customerId,
    orderId: str(fd.get("orderId")),
    scheduledAt: parseLocalDateTime(at),
    notes: str(fd.get("notes")),
  });
  revalidatePath("/", "layout");
  return { ok: "Jadwal fitting tersimpan." };
});

export const setFittingStatusAction = safeAction(async (fd) => {
  await requireUser("fitting");
  const status = String(fd.get("status")) as (typeof FITTING_STATUS)[number];
  if (!FITTING_STATUS.includes(status)) throw new BizError("Status tidak dikenal.");
  await db.update(schema.fittingSchedules).set({ status }).where(eq(schema.fittingSchedules.id, String(fd.get("id"))));
  revalidatePath("/", "layout");
  return { ok: "Status fitting diperbarui." };
});

export const depositAction = safeAction(async (fd) => {
  await requireUser("tabungan");
  const customerId = String(fd.get("customerId"));
  const type = String(fd.get("type"));
  const amount = toInt(fd.get("amount"));
  const note = str(fd.get("note"));
  await db.transaction(async (tx) => {
    if (type === "pakai") {
      if (amount <= 0) throw new BizError("Nominal harus lebih dari 0.");
      await spendDeposit(tx, customerId, amount, null, note ?? "Penarikan / pemakaian saldo");
    } else await topUpDeposit(tx, customerId, amount, note);
  });
  revalidatePath("/", "layout");
  return { ok: type === "pakai" ? "Pemakaian saldo dicatat." : "Setoran tabungan dicatat." };
});
