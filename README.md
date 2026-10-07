# AttireGallery — Aplikasi Pengelola Toko Sewa Kebaya

Satu aplikasi untuk mengelola pesanan sewa, kasir, koleksi kebaya beserta foto, pembayaran QRIS/transfer,
tabungan pelanggan, karyawan & absensi, serta laporan keuangan.

**Teknologi:** Next.js 15 (App Router + Server Actions) · Tailwind CSS 4 · komponen bergaya shadcn/ui ·
Drizzle ORM + SQLite (better-sqlite3) · Better Auth (login email & kata sandi, peran pemilik/kasir/staf).

## Menjalankan

```bash
npm install
cp .env.example .env.local        # lalu isi BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run db:seed                   # opsional: isi data contoh
npm run dev                       # http://localhost:3000
```

Database (`data/attiregallery.db`) dibuat dan dimigrasi otomatis saat aplikasi pertama kali jalan.
Tanpa data contoh, buka aplikasi lalu buat akun pemilik di halaman **/setup**.

Akun data contoh (kata sandi `attire123`): `pemilik@attiregallery.id`, `kasir@attiregallery.id`, `staf@attiregallery.id`.
Isi ulang data contoh: `npm run db:seed -- --reset`.

## Fitur per fase

| Fase | Menu | Isi |
|---|---|---|
| 1 | Pesanan | Daftar & pencarian, detail, status (baru → disewa → selesai / dibatalkan), ubah tanggal/diskon, jadwal ambil & kembali (hari ini, terlambat, 7 hari ke depan) |
| 1 | Jadwal Fitting, Pelanggan | Janji fitting tanggal & jam, catatan ukuran badan (dada, pinggang, pinggul, bahu, lengan, panjang), riwayat fitting & ukuran |
| 1 | Kasir | Pilih/buat pelanggan, pilih kebaya (cek stok per tanggal), durasi sewa → tanggal kembali, total & diskon otomatis, DP, persetujuan S&K, nota cetak |
| 2 | Produk & Foto | Daftar bergambar, tambah/ubah, unggah banyak foto & foto utama, stok total vs. di toko, status perawatan |
| 2 | Pembayaran | QRIS dinamis (nominal otomatis dari QRIS statis toko), konfirmasi transfer, status lunas/menunggu/gagal, unggah & arsip bukti bayar |
| 2 | Tabungan | Saldo per pelanggan, setor, pakai (juga langsung sebagai metode bayar), riwayat mutasi |
| 3 | Dasbor | Penjualan hari ini, pesanan aktif, fitting hari ini, stok menipis, grafik 14 hari, pengingat ambil/kembali/tagihan |
| 3 | Laporan Keuangan | Periode hari/minggu/bulan/kustom, pemasukan per metode, pengeluaran, laba rugi per hari, riwayat penjualan, unduh CSV (Excel) & cetak/PDF |
| 4 | Karyawan, Absensi | Data karyawan, akun login & peran, check-in/out, status hadir/izin/sakit/cuti, rekap per periode |
| 4 | Pengaturan Toko | Profil & logo, lama sewa & denda/hari, metode bayar (tunai/QRIS/transfer), notifikasi, teks & versi S&K, matriks hak akses per peran |

## Aturan bisnis penting

- **Uang** disimpan sebagai bilangan bulat rupiah (bukan desimal) agar tidak ada selisih pembulatan.
- **Subtotal** = harga/hari × jumlah × lama sewa. **Total** = subtotal − diskon + denda.
- **Denda** = hari terlambat × denda per hari, dihitung saat kebaya ditandai kembali.
- **Stok:** ketersediaan untuk tanggal tertentu = unit total − unit di pesanan aktif yang tanggalnya bertumpuk.
  `stock_available` berkurang saat kebaya diambil dan bertambah saat kembali.
- **Pembayaran:** tunai & saldo tabungan langsung lunas; QRIS & transfer berstatus *menunggu* sampai dikonfirmasi.
- **Tabungan:** setoran adalah dana titipan; baru dihitung pemasukan saat dipakai membayar.
- **S&K:** setiap pesanan menyimpan versi S&K yang disetujui. Mengubah teks S&K menaikkan versi otomatis.
- **Hak akses:** pemilik selalu bisa semua menu; menu kasir & staf diatur di Pengaturan. Akun karyawan
  "tidak aktif" tidak bisa login.

## Perbedaan kecil dari skema PRD

- Tabel `users` mengikuti format Better Auth; `password_hash` disimpan di tabel `accounts` (kolom `password`).
  Ada tabel tambahan Better Auth: `sessions`, `accounts`, `verifications`, dan `role_permissions` untuk hak akses.
- Kolom tambahan: `orders.returned_at`, `orders.notes`, `payments.note`, `measurements.hip/shoulder/sleeve`,
  `store_settings.phone/qris_payload/transfer_enabled/cash_enabled/notify_*/reminder_days_before/low_stock_threshold`.

## Deploy

SQLite dan foto disimpan sebagai file di folder `data/`, jadi butuh server dengan disk tetap
(VPS, Railway, Render, Fly.io dengan volume). **Vercel tidak menyimpan file secara permanen**; untuk Vercel,
pindahkan database ke Turso (libSQL) atau PostgreSQL dan foto ke Vercel Blob/S3.
