import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input } from "@/components/ui/input";
import { saveProductAction } from "./actions";

type P = { id: string; name: string; category: string | null; pricePerDay: number; stockTotal: number; status: string } | null;

export function ProductForm({ product, categories }: { product: P; categories: string[] }) {
  return (
    <ActionForm action={saveProductAction}>
      {product && <input type="hidden" name="id" value={product.id} />}
      <Field label="Nama kebaya"><Input name="name" defaultValue={product?.name} required /></Field>
      <Field label="Kategori / koleksi">
        <Input name="category" list="kategori" defaultValue={product?.category ?? ""} placeholder="Mis. Kebaya Kutubaru" />
        <datalist id="kategori">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Harga sewa / hari (Rp)"><Input name="pricePerDay" type="number" min={0} step={1000} defaultValue={product?.pricePerDay ?? ""} required /></Field>
        <Field label="Jumlah unit"><Input name="stockTotal" type="number" min={0} defaultValue={product?.stockTotal ?? 1} required /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="maintenance" defaultChecked={product?.status === "perawatan"} className="size-4" /> Sedang perawatan (laundry/perbaikan) — tidak bisa disewa</label>
      <Field label={product ? "Tambah foto" : "Foto"} hint="Bisa pilih beberapa foto sekaligus (JPG/PNG/WEBP, maks 8 MB)">
        <Input name="photos" type="file" accept="image/*" multiple />
      </Field>
      <SubmitButton>{product ? "Simpan perubahan" : "Tambah kebaya"}</SubmitButton>
    </ActionForm>
  );
}
