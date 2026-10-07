import Link from "next/link";
import { METHOD_LABEL } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { financeReport } from "@/lib/reports";
import { fmtDate, fmtDateTime, rupiah } from "@/lib/utils";

type R = Awaited<ReturnType<typeof financeReport>>;

export function Summary({ r }: { r: R }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card><CardContent className="pt-4 md:pt-5"><p className="text-sm text-muted-foreground">Pemasukan</p><p className="text-2xl font-semibold">{rupiah(r.income)}</p></CardContent></Card>
      <Card><CardContent className="pt-4 md:pt-5"><p className="text-sm text-muted-foreground">Pengeluaran</p><p className="text-2xl font-semibold">{rupiah(r.expense)}</p></CardContent></Card>
      <Card><CardContent className="pt-4 md:pt-5"><p className="text-sm text-muted-foreground">{r.profit >= 0 ? "Laba" : "Rugi"}</p><p className={`text-2xl font-semibold ${r.profit < 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>{rupiah(r.profit)}</p></CardContent></Card>
    </div>
  );
}

export function Breakdown({ r }: { r: R }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Pemasukan per metode</CardTitle></CardHeader>
        <CardContent>
          {r.incomeByMethod.length === 0 ? <Empty>Belum ada pemasukan.</Empty> : (
            <ul className="divide-y text-sm">{r.incomeByMethod.map((m) => <li key={m.method} className="flex justify-between py-2"><span>{METHOD_LABEL[m.method]} <span className="text-muted-foreground">({m.count}×)</span></span><span>{rupiah(m.total)}</span></li>)}</ul>
          )}
          {r.depositIn > 0 && <p className="mt-2 text-xs text-muted-foreground">Setoran tabungan pelanggan periode ini {rupiah(r.depositIn)} (dana titipan, dihitung pemasukan saat dipakai membayar).</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Pengeluaran per jenis</CardTitle></CardHeader>
        <CardContent>
          {r.expenseByCategory.length === 0 ? <Empty>Belum ada pengeluaran.</Empty> : (
            <ul className="divide-y text-sm">{r.expenseByCategory.map(([c, t]) => <li key={c} className="flex justify-between py-2"><span>{c}</span><span>{rupiah(t)}</span></li>)}</ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DailyTable({ r }: { r: R }) {
  if (r.daily.length <= 1) return null;
  return (
    <Card>
      <CardHeader><CardTitle>Laba rugi per hari</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <THead><TR><TH>Tanggal</TH><TH className="text-right">Pemasukan</TH><TH className="text-right">Pengeluaran</TH><TH className="text-right">Laba/Rugi</TH></TR></THead>
          <TBody>
            {r.daily.map((d) => <TR key={d.day}><TD>{fmtDate(d.day)}</TD><TD className="text-right">{rupiah(d.income)}</TD><TD className="text-right">{rupiah(d.expense)}</TD><TD className={`text-right ${d.profit < 0 ? "text-destructive" : ""}`}>{rupiah(d.profit)}</TD></TR>)}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function SalesTable({ r, links = true }: { r: R; links?: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle>Riwayat penjualan ({r.sales.length} transaksi)</CardTitle></CardHeader>
      <CardContent>
        {r.sales.length === 0 ? <Empty>Tidak ada transaksi pada periode ini.</Empty> : (
          <Table>
            <THead><TR><TH>Waktu</TH><TH>Pesanan</TH><TH>Pelanggan</TH><TH>Metode</TH><TH className="text-right">Nominal</TH></TR></THead>
            <TBody>
              {r.sales.map((x) => (
                <TR key={x.id}>
                  <TD className="whitespace-nowrap">{fmtDateTime(x.paidAt)}</TD>
                  <TD>{links ? <Link className="font-mono text-xs text-primary hover:underline" href={`/pesanan/${x.orderId}`}>#{x.orderId.slice(0, 8)}</Link> : `#${x.orderId.slice(0, 8)}`}</TD>
                  <TD>{x.customer}</TD>
                  <TD>{METHOD_LABEL[x.method]}</TD>
                  <TD className="text-right">{rupiah(x.amount)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
