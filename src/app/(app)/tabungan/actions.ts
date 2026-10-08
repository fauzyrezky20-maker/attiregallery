"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { safeAction } from "@/lib/action";
import { requireUser } from "@/lib/session";
import { BizError } from "@/lib/orders";
import { deleteUpload, saveUpload } from "@/lib/upload";
import { str, toInt, todayStr } from "@/lib/utils";

export const addSavingAction = safeAction(async (fd) => {
  const user = await requireUser("tabungan");
  const amount = toInt(fd.get("amount"));
  if (amount <= 0) throw new BizError("Isi nominal setoran.");
  const proofUrl = await saveUpload(fd.get("proof"), "tabungan");
  await db.insert(schema.storeSavings).values({
    date: str(fd.get("date")) ?? todayStr(),
    amount,
    account: str(fd.get("account")),
    note: str(fd.get("note")),
    proofUrl,
    userId: user.id,
  });
  revalidatePath("/tabungan");
  return { ok: "Setoran tabungan toko dicatat." };
});

export const deleteSavingAction = safeAction(async (fd) => {
  await requireUser("tabungan");
  const id = String(fd.get("id"));
  const row = await db.query.storeSavings.findFirst({ where: eq(schema.storeSavings.id, id) });
  await db.delete(schema.storeSavings).where(eq(schema.storeSavings.id, id));
  if (row?.proofUrl) await deleteUpload(row.proofUrl);
  revalidatePath("/tabungan");
  return { ok: "Setoran dihapus." };
});
