import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/upload";
import { auth } from "@/lib/auth";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf",
};

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  // Bukti pembayaran hanya untuk pengguna yang sudah login; foto produk & logo bersifat publik.
  if (parts[0] === "bukti" && !(await auth.api.getSession({ headers: req.headers }))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const file = path.resolve(UPLOAD_DIR, ...parts);
  if (!file.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(file);
    return new Response(data, {
      headers: {
        "Content-Type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": parts[0] === "bukti" ? "private, max-age=3600" : "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
