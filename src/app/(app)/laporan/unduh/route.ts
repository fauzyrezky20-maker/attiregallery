import { requireUser } from "@/lib/session";
import { financeReport } from "@/lib/reports";
import { getSettings } from "@/lib/settings";
import { readPeriod } from "../params";

const METHOD: Record<string, string> = { tunai: "Tunai", qris: "QRIS", transfer: "Transfer", tabungan: "Saldo tabungan" };

function csv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((r) => r.map((v) => {
      const s = v == null ? "" : String(v);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(";"))
    .join("\r\n");
}

/** Unduh laporan sebagai CSV (pemisah titik koma, terbaca langsung oleh Excel lokal Indonesia). */
export async function GET(req: Request) {
  await requireUser("laporan");
  const url = new URL(req.url);
  const { from, to } = readPeriod({ dari: url.searchParams.get("dari") ?? undefined, sampai: url.searchParams.get("sampai") ?? undefined });
  const [r, s] = await Promise.all([financeReport(from, to), getSettings()]);
  const ts = (d: Date | null) => (d ? new Date(d.getTime() + 7 * 3600_000).toISOString().replace("T", " ").slice(0, 16) : "");
  const rows: (string | number | null)[][] = [
    [`Laporan Keuangan ${s.storeName}`], [`Periode`, from, to], [],
    ["RINGKASAN"], ["Pemasukan", r.income], ["Pengeluaran", r.expense], ["Laba/Rugi", r.profit], [],
    ["PEMASUKAN PER METODE"], ["Metode", "Jumlah transaksi", "Total"],
    ...r.incomeByMethod.map((m) => [METHOD[m.method] ?? m.method, m.count, m.total]), [],
    ["LABA RUGI PER HARI"], ["Tanggal", "Pemasukan", "Pengeluaran", "Laba/Rugi"],
    ...r.daily.map((d) => [d.day, d.income, d.expense, d.profit]), [],
    ["RIWAYAT PENJUALAN"], ["Waktu", "No. pesanan", "Pelanggan", "Metode", "Nominal"],
    ...r.sales.map((x) => [ts(x.paidAt), x.orderId.slice(0, 8), x.customer, METHOD[x.method] ?? x.method, x.amount]), [],
    ["PENGELUARAN"], ["Tanggal", "Jenis", "Keterangan", "Nominal"],
    ...r.expenseRows.map((e) => [e.date, e.category, e.note, e.amount]),
  ];
  return new Response("﻿" + csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-${from}_${to}.csv"`,
    },
  });
}
