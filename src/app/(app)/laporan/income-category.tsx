"use client";

import { Select } from "@/components/ui/input";
import { rupiah } from "@/lib/utils";

/** Pilihan jenis pemasukan: umum + "Sewa <kebaya>" untuk tiap produk. Memilih kebaya mengisi nominal dengan harga sewanya. */
export function IncomeCategory({ general, products }: { general: string[]; products: { name: string; category: string | null; price: number }[] }) {
  const groups = new Map<string, typeof products>();
  for (const p of products) {
    const k = p.category ?? "Lainnya";
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  return (
    <Select
      name="category"
      defaultValue="Sewa"
      required
      onChange={(e) => {
        const p = products.find((x) => `Sewa ${x.name}` === e.target.value);
        const amount = e.target.form?.elements.namedItem("amount") as HTMLInputElement | null;
        if (p && amount) amount.value = String(p.price);
      }}
    >
      <optgroup label="Umum">{general.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
      {[...groups].map(([cat, list]) => (
        <optgroup key={cat} label={`Sewa · ${cat}`}>
          {list.map((p) => <option key={p.name} value={`Sewa ${p.name}`}>Sewa {p.name} ({rupiah(p.price)})</option>)}
        </optgroup>
      ))}
    </Select>
  );
}
