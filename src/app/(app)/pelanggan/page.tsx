import Link from "next/link";
import { desc, like, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Empty, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireUser } from "@/lib/session";
import { EVENT_TYPES } from "@/lib/catalog";
import { saveCustomerAction } from "./actions";

const { customers, orders } = schema;

export default async function PelangganPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser("pelanggan");
  const { q = "" } = await searchParams;
  const rows = await db
    .select({
      id: customers.id, name: customers.name, phone: customers.phone, address: customers.address, eventType: customers.eventType, campus: customers.campus,
      orders: sql<number>`(select count(*) from ${orders} where ${orders.customerId} = ${customers.id})`,
    })
    .from(customers)
    .where(q ? or(like(customers.name, `%${q}%`), like(customers.phone, `%${q}%`), like(customers.campus, `%${q}%`), like(customers.eventType, `%${q}%`)) : undefined)
    .orderBy(desc(customers.createdAt))
    .limit(300);
  return (
    <>
      <PageHeader title="Pelanggan" description="Data pelanggan, jenis acara, asal kampus, ukuran badan, dan fitting." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="pt-4 md:pt-5">
            <form className="mb-4 flex gap-2">
              <Input name="q" defaultValue={q} placeholder="Cari nama / telepon / kampus / acara" className="max-w-sm" />
              <Button type="submit" variant="secondary">Cari</Button>
            </form>
            {rows.length === 0 ? <Empty>Belum ada pelanggan.</Empty> : (
              <Table>
                <THead><TR><TH>Nama</TH><TH>Telepon</TH><TH>Jenis acara</TH><TH>Asal kampus</TH><TH className="text-right">Pesanan</TH></TR></THead>
                <TBody>
                  {rows.map((c) => (
                    <TR key={c.id}>
                      <TD><Link href={`/pelanggan/${c.id}`} className="font-medium hover:underline">{c.name}</Link></TD>
                      <TD>{c.phone ?? "-"}</TD>
                      <TD>{c.eventType ?? "-"}</TD>
                      <TD className="max-w-56 truncate">{c.campus ?? "-"}</TD>
                      <TD className="text-right">{c.orders}</TD>
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
              <Field label="Jenis acara"><Input name="eventType" list="event-types" placeholder="Mis. Wisuda" /></Field>
              <Field label="Asal kampus"><Input name="campus" /></Field>
              <Field label="Alamat"><Input name="address" /></Field>
              <datalist id="event-types">{EVENT_TYPES.map((e) => <option key={e} value={e} />)}</datalist>
              <SubmitButton>Simpan</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
