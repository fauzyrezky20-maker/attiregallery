"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { safeAction } from "@/lib/action";
import { requireUser } from "@/lib/session";
import { BizError } from "@/lib/orders";
import { fmtDate, fmtDateTime, parseLocalDateTime, rupiah, str, toInt, todayStr } from "@/lib/utils";
import { METHOD_LABEL } from "@/components/status-badge";
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
  const user = await requireUser("laporan");
  const id = String(fd.get("id"));
  const old = await db.query.expenses.findFirst({ where: eq(schema.expenses.id, id) });
  await db.delete(schema.expenses).where(eq(schema.expenses.id, id));
  if (old) await logEdit("pengeluaran", id, "hapus", user.name, `${fmtDate(old.date)} · ${old.category}${old.note ? ` · ${old.note}` : ""} · ${rupiah(old.amount)}`);
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
  const user = await requireUser("laporan");
  const id = String(fd.get("id"));
  const old = await db.query.incomes.findFirst({ where: eq(schema.incomes.id, id) });
  await db.delete(schema.incomes).where(eq(schema.incomes.id, id));
  if (old) await logEdit("pemasukan", id, "hapus", user.name, `${fmtDate(old.date)} · ${old.category}${old.note ? ` · ${old.note}` : ""} · ${rupiah(old.amount)} (${METHOD_LABEL[old.method]})`);
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

// ---------- Edit laporan (khusus pemilik) + jejak perubahan ----------

async function logEdit(kind: string, recordId: string, action: "ubah" | "hapus", userName: string | null | undefined, changes: string) {
  await db.insert(schema.financeEdits).values({ kind, recordId, action, userName: userName ?? null, changes });
}

async function requireOwner() {
  const user = await requireUser("laporan");
  if (user.role !== "pemilik") throw new BizError("Hanya pemilik yang boleh mengedit laporan.");
  return user;
}

/** Bandingkan nilai lama vs baru, kembalikan "Label: lama → baru" untuk yang berubah. */
function diff(pairs: [string, string, string][]) {
  return pairs.filter(([, a, b]) => a !== b).map(([l, a, b]) => `${l}: ${a || "-"} → ${b || "-"}`).join("; ");
}
const pctTxt = (n: number | null | undefined) => (n ? `${n.toLocaleString("id-ID")}%` : "");

function readEditAmount(fd: FormData) {
  const amount = toInt(fd.get("amount"));
  if (amount <= 0) throw new BizError("Isi nominal.");
  if (amount > MAX_AMOUNT) throw new BizError("Nominal maksimal Rp 100.000.000.");
  return amount;
}

export const editIncomeAction = safeAction(async (fd) => {
  const user = await requireOwner();
  const id = String(fd.get("id"));
  const old = await db.query.incomes.findFirst({ where: eq(schema.incomes.id, id) });
  if (!old) throw new BizError("Data pemasukan tidak ditemukan.");
  const date = parseDate(str(fd.get("date")) ?? "");
  if (!date) throw new BizError("Tanggal tidak valid.");
  const percent = readPercent(fd);
  const c = applyCut(readEditAmount(fd), percent);
  const m = String(fd.get("method"));
  const method = (METHODS as readonly string[]).includes(m) ? (m as (typeof METHODS)[number]) : old.method;
  const category = str(fd.get("category")) ?? old.category;
  const note = str(fd.get("note"));
  const changes = diff([
    ["Tanggal", fmtDate(old.date), fmtDate(date)],
    ["Jenis", old.category, category],
    ["Nama pelanggan", old.note ?? "", note ?? ""],
    ["Metode", METHOD_LABEL[old.method], METHOD_LABEL[method]],
    ["Harga", rupiah(old.grossAmount ?? old.amount), rupiah(c.gross ?? c.net)],
    ["Potongan", pctTxt(old.discountPct), pctTxt(percent)],
    ["Nominal", rupiah(old.amount), rupiah(c.net)],
  ]);
  if (!changes) return { ok: "Tidak ada yang berubah." };
  await db.update(schema.incomes).set({ date, category, note, method, amount: c.net, grossAmount: c.gross, discountPct: percent ?? 0 }).where(eq(schema.incomes.id, id));
  await logEdit("pemasukan", id, "ubah", user.name, changes);
  revalidatePath("/", "layout");
  return { ok: `Pemasukan diperbarui. ${changes}.` };
});

export const editExpenseAction = safeAction(async (fd) => {
  const user = await requireOwner();
  const id = String(fd.get("id"));
  const old = await db.query.expenses.findFirst({ where: eq(schema.expenses.id, id) });
  if (!old) throw new BizError("Data pengeluaran tidak ditemukan.");
  const date = parseDate(str(fd.get("date")) ?? "");
  if (!date) throw new BizError("Tanggal tidak valid.");
  const category = str(fd.get("category"));
  if (!category) throw new BizError("Isi jenis pengeluaran.");
  const percent = readPercent(fd);
  const c = applyCut(readEditAmount(fd), percent);
  const note = str(fd.get("note"));
  const changes = diff([
    ["Tanggal", fmtDate(old.date), fmtDate(date)],
    ["Jenis", old.category, category],
    ["Keterangan", old.note ?? "", note ?? ""],
    ["Harga", rupiah(old.grossAmount ?? old.amount), rupiah(c.gross ?? c.net)],
    ["Potongan", pctTxt(old.percent), pctTxt(percent)],
    ["Nominal", rupiah(old.amount), rupiah(c.net)],
  ]);
  if (!changes) return { ok: "Tidak ada yang berubah." };
  await db.update(schema.expenses).set({ date, category, note, percent, amount: c.net, grossAmount: c.gross }).where(eq(schema.expenses.id, id));
  await logEdit("pengeluaran", id, "ubah", user.name, changes);
  revalidatePath("/", "layout");
  return { ok: `Pengeluaran diperbarui. ${changes}.` };
});

/** Koreksi pembayaran dari kasir: hanya waktu, metode, dan nominal. Data sewa & stok tidak berubah. */
export const editPaymentAction = safeAction(async (fd) => {
  const user = await requireOwner();
  const id = String(fd.get("id"));
  const { payments, orders } = schema;
  const old = await db.query.payments.findFirst({ where: eq(payments.id, id) });
  if (!old) throw new BizError("Data pembayaran tidak ditemukan.");
  const at = str(fd.get("paidAt"));
  if (!at) throw new BizError("Isi tanggal & jam pembayaran.");
  const paidAt = parseLocalDateTime(at);
  if (Number.isNaN(paidAt.getTime())) throw new BizError("Tanggal & jam tidak valid.");
  const amount = readEditAmount(fd);
  const m = String(fd.get("method") ?? old.method);
  let method = old.method;
  if (old.method === "tabungan") {
    if (amount !== old.amount || (m && m !== "tabungan")) throw new BizError("Pembayaran dari saldo tabungan hanya bisa diubah tanggalnya, karena terhubung dengan saldo pelanggan.");
  } else {
    if (!(METHODS as readonly string[]).includes(m)) throw new BizError("Metode tidak dikenal.");
    method = m as (typeof METHODS)[number];
  }
  const order = await db.query.orders.findFirst({ where: eq(orders.id, old.orderId) });
  if (!order) throw new BizError("Pesanan tidak ditemukan.");
  const others = await db
    .select({ t: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.orderId, old.orderId), ne(payments.id, id), eq(payments.status, "lunas")))
    .get();
  if (Number(others?.t ?? 0) + amount > order.totalAmount) {
    throw new BizError(`Total pembayaran pesanan ini jadi melebihi tagihan ${rupiah(order.totalAmount)}.`);
  }
  const changes = diff([
    ["Waktu", old.paidAt ? fmtDateTime(old.paidAt) : "", fmtDateTime(paidAt)],
    ["Metode", METHOD_LABEL[old.method], METHOD_LABEL[method]],
    ["Nominal", rupiah(old.amount), rupiah(amount)],
  ]);
  if (!changes) return { ok: "Tidak ada yang berubah." };
  await db.update(payments).set({ paidAt, method, amount }).where(eq(payments.id, id));
  await logEdit("pembayaran", id, "ubah", user.name, `Pesanan #${old.orderId.slice(0, 8)} · ${changes}`);
  revalidatePath("/", "layout");
  return { ok: `Pembayaran diperbarui. ${changes}.` };
});
