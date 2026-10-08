import { addDays, diffDays } from "./utils";

/** Lama sewa (hari) dihitung inklusif: hari ambil s.d. hari kembali; minimal 1 hari. */
export function rentalDays(start: string, end: string) {
  return Math.max(1, diffDays(start, end) + 1);
}

/** Tanggal kembali untuk lama sewa `days` hari (hari ambil dihitung hari pertama). */
export function rentalEndDate(start: string, days: number) {
  return addDays(start, Math.max(1, days) - 1);
}

/** Harga sewa berlaku per paket (mis. 3 hari). Sewa lebih lama dihitung kelipatan paket. */
export function rentalPeriods(days: number, packageDays: number) {
  return Math.max(1, Math.ceil(days / Math.max(1, packageDays)));
}

export function calcSubtotal(items: { price: number; quantity: number }[], periods: number) {
  return items.reduce((sum, it) => sum + it.price * it.quantity * periods, 0);
}

/** Denda per hari terlambat = harga sewa baju (seluruh item pesanan). */
export function calcFine(rentalEnd: string, returnDate: string, items: { price: number; quantity: number }[]) {
  const late = Math.max(0, diffDays(rentalEnd, returnDate));
  const perDay = items.reduce((t, it) => t + it.price * it.quantity, 0);
  return { lateDays: late, fine: late * perDay, perDay };
}

export function calcTotal(subtotal: number, discount: number, fine: number) {
  return Math.max(0, subtotal - Math.min(discount, subtotal)) + fine;
}

/** Batas pelunasan: H-n sebelum tanggal ambil. */
export function settleDeadline(rentalStart: string, daysBefore: number) {
  return addDays(rentalStart, -Math.max(0, daysBefore));
}

export type PayState = "belum_dp" | "dp" | "lunas";

/** Status bayar pesanan: belum DP, sudah DP (fix booking), atau lunas. */
export function payState(total: number, paid: number): PayState {
  if (paid >= total) return "lunas";
  return paid > 0 ? "dp" : "belum_dp";
}
