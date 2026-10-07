import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");
/** Di Vercel file disimpan di Vercel Blob (otomatis aktif bila token Blob tersedia); lokal di folder data/uploads. */
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};
const MAX_BYTES = 8 * 1024 * 1024;

/** Simpan file unggahan; mengembalikan URL yang bisa dipakai di <img>/<a>. */
export async function saveUpload(file: FormDataEntryValue | null, folder: "produk" | "bukti" | "toko") {
  if (!file || typeof file === "string" || file.size === 0) return null;
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error("Format file harus JPG, PNG, WEBP, GIF, atau PDF.");
  if (file.size > MAX_BYTES) throw new Error("Ukuran file maksimal 8 MB.");
  const name = `${crypto.randomUUID()}${ext}`;
  if (useBlob) {
    const blob = await put(`${folder}/${name}`, file, { access: "public", contentType: file.type });
    return blob.url;
  }
  const dir = path.join(UPLOAD_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${name}`;
}

export async function deleteUpload(url: string) {
  if (url.startsWith("/uploads/")) {
    await fs.rm(path.join(UPLOAD_DIR, url.replace("/uploads/", "")), { force: true });
  } else if (useBlob && url.startsWith("https://")) {
    await del(url).catch(() => undefined);
  }
}
