import Link from "next/link";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { METHOD_LABEL, StatusBadge } from "@/components/status-badge";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Empty, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireUser } from "@/lib/session";
import { fmtDate, fmtDateTime, rupiah } from "@/lib/utils";
import { confirmPaymentAction, rejectPaymentAction, uploadProofAction } from "./actions";

const { payments, orders, customers } = schema;

export default async function PembayaranPage() {
  await requireUser("pembayaran");
  const base = db
    .select({
      id: payments.id, orderId: payments.orderId, method: payments.method, amount: payments.amount, status: payments.status,
      proofUrl: payments.proofUrl, note: payments.note, paidAt: payments.paidAt, createdAt: payments.createdAt, customer: customers.name,
    })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(customers, eq(customers.id, orders.customerId));
  const [pending, history] = await Promise.all([
    base.where(eq(payments.status, "pending")).orderBy(desc(payments.createdAt)),
    db
      .select({
        id: payments.id, orderId: payments.orderId, method: payments.method, amount: payments.amount, status: payments.status,
        proofUrl: payments.proofUrl, paidAt: payments.paidAt, createdAt: payments.createdAt, customer: customers.name,
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(inArray(payments.status, ["lunas", "gagal"]))
      .orderBy(desc(payments.createdAt))
      .limit(100),
  ]);
  const paid = sql<number>`coalesce((select sum(p.amount) from payments p where p.order_id = ${orders.id} and p.status = 'lunas'), 0)`;
  const unpaid = await db
    .select({ id: orders.id, customer: customers.name, total: orders.totalAmount, paid: paid, start: orders.rentalStart, status: orders.status })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(inArray(orders.status, ["baru", "disewa", "selesai"]), gt(sql`${orders.totalAmount} - ${paid}`, 0)))
    .orderBy(orders.rentalStart);

  return (
    <>
      <PageHeader title="Pembayaran" description="QRIS, transfer, dan status tagihan pelanggan." />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Menunggu konfirmasi ({pending.length})</CardTitle>
            <CardDescription>Cocokkan dengan mutasi rekening / notifikasi QRIS, lalu tandai lunas.</CardDescription>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? <Empty>Tidak ada pembayaran yang menunggu.</Empty> : (
              <div className="grid gap-3">
                {pending.map((p) => (
                  <div key={p.id} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm">
                      <p className="font-medium">{p.customer} · {rupiah(p.amount)}</p>
                      <p className="text-muted-foreground">{METHOD_LABEL[p.method]} · {fmtDateTime(p.createdAt)} · <Link className="text-primary hover:underline" href={`/pesanan/${p.orderId}`}>#{p.orderId.slice(0, 8)}</Link></p>
                      {p.proofUrl && <a className="text-primary hover:underline" href={p.proofUrl} target="_blank">Lihat bukti</a>}
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      {p.method === "qris" && <Button asChild size="sm" variant="outline"><Link href={`/pembayaran/${p.id}/qris`}>Tampilkan QRIS</Link></Button>}
                      <ActionForm action={uploadProofAction} className="flex flex-wrap gap-2">
                        <input type="hidden" name="paymentId" value={p.id} />
                        <Input type="file" name="proof" accept="image/*,application/pdf" className="h-8 w-48 py-1 text-xs" required />
                        <SubmitButton size="sm" variant="outline">Unggah bukti</SubmitButton>
                      </ActionForm>
                      <ActionForm action={confirmPaymentAction}><input type="hidden" name="paymentId" value={p.id} /><SubmitButton size="sm">Tandai lunas</SubmitButton></ActionForm>
                      <ActionForm action={rejectPaymentAction} confirm="Tandai pembayaran ini gagal?"><input type="hidden" name="paymentId" value={p.id} /><SubmitButton size="sm" variant="ghost">Gagal</SubmitButton></ActionForm>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tagihan belum lunas ({unpaid.length})</CardTitle></CardHeader>
          <CardContent>
            {unpaid.length === 0 ? <Empty>Semua tagihan sudah lunas. 🎉</Empty> : (
              <Table>
                <THead><TR><TH>Pelanggan</TH><TH>Tgl ambil</TH><TH>Status</TH><TH className="text-right">Total</TH><TH className="text-right">Dibayar</TH><TH className="text-right">Sisa</TH></TR></THead>
                <TBody>
                  {unpaid.map((o) => (
                    <TR key={o.id}>
                      <TD><Link href={`/pesanan/${o.id}`} className="font-medium hover:underline">{o.customer}</Link></TD>
                      <TD>{fmtDate(o.start)}</TD>
                      <TD><StatusBadge status={o.status} /></TD>
                      <TD className="text-right">{rupiah(o.total)}</TD>
                      <TD className="text-right">{rupiah(o.paid)}</TD>
                      <TD className="text-right font-medium text-destructive">{rupiah(o.total - o.paid)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Riwayat & bukti pembayaran</CardTitle></CardHeader>
          <CardContent>
            {history.length === 0 ? <Empty>Belum ada riwayat.</Empty> : (
              <Table>
                <THead><TR><TH>Waktu</TH><TH>Pelanggan</TH><TH>Metode</TH><TH className="text-right">Nominal</TH><TH>Status</TH><TH>Bukti</TH></TR></THead>
                <TBody>
                  {history.map((p) => (
                    <TR key={p.id}>
                      <TD className="whitespace-nowrap">{fmtDateTime(p.paidAt ?? p.createdAt)}</TD>
                      <TD><Link href={`/pesanan/${p.orderId}`} className="hover:underline">{p.customer}</Link></TD>
                      <TD>{METHOD_LABEL[p.method]}</TD>
                      <TD className="text-right">{rupiah(p.amount)}</TD>
                      <TD><StatusBadge status={p.status} /></TD>
                      <TD>{p.proofUrl ? <a className="text-primary hover:underline" href={p.proofUrl} target="_blank">Lihat</a> : "-"}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
