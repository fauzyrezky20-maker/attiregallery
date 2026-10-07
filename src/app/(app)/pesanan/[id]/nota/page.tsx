import Link from "next/link";
import { notFound } from "next/navigation";
import { METHOD_LABEL } from "@/components/status-badge";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";
import { getOrderDetail } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { fmtDate, fmtDateTime, rupiah } from "@/lib/utils";

const STATUS: Record<string, string> = { baru: "Baru", disewa: "Sedang disewa", selesai: "Selesai", dibatalkan: "Dibatalkan" };

export default async function NotaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ baru?: string }> }) {
  await requireUser("pesanan");
  const { id } = await params;
  const { baru } = await searchParams;
  const d = await getOrderDetail(id);
  if (!d) notFound();
  const s = await getSettings();
  const { order, customer } = d;
  const lunas = d.payments.filter((p) => p.status === "lunas");

  return (
    <div className="mx-auto max-w-md">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        {baru ? <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">✅ Transaksi tersimpan.</p> : <span />}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href={`/pesanan/${order.id}`}>Detail pesanan</Link></Button>
          <Button asChild variant="outline"><Link href="/kasir">Transaksi baru</Link></Button>
          <PrintButton label="Cetak nota" />
        </div>
      </div>
      <div className="rounded-lg border bg-white p-6 font-mono text-[13px] leading-relaxed text-black shadow-sm print:border-0 print:p-0 print:shadow-none">
        <div className="text-center">
          {s.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logoUrl} alt="" className="mx-auto mb-2 h-14 w-14 object-contain" />
          )}
          <p className="text-base font-bold">{s.storeName}</p>
          {s.address && <p className="whitespace-pre-line">{s.address}</p>}
          {s.phone && <p>Telp. {s.phone}</p>}
        </div>
        <hr className="my-3 border-dashed border-black" />
        <div className="grid grid-cols-[auto_1fr] gap-x-3">
          <span>No.</span><span>#{order.id.slice(0, 8).toUpperCase()}</span>
          <span>Tanggal</span><span>{fmtDateTime(order.createdAt)}</span>
          <span>Pelanggan</span><span>{customer.name}</span>
          {customer.phone && (<><span>Telp.</span><span>{customer.phone}</span></>)}
          <span>Ambil</span><span>{fmtDate(order.rentalStart)}</span>
          <span>Kembali</span><span className="font-bold">{fmtDate(order.rentalEnd)}</span>
          <span>Status</span><span>{STATUS[order.status]}</span>
          {d.staffName && (<><span>Kasir</span><span>{d.staffName}</span></>)}
        </div>
        <hr className="my-3 border-dashed border-black" />
        {d.items.map((i) => (
          <div key={i.id} className="mb-1">
            <p>{i.name}</p>
            <div className="flex justify-between pl-3"><span>{i.quantity} × {rupiah(i.price)} × {d.days} hr</span><span>{rupiah(i.price * i.quantity * d.days)}</span></div>
          </div>
        ))}
        <hr className="my-3 border-dashed border-black" />
        <div className="flex justify-between"><span>Subtotal</span><span>{rupiah(d.subtotal)}</span></div>
        {order.discount > 0 && <div className="flex justify-between"><span>Diskon</span><span>−{rupiah(order.discount)}</span></div>}
        {order.fine > 0 && <div className="flex justify-between"><span>Denda terlambat</span><span>{rupiah(order.fine)}</span></div>}
        <div className="flex justify-between text-base font-bold"><span>TOTAL</span><span>{rupiah(order.totalAmount)}</span></div>
        {lunas.map((p) => (
          <div key={p.id} className="flex justify-between"><span>Bayar ({METHOD_LABEL[p.method]})</span><span>{rupiah(p.amount)}</span></div>
        ))}
        <div className="flex justify-between font-bold"><span>{d.outstanding > 0 ? "SISA TAGIHAN" : "LUNAS"}</span><span>{d.outstanding > 0 ? rupiah(d.outstanding) : ""}</span></div>
        <hr className="my-3 border-dashed border-black" />
        <p className="text-[11px]">Denda keterlambatan {rupiah(s.finePerDay)}/hari. Pelanggan telah menyetujui S&K sewa versi {d.consent?.termsVersion ?? s.termsVersion}.</p>
        <p className="mt-3 text-center">Terima kasih 🌸</p>
      </div>
    </div>
  );
}
