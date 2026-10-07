import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ShoppingCart } from "lucide-react";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Empty, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getAllowedMenus, requireUser } from "@/lib/session";
import { fmtDate, fmtDateTime, rupiah } from "@/lib/utils";
import { addMeasurementAction, depositAction, saveCustomerAction } from "../actions";

const s = schema;
const SIZE_FIELDS = [
  ["chest", "Lingkar dada"], ["waist", "Lingkar pinggang"], ["hip", "Lingkar pinggul"],
  ["shoulder", "Lebar bahu"], ["sleeve", "Panjang lengan"], ["length", "Panjang badan"],
] as const;

export default async function PelangganDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesanan?: string }> }) {
  const user = await requireUser("pelanggan");
  const { id } = await params;
  const { pesanan } = await searchParams;
  const c = await db.query.customers.findFirst({ where: eq(s.customers.id, id) });
  if (!c) notFound();
  const allowed = await getAllowedMenus(user.role);
  const [measures, fittings, orders, deposit, mutations] = await Promise.all([
    db.select().from(s.measurements).where(eq(s.measurements.customerId, id)).orderBy(desc(s.measurements.measuredAt)),
    db.select().from(s.fittingSchedules).where(eq(s.fittingSchedules.customerId, id)).orderBy(desc(s.fittingSchedules.scheduledAt)),
    db.select().from(s.orders).where(eq(s.orders.customerId, id)).orderBy(desc(s.orders.createdAt)),
    db.query.customerDeposits.findFirst({ where: eq(s.customerDeposits.customerId, id) }),
    db.select().from(s.depositTransactions).where(eq(s.depositTransactions.customerId, id)).orderBy(desc(s.depositTransactions.createdAt)).limit(50),
  ]);
  const last = measures[0];

  return (
    <>
      <PageHeader
        title={c.name}
        description={[c.phone, c.address].filter(Boolean).join(" · ") || "Pelanggan"}
        back="/pelanggan"
        actions={allowed.includes("kasir") && <Button asChild><Link href={`/kasir?pelanggan=${c.id}`}><ShoppingCart /> Transaksi baru</Link></Button>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 content-start lg:col-span-2">
          <Card id="ukuran">
            <CardHeader><CardTitle>Ukuran badan</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              {last ? (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Ukuran terakhir · {fmtDateTime(last.measuredAt)}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SIZE_FIELDS.map(([k, l]) => (
                      <div key={k} className="rounded-md bg-muted p-2"><p className="text-xs text-muted-foreground">{l}</p><p className="font-semibold">{last[k] != null ? `${last[k]} cm` : "-"}</p></div>
                    ))}
                  </div>
                  {last.notes && <p className="mt-2 text-sm">{last.notes}</p>}
                </div>
              ) : <p className="text-sm text-muted-foreground">Belum ada catatan ukuran.</p>}
              <ActionForm action={addMeasurementAction} resetOnSuccess className="rounded-lg border p-4">
                <p className="font-medium">Catat ukuran baru (cm)</p>
                <input type="hidden" name="customerId" value={c.id} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {SIZE_FIELDS.map(([k, l]) => <Field key={k} label={l}><Input name={k} type="number" step="0.1" min={0} inputMode="decimal" /></Field>)}
                </div>
                <Field label="Untuk pesanan (opsional)">
                  <Select name="orderId" defaultValue={pesanan ?? ""}>
                    <option value="">—</option>
                    {orders.map((o) => <option key={o.id} value={o.id}>#{o.id.slice(0, 8)} · {fmtDate(o.rentalStart)}</option>)}
                  </Select>
                </Field>
                <Field label="Catatan"><Textarea name="notes" rows={2} placeholder="Mis. lengan dibuat lebih longgar" /></Field>
                <SubmitButton className="justify-self-start">Simpan ukuran</SubmitButton>
              </ActionForm>
              {measures.length > 1 && (
                <details>
                  <summary className="cursor-pointer text-sm font-medium">Riwayat ukuran ({measures.length})</summary>
                  <Table className="mt-2">
                    <THead><TR><TH>Tanggal</TH>{SIZE_FIELDS.map(([k, l]) => <TH key={k}>{l.replace("Lingkar ", "").replace("Panjang ", "P. ")}</TH>)}<TH>Catatan</TH></TR></THead>
                    <TBody>
                      {measures.map((m) => <TR key={m.id}><TD className="whitespace-nowrap">{fmtDateTime(m.measuredAt)}</TD>{SIZE_FIELDS.map(([k]) => <TD key={k}>{m[k] ?? "-"}</TD>)}<TD>{m.notes}</TD></TR>)}
                    </TBody>
                  </Table>
                </details>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Riwayat fitting</CardTitle>
              <Button asChild size="sm" variant="outline"><Link href={`/fitting?pelanggan=${c.id}`}>Atur jadwal</Link></Button>
            </CardHeader>
            <CardContent>
              {fittings.length === 0 ? <Empty>Belum ada jadwal fitting.</Empty> : (
                <ul className="divide-y text-sm">
                  {fittings.map((f) => <li key={f.id} className="flex items-center justify-between py-2"><span>{fmtDateTime(f.scheduledAt)}{f.notes ? ` · ${f.notes}` : ""}</span><StatusBadge status={f.status} /></li>)}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Riwayat pesanan</CardTitle></CardHeader>
            <CardContent>
              {orders.length === 0 ? <Empty>Belum ada pesanan.</Empty> : (
                <Table>
                  <THead><TR><TH>No.</TH><TH>Ambil</TH><TH>Kembali</TH><TH>Status</TH><TH className="text-right">Total</TH></TR></THead>
                  <TBody>
                    {orders.map((o) => <TR key={o.id}><TD><Link href={`/pesanan/${o.id}`} className="font-mono text-xs text-primary hover:underline">#{o.id.slice(0, 8)}</Link></TD><TD>{fmtDate(o.rentalStart)}</TD><TD>{fmtDate(o.rentalEnd)}</TD><TD><StatusBadge status={o.status} /></TD><TD className="text-right">{rupiah(o.totalAmount)}</TD></TR>)}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 content-start">
          <Card>
            <CardHeader><CardTitle>Data pelanggan</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={saveCustomerAction}>
                <input type="hidden" name="id" value={c.id} />
                <Field label="Nama"><Input name="name" defaultValue={c.name} required /></Field>
                <Field label="No. telepon"><Input name="phone" defaultValue={c.phone ?? ""} /></Field>
                <Field label="Alamat"><Textarea name="address" rows={2} defaultValue={c.address ?? ""} /></Field>
                <SubmitButton variant="secondary">Simpan</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tabungan</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-3xl font-semibold">{rupiah(deposit?.balance ?? 0)}</p>
              {allowed.includes("tabungan") && (
                <ActionForm action={depositAction} resetOnSuccess>
                  <input type="hidden" name="customerId" value={c.id} />
                  <div className="grid grid-cols-2 gap-2">
                    <Select name="type" defaultValue="setor"><option value="setor">Setor</option><option value="pakai">Pakai / tarik</option></Select>
                    <Input name="amount" type="number" min={1} step={1000} placeholder="Nominal" required />
                  </div>
                  <Input name="note" placeholder="Keterangan (opsional)" />
                  <SubmitButton variant="secondary">Simpan mutasi</SubmitButton>
                </ActionForm>
              )}
              <p className="text-xs text-muted-foreground">Saldo juga bisa dipakai langsung saat bayar di Kasir atau di detail pesanan.</p>
              {mutations.length > 0 && (
                <ul className="divide-y text-sm">
                  {mutations.map((m) => (
                    <li key={m.id} className="flex justify-between gap-2 py-2">
                      <span className="min-w-0"><span className="block truncate">{m.note ?? (m.type === "setor" ? "Setoran" : "Pemakaian")}</span><span className="text-xs text-muted-foreground">{fmtDateTime(m.createdAt)}</span></span>
                      <span className={m.type === "setor" ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>{m.type === "setor" ? "+" : "−"}{rupiah(m.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
