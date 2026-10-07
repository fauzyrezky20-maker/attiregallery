# Mengonlinekan AttireGallery gratis di Oracle Cloud

Hasil akhirnya: aplikasi bisa dibuka 24 jam di `https://nama-toko.duckdns.org` dari komputer kasir maupun ponsel,
gratis selamanya (paket **Always Free** Oracle + subdomain gratis **DuckDNS**), dengan backup database harian.

Waktu yang dibutuhkan sekitar 30–45 menit. Siapkan kartu kredit/debit (hanya untuk verifikasi, tidak ditagih
selama memakai sumber daya Always Free).

## 1. Daftar Oracle Cloud
1. Buka **oracle.com/cloud/free** → *Start for free*.
2. Isi data, pilih **Home Region** terdekat (mis. *Indonesia Central (Jakarta)* atau *Singapore*). Region ini tidak bisa diganti.
3. Verifikasi kartu, tunggu email bahwa akun aktif.

## 2. Buat server (instance)
1. Menu ☰ → **Compute → Instances → Create instance**.
2. **Image:** *Canonical Ubuntu 24.04*.
3. **Shape:** *Ampere → VM.Standard.A1.Flex*, 1 OCPU dan 6 GB memori (masih gratis).
   Kalau muncul "out of capacity", coba lagi nanti atau pilih *VM.Standard.E2.1.Micro* (juga gratis).
4. Bagian **Add SSH keys** → *Generate a key pair for me* → klik **Save private key** (simpan file `.key` baik-baik).
5. Klik **Create**, tunggu status *Running*, lalu catat **Public IP address**.

## 3. Buka port web
1. Di halaman instance, klik nama **Subnet** → **Security Lists** → *Default Security List*.
2. **Add Ingress Rules** dua kali: Source CIDR `0.0.0.0/0`, IP Protocol *TCP*, Destination Port `80`; lalu sekali lagi untuk port `443`.

## 4. Buat alamat web gratis
1. Buka **duckdns.org**, login (Google/GitHub).
2. Isi subdomain, mis. `attiregallery` → **add domain**.
3. Isi kolom **current ip** dengan Public IP server → **update ip**.
   Alamat Anda menjadi `attiregallery.duckdns.org`.

## 5. Unggah dan pasang aplikasi
Buka **Terminal** (Mac) atau **PowerShell** (Windows), di folder tempat file kunci dan `attiregallery-source.zip` disimpan.
Ganti `KUNCI.key`, `IP-SERVER`, dan nama domain sesuai milik Anda:

```bash
# Mac/Linux saja: rapikan izin file kunci
chmod 600 KUNCI.key

scp -i KUNCI.key attiregallery-source.zip ubuntu@IP-SERVER:~
ssh -i KUNCI.key ubuntu@IP-SERVER
```

Setelah masuk ke server (tampilan berubah menjadi `ubuntu@...`):

```bash
sudo apt-get update && sudo apt-get install -y unzip
unzip attiregallery-source.zip && cd attiregallery
sudo bash deploy/install.sh attiregallery.duckdns.org
```

Tunggu sampai muncul **✅ Selesai** (sekitar 5–10 menit), lalu buka `https://attiregallery.duckdns.org`
dan buat akun pemilik.

## Perawatan
- **Status / log:** `sudo systemctl status attiregallery` · `sudo journalctl -u attiregallery -f`
- **Backup:** otomatis tiap hari di `/var/lib/attiregallery/backup` (14 hari terakhir). Unduh ke komputer:
  `scp -i KUNCI.key ubuntu@IP-SERVER:/var/lib/attiregallery/backup/*.db .`
- **Memperbarui aplikasi:** unggah zip versi baru, ekstrak, lalu jalankan `sudo bash deploy/update.sh` dari folder itu.
- **Akun Oracle:** login minimal sesekali; akun gratis yang lama tidak aktif bisa dibersihkan Oracle.
