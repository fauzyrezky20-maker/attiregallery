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
import { addMeasurementAction, saveCustomerAction } from "../actions";
import { EVENT_TYPES } from "@/lib/catalog";
import { SIZE_FIELDS, SIZE_GROUPS } from "@/lib/measurements";

const s = schema;

export default async function PelangganDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesanan?: string }> }) {
  const user = await requireUser("pelanggan");
  const { id } = await params;
  const { pesanan } = await searchParams;
  const c = await db.query.customers.findFirst({ where: eq(s.customers.id, id) });
  if (!c) notFound();
  const allowed = await getAllowedMenus(user.role);
  const [measures, fittings, orders] = await Promise.all([
    db.select().from(s.measurements).where(eq(s.measurements.customerId, id)).orderBy(desc(s.measurements.measuredAt)),
    db.select().from(s.fittingSchedules).where(eq(s.fittingSchedules.customerId, id)).orderBy(desc(s.fittingSchedules.scheduledAt)),
    db.select().from(s.orders).where(eq(s.orders.customerId, id)).orderBy(desc(s.orders.createdAt)),
  ]);
  const last = measures[0];

  return (
    <>
      <PageHeader
        title={c.name}
        description={[c.phone, c.eventType, c.campus, c.address].filter(Boolean).join(" · ") || "Pelanggan"}
        back="/pelanggan"
        actions={allowed.includes("kasir") && <Button asChild><Link href={`/kasir?pelanggan=${c.id}`}><ShoppingCart /> Transaksi baru</Link></Button>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 content-start lg:col-span-2">
          <Card id="ukuran">
            <CardHeader><CardTitle>Keterangan resize</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              {last ? (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Ukuran terakhir · {fmtDateTime(last.measuredAt)}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {SIZE_GROUPS.map((g) => (
                      <div key={g.title}>
                        <p className="mb-1 text-sm font-medium">{g.title}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {g.fields.map(([k, l]) => (
                            <div key={k} className="rounded-md bg-muted p-2"><p className="text-xs text-muted-foreground">{l}</p><p className="font-semibold">{last[k] != null ? `${last[k]} cm` : "-"}</p></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {last.notes && <p className="mt-2 text-sm">{last.notes}</p>}
                </div>
              ) : <p className="text-sm text-muted-foreground">Belum ada keterangan resize.</p>}
              <ActionForm action={addMeasurementAction} resetOnSuccess className="rounded-lg border p-4">
                <p className="font-medium">Catat keterangan resize baru (cm)</p>
                <input type="hidden" name="customerId" value={c.id} />
                {SIZE_GROUPS.map((g) => (
                  <fieldset key={g.title} className="grid gap-2">
                    <legend className="mb-1 text-sm font-medium">{g.title}</legend>
                    <div className="grid grid-cols-3 gap-3">
                      {g.fields.map(([k, l]) => <Field key={k} label={l}><Input name={k} type="number" step="0.1" min={0} inputMode="decimal" /></Field>)}
                    </div>
                  </fieldset>
                ))}
                <Field label="Untuk pesanan (opsional)">
                  <Select name="orderId" defaultValue={pesanan ?? ""}>
                    <option value="">—</option>
                    {orders.map((o) => <option key={o.id} value={o.id}>#{o.id.slice(0, 8)} · {fmtDate(o.rentalStart)}</option>)}
                  </Select>
                </Field>
                <Field label="Catatan"><Textarea name="notes" rows={2} placeholder="Mis. lengan dibuat lebih longgar" /></Field>
                <SubmitButton className="justify-self-start">Simpan keterangan</SubmitButton>
              </ActionForm>
              {measures.length > 1 && (
                <details>
                  <summary className="cursor-pointer text-sm font-medium">Riwayat ukuran ({measures.length})</summary>
                  <Table className="mt-2">
                    <THead><TR><TH>Tanggal</TH>{SIZE_FIELDS.map(([k, l]) => <TH key={k}>{l}</TH>)}<TH>Catatan</TH></TR></THead>
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
                <Field label="No. WhatsApp"><Input name="phone" defaultValue={c.phone ?? ""} /></Field>
                <Field label="Jenis acara"><Input name="eventType" list="event-types" defaultValue={c.eventType ?? ""} /></Field>
                <Field label="Asal kampus"><Input name="campus" defaultValue={c.campus ?? ""} /></Field>
                <datalist id="event-types">{EVENT_TYPES.map((e) => <option key={e} value={e} />)}</datalist>
                <Field label="Alamat"><Textarea name="address" rows={2} defaultValue={c.address ?? ""} /></Field>
                <SubmitButton variant="secondary">Simpan</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  );
}
