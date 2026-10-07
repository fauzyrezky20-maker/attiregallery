import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; variant: "info" | "warning" | "success" | "danger" | "secondary" }> = {
  baru: { label: "Baru", variant: "info" },
  disewa: { label: "Sedang disewa", variant: "warning" },
  selesai: { label: "Selesai", variant: "success" },
  dibatalkan: { label: "Dibatalkan", variant: "secondary" },
  pending: { label: "Menunggu", variant: "warning" },
  lunas: { label: "Lunas", variant: "success" },
  gagal: { label: "Gagal", variant: "danger" },
  belum_lunas: { label: "Belum lunas", variant: "danger" },
  tersedia: { label: "Tersedia", variant: "success" },
  perawatan: { label: "Perawatan", variant: "secondary" },
  terjadwal: { label: "Terjadwal", variant: "info" },
  batal: { label: "Batal", variant: "secondary" },
  hadir: { label: "Hadir", variant: "success" },
  izin: { label: "Izin", variant: "info" },
  sakit: { label: "Sakit", variant: "warning" },
  cuti: { label: "Cuti", variant: "secondary" },
  aktif: { label: "Aktif", variant: "success" },
  "tidak aktif": { label: "Tidak aktif", variant: "secondary" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = MAP[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export const METHOD_LABEL: Record<string, string> = { tunai: "Tunai", qris: "QRIS", transfer: "Transfer bank", tabungan: "Saldo tabungan" };
