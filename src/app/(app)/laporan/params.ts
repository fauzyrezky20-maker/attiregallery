import { resolvePeriod, type Period } from "@/lib/reports";

export type ReportSearch = { periode?: string; dari?: string; sampai?: string };

export function readPeriod(sp: ReportSearch) {
  const custom = sp.dari && sp.sampai && (sp.periode === "kustom" || !sp.periode);
  const period = (custom ? "kustom" : (sp.periode ?? "bulan")) as Period;
  const { from, to } = resolvePeriod(period, undefined, sp.dari, sp.sampai);
  return { period, from, to };
}
