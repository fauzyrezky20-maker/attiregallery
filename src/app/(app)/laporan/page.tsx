import Link from "next/link";
import { Download, FileText, Printer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { requireUser } from "@/lib/session";
import { financeReport } from "@/lib/reports";
import { fmtDate, todayStr } from "@/lib/utils";
import { addExpenseAction, addIncomeAction, deleteExpenseAction, deleteIncomeAction, importFinanceAction } from "./actions";
import { PeriodForm } from "./period-form";
import { readPeriod, type ReportSearch } from "./params";
import { ExpenseByCategory, ExpenseTable, IncomeByMethod, ManualIncomeTable, SalesTable, SectionTitle, Summary } from "./report-view";

const INCOME_CATS = ["Sewa", "DP", "Pelunasan", "Denda", "Jasa make up", "Lain-lain"];
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
            <Button asChild><a href={`/laporan/pdf?${qs}`}><FileText /> Unduh PDF</a></Button>
            <Button asChild variant="outline"><a href={`/laporan/unduh?${qs}`}><Download /> Excel (CSV)</a></Button>
            <Button asChild variant="outline"><Link href={`/laporan/cetak?${qs}`}><Printer /> Cetak</Link></Button>
          </>
        }
      />
      <PeriodForm period={period} from={from} to={to} />
      <Card className="no-print mb-6">
        <CardHeader><CardTitle>Masukkan data keuangan lama (impor CSV)</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p className="text-muted-foreground">
            Isi pemasukan dan pengeluaran sekaligus dari Excel atau Google Sheets. Kolomnya: Tanggal, Jenis (Pemasukan/Pengeluaran), Kategori, Keterangan, Nominal, Metode.
            Di Excel simpan dengan <b>File → Save As → CSV</b>; di Google Sheets pilih <b>File → Download → CSV</b>. Baris yang sama persis tidak akan dobel.
          </p>
          <a href="/laporan/template" className="w-fit font-medium text-primary hover:underline">Unduh contoh file</a>
          <ActionForm action={importFinanceAction} resetOnSuccess className="max-w-md">
            <Field label="File CSV"><Input type="file" name="file" accept=".csv,text/csv" required /></Field>
            <SubmitButton>Impor</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
      <div className="grid gap-6">
        <Summary r={r} />

        <SectionTitle>Pemasukan</SectionTitle>
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid content-start gap-6">
            <IncomeByMethod r={r} />
            <SalesTable r={r} />
            <ManualIncomeTable
              r={r}
              actions={(id) => (
                <ActionForm action={deleteIncomeAction} confirm="Hapus pemasukan ini?"><input type="hidden" name="id" value={id} /><SubmitButton size="sm" variant="ghost" className="text-destructive">Hapus</SubmitButton></ActionForm>
              )}
            />
          </div>
          <Card className="h-fit">
            <CardHeader><CardTitle>Catat pemasukan</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">Untuk pemasukan di luar kasir, misalnya data lama sejak Juni. Tanggal boleh mundur.</p>
              <ActionForm action={addIncomeAction} resetOnSuccess>
                <Field label="Tanggal"><Input type="date" name="date" defaultValue={todayStr()} required /></Field>
                <Field label="Jenis">
                  <Input name="category" list="inc-cat" defaultValue="Sewa" required />
                  <datalist id="inc-cat">{INCOME_CATS.map((c) => <option key={c} value={c} />)}</datalist>
                </Field>
                <Field label="Nominal (Rp)"><Input name="amount" type="number" min={1} step={500} required /></Field>
                <Field label="Metode">
                  <Select name="method" defaultValue="tunai"><option value="tunai">Tunai</option><option value="qris">QRIS</option><option value="transfer">Transfer</option></Select>
                </Field>
                <Field label="Keterangan"><Input name="note" placeholder="Mis. Sewa Amara - Rina" /></Field>
                <SubmitButton>Simpan</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        </div>

        <SectionTitle>Pengeluaran</SectionTitle>
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid content-start gap-6">
            <ExpenseByCategory r={r} />
            <ExpenseTable
              r={r}
              actions={(id) => (
                <ActionForm action={deleteExpenseAction} confirm="Hapus pengeluaran ini?"><input type="hidden" name="id" value={id} /><SubmitButton size="sm" variant="ghost" className="text-destructive">Hapus</SubmitButton></ActionForm>
              )}
            />
          </div>
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
      </div>
    </>
  );
}
