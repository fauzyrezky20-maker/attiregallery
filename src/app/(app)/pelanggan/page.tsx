import Link from "next/link";
import { desc, eq, like, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Empty, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireUser } from "@/lib/session";
import { rupiah } from "@/lib/utils";
import { saveCustomerAction } from "./actions";

const { customers, customerDeposits, orders } = schema;

export default async function PelangganPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser("pelanggan");
  const { q = "" } = await searchParams;
  const rows = await db
    .select({
      id: customers.id, name: customers.name, phone: customers.phone, address: customers.address, balance: customerDeposits.balance,
      orders: sql<number>`(select count(*) from ${orders} where ${orders.customerId} = ${customers.id})`,
    })
    .from(customers)
    .leftJoin(customerDeposits, eq(customerDeposits.customerId, customers.id))
    .where(q ? or(like(customers.name, `%${q}%`), like(customers.phone, `%${q}%`)) : undefined)
    .orderBy(desc(customers.createdAt))
    .limit(300);
  return (
    <>
      <PageHeader title="Pelanggan" description="Data pelanggan, ukuran badan, fitting, dan tabungan." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="pt-4 md:pt-5">
            <form className="mb-4 flex gap-2">
              <Input name="q" defaultValue={q} placeholder="Cari nama / no. telepon" className="max-w-sm" />
              <Button type="submit" variant="secondary">Cari</Button>
            </form>
            {rows.length === 0 ? <Empty>Belum ada pelanggan.</Empty> : (
              <Table>
                <THead><TR><TH>Nama</TH><TH>Telepon</TH><TH>Alamat</TH><TH className="text-right">Pesanan</TH><TH className="text-right">Saldo tabungan</TH></TR></THead>
                <TBody>
                  {rows.map((c) => (
                    <TR key={c.id}>
                      <TD><Link href={`/pelanggan/${c.id}`} className="font-medium hover:underline">{c.name}</Link></TD>
                      <TD>{c.phone ?? "-"}</TD>
                      <TD className="max-w-56 truncate text-muted-foreground">{c.address ?? "-"}</TD>
                      <TD className="text-right">{c.orders}</TD>
                      <TD className="text-right">{rupiah(c.balance ?? 0)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader><CardTitle>Tambah pelanggan</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={saveCustomerAction}>
              <Field label="Nama"><Input name="name" required /></Field>
              <Field label="No. telepon"><Input name="phone" inputMode="tel" /></Field>
              <Field label="Alamat"><Input name="address" /></Field>
              <SubmitButton>Simpan</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
