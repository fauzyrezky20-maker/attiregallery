import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");
/** Di Vercel file disimpan di Vercel Blob (otomatis aktif bila Blob tersambung); lokal di folder data/uploads. */
const useBlob = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
/** Prefix URL untuk file di Blob store privat; dilayani lewat route /uploads/[...path]. */
const PRIVATE_PREFIX = "/uploads/blob/";

type Access = "public" | "private";
// Store Blob bisa dibuat Public atau Private; kalau tidak diset, coba privat lalu publik.
let blobAccess: Access | undefined =
  process.env.BLOB_ACCESS === "public" || process.env.BLOB_ACCESS === "private" ? process.env.BLOB_ACCESS : undefined;

async function putBlob(pathname: string, file: File) {
  const order: Access[] = blobAccess ? [blobAccess] : ["private", "public"];
  let lastError: unknown;
  for (const access of order) {
    try {
      const blob = await put(pathname, file, { access, contentType: file.type });
      blobAccess = access;
      return access === "public" ? blob.url : PRIVATE_PREFIX + blob.pathname;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/** Ambil file dari Blob store privat (dipakai route /uploads/blob/...). */
export async function readPrivateBlob(pathname: string) {
  if (!useBlob) return null;
  const res = await get(pathname, { access: "private" });
  return res?.statusCode === 200 ? res : null;
}

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
    return putBlob(`${folder}/${name}`, file);
  }
  if (process.env.VERCEL) {
    throw new Error("Penyimpanan foto belum aktif. Di Vercel buka Storage, buat Blob, sambungkan ke proyek ini, lalu Redeploy.");
  }
  const dir = path.join(UPLOAD_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${name}`;
}

export async function deleteUpload(url: string) {
  if (url.startsWith(PRIVATE_PREFIX)) {
    if (useBlob) await del(url.slice(PRIVATE_PREFIX.length)).catch(() => undefined);
  } else if (url.startsWith("/uploads/")) {
    await fs.rm(path.join(UPLOAD_DIR, url.replace("/uploads/", "")), { force: true });
  } else if (useBlob && url.startsWith("https://")) {
    await del(url).catch(() => undefined);
  }
}
