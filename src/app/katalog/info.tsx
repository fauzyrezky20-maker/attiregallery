import { rupiah } from "@/lib/utils";
import type { getSettings } from "@/lib/settings";

type S = Awaited<ReturnType<typeof getSettings>>;
const jam = (t: string) => t.replace(":", ".");

/** Ringkasan aturan sewa untuk pelanggan. */
export function RentalInfo({ s }: { s: S }) {
  return (
    <ul className="grid gap-1 rounded-lg border bg-card p-3 text-sm">
      <li>• Harga sewa berlaku untuk <b>{s.defaultRentDays} hari</b>.</li>
      <li>• <b>DP {rupiah(s.dpAmount)} = fix booking.</b></li>
      <li>• Pelunasan paling lambat <b>H-{s.settleDaysBefore}</b> sebelum tanggal ambil.</li>
      <li>• Pengambilan pukul <b>{jam(s.pickupFrom)}–{jam(s.pickupUntil)}</b>, wajib konfirmasi ke WhatsApp.</li>
      <li>• Jaminan KTP. Telat kembali didenda per hari sesuai harga sewa baju.</li>
    </ul>
  );
}

export function GuideAndTerms({ s }: { s: S }) {
  return (
    <div className="grid gap-2">
      <details className="rounded-lg border bg-card p-3 text-sm">
        <summary className="cursor-pointer font-medium">Tata cara sewa</summary>
        <p className="mt-2 whitespace-pre-line text-muted-foreground">{s.rentalGuide}</p>
      </details>
      {s.termsText && (
        <details className="rounded-lg border bg-card p-3 text-sm">
          <summary className="cursor-pointer font-medium">Syarat & ketentuan</summary>
          <p className="mt-2 whitespace-pre-line text-muted-foreground">{s.termsText}</p>
        </details>
      )}
    </div>
  );
}
