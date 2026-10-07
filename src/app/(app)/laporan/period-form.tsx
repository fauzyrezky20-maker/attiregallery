import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

export function PeriodForm({ period, from, to }: { period: string; from: string; to: string }) {
  return (
    <form className="no-print mb-6 flex flex-wrap items-end gap-2">
      <Select name="periode" defaultValue={period} className="w-40">
        <option value="hari">Hari ini</option>
        <option value="minggu">Minggu ini</option>
        <option value="bulan">Bulan ini</option>
        <option value="kustom">Pilih tanggal</option>
      </Select>
      <Input type="date" name="dari" defaultValue={from} className="w-40" aria-label="Dari tanggal" />
      <Input type="date" name="sampai" defaultValue={to} className="w-40" aria-label="Sampai tanggal" />
      <Button type="submit" variant="secondary">Tampilkan</Button>
    </form>
  );
}
