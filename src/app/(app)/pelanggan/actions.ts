"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { FITTING_STATUS } from "@/db/schema";
import { safeAction } from "@/lib/action";
import { requireUser } from "@/lib/session";
import { BizError } from "@/lib/orders";
import { parseLocalDateTime, str, toNum } from "@/lib/utils";
import { readSizes } from "@/lib/measurements";
import { deleteUpload, saveUpload } from "@/lib/upload";

export const saveCustomerAction = safeAction(async (fd) => {
  await requireUser("pelanggan");
  const id = str(fd.get("id"));
  const name = str(fd.get("name"));
  if (!name) throw new BizError("Nama pelanggan wajib diisi.");
  const data = { name, phone: str(fd.get("phone")), address: str(fd.get("address")), eventType: str(fd.get("eventType")), campus: str(fd.get("campus")) };
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
  const v = readSizes(fd, toNum);
  if (Object.values(v).every((x) => x == null)) throw new BizError("Isi minimal satu ukuran.");
  await db.insert(schema.measurements).values({ customerId, orderId: str(fd.get("orderId")), notes: str(fd.get("notes")), ...v });
  revalidatePath(`/pelanggan/${customerId}`);
  return { ok: "Keterangan resize tersimpan." };
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

/** Hasil fitting: foto konsumen + ukuran badan, sekaligus tandai fitting selesai. */
export const saveFittingResultAction = safeAction(async (fd) => {
  await requireUser("fitting");
  const id = String(fd.get("id"));
  const fit = await db.query.fittingSchedules.findFirst({ where: eq(schema.fittingSchedules.id, id) });
  if (!fit) throw new BizError("Jadwal fitting tidak ditemukan.");
  const photoUrl = await saveUpload(fd.get("photo"), "fitting");
  const v = readSizes(fd, toNum);
  const notes = str(fd.get("notes"));
  if (!photoUrl && Object.values(v).every((x) => x == null) && !notes) throw new BizError("Unggah foto atau isi minimal satu ukuran.");
  await db.transaction(async (tx) => {
    if (Object.values(v).some((x) => x != null)) {
      await tx.insert(schema.measurements).values({ customerId: fit.customerId, orderId: fit.orderId, notes, ...v }).run();
    }
    await tx.update(schema.fittingSchedules)
      .set({ ...(photoUrl ? { photoUrl } : {}), ...(notes ? { notes } : {}), ...(fd.get("done") === "on" ? { status: "selesai" as const } : {}) })
      .where(eq(schema.fittingSchedules.id, id))
      .run();
  });
  if (photoUrl && fit.photoUrl) await deleteUpload(fit.photoUrl);
  revalidatePath("/", "layout");
  return { ok: "Hasil fitting tersimpan." };
});

export const setFittingStatusAction = safeAction(async (fd) => {
  await requireUser("fitting");
  const status = String(fd.get("status")) as (typeof FITTING_STATUS)[number];
  if (!FITTING_STATUS.includes(status)) throw new BizError("Status tidak dikenal.");
  await db.update(schema.fittingSchedules).set({ status }).where(eq(schema.fittingSchedules.id, String(fd.get("id"))));
  revalidatePath("/", "layout");
  return { ok: "Status fitting diperbarui." };
});
