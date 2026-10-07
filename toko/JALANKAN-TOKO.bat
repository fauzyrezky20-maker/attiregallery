@echo off
title AttireGallery
cd /d "%~dp0\.."

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js belum terpasang.
  echo  Unduh dan pasang versi "LTS" dari https://nodejs.org lalu jalankan file ini lagi.
  start https://nodejs.org
  pause
  exit /b 1
)

if exist ".env.local" goto siap
echo  Menyiapkan pengaturan pertama kali...
for /f "delims=" %%s in ('powershell -NoProfile -Command "[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))"') do set SECRET=%%s
> .env.local echo BETTER_AUTH_SECRET=%SECRET%
>> .env.local echo BETTER_AUTH_URL=http://localhost:3000
>> .env.local echo AUTH_ALLOWED_HOSTS=*
>> .env.local echo LOCAL_NETWORK_MODE=1
:siap

if not exist "node_modules" (
  echo  Memasang komponen aplikasi, mohon tunggu beberapa menit...
  call npm ci --no-audit --no-fund || goto gagal
)

if not exist ".next\BUILD_ID" (
  echo  Menyiapkan aplikasi, mohon tunggu...
  call npm run build || goto gagal
)

echo.
echo  ================================================
echo   AttireGallery sudah berjalan.
echo   Di komputer ini : http://localhost:3000
echo   Dari ponsel (Wi-Fi yang sama), buka salah satu:
for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { $_.IPAddress }"') do echo     http://%%i:3000
echo.
echo   Jangan tutup jendela ini selama toko buka.
echo  ================================================
echo.
start "" http://localhost:3000
call npm start -- -H 0.0.0.0 -p 3000
goto :eof

:gagal
echo.
echo  Terjadi kesalahan. Foto layar jendela ini dan kirimkan ke Claude.
pause
