import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/table";
import { requireUser } from "@/lib/session";
import { fmtDate, rupiah } from "@/lib/utils";
import { ProductForm } from "../product-form";
import { deletePhotoAction, deleteProductAction, setPrimaryPhotoAction } from "../actions";

const s = schema;

export default async function ProdukDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("produk");
  const { id } = await params;
  const product = await db.query.products.findFirst({ where: eq(s.products.id, id) });
  if (!product) notFound();
  const [photos, cats, bookings] = await Promise.all([
    db.select().from(s.productPhotos).where(eq(s.productPhotos.productId, id)).orderBy(desc(s.productPhotos.isPrimary), asc(s.productPhotos.createdAt)),
    db.selectDistinct({ c: s.products.category }).from(s.products),
    db
      .select({ orderId: s.orders.id, status: s.orders.status, start: s.orders.rentalStart, end: s.orders.rentalEnd, qty: s.orderItems.quantity, customer: s.customers.name })
      .from(s.orderItems)
      .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
      .innerJoin(s.customers, eq(s.customers.id, s.orders.customerId))
      .where(and(eq(s.orderItems.productId, id), inArray(s.orders.status, ["baru", "disewa"])))
      .orderBy(asc(s.orders.rentalStart)),
  ]);

  return (
    <>
      <PageHeader title={product.name} description={`${product.category ?? "Tanpa kategori"} · ${rupiah(product.pricePerDay)}/hari`} back="/produk" />
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="grid gap-6 content-start">
          <Card>
            <CardHeader><CardTitle>Foto</CardTitle></CardHeader>
            <CardContent>
              {photos.length === 0 ? <Empty>Belum ada foto. Unggah lewat formulir di samping.</Empty> : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photos.map((ph) => (
                    <div key={ph.id} className="overflow-hidden rounded-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ph.photoUrl} alt="" className="aspect-[3/4] w-full object-cover" />
                      <div className="flex items-center justify-between gap-1 p-2">
                        {ph.isPrimary ? <span className="text-xs font-semibold text-primary">Foto utama</span> : (
                          <ActionForm action={setPrimaryPhotoAction}><input type="hidden" name="photoId" value={ph.id} /><SubmitButton size="sm" variant="ghost">Jadikan utama</SubmitButton></ActionForm>
                        )}
                        <ActionForm action={deletePhotoAction} confirm="Hapus foto ini?"><input type="hidden" name="photoId" value={ph.id} /><SubmitButton size="sm" variant="ghost" className="text-destructive">Hapus</SubmitButton></ActionForm>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Stok & ketersediaan</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={product.status} />
                <span>{product.stockAvailable} unit di toko · {product.stockTotal - product.stockAvailable} sedang disewa · total {product.stockTotal}</span>
              </div>
              <p className="font-medium">Jadwal sewa berjalan & mendatang</p>
              {bookings.length === 0 ? <p className="text-muted-foreground">Tidak ada.</p> : (
                <ul className="divide-y">
                  {bookings.map((b) => (
                    <li key={b.orderId} className="flex items-center justify-between py-2">
                      <Link href={`/pesanan/${b.orderId}`} className="hover:underline">{b.customer} · {fmtDate(b.start)} – {fmtDate(b.end)} ({b.qty} unit)</Link>
                      <StatusBadge status={b.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6 content-start">
          <Card>
            <CardHeader><CardTitle>Ubah data</CardTitle></CardHeader>
            <CardContent><ProductForm product={product} categories={cats.map((c) => c.c).filter((c): c is string => !!c)} /></CardContent>
          </Card>
          <ActionForm action={deleteProductAction} confirm="Hapus kebaya ini secara permanen?">
            <input type="hidden" name="id" value={product.id} />
            <SubmitButton variant="ghost" className="text-destructive">Hapus kebaya</SubmitButton>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
