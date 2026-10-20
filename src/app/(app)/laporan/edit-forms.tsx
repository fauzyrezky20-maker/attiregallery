import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { fmtDateTime, toLocalInput } from "@/lib/utils";
import { editExpenseAction, editIncomeAction, editPaymentAction } from "./actions";

export type EditKind = "pemasukan" | "pengeluaran" | "pembayaran";

/** Nilai `?edit=` → jenis + id data yang sedang diedit. */
export function readEdit(v: string | undefined): { kind: EditKind; id: string } | null {
  const m = /^(pemasukan|pengeluaran|pembayaran):(.+)$/.exec(v ?? "");
  return m ? { kind: m[1] as EditKind, id: m[2] } : null;
}

/** Tombol "Edit" kecil di tiap baris tabel. */
export function EditLink({ base, kind, id }: { base: string; kind: EditKind; id: string }) {
  return (
    <Button asChild size="sm" variant="ghost">
      <Link href={`?${base}&edit=${kind}:${id}#edit`} scroll={false}>Edit</Link>
    </Button>
  );
}

function Shell({ title, cancel, children, note }: { title: string; cancel: string; children: React.ReactNode; note?: string }) {
  return (
    <Card id="edit" className="h-fit scroll-mt-20 border-primary ring-2 ring-primary/20">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Perubahan tercatat di &quot;Riwayat perubahan&quot;{note ? `. ${note}` : ""}.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {children}
        <Button asChild variant="outline"><Link href={`?${cancel}`} scroll={false}>Selesai / batal</Link></Button>
      </CardContent>
    </Card>
  );
}

const pctValue = (n: number | null | undefined) => (n ? String(n) : "");

export async function EditIncomeCard({ id, cancel, categories, customerNames }: { id: string; cancel: string; categories: string[]; customerNames: string[] }) {
  const x = await db.query.incomes.findFirst({ where: eq(schema.incomes.id, id) });
  if (!x) return <Shell title="Edit pemasukan" cancel={cancel}><p className="text-sm text-muted-foreground">Data tidak ditemukan (mungkin sudah dihapus).</p></Shell>;
  return (
    <Shell title="Edit pemasukan" cancel={cancel}>
      <ActionForm action={editIncomeAction}>
        <input type="hidden" name="id" value={x.id} />
        <Field label="Tanggal"><Input type="date" name="date" defaultValue={x.date} required /></Field>
        <Field label="Jenis">
          <Input name="category" list="edit-inc-cat" defaultValue={x.category} required />
          <datalist id="edit-inc-cat">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Harga sebelum potongan (Rp)"><Input name="amount" type="number" min={1} max={100000000} step={1} defaultValue={x.grossAmount ?? x.amount} required /></Field>
        <Field label="Persen potongan (%)"><Input name="percent" type="number" min={0} max={100} step="any" inputMode="decimal" defaultValue={pctValue(x.discountPct)} placeholder="0" /></Field>
        <Field label="Metode">
          <Select name="method" defaultValue={x.method}><option value="tunai">Tunai</option><option value="qris">QRIS</option><option value="transfer">Transfer</option></Select>
        </Field>
        <Field label="Nama pelanggan">
          <Input name="note" list="edit-cust" defaultValue={x.note ?? ""} autoComplete="off" />
          <datalist id="edit-cust">{customerNames.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <SubmitButton>Simpan perubahan</SubmitButton>
      </ActionForm>
    </Shell>
  );
}

export async function EditExpenseCard({ id, cancel, categories }: { id: string; cancel: string; categories: string[] }) {
  const x = await db.query.expenses.findFirst({ where: eq(schema.expenses.id, id) });
  if (!x) return <Shell title="Edit pengeluaran" cancel={cancel}><p className="text-sm text-muted-foreground">Data tidak ditemukan (mungkin sudah dihapus).</p></Shell>;
  return (
    <Shell title="Edit pengeluaran" cancel={cancel}>
      <ActionForm action={editExpenseAction}>
        <input type="hidden" name="id" value={x.id} />
        <Field label="Tanggal"><Input type="date" name="date" defaultValue={x.date} required /></Field>
        <Field label="Jenis">
          <Input name="category" list="edit-exp-cat" defaultValue={x.category} required />
          <datalist id="edit-exp-cat">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Harga sebelum potongan (Rp)"><Input name="amount" type="number" min={1} max={100000000} step={1} defaultValue={x.grossAmount ?? x.amount} required /></Field>
        <Field label="Persen potongan (%)"><Input name="percent" type="number" min={0} max={100} step="any" inputMode="decimal" defaultValue={pctValue(x.percent)} placeholder="0" /></Field>
        <Field label="Keterangan"><Input name="note" defaultValue={x.note ?? ""} /></Field>
        <SubmitButton>Simpan perubahan</SubmitButton>
      </ActionForm>
    </Shell>
  );
}

export async function EditPaymentCard({ id, cancel }: { id: string; cancel: string }) {
  const x = await db.query.payments.findFirst({ where: eq(schema.payments.id, id) });
  if (!x) return <Shell title="Edit pembayaran kasir" cancel={cancel}><p className="text-sm text-muted-foreground">Data tidak ditemukan.</p></Shell>;
  const fromSavings = x.method === "tabungan";
  return (
    <Shell title={`Edit pembayaran kasir #${x.orderId.slice(0, 8)}`} cancel={cancel} note="Data sewa dan stok kebaya tidak ikut berubah">
      <ActionForm action={editPaymentAction}>
        <input type="hidden" name="id" value={x.id} />
        <Field label="Tanggal & jam bayar"><Input type="datetime-local" name="paidAt" defaultValue={x.paidAt ? toLocalInput(x.paidAt) : ""} required /></Field>
        {fromSavings ? (
          <>
            <input type="hidden" name="method" value="tabungan" />
            <input type="hidden" name="amount" value={x.amount} />
            <p className="text-sm text-muted-foreground">Dibayar dari saldo tabungan pelanggan, jadi metode dan nominal tidak bisa diubah di sini.</p>
          </>
        ) : (
          <>
            <Field label="Metode">
              <Select name="method" defaultValue={x.method}><option value="tunai">Tunai</option><option value="qris">QRIS</option><option value="transfer">Transfer</option></Select>
            </Field>
            <Field label="Nominal (Rp)" hint="Tidak boleh membuat total bayar melebihi tagihan pesanan."><Input name="amount" type="number" min={1} max={100000000} step={1} defaultValue={x.amount} required /></Field>
          </>
        )}
        <SubmitButton>Simpan perubahan</SubmitButton>
      </ActionForm>
      <Link href={`/pesanan/${x.orderId}`} className="text-sm text-primary hover:underline">Lihat pesanan</Link>
    </Shell>
  );
}

const KIND_LABEL: Record<string, string> = { pemasukan: "Pemasukan manual", pengeluaran: "Pengeluaran", pembayaran: "Pembayaran kasir" };

/** Riwayat edit/hapus laporan (khusus pemilik). */
export async function EditLog() {
  const rows = await db.select().from(schema.financeEdits).orderBy(desc(schema.financeEdits.createdAt)).limit(50);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat perubahan laporan</CardTitle>
        <CardDescription>50 perubahan terakhir: siapa yang mengedit atau menghapus, kapan, dan apa yang diubah. Hanya terlihat oleh pemilik.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada perubahan.</p> : (
          <ul className="divide-y text-sm">
            {rows.map((r) => (
              <li key={r.id} className="grid gap-0.5 py-2">
                <p><b>{r.action === "hapus" ? "Dihapus" : "Diubah"}</b> · {KIND_LABEL[r.kind] ?? r.kind} · <span className="text-muted-foreground">{fmtDateTime(r.createdAt)}{r.userName ? ` oleh ${r.userName}` : ""}</span></p>
                <p className="text-muted-foreground">{r.changes}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
