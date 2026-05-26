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
npm --prefix frontend install
```

2. Siapkan environment backend terlebih dulu. Frontend membaca konfigurasi utama dari `backend/.env`, dengan override opsional dari `frontend/.env`.

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

## Migrasi dan Seed Database

Jalankan dari root project:

```bash
npm run db:migrate
```

Perintah ini memakai konfigurasi `backend/.env`, membuat tabel yang belum ada, menjalankan perubahan schema ringan, dan memastikan default system settings serta role permissions tersedia.

Untuk mengisi ulang data demo dari [db/seed.sql](</c:/webtiketingit/db/seed.sql>):

```bash
npm run db:seed
```

Untuk migrate lalu seed sekaligus:

```bash
npm run db:setup
```

Catatan: `db:seed` akan menjalankan `truncate` pada tabel aplikasi sesuai isi [db/seed.sql](</c:/webtiketingit/db/seed.sql>), jadi gunakan hanya untuk database development/demo atau database baru.

## Pengaturan Mode

- `APP_ENV=development` untuk mode development
- `APP_ENV=production` untuk mode production
- Jika perlu override per environment, Anda bisa menambahkan file seperti `backend/.env.production`
- File frontend berada di `frontend/.env`; `VITE_API_BASE_URL` boleh berupa URL backend tanpa `/api` karena build akan menormalkannya otomatis.

## Deploy ke Vercel dengan Frontend dan Backend Terpisah

Project ini disiapkan sebagai dua project Vercel dari repository yang sama:

- Frontend: Root Directory repository utama, memakai [vercel.json](</c:/webtiketingit/vercel.json>)
- Frontend source: folder `frontend`
- Backend: Root Directory `backend`, memakai [backend/vercel.json](</c:/webtiketingit/backend/vercel.json>)

Deploy backend terlebih dahulu supaya URL API sudah tersedia saat frontend dibuild.

### Backend Vercel

1. Buat project baru di Vercel dari repository ini.
2. Set Root Directory ke:

```txt
backend
```

3. Gunakan konfigurasi berikut:

```txt
Framework Preset: Other
Build Command: dikosongkan
Install Command: npm install
Output Directory: dikosongkan
```

4. Isi Environment Variables backend:

```txt
APP_ENV=production
APP_NAME=IT Ticketing System
API_PUBLIC_URL=https://domain-backend-anda.vercel.app
DATABASE_URL=postgresql://user:password@host:5432/database
DATABASE_SSL=true
AUTO_CREATE_DATABASE=false
FRONTEND_ORIGIN=https://domain-frontend-anda.vercel.app
FRONTEND_APP_URL=https://domain-frontend-anda.vercel.app
JWT_SECRET=isi-dengan-secret-panjang-dan-acak
JWT_EXPIRES_IN=7d
```

Jika memakai Preview Deployment Vercel, `FRONTEND_ORIGIN` bisa berisi beberapa origin dipisahkan koma:

```txt
FRONTEND_ORIGIN=https://domain-frontend-anda.vercel.app,https://preview-frontend-anda.vercel.app
```

5. Setelah deploy, cek endpoint:

```txt
https://domain-backend-anda.vercel.app/api/health
```

### Frontend Vercel

Project utama sudah menyertakan [vercel.json](</c:/webtiketingit/vercel.json>) untuk build Vite dari folder `frontend` dan rewrite React Router ke `index.html`.

1. Buat project Vercel kedua dari repository yang sama.
2. Set Root Directory ke root repository.
3. Gunakan konfigurasi berikut:

```txt
Framework Preset: Vite
Build Command: npm --prefix frontend run build
Output Directory: frontend/dist
Install Command: npm --prefix frontend install
```

4. Isi Environment Variables frontend:

```txt
VITE_API_BASE_URL=https://domain-backend-anda.com/api
VITE_APP_BASE_URL=https://domain-frontend-anda.vercel.app
VITE_APP_NAME=IT Ticketing System
VITE_APP_ENV=production
```

Gunakan domain backend Vercel yang sudah jadi, misalnya:

```txt
VITE_API_BASE_URL=https://domain-backend-anda.vercel.app/api
```

Catatan: database PostgreSQL tetap harus memakai provider eksternal seperti Neon, Supabase, Railway, atau layanan PostgreSQL lain. Vercel hanya menjalankan frontend dan serverless function backend.

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

- Source frontend berada di folder `frontend/`.
- Frontend tidak lagi memiliki mode demo lokal.
- Data aplikasi dipersist ke PostgreSQL melalui backend Express.
- `schema.sql` dan `seed.sql` di root menjadi sumber setup database yang nyata.

## Catatan

- Email backend sekarang mendukung SMTP Brevo untuk aktivasi akun, reset password, dan notifikasi tiket bila `BREVO_SMTP_*` serta `MAIL_*` sudah diisi di `backend/.env`.
- Untuk notifikasi tiket via email, aktifkan juga flag `enable_email_notifications` dari pengaturan sistem.
- Lampiran di mode backend sekarang bisa diunggah ke Cloudflare R2 bila konfigurasi `R2_*` tersedia.
- Sumber konfigurasi utama frontend/backend dipusatkan ke `backend/.env`, dengan override frontend opsional di `frontend/.env`.
