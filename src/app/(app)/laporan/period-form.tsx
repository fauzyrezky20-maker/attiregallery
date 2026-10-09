import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { addDays, todayStr } from "@/lib/utils";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** 12 bulan terakhir sebagai pilihan cepat. */
function lastMonths(n = 12) {
  const t = todayStr();
  let y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7));
  const out: { label: string; from: string; to: string }[] = [];
  for (let i = 0; i < n; i++) {
    const from = `${y}-${String(m).padStart(2, "0")}-01`;
    const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
    out.push({ label: `${BULAN[m - 1]} ${String(y).slice(2)}`, from, to: addDays(`${ny}-${String(nm).padStart(2, "0")}-01`, -1) });
    if (--m === 0) { m = 12; y--; }
  }
  return out.reverse();
}

export function PeriodForm({ period, from, to }: { period: string; from: string; to: string }) {
  return (
    <div className="no-print mb-6 grid gap-3">
    <form key={`${period}-${from}-${to}`} className="flex flex-wrap items-end gap-2">
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
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="mr-1 text-muted-foreground">Per bulan:</span>
      {lastMonths().map((mo) => {
        const active = from === mo.from && to === mo.to;
        return (
          <Link key={mo.from} href={`?periode=kustom&dari=${mo.from}&sampai=${mo.to}`}
            className={`rounded-full border px-2.5 py-1 ${active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{mo.label}</Link>
        );
      })}
    </div>
    </div>
  );
}
