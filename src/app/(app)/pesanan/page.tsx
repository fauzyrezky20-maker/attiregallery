import Link from "next/link";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { CalendarDays, Plus } from "lucide-react";
import { db, schema } from "@/db";
import { ORDER_STATUS } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Empty, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireUser } from "@/lib/session";
import { fmtDate, rupiah } from "@/lib/utils";

const { orders, customers, payments } = schema;

export default async function PesananPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireUser("pesanan");
  const { q = "", status = "" } = await searchParams;
  const conds: SQL[] = [];
  if (q) conds.push(or(like(customers.name, `%${q}%`), like(customers.phone, `%${q}%`), like(orders.id, `${q}%`))!);
  if (status) conds.push(eq(orders.status, status as (typeof ORDER_STATUS)[number]));
  const paidSq = db
    .select({ orderId: payments.orderId, paid: sql<number>`sum(${payments.amount})`.as("paid") })
    .from(payments)
    .where(eq(payments.status, "lunas"))
    .groupBy(payments.orderId)
    .as("paid_sq");
  const rows = await db
    .select({
      id: orders.id, status: orders.status, start: orders.rentalStart, end: orders.rentalEnd, total: orders.totalAmount,
      customer: customers.name, phone: customers.phone, paid: sql<number>`coalesce(${paidSq.paid}, 0)`,
      items: sql<string>`(select group_concat(p.name, ', ') from order_items oi join products p on p.id = oi.product_id where oi.order_id = ${orders.id})`,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .leftJoin(paidSq, eq(paidSq.orderId, orders.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(200);

  return (
    <>
      <PageHeader
        title="Pesanan"
        description="Semua pesanan sewa kebaya."
        actions={
          <>
            <Button asChild variant="outline"><Link href="/pesanan/jadwal"><CalendarDays /> Jadwal ambil & kembali</Link></Button>
            <Button asChild><Link href="/kasir"><Plus /> Pesanan baru</Link></Button>
          </>
        }
      />
      <Card>
        <CardContent className="pt-4 md:pt-5">
          <form className="mb-4 flex flex-col gap-2 sm:flex-row">
            <Input name="q" defaultValue={q} placeholder="Cari nama / no. telepon pelanggan / no. pesanan" className="sm:max-w-sm" />
            <Select name="status" defaultValue={status} className="sm:w-48">
              <option value="">Semua status</option>
              {ORDER_STATUS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </Select>
            <Button type="submit" variant="secondary">Cari</Button>
          </form>
          {rows.length === 0 ? (
            <Empty>Belum ada pesanan.</Empty>
          ) : (
            <Table>
              <THead><TR><TH>No.</TH><TH>Pelanggan</TH><TH>Kebaya</TH><TH>Ambil</TH><TH>Kembali</TH><TH>Status</TH><TH className="text-right">Total</TH><TH>Bayar</TH></TR></THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD><Link href={`/pesanan/${r.id}`} className="font-mono text-xs text-primary hover:underline">#{r.id.slice(0, 8)}</Link></TD>
                    <TD><Link href={`/pesanan/${r.id}`} className="font-medium hover:underline">{r.customer}</Link><div className="text-xs text-muted-foreground">{r.phone}</div></TD>
                    <TD className="max-w-56 truncate text-muted-foreground">{r.items}</TD>
                    <TD className="whitespace-nowrap">{fmtDate(r.start)}</TD>
                    <TD className="whitespace-nowrap">{fmtDate(r.end)}</TD>
                    <TD><StatusBadge status={r.status} /></TD>
                    <TD className="text-right whitespace-nowrap">{rupiah(r.total)}</TD>
                    <TD>{r.status === "dibatalkan" ? null : <StatusBadge status={r.paid >= r.total ? "lunas" : "belum_lunas"} />}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
