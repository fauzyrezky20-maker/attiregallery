import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const rupiahFmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export const rupiah = (n: number | null | undefined) => rupiahFmt.format(n ?? 0);

export const TZ = "Asia/Jakarta";

/** Tanggal hari ini (zona Asia/Jakarta) dalam format YYYY-MM-DD. */
export function todayStr(d: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Selisih hari b − a (keduanya YYYY-MM-DD). */
export function diffDays(a: string, b: string) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

export function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(dateStr + "T00:00:00Z"),
  );
}

export function fmtDateTime(d: Date | number | null | undefined) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: TZ }).format(new Date(d));
}

export function fmtTime(d: Date | number | null | undefined) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { timeStyle: "short", timeZone: TZ }).format(new Date(d));
}

/** Ubah input datetime-local (dianggap waktu Jakarta, UTC+7) menjadi Date. */
export function parseLocalDateTime(v: string) {
  return new Date(v + ":00+07:00");
}

/** Date → nilai input datetime-local di zona Jakarta. */
export function toLocalInput(d: Date) {
  const s = new Date(d.getTime() + 7 * 3600_000).toISOString();
  return s.slice(0, 16);
}

export function toInt(v: FormDataEntryValue | null | undefined, fallback = 0) {
  if (v == null || v === "") return fallback;
  const n = Number(String(v).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

export function toNum(v: FormDataEntryValue | null | undefined) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function str(v: FormDataEntryValue | null | undefined) {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}
