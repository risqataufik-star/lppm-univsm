# Website & Panel Admin LPPM Universitas Sapta Mandiri

Satu aplikasi Next.js berisi:
- **Situs publik** — HTML statis di `public/` (beranda, profil, penelitian, PkM, publikasi, dokumen, monev, kerjasama, berita, kontak, hibah, roadmap)
- **Panel admin** — `/admin` (kelola berita, dokumen unduhan, data penelitian/PkM/publikasi, pesan masuk, statistik beranda, Monev OJS, verifikasi pengajuan & akun dosen)
- **Layanan Dosen** — `/dosen` (dosen mendaftar, mengajukan penelitian/PkM, mengunduh Surat Tugas & SK)
- **API** — `/api/*` (Supabase Postgres + Storage + Auth)

## Menjalankan Lokal

1. `npm install`
2. Salin `.env.local.example` → `.env.local`, isi kredensial dari Supabase Dashboard → Settings → API.
3. `npm run dev` → http://localhost:3000 (situs publik) dan http://localhost:3000/admin (panel).

## Setup Supabase (sekali saja)

1. Buat project di https://supabase.com (region Singapore).
2. SQL Editor → jalankan seluruh isi `supabase/schema.sql` (tabel, RLS, seed statistik, bucket `dokumen` & `gambar` publik, bucket `pengajuan` privat).
3. Authentication → Users → Add user → email & password admin (centang Auto Confirm), lalu jadikan admin (lihat "Akun Admin").
4. Authentication → Sign In / Providers → Email → **matikan "Allow new users to sign up"**. Akun dosen dibuat lewat halaman `/dosen/daftar`, bukan sign-up publik Supabase.

> Proyek yang sudah berjalan sebelum Oktober 2026: jalankan sekali `supabase/migrasi-2026-10-peran.sql` agar akun admin lama mendapat peran admin (jangan dijalankan ulang), lalu `supabase/migrasi-2026-10-laporan.sql` untuk kolom laporan akhir dan `supabase/migrasi-2026-10-publikasi.sql` untuk jenis pengajuan publikasi (keduanya aman bila terulang).

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. https://vercel.com → Add New Project → import repo ini (framework terdeteksi: Next.js).
3. Environment Variables — isi tiga nilai dari Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy. Setiap `git push` ke `main` akan deploy otomatis.
5. (Opsional) Custom domain `lppm.univsm.ac.id`: Vercel → Settings → Domains → tambah domain, lalu buat CNAME di DNS kampus mengarah ke `cname.vercel-dns.com`.

## Catatan Free Tier

- Supabase gratis: 500 MB database + 1 GB storage; project **di-pause setelah 7 hari tanpa aktivitas** — buka dashboard Supabase untuk mengaktifkan kembali.
- Rate limit form kontak bersifat best-effort (reset saat cold start serverless).

## Akun Admin

Akses panel admin ditentukan tabel `profil` (`peran = 'admin'`, `status = 'aktif'`). Menambah admin baru:

1. Supabase → Authentication → Users → Add user (centang Auto Confirm).
2. SQL Editor:
   ```sql
   insert into profil (user_id, nama, email, peran, status)
   select id, email, email, 'admin', 'aktif' from auth.users where email = 'email-admin-baru@univsm.ac.id'
   on conflict (user_id) do update set peran = 'admin', status = 'aktif';
   ```

Tanpa langkah 2, akun ditolak oleh panel admin. Ganti password lewat Supabase → Authentication → Users.

## Akun Dosen

Dosen mendaftar di `/dosen/daftar` → status **menunggu** → admin menyetujui di **Panel Admin → Akun Dosen**. Dosen aktif dapat mengajukan penelitian, PkM, atau publikasi (skema Artikel Jurnal/Prosiding/Buku/HKI — yang disetujui otomatis masuk daftar Publikasi); admin memverifikasi di **Pengajuan**, lalu mengunggah Surat Tugas & SK (PDF, maks 10 MB, diunggah langsung ke Storage privat).

Setelah ST & SK terbit, dosen mengunggah **laporan akhir** (PDF) di halaman detail pengajuan. Admin memeriksanya lewat filter **Laporan Masuk**: **Terima** (kegiatan di daftar publik otomatis berstatus *selesai*) atau **Minta Revisi** dengan catatan.

## Alat Uji (pengembangan)

`node scripts/uji.mjs` — membuat akun dosen uji (`@example.com`), cookie sesi, unggah berkas, dan `bersihkan` untuk menghapus semua data uji. Jalankan `bersihkan` setiap selesai menguji karena database bersama produksi.
