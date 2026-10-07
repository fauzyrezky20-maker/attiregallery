import "server-only";
import { db, schema } from "@/db";

export const DEFAULT_TERMS = `1. Penyewa wajib menunjukkan identitas (KTP/SIM) saat mengambil kebaya.
2. Lama sewa dihitung sejak tanggal ambil sampai tanggal kembali yang tertera di nota.
3. Keterlambatan pengembalian dikenakan denda per hari sesuai ketentuan toko.
4. Kerusakan, noda permanen, atau kehilangan menjadi tanggung jawab penyewa dan diganti sesuai penilaian toko.
5. Penyewa dilarang mengubah ukuran (memotong/menjahit) kebaya tanpa izin toko.
6. Uang sewa yang sudah dibayar tidak dapat dikembalikan bila pesanan dibatalkan kurang dari 2 hari sebelum tanggal ambil.`;

export async function getSettings() {
  const row = await db.query.storeSettings.findFirst();
  if (row) return row;
  const [created] = await db.insert(schema.storeSettings).values({ termsText: DEFAULT_TERMS }).returning();
  return created;
}
export type Settings = Awaited<ReturnType<typeof getSettings>>;
