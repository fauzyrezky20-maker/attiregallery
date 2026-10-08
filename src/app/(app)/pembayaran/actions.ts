"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { safeAction } from "@/lib/action";
import { requireUser } from "@/lib/session";
import { saveUpload } from "@/lib/upload";
import { BizError } from "@/lib/orders";

export const confirmPaymentAction = safeAction(async (fd) => {
  await requireUser("pembayaran");
  const id = String(fd.get("paymentId"));
  const proofUrl = await saveUpload(fd.get("proof"), "bukti");
  const res = await db
    .update(schema.payments)
    .set({ status: "lunas", paidAt: new Date(), ...(proofUrl ? { proofUrl } : {}) })
    .where(and(eq(schema.payments.id, id), eq(schema.payments.status, "pending")))
    .run();
  if (res.rowsAffected === 0) throw new BizError("Pembayaran sudah diproses sebelumnya.");
  revalidatePath("/", "layout");
  return { ok: "Dana diterima, pembayaran tercatat." };
});

export const rejectPaymentAction = safeAction(async (fd) => {
  await requireUser("pembayaran");
  await db.update(schema.payments)
    .set({ status: "gagal" })
    .where(and(eq(schema.payments.id, String(fd.get("paymentId"))), eq(schema.payments.status, "pending")))
    .run();
  revalidatePath("/", "layout");
  return { ok: "Pembayaran ditandai gagal." };
});

export const uploadProofAction = safeAction(async (fd) => {
  await requireUser("pembayaran");
  const proofUrl = await saveUpload(fd.get("proof"), "bukti");
  if (!proofUrl) throw new BizError("Pilih file bukti pembayaran.");
  await db.update(schema.payments).set({ proofUrl }).where(eq(schema.payments.id, String(fd.get("paymentId"))));
  revalidatePath("/", "layout");
  return { ok: "Bukti pembayaran tersimpan." };
});
