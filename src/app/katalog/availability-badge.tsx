import { Badge } from "@/components/ui/badge";

export function AvailabilityBadge({ status, available }: { status: string; available: number }) {
  if (status === "perawatan") return <Badge variant="secondary">Sedang perawatan</Badge>;
  if (available > 0) return <Badge variant="success">Tersedia di toko</Badge>;
  return <Badge variant="warning">Sedang disewa</Badge>;
}
