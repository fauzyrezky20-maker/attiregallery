import Link from "next/link";
import { and, asc, eq, like, or, type SQL } from "drizzle-orm";
import { Shirt } from "lucide-react";
import { db, schema } from "@/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Empty } from "@/components/ui/table";
import { rupiah } from "@/lib/utils";
import { AvailabilityBadge } from "./availability-badge";
import { getSettings } from "@/lib/settings";
import { GuideAndTerms, RentalInfo } from "./info";

const { products: p, productPhotos: ph } = schema;

export default async function KatalogPage({ searchParams }: { searchParams: Promise<{ q?: string; kategori?: string }> }) {
  const { q = "", kategori = "" } = await searchParams;
  const conds: SQL[] = [];
  if (q) conds.push(or(like(p.name, `%${q}%`), like(p.category, `%${q}%`))!);
  if (kategori) conds.push(eq(p.category, kategori));
  const [rows, photos, cats, settings] = await Promise.all([
    db.select().from(p).where(conds.length ? and(...conds) : undefined).orderBy(asc(p.name)),
    db.select().from(ph).where(eq(ph.isPrimary, true)),
    db.selectDistinct({ c: p.category }).from(p).orderBy(asc(p.category)),
    getSettings(),
  ]);
  const photoOf = new Map(photos.map((x) => [x.productId, x.photoUrl]));

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Koleksi kebaya</h1>
      <p className="mb-4 text-sm text-muted-foreground">Pilih satu atau beberapa item, cek tanggal sewa, lalu pesan lewat WhatsApp.</p>
      <div className="mb-5 grid gap-2 md:grid-cols-2">
        <RentalInfo s={settings} />
        <GuideAndTerms s={settings} />
      </div>
      <form className="mb-5 flex flex-col gap-2 sm:flex-row">
        <Input name="q" defaultValue={q} placeholder="Cari kebaya…" className="sm:max-w-xs" />
        <Select name="kategori" defaultValue={kategori} className="sm:w-56">
          <option value="">Semua kategori</option>
          {cats.filter((c) => c.c).map((c) => <option key={c.c} value={c.c!}>{c.c}</option>)}
        </Select>
        <Button type="submit" variant="secondary">Cari</Button>
      </form>
      {rows.length === 0 ? <Empty>{q || kategori ? "Tidak ada kebaya yang cocok." : "Koleksi belum tersedia."}</Empty> : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((r) => (
            <Link key={r.id} href={`/katalog/${r.id}`}>
              <Card className="h-full overflow-hidden transition hover:border-primary">
                <div className="aspect-[3/4] bg-muted">
                  {photoOf.get(r.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoOf.get(r.id)} alt={r.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : <div className="flex h-full items-center justify-center"><Shirt className="size-10 text-muted-foreground opacity-40" /></div>}
                </div>
                <div className="grid gap-1 p-3">
                  <p className="line-clamp-2 font-medium leading-tight">{r.name}</p>
                  {r.category && <p className="text-xs text-muted-foreground">{r.category}</p>}
                  <p className="text-sm font-semibold">{rupiah(r.pricePerDay)}<span className="font-normal text-muted-foreground">/{settings.defaultRentDays} hari</span></p>
                  <div><AvailabilityBadge status={r.status} available={r.stockAvailable} /></div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
