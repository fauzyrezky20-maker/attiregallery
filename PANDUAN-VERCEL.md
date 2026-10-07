# Mengonlinekan AttireGallery di Vercel (gratis, tanpa kartu kredit)

Susunannya: **Vercel** menjalankan aplikasi, **Turso** menyimpan database, **Vercel Blob** menyimpan foto & bukti bayar.
Ketiganya bisa didaftarkan memakai akun GitHub, tanpa kartu kredit.

> Catatan: paket gratis Vercel (Hobby) menurut aturannya untuk pemakaian pribadi/non-komersial.
> Bila toko sudah ramai, pertimbangkan naik ke paket Pro.

## 1. Kode di GitHub
Kode aplikasi harus ada di repo GitHub Anda (mis. `attiregallery`). Claude yang mengunggahkannya.

## 2. Database Turso
1. Buka **turso.tech** → **Sign up** → pilih **Continue with GitHub**.
2. Klik **Create Database**, beri nama `attiregallery`, pilih lokasi **Singapore** (terdekat), lalu buat.
3. Di halaman database, salin **URL** (diawali `libsql://`) → ini `TURSO_DATABASE_URL`.
4. Klik **Create Token** (Read & Write) → salin tokennya → ini `TURSO_AUTH_TOKEN`.

## 3. Proyek Vercel
1. Buka **vercel.com** → **Sign Up** → **Continue with GitHub**, pilih paket **Hobby**.
2. **Add New… → Project** → pilih repo `attiregallery` → **Import**.
3. Buka bagian **Environment Variables**, isi tiga baris:

   | Name | Value |
   |---|---|
   | `TURSO_DATABASE_URL` | URL dari langkah 2.3 |
   | `TURSO_AUTH_TOKEN` | token dari langkah 2.4 |
   | `BETTER_AUTH_SECRET` | teks acak minimal 32 karakter (bisa ambil dari **generate-secret.vercel.app/32**) |

4. Klik **Deploy** dan tunggu sampai selesai (± 2–3 menit).

## 4. Penyimpanan foto (Vercel Blob)
1. Di proyek Vercel, buka tab **Storage** → **Create** → **Blob** → beri nama → **Create**.
2. Pastikan Blob tersambung ke proyek `attiregallery` (Vercel otomatis menambah `BLOB_READ_WRITE_TOKEN`).
3. Buka tab **Deployments** → titik tiga di deployment teratas → **Redeploy**.

## 5. Mulai pakai
Buka alamat proyek (mis. `https://attiregallery.vercel.app`). Karena database masih kosong, Anda langsung
diarahkan ke halaman pembuatan akun pemilik.

## Memperbarui aplikasi
Setiap perubahan kode yang masuk ke GitHub otomatis di-deploy ulang oleh Vercel. Struktur database ikut
diperbarui otomatis saat deploy.

## Bila ada masalah
- **Deploy gagal di langkah "Database siap"**: periksa lagi `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN`.
- **Tidak bisa login**: pastikan `BETTER_AUTH_SECRET` sudah diisi, lalu Redeploy.
- **Unggah foto gagal**: pastikan Blob sudah tersambung (langkah 4) dan sudah Redeploy.
