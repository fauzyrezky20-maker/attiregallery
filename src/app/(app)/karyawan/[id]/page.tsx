import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ROLES } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { requireUser } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/permissions";
import { fmtDate, fmtTime } from "@/lib/utils";
import { createAccountAction, saveEmployeeAction, updateAccountAction } from "../actions";

export default async function KaryawanDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser("karyawan");
  const { id } = await params;
  const emp = await db.query.employees.findFirst({ where: eq(schema.employees.id, id) });
  if (!emp) notFound();
  const account = emp.userId ? await db.query.users.findFirst({ where: eq(schema.users.id, emp.userId) }) : null;
  const recent = await db.select().from(schema.attendances).where(eq(schema.attendances.employeeId, id)).orderBy(desc(schema.attendances.date)).limit(14);
  const owner = me.role === "pemilik";

  return (
    <>
      <PageHeader title={emp.name} description={emp.position ?? "Karyawan"} back="/karyawan" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Data karyawan</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={saveEmployeeAction}>
              <input type="hidden" name="id" value={emp.id} />
              <Field label="Nama"><Input name="name" defaultValue={emp.name} required /></Field>
              <Field label="Jabatan"><Input name="position" defaultValue={emp.position ?? ""} /></Field>
              <Field label="No. telepon"><Input name="phone" defaultValue={emp.phone ?? ""} /></Field>
              <Field label="Status"><Select name="status" defaultValue={emp.status}><option value="aktif">Aktif</option><option value="tidak aktif">Tidak aktif</option></Select></Field>
              <SubmitButton variant="secondary">Simpan</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Akun login & peran</CardTitle>
            <CardDescription>Peran menentukan menu yang bisa dibuka (atur di Pengaturan → Peran & Hak Akses).</CardDescription>
          </CardHeader>
          <CardContent>
            {!owner ? (
              <p className="text-sm text-muted-foreground">{account ? `${account.email} · ${ROLE_LABEL[account.role]}` : "Belum punya akun."} Hanya pemilik yang bisa mengubah akun.</p>
            ) : account ? (
              <ActionForm action={updateAccountAction}>
                <input type="hidden" name="userId" value={account.id} />
                <p className="text-sm">Email login: <b>{account.email}</b></p>
                <Field label="Peran"><Select name="role" defaultValue={account.role}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
                <Field label="Kata sandi baru" hint="Kosongkan bila tidak diganti"><Input name="password" type="password" minLength={6} autoComplete="new-password" /></Field>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="revoke" className="size-4" /> Keluarkan dari semua perangkat</label>
                <SubmitButton variant="secondary">Simpan akun</SubmitButton>
              </ActionForm>
            ) : (
              <ActionForm action={createAccountAction}>
                <input type="hidden" name="employeeId" value={emp.id} />
                <Field label="Email"><Input name="email" type="email" required /></Field>
                <Field label="Kata sandi awal"><Input name="password" type="password" minLength={6} required autoComplete="new-password" /></Field>
                <Field label="Peran"><Select name="role" defaultValue="kasir">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
                <SubmitButton>Buat akun login</SubmitButton>
              </ActionForm>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Absensi 14 hari terakhir</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada catatan absensi.</p> : (
              <ul className="divide-y text-sm">
                {recent.map((a) => <li key={a.id} className="flex justify-between py-2"><span>{fmtDate(a.date)} · {fmtTime(a.checkIn)} – {fmtTime(a.checkOut)}{a.note ? ` · ${a.note}` : ""}</span><StatusBadge status={a.status} /></li>)}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
