import "server-only";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { PaymentMethod } from "@/db/schema";
import { calcFine, calcSubtotal, calcTotal, rentalDays } from "./pricing";
import { getSettings } from "./settings";
import { todayStr } from "./utils";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const { orders, orderItems, products, payments, customerDeposits, depositTransactions, termsConsents } = schema;

export class BizError extends Error {}

/** Jumlah unit yang masih bisa disewa untuk rentang tanggal tertentu (memperhitungkan pesanan lain). */
export function availableQty(tx: Tx | typeof db, productId: string, start: string, end: string, excludeOrderId?: string) {
  const p = tx.select().from(products).where(eq(products.id, productId)).get();
  if (!p || p.status === "perawatan") return 0;
  const booked = tx
    .select({ qty: sql<number>`coalesce(sum(${orderItems.quantity}), 0)` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orderItems.productId, productId),
        inArray(orders.status, ["baru", "disewa"]),
        lte(orders.rentalStart, end),
        gte(orders.rentalEnd, start),
        excludeOrderId ? sql`${orders.id} <> ${excludeOrderId}` : undefined,
      ),
    )
    .get();
  return Math.max(0, p.stockTotal - Number(booked?.qty ?? 0));
}

/** Perbarui status produk berdasarkan stok yang ada di toko. */
function syncProductStatus(tx: Tx, productId: string) {
  const p = tx.select().from(products).where(eq(products.id, productId)).get();
  if (!p || p.status === "perawatan") return;
  const status = p.stockAvailable > 0 ? "tersedia" : "disewa";
  if (status !== p.status) tx.update(products).set({ status }).where(eq(products.id, productId)).run();
}

export function paidAmount(tx: Tx | typeof db, orderId: string) {
  const r = tx
    .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.status, "lunas")))
    .get();
  return Number(r?.total ?? 0);
}

export function pendingAmount(tx: Tx | typeof db, orderId: string) {
  const r = tx
    .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.status, "pending")))
    .get();
  return Number(r?.total ?? 0);
}

/** Pakai saldo tabungan pelanggan (dalam transaksi). */
export function spendDeposit(tx: Tx, customerId: string, amount: number, orderId: string | null, note: string) {
  const dep = tx.select().from(customerDeposits).where(eq(customerDeposits.customerId, customerId)).get();
  if (!dep || dep.balance < amount) throw new BizError("Saldo tabungan pelanggan tidak cukup.");
  tx.update(customerDeposits).set({ balance: dep.balance - amount }).where(eq(customerDeposits.id, dep.id)).run();
  tx.insert(depositTransactions).values({ customerId, orderId, type: "pakai", amount, note }).run();
}

export function topUpDeposit(tx: Tx, customerId: string, amount: number, note: string | null) {
  if (amount <= 0) throw new BizError("Nominal setoran harus lebih dari 0.");
  const dep = tx.select().from(customerDeposits).where(eq(customerDeposits.customerId, customerId)).get();
  if (dep) tx.update(customerDeposits).set({ balance: dep.balance + amount }).where(eq(customerDeposits.id, dep.id)).run();
  else tx.insert(customerDeposits).values({ customerId, balance: amount }).run();
  tx.insert(depositTransactions).values({ customerId, type: "setor", amount, note }).run();
}

export type PaymentInput = { method: PaymentMethod; amount: number; proofUrl?: string | null; note?: string | null };

/**
 * Catat pembayaran. Tunai & tabungan langsung lunas; QRIS & transfer menunggu konfirmasi
 * kecuali `confirmed` (mis. kasir sudah melihat notifikasi dana masuk).
 */
export function recordPayment(tx: Tx, orderId: string, p: PaymentInput & { confirmed?: boolean }) {
  if (p.amount <= 0) throw new BizError("Nominal pembayaran harus lebih dari 0.");
  const order = tx.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) throw new BizError("Pesanan tidak ditemukan.");
  const outstanding = order.totalAmount - paidAmount(tx, orderId) - pendingAmount(tx, orderId);
  if (p.method === "tabungan") {
    if (p.amount > outstanding) throw new BizError("Pemakaian saldo melebihi sisa tagihan.");
    spendDeposit(tx, order.customerId, p.amount, orderId, "Bayar pesanan");
  }
  const lunas = p.method === "tunai" || p.method === "tabungan" || p.confirmed;
  return tx
    .insert(payments)
    .values({
      orderId,
      method: p.method,
      amount: p.amount,
      status: lunas ? "lunas" : "pending",
      proofUrl: p.proofUrl ?? null,
      note: p.note ?? null,
      paidAt: lunas ? new Date() : null,
    })
    .returning()
    .get();
}

export type NewOrderInput = {
  customerId: string;
  userId: string;
  rentalStart: string;
  rentalEnd: string;
  items: { productId: string; quantity: number }[];
  discount: number;
  notes: string | null;
  agreeTerms: boolean;
  payment: (PaymentInput & { confirmed?: boolean }) | null;
};

export async function createOrder(input: NewOrderInput) {
  const settings = await getSettings();
  if (!input.items.length) throw new BizError("Pilih minimal satu kebaya.");
  if (input.rentalEnd < input.rentalStart) throw new BizError("Tanggal kembali tidak boleh sebelum tanggal ambil.");
  if (!input.agreeTerms) throw new BizError("Pelanggan harus menyetujui Syarat & Ketentuan sewa.");

  return db.transaction((tx) => {
    const lines = input.items.map((it) => {
      const p = tx.select().from(products).where(eq(products.id, it.productId)).get();
      if (!p) throw new BizError("Produk tidak ditemukan.");
      const avail = availableQty(tx, p.id, input.rentalStart, input.rentalEnd);
      if (it.quantity > avail) throw new BizError(`Stok "${p.name}" untuk tanggal tersebut tinggal ${avail}.`);
      return { productId: p.id, quantity: it.quantity, price: p.pricePerDay };
    });
    const days = rentalDays(input.rentalStart, input.rentalEnd);
    const subtotal = calcSubtotal(lines, days);
    const discount = Math.min(Math.max(0, input.discount), subtotal);
    const order = tx
      .insert(orders)
      .values({
        customerId: input.customerId,
        userId: input.userId,
        rentalStart: input.rentalStart,
        rentalEnd: input.rentalEnd,
        discount,
        fine: 0,
        totalAmount: calcTotal(subtotal, discount, 0),
        notes: input.notes,
      })
      .returning()
      .get();
    for (const l of lines) tx.insert(orderItems).values({ ...l, orderId: order.id }).run();
    tx.insert(termsConsents).values({ orderId: order.id, customerId: input.customerId, termsVersion: settings.termsVersion }).run();
    if (input.payment && input.payment.amount > 0) recordPayment(tx, order.id, input.payment);
    return order;
  });
}

export function orderSubtotal(items: { price: number; quantity: number }[], start: string, end: string) {
  return calcSubtotal(items, rentalDays(start, end));
}

/** Kebaya diambil pelanggan → stok di toko berkurang. */
export function markPickedUp(orderId: string) {
  return db.transaction((tx) => {
    const o = tx.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!o || o.status !== "baru") throw new BizError("Hanya pesanan berstatus Baru yang bisa ditandai diambil.");
    const items = tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
    for (const it of items) {
      const p = tx.select().from(products).where(eq(products.id, it.productId)).get()!;
      if (p.stockAvailable < it.quantity) throw new BizError(`Unit "${p.name}" di toko tidak cukup (tersisa ${p.stockAvailable}).`);
      tx.update(products).set({ stockAvailable: p.stockAvailable - it.quantity }).where(eq(products.id, p.id)).run();
      syncProductStatus(tx, p.id);
    }
    tx.update(orders).set({ status: "disewa" }).where(eq(orders.id, orderId)).run();
  });
}

/** Kebaya dikembalikan → hitung denda keterlambatan, stok kembali. */
export async function markReturned(orderId: string, returnDate = todayStr()) {
  const settings = await getSettings();
  return db.transaction((tx) => {
    const o = tx.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!o || o.status !== "disewa") throw new BizError("Hanya pesanan yang sedang disewa yang bisa ditandai kembali.");
    const items = tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
    for (const it of items) {
      const p = tx.select().from(products).where(eq(products.id, it.productId)).get()!;
      tx.update(products)
        .set({ stockAvailable: Math.min(p.stockTotal, p.stockAvailable + it.quantity) })
        .where(eq(products.id, p.id))
        .run();
      syncProductStatus(tx, p.id);
    }
    const { fine, lateDays } = calcFine(o.rentalEnd, returnDate, settings.finePerDay);
    const subtotal = orderSubtotal(items, o.rentalStart, o.rentalEnd);
    tx.update(orders)
      .set({ status: "selesai", returnedAt: returnDate, fine, totalAmount: calcTotal(subtotal, o.discount, fine) })
      .where(eq(orders.id, orderId))
      .run();
    return { fine, lateDays };
  });
}

export function cancelOrder(orderId: string) {
  return db.transaction((tx) => {
    const o = tx.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!o || o.status !== "baru") throw new BizError("Hanya pesanan berstatus Baru yang bisa dibatalkan.");
    tx.update(orders).set({ status: "dibatalkan" }).where(eq(orders.id, orderId)).run();
    tx.update(payments).set({ status: "gagal" }).where(and(eq(payments.orderId, orderId), eq(payments.status, "pending"))).run();
  });
}

/** Ubah tanggal/diskon/catatan pesanan yang belum selesai; total dihitung ulang. */
export function updateOrderDetails(orderId: string, data: { rentalStart: string; rentalEnd: string; discount: number; notes: string | null }) {
  return db.transaction((tx) => {
    const o = tx.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!o) throw new BizError("Pesanan tidak ditemukan.");
    if (o.status === "selesai" || o.status === "dibatalkan") throw new BizError("Pesanan yang sudah selesai/dibatalkan tidak bisa diubah.");
    if (data.rentalEnd < data.rentalStart) throw new BizError("Tanggal kembali tidak boleh sebelum tanggal ambil.");
    const items = tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
    for (const it of items) {
      const avail = availableQty(tx, it.productId, data.rentalStart, data.rentalEnd, orderId);
      if (it.quantity > avail) throw new BizError("Stok kebaya tidak cukup untuk tanggal baru tersebut.");
    }
    const subtotal = orderSubtotal(items, data.rentalStart, data.rentalEnd);
    const discount = Math.min(Math.max(0, data.discount), subtotal);
    tx.update(orders)
      .set({ ...data, discount, totalAmount: calcTotal(subtotal, discount, o.fine) })
      .where(eq(orders.id, orderId))
      .run();
  });
}
