# Deployment BarberLog

Dokumen ini menjelaskan cara merilis BarberLog: web dashboard + API (satu image Docker via GHCR dan Dokploy) dan aplikasi Android (EAS).

> **Status verifikasi:** `Dockerfile`, workflow `docker.yml`, dan `mobile/eas.json` belum pernah dijalankan end-to-end (Docker tidak tersedia saat ditulis). Bagian bertanda ⚠️ perlu dicek pada rilis pertama.

## 1. Gambaran umum

```
git push main
   └─ workflow "tests" ──sukses──▶ workflow "docker"
                                      └─ build image ─▶ ghcr.io/almunawar12/barberlog-app
                                                           └─ (webhook) ─▶ Dokploy pull + restart
                                                                              ├─ Web  : https://DOMAIN/
                                                                              └─ API  : https://DOMAIN/api/v1
Android : eas build ─▶ APK/AAB, menunjuk ke https://DOMAIN
```

| Komponen            | Dibangun oleh              | Dijalankan di              |
| ------------------- | -------------------------- | -------------------------- |
| Dashboard web + API | GitHub Actions → GHCR      | Dokploy (container, 8080)  |
| PostgreSQL          | — (service yang sudah ada) | Server PostgreSQL terpisah |
| Aplikasi Android    | EAS Build                  | Perangkat pemilik          |

Dashboard dan API adalah **satu aplikasi Laravel**, jadi hanya ada satu image dan satu domain.

## 2. Prasyarat

- Repo GitHub `almunawar12/barberlog-app` dengan GitHub Actions aktif.
- Server dengan Dokploy terpasang, domain yang mengarah ke server (DNS A record).
- Akun Expo (https://expo.dev) untuk EAS.
- Untuk Play Store (opsional): akun Google Play Developer dan service account key.

## 3. Image di GHCR

File terkait: `Dockerfile`, `.dockerignore`, `.github/workflows/docker.yml`.

- Workflow `docker` hanya berjalan setelah workflow `tests` sukses pada push ke `main`.
- Tag yang dihasilkan: `latest` dan `sha-<commit lengkap>`.
- Image berisi PHP 8.5 + Nginx + PHP-FPM (`serversideup/php:8.5-fpm-nginx`), port **8080**, user non-root. Aset Vite sudah dibuild di dalam image.
- `.env` tidak masuk image; semua konfigurasi lewat environment variable di Dokploy.

**Akses image privat.** Secara default package GHCR privat. Pilih salah satu:

- Jadikan package publik: GitHub → Packages → `barberlog-app` → Package settings → Change visibility.
- Atau buat Personal Access Token (classic) dengan scope `read:packages`, lalu jalankan `docker login ghcr.io` di server Dokploy (lihat 4.2 langkah 4).

Pertama kali, package baru muncul setelah workflow `docker` sukses sekali. Jika workflow tidak terpicu, cek bahwa `tests` selesai sukses dan event-nya `push` (bukan pull request).

## 4. Setup Dokploy (sekali saja)

### 4.1 Database

Memakai service PostgreSQL yang sudah ada; tidak ada image database yang dibuild di repo ini.

1. Di server PostgreSQL tersebut, buat database dan user khusus untuk BarberLog (jangan pakai superuser):

```sql
CREATE USER barberlog WITH PASSWORD '...';
CREATE DATABASE barberlog OWNER barberlog;
```

2. Pastikan container aplikasi bisa menjangkau host PostgreSQL (satu jaringan Docker/Dokploy, atau host dan port yang terbuka untuk server aplikasi). Isi `DB_HOST`, `DB_PORT`, dan kredensial di langkah 4.2.
3. Versi PostgreSQL yang diuji di CI adalah 17; versi lain belum diuji.
4. Pastikan database `barberlog` ikut **backup harian** ke penyimpanan terpisah, retensi minimal 14 hari. Uji restore sebelum dipakai produksi (lihat bagian 7).

### 4.2 Aplikasi (Compose, Raw)

1. Di Dokploy buat **Compose** → Source Type **Raw**, Compose Type `docker-compose`.
2. Tempel isi [deploy/docker-compose.yml](../deploy/docker-compose.yml). Variabel tetap (`APP_ENV=production`, `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`, dst.) sudah ada di file itu.
3. Tab **Environment**, isi variabel yang dibaca compose:

| Variabel      | Nilai                                   | Keterangan                                                             |
| ------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| `APP_KEY`     | hasil `php artisan key:generate --show` | Wajib. Buat sekali, simpan aman. Mengganti nilai ini membatalkan sesi. |
| `APP_URL`     | `https://domain-anda`                   | Wajib, harus `https`.                                                  |
| `DB_HOST`     | host PostgreSQL yang sudah ada          | Wajib. Harus terjangkau dari container aplikasi.                       |
| `DB_PORT`     | `5432`                                  | Opsional (bawaan `5432`).                                              |
| `DB_DATABASE` | nama database                           | Opsional (bawaan `barberlog`).                                         |
| `DB_USERNAME` | user database                           | Wajib.                                                                 |
| `DB_PASSWORD` | password database                       | Wajib.                                                                 |
| `LOG_LEVEL`   | `info`                                  | Opsional.                                                              |
| `IMAGE_TAG`   | `latest` atau `sha-<commit>`            | Opsional (bawaan `latest`). Dipakai untuk rollback.                    |

Jangan menaruh nilai rahasia di repo. `APP_KEY` dan `DB_PASSWORD` hanya ada di Dokploy. Compose akan menolak start bila variabel wajib kosong.

4. Image privat: login registry `ghcr.io` di server Dokploy (`docker login ghcr.io -u <user>` dengan token `read:packages`), karena Compose Raw tidak punya kolom kredensial registry.
5. **Jaringan:** compose memakai network `dokploy-network` agar Traefik dapat menjangkau container. Jika database juga container di server yang sama, pastikan ia berada di network yang sama, atau pakai host/port yang terbuka.
6. **Domains** (tab Domains): pilih service `app`, container port `8080`, HTTPS aktif (Let's Encrypt).
7. **Health check:** image sudah punya `HEALTHCHECK` ke `/up`.
8. Jalankan satu instance saja. Migrasi berjalan otomatis saat container start (`AUTORUN_ENABLED=true`); beberapa instance bisa menjalankan migrasi bersamaan.

### 4.3 Deploy otomatis (opsional)

1. Di Dokploy, tab **Deployments** Compose, salin **Webhook URL**.
2. Di GitHub: Settings → Secrets and variables → Actions → New repository secret, nama `DOKPLOY_WEBHOOK_URL`.
3. Setelah image terpush, workflow memanggil webhook itu. ⚠️ Belum diuji pada versi Dokploy Anda; jika tidak memicu deploy, hapus secret dan deploy manual lewat tombol **Deploy**.

Tanpa secret ini, deploy dilakukan manual: tekan **Deploy** di Dokploy setelah workflow `docker` hijau.

## 5. Deploy pertama

1. Push ke `main`, tunggu `tests` lalu `docker` hijau di tab Actions.
2. Deploy di Dokploy; pantau tab **Logs** sampai migrasi selesai dan container sehat.
3. Buka `https://domain-anda/up` → harus menjawab 200.
4. Buat akun pemilik lewat **Terminal** container Dokploy (tidak ada pendaftaran publik):

```sh
php artisan owner:create "Nama Pemilik" email@contoh.com
```

Perintah akan meminta kata sandi. Jika akun sudah ada, gunakan `php artisan owner:reset-password`.

5. Login di web, lalu catat satu transaksi uji dan hapus lewat fitur koreksi (soft delete) untuk memastikan database bekerja.

## 6. Rilis berikutnya, rollback

**Rilis:** merge ke `main` → `tests` → `docker` → deploy (otomatis via webhook atau manual).

**Rollback:** set `IMAGE_TAG` di tab Environment ke tag commit sebelumnya, misalnya `sha-<commit-lama>`, lalu Deploy. Migrasi tidak ikut mundur; jangan rollback melewati rilis yang mengubah skema tanpa memeriksa migrasinya. Setelah rollback selesai dan stabil, kembalikan ke `latest` hanya setelah perbaikan dirilis.

Sebelum rilis yang berisi migrasi destruktif, buat backup manual dulu.

## 7. Backup dan restore

Backup harian otomatis diatur di Dokploy (bagian 4.1). Backup manual:

```sh
pg_dump -h HOST -U USER -d barberlog -Fc -f barberlog-$(date +%F).dump
```

Restore ke database **kosong atau database uji**, bukan database produksi yang berjalan:

```sh
pg_restore -h HOST -U USER -d barberlog_restore --no-owner barberlog-YYYY-MM-DD.dump
```

Lakukan uji restore secara berkala; backup yang belum pernah dipulihkan belum terbukti berguna.

## 8. Android (EAS)

File terkait: `mobile/eas.json`, `mobile/app.json`.

| Profil       | Hasil | Dipakai untuk                              |
| ------------ | ----- | ------------------------------------------ |
| `preview`    | APK   | Instal langsung di perangkat pemilik       |
| `production` | AAB   | Unggah ke Google Play; versi naik otomatis |

### 8.1 Setup (sekali saja)

1. Di `mobile/eas.json`, ganti `EXPO_PUBLIC_API_URL` pada setiap profil dengan URL produksi: `https://domain-anda` (tanpa `/api/v1`; klien menambahkannya sendiri).
2. Di folder `mobile`:

```sh
npx eas-cli login
npx eas-cli init
```

`eas init` menambahkan `extra.eas.projectId` ke `app.json`; commit perubahan itu.

### 8.2 Build

```sh
cd mobile
npx eas-cli build -p android --profile preview      # APK
npx eas-cli build -p android --profile production   # AAB
```

Unduh APK dari tautan hasil build lalu instal di perangkat. Build pertama `production` akan menawarkan pembuatan keystore; biarkan EAS mengelolanya dan **simpan backup kredensial** (`npx eas-cli credentials`), karena kehilangan keystore berarti tidak bisa memperbarui aplikasi di Play Store.

### 8.3 Rilis Play Store (opsional)

```sh
npx eas-cli submit -p android --profile production
```

Perlu Google service account key (konfigurasi di `eas.json` → `submit`, atau diminta interaktif). Track bawaan: `internal`.

### 8.4 Catatan penting

- `EXPO_PUBLIC_*` ditanam saat build. Mengganti domain API berarti build ulang aplikasi.
- Domain harus HTTPS; aplikasi tidak dikonfigurasi untuk HTTP biasa.
- Setiap rilis mobile tidak bergantung pada deploy web, tetapi kontrak API (`docs/openapi.yaml`) harus tetap kompatibel dengan versi aplikasi yang terpasang.
- Token mobile berlaku 30 hari; setelah itu pengguna diminta login ulang.

## 9. Pemecahan masalah

| Gejala                                        | Kemungkinan penyebab dan tindakan                                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Workflow `docker` tidak jalan                 | `tests` gagal, atau dipicu dari pull request. Hanya push ke `main` yang membangun image.                              |
| Dokploy gagal menarik image (`denied`)        | Package privat tanpa kredensial. Lihat bagian 3.                                                                      |
| Build image gagal di `npm run build`          | Periksa log; plugin Wayfinder butuh `php artisan` jalan di tahap build. ⚠️ Tahap ini belum diuji.                     |
| Build gagal di `pdo_pgsql`                    | Image dasar tanpa ekstensi itu; tambahkan lewat `install-php-extensions pdo_pgsql` di Dockerfile.                     |
| 500 saat membuka halaman                      | `APP_KEY` kosong atau database tidak terjangkau. Lihat tab Logs.                                                      |
| Container tidak sehat                         | Migrasi gagal (cek kredensial DB), atau health check bukan `/up`.                                                     |
| Login web selalu 419 / sesi hilang            | `APP_URL` bukan `https`, atau `SESSION_SECURE_COOKIE=true` tetapi diakses lewat HTTP. Jangan mematikan proteksi CSRF. |
| Tautan/aset memakai `http://`                 | Proxy tidak dipercaya; pastikan versi terbaru `bootstrap/app.php` (`trustProxies`) ikut ter-deploy.                   |
| Aplikasi mobile: gagal terhubung              | `EXPO_PUBLIC_API_URL` salah atau masih placeholder. Perbaiki di `eas.json` dan build ulang.                           |
| Aplikasi mobile: 401 terus                    | Token kedaluwarsa atau `APP_KEY` diganti. Login ulang.                                                                |
| `owner:create` gagal "Akun pemilik sudah ada" | Akun sudah dibuat. Pakai `owner:reset-password`.                                                                      |

## 10. Daftar periksa sebelum produksi

- [ ] `APP_DEBUG=false`, `APP_URL` `https`, `SESSION_SECURE_COOKIE=true`
- [ ] `APP_KEY` tersimpan aman di luar repo
- [ ] Backup harian aktif dan restore pernah diuji
- [ ] Akun pemilik dibuat; tidak ada akun contoh/seed
- [ ] `EXPO_PUBLIC_API_URL` bukan placeholder
- [ ] Keystore Android dibackup
- [ ] `/up` menjawab 200 dan satu transaksi uji berhasil disimpan dari web dan dari aplikasi
