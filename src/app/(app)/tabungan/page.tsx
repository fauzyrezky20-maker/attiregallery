import { desc, gte, sql } from "drizzle-orm";
import { Landmark } from "lucide-react";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Empty, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { fmtDate, rupiah, todayStr } from "@/lib/utils";
import { addSavingAction, deleteSavingAction } from "./actions";

const { storeSavings: t } = schema;
const monthLabel = (ym: string) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(ym + "-01T00:00:00Z"));

export default async function TabunganPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  await requireUser("tabungan");
  const today = todayStr();
  const { bulan } = await searchParams;
  const month = bulan && /^\d{4}-\d{2}$/.test(bulan) ? bulan : today.slice(0, 7);
  const monthExpr = sql<string>`substr(${t.date}, 1, 7)`;
  const [settings, perMonth, rows] = await Promise.all([
    getSettings(),
    db.select({ month: monthExpr, total: sql<number>`sum(${t.amount})`, n: sql<number>`count(*)` }).from(t)
      .where(gte(t.date, `${Number(today.slice(0, 4)) - 1}-01-01`)).groupBy(monthExpr).orderBy(desc(monthExpr)),
    db.select().from(t).where(sql`${monthExpr} = ${month}`).orderBy(desc(t.date), desc(t.createdAt)),
  ]);
  const monthTotal = rows.reduce((s, r) => s + r.amount, 0);
  const allTotal = perMonth.reduce((s, r) => s + Number(r.total), 0);

  return (
    <>
      <PageHeader
        title="Tabungan Toko"
        description={`Setoran ${monthLabel(month)}: ${rupiah(monthTotal)}`}
        actions={settings.mbankingUrl && (
          <Button asChild><a href={settings.mbankingUrl} target="_blank" rel="noopener noreferrer"><Landmark /> Setor lewat m-banking</a></Button>
        )}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader><CardTitle>Rekap per bulan</CardTitle><CardDescription>Total disetor sejak tahun lalu: {rupiah(allTotal)}</CardDescription></CardHeader>
            <CardContent>
              {perMonth.length === 0 ? <Empty>Belum ada setoran.</Empty> : (
                <Table>
                  <THead><TR><TH>Bulan</TH><TH className="text-right">Jumlah setoran</TH><TH className="text-right">Total</TH></TR></THead>
                  <TBody>
                    {perMonth.map((m) => (
                      <TR key={m.month}>
                        <TD><a href={`/tabungan?bulan=${m.month}`} className={`hover:underline ${m.month === month ? "font-semibold text-primary" : ""}`}>{monthLabel(m.month)}</a></TD>
                        <TD className="text-right">{Number(m.n)}×</TD>
                        <TD className="text-right font-medium">{rupiah(Number(m.total))}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Setoran {monthLabel(month)}</CardTitle></CardHeader>
            <CardContent>
              <form className="mb-4 flex gap-2">
                <Input type="month" name="bulan" defaultValue={month} className="w-44" aria-label="Pilih bulan" />
                <Button type="submit" variant="secondary">Tampilkan</Button>
              </form>
              {rows.length === 0 ? <Empty>Belum ada setoran bulan ini.</Empty> : (
                <Table>
                  <THead><TR><TH>Tanggal</TH><TH>Rekening</TH><TH>Keterangan</TH><TH>Bukti</TH><TH className="text-right">Nominal</TH><TH></TH></TR></THead>
                  <TBody>
                    {rows.map((r) => (
                      <TR key={r.id}>
                        <TD className="whitespace-nowrap">{fmtDate(r.date)}</TD>
                        <TD>{r.account ?? "-"}</TD>
                        <TD className="text-muted-foreground">{r.note}</TD>
                        <TD>{r.proofUrl ? <a className="text-primary hover:underline" href={r.proofUrl} target="_blank">Lihat</a> : "-"}</TD>
                        <TD className="text-right font-medium">{rupiah(r.amount)}</TD>
                        <TD className="text-right"><ActionForm action={deleteSavingAction} confirm="Hapus catatan setoran ini?"><input type="hidden" name="id" value={r.id} /><SubmitButton size="sm" variant="ghost" className="text-destructive">Hapus</SubmitButton></ActionForm></TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Catat setoran</CardTitle>
            <CardDescription>Transfer dananya lewat aplikasi m-banking, lalu catat di sini beserta buktinya.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {settings.savingsAccount && <p className="whitespace-pre-line rounded-md bg-muted p-3 text-sm">{settings.savingsAccount}</p>}
            {settings.mbankingUrl ? (
              <Button asChild variant="outline"><a href={settings.mbankingUrl} target="_blank" rel="noopener noreferrer"><Landmark /> Buka m-banking</a></Button>
            ) : <p className="text-xs text-muted-foreground">Isi rekening tabungan & tautan m-banking di Pengaturan Toko agar tombol setor muncul di sini.</p>}
            <ActionForm action={addSavingAction} resetOnSuccess>
              <Field label="Tanggal"><Input type="date" name="date" defaultValue={today} required /></Field>
              <Field label="Nominal (Rp)"><Input name="amount" type="number" min={1} step={1000} required /></Field>
              <Field label="Rekening tujuan"><Input name="account" defaultValue={settings.savingsAccount?.split("\n")[0] ?? ""} placeholder="Mis. BRI 1234…" /></Field>
              <Field label="Keterangan"><Input name="note" placeholder="Mis. tabungan bulan Oktober" /></Field>
              <Field label="Bukti transfer (opsional)"><Input type="file" name="proof" accept="image/*,application/pdf" /></Field>
              <SubmitButton>Simpan setoran</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
