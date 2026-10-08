import fs from "node:fs/promises";
import path from "node:path";
import { readPrivateBlob, UPLOAD_DIR } from "@/lib/upload";
import { auth } from "@/lib/auth";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf",
};

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  let parts = (await params).path;
  // File di Blob store privat: /uploads/blob/<folder>/<nama>
  const fromBlob = parts[0] === "blob";
  if (fromBlob) parts = parts.slice(1);
  // Bukti pembayaran hanya untuk pengguna yang sudah login; foto produk & logo bersifat publik.
  if (parts[0] === "bukti" && !(await auth.api.getSession({ headers: req.headers }))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const cacheControl = parts[0] === "bukti" ? "private, max-age=3600" : "public, max-age=31536000, immutable";
  if (fromBlob) {
    const res = await readPrivateBlob(parts.join("/")).catch(() => null);
    if (!res) return new Response("Not found", { status: 404 });
    return new Response(res.stream, {
      headers: { "Content-Type": res.blob.contentType, "Cache-Control": cacheControl },
    });
  }
  const file = path.resolve(UPLOAD_DIR, ...parts);
  if (!file.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(file);
    return new Response(data, {
      headers: {
        "Content-Type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": cacheControl,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
