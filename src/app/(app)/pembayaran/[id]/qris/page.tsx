import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db, schema } from "@/db";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { makeDynamicQris } from "@/lib/qris";
import { rupiah } from "@/lib/utils";
import { confirmPaymentAction, rejectPaymentAction } from "../../actions";

export default async function QrisPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("pembayaran");
  const { id } = await params;
  const payment = await db.query.payments.findFirst({ where: eq(schema.payments.id, id) });
  if (!payment) notFound();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, payment.orderId) });
  const customer = order && (await db.query.customers.findFirst({ where: eq(schema.customers.id, order.customerId) }));
  const s = await getSettings();

  let qr: string | null = null;
  let error: string | null = null;
  if (!s.qrisPayload) error = "Kode QRIS toko belum diatur. Isi di Pengaturan Toko → Metode Pembayaran.";
  else {
    try {
      qr = await QRCode.toDataURL(makeDynamicQris(s.qrisPayload, payment.amount), { width: 720, margin: 2, errorCorrectionLevel: "M" });
    } catch {
      error = "Kode QRIS toko tidak valid. Periksa kembali di Pengaturan Toko.";
    }
  }

  return (
    <div className="mx-auto grid max-w-md gap-4">
      <Card>
        <CardContent className="grid justify-items-center gap-3 pt-6 md:pt-6 text-center">
          <p className="text-sm text-muted-foreground">{s.storeName} · {customer?.name}</p>
          <p className="text-3xl font-bold">{rupiah(payment.amount)}</p>
          <StatusBadge status={payment.status} />
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Kode QRIS" className="w-full max-w-xs rounded-lg border bg-white p-2" />
          ) : (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <p className="text-sm text-muted-foreground">Minta pelanggan memindai dengan aplikasi bank atau e-wallet. Nominal sudah terisi otomatis.</p>
        </CardContent>
      </Card>
      {payment.status === "pending" ? (
        <div className="grid gap-2">
          <ActionForm action={confirmPaymentAction}>
            <input type="hidden" name="paymentId" value={payment.id} />
            <SubmitButton size="lg">Dana sudah masuk → Tandai lunas</SubmitButton>
          </ActionForm>
          <ActionForm action={rejectPaymentAction} confirm="Tandai pembayaran QRIS ini gagal?">
            <input type="hidden" name="paymentId" value={payment.id} />
            <SubmitButton variant="outline">Pembayaran gagal / batal</SubmitButton>
          </ActionForm>
        </div>
      ) : null}
      <div className="flex justify-center gap-2">
        <Button asChild variant="outline"><Link href={`/pesanan/${payment.orderId}`}>Detail pesanan</Link></Button>
        <Button asChild variant="outline"><Link href={`/pesanan/${payment.orderId}/nota`}>Nota</Link></Button>
      </div>
    </div>
  );
}
