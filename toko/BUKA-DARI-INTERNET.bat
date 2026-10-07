@echo off
title AttireGallery - akses internet
cd /d "%~dp0"
rem Membuat tautan https sementara (gratis, tanpa akun) ke aplikasi di komputer ini lewat Cloudflare.
rem Jalankan JALANKAN-TOKO.bat lebih dulu.

if not exist "cloudflared.exe" (
  echo  Mengunduh cloudflared...
  powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
  if not exist "cloudflared.exe" (
    echo  Gagal mengunduh. Periksa koneksi internet.
    pause
    exit /b 1
  )
)

echo.
echo  ================================================
echo   Tunggu sampai muncul alamat seperti:
echo     https://kata-acak.trycloudflare.com
echo   Alamat itu bisa dibuka dari mana saja.
echo   Alamat BERUBAH setiap kali file ini dijalankan ulang.
echo   Tutup jendela ini untuk mematikan akses internet.
echo  ================================================
echo.
cloudflared.exe tunnel --url http://localhost:3000
pause
