import type { PaymentMethod } from "@/db/schema";

export type ImportRow =
  | { kind: "masuk"; date: string; amount: number; category: string; note: string | null; method: PaymentMethod }
  | { kind: "keluar"; date: string; amount: number; category: string; note: string | null };

export const TEMPLATE_HEADER = ["Tanggal", "Jenis", "Kategori", "Keterangan", "Nominal", "Metode"];

/** Pecah teks CSV (pemisah ; atau , atau tab, mendukung tanda kutip). */
function parseCsv(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts = [";", ",", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  const delim = counts.sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some(Boolean));
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12 };

/** Terima 2026-06-15, 15/06/2026, 15-6-26, atau "15 Jun 2026". */
export function parseDate(v: string): string | null {
  const s = v.trim().toLowerCase();
  let y: number, m: number, d: number;
  let r = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (r) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) [d, m, y] = [+r[1], +r[2], +r[3]];
  else if ((r = s.match(/^(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+(\d{2,4})$/)) && MONTHS[r[2]]) [d, m, y] = [+r[1], MONTHS[r[2]], +r[3]];
  else return null;
  if (y < 100) y += 2000;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/** "Rp 1.200.000" / "1200000" / "1.200.000,00" → 1200000 */
export function parseAmount(v: string) {
  const s = v.replace(/[,.]\d{2}$/, "").replace(/\D/g, "");
  return s ? Number(s) : 0;
}

function parseMethod(v: string): PaymentMethod {
  const s = v.toLowerCase();
  if (s.includes("qris")) return "qris";
  if (s.includes("transfer") || s.includes("tf") || s.includes("bank")) return "transfer";
  return "tunai";
}

/** Baca CSV laporan. Kembalikan baris valid dan daftar kesalahan per baris. */
export function parseFinanceCsv(text: string) {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  const out: ImportRow[] = [];
  const errors: string[] = [];
  if (rows.length === 0) return { rows: out, errors: ["File kosong."] };
  const head = rows[0].map((h) => h.toLowerCase());
  const col = (...names: string[]) => head.findIndex((h) => names.some((n) => h.startsWith(n)));
  let iDate = col("tanggal", "tgl", "date"), iKind = col("jenis", "tipe", "type"), iCat = col("kategori", "category"),
    iNote = col("keterangan", "catatan", "note", "uraian"), iAmt = col("nominal", "jumlah", "amount", "total"), iMet = col("metode", "method", "cara");
  let start = 1;
  if (iDate < 0 || iAmt < 0) {
    // Tanpa baris judul: anggap urutan sesuai template.
    [iDate, iKind, iCat, iNote, iAmt, iMet] = [0, 1, 2, 3, 4, 5];
    start = 0;
  }
  for (let n = start; n < rows.length; n++) {
    const r = rows[n];
    const line = n + 1;
    const date = parseDate(r[iDate] ?? "");
    const amount = parseAmount(r[iAmt] ?? "");
    const kindText = (r[iKind] ?? "").toLowerCase();
    const kind = /luar|biaya|expense|^out/.test(kindText) ? "keluar" : /masuk|income|pendapatan|^in$/.test(kindText) ? "masuk" : null;
    if (!date) { errors.push(`Baris ${line}: tanggal "${r[iDate] ?? ""}" tidak terbaca.`); continue; }
    if (amount <= 0) { errors.push(`Baris ${line}: nominal kosong.`); continue; }
    if (!kind) { errors.push(`Baris ${line}: jenis harus "Pemasukan" atau "Pengeluaran".`); continue; }
    const category = (iCat >= 0 && r[iCat]) || (kind === "masuk" ? "Sewa" : "Lain-lain");
    const note = (iNote >= 0 && r[iNote]) || null;
    out.push(kind === "masuk"
      ? { kind, date, amount, category, note, method: parseMethod(iMet >= 0 ? r[iMet] ?? "" : "") }
      : { kind, date, amount, category, note });
  }
  return { rows: out, errors };
}
