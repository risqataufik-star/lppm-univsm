# Spec Desain: Panel Admin Website LPPM UnivSM

- **Tanggal:** 14 Juli 2026
- **Status:** Disetujui user (arsitektur & desain), siap untuk perencanaan implementasi
- **Konteks:** Website LPPM Universitas Sapta Mandiri saat ini berupa 12 halaman HTML statis di `website/` (Tailwind Play CDN + vanilla JS). Belum ada backend: konten hard-coded, form hanya simulasi, 23 link unduhan kosong di `dokumen.html`.

## Tujuan

Membangun panel admin agar staf LPPM dapat mengelola konten website sendiri:

1. Berita, pengumuman & agenda
2. Dokumen & template unduhan (upload file asli)
3. Data penelitian, PkM, publikasi/HKI + statistik beranda
4. Pesan masuk dari form kontak/konsultasi/kerjasama (form jadi berfungsi nyata)

## Keputusan Arsitektur

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Hosting | **Vercel** (free tier), auto-deploy dari GitHub | Permintaan user: gratis, terintegrasi GitHub |
| Framework | **Next.js (App Router)**, satu aplikasi | Native di Vercel; satu repo untuk situs publik + admin + API |
| Database | **Supabase Postgres** (free tier) | Serverless-compatible; satu layanan untuk DB + storage + auth |
| File storage | **Supabase Storage** | Filesystem Vercel tidak persisten |
| Autentikasi | **Supabase Auth**, satu akun admin | Kebutuhan user: satu akun dipakai bergantian |
| Situs publik | HTML statis yang ada dipindah ke `public/`, TANPA rewrite tampilan | Perubahan minimal; desain sudah matang |

Batasan free tier yang diterima: Supabase 500 MB DB + 1 GB storage; project di-pause setelah 7 hari tanpa aktivitas (perlu diketahui pengelola).

## Struktur Aplikasi

```
lppm-univsm/  (repo GitHub, project Vercel)
├── public/                  — 12 halaman HTML publik + assets (pindahan dari website/)
│   └── assets/js/api-content.js  — BARU: pengisi konten dinamis
├── src/
│   ├── app/
│   │   ├── admin/           — halaman panel admin (React + Tailwind build)
│   │   │   ├── login/
│   │   │   ├── (dashboard)/ — dashboard, berita, dokumen, penelitian, pkm,
│   │   │   │                  publikasi, pesan, pengaturan
│   │   ├── api/             — route handlers (satu-satunya pintu data)
│   │   └── layout.tsx
│   ├── lib/                 — klien Supabase (server), validasi zod, helper
│   └── middleware.ts        — proteksi /admin/* dan API tulis
├── supabase/schema.sql      — DDL tabel + bucket (dijalankan sekali di dashboard)
└── next.config.js           — rewrite / → /index.html
```

Situs publik disajikan dari `public/` (URL `*.html` tetap berfungsi; rewrite `/` → `/index.html`). Folder `website/` lama dihapus setelah pindah agar tidak ada dua sumber kebenaran.

## Skema Database (Supabase Postgres)

Semua tabel memakai `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz`.

### `berita`
- `judul` text NOT NULL
- `slug` text UNIQUE NOT NULL (digenerate dari judul)
- `kategori` text NOT NULL — enum: `berita` | `pengumuman` | `agenda`
- `ringkasan` text — untuk kartu daftar
- `konten` text — isi lengkap (markdown sederhana)
- `gambar_url` text — URL Supabase Storage, opsional
- `tanggal` date NOT NULL — tanggal tayang/tanggal agenda
- `published` boolean default false

### `dokumen`
- `judul` text NOT NULL
- `kategori` text NOT NULL — enum: `pedoman` | `template` | `sk` | `laporan` | `lainnya`
- `deskripsi` text
- `file_url` text NOT NULL — URL Supabase Storage
- `nama_file` text NOT NULL, `ukuran_bytes` bigint, `tipe_file` text

### `penelitian`
- `judul` text NOT NULL, `ketua` text NOT NULL, `anggota` text
- `skema` text, `tahun` int NOT NULL, `sumber_dana` text
- `status` text — enum: `aktif` | `selesai` | `proses`

### `pkm`
Kolom sama dengan `penelitian` (tabel terpisah agar CRUD dan penghitungan sederhana).

### `publikasi`
- `judul` text NOT NULL, `penulis` text NOT NULL
- `jenis` text NOT NULL — enum: `artikel` | `buku` | `hki` | `inovasi`
- `penerbit` text — nama jurnal/penerbit/nomor HKI
- `tahun` int NOT NULL, `tautan` text, `indeksasi` text (Sinta/Scopus/dll, opsional)

### `pesan`
- `nama` text NOT NULL, `email` text NOT NULL, `telepon` text
- `jenis` text NOT NULL — enum: `kontak` | `konsultasi` | `kerjasama`
- `subjek` text, `isi` text NOT NULL
- `status` text default `baru` — enum: `baru` | `dibaca` | `selesai`

### `pengaturan`
- `key` text PRIMARY KEY, `value` text NOT NULL

Key awal: `stat_penelitian`, `stat_pkm`, `stat_publikasi`, `stat_hki`, `stat_mitra` (lima angka beranda, diedit manual).

### Storage bucket
- `dokumen` — public read; file unduhan (PDF/DOC/DOCX/XLSX, maks 10 MB)
- `gambar` — public read; gambar berita (JPG/PNG/WebP, maks 3 MB)

Row Level Security aktif di semua tabel; tidak ada kebijakan anon (semua akses lewat service role key di server Next.js). Kunci service TIDAK pernah dikirim ke browser.

## API (Route Handlers)

### Publik (tanpa login)
- `GET /api/berita?kategori=&limit=` — hanya `published=true`, urut tanggal desc
- `GET /api/berita/[slug]` — detail satu berita
- `GET /api/dokumen?kategori=` — daftar unduhan
- `GET /api/penelitian`, `GET /api/pkm`, `GET /api/publikasi?jenis=`
- `GET /api/pengaturan` — hanya key `stat_*`
- `POST /api/pesan` — terima form publik; validasi zod; rate-limit sederhana (per IP, in-memory best-effort) + honeypot field anti-spam

### Admin (wajib sesi login)
- CRUD penuh: `POST/PUT/DELETE` untuk `berita`, `dokumen`, `penelitian`, `pkm`, `publikasi`
- `POST /api/upload` — upload file ke Storage (validasi tipe & ukuran di server), balas URL
- `PATCH /api/pesan/[id]` — ubah status; `DELETE /api/pesan/[id]`
- `PUT /api/pengaturan` — simpan statistik

Semua respons error berformat `{ error: string }` dengan pesan bahasa Indonesia dan status HTTP semestinya (400 validasi, 401 belum login, 404, 500).

## Autentikasi

- Supabase Auth email + password; **satu akun admin** dibuat manual sekali di dashboard Supabase (tidak ada halaman registrasi).
- Login di `/admin/login`; sesi via cookie (`@supabase/ssr`).
- `middleware.ts` mengalihkan `/admin/*` (kecuali login) ke halaman login bila tanpa sesi, dan menolak API tulis (401) tanpa sesi.
- Logout tersedia di header panel.

## Halaman Panel Admin (`/admin`)

Bahasa Indonesia, Tailwind build (bukan CDN), identitas navy `#1d2b78` + gold `#f0a500`, layout sidebar kiri + konten kanan, responsif.

1. **Dashboard** — kartu jumlah (berita, dokumen, penelitian, PkM, publikasi), daftar pesan berstatus `baru`
2. **Berita & Agenda** — tabel (filter kategori/status) + form tambah-edit: judul, kategori, tanggal, ringkasan, konten (textarea markdown + pratinjau sederhana), upload gambar, toggle publish
3. **Dokumen** — tabel + form upload (drag-drop atau pilih file), pilih kategori
4. **Penelitian** — tabel CRUD dengan form modal/halaman
5. **PkM** — sama seperti penelitian
6. **Publikasi** — tabel CRUD, filter jenis
7. **Pesan Masuk** — daftar (badge `baru`), detail, tombol tandai dibaca/selesai, hapus
8. **Pengaturan** — lima input angka statistik beranda, tombol simpan

Konfirmasi (dialog) sebelum semua aksi hapus.

## Integrasi Website Publik

Satu file baru `public/assets/js/api-content.js`, dimuat di halaman yang butuh. Prinsip: **konten statis yang ada = fallback**; jika fetch API sukses, bagian terkait diganti; jika gagal, halaman tetap tampil seperti sekarang.

| Halaman | Perubahan |
|---|---|
| `index.html` | Statistik beranda dari `/api/pengaturan`; kartu berita terbaru dari `/api/berita?limit=3` |
| `berita.html` | Daftar berita/pengumuman/agenda dari `/api/berita` |
| `dokumen.html` | Daftar unduhan dari `/api/dokumen` (menggantikan 23 link `#`) |
| `publikasi.html` | Daftar publikasi/HKI dari `/api/publikasi` |
| `penelitian.html`, `pkm.html` | Tabel daftar dari API terkait |
| `kontak.html`, `kerjasama.html` | Form POST nyata ke `/api/pesan` (mengganti simulasi `setTimeout` di `main.js`); pesan sukses/gagal nyata |

Perbaikan ikutan yang termasuk lingkup: hapus link `repository.html` yang rusak di navbar `index.html` (file tidak pernah ada), dan bersihkan mojibake komentar HTML saat file dipindah ke `public/`.

Detail berita dibuka di halaman `berita.html?slug=...` yang merender konten dari `/api/berita/[slug]` (tanpa membuat halaman HTML baru per berita).

## Deploy & Alur Kerja

1. `git init` repo ini, push ke GitHub.
2. Buat project Supabase, jalankan `supabase/schema.sql`, buat dua bucket, buat akun admin.
3. Import repo ke Vercel; set env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Tiap `git push` ke `main` → deploy otomatis. Lokal: `npm run dev` memakai project Supabase yang sama (env di `.env.local`, di-gitignore).
5. Domain target `lppm.univsm.ac.id` bisa diarahkan ke Vercel via CNAME (di luar lingkup implementasi awal).

## Penanganan Error

- Validasi semua input API dengan zod; batas file: dokumen 10 MB (PDF/DOC/DOCX/XLSX), gambar 3 MB (JPG/PNG/WebP).
- Panel admin menampilkan pesan error bahasa Indonesia (toast/alert), tidak pernah stack trace.
- Situs publik: kegagalan fetch dibiarkan senyap (fallback statis tampil), error hanya ke `console`.
- `POST /api/pesan`: honeypot + rate limit best-effort; jika DB gagal, form menampilkan pesan gagal dan menyarankan email langsung.

## Pengujian & Verifikasi

- Verifikasi end-to-end via browser: login → buat berita (dengan gambar) → tampil di situs publik → upload dokumen → link unduhan berfungsi → kirim form kontak → muncul di inbox admin → tandai selesai.
- Uji fallback: matikan env Supabase lokal → situs publik tetap tampil normal.
- Uji proteksi: akses `/admin` dan API tulis tanpa login → dialihkan/401.
- Tidak ada framework unit test pada tahap awal (aplikasi CRUD tipis; verifikasi perilaku end-to-end lebih bermakna). Bisa ditambah kemudian.

## Di Luar Lingkup (Tahap Ini)

- Multi-akun / pembagian peran
- Notifikasi email saat ada pesan masuk
- Migrasi konten lama otomatis (konten diinput manual lewat panel)
- Penghitungan statistik otomatis dari tabel (angka beranda diedit manual)
- Pemasangan custom domain
