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

async function putBlob(pathname: string, file: File, contentType: string) {
  const order: Access[] = blobAccess ? [blobAccess] : ["private", "public"];
  let lastError: unknown;
  for (const access of order) {
    try {
      const blob = await put(pathname, file, { access, contentType });
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
export async function saveUpload(file: FormDataEntryValue | null, folder: "produk" | "bukti" | "toko" | "fitting" | "tabungan" | "absensi") {
  if (!file || typeof file === "string" || file.size === 0) return null;
  // Beberapa HP mengirim file tanpa tipe; tebak dari nama file.
  const byName = Object.entries(ALLOWED).find(([, e]) => file.name.toLowerCase().endsWith(e) || (e === ".jpg" && /\.jpe?g$/i.test(file.name)));
  const type = ALLOWED[file.type] ? file.type : byName?.[0];
  const ext = type ? ALLOWED[type] : undefined;
  if (!ext || !type) {
    if (/heic|heif/i.test(file.type + file.name)) {
      throw new Error("Foto HEIC belum bisa dibaca. Coba pilih foto lewat Chrome/Safari terbaru, atau ubah kamera HP ke format JPG (iPhone: Pengaturan → Kamera → Format → Paling Kompatibel).");
    }
    throw new Error("Format file harus JPG, PNG, WEBP, GIF, atau PDF.");
  }
  if (file.size > MAX_BYTES) throw new Error("Ukuran file maksimal 8 MB.");
  const name = `${crypto.randomUUID()}${ext}`;
  if (useBlob) {
    try {
      return await putBlob(`${folder}/${name}`, file, type);
    } catch (e) {
      console.error("Blob upload gagal", e);
      throw new Error("Foto gagal disimpan ke penyimpanan. Coba lagi; kalau tetap gagal, kirim screenshot pesan ini.");
    }
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
