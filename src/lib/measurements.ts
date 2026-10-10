/** Isian "Keterangan resize": bagian kebaya dan rok (cm). */
export const SIZE_GROUPS = [
  { title: "Kebaya", fields: [["waist", "Pinggang"], ["sleeve", "Lengan"], ["shoulder", "Pundak"]] },
  { title: "Ukuran rok", fields: [["hip", "Pinggul"], ["thigh", "Paha"], ["knee", "Lutut"]] },
] as const;

export type SizeKey = "waist" | "sleeve" | "shoulder" | "hip" | "thigh" | "knee";
export const SIZE_FIELDS: readonly (readonly [SizeKey, string])[] = SIZE_GROUPS.flatMap((g): (readonly [SizeKey, string])[] => [...g.fields]);

/** Ambil nilai ukuran dari form (kosong = null). */
export function readSizes(fd: FormData, toNum: (v: FormDataEntryValue | null) => number | null) {
  return Object.fromEntries(SIZE_FIELDS.map(([k]) => [k, toNum(fd.get(k))])) as Record<SizeKey, number | null>;
}

/** Ringkasan satu baris, mis. "Kebaya: pinggang 70, lengan 55 · Rok: pinggul 90". */
export function sizeSummary(m: Partial<Record<SizeKey, number | null>>) {
  return SIZE_GROUPS.map((g) => {
    const parts = g.fields.filter(([k]) => m[k] != null).map(([k, l]) => `${l.toLowerCase()} ${m[k]}`);
    return parts.length ? `${g.title === "Kebaya" ? "Kebaya" : "Rok"}: ${parts.join(", ")}` : null;
  }).filter(Boolean).join(" · ") || "-";
}
