"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { safeAction } from "@/lib/action";
import { requireUser } from "@/lib/session";
import { BizError } from "@/lib/orders";
import { str, toInt, todayStr } from "@/lib/utils";

export const addExpenseAction = safeAction(async (fd) => {
  await requireUser("laporan");
  const category = str(fd.get("category"));
  const amount = toInt(fd.get("amount"));
  if (!category || amount <= 0) throw new BizError("Isi jenis dan nominal pengeluaran.");
  await db.insert(schema.expenses).values({ category, amount, note: str(fd.get("note")), date: str(fd.get("date")) ?? todayStr() });
  revalidatePath("/", "layout");
  return { ok: "Pengeluaran dicatat." };
});

export const deleteExpenseAction = safeAction(async (fd) => {
  await requireUser("laporan");
  await db.delete(schema.expenses).where(eq(schema.expenses.id, String(fd.get("id"))));
  revalidatePath("/", "layout");
  return { ok: "Pengeluaran dihapus." };
});
