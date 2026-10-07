import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, Ruler, CalendarPlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { METHOD_LABEL, StatusBadge } from "@/components/status-badge";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireUser, getAllowedMenus } from "@/lib/session";
import { getOrderDetail } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { calcFine } from "@/lib/pricing";
import { fmtDate, fmtDateTime, rupiah, todayStr } from "@/lib/utils";
import { addPaymentAction, cancelAction, pickupAction, returnAction, updateOrderAction } from "../actions";
import { confirmPaymentAction } from "../../pembayaran/actions";

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ info?: string }> }) {
  const user = await requireUser("pesanan");
  const { id } = await params;
  const { info } = await searchParams;
  const d = await getOrderDetail(id);
  if (!d) notFound();
  const settings = await getSettings();
  const allowed = await getAllowedMenus(user.role);
  const canPay = allowed.includes("pembayaran");
  const { order, customer } = d;
  const today = todayStr();
  const projected = order.status === "disewa" ? calcFine(order.rentalEnd, today, settings.finePerDay) : null;
  const editable = order.status === "baru" || order.status === "disewa";

  return (
    <>
      <PageHeader
        title={`Pesanan #${order.id.slice(0, 8)}`}
        description={`Dibuat ${fmtDateTime(order.createdAt)}${d.staffName ? ` · dilayani ${d.staffName}` : ""}`}
        back="/pesanan"
        actions={
          <>
            <Button asChild variant="outline"><Link href={`/pesanan/${order.id}/nota`}><Printer /> Nota</Link></Button>
            <Button asChild variant="outline"><Link href={`/fitting?pelanggan=${customer.id}&pesanan=${order.id}`}><CalendarPlus /> Jadwal fitting</Link></Button>
            <Button asChild variant="outline"><Link href={`/pelanggan/${customer.id}?pesanan=${order.id}#ukuran`}><Ruler /> Catat ukuran</Link></Button>
          </>
        }
      />
      {info && <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" role="status">{info}</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 content-start lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Ringkasan</CardTitle>
              <StatusBadge status={order.status} />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
              <div><p className="text-muted-foreground">Pelanggan</p><Link href={`/pelanggan/${customer.id}`} className="font-medium hover:underline">{customer.name}</Link><p>{customer.phone}</p><p className="text-muted-foreground">{customer.address}</p></div>
              <div><p className="text-muted-foreground">Tanggal ambil</p><p className="font-medium">{fmtDate(order.rentalStart)}</p><p className="mt-2 text-muted-foreground">Tanggal kembali</p><p className="font-medium">{fmtDate(order.rentalEnd)} ({d.days} hari)</p></div>
              <div><p className="text-muted-foreground">Dikembalikan</p><p className="font-medium">{order.returnedAt ? fmtDate(order.returnedAt) : "-"}</p>{projected && projected.lateDays > 0 && <p className="mt-2 text-destructive">Terlambat {projected.lateDays} hari · denda berjalan {rupiah(projected.fine)}</p>}</div>
              {order.notes && <p className="sm:col-span-3 rounded-md bg-muted p-3">{order.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Kebaya</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <THead><TR><TH>Kebaya</TH><TH className="text-right">Harga/hari</TH><TH className="text-right">Jumlah</TH><TH className="text-right">Subtotal</TH></TR></THead>
                <TBody>
                  {d.items.map((i) => (
                    <TR key={i.id}><TD><Link className="hover:underline" href={`/produk/${i.productId}`}>{i.name}</Link><div className="text-xs text-muted-foreground">{i.category}</div></TD><TD className="text-right">{rupiah(i.price)}</TD><TD className="text-right">{i.quantity}</TD><TD className="text-right">{rupiah(i.price * i.quantity * d.days)}</TD></TR>
                  ))}
                </TBody>
              </Table>
              <div className="ml-auto mt-3 grid max-w-xs gap-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{rupiah(d.subtotal)}</span></div>
                <div className="flex justify-between"><span>Diskon</span><span>−{rupiah(order.discount)}</span></div>
                <div className="flex justify-between"><span>Denda</span><span>{rupiah(order.fine)}</span></div>
                <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{rupiah(order.totalAmount)}</span></div>
                <div className="flex justify-between"><span>Sudah dibayar</span><span>{rupiah(d.paid)}</span></div>
                <div className="flex justify-between font-semibold"><span>Sisa tagihan</span><span className={d.outstanding > 0 ? "text-destructive" : ""}>{rupiah(d.outstanding)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Pembayaran</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              {d.payments.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada pembayaran.</p> : (
                <Table>
                  <THead><TR><TH>Waktu</TH><TH>Metode</TH><TH className="text-right">Nominal</TH><TH>Status</TH><TH>Bukti</TH><TH></TH></TR></THead>
                  <TBody>
                    {d.payments.map((p) => (
                      <TR key={p.id}>
                        <TD className="whitespace-nowrap">{fmtDateTime(p.paidAt ?? p.createdAt)}</TD>
                        <TD>{METHOD_LABEL[p.method]}</TD>
                        <TD className="text-right">{rupiah(p.amount)}</TD>
                        <TD><StatusBadge status={p.status} /></TD>
                        <TD>{p.proofUrl ? <a className="text-primary hover:underline" href={p.proofUrl} target="_blank">Lihat</a> : "-"}</TD>
                        <TD className="text-right">
                          {p.status === "pending" && canPay && (
                            <div className="flex justify-end gap-2">
                              {p.method === "qris" && <Button asChild size="sm" variant="outline"><Link href={`/pembayaran/${p.id}/qris`}>QRIS</Link></Button>}
                              <ActionForm action={confirmPaymentAction}><input type="hidden" name="paymentId" value={p.id} /><SubmitButton size="sm">Tandai lunas</SubmitButton></ActionForm>
                            </div>
                          )}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
              {canPay && order.status !== "dibatalkan" && d.outstanding - d.pending > 0 && (
                <ActionForm action={addPaymentAction} resetOnSuccess className="rounded-lg border p-4">
                  <input type="hidden" name="orderId" value={order.id} />
                  <p className="font-medium">Terima pembayaran</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Metode">
                      <Select name="method" defaultValue="tunai">
                        {settings.cashEnabled && <option value="tunai">Tunai</option>}
                        {settings.qrisEnabled && settings.qrisPayload && <option value="qris">QRIS</option>}
                        {settings.transferEnabled && <option value="transfer">Transfer bank</option>}
                        {d.depositBalance > 0 && <option value="tabungan">Saldo tabungan ({rupiah(d.depositBalance)})</option>}
                      </Select>
                    </Field>
                    <Field label="Nominal"><Input name="amount" type="number" min={1} defaultValue={d.outstanding - d.pending} required /></Field>
                    <Field label="Bukti (opsional)"><Input name="proof" type="file" accept="image/*,application/pdf" /></Field>
                  </div>
                  <Field label="Catatan"><Input name="note" placeholder="Mis. pelunasan denda" /></Field>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmed" className="size-4" /> QRIS/transfer sudah dicek masuk (langsung lunas)</label>
                  <SubmitButton className="justify-self-start">Simpan pembayaran</SubmitButton>
                </ActionForm>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 content-start">
          <Card>
            <CardHeader><CardTitle>Perbarui status</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              {order.status === "baru" && (
                <>
                  <ActionForm action={pickupAction}><input type="hidden" name="orderId" value={order.id} /><SubmitButton className="w-full">Kebaya sudah diambil → Sedang disewa</SubmitButton></ActionForm>
                  <ActionForm action={cancelAction} confirm="Batalkan pesanan ini?"><input type="hidden" name="orderId" value={order.id} /><SubmitButton variant="outline" className="w-full">Batalkan pesanan</SubmitButton></ActionForm>
                </>
              )}
              {order.status === "disewa" && (
                <ActionForm action={returnAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <Field label="Tanggal dikembalikan" hint={`Denda ${rupiah(settings.finePerDay)}/hari setelah ${fmtDate(order.rentalEnd)}`}>
                    <Input type="date" name="returnDate" defaultValue={today} max={today} min={order.rentalStart} />
                  </Field>
                  <SubmitButton className="w-full">Kebaya sudah kembali → Selesai</SubmitButton>
                </ActionForm>
              )}
              {(order.status === "selesai" || order.status === "dibatalkan") && <p className="text-sm text-muted-foreground">Pesanan sudah {order.status}.</p>}
            </CardContent>
          </Card>

          {editable && (
            <Card>
              <CardHeader><CardTitle>Ubah pesanan</CardTitle></CardHeader>
              <CardContent>
                <ActionForm action={updateOrderAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <Field label="Tanggal ambil"><Input type="date" name="rentalStart" defaultValue={order.rentalStart} required /></Field>
                  <Field label="Lama sewa (hari)"><Input type="number" name="days" min={1} defaultValue={d.days} required /></Field>
                  <Field label="Diskon"><Input type="number" name="discount" min={0} defaultValue={order.discount} /></Field>
                  <Field label="Catatan"><Textarea name="notes" rows={2} defaultValue={order.notes ?? ""} /></Field>
                  <SubmitButton variant="secondary">Simpan perubahan</SubmitButton>
                </ActionForm>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Persetujuan S&K</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {d.consent ? <p>✅ Disetujui {fmtDateTime(d.consent.agreedAt)} (versi {d.consent.termsVersion})</p> : <p className="text-destructive">Belum ada persetujuan.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Fitting & ukuran</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {d.fittings.length === 0 && d.measures.length === 0 && <p className="text-muted-foreground">Belum ada jadwal fitting atau ukuran untuk pesanan ini.</p>}
              {d.fittings.map((f) => <div key={f.id} className="flex items-center justify-between"><span>Fitting {fmtDateTime(f.scheduledAt)}</span><StatusBadge status={f.status} /></div>)}
              {d.measures.map((m) => (
                <p key={m.id} className="text-muted-foreground">Ukuran {fmtDateTime(m.measuredAt)}: dada {m.chest ?? "-"}, pinggang {m.waist ?? "-"}, panjang {m.length ?? "-"} cm</p>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
