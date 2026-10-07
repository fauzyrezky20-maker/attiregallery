import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Empty, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireUser } from "@/lib/session";
import { financeReport } from "@/lib/reports";
import { fmtDate, rupiah, todayStr } from "@/lib/utils";
import { addExpenseAction, deleteExpenseAction } from "./actions";
import { PeriodForm } from "./period-form";
import { readPeriod, type ReportSearch } from "./params";
import { Breakdown, DailyTable, SalesTable, Summary } from "./report-view";

const EXPENSE_CATS = ["Laundry & perawatan", "Gaji karyawan", "Sewa tempat", "Listrik & air", "Pembelian kebaya", "Perbaikan/jahit", "Promosi", "Lain-lain"];

export default async function LaporanPage({ searchParams }: { searchParams: Promise<ReportSearch> }) {
  await requireUser("laporan");
  const { period, from, to } = readPeriod(await searchParams);
  const r = await financeReport(from, to);
  const qs = `dari=${from}&sampai=${to}`;

  return (
    <>
      <PageHeader
        title="Laporan Keuangan"
        description={`${fmtDate(from)} – ${fmtDate(to)}`}
        actions={
          <>
            <Button asChild variant="outline"><a href={`/laporan/unduh?${qs}`}><Download /> Unduh Excel (CSV)</a></Button>
            <Button asChild variant="outline"><Link href={`/laporan/cetak?${qs}`}><Printer /> Cetak / PDF</Link></Button>
          </>
        }
      />
      <PeriodForm period={period} from={from} to={to} />
      <div className="grid gap-6">
        <Summary r={r} />
        <Breakdown r={r} />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Card>
            <CardHeader><CardTitle>Pengeluaran periode ini</CardTitle></CardHeader>
            <CardContent>
              {r.expenseRows.length === 0 ? <Empty>Belum ada pengeluaran.</Empty> : (
                <Table>
                  <THead><TR><TH>Tanggal</TH><TH>Jenis</TH><TH>Keterangan</TH><TH className="text-right">Nominal</TH><TH></TH></TR></THead>
                  <TBody>
                    {r.expenseRows.map((e) => (
                      <TR key={e.id}>
                        <TD className="whitespace-nowrap">{fmtDate(e.date)}</TD><TD>{e.category}</TD><TD className="text-muted-foreground">{e.note}</TD><TD className="text-right">{rupiah(e.amount)}</TD>
                        <TD className="text-right"><ActionForm action={deleteExpenseAction} confirm="Hapus pengeluaran ini?"><input type="hidden" name="id" value={e.id} /><SubmitButton size="sm" variant="ghost" className="text-destructive">Hapus</SubmitButton></ActionForm></TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardHeader><CardTitle>Catat pengeluaran</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={addExpenseAction} resetOnSuccess>
                <Field label="Tanggal"><Input type="date" name="date" defaultValue={todayStr()} required /></Field>
                <Field label="Jenis">
                  <Input name="category" list="exp-cat" required placeholder="Mis. Laundry & perawatan" />
                  <datalist id="exp-cat">{EXPENSE_CATS.map((c) => <option key={c} value={c} />)}</datalist>
                </Field>
                <Field label="Nominal (Rp)"><Input name="amount" type="number" min={1} step={500} required /></Field>
                <Field label="Keterangan"><Input name="note" /></Field>
                <SubmitButton>Simpan</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
        <DailyTable r={r} />
        <SalesTable r={r} />
      </div>
    </>
  );
}
