# IT Ticketing System

Website tiket IT berbasis `React + Vite` di frontend, dengan backend `Express.js` dan database `PostgreSQL`.

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
