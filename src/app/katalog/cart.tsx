"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";

const KEY = "ag-katalog-cart";
const EVT = "ag-cart-change";

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 20) : [];
  } catch {
    return [];
  }
}
function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

function useCart() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return ids;
}

export function AddToCart({ id }: { id: string }) {
  const ids = useCart();
  const inCart = ids.includes(id);
  return (
    <button
      type="button"
      onClick={() => write(inCart ? ids.filter((x) => x !== id) : [...ids, id])}
      className={`flex h-11 w-full items-center justify-center gap-2 rounded-md border px-4 font-medium ${inCart ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
    >
      <ShoppingBag className="size-4" /> {inCart ? "Sudah di daftar pesanan (hapus)" : "Tambah ke daftar pesanan"}
    </button>
  );
}

/** Bar mengambang berisi jumlah item di daftar pesanan. */
export function CartBar() {
  const ids = useCart();
  const path = usePathname();
  if (ids.length === 0 || path.startsWith("/katalog/pesan")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 p-3 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <ShoppingBag className="size-5 text-primary" />
        <p className="flex-1 text-sm"><b>{ids.length} item</b> di daftar pesanan</p>
        <Link href={`/katalog/pesan?items=${ids.join(",")}`} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Lihat & pesan</Link>
      </div>
    </div>
  );
}

/** Hapus item dari daftar lalu muat ulang halaman pesan dengan daftar terbaru. */
export function RemoveFromCart({ id, mulai, selesai }: { id: string; mulai?: string; selesai?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Hapus"
      onClick={() => {
        const next = read().filter((x) => x !== id);
        write(next);
        const q = new URLSearchParams({ items: next.join(",") });
        if (mulai) q.set("mulai", mulai);
        if (selesai) q.set("selesai", selesai);
        router.replace(`/katalog/pesan?${q}`);
      }}
      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <X className="size-4" />
    </button>
  );
}

/** Sinkronkan daftar dari URL (mis. tautan dibuka di perangkat lain) dan kosongkan setelah dikirim. */
export function SyncCart({ ids }: { ids: string[] }) {
  useEffect(() => {
    if (ids.length && read().join(",") !== ids.join(",")) write(ids);
  }, [ids]);
  return null;
}

export function ClearCartLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={() => setTimeout(() => write([]), 500)}>
      {children}
    </a>
  );
}
