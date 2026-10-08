import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { requireUser } from "@/lib/session";
import { fmtDateTime } from "@/lib/utils";
import { saveFittingResultAction } from "../../pelanggan/actions";

const s = schema;
const SIZE_FIELDS = [
  ["chest", "Lingkar dada"], ["waist", "Lingkar pinggang"], ["hip", "Lingkar pinggul"],
  ["shoulder", "Lebar bahu"], ["sleeve", "Panjang lengan"], ["length", "Panjang badan"],
] as const;

export default async function FittingDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("fitting");
  const { id } = await params;
  const fit = await db.query.fittingSchedules.findFirst({ where: eq(s.fittingSchedules.id, id) });
  if (!fit) notFound();
  const [customer, last] = await Promise.all([
    db.query.customers.findFirst({ where: eq(s.customers.id, fit.customerId) }),
    db.query.measurements.findFirst({ where: eq(s.measurements.customerId, fit.customerId), orderBy: desc(s.measurements.measuredAt) }),
  ]);

  return (
    <>
      <PageHeader title={`Fitting ${customer?.name ?? ""}`} description={fmtDateTime(fit.scheduledAt)} back="/fitting" />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader className="flex-row items-center justify-between"><CardTitle>Foto konsumen</CardTitle><StatusBadge status={fit.status} /></CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {fit.photoUrl ? (
              <a href={fit.photoUrl} target="_blank">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fit.photoUrl} alt={`Foto fitting ${customer?.name ?? ""}`} className="aspect-[3/4] w-full rounded-lg border object-cover" />
              </a>
            ) : <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-muted text-muted-foreground">Belum ada foto</div>}
            {customer && <p><Link className="font-medium hover:underline" href={`/pelanggan/${customer.id}`}>{customer.name}</Link>{customer.phone ? ` · ${customer.phone}` : ""}</p>}
            {(customer?.eventType || customer?.campus) && <p className="text-muted-foreground">{[customer.eventType, customer.campus].filter(Boolean).join(" · ")}</p>}
            {fit.orderId && <Link className="text-primary hover:underline" href={`/pesanan/${fit.orderId}`}>Pesanan #{fit.orderId.slice(0, 8)}</Link>}
            {fit.notes && <p className="rounded-md bg-muted p-2">{fit.notes}</p>}
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader><CardTitle>Hasil fitting: foto & ukuran</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={saveFittingResultAction}>
              <input type="hidden" name="id" value={fit.id} />
              <Field label={fit.photoUrl ? "Ganti foto konsumen" : "Foto konsumen"} hint="Bisa langsung dari kamera HP"><Input type="file" name="photo" accept="image/*" capture="environment" /></Field>
              <p className="text-sm font-medium">Ukuran badan (cm){last && <span className="font-normal text-muted-foreground"> · terisi dari ukuran terakhir {fmtDateTime(last.measuredAt)}</span>}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SIZE_FIELDS.map(([k, l]) => <Field key={k} label={l}><Input name={k} type="number" step="0.1" min={0} inputMode="decimal" defaultValue={last?.[k] ?? ""} /></Field>)}
              </div>
              <Field label="Catatan"><Textarea name="notes" rows={2} defaultValue={fit.notes ?? ""} placeholder="Mis. lengan perlu di-resize 2 cm" /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="done" defaultChecked={fit.status === "terjadwal"} className="size-4" /> Tandai fitting selesai</label>
              <SubmitButton className="justify-self-start">Simpan hasil fitting</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
