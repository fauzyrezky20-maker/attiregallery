"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { safeAction } from "@/lib/action";
import { cancelOrder, createOrder, markPickedUp, markReturned, recordPayment, updateOrderDetails, availableQty, BizError } from "@/lib/orders";
import { requireUser } from "@/lib/session";
import { saveUpload } from "@/lib/upload";
import { addDays, str, toInt, todayStr } from "@/lib/utils";
import type { PaymentMethod } from "@/db/schema";
import { PAYMENT_METHODS } from "@/db/schema";

function revalidateAll() {
  revalidatePath("/", "layout");
}

export const createOrderAction = safeAction(async (fd) => {
  const user = await requireUser("kasir");
  let customerId = str(fd.get("customerId"));
  if (!customerId || customerId === "__new") {
    const name = str(fd.get("newName"));
    if (!name) throw new BizError("Pilih pelanggan atau isi nama pelanggan baru.");
    const c = await db
      .insert(schema.customers)
      .values({ name, phone: str(fd.get("newPhone")), address: str(fd.get("newAddress")) })
      .returning()
      .get();
    customerId = c.id;
  }
  const items = JSON.parse(String(fd.get("items") ?? "[]")) as { productId: string; quantity: number }[];
  const rentalStart = String(fd.get("rentalStart"));
  const days = Math.max(1, toInt(fd.get("days"), 1));
  const method = String(fd.get("method") ?? "") as PaymentMethod | "";
  const amount = toInt(fd.get("payAmount"));
  const proofUrl = await saveUpload(fd.get("proof"), "bukti");
  const order = await createOrder({
    customerId,
    userId: user.id,
    rentalStart,
    rentalEnd: addDays(rentalStart, days),
    items: items.filter((i) => i.quantity > 0),
    discount: toInt(fd.get("discount")),
    notes: str(fd.get("notes")),
    agreeTerms: fd.get("agreeTerms") === "on",
    payment:
      method && PAYMENT_METHODS.includes(method) && amount > 0
        ? { method, amount, proofUrl, confirmed: fd.get("confirmed") === "on" }
        : null,
  });
  revalidateAll();
  if (method === "qris" && fd.get("confirmed") !== "on" && amount > 0) {
    const p = await db.query.payments.findFirst({ where: eq(schema.payments.orderId, order.id) });
    if (p) redirect(`/pembayaran/${p.id}/qris`);
  }
  redirect(`/pesanan/${order.id}/nota?baru=1`);
});

export async function checkAvailabilityAction(start: string, days: number) {
  await requireUser("kasir");
  const end = addDays(start, Math.max(1, days));
  const prods = await db.select({ id: schema.products.id }).from(schema.products);
  return Object.fromEntries(prods.map((p) => [p.id, availableQty(db, p.id, start, end)]));
}

export const pickupAction = safeAction(async (fd) => {
  await requireUser("pesanan");
  const id = String(fd.get("orderId"));
  markPickedUp(id);
  revalidateAll();
  redirect(`/pesanan/${id}?info=${encodeURIComponent("Kebaya sudah diambil. Pesanan sedang disewa.")}`);
});

export const returnAction = safeAction(async (fd) => {
  await requireUser("pesanan");
  const id = String(fd.get("orderId"));
  const { fine, lateDays } = await markReturned(id, str(fd.get("returnDate")) ?? todayStr());
  revalidateAll();
  const msg = fine > 0 ? `Kebaya kembali terlambat ${lateDays} hari. Denda ditambahkan ke tagihan.` : "Kebaya sudah kembali. Pesanan selesai.";
  redirect(`/pesanan/${id}?info=${encodeURIComponent(msg)}`);
});

export const cancelAction = safeAction(async (fd) => {
  await requireUser("pesanan");
  const id = String(fd.get("orderId"));
  cancelOrder(id);
  revalidateAll();
  redirect(`/pesanan/${id}?info=${encodeURIComponent("Pesanan dibatalkan.")}`);
});

export const updateOrderAction = safeAction(async (fd) => {
  await requireUser("pesanan");
  const rentalStart = String(fd.get("rentalStart"));
  updateOrderDetails(String(fd.get("orderId")), {
    rentalStart,
    rentalEnd: addDays(rentalStart, Math.max(1, toInt(fd.get("days"), 1))),
    discount: toInt(fd.get("discount")),
    notes: str(fd.get("notes")),
  });
  revalidateAll();
  return { ok: "Pesanan diperbarui." };
});

export const addPaymentAction = safeAction(async (fd) => {
  await requireUser("pembayaran");
  const orderId = String(fd.get("orderId"));
  const method = String(fd.get("method")) as PaymentMethod;
  if (!PAYMENT_METHODS.includes(method)) throw new BizError("Metode pembayaran tidak dikenal.");
  const proofUrl = await saveUpload(fd.get("proof"), "bukti");
  const p = db.transaction((tx) =>
    recordPayment(tx, orderId, {
      method,
      amount: toInt(fd.get("amount")),
      proofUrl,
      note: str(fd.get("note")),
      confirmed: fd.get("confirmed") === "on",
    }),
  );
  revalidateAll();
  if (method === "qris" && p.status === "pending") redirect(`/pembayaran/${p.id}/qris`);
  return { ok: p.status === "lunas" ? "Pembayaran dicatat lunas." : "Pembayaran dicatat, menunggu konfirmasi." };
});
