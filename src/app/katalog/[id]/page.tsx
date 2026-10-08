import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { ChevronLeft, Shirt } from "lucide-react";
import { db, schema } from "@/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { availableQty } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { waLink } from "@/lib/catalog";
import { addDays, fmtDate, rupiah, todayStr } from "@/lib/utils";
import { rentalDays } from "@/lib/pricing";
import { AvailabilityBadge } from "../availability-badge";

const s = schema;
const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function KatalogDetail({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mulai?: string; selesai?: string }>;
}) {
  const { id } = await params;
  const { mulai, selesai } = await searchParams;
  const product = await db.query.products.findFirst({ where: eq(s.products.id, id) });
  if (!product) notFound();
  const [photos, settings] = await Promise.all([
    db.select().from(s.productPhotos).where(eq(s.productPhotos.productId, id)).orderBy(desc(s.productPhotos.isPrimary), asc(s.productPhotos.createdAt)),
    getSettings(),
  ]);

  const today = todayStr();
  const start = isDate(mulai) ? mulai! : today;
  const end = isDate(selesai) ? selesai! : addDays(start, settings.defaultRentDays);
  const checked = isDate(mulai) && isDate(selesai);
  let check: { ok: boolean; message: string } | null = null;
  if (checked) {
    if (start < today) check = { ok: false, message: "Tanggal mulai sudah lewat." };
    else if (end < start) check = { ok: false, message: "Tanggal kembali harus sesudah tanggal mulai." };
    else {
      const qty = await availableQty(db, id, start, end);
      check = qty > 0
        ? { ok: true, message: `Tersedia untuk ${fmtDate(start)} – ${fmtDate(end)} (${rentalDays(start, end)} hari).` }
        : { ok: false, message: `Maaf, sudah penuh untuk ${fmtDate(start)} – ${fmtDate(end)}. Coba tanggal lain.` };
    }
  }

  const days = rentalDays(start, end);
  const text = checked && check?.ok
    ? `Halo ${settings.storeName}, saya ingin menyewa "${product.name}" untuk tanggal ${fmtDate(start)} sampai ${fmtDate(end)} (${days} hari). Apakah bisa?`
    : `Halo ${settings.storeName}, saya tertarik dengan kebaya "${product.name}". Apakah masih tersedia?`;
  const wa = waLink(settings.phone, text);

  return (
    <>
      <Link href="/katalog" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Semua koleksi
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid content-start gap-3">
          {photos.length === 0 ? (
            <div className="flex aspect-[3/4] max-w-md items-center justify-center rounded-lg bg-muted"><Shirt className="size-16 text-muted-foreground opacity-40" /></div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {photos.map((ph) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={ph.id} src={ph.photoUrl} alt={product.name} className="aspect-[3/4] w-full rounded-lg border object-cover" />
              ))}
            </div>
          )}
        </div>
        <div className="grid content-start gap-4">
          <div className="grid gap-2">
            <h1 className="text-2xl font-semibold leading-tight">{product.name}</h1>
            {product.category && <p className="text-sm text-muted-foreground">{product.category}</p>}
            <p className="text-xl font-semibold">{rupiah(product.pricePerDay)}<span className="text-sm font-normal text-muted-foreground">/hari</span></p>
            <div><AvailabilityBadge status={product.status} available={product.stockAvailable} /></div>
          </div>
          <Card>
            <CardHeader><CardTitle>Cek tanggal sewa</CardTitle></CardHeader>
            <CardContent>
              <form className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ambil"><Input type="date" name="mulai" defaultValue={start} min={today} required /></Field>
                  <Field label="Kembali"><Input type="date" name="selesai" defaultValue={end} min={today} required /></Field>
                </div>
                <Button type="submit" variant="secondary">Cek ketersediaan</Button>
              </form>
              {check && (
                <p className={`mt-3 rounded-md p-3 text-sm ${check.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{check.message}</p>
              )}
              {checked && check?.ok && (
                <p className="mt-2 text-sm text-muted-foreground">Perkiraan biaya sewa: <span className="font-semibold text-foreground">{rupiah(product.pricePerDay * days)}</span></p>
              )}
            </CardContent>
          </Card>
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center rounded-md bg-emerald-600 px-4 font-medium text-white hover:bg-emerald-700">
              Pesan via WhatsApp
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Hubungi toko untuk memesan{settings.address ? ` di ${settings.address}` : ""}.</p>
          )}
          <p className="text-xs text-muted-foreground">Pesanan baru dianggap pasti setelah dikonfirmasi oleh toko.</p>
        </div>
      </div>
    </>
  );
}
