import { PrintButton } from "@/components/print-button";
import { requireUser } from "@/lib/session";
import { financeReport } from "@/lib/reports";
import { getSettings } from "@/lib/settings";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { readPeriod, type ReportSearch } from "../params";
import { ExpenseByCategory, ExpenseTable, IncomeByMethod, ManualIncomeTable, SalesTable, SectionTitle, Summary } from "../report-view";

export default async function CetakLaporan({ searchParams }: { searchParams: Promise<ReportSearch> }) {
  await requireUser("laporan");
  const { from, to } = readPeriod(await searchParams);
  const [r, s] = await Promise.all([financeReport(from, to), getSettings()]);
  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <div className="no-print flex justify-end"><PrintButton label="Cetak / simpan PDF" /></div>
      <div>
        <h1 className="text-xl font-semibold">Laporan Keuangan {s.storeName}</h1>
        <p className="text-sm text-muted-foreground">Periode {fmtDate(from)} – {fmtDate(to)} · dicetak {fmtDateTime(new Date())}</p>
      </div>
      <Summary r={r} />
      <SectionTitle>Pemasukan</SectionTitle>
      <IncomeByMethod r={r} />
      <SalesTable r={r} links={false} />
      <ManualIncomeTable r={r} />
      <SectionTitle>Pengeluaran</SectionTitle>
      <ExpenseByCategory r={r} />
      <ExpenseTable r={r} />
    </div>
  );
}
