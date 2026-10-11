"use client";

import { useState } from "react";
import jsQR from "jsqr";
import { Field, Input, Textarea } from "@/components/ui/input";

/** Baca QR dari foto (dicoba beberapa ukuran supaya foto besar/kecil tetap terbaca). */
async function readQr(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  for (const side of [1000, 1600, 700, Math.max(bitmap.width, bitmap.height)]) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale)), h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "attemptBoth" });
    if (code?.data) return code.data;
  }
  return null;
}

export function QrisInput({ payload, imageUrl }: { payload: string | null; imageUrl: string | null }) {
  const [value, setValue] = useState(payload ?? "");
  const [preview, setPreview] = useState(imageUrl);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setMsg({ ok: true, text: "Membaca kode QRIS…" });
    try {
      const data = await readQr(file);
      if (data && data.startsWith("000201")) {
        setValue(data);
        setMsg({ ok: true, text: "QRIS terbaca. Klik Simpan metode. Nominal akan terisi otomatis saat pelanggan bayar." });
      } else if (data) {
        setMsg({ ok: false, text: "QR terbaca, tapi bukan kode QRIS. Pastikan fotonya QRIS toko." });
      } else {
        setMsg({ ok: false, text: "Kode QR belum terbaca. Foto tetap bisa disimpan dan ditampilkan ke pelanggan, tapi nominal harus diketik pelanggan sendiri. Coba foto yang lebih jelas/lurus." });
      }
    } catch {
      setMsg({ ok: false, text: "Foto tidak bisa dibaca. Coba format JPG/PNG." });
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <Field label="Foto QRIS toko" hint="Unggah foto atau screenshot QRIS toko. Kodenya dibaca otomatis.">
        <Input type="file" name="qrisImage" accept="image/*" onChange={onFile} />
      </Field>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="QRIS toko" className="max-h-64 w-fit rounded-md border bg-white object-contain p-1" />
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-amber-700"}`}>{msg.text}</p>}
      {imageUrl && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeQrisImage" className="size-4" /> Hapus foto QRIS</label>}
      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">Kode QRIS (teks)</summary>
        <Textarea name="qrisPayload" rows={3} value={value} onChange={(e) => setValue(e.target.value)} className="mt-2 font-mono text-xs" placeholder="00020101021126…6304ABCD" />
      </details>
    </div>
  );
}
