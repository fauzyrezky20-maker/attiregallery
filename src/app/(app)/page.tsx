import Link from "next/link";
import { and, asc, eq, gt, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import { AlertTriangle, Banknote, CalendarClock, ClipboardList, PackageX } from "lucide-react";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { SalesChart } from "@/components/sales-chart";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/table";
import { getAllowedMenus, requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { dailySales, jakartaStart } from "@/lib/reports";
import { MENUS } from "@/lib/permissions";
import { addDays, diffDays, fmtDate, fmtTime, rupiah, todayStr } from "@/lib/utils";

const s = schema;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ ditolak?: string }> }) {
  const user = await requireUser("dasbor");
  const { ditolak } = await searchParams;
  const allowed = await getAllowedMenus(user.role);
  const settings = await getSettings();
  const today = todayStr();
  const remindUntil = addDays(today, settings.reminderDaysBefore);
  const canMoney = allowed.includes("laporan") || allowed.includes("pembayaran");

  const orderSel = { id: s.orders.id, start: s.orders.rentalStart, end: s.orders.rentalEnd, status: s.orders.status, customer: s.customers.name, phone: s.customers.phone };
  const paidSql = sql<number>`coalesce((select sum(p.amount) from payments p where p.order_id = ${s.orders.id} and p.status = 'lunas'), 0)`;

  const [todaySales, active, lowStock, chart, pickups, returns, fittings, unpaid] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${s.payments.amount}), 0)`, n: sql<number>`count(*)` }).from(s.payments)
      .where(and(eq(s.payments.status, "lunas"), gte(s.payments.paidAt, jakartaStart(today)), lt(s.payments.paidAt, jakartaStart(addDays(today, 1))))).get(),
    db.select({ status: s.orders.status, n: sql<number>`count(*)` }).from(s.orders).where(inArray(s.orders.status, ["baru", "disewa"])).groupBy(s.orders.status),
    db.select().from(s.products).where(or(lte(s.products.stockAvailable, settings.lowStockThreshold), eq(s.products.status, "perawatan"))).orderBy(asc(s.products.stockAvailable)).limit(8),
    canMoney ? dailySales(14) : Promise.resolve([]),
    settings.notifyPickup
      ? db.select(orderSel).from(s.orders).innerJoin(s.customers, eq(s.customers.id, s.orders.customerId)).where(and(eq(s.orders.status, "baru"), lte(s.orders.rentalStart, remindUntil))).orderBy(asc(s.orders.rentalStart))
      : Promise.resolve([]),
    settings.notifyReturn
      ? db.select(orderSel).from(s.orders).innerJoin(s.customers, eq(s.customers.id, s.orders.customerId)).where(and(eq(s.orders.status, "disewa"), lte(s.orders.rentalEnd, remindUntil))).orderBy(asc(s.orders.rentalEnd))
      : Promise.resolve([]),
    db.select({ id: s.fittingSchedules.id, at: s.fittingSchedules.scheduledAt, customer: s.customers.name, customerId: s.customers.id }).from(s.fittingSchedules)
      .innerJoin(s.customers, eq(s.customers.id, s.fittingSchedules.customerId))
      .where(and(eq(s.fittingSchedules.status, "terjadwal"), gte(s.fittingSchedules.scheduledAt, jakartaStart(today)), lt(s.fittingSchedules.scheduledAt, jakartaStart(addDays(today, 1)))))
      .orderBy(asc(s.fittingSchedules.scheduledAt)),
    settings.notifyPayment
      ? db.select({ id: s.orders.id, customer: s.customers.name, rest: sql<number>`${s.orders.totalAmount} - ${paidSql}` }).from(s.orders)
          .innerJoin(s.customers, eq(s.customers.id, s.orders.customerId))
          .where(and(inArray(s.orders.status, ["baru", "disewa", "selesai"]), gt(sql`${s.orders.totalAmount} - ${paidSql}`, 0))).limit(10)
      : Promise.resolve([]),
  ]);
  const nBaru = Number(active.find((a) => a.status === "baru")?.n ?? 0);
  const nDisewa = Number(active.find((a) => a.status === "disewa")?.n ?? 0);
  const deniedLabel = ditolak ? MENUS.find((m) => m.key === ditolak)?.label : null;
  const week = chart.slice(-7).reduce((t, d) => t + d.total, 0);

  return (
    <>
      <PageHeader title={`Halo, ${user.name.split(" ")[0]} 👋`} description={new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" }).format(new Date())}
        actions={allowed.includes("kasir") && <Button asChild size="lg"><Link href="/kasir">Buka Kasir</Link></Button>} />
      {deniedLabel && <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Anda tidak punya akses ke menu {deniedLabel}. Hubungi pemilik toko.</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {canMoney && (
          <Card><CardContent className="pt-4 md:pt-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Banknote className="size-4" />Penjualan hari ini</div><p className="mt-1 text-2xl font-semibold">{rupiah(Number(todaySales?.total))}</p><p className="text-xs text-muted-foreground">{Number(todaySales?.n)} pembayaran masuk</p></CardContent></Card>
        )}
        <Card><CardContent className="pt-4 md:pt-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><ClipboardList className="size-4" />Pesanan aktif</div><p className="mt-1 text-2xl font-semibold">{nBaru + nDisewa}</p><p className="text-xs text-muted-foreground">{nBaru} menunggu diambil · {nDisewa} sedang disewa</p></CardContent></Card>
        <Card><CardContent className="pt-4 md:pt-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarClock className="size-4" />Fitting hari ini</div><p className="mt-1 text-2xl font-semibold">{fittings.length}</p><p className="text-xs text-muted-foreground">{fittings[0] ? `Berikutnya ${fmtTime(fittings[0].at)}` : "Tidak ada jadwal"}</p></CardContent></Card>
        <Card><CardContent className="pt-4 md:pt-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><PackageX className="size-4" />Stok menipis</div><p className="mt-1 text-2xl font-semibold">{lowStock.length}</p><p className="text-xs text-muted-foreground">model perlu dicek</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 content-start lg:col-span-2">
          {canMoney && (
            <Card>
              <CardHeader><CardTitle>Grafik penjualan 14 hari</CardTitle><CardDescription>7 hari terakhir: {rupiah(week)}</CardDescription></CardHeader>
              <CardContent><SalesChart data={chart} /></CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Pengingat ambil & kembali</CardTitle><CardDescription>Sampai {fmtDate(remindUntil)}</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Akan diambil</p>
                {pickups.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada.</p> : (
                  <ul className="divide-y text-sm">{pickups.map((o) => <li key={o.id} className="flex justify-between gap-2 py-2"><Link className="hover:underline" href={`/pesanan/${o.id}`}>{o.customer}</Link><span className={o.start < today ? "text-destructive" : "text-muted-foreground"}>{o.start === today ? "Hari ini" : fmtDate(o.start)}</span></li>)}</ul>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Harus kembali</p>
                {returns.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada.</p> : (
                  <ul className="divide-y text-sm">{returns.map((o) => {
                    const late = diffDays(o.end, today);
                    return <li key={o.id} className="flex justify-between gap-2 py-2"><Link className="hover:underline" href={`/pesanan/${o.id}`}>{o.customer}</Link><span className={late > 0 ? "flex items-center gap-1 text-destructive" : "text-muted-foreground"}>{late > 0 ? <><AlertTriangle className="size-3.5" />Telat {late} hari</> : o.end === today ? "Hari ini" : fmtDate(o.end)}</span></li>;
                  })}</ul>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6 content-start">
          {fittings.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Fitting hari ini</CardTitle></CardHeader>
              <CardContent><ul className="divide-y text-sm">{fittings.map((f) => <li key={f.id} className="flex justify-between py-2"><Link href={`/pelanggan/${f.customerId}`} className="hover:underline">{f.customer}</Link><span>{fmtTime(f.at)}</span></li>)}</ul></CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Stok menipis / perawatan</CardTitle></CardHeader>
            <CardContent>
              {lowStock.length === 0 ? <Empty>Semua stok aman.</Empty> : (
                <ul className="divide-y text-sm">{lowStock.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 py-2"><Link href={`/produk/${p.id}`} className="truncate hover:underline">{p.name}</Link><span className="flex items-center gap-2 whitespace-nowrap"><span className="text-muted-foreground">{p.stockAvailable}/{p.stockTotal}</span><StatusBadge status={p.status} /></span></li>)}</ul>
              )}
            </CardContent>
          </Card>
          {canMoney && unpaid.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Tagihan belum lunas</CardTitle></CardHeader>
              <CardContent><ul className="divide-y text-sm">{unpaid.map((o) => <li key={o.id} className="flex justify-between gap-2 py-2"><Link href={`/pesanan/${o.id}`} className="hover:underline">{o.customer}</Link><span className="text-destructive">{rupiah(Number(o.rest))}</span></li>)}</ul></CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
