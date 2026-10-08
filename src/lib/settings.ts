import "server-only";
import { db, schema } from "@/db";

export const DEFAULT_TERMS = `1. Penyewa wajib menunjukkan identitas (KTP/SIM) saat mengambil kebaya.
2. Lama sewa dihitung sejak tanggal ambil sampai tanggal kembali yang tertera di nota.
3. Keterlambatan pengembalian per hari dikenakan denda sesuai harga sewa baju.
4. Kerusakan, noda permanen, atau kehilangan menjadi tanggung jawab penyewa dan diganti sesuai penilaian toko.
5. Penyewa dilarang mengubah ukuran (memotong/menjahit) kebaya tanpa izin toko.
6. Wajib pelunasan sewa maks. H-3 jadwal sewa & telah menyetujui aturan yang berlaku.`;

/** Tata cara sewa sesuai katalog toko. */
export const DEFAULT_GUIDE = `ALUR: Chat admin → cek ketersediaan attire & tanggal sewa → konsultasi → isi format booking → bayar DP.
FITTING: Buat janji temu → datang fitting → resize (jika diperlukan). Saat fitting wajib memakai inner/manset & melepas aksesoris (cincin, gelang, kalung).
DP: Fix booking setelah bayar DP sebesar Rp200.000.
PELUNASAN: Maksimal H-3 sebelum jadwal sewa.
AMBIL: Pengambilan attire di toko pukul 16.00–20.00, wajib konfirmasi dulu lewat WhatsApp.
JAMINAN: Meninggalkan KTP sebagai jaminan.`;

export async function getSettings() {
  const row = await db.query.storeSettings.findFirst();
  const s = row ?? (await db.insert(schema.storeSettings).values({ termsText: DEFAULT_TERMS }).returning())[0];
  return { ...s, rentalGuide: s.rentalGuide ?? DEFAULT_GUIDE };
}
export type Settings = Awaited<ReturnType<typeof getSettings>>;
