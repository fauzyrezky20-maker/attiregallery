"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Select } from "@/components/ui/input";
import { rupiah } from "@/lib/utils";

type Product = { name: string; category: string | null; price: number };

/**
 * Pilihan jenis pemasukan: jenis umum, atau satu/lebih kebaya yang disewa.
 * Item sewa bisa lebih dari 1; nominal terisi otomatis dengan jumlah harga sewanya
 * dan jenis tersimpan sebagai "Sewa A, B (2x)".
 */
export function IncomeCategory({ general, products }: { general: string[]; products: Product[] }) {
  const [base, setBase] = useState("Sewa");
  const [items, setItems] = useState<string[]>([]);
  const ref = useRef<HTMLInputElement>(null);

  // Setelah pemasukan tersimpan form di-reset: kosongkan juga item sewa yang dipilih.
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const onReset = () => { setItems([]); setBase("Sewa"); };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const k = p.category ?? "Lainnya";
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  const counts = new Map<string, number>();
  for (const n of items) counts.set(n, (counts.get(n) ?? 0) + 1);
  const value = items.length
    ? `Sewa ${[...counts].map(([n, q]) => (q > 1 ? `${n} (${q}x)` : n)).join(", ")}`
    : base;

  function update(next: string[], form: HTMLFormElement | null | undefined) {
    setItems(next);
    const amount = form?.elements.namedItem("amount") as HTMLInputElement | null;
    if (amount) {
      const total = next.reduce((s, n) => s + (products.find((p) => p.name === n)?.price ?? 0), 0);
      amount.value = total ? String(total) : "";
    }
  }

  return (
    <div className="grid gap-2">
      <input ref={ref} type="hidden" name="category" value={value} />
      {items.length === 0 && (
        <Select value={base} onChange={(e) => setBase(e.target.value)} aria-label="Jenis pemasukan">
          {general.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      )}
      {items.length > 0 && (
        <ul className="grid gap-1 rounded-md border p-2 text-sm">
          {items.map((n, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span>Sewa {n} <span className="text-muted-foreground">({rupiah(products.find((p) => p.name === n)?.price ?? 0)})</span></span>
              <button type="button" aria-label={`Hapus ${n}`} className="rounded p-1 hover:bg-muted"
                onClick={(e) => update(items.filter((_, j) => j !== i), e.currentTarget.form)}><X className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <Select
        value=""
        aria-label="Tambah item sewa"
        onChange={(e) => { if (e.target.value) update([...items, e.target.value], e.target.form); }}
      >
        <option value="">{items.length ? "+ Tambah item sewa lagi" : "+ Pilih kebaya yang disewa (bisa lebih dari 1)"}</option>
        {[...groups].map(([cat, list]) => (
          <optgroup key={cat} label={cat}>
            {list.map((p) => <option key={p.name} value={p.name}>{p.name} ({rupiah(p.price)})</option>)}
          </optgroup>
        ))}
      </Select>
    </div>
  );
}
