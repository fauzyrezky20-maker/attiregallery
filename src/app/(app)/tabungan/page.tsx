import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Empty, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireUser } from "@/lib/session";
import { fmtDateTime, rupiah } from "@/lib/utils";
import { depositAction } from "../pelanggan/actions";

const { customers: c, customerDeposits: d, depositTransactions: t } = schema;

export default async function TabunganPage() {
  await requireUser("tabungan");
  const [balances, mutations, allCustomers] = await Promise.all([
    db.select({ id: c.id, name: c.name, phone: c.phone, balance: d.balance, updatedAt: d.updatedAt }).from(d).innerJoin(c, eq(c.id, d.customerId)).orderBy(desc(d.balance)),
    db.select({ id: t.id, type: t.type, amount: t.amount, note: t.note, at: t.createdAt, customerId: c.id, customer: c.name, orderId: t.orderId }).from(t).innerJoin(c, eq(c.id, t.customerId)).orderBy(desc(t.createdAt)).limit(100),
    db.select({ id: c.id, name: c.name, phone: c.phone }).from(c).orderBy(asc(c.name)),
  ]);
  const total = balances.reduce((s, b) => s + b.balance, 0);
  return (
    <>
      <PageHeader title="Tabungan Pelanggan" description={`Total saldo tersimpan: ${rupiah(total)}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-6 content-start">
          <Card>
            <CardHeader><CardTitle>Saldo per pelanggan</CardTitle></CardHeader>
            <CardContent>
              {balances.length === 0 ? <Empty>Belum ada pelanggan yang menabung.</Empty> : (
                <Table>
                  <THead><TR><TH>Pelanggan</TH><TH>Telepon</TH><TH>Terakhir berubah</TH><TH className="text-right">Saldo</TH></TR></THead>
                  <TBody>{balances.map((b) => <TR key={b.id}><TD><Link className="font-medium hover:underline" href={`/pelanggan/${b.id}`}>{b.name}</Link></TD><TD>{b.phone}</TD><TD>{fmtDateTime(b.updatedAt)}</TD><TD className="text-right font-semibold">{rupiah(b.balance)}</TD></TR>)}</TBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Riwayat mutasi</CardTitle></CardHeader>
            <CardContent>
              {mutations.length === 0 ? <Empty>Belum ada mutasi.</Empty> : (
                <Table>
                  <THead><TR><TH>Waktu</TH><TH>Pelanggan</TH><TH>Keterangan</TH><TH className="text-right">Nominal</TH></TR></THead>
                  <TBody>
                    {mutations.map((m) => (
                      <TR key={m.id}>
                        <TD className="whitespace-nowrap">{fmtDateTime(m.at)}</TD>
                        <TD><Link className="hover:underline" href={`/pelanggan/${m.customerId}`}>{m.customer}</Link></TD>
                        <TD>{m.note}{m.orderId && <> · <Link className="text-primary hover:underline" href={`/pesanan/${m.orderId}`}>#{m.orderId.slice(0, 8)}</Link></>}</TD>
                        <TD className={`text-right ${m.type === "setor" ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>{m.type === "setor" ? "+" : "−"}{rupiah(m.amount)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader><CardTitle>Setor / pakai saldo</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={depositAction} resetOnSuccess>
              <Field label="Pelanggan">
                <Select name="customerId" required defaultValue="">
                  <option value="">— Pilih pelanggan —</option>
                  {allCustomers.map((x) => <option key={x.id} value={x.id}>{x.name}{x.phone ? ` · ${x.phone}` : ""}</option>)}
                </Select>
              </Field>
              <Field label="Jenis"><Select name="type" defaultValue="setor"><option value="setor">Setor (top-up)</option><option value="pakai">Pakai / tarik saldo</option></Select></Field>
              <Field label="Nominal"><Input name="amount" type="number" min={1} step={1000} required /></Field>
              <Field label="Keterangan"><Input name="note" /></Field>
              <SubmitButton>Simpan</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
