import { requireUser } from "@/lib/session";
import { TEMPLATE_HEADER } from "@/lib/finance-import";

/** Contoh file CSV untuk impor pemasukan & pengeluaran lama. */
export async function GET() {
  await requireUser("laporan");
  const rows = [
    TEMPLATE_HEADER,
    ["2026-06-01", "Pemasukan", "Sewa Amara", "Rina", "400000", "Transfer", "10"],
    ["2026-06-01", "Pemasukan", "DP", "Dita", "200000", "Tunai", ""],
    ["2026-06-02", "Pengeluaran", "Laundry & perawatan", "Dry clean 3 kebaya", "90000", "", "5"],
    ["2026-06-05", "Pengeluaran", "Promosi", "Iklan Instagram", "150000", "", ""],
  ];
  return new Response("﻿" + rows.map((r) => r.join(";")).join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="contoh-impor-keuangan.csv"' },
  });
}
