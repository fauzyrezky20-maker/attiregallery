import Link from "next/link";
import { inArray } from "drizzle-orm";
import { ChevronLeft, Shirt } from "lucide-react";
import { db, schema } from "@/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Empty } from "@/components/ui/table";
import { availableQty } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { waLink } from "@/lib/catalog";
import { fmtDate, rupiah, todayStr } from "@/lib/utils";
import { rentalDays, rentalEndDate, rentalPeriods, settleDeadline } from "@/lib/pricing";
import { ClearCartLink, RemoveFromCart, SyncCart } from "../cart";
import { GuideAndTerms, RentalInfo } from "../info";

export const metadata = { title: "Daftar pesanan" };

const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

function slots(from: string, until: string) {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const out: string[] = [];
  for (let m = toMin(from); m <= toMin(until); m += 30) out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  return out;
}

export default async function KatalogPesan({ searchParams }: {
  searchParams: Promise<{ items?: string; mulai?: string; selesai?: string; jam?: string; nama?: string; acara?: string }>;
}) {
  const sp = await searchParams;
  const ids = [...new Set((sp.items ?? "").split(",").map((x) => x.trim()).filter(Boolean))].slice(0, 20);
  const settings = await getSettings();
  const found = ids.length ? await db.select().from(schema.products).where(inArray(schema.products.id, ids)) : [];
  const items = ids.map((id) => found.find((p) => p.id === id)).filter((p) => !!p);
  const photos = items.length
    ? await db.select().from(schema.productPhotos).where(inArray(schema.productPhotos.productId, items.map((p) => p.id)))
    : [];
  const photoOf = new Map<string, string>();
  for (const ph of photos) if (ph.isPrimary || !photoOf.has(ph.productId)) photoOf.set(ph.productId, ph.photoUrl);

  const today = todayStr();
  const start = isDate(sp.mulai) ? sp.mulai! : today;
  const end = isDate(sp.selesai) ? sp.selesai! : rentalEndDate(start, settings.defaultRentDays);
  const checked = isDate(sp.mulai) && isDate(sp.selesai);
  const times = slots(settings.pickupFrom, settings.pickupUntil);
  const jam = sp.jam && times.includes(sp.jam) ? sp.jam : "";
  const days = rentalDays(start, end);
  const periods = rentalPeriods(days, settings.defaultRentDays);

  let dateError: string | null = null;
  if (checked && start < today) dateError = "Tanggal ambil sudah lewat.";
  else if (checked && end < start) dateError = "Tanggal kembali harus sesudah tanggal ambil.";
  const avail = new Map<string, boolean>();
  if (checked && !dateError) {
    for (const p of items) avail.set(p.id, (await availableQty(db, p.id, start, end)) > 0);
  }
  const allOk = checked && !dateError && items.length > 0 && items.every((p) => avail.get(p.id));
  const total = items.reduce((t, p) => t + p.pricePerDay * periods, 0);

  const lines = items.map((p, i) => `${i + 1}. ${p.name} (${rupiah(p.pricePerDay)}/${settings.defaultRentDays} hari)`);
  const text = [
    `Halo ${settings.storeName}, saya ingin menyewa ${items.length} item:`,
    ...lines,
    `Tanggal: ${fmtDate(start)} s.d. ${fmtDate(end)} (${days} hari)`,
    jam ? `Rencana ambil: pukul ${jam.replace(":", ".")}` : null,
    sp.nama ? `Nama: ${sp.nama}` : null,
    sp.acara ? `Acara / kampus: ${sp.acara}` : null,
    `Perkiraan total: ${rupiah(total)}`,
    `Saya siap DP ${rupiah(Math.min(settings.dpAmount, total))} untuk fix booking. Apakah bisa?`,
  ].filter(Boolean).join("\n");
  const wa = waLink(settings.phone, text);

  return (
    <>
      <SyncCart ids={items.map((p) => p.id)} />
      <Link href="/katalog" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Tambah item lain
      </Link>
      <h1 className="mb-4 text-2xl font-semibold">Daftar pesanan</h1>
      {items.length === 0 ? (
        <Empty>Belum ada item. Buka koleksi lalu tekan &quot;Tambah ke daftar pesanan&quot;.</Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader><CardTitle>{items.length} item</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y">
                {items.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-muted">
                      {photoOf.get(p.id) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoOf.get(p.id)} alt="" className="h-full w-full object-cover" />
                      ) : <Shirt className="m-auto mt-4 size-6 text-muted-foreground opacity-40" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/katalog/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                      <p className="text-xs text-muted-foreground">{rupiah(p.pricePerDay)}/{settings.defaultRentDays} hari</p>
                      {avail.has(p.id) && (
                        <p className={`text-xs font-medium ${avail.get(p.id) ? "text-emerald-700" : "text-destructive"}`}>{avail.get(p.id) ? "Tersedia" : "Penuh di tanggal ini"}</p>
                      )}
                    </div>
                    <span className="text-sm font-medium">{rupiah(p.pricePerDay * periods)}</span>
                    <RemoveFromCart id={p.id} mulai={sp.mulai} selesai={sp.selesai} />
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t pt-3 font-semibold"><span>Perkiraan total ({days} hari)</span><span>{rupiah(total)}</span></div>
              <p className="mt-1 text-xs text-muted-foreground">DP {rupiah(Math.min(settings.dpAmount, total))} untuk fix booking, sisanya lunas paling lambat {fmtDate(settleDeadline(start, settings.settleDaysBefore))}.</p>
            </CardContent>
          </Card>
          <div className="grid content-start gap-4">
            <Card>
              <CardHeader><CardTitle>Tanggal & data</CardTitle></CardHeader>
              <CardContent>
                <form className="grid gap-3">
                  <input type="hidden" name="items" value={items.map((p) => p.id).join(",")} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ambil"><Input type="date" name="mulai" defaultValue={start} min={today} required /></Field>
                    <Field label="Kembali"><Input type="date" name="selesai" defaultValue={end} min={today} required /></Field>
                  </div>
                  <Field label="Jam ambil" hint="Wajib konfirmasi ke WhatsApp">
                    <Select name="jam" defaultValue={jam}>
                      <option value="">Pilih jam</option>
                      {times.map((t) => <option key={t} value={t}>{t.replace(":", ".")}</option>)}
                    </Select>
                  </Field>
                  <Field label="Nama"><Input name="nama" defaultValue={sp.nama ?? ""} /></Field>
                  <Field label="Jenis acara / asal kampus"><Input name="acara" defaultValue={sp.acara ?? ""} placeholder="Mis. Wisuda UNHAS" /></Field>
                  <Button type="submit" variant="secondary">Cek ketersediaan</Button>
                </form>
                {dateError && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{dateError}</p>}
                {checked && !dateError && (
                  <p className={`mt-3 rounded-md p-3 text-sm ${allOk ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                    {allOk ? `Semua item tersedia untuk ${fmtDate(start)} – ${fmtDate(end)}.` : "Ada item yang penuh. Hapus item itu atau pilih tanggal lain."}
                  </p>
                )}
              </CardContent>
            </Card>
            {wa ? (
              allOk ? (
                <ClearCartLink href={wa} className="flex h-11 items-center justify-center rounded-md bg-emerald-600 px-4 font-medium text-white hover:bg-emerald-700">
                  Pesan {items.length} item via WhatsApp
                </ClearCartLink>
              ) : <p className="text-sm text-muted-foreground">Cek ketersediaan dulu, lalu tombol pesan via WhatsApp muncul.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Hubungi toko untuk memesan{settings.address ? ` di ${settings.address}` : ""}.</p>
            )}
            <RentalInfo s={settings} />
            <GuideAndTerms s={settings} />
          </div>
        </div>
      )}
    </>
  );
}
