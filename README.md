# IT Ticketing System

Website tiket IT berbasis `React + Vite` di frontend, dengan backend `Express.js` dan database `PostgreSQL`.

## Deskripsi

IT Ticketing System adalah aplikasi helpdesk internal untuk mencatat, memantau, menugaskan, dan mengevaluasi penyelesaian kendala IT dalam satu workspace. Sistem ini dirancang untuk kebutuhan operasional perusahaan: pengguna dapat mengajukan tiket dengan detail masalah, teknisi dapat menangani pekerjaan yang ditugaskan, sementara admin dan super admin memiliki dashboard untuk mengelola data, laporan, SLA, hak akses, dan konfigurasi sistem.

## Keunggulan Sistem

- Alur tiket lengkap dari pengajuan, triase, penugasan teknisi, proses pengerjaan, penyelesaian, hingga riwayat dan evaluasi.
- Role-based access control untuk `User`, `Technician`, `Admin`, dan `Super Admin`, sehingga menu dan aksi dapat disesuaikan berdasarkan peran.
- Dashboard operasional berbeda untuk setiap peran agar pengguna hanya melihat informasi yang relevan dengan pekerjaannya.
- Laporan tiket interaktif dengan filter periode, status, prioritas, kategori, teknisi, dan departemen.
- Ekspor laporan ke Excel untuk kebutuhan rekap, audit, atau pelaporan manajemen.
- Dukungan SLA, prioritas, kategori masalah, dan status tiket agar proses penanganan lebih terukur.
- Manajemen pengumuman untuk menyampaikan informasi layanan IT kepada pengguna dan teknisi.
- Riwayat audit untuk membantu pelacakan aktivitas penting pada sistem.
- Pengaturan identitas workspace, termasuk nama sistem dan logo perusahaan.
- Dukungan lampiran tiket melalui Cloudflare R2 dengan presigned URL.
- Dukungan notifikasi email melalui SMTP Brevo untuk aktivasi akun, reset password, dan aktivitas tiket penting.
- Arsitektur frontend dan backend terpisah sehingga frontend mudah dideploy ke Vercel, sementara backend dapat ditempatkan pada layanan Node.js terpisah.

## Fitur Utama

### Pengguna

- Membuat tiket baru berdasarkan kategori, prioritas, departemen, lokasi, kontak, deskripsi masalah, dan lampiran.
- Menyimpan draft tiket sebelum dikirim.
- Melihat daftar dan detail tiket milik sendiri.
- Mengikuti perkembangan status tiket dan riwayat aktivitas.
- Mengakses info layanan atau pengumuman dari admin.

### Teknisi

- Melihat dashboard pekerjaan teknisi.
- Mengakses tiket yang ditugaskan.
- Memantau tiket aktif yang sedang dikerjakan.
- Melihat riwayat tiket yang pernah ditangani.
- Mengakses pengumuman khusus teknisi.

### Admin

- Melihat dashboard operasional seluruh tiket.
- Mengelola semua tiket dan detail penanganannya.
- Mengelola data pengguna, data teknisi, kategori masalah, dan SLA.
- Membuat dan mengelola pengumuman.
- Membuka laporan tiket dengan grafik distribusi dan tren.
- Mengekspor laporan ke file Excel.
- Melihat riwayat audit dan ringkasan sistem.

### Super Admin

- Mengakses seluruh fitur admin.
- Mengelola pengaturan sistem seperti nama aplikasi, logo, pendaftaran mandiri, batas lampiran, notifikasi, dan tampilan laporan default.
- Mengatur permissions role untuk menentukan hak akses tiap peran.
- Menjadi kontrol utama sistem dengan akses penuh yang dikunci.

## Alur Kerja Singkat

1. Pengguna membuat tiket berisi detail kendala IT.
2. Admin melakukan pemantauan, triase, atau penugasan tiket ke teknisi.
3. Teknisi menangani tiket dan memperbarui progres pekerjaan.
4. Tiket diselesaikan, dicatat dalam riwayat, dan dapat dianalisis melalui laporan.
5. Admin atau super admin menggunakan dashboard, laporan, SLA, dan audit log untuk evaluasi layanan IT.

## Stack

- Frontend: React 18, Vite, React Router, Tailwind CSS, Font Awesome
- Backend: Express.js, PostgreSQL, `pg`, `bcryptjs`
- Runtime:
  - Frontend selalu membaca runtime config dari `backend/.env`
  - Data aplikasi berjalan penuh melalui backend Express + PostgreSQL

## Menjalankan Frontend

1. Install dependency frontend

```bash
npm install
```

2. Siapkan environment backend terlebih dulu. Frontend akan membaca source of truth dari `backend/.env`.

3. Jalankan frontend

```bash
npm run dev
```

## Menjalankan Backend

1. Install dependency backend

```bash
npm --prefix backend install
```

2. Siapkan environment backend dari [backend/.env.example](</c:/webtiketingit/backend/.env.example>)


3. Jalankan backend

```bash
npm run backend:dev
```

Backend akan otomatis:

- membuat database target jika belum ada dan user PostgreSQL memiliki izin yang cukup
- membuat tabel aplikasi utama bila belum ada
- memastikan default `system_settings` dan `role_permissions` tersedia
- membuka API di `http://localhost:3001/api`

## Pengaturan Mode

- `APP_ENV=development` untuk mode development
- `APP_ENV=production` untuk mode production
- Jika perlu override per environment, Anda bisa menambahkan file seperti `backend/.env.production`
- Frontend tidak lagi membutuhkan `.env` terpisah untuk `VITE_API_BASE_URL`, `VITE_APP_BASE_URL`, atau `VITE_APP_NAME`

## Deploy Frontend ke Vercel

Project sudah menyertakan [vercel.json](</c:/webtiketingit/vercel.json>) untuk build Vite dan rewrite React Router ke `index.html`.

1. Pastikan backend Express sudah online lebih dulu di layanan Node.js terpisah.
2. Buat project baru di Vercel dari repository ini.
3. Gunakan konfigurasi berikut:

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

4. Isi Environment Variables di Vercel:

```txt
VITE_API_BASE_URL=https://domain-backend-anda.com/api
VITE_APP_BASE_URL=https://domain-frontend-anda.vercel.app
VITE_APP_NAME=IT Ticketing System
VITE_APP_ENV=production
```

5. Pada environment backend, sesuaikan juga:

```txt
APP_ENV=production
API_PUBLIC_URL=https://domain-backend-anda.com
FRONTEND_ORIGIN=https://domain-frontend-anda.vercel.app
FRONTEND_APP_URL=https://domain-frontend-anda.vercel.app
DATABASE_SSL=true
```

Catatan: backend Express + PostgreSQL di project ini tidak ikut dideploy oleh konfigurasi Vercel frontend. Deploy backend ke layanan Node.js yang mendukung long-running server dan PostgreSQL, lalu arahkan `VITE_API_BASE_URL` ke endpoint backend tersebut.

## Lampiran Cloudflare R2

- Konfigurasi R2 disimpan di `backend/.env` saja melalui `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, dan `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT` opsional. Jika dikosongkan, backend otomatis memakai endpoint `https://<account-id>.r2.cloudflarestorage.com`
- `R2_PUBLIC_BASE_URL` opsional jika bucket atau custom domain Anda memang dibuka publik
- `R2_PRESIGN_TTL_SECONDS` opsional untuk masa berlaku URL upload/download bertanda tangan
- Karena upload file dilakukan langsung dari browser ke R2 memakai presigned URL, bucket R2 perlu CORS yang mengizinkan origin frontend dan method `PUT`, `GET`, serta `HEAD`

## Akun Seed Awal

Password awal seluruh akun seed:

```txt
demo12345
```

Akun yang tersedia:

- `user@itticketing.local`
- `technician@itticketing.local`
- `admin@itticketing.local`
- `superadmin@itticketing.local`

## Struktur Baru

- Frontend tidak lagi memiliki mode demo lokal.
- Data aplikasi dipersist ke PostgreSQL melalui backend Express.
- `schema.sql` dan `seed.sql` di root menjadi sumber setup database yang nyata.

## Catatan

- Email backend sekarang mendukung SMTP Brevo untuk aktivasi akun, reset password, dan notifikasi tiket bila `BREVO_SMTP_*` serta `MAIL_*` sudah diisi di `backend/.env`.
- Untuk notifikasi tiket via email, aktifkan juga flag `enable_email_notifications` dari pengaturan sistem.
- Lampiran di mode backend sekarang bisa diunggah ke Cloudflare R2 bila konfigurasi `R2_*` tersedia.
- Seluruh sumber konfigurasi frontend/backend sekarang dipusatkan ke `backend/.env`.
