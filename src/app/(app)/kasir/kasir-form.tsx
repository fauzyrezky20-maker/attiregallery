"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Minus, Plus, Search, Shirt, Trash2 } from "lucide-react";
import { createOrderAction, checkAvailabilityAction } from "../pesanan/actions";
import { SubmitButton } from "@/components/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addDays, fmtDate, rupiah, cn } from "@/lib/utils";
import { calcSubtotal, calcTotal } from "@/lib/pricing";

type Customer = { id: string; name: string; phone: string | null; balance: number };
type Product = { id: string; name: string; category: string | null; price: number; status: string; photo: string | null; available: number };

type Props = {
  today: string;
  defaultDays: number;
  initialCustomerId: string;
  customers: Customer[];
  products: Product[];
  terms: { text: string; version: string };
  methods: { tunai: boolean; qris: boolean; transfer: boolean };
  transferInfo: string | null;
  finePerDay: number;
};

export function KasirForm(props: Props) {
  const [state, formAction] = useActionState(createOrderAction, undefined);
  const [customerId, setCustomerId] = useState(props.initialCustomerId);
  const [start, setStart] = useState(props.today);
  const [days, setDays] = useState(props.defaultDays);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<string>(props.methods.tunai ? "tunai" : props.methods.qris ? "qris" : "transfer");
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [avail, setAvail] = useState<Record<string, number>>(Object.fromEntries(props.products.map((p) => [p.id, p.available])));
  const [checking, startCheck] = useTransition();

  useEffect(() => {
    if (!start || days < 1) return;
    startCheck(async () => setAvail(await checkAvailabilityAction(start, days)));
  }, [start, days]);

  const productById = useMemo(() => new Map(props.products.map((p) => [p.id, p])), [props.products]);
  const customer = props.customers.find((c) => c.id === customerId);
  const lines = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, quantity]) => ({ product: productById.get(id)!, quantity, price: productById.get(id)!.price }));
  const subtotal = calcSubtotal(lines, days);
  const disc = Math.min(discount, subtotal);
  const total = calcTotal(subtotal, disc, 0);
  const pay = payAmount ?? total;
  const end = addDays(start, days);

  const filtered = props.products.filter((p) => (p.name + " " + (p.category ?? "")).toLowerCase().includes(q.toLowerCase()));

  function setQty(id: string, qty: number) {
    const max = avail[id] ?? 0;
    setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(qty, max)) }));
  }

  return (
    <form action={formAction} className="grid gap-6 xl:grid-cols-[1fr_400px]">
      <input type="hidden" name="items" value={JSON.stringify(lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })))} />
      <div className="grid gap-6 content-start">
        <Card>
          <CardHeader><CardTitle>1. Pelanggan</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <Select name="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Pilih pelanggan —</option>
              <option value="__new">+ Pelanggan baru</option>
              {props.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.phone ? ` · ${c.phone}` : ""}
                </option>
              ))}
            </Select>
            {customerId === "__new" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nama pelanggan"><Input name="newName" required /></Field>
                <Field label="No. telepon"><Input name="newPhone" inputMode="tel" /></Field>
                <Field label="Alamat" className="sm:col-span-2"><Input name="newAddress" /></Field>
              </div>
            )}
            {customer && customer.balance > 0 && (
              <p className="text-sm text-muted-foreground">Saldo tabungan: <b className="text-foreground">{rupiah(customer.balance)}</b></p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Durasi sewa</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Field label="Tanggal ambil"><Input type="date" name="rentalStart" value={start} onChange={(e) => setStart(e.target.value)} required /></Field>
            <Field label="Lama sewa (hari)"><Input type="number" name="days" min={1} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))} required /></Field>
            <Field label="Tanggal kembali" hint={`Denda ${rupiah(props.finePerDay)}/hari bila terlambat`}>
              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">{fmtDate(end)}</div>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Pilih kebaya</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari nama atau kategori…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {checking && <p className="text-xs text-muted-foreground">Mengecek ketersediaan…</p>}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((p) => {
                const a = avail[p.id] ?? 0;
                const inCart = cart[p.id] ?? 0;
                return (
                  <button
                    type="button"
                    key={p.id}
                    disabled={a === 0}
                    onClick={() => setQty(p.id, inCart + 1)}
                    className={cn(
                      "flex flex-col overflow-hidden rounded-lg border text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50",
                      inCart > 0 && "border-primary ring-2 ring-primary/30",
                    )}
                  >
                    <div className="flex aspect-[3/4] w-full items-center justify-center bg-muted">
                      {!p.photo && <Shirt className="size-8 text-muted-foreground opacity-40" />}
                      {p.photo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="grid gap-0.5 p-2">
                      <span className="line-clamp-2 text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{rupiah(p.price)}/hari</span>
                      <span className="flex items-center gap-1 text-xs">
                        {a > 0 ? <Badge variant="success">Sisa {a}</Badge> : <Badge variant="danger">Tidak tersedia</Badge>}
                        {inCart > 0 && <Badge>{inCart} dipilih</Badge>}
                      </span>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && <p className="col-span-full py-6 text-center text-sm text-muted-foreground">Kebaya tidak ditemukan.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 content-start xl:sticky xl:top-6">
        <Card>
          <CardHeader><CardTitle>Ringkasan</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada kebaya dipilih.</p>
            ) : (
              <ul className="grid gap-2">
                {lines.map((l) => (
                  <li key={l.product.id} className="flex items-center gap-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{l.product.name}</p>
                      <p className="text-xs text-muted-foreground">{rupiah(l.price)} × {l.quantity} × {days} hari</p>
                    </div>
                    <Button type="button" variant="outline" size="icon" onClick={() => setQty(l.product.id, l.quantity - 1)} aria-label="Kurangi"><Minus /></Button>
                    <span className="w-5 text-center">{l.quantity}</span>
                    <Button type="button" variant="outline" size="icon" onClick={() => setQty(l.product.id, l.quantity + 1)} aria-label="Tambah"><Plus /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setQty(l.product.id, 0)} aria-label="Hapus"><Trash2 /></Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-1 border-t pt-3 text-sm">
              <div className="flex justify-between"><span>Subtotal sewa</span><span>{rupiah(subtotal)}</span></div>
              <div className="flex items-center justify-between gap-3">
                <span>Diskon</span>
                <Input name="discount" type="number" min={0} step={1000} className="h-8 w-36 text-right" value={discount || ""} placeholder="0" onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground"><span>Denda (dihitung saat kembali)</span><span>{rupiah(0)}</span></div>
              <div className="mt-1 flex justify-between text-lg font-semibold"><span>Total</span><span>{rupiah(total)}</span></div>
            </div>
            <Field label="Catatan (opsional)"><Textarea name="notes" rows={2} placeholder="Mis. acara wisuda, minta dirapikan" /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pembayaran</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: "tunai", l: "Tunai", on: props.methods.tunai },
                { k: "qris", l: "QRIS", on: props.methods.qris },
                { k: "transfer", l: "Transfer", on: props.methods.transfer },
                { k: "tabungan", l: "Saldo tabungan", on: (customer?.balance ?? 0) > 0 },
                { k: "", l: "Bayar nanti", on: true },
              ]
                .filter((m) => m.on)
                .map((m) => (
                  <label key={m.k} className={cn("flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium", method === m.k && "border-primary bg-primary text-primary-foreground")}>
                    <input type="radio" name="method" value={m.k} checked={method === m.k} onChange={() => setMethod(m.k)} className="sr-only" />
                    {m.l}
                  </label>
                ))}
            </div>
            {method && (
              <>
                <Field label="Nominal dibayar" hint={pay < total ? `Sisa tagihan ${rupiah(total - pay)} (DP)` : undefined}>
                  <Input name="payAmount" type="number" min={0} step={1000} value={pay} onChange={(e) => setPayAmount(Math.max(0, Number(e.target.value) || 0))} />
                </Field>
                {method === "tabungan" && customer && pay > customer.balance && (
                  <p className="text-sm text-destructive">Saldo tidak cukup (saldo {rupiah(customer.balance)}).</p>
                )}
                {method === "transfer" && (
                  <>
                    {props.transferInfo && <p className="whitespace-pre-line rounded-md bg-muted p-3 text-sm">{props.transferInfo}</p>}
                    <Field label="Bukti transfer (opsional)"><Input type="file" name="proof" accept="image/*,application/pdf" /></Field>
                  </>
                )}
                {(method === "transfer" || method === "qris") && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="confirmed" className="size-4" />
                    {method === "qris" ? "Dana QRIS sudah masuk (tandai lunas sekarang)" : "Transfer sudah dicek masuk (tandai lunas)"}
                  </label>
                )}
                {method === "qris" && <p className="text-xs text-muted-foreground">Setelah disimpan, kode QRIS dengan nominal ini akan tampil untuk dipindai pelanggan.</p>}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Syarat & Ketentuan (v{props.terms.version})</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <div className="max-h-40 overflow-y-auto whitespace-pre-line rounded-md bg-muted p-3 text-xs">{props.terms.text || "Belum ada S&K. Atur di Pengaturan Toko."}</div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="agreeTerms" className="mt-0.5 size-4" required />
              Pelanggan sudah membaca dan menyetujui S&K sewa.
            </label>
          </CardContent>
        </Card>

        {state?.error && <p className="rounded-md bg-red-50 p-3 text-sm text-destructive dark:bg-red-950/40" role="alert">{state.error}</p>}
        <SubmitButton size="lg" disabled={lines.length === 0 || !customerId} pendingText="Memproses…">
          Simpan transaksi · {rupiah(total)}
        </SubmitButton>
      </div>
    </form>
  );
}
