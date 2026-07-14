# Website & Panel Admin LPPM Universitas Sapta Mandiri

Satu aplikasi Next.js berisi:
- **Situs publik** — HTML statis di `public/` (beranda, profil, penelitian, PkM, publikasi, dokumen, monev, kerjasama, berita, kontak, hibah, roadmap)
- **Panel admin** — `/admin` (kelola berita, dokumen unduhan, data penelitian/PkM/publikasi, pesan masuk, statistik beranda)
- **API** — `/api/*` (Supabase Postgres + Storage + Auth)

## Menjalankan Lokal

1. `npm install`
2. Salin `.env.local.example` → `.env.local`, isi kredensial dari Supabase Dashboard → Settings → API.
3. `npm run dev` → http://localhost:3000 (situs publik) dan http://localhost:3000/admin (panel).

## Setup Supabase (sekali saja)

1. Buat project di https://supabase.com (region Singapore).
2. SQL Editor → jalankan seluruh isi `supabase/schema.sql` (membuat tabel, RLS, seed statistik, bucket `dokumen` & `gambar`).
3. Authentication → Users → Add user → email & password admin (centang Auto Confirm).

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

Satu akun (dibuat manual di Supabase Auth). Tidak ada halaman registrasi. Ganti password lewat Supabase Dashboard → Authentication → Users.
