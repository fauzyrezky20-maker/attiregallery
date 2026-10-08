import Link from "next/link";
import { METHOD_LABEL } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { financeReport } from "@/lib/reports";
import { fmtDate, fmtDateTime, rupiah } from "@/lib/utils";

type R = Awaited<ReturnType<typeof financeReport>>;

export function Summary({ r }: { r: R }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card><CardContent className="pt-4 md:pt-5"><p className="text-sm text-muted-foreground">Total pemasukan</p><p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">{rupiah(r.income)}</p><p className="text-xs text-muted-foreground">{r.sales.length} transaksi</p></CardContent></Card>
      <Card><CardContent className="pt-4 md:pt-5"><p className="text-sm text-muted-foreground">Total pengeluaran</p><p className="text-2xl font-semibold text-destructive">{rupiah(r.expense)}</p><p className="text-xs text-muted-foreground">{r.expenseRows.length} catatan</p></CardContent></Card>
    </div>
  );
}

export function IncomeByMethod({ r }: { r: R }) {
  return (
    <Card>
      <CardHeader><CardTitle>Pemasukan per metode</CardTitle></CardHeader>
      <CardContent>
        {r.incomeByMethod.length === 0 ? <Empty>Belum ada pemasukan.</Empty> : (
          <ul className="divide-y text-sm">{r.incomeByMethod.map((m) => <li key={m.method} className="flex justify-between py-2"><span>{METHOD_LABEL[m.method]} <span className="text-muted-foreground">({m.count}×)</span></span><span>{rupiah(m.total)}</span></li>)}</ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ExpenseByCategory({ r }: { r: R }) {
  return (
    <Card>
      <CardHeader><CardTitle>Pengeluaran per jenis</CardTitle></CardHeader>
      <CardContent>
        {r.expenseByCategory.length === 0 ? <Empty>Belum ada pengeluaran.</Empty> : (
          <ul className="divide-y text-sm">{r.expenseByCategory.map(([c, t]) => <li key={c} className="flex justify-between py-2"><span>{c}</span><span>{rupiah(t)}</span></li>)}</ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ExpenseTable({ r, actions }: { r: R; actions?: (id: string) => React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>Daftar pengeluaran ({r.expenseRows.length})</CardTitle></CardHeader>
      <CardContent>
        {r.expenseRows.length === 0 ? <Empty>Belum ada pengeluaran.</Empty> : (
          <Table>
            <THead><TR><TH>Tanggal</TH><TH>Jenis</TH><TH>Keterangan</TH><TH className="text-right">Nominal</TH>{actions && <TH></TH>}</TR></THead>
            <TBody>
              {r.expenseRows.map((e) => (
                <TR key={e.id}>
                  <TD className="whitespace-nowrap">{fmtDate(e.date)}</TD><TD>{e.category}</TD><TD className="text-muted-foreground">{e.note}</TD><TD className="text-right">{rupiah(e.amount)}</TD>
                  {actions && <TD className="text-right">{actions(e.id)}</TD>}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function SalesTable({ r, links = true }: { r: R; links?: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle>Daftar pemasukan ({r.sales.length} transaksi)</CardTitle></CardHeader>
      <CardContent>
        {r.sales.length === 0 ? <Empty>Tidak ada pemasukan pada periode ini.</Empty> : (
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

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-2 border-b pb-2 text-lg font-semibold">{children}</h2>;
}
