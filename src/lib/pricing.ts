import { diffDays } from "./utils";

/** Lama sewa (hari) dari tanggal ambil s.d. tanggal kembali; minimal 1 hari. */
export function rentalDays(start: string, end: string) {
  return Math.max(1, diffDays(start, end));
}

export function calcSubtotal(items: { price: number; quantity: number }[], days: number) {
  return items.reduce((sum, it) => sum + it.price * it.quantity * days, 0);
}

/** Denda = hari terlambat × denda per hari (per pesanan). */
export function calcFine(rentalEnd: string, returnDate: string, finePerDay: number) {
  const late = Math.max(0, diffDays(rentalEnd, returnDate));
  return { lateDays: late, fine: late * finePerDay };
}

export function calcTotal(subtotal: number, discount: number, fine: number) {
  return Math.max(0, subtotal - Math.min(discount, subtotal)) + fine;
}
