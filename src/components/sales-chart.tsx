import { rupiah } from "@/lib/utils";

const dayLabel = (d: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d + "T00:00:00Z"));
const compact = (n: number) => new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** Grafik batang satu seri (pemasukan per hari) dengan tooltip saat disentuh/hover. */
export function SalesChart({ data }: { data: { day: string; total: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const ticks = [top, top / 2, 0];
  return (
    <figure>
      <div className="flex gap-2">
        <div className="flex h-48 flex-col justify-between py-0 text-right text-[11px] text-muted-foreground">
          {ticks.map((t) => <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{compact(t)}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {ticks.map((t) => <div key={t} className="border-t border-border/70" />)}
          </div>
          <div className="relative flex h-48 items-end gap-[2px]">
            {data.map((d) => (
              <div key={d.day} tabIndex={0} className="group relative flex h-full flex-1 items-end outline-none" aria-label={`${dayLabel(d.day)}: ${rupiah(d.total)}`}>
                <div className="w-full rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80 group-focus:opacity-80" style={{ height: `${(d.total / top) * 100}%`, minHeight: d.total > 0 ? 2 : 0 }} />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border bg-card px-2 py-1 text-xs shadow-md group-hover:block group-focus:block">
                  <p className="text-muted-foreground">{dayLabel(d.day)}</p>
                  <p className="font-semibold">{rupiah(d.total)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-[2px] text-[10px] text-muted-foreground">
            {data.map((d, i) => <span key={d.day} className="flex-1 text-center">{i % 2 === (data.length - 1) % 2 ? dayLabel(d.day).split(" ")[0] : ""}</span>)}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>Pemasukan per hari</caption>
        <tbody>{data.map((d) => <tr key={d.day}><th>{d.day}</th><td>{d.total}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
