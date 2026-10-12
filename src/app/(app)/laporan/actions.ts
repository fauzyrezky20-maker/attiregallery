"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { safeAction } from "@/lib/action";
import { requireUser } from "@/lib/session";
import { BizError } from "@/lib/orders";
import { fmtDate, rupiah, str, toInt, todayStr } from "@/lib/utils";
import { parseDate, parseFinanceCsv } from "@/lib/finance-import";

const MAX_AMOUNT = 100_000_000;

/** Isian "Persen (%)": kosong = tidak diisi. */
function readPercent(fd: FormData) {
  const raw = String(fd.get("percent") ?? "").replace("%", "").replace(",", ".").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new BizError("Persen harus antara 0 dan 100.");
  return n;
}

/** Terapkan potongan harga: kembalikan nominal setelah potongan + harga awal (bila ada potongan). */
function applyCut(amount: number, percent: number | null) {
  if (!percent) return { net: amount, gross: null as number | null, pctText: "" };
  const net = Math.round(amount * (1 - percent / 100));
  return { net, gross: amount, pctText: ` (harga ${rupiah(amount)}, potongan ${percent.toLocaleString("id-ID")}%)` };
}

export const addExpenseAction = safeAction(async (fd) => {
  await requireUser("laporan");
  const category = str(fd.get("category"));
  const amount = toInt(fd.get("amount"));
  if (!category || amount <= 0) throw new BizError("Isi jenis dan nominal pengeluaran.");
  if (amount > MAX_AMOUNT) throw new BizError("Nominal maksimal Rp 100.000.000.");
  const percent = readPercent(fd);
  const c = applyCut(amount, percent);
  await db.insert(schema.expenses).values({ category, amount: c.net, grossAmount: c.gross, percent, note: str(fd.get("note")), date: str(fd.get("date")) ?? todayStr() });
  revalidatePath("/", "layout");
  return { ok: `Pengeluaran ${rupiah(c.net)}${c.pctText} dicatat untuk ${fmtDate(str(fd.get("date")) ?? todayStr())}.` };
});

export const deleteExpenseAction = safeAction(async (fd) => {
  await requireUser("laporan");
  await db.delete(schema.expenses).where(eq(schema.expenses.id, String(fd.get("id"))));
  revalidatePath("/", "layout");
  return { ok: "Pengeluaran dihapus." };
});

const METHODS = ["tunai", "qris", "transfer"] as const;

export const addIncomeAction = safeAction(async (fd) => {
  await requireUser("laporan");
  const amount = toInt(fd.get("amount"));
  const date = parseDate(str(fd.get("date")) ?? "") ?? todayStr();
  const m = String(fd.get("method"));
  const method = (METHODS as readonly string[]).includes(m) ? (m as (typeof METHODS)[number]) : "tunai";
  if (amount <= 0) throw new BizError("Isi nominal pemasukan.");
  if (amount > MAX_AMOUNT) throw new BizError("Nominal maksimal Rp 100.000.000.");
  const percent = readPercent(fd);
  const c = applyCut(amount, percent);
  await db.insert(schema.incomes).values({
    date, amount: c.net, grossAmount: c.gross, discountPct: percent ?? 0, method,
    category: str(fd.get("category")) ?? "Sewa", note: str(fd.get("note")),
  });
  revalidatePath("/", "layout");
  return { ok: `Pemasukan ${rupiah(c.net)}${c.pctText} dicatat untuk ${fmtDate(date)}.` };
});

export const deleteIncomeAction = safeAction(async (fd) => {
  await requireUser("laporan");
  await db.delete(schema.incomes).where(eq(schema.incomes.id, String(fd.get("id"))));
  revalidatePath("/", "layout");
  return { ok: "Pemasukan dihapus." };
});

export const importFinanceAction = safeAction(async (fd) => {
  await requireUser("laporan");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) throw new BizError("Pilih file CSV dulu.");
  if (file.size > 2_000_000) throw new BizError("File terlalu besar (maks. 2 MB).");
  if (/\.xlsx?$/i.test(file.name)) throw new BizError("File Excel perlu disimpan sebagai CSV dulu: di Excel pilih File → Save As → CSV.");
  const { rows, errors } = parseFinanceCsv(await file.text());
  if (rows.length === 0) throw new BizError(errors.slice(0, 5).join(" ") || "Tidak ada baris yang bisa dibaca.");
  // Lewati baris yang sama persis dengan data yang sudah ada, supaya impor ulang tidak dobel.
  const key = (d: string, a: number, n: string | null) => `${d}|${a}|${n ?? ""}`;
  const [exIn, exOut] = await Promise.all([
    db.select({ d: schema.incomes.date, a: schema.incomes.amount, n: schema.incomes.note }).from(schema.incomes),
    db.select({ d: schema.expenses.date, a: schema.expenses.amount, n: schema.expenses.note }).from(schema.expenses),
  ]);
  const seenIn = new Set(exIn.map((x) => key(x.d, x.a, x.n)));
  const seenOut = new Set(exOut.map((x) => key(x.d, x.a, x.n)));
  let nIn = 0, nOut = 0, skipped = 0;
  await db.transaction(async (tx) => {
    for (const r of rows) {
      const k = key(r.date, r.amount, r.note);
      if (r.kind === "masuk") {
        if (seenIn.has(k)) { skipped++; continue; }
        seenIn.add(k);
        await tx.insert(schema.incomes).values({
          date: r.date, amount: applyCut(r.amount, r.percent).net, grossAmount: applyCut(r.amount, r.percent).gross, discountPct: r.percent ?? 0, method: r.method, category: r.category, note: r.note,
        }).run();
        nIn++;
      } else {
        if (seenOut.has(k)) { skipped++; continue; }
        seenOut.add(k);
        await tx.insert(schema.expenses).values({ date: r.date, amount: applyCut(r.amount, r.percent).net, grossAmount: applyCut(r.amount, r.percent).gross, category: r.category, note: r.note, percent: r.percent }).run();
        nOut++;
      }
    }
  });
  revalidatePath("/", "layout");
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const months = [...new Set(rows.map((r) => r.date.slice(0, 7)))].sort().map((m) => `${BLN[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`);
  const extra = [months.length ? `Data masuk ke bulan: ${months.join(", ")}` : "", skipped ? `${skipped} baris dilewati karena sudah ada` : "", errors.length ? `${errors.length} baris gagal: ${errors.slice(0, 3).join(" ")}` : ""].filter(Boolean).join(". ");
  return { ok: `Impor selesai: ${nIn} pemasukan dan ${nOut} pengeluaran ditambahkan.${extra ? " " + extra.replace(/\.$/, "") + "." : ""}` };
});
