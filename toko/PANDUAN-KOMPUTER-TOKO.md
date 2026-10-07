# Menjalankan AttireGallery di komputer toko (gratis, tanpa kartu kredit)

Aplikasi berjalan di komputer/laptop kasir. Ponsel karyawan bisa ikut memakainya lewat **Wi-Fi toko yang sama**.
Data tersimpan di komputer itu (folder `data`).

## Pemasangan (sekali saja)
1. Pasang **Node.js** versi **LTS** dari **nodejs.org** (klik Next sampai selesai).
2. Ekstrak `attiregallery-source.zip` ke tempat yang mudah ditemukan, mis. `Documents\attiregallery`.
3. Buka folder `toko`, klik dua kali **JALANKAN-TOKO.bat** (Windows) atau **jalankan-toko.command** (Mac).
4. Pertama kali akan memasang komponen dan menyiapkan aplikasi (±5–10 menit, perlu internet).
   Bila Windows menanyakan izin jaringan/firewall, pilih **Allow** untuk jaringan **Private**.
5. Browser terbuka otomatis → buat akun pemilik.

## Pemakaian harian
- Saat toko buka, klik dua kali **JALANKAN-TOKO.bat**. **Jangan tutup** jendela hitamnya selama dipakai.
- **Dari ponsel:** sambungkan ke Wi-Fi toko, buka alamat `http://192.168.x.x:3000` yang tertulis di jendela hitam.
  Simpan sebagai bookmark / "Tambahkan ke layar utama".
- Agar menyala otomatis saat komputer hidup (Windows): tekan `Win + R`, ketik `shell:startup`, Enter,
  lalu buat *shortcut* JALANKAN-TOKO.bat di folder yang terbuka.

## Membuka dari luar toko (opsional)
Klik dua kali **BUKA-DARI-INTERNET.bat** (setelah JALANKAN-TOKO.bat berjalan). Akan muncul alamat
`https://….trycloudflare.com` yang bisa dibuka dari mana saja, gratis tanpa akun.
Alamat ini **berganti** setiap kali dijalankan ulang, dan hanya bisa diakses selama komputer toko menyala.

## Backup data
Semua data ada di folder `data` (database + foto). Salin folder itu ke flashdisk atau Google Drive secara rutin,
misalnya seminggu sekali. Untuk memulihkan, kembalikan folder `data` ke tempatnya.

## Catatan
- Jangan hapus file `.env.local` di folder aplikasi; berisi kunci rahasia login.
- Bila alamat IP di ponsel tidak terbuka, pastikan ponsel dan komputer di Wi-Fi yang sama dan izin firewall sudah **Allow**.
