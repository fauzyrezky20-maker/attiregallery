import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { ProductForm } from "../product-form";

export default async function ProdukBaru() {
  await requireUser("produk");
  const cats = await db.selectDistinct({ c: schema.products.category }).from(schema.products).orderBy(asc(schema.products.category));
  return (
    <>
      <PageHeader title="Tambah kebaya" back="/produk" />
      <Card className="max-w-xl"><CardContent className="pt-5 md:pt-5"><ProductForm product={null} categories={cats.map((c) => c.c).filter((c): c is string => !!c)} /></CardContent></Card>
    </>
  );
}
