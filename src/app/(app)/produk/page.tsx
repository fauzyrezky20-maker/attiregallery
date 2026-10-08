import Link from "next/link";
import { asc, eq, like, or, and, type SQL } from "drizzle-orm";
import { Plus, Shirt } from "lucide-react";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Empty } from "@/components/ui/table";
import { requireUser } from "@/lib/session";
import { rupiah } from "@/lib/utils";
import { PRODUCT_STATUS } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { KOLEKSI_KEBAYA } from "@/lib/koleksi";
import { importKoleksiAction } from "./actions";

const { products: p, productPhotos: ph } = schema;

export default async function ProdukPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; kategori?: string }> }) {
  await requireUser("produk");
  const { q = "", status = "", kategori = "" } = await searchParams;
  const conds: SQL[] = [];
  if (q) conds.push(or(like(p.name, `%${q}%`), like(p.category, `%${q}%`))!);
  if (status) conds.push(eq(p.status, status as (typeof PRODUCT_STATUS)[number]));
  if (kategori) conds.push(eq(p.category, kategori));
  const [rows, photos, cats] = await Promise.all([
    db.select().from(p).where(conds.length ? and(...conds) : undefined).orderBy(asc(p.name)),
    db.select().from(ph).where(eq(ph.isPrimary, true)),
    db.selectDistinct({ c: p.category }).from(p).orderBy(asc(p.category)),
  ]);
  const allNames = new Set((await db.select({ n: p.name }).from(p)).map((x) => x.n.trim().toLowerCase()));
  const missing = KOLEKSI_KEBAYA.filter((k) => !allNames.has(k.name.toLowerCase())).length;
  const photoOf = new Map(photos.map((x) => [x.productId, x.photoUrl]));
  const totals = rows.reduce((a, r) => ({ units: a.units + r.stockTotal, avail: a.avail + r.stockAvailable }), { units: 0, avail: 0 });

  return (
    <>
      <PageHeader
        title="Produk & Foto"
        description={`${rows.length} model · ${totals.avail} dari ${totals.units} unit ada di toko`}
        actions={<Button asChild><Link href="/produk/baru"><Plus /> Tambah kebaya</Link></Button>}
      />
      {missing > 0 && (
        <Card className="mb-4 p-4">
          <ActionForm action={importKoleksiAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 text-sm">
              <p className="font-medium">Impor koleksi dari Katalog Kebaya</p>
              <p className="text-muted-foreground">{missing} kebaya (Regular & Premium) beserta foto dan harga per 3 hari belum ada di daftar.</p>
              <label className="mt-1 flex items-center gap-2"><input type="checkbox" name="lain" className="size-4" /> Sertakan dress, baju bodo, jas, paket & aksesoris (tanpa foto)</label>
            </div>
            <SubmitButton>Impor sekarang</SubmitButton>
          </ActionForm>
        </Card>
      )}
      <form className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input name="q" defaultValue={q} placeholder="Cari kebaya…" className="sm:max-w-xs" />
        <Select name="kategori" defaultValue={kategori} className="sm:w-48">
          <option value="">Semua kategori</option>
          {cats.filter((c) => c.c).map((c) => <option key={c.c} value={c.c!}>{c.c}</option>)}
        </Select>
        <Select name="status" defaultValue={status} className="sm:w-40">
          <option value="">Semua status</option>
          {PRODUCT_STATUS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </Select>
        <Button type="submit" variant="secondary">Terapkan</Button>
      </form>
      {rows.length === 0 ? <Empty>Belum ada kebaya. Tambahkan koleksi pertama Anda.</Empty> : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rows.map((r) => (
            <Link key={r.id} href={`/produk/${r.id}`}>
              <Card className="overflow-hidden transition hover:border-primary">
                <div className="aspect-[3/4] bg-muted">
                  {photoOf.get(r.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoOf.get(r.id)} alt={r.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : <div className="flex h-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground"><Shirt className="size-8 opacity-40" />Belum ada foto</div>}
                </div>
                <div className="grid gap-1 p-3">
                  <p className="line-clamp-2 font-medium leading-tight">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.category ?? "-"}</p>
                  <p className="text-sm font-semibold">{rupiah(r.pricePerDay)}<span className="font-normal text-muted-foreground">/3 hari</span></p>
                  <div className="flex items-center justify-between gap-1">
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">{r.stockAvailable}/{r.stockTotal} unit</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
