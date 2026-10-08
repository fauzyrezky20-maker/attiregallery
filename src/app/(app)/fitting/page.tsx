import Link from "next/link";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Empty } from "@/components/ui/table";
import { requireUser } from "@/lib/session";
import { fmtDate, fmtDateTime, fmtTime, todayStr } from "@/lib/utils";
import { saveFittingAction, setFittingStatusAction } from "../pelanggan/actions";

const { fittingSchedules: f, customers: c } = schema;

export default async function FittingPage({ searchParams }: { searchParams: Promise<{ pelanggan?: string; pesanan?: string }> }) {
  await requireUser("fitting");
  const sp = await searchParams;
  const startOfToday = new Date(todayStr() + "T00:00:00+07:00");
  const sel = { id: f.id, at: f.scheduledAt, status: f.status, notes: f.notes, photoUrl: f.photoUrl, orderId: f.orderId, customerId: c.id, customer: c.name, phone: c.phone };
  const [upcoming, past, customers] = await Promise.all([
    db.select(sel).from(f).innerJoin(c, eq(c.id, f.customerId)).where(and(gte(f.scheduledAt, startOfToday))).orderBy(asc(f.scheduledAt)),
    db.select(sel).from(f).innerJoin(c, eq(c.id, f.customerId)).where(lt(f.scheduledAt, startOfToday)).orderBy(desc(f.scheduledAt)).limit(50),
    db.select({ id: c.id, name: c.name, phone: c.phone }).from(c).orderBy(asc(c.name)),
  ]);

  const groups = new Map<string, typeof upcoming>();
  for (const r of upcoming) {
    const key = todayStr(r.at);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <>
      <PageHeader title="Jadwal Fitting" description="Atur janji fitting, lalu catat foto konsumen dan ukurannya." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-6 content-start">
          <Card>
            <CardHeader><CardTitle>Akan datang</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              {upcoming.length === 0 && <Empty>Belum ada jadwal fitting.</Empty>}
              {[...groups.entries()].map(([day, rows]) => (
                <div key={day}>
                  <p className="mb-1 text-sm font-semibold">{day === todayStr() ? "Hari ini" : fmtDate(day)}</p>
                  <ul className="divide-y rounded-lg border">
                    {rows.map((r) => (
                      <li key={r.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 text-sm">
                        {r.photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.photoUrl} alt="" className="size-12 shrink-0 rounded-md object-cover" />
                        )}
                        <div>
                          <p><b>{fmtTime(r.at)}</b> · <Link href={`/pelanggan/${r.customerId}`} className="hover:underline">{r.customer}</Link> {r.phone && <span className="text-muted-foreground">({r.phone})</span>}</p>
                          {r.notes && <p className="text-muted-foreground">{r.notes}</p>}
                          {r.orderId && <Link href={`/pesanan/${r.orderId}`} className="text-xs text-primary hover:underline">Pesanan #{r.orderId.slice(0, 8)}</Link>}
                        </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={r.status} />
                          <Button asChild size="sm" variant="secondary"><Link href={`/fitting/${r.id}`}>Foto & ukuran</Link></Button>
                          {r.status === "terjadwal" && (
                            <>
                              <ActionForm action={setFittingStatusAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="batal" /><SubmitButton size="sm" variant="ghost">Batal</SubmitButton></ActionForm>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Riwayat fitting</CardTitle></CardHeader>
            <CardContent>
              {past.length === 0 ? <Empty>Belum ada riwayat.</Empty> : (
                <ul className="divide-y text-sm">
                  {past.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                      <span>{fmtDateTime(r.at)} · <Link href={`/pelanggan/${r.customerId}`} className="hover:underline">{r.customer}</Link> · <Link href={`/fitting/${r.id}`} className="text-primary hover:underline">{r.photoUrl ? "Lihat foto & ukuran" : "Catat foto & ukuran"}</Link></span>
                      <span className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        {r.status === "terjadwal" && <ActionForm action={setFittingStatusAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="selesai" /><SubmitButton size="sm" variant="ghost">Tandai selesai</SubmitButton></ActionForm>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader><CardTitle>Buat jadwal</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={saveFittingAction} resetOnSuccess>
              <Field label="Pelanggan">
                <Select name="customerId" defaultValue={sp.pelanggan ?? ""} required>
                  <option value="">— Pilih pelanggan —</option>
                  {customers.map((x) => <option key={x.id} value={x.id}>{x.name}{x.phone ? ` · ${x.phone}` : ""}</option>)}
                </Select>
              </Field>
              {sp.pesanan && <input type="hidden" name="orderId" value={sp.pesanan} />}
              <Field label="Tanggal & jam"><Input type="datetime-local" name="scheduledAt" required /></Field>
              <Field label="Catatan"><Textarea name="notes" rows={2} placeholder="Mis. bawa sepatu hak untuk ukur panjang" /></Field>
              <SubmitButton>Simpan jadwal</SubmitButton>
              <p className="text-xs text-muted-foreground">Pelanggan baru? Tambahkan dulu di menu <Link href="/pelanggan" className="underline">Pelanggan</Link>.</p>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
