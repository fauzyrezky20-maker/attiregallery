import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { todayStr } from "@/lib/utils";
import { KasirForm } from "./kasir-form";
import { availableQty } from "@/lib/orders";
import { rentalEndDate } from "@/lib/pricing";

export default async function KasirPage({ searchParams }: { searchParams: Promise<{ pelanggan?: string }> }) {
  await requireUser("kasir");
  const sp = await searchParams;
  const settings = await getSettings();
  const customers = await db
    .select({ id: schema.customers.id, name: schema.customers.name, phone: schema.customers.phone, eventType: schema.customers.eventType, campus: schema.customers.campus })
    .from(schema.customers)
    .orderBy(asc(schema.customers.name));
  const products = await db.query.products.findMany({
    orderBy: asc(schema.products.name),
  });
  const photos = await db.select().from(schema.productPhotos).where(eq(schema.productPhotos.isPrimary, true));
  const photoOf = new Map(photos.map((p) => [p.productId, p.photoUrl]));
  const today = todayStr();
  const end = rentalEndDate(today, settings.defaultRentDays);

  return (
    <>
      <PageHeader title="Kasir" description="Transaksi sewa baru: pilih pelanggan dan satu atau beberapa item, total dihitung otomatis." />
      <KasirForm
        today={today}
        defaultDays={settings.defaultRentDays}
        initialCustomerId={sp.pelanggan ?? ""}
        customers={customers}
        products={await Promise.all(products.map(async (p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.pricePerDay,
          status: p.status,
          photo: photoOf.get(p.id) ?? null,
          available: await availableQty(db, p.id, today, end),
        })))}
        terms={{ text: settings.termsText ?? "", version: settings.termsVersion }}
        guide={settings.rentalGuide}
        dpAmount={settings.dpAmount}
        settleDaysBefore={settings.settleDaysBefore}
        pickup={{ from: settings.pickupFrom, until: settings.pickupUntil }}
        methods={{ tunai: settings.cashEnabled, qris: settings.qrisEnabled && !!settings.qrisPayload, transfer: settings.transferEnabled }}
        transferInfo={settings.transferInfo}
      />
    </>
  );
}
