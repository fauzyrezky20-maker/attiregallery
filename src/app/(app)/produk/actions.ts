"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { safeAction } from "@/lib/action";
import { requireUser } from "@/lib/session";
import { deleteUpload, saveUpload } from "@/lib/upload";
import { BizError } from "@/lib/orders";
import { str, toInt } from "@/lib/utils";

const { products, productPhotos, orderItems, orders } = schema;

async function savePhotos(productId: string, files: FormDataEntryValue[]) {
  const existing = await db.query.productPhotos.findFirst({ where: eq(productPhotos.productId, productId) });
  let first = !existing;
  for (const f of files) {
    const url = await saveUpload(f, "produk");
    if (!url) continue;
    await db.insert(productPhotos).values({ productId, photoUrl: url, isPrimary: first });
    first = false;
  }
}

export const saveProductAction = safeAction(async (fd) => {
  await requireUser("produk");
  const id = str(fd.get("id"));
  const name = str(fd.get("name"));
  if (!name) throw new BizError("Nama kebaya wajib diisi.");
  const stockTotal = Math.max(0, toInt(fd.get("stockTotal"), 1));
  const maintenance = fd.get("maintenance") === "on";
  const base = { name, category: str(fd.get("category")), pricePerDay: Math.max(0, toInt(fd.get("pricePerDay"))), stockTotal };

  if (id) {
    const p = await db.query.products.findFirst({ where: eq(products.id, id) });
    if (!p) throw new BizError("Produk tidak ditemukan.");
    const out = p.stockTotal - p.stockAvailable; // unit yang sedang disewa
    if (stockTotal < out) throw new BizError(`Jumlah unit tidak boleh kurang dari ${out} (sedang disewa).`);
    const stockAvailable = stockTotal - out;
    const status = maintenance ? "perawatan" : stockAvailable > 0 ? "tersedia" : "disewa";
    await db.update(products).set({ ...base, stockAvailable, status }).where(eq(products.id, id));
    await savePhotos(id, fd.getAll("photos"));
    revalidatePath("/", "layout");
    return { ok: "Produk diperbarui." };
  }
  const p = await db
    .insert(products)
    .values({ ...base, stockAvailable: stockTotal, status: maintenance ? "perawatan" : stockTotal > 0 ? "tersedia" : "disewa" })
    .returning()
    .get();
  await savePhotos(p.id, fd.getAll("photos"));
  revalidatePath("/", "layout");
  redirect(`/produk/${p.id}?baru=1`);
});

export const setPrimaryPhotoAction = safeAction(async (fd) => {
  await requireUser("produk");
  const photoId = String(fd.get("photoId"));
  const photo = await db.query.productPhotos.findFirst({ where: eq(productPhotos.id, photoId) });
  if (!photo) throw new BizError("Foto tidak ditemukan.");
  await db.transaction(async (tx) => {
    await tx.update(productPhotos).set({ isPrimary: false }).where(eq(productPhotos.productId, photo.productId)).run();
    await tx.update(productPhotos).set({ isPrimary: true }).where(eq(productPhotos.id, photoId)).run();
  });
  revalidatePath("/", "layout");
  return { ok: "Foto utama diganti." };
});

export const deletePhotoAction = safeAction(async (fd) => {
  await requireUser("produk");
  const photo = await db.query.productPhotos.findFirst({ where: eq(productPhotos.id, String(fd.get("photoId"))) });
  if (!photo) return { ok: "Foto sudah dihapus." };
  await db.delete(productPhotos).where(eq(productPhotos.id, photo.id));
  if (photo.isPrimary) {
    const next = await db.query.productPhotos.findFirst({ where: eq(productPhotos.productId, photo.productId) });
    if (next) await db.update(productPhotos).set({ isPrimary: true }).where(eq(productPhotos.id, next.id));
  }
  await deleteUpload(photo.photoUrl);
  revalidatePath("/", "layout");
  return { ok: "Foto dihapus." };
});

export const deleteProductAction = safeAction(async (fd) => {
  await requireUser("produk");
  const id = String(fd.get("id"));
  const used = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orderItems.productId, id)))
    .limit(1);
  if (used.length) throw new BizError("Kebaya ini sudah pernah disewa sehingga tidak bisa dihapus. Ubah statusnya atau jumlah unit menjadi 0.");
  const photos = await db.select().from(productPhotos).where(eq(productPhotos.productId, id));
  for (const ph of photos) await deleteUpload(ph.photoUrl);
  await db.delete(productPhotos).where(eq(productPhotos.productId, id));
  await db.delete(products).where(eq(products.id, id));
  revalidatePath("/", "layout");
  redirect("/produk");
});

