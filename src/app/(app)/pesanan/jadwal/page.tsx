import Link from "next/link";
import { and, asc, eq, gte, lt, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/table";
import { requireUser } from "@/lib/session";
import { addDays, diffDays, fmtDate } from "@/lib/utils";
import { todayStr } from "@/lib/utils";

const { orders, customers } = schema;

async function list(where: ReturnType<typeof and>, by: "start" | "end") {
  return db
    .select({ id: orders.id, status: orders.status, start: orders.rentalStart, end: orders.rentalEnd, customer: customers.name, phone: customers.phone })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(where)
    .orderBy(asc(by === "start" ? orders.rentalStart : orders.rentalEnd));
}

type Row = Awaited<ReturnType<typeof list>>[number];

function Section({ title, rows, kind, today }: { title: string; rows: Row[]; kind: "ambil" | "kembali"; today: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title} <span className="text-muted-foreground">({rows.length})</span></CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <Empty>Tidak ada.</Empty> : (
          <ul className="divide-y">
            {rows.map((r) => {
              const date = kind === "ambil" ? r.start : r.end;
              const late = kind === "kembali" ? diffDays(r.end, today) : 0;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/pesanan/${r.id}`} className="font-medium hover:underline">{r.customer}</Link>
                    <p className="text-xs text-muted-foreground">{r.phone} · {fmtDate(date)}{late > 0 && <span className="text-destructive"> · terlambat {late} hari</span>}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function JadwalPage() {
  await requireUser("pesanan");
  const today = todayStr();
  const week = addDays(today, 7);
  const [pickToday, retToday, overdue, pickSoon, retSoon] = await Promise.all([
    list(and(eq(orders.status, "baru"), lte(orders.rentalStart, today)), "start"),
    list(and(eq(orders.status, "disewa"), eq(orders.rentalEnd, today)), "end"),
    list(and(eq(orders.status, "disewa"), lt(orders.rentalEnd, today)), "end"),
    list(and(eq(orders.status, "baru"), gte(orders.rentalStart, addDays(today, 1)), lte(orders.rentalStart, week)), "start"),
    list(and(eq(orders.status, "disewa"), gte(orders.rentalEnd, addDays(today, 1)), lte(orders.rentalEnd, week)), "end"),
  ]);
  return (
    <>
      <PageHeader title="Jadwal Ambil & Kembali" description={`Hari ini, ${fmtDate(today)}`} back="/pesanan" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Diambil hari ini" rows={pickToday} kind="ambil" today={today} />
        <Section title="Kembali hari ini" rows={retToday} kind="kembali" today={today} />
        <Section title="⚠️ Terlambat kembali" rows={overdue} kind="kembali" today={today} />
        <Section title="Diambil 7 hari ke depan" rows={pickSoon} kind="ambil" today={today} />
        <Section title="Kembali 7 hari ke depan" rows={retSoon} kind="kembali" today={today} />
      </div>
    </>
  );
}
