import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");
const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};
const MAX_BYTES = 8 * 1024 * 1024;

/** Simpan file unggahan ke penyimpanan lokal; mengembalikan URL publik (/uploads/...). */
export async function saveUpload(file: FormDataEntryValue | null, folder: "produk" | "bukti" | "toko") {
  if (!file || typeof file === "string" || file.size === 0) return null;
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error("Format file harus JPG, PNG, WEBP, GIF, atau PDF.");
  if (file.size > MAX_BYTES) throw new Error("Ukuran file maksimal 8 MB.");
  const dir = path.join(UPLOAD_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomUUID()}${ext}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${name}`;
}
