import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { paidAmount, pendingAmount } from "./orders";
import { payState, rentalDays, rentalPeriods, settleDeadline } from "./pricing";
import { getSettings } from "./settings";

const s = schema;

export async function getOrderDetail(id: string) {
  const order = await db.query.orders.findFirst({ where: eq(s.orders.id, id) });
  if (!order) return null;
  const [customer, items, pays, consent, staff, fittings, measures] = await Promise.all([
    db.query.customers.findFirst({ where: eq(s.customers.id, order.customerId) }),
    db
      .select({ id: s.orderItems.id, productId: s.orderItems.productId, quantity: s.orderItems.quantity, price: s.orderItems.price, name: s.products.name, category: s.products.category })
      .from(s.orderItems)
      .innerJoin(s.products, eq(s.products.id, s.orderItems.productId))
      .where(eq(s.orderItems.orderId, id)),
    db.select().from(s.payments).where(eq(s.payments.orderId, id)).orderBy(asc(s.payments.createdAt)),
    db.query.termsConsents.findFirst({ where: eq(s.termsConsents.orderId, id) }),
    order.userId ? db.query.users.findFirst({ where: eq(s.users.id, order.userId), columns: { name: true } }) : null,
    db.select().from(s.fittingSchedules).where(eq(s.fittingSchedules.orderId, id)).orderBy(desc(s.fittingSchedules.scheduledAt)),
    db.select().from(s.measurements).where(eq(s.measurements.orderId, id)).orderBy(desc(s.measurements.measuredAt)),
  ]);
  const settings = await getSettings();
  const days = rentalDays(order.rentalStart, order.rentalEnd);
  const periods = rentalPeriods(days, settings.defaultRentDays);
  const subtotal = items.reduce((t, i) => t + i.price * i.quantity * periods, 0);
  const paid = await paidAmount(db, id);
  const pending = await pendingAmount(db, id);
  const deposit = await db.query.customerDeposits.findFirst({ where: eq(s.customerDeposits.customerId, order.customerId) });
  return {
    order, customer: customer!, items, payments: pays, consent, staffName: staff?.name ?? null, fittings, measures,
    days, periods, subtotal, paid, pending, outstanding: Math.max(0, order.totalAmount - paid), depositBalance: deposit?.balance ?? 0,
    payState: payState(order.totalAmount, paid), settleBy: settleDeadline(order.rentalStart, settings.settleDaysBefore),
  };
}
