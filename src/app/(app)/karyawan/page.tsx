import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Empty, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireUser } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/permissions";
import { saveEmployeeAction } from "./actions";

const { employees: e, users: u } = schema;

export default async function KaryawanPage() {
  await requireUser("karyawan");
  const rows = await db
    .select({ id: e.id, name: e.name, position: e.position, phone: e.phone, status: e.status, email: u.email, role: u.role })
    .from(e)
    .leftJoin(u, eq(u.id, e.userId))
    .orderBy(asc(e.status), asc(e.name));
  return (
    <>
      <PageHeader title="Karyawan" description="Data karyawan, akun login, dan peran." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="pt-4 md:pt-5">
            {rows.length === 0 ? <Empty>Belum ada karyawan.</Empty> : (
              <Table>
                <THead><TR><TH>Nama</TH><TH>Jabatan</TH><TH>Telepon</TH><TH>Akun login</TH><TH>Status</TH></TR></THead>
                <TBody>
                  {rows.map((r) => (
                    <TR key={r.id}>
                      <TD><Link href={`/karyawan/${r.id}`} className="font-medium hover:underline">{r.name}</Link></TD>
                      <TD>{r.position ?? "-"}</TD>
                      <TD>{r.phone ?? "-"}</TD>
                      <TD>{r.email ? <span>{r.email} <span className="text-muted-foreground">· {ROLE_LABEL[r.role!]}</span></span> : <span className="text-muted-foreground">Belum ada</span>}</TD>
                      <TD><StatusBadge status={r.status} /></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader><CardTitle>Tambah karyawan</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={saveEmployeeAction}>
              <Field label="Nama"><Input name="name" required /></Field>
              <Field label="Jabatan"><Input name="position" placeholder="Mis. Kasir, Penjahit" /></Field>
              <Field label="No. telepon"><Input name="phone" inputMode="tel" /></Field>
              <SubmitButton>Simpan</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
