# Spec Desain: Layanan Dosen — Pengajuan Penelitian & PkM

- **Tanggal:** 10 Oktober 2026
- **Status:** Desain disetujui user; menunggu review spec tertulis
- **Permintaan:** Ketua LPPM — dosen dapat mengajukan sendiri penelitian dan PkM lewat website; LPPM tinggal menerbitkan Surat Tugas dan SK.
- **Konteks:** Next.js 15 + Supabase (Postgres/Auth/Storage) di Vercel. Saat ini **setiap akun Supabase Auth = admin penuh** (`requireAdmin` hanya mengecek ada sesi). Fitur ini menambah akun dosen, sehingga sistem peran wajib dibangun lebih dulu.

## Tujuan & Kriteria Sukses

1. Dosen mendaftar sendiri; akun aktif setelah disetujui LPPM.
2. Dosen aktif mengajukan penelitian/PkM (data + proposal PDF) dan memantau statusnya.
3. LPPM memverifikasi: **Setujui / Minta Revisi / Tolak** dengan catatan.
4. Pengajuan yang disetujui otomatis tercatat di tabel `penelitian`/`pkm` (tampil di situs publik).
5. LPPM mengunggah **Surat Tugas** dan **SK** (PDF jadi, dibuat di luar sistem); dosen mengunduhnya.
6. Dosen **tidak pernah** bisa mengakses panel admin atau data dosen lain.

## Keputusan (disetujui user)

| Topik | Keputusan |
|---|---|
| ST/SK | LPPM mengunggah file yang sudah jadi (bukan dibuat otomatis) |
| Akun dosen | Daftar sendiri → status `menunggu` → disetujui/ditolak admin |
| Alur | Pengajuan → verifikasi (setujui/revisi/tolak) → unggah ST & SK |
| Ke situs publik | Pengajuan disetujui otomatis masuk tabel `penelitian`/`pkm` (status `aktif`) |
| Model peran | Tabel `profil` dengan kolom `peran` & `status` (bukan `app_metadata`) |

## Skema Database

### `profil` (baru)
- `user_id uuid primary key references auth.users(id) on delete cascade`
- `nama text not null`
- `email text not null`
- `nidn text not null default ''` — NIDN/NIDK
- `prodi text not null default ''`
- `no_hp text not null default ''`
- `peran text not null default 'dosen' check (peran in ('admin','dosen'))`
- `status text not null default 'menunggu' check (status in ('menunggu','aktif','ditolak'))`
- `created_at timestamptz not null default now()`, `updated_at timestamptz`

**Migrasi akun lama:** semua user Auth yang sudah ada saat migrasi dijadikan admin aktif (saat ini mereka memang admin):
```sql
insert into profil (user_id, nama, email, peran, status)
select id, email, email, 'admin', 'aktif' from auth.users
on conflict (user_id) do nothing;
```

### `pengajuan` (baru)
- `id uuid primary key default gen_random_uuid()`
- `dosen_id uuid not null references profil(user_id) on delete cascade`
- `jenis text not null check (jenis in ('penelitian','pkm'))`
- `judul text not null`
- `skema text not null`
- `tahun int not null`
- `anggota text not null default ''`
- `sumber_dana text not null default ''`
- `ringkasan text not null default ''`
- `proposal_path text not null` — path di bucket `pengajuan`
- `status text not null default 'diajukan' check (status in ('diajukan','revisi','ditolak','disetujui','terbit'))`
- `catatan text not null default ''` — catatan keputusan LPPM terakhir
- `surat_tugas_path text`, `sk_path text`
- `publik_id uuid` — id baris `penelitian`/`pkm` yang dibuat saat disetujui
- `created_at timestamptz not null default now()`, `updated_at timestamptz`

RLS aktif di kedua tabel tanpa policy (akses hanya via service role di server — konsisten dengan tabel lain). Index: `pengajuan(dosen_id)`, `pengajuan(status)`.

### Storage
- Bucket baru **`pengajuan`, privat** (`public = false`). Path: `<dosen_id>/<pengajuan_id>/proposal-<timestamp>.pdf`, `.../surat-tugas-<timestamp>.pdf`, `.../sk-<timestamp>.pdf`.
- Unduhan via **signed URL** berumur 5 menit, hanya diterbitkan setelah cek kepemilikan (dosen pemilik) atau peran admin.
- Batas: PDF saja (`application/pdf`), maks **10 MB**.

### Skema kegiatan (pilihan form, sesuai taksonomi situs)
- Penelitian: `Penelitian Mandiri`, `Penelitian Kelompok`, `Penelitian Kolaborasi`, `Hibah Eksternal Dikti`
- PkM: `PkM Mandiri`, `PkM Berbasis Riset`, `PkM KKN-Tematik`, `PkM Kolaborasi Mitra`

## Alur Status Pengajuan

| Dari | Aksi | Oleh | Ke |
|---|---|---|---|
| — | Kirim pengajuan | Dosen | `diajukan` |
| `diajukan` | Setujui | Admin | `disetujui` (+ buat baris publik) |
| `diajukan` | Minta revisi (catatan wajib) | Admin | `revisi` |
| `diajukan` | Tolak (catatan wajib) | Admin | `ditolak` (final) |
| `revisi` | Perbaiki & kirim ulang | Dosen | `diajukan` |
| `disetujui` | Unggah ST dan/atau SK | Admin | `disetujui`; bila ST **dan** SK ada → `terbit` |
| `terbit` | Ganti file ST/SK | Admin | `terbit` |

Transisi lain ditolak server dengan 409 + pesan Indonesia. Dosen hanya bisa mengubah pengajuan berstatus `revisi`.

**Saat disetujui:** insert ke `penelitian` atau `pkm` (sesuai `jenis`) dengan `judul`, `ketua = profil.nama`, `anggota`, `skema`, `tahun`, `sumber_dana`, `status = 'aktif'`; simpan id-nya ke `pengajuan.publik_id`.

## Autentikasi & Otorisasi

### Pendaftaran tanpa sign-up publik
Akun dosen dibuat **hanya** lewat API server `POST /api/dosen/daftar` menggunakan `auth.admin.createUser` (service role, `email_confirm: true`) lalu insert `profil` (`peran='dosen'`, `status='menunggu'`). Bila insert profil gagal, user Auth yang baru dibuat dihapus (rollback). Karena itu **"Allow new users to sign up" di Supabase dinonaktifkan** — tidak ada jalur membuat akun tanpa baris `profil`.

### Helper (`src/lib/auth.ts`)
- `getSesi(): Promise<{ user, profil } | null>` — user dari sesi cookie + baris `profil`-nya.
- `requireAdmin()` — **diperketat**: 401 bila tanpa sesi; 403 bila `peran !== 'admin'` atau `status !== 'aktif'`.
- `requireDosen()` — mengembalikan `{ user, profil }` bila `peran='dosen'` & `status='aktif'`; selain itu `NextResponse` 401/403.
- Semua API admin yang sudah ada otomatis ikut diperketat karena memakai `requireAdmin`.

### Middleware
- Matcher: `/admin/:path*` dan `/dosen/:path*`.
- Hanya menjaga **akses tanpa sesi**: redirect ke `/admin/login` atau `/dosen/login`. Halaman publik: `/admin/login`, `/dosen/login`, `/dosen/daftar`.
- **Tidak lagi** mengalihkan user yang sudah login dari halaman login (mencegah loop redirect antar peran).
- Cek sesi dibungkus **timeout 3 detik**; bila habis waktu → diperlakukan tanpa sesi (redirect ke login) alih-alih 504.

### Penjagaan per area (server, bukan hanya middleware)
- `src/app/admin/(panel)/layout.tsx` (server): tanpa admin aktif → `redirect` (dosen → `/dosen`; lainnya → `/admin/login?e=akses`).
- `src/app/dosen/(portal)/layout.tsx` (server): admin → `/admin`; dosen `menunggu`/`ditolak` → tampilkan layar status (tanpa menu pengajuan).
- Login admin: setelah `signInWithPassword`, panggil `GET /api/profil/saya`; bila bukan admin aktif → `signOut` + pesan "Akun ini bukan akun admin LPPM."
- Login dosen: arahkan sesuai peran (admin → `/admin`, dosen → `/dosen`).

## API (Route Handlers)

Semua error `{ error: string }` berbahasa Indonesia; validasi zod.

**Publik**
- `POST /api/dosen/daftar` — `nama, email, password (min 8), nidn, prodi, no_hp, website (honeypot)`; rate limit (`rateLimitOk`). 201 `{ ok: true }`; 409 "Email sudah terdaftar."

**Sesi apa pun**
- `GET /api/profil/saya` → `{ peran, status, nama }`

**Dosen (`requireDosen`)**
- `GET /api/dosen/pengajuan` → pengajuan milik sendiri (urut terbaru)
- `POST /api/dosen/pengajuan` — multipart: field form + `proposal` (PDF ≤10 MB) → upload, insert `diajukan`
- `GET /api/dosen/pengajuan/[id]` → detail milik sendiri (404 bila bukan miliknya)
- `PUT /api/dosen/pengajuan/[id]` — hanya status `revisi`; multipart (field + `proposal` opsional) → status `diajukan`, `catatan` dikosongkan
- `GET /api/dosen/pengajuan/[id]/file?jenis=proposal|surat_tugas|sk` → redirect 302 ke signed URL

**Admin (`requireAdmin`)**
- `GET /api/admin/dosen?status=` → daftar `profil` ber-peran dosen
- `PATCH /api/admin/dosen/[id]` — `{ status: 'aktif' | 'ditolak' }`
- `GET /api/admin/pengajuan?status=&jenis=` → semua pengajuan + nama dosen
- `GET /api/admin/pengajuan/[id]` → detail + profil dosen
- `POST /api/admin/pengajuan/[id]/keputusan` — `{ aksi: 'setujui'|'revisi'|'tolak', catatan }` (catatan wajib untuk revisi/tolak)
- `POST /api/admin/pengajuan/[id]/surat` — multipart `{ jenis: 'surat_tugas'|'sk', file }`; hanya bila status `disetujui`/`terbit`
- `GET /api/admin/pengajuan/[id]/file?jenis=` → redirect 302 ke signed URL

## Halaman

**Portal dosen** (komponen UI memakai primitif `src/components/admin/ui.tsx`; shell ringan `DosenShell` dengan topbar: Pengajuan Saya · Ajukan Baru · Keluar)
- `/dosen/login`, `/dosen/daftar` — gaya split-screen seperti login admin
- `/dosen` — daftar pengajuan (judul, jenis, tahun, badge status, tanggal)
- `/dosen/ajukan` — form pengajuan; pilihan skema berubah sesuai jenis
- `/dosen/pengajuan/[id]` — detail, catatan LPPM, unduh proposal; bila `revisi` → form perbaikan; bila `terbit` → tombol unduh **Surat Tugas** & **SK**

**Panel admin** (menu sidebar baru, dengan badge jumlah yang perlu tindakan)
- **Pengajuan** `/admin/pengajuan` — tabel + filter status/jenis
- `/admin/pengajuan/[id]` — detail, unduh proposal, panel keputusan (Setujui / Minta Revisi / Tolak + catatan), panel unggah ST & SK (setelah disetujui)
- **Akun Dosen** `/admin/akun-dosen` — tab Menunggu / Aktif / Ditolak, tombol Setujui / Tolak
- Badge: jumlah pengajuan `diajukan` dan akun `menunggu`, dihitung di `(panel)/layout.tsx` (server) dan diteruskan ke `AdminShell` → `Sidebar`.
- Dashboard: kartu "Perlu Tindakan" (pengajuan baru & akun menunggu).

**Situs publik:** entri **"Layanan Dosen"** (→ `/dosen/login`) di dropdown **Layanan** navbar seluruh 13 halaman HTML (desktop & mobile bila ada).

## Penanganan Error

- Upload gagal / bukan PDF / >10 MB → 400 dengan pesan jelas; baris DB tidak dibuat.
- Pengajuan dibuat tapi upload sukses dan insert gagal → file yang terunggah dihapus (best-effort).
- Transisi status tidak sah → 409.
- Akses ke pengajuan orang lain → 404 (tidak membocorkan keberadaan).
- Supabase lambat/terhenti: middleware tidak 504 (timeout 3 dtk → ke login); halaman menampilkan pesan error ramah.

## Prasyarat Operasional

1. **Project Supabase harus aktif** (saat ini ter-pause karena free tier) — resume dari dashboard sebelum implementasi.
2. Jalankan DDL (`profil`, `pengajuan`, bucket privat `pengajuan`, migrasi admin).
3. Supabase Auth: nonaktifkan **"Allow new users to sign up"**.

## Pengujian & Verifikasi

Tanpa framework unit test (konsisten dengan proyek); verifikasi via `npm run typecheck`, `npm run build`, `curl`, dan browser end-to-end:
1. Daftar dosen → status menunggu → tidak bisa mengajukan.
2. Admin setujui akun → dosen login → ajukan penelitian dengan PDF.
3. Admin minta revisi → dosen lihat catatan, perbaiki → diajukan lagi → admin setujui → baris muncul di `/api/penelitian` & halaman publik.
4. Admin unggah ST lalu SK → status terbit → dosen unduh keduanya.
5. **Keamanan:** dosen mengakses `/admin` → dialihkan; dosen memanggil API admin → 403; dosen A meminta file/pengajuan dosen B → 404; URL file langsung bucket tanpa signed URL → ditolak; `POST /api/dosen/daftar` dengan honeypot → tidak membuat akun.
6. Admin lama tetap bisa login dan memakai seluruh panel (migrasi peran berhasil).

## Di Luar Lingkup

- Notifikasi email (dosen memantau status di portal).
- Penilaian reviewer, laporan kemajuan/akhir, luaran.
- Pembuatan ST/SK otomatis & penomoran surat.
- Pengelolaan akun admin dari dalam panel. Admin baru tetap dibuat di Supabase Dashboard (Add user + Auto Confirm), lalu dijalankan SQL:
  `insert into profil (user_id, nama, email, peran, status) select id, email, email, 'admin', 'aktif' from auth.users where email = '<email-admin-baru>' on conflict (user_id) do update set peran = 'admin', status = 'aktif';`
  Tanpa baris `profil` ber-peran admin, akun tersebut ditolak (403) oleh panel admin. README diperbarui dengan langkah ini.
