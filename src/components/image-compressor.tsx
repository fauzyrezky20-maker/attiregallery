"use client";

import { useEffect } from "react";

const MAX_SIDE = 1600;
const MIN_BYTES = 700 * 1024;
/** Batas aman di bawah limit request Vercel (4,5 MB). */
const SAFE_BYTES = 3.5 * 1024 * 1024;
const WEB_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Cadangan untuk browser yang tidak bisa createImageBitmap (mis. HEIC di Safari lama).
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight });
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

async function toJpeg(src: CanvasImageSource & { width: number; height: number }, maxSide: number, quality: number) {
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(src.width * scale);
  canvas.height = Math.round(src.height * scale);
  canvas.getContext("2d")!.drawImage(src, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
}

/** Kecilkan foto & ubah format yang tidak umum (HEIC dari iPhone/Android, dll.) menjadi JPG. */
async function shrink(file: File): Promise<File> {
  const isImage = file.type.startsWith("image/") || (!file.type && /\.(heic|heif|jpe?g|png|webp|avif)$/i.test(file.name));
  if (!isImage || file.type === "image/gif") return file;
  const needsConvert = !WEB_TYPES.includes(file.type);
  if (!needsConvert && file.size < MIN_BYTES) return file;
  try {
    const src = await decode(file);
    let blob = await toJpeg(src, MAX_SIDE, 0.85);
    if (blob && blob.size > SAFE_BYTES) blob = await toJpeg(src, 1200, 0.75);
    if (!blob || (!needsConvert && blob.size >= file.size)) return file;
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
