import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { requireUser } from "@/lib/session";
import { financeReport } from "@/lib/reports";
import { getSettings } from "@/lib/settings";
import { fmtDate, pct, rupiah } from "@/lib/utils";
import { readPeriod } from "../params";

const METHOD: Record<string, string> = { tunai: "Tunai", qris: "QRIS", transfer: "Transfer", tabungan: "Saldo tabungan" };

/** Unduh laporan keuangan sebagai PDF: pemasukan dan pengeluaran dipisah. */
export async function GET(req: Request) {
  await requireUser("laporan");
  const url = new URL(req.url);
  const { from, to } = readPeriod({ dari: url.searchParams.get("dari") ?? undefined, sampai: url.searchParams.get("sampai") ?? undefined });
  const [r, s] = await Promise.all([financeReport(from, to), getSettings()]);
  const ts = (d: Date | null) => (d ? new Date(d.getTime() + 7 * 3600_000).toISOString().replace("T", " ").slice(0, 16) : "");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const head = { fillColor: [60, 60, 60] as [number, number, number] };
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  doc.setFontSize(15).text(`Laporan Keuangan ${s.storeName}`, 14, 16);
  doc.setFontSize(10).text(`Periode ${fmtDate(from)} s.d. ${fmtDate(to)}`, 14, 22);

  const section = (title: string, total: number, y: number) => {
    doc.setFontSize(13).text(title, 14, y);
    doc.setFontSize(10).text(`Total: ${rupiah(total)}`, 196, y, { align: "right" });
    return y + 3;
  };

  let y = section("PEMASUKAN", r.income, 32);
  autoTable(doc, {
    startY: y, headStyles: head, head: [["Metode", "Transaksi", "Total", "Porsi"]],
    body: r.incomeByMethod.length ? r.incomeByMethod.map((m) => [METHOD[m.method] ?? m.method, String(m.count), rupiah(m.total), pct(m.total, r.income)]) : [["Belum ada pemasukan", "", "", ""]],
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });
  if (r.sales.length) {
  autoTable(doc, {
      startY: lastY() + 4, headStyles: head, footStyles: head, head: [["Waktu", "Pesanan", "Pelanggan", "Jenis", "Metode", "Nominal", "Porsi"]],
      body: r.sales.map((x) => [ts(x.paidAt), `#${x.orderId.slice(0, 8)}`, x.customer, `${x.category ?? "Sewa"}${x.items ? `\n${x.items}` : ""}`, METHOD[x.method] ?? x.method, rupiah(x.amount), pct(x.amount, r.income)]),
      foot: [["", "", "", "", "Subtotal", rupiah(r.salesTotal), pct(r.salesTotal, r.income)]],
      columnStyles: { 5: { halign: "right" }, 6: { halign: "right" } },
    });
  }
  if (r.manualRows.length) {
    autoTable(doc, {
      startY: lastY() + 4, headStyles: head, footStyles: head, head: [["Tanggal", "Jenis", "Nama pelanggan", "Metode", "Harga", "Potongan", "Nominal", "Porsi"]],
      body: r.manualRows.map((x) => [fmtDate(x.date), x.category, x.note ?? "", METHOD[x.method] ?? x.method, rupiah(x.grossAmount ?? x.amount), x.discountPct ? `${x.discountPct.toLocaleString("id-ID")}%` : "-", rupiah(x.amount), pct(x.amount, r.income)]),
      foot: [["", "", "", "", "", "Subtotal", rupiah(r.manualTotal), pct(r.manualTotal, r.income)]],
      columnStyles: { 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
    });
  }

  y = lastY() + 12;
  if (y > 260) { doc.addPage(); y = 16; }
  y = section("PENGELUARAN", r.expense, y);
  autoTable(doc, {
    startY: y, headStyles: head, head: [["Jenis", "Total", "Porsi"]],
    body: r.expenseByCategory.length ? r.expenseByCategory.map(([c, t]) => [c, rupiah(t), pct(t, r.expense)]) : [["Belum ada pengeluaran", "", ""]],
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
  });
  autoTable(doc, {
    startY: lastY() + 4, headStyles: head, footStyles: head, head: [["Tanggal", "Jenis", "Keterangan", "Harga", "Potongan", "Nominal", "Porsi"]],
    body: r.expenseRows.map((e) => [fmtDate(e.date), e.category, e.note ?? "", rupiah(e.grossAmount ?? e.amount), e.percent ? `${e.percent.toLocaleString("id-ID")}%` : "-", rupiah(e.amount), pct(e.amount, r.expense)]),
    foot: [["", "", "", "", "Total", rupiah(r.expense), "100%"]],
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
  });

  const buf = Buffer.from(doc.output("arraybuffer"));
  return new Response(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laporan-${from}_${to}.pdf"`,
    },
  });
}
