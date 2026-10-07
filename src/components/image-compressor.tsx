"use client";

import { useEffect } from "react";

const MAX_SIDE = 1600;
const MIN_BYTES = 700 * 1024;

async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < MIN_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Perkecil foto dari kamera ponsel (sering 3–10 MB) sebelum diunggah, untuk semua input file di aplikasi.
 * Menjaga unggahan tetap cepat dan di bawah batas ukuran request di Vercel (4,5 MB).
 */
export function ImageCompressor() {
  useEffect(() => {
    const busy = new WeakSet<HTMLInputElement>();
    async function onChange(e: Event) {
      const input = e.target as HTMLInputElement;
      if (input?.type !== "file" || !input.files?.length || busy.has(input)) return;
      busy.add(input);
      const form = input.form;
      const submit = form?.querySelector<HTMLButtonElement>("button[type=submit]");
      if (submit) submit.disabled = true;
      try {
        const files = await Promise.all([...input.files].map(shrink));
        const dt = new DataTransfer();
        files.forEach((f) => dt.items.add(f));
        input.files = dt.files;
      } finally {
        busy.delete(input);
        if (submit) submit.disabled = false;
      }
    }
    document.addEventListener("change", onChange, true);
    return () => document.removeEventListener("change", onChange, true);
  }, []);
  return null;
}
