import "server-only";
import { and, asc, between, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { addDays, todayStr } from "./utils";

const { payments, orders, customers, expenses } = schema;

export const jakartaStart = (d: string) => new Date(d + "T00:00:00+07:00");

export type Period = "hari" | "minggu" | "bulan" | "kustom";

/** Hitung rentang tanggal (inklusif) dari pilihan periode. */
export function resolvePeriod(period: Period, ref = todayStr(), from?: string, to?: string) {
  if (period === "kustom" && from && to) return from <= to ? { from, to } : { from: to, to: from };
  if (period === "minggu") {
    const dow = (new Date(ref + "T00:00:00Z").getUTCDay() + 6) % 7; // Senin = 0
    const start = addDays(ref, -dow);
    return { from: start, to: addDays(start, 6) };
  }
  if (period === "bulan") {
    const start = ref.slice(0, 8) + "01";
    const next = new Date(start + "T00:00:00Z");
    next.setUTCMonth(next.getUTCMonth() + 1);
    return { from: start, to: addDays(next.toISOString().slice(0, 10), -1) };
  }
  return { from: ref, to: ref };
}

const dayExpr = sql<string>`date(${payments.paidAt} / 1000, 'unixepoch', '+7 hours')`;

export async function financeReport(from: string, to: string) {
  const start = jakartaStart(from);
  const end = jakartaStart(addDays(to, 1));
  const paidInRange = and(eq(payments.status, "lunas"), gte(payments.paidAt, start), lt(payments.paidAt, end));

  const [incomeByMethod, incomeByDay, expenseRows, expenseByDay, sales] = await Promise.all([
    db.select({ method: payments.method, total: sql<number>`sum(${payments.amount})`, count: sql<number>`count(*)` }).from(payments).where(paidInRange).groupBy(payments.method),
    db.select({ day: dayExpr, total: sql<number>`sum(${payments.amount})` }).from(payments).where(paidInRange).groupBy(dayExpr),
    db.select().from(expenses).where(between(expenses.date, from, to)).orderBy(desc(expenses.date), desc(expenses.createdAt)),
    db.select({ day: expenses.date, total: sql<number>`sum(${expenses.amount})` }).from(expenses).where(between(expenses.date, from, to)).groupBy(expenses.date),
    db
      .select({
        id: payments.id, paidAt: payments.paidAt, method: payments.method, amount: payments.amount, orderId: orders.id,
        customer: customers.name, orderStatus: orders.status,
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(paidInRange)
      .orderBy(asc(payments.paidAt)),
  ]);

  const income = incomeByMethod.reduce((s, r) => s + Number(r.total), 0);
  const expense = expenseRows.reduce((s, r) => s + r.amount, 0);
  const expenseByCategory = Object.entries(
    expenseRows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.category]: (acc[r.category] ?? 0) + r.amount }), {}),
  ).sort((a, b) => b[1] - a[1]);

  const inc = new Map(incomeByDay.map((r) => [r.day, Number(r.total)]));
  const exp = new Map(expenseByDay.map((r) => [r.day, Number(r.total)]));
  const daily: { day: string; income: number; expense: number }[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const i = inc.get(d) ?? 0;
    const e = exp.get(d) ?? 0;
    daily.push({ day: d, income: i, expense: e });
  }

  return {
    from, to, income, expense,
    incomeByMethod: incomeByMethod.map((r) => ({ ...r, total: Number(r.total), count: Number(r.count) })),
    expenseByCategory, expenseRows, daily, sales,
  };
}

/** Pemasukan per hari untuk N hari terakhir (grafik dasbor). */
export async function dailySales(days: number) {
  const today = todayStr();
  const from = addDays(today, -(days - 1));
  const rows = await db
    .select({ day: dayExpr, total: sql<number>`sum(${payments.amount})` })
    .from(payments)
    .where(and(eq(payments.status, "lunas"), gte(payments.paidAt, jakartaStart(from))))
    .groupBy(dayExpr);
  const m = new Map(rows.map((r) => [r.day, Number(r.total)]));
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(from, i);
    return { day: d, total: m.get(d) ?? 0 };
  });
}
