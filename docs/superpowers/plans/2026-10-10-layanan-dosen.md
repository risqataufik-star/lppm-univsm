# Layanan Dosen (Pengajuan Penelitian & PkM) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dosen mendaftar & mengajukan penelitian/PkM sendiri; LPPM memverifikasi, pengajuan yang disetujui otomatis masuk daftar publik, lalu LPPM mengunggah Surat Tugas & SK untuk diunduh dosen.

**Architecture:** Tabel `profil` (peran admin/dosen + status akun) menjadi dasar otorisasi; `requireAdmin` diperketat dan `requireDosen` ditambahkan. Akun dosen hanya dibuat lewat API server (service role). Tabel `pengajuan` + bucket Storage privat `pengajuan` (unduh via signed URL). Portal dosen di `/dosen`, verifikasi di panel admin `/admin/pengajuan` & `/admin/akun-dosen`.

**Tech Stack:** Next.js 15 (App Router, TypeScript), React 19, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), zod, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-10-10-layanan-dosen-design.md` — baca dulu sebelum mengerjakan task apa pun.

## Global Constraints

- Seluruh UI & pesan error berbahasa Indonesia; format error API `{ "error": "<pesan>" }` dengan status HTTP semestinya (400/401/403/404/409/429/500).
- Peran: `admin` | `dosen`. Status akun: `menunggu` | `aktif` | `ditolak`. Status pengajuan: `diajukan` | `revisi` | `ditolak` | `disetujui` | `terbit` — nilai persis ini.
- Skema penelitian: `Penelitian Mandiri`, `Penelitian Kelompok`, `Penelitian Kolaborasi`, `Hibah Eksternal Dikti`. Skema PkM: `PkM Mandiri`, `PkM Berbasis Riset`, `PkM KKN-Tematik`, `PkM Kolaborasi Mitra`.
- File proposal/ST/SK: **PDF saja** (diawali byte `%PDF-`), maks **10 MB**, di bucket **privat** `pengajuan`.
- **Unggah langsung dari browser ke Storage** (Vercel membatasi body request fungsi 4,5 MB): server menerbitkan token unggah sekali-pakai (`createSignedUploadUrl`) untuk path yang ditentukan server → browser `uploadToSignedUrl` → API menerima **path** (JSON, bukan multipart) dan memverifikasi: path milik pemanggil/pengajuan, objek ada, ukuran ≤ 10 MB, byte `%PDF-` (objek tidak sah dihapus). Path proposal: `<dosen_id>/proposal/<uuid>.pdf`; path surat: `<dosen_id>/<pengajuan_id>/surat-tugas-<ms>.pdf` / `sk-<ms>.pdf`.
- Unduh hanya via signed URL **300 detik** setelah cek kepemilikan/peran.
- `requireAdmin()` tetap bertanda tangan `Promise<NextResponse | null>` (semua API lama memakainya apa adanya).
- Akun dosen dibuat **hanya** via `POST /api/dosen/daftar` (service role `auth.admin.createUser`, `email_confirm: true`); "Allow new users to sign up" di Supabase **dinonaktifkan**.
- `SUPABASE_SERVICE_ROLE_KEY` hanya server-side; modul yang memakai `supabaseAdmin` tidak boleh diimpor komponen client.
- UI admin & portal dosen memakai primitif `src/components/admin/ui.tsx` (`PageHeader`, `Alert`, `TableEmptyRow`, `inputCls`, `labelCls`, `cardCls`, `btnPrimary`, `btnGhost`, `btnSuccess`, `btnDangerOutline`, `theadCls`, `thCls`, `tdCls`, `rowEditBtn`, `rowDeleteBtn`).
- Tidak ada framework unit test; verifikasi via `npm run typecheck`, `npm run build`, skrip `node scripts/uji.mjs`, `curl`, dan browser.
- Database adalah **produksi**: akun uji memakai domain `@example.com` dan **wajib dihapus** di akhir (`node scripts/uji.mjs bersihkan`).
- Dev server: `npm run dev` (port 3000) dari root repo `E:\lab\lppm-univsm`. Rate limiter in-memory reset saat dev server di-restart.
- Trailer setiap commit: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Klik "Setujui" dua kali / dua admin bersamaan** → hanya satu baris dibuat di `penelitian`/`pkm`; permintaan kedua 409. (Tes di Task 6.)
2. **File bukan PDF yang diunggah dengan Content-Type PDF** (lolos filter MIME bucket) → API menolak 400 "File harus berformat PDF.", objeknya dihapus dari Storage, tak ada baris pengajuan. (Tes di Task 5.)
3. **Daftar ulang dengan email sama tapi beda huruf besar/spasi** → 409 "Email sudah terdaftar.", tidak membuat akun kedua. (Tes di Task 3.)
4. **Akun dosen diubah ke `ditolak` saat dosen masih login** → panggilan API dosen berikutnya langsung 403. (Tes di Task 5.)
5. **Revisi dikirim ulang tanpa file baru** → proposal lama tetap ada & bisa diunduh; bila dengan file baru, file lama terhapus dari Storage. (Tes di Task 5.)

## Peta File

| File | Tanggung jawab |
|---|---|
| `supabase/schema.sql` | + tabel `profil`, `pengajuan`, bucket privat `pengajuan` |
| `supabase/migrasi-2026-10-peran.sql` (baru) | migrasi sekali: user Auth lama → admin |
| `scripts/uji.mjs` (baru) | alat uji: daftar akun uji, buat cookie sesi, bersihkan data uji |
| `src/lib/auth.ts` | `getSesi`, `requireAdmin` (diperketat), `requireDosen`, tipe `Profil` |
| `src/lib/crud.ts` | `?all=1` hanya untuk admin |
| `src/middleware.ts` | jaga `/admin/*` & `/dosen/*` tanpa sesi, timeout 3 dtk |
| `src/app/api/profil/saya/route.ts` (baru) | peran & status pemanggil |
| `src/app/admin/(panel)/layout.tsx` | guard admin (server) + badge |
| `src/components/auth/AuthLayout.tsx`, `fields.tsx` (baru) | kerangka & field halaman login/daftar |
| `src/app/admin/login/page.tsx` | pakai AuthLayout + tolak non-admin |
| `src/app/dosen/login`, `src/app/dosen/daftar` (baru) | login & pendaftaran dosen |
| `src/app/api/dosen/daftar/route.ts` (baru) | pendaftaran dosen |
| `src/components/dosen/DosenShell.tsx`, `src/app/dosen/(portal)/layout.tsx` (baru) | shell & guard portal dosen |
| `src/app/api/admin/dosen/**`, `src/app/admin/(panel)/akun-dosen/page.tsx` (baru) | persetujuan akun dosen |
| `src/lib/pengajuan-shared.ts` (baru) | tipe, skema, label status, batas ukuran (aman untuk client) |
| `src/lib/pengajuan-server.ts` (baru) | token unggah, path, verifikasi PDF, signed URL, hapus (server saja) |
| `src/lib/unggah-client.ts` (baru) | `unggahPdf()` di browser: minta token → unggah ke Storage |
| `src/app/api/dosen/unggah/route.ts` (baru) | token unggah proposal |
| `src/app/api/dosen/pengajuan/**` (baru) | API pengajuan milik dosen |
| `src/components/dosen/PengajuanForm.tsx`, halaman `(portal)` (baru) | form & halaman portal |
| `src/app/api/admin/pengajuan/**` (baru) | daftar, keputusan, token unggah surat, simpan surat, unduh |
| `src/app/admin/(panel)/pengajuan/**`, `src/components/admin/PengajuanAksi.tsx` (baru) | halaman verifikasi admin |
| `Sidebar.tsx`, `AdminShell.tsx`, dashboard, `icons.tsx` | menu, badge, kartu "Perlu Tindakan", ikon |
| `public/*.html` (13) | menu "Layanan Dosen" |
| `README.md` | setup & cara menambah admin |

---

### Task 1: Skema database, bucket privat, migrasi peran

**Files:**
- Modify: `supabase/schema.sql` (append)
- Create: `supabase/migrasi-2026-10-peran.sql`

**Interfaces:**
- Produces: tabel `profil`, `pengajuan`; bucket `pengajuan` (privat, PDF, 10 MB); setiap user Auth lama punya `profil` ber-`peran='admin'`, `status='aktif'`.

- [ ] **Step 1: Append ke akhir `supabase/schema.sql`:**

```sql
-- ============ Layanan Dosen ============
create table if not exists profil (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  email text not null,
  nidn text not null default '',
  prodi text not null default '',
  no_hp text not null default '',
  peran text not null default 'dosen' check (peran in ('admin','dosen')),
  status text not null default 'menunggu' check (status in ('menunggu','aktif','ditolak')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists pengajuan (
  id uuid primary key default gen_random_uuid(),
  dosen_id uuid not null references profil(user_id) on delete cascade,
  jenis text not null check (jenis in ('penelitian','pkm')),
  judul text not null,
  skema text not null,
  tahun int not null,
  anggota text not null default '',
  sumber_dana text not null default '',
  ringkasan text not null default '',
  proposal_path text not null,
  status text not null default 'diajukan' check (status in ('diajukan','revisi','ditolak','disetujui','terbit')),
  catatan text not null default '',
  surat_tugas_path text,
  sk_path text,
  publik_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_pengajuan_dosen on pengajuan (dosen_id);
create index if not exists idx_pengajuan_status on pengajuan (status);

alter table profil enable row level security;
alter table pengajuan enable row level security;

-- Bucket PRIVAT untuk proposal, Surat Tugas, SK (unduh via signed URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pengajuan', 'pengajuan', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;
```

- [ ] **Step 2: Buat `supabase/migrasi-2026-10-peran.sql`** (dijalankan SEKALI; sengaja tidak di `schema.sql` agar tidak pernah menjadikan akun lain admin secara tak sengaja):

```sql
-- Migrasi sekali jalan (Oktober 2026): sebelum Layanan Dosen, semua akun Auth adalah admin.
-- Beri mereka baris profil ber-peran admin. JANGAN dijalankan ulang setelah dosen mulai mendaftar.
insert into profil (user_id, nama, email, peran, status)
select id, email, email, 'admin', 'aktif' from auth.users
on conflict (user_id) do nothing;
```

- [ ] **Step 3: PAUSE — user menjalankan di Supabase.** Sampaikan ke user, berurutan:
  1. Pastikan project Supabase **aktif** (bila "Paused" → **Restore project**, tunggu sampai Active).
  2. SQL Editor → jalankan blok **Layanan Dosen** dari Step 1.
  3. SQL Editor → jalankan isi `supabase/migrasi-2026-10-peran.sql`.
  4. Authentication → **Sign In / Providers** → Email → matikan **"Allow new users to sign up"** → Save.
  Tunggu konfirmasi user.

- [ ] **Step 4: Verifikasi** (dari root repo):

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('fs').readFileSync('.env.local','utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].trim();});
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async()=>{
  const p = await db.from('profil').select('email,peran,status');
  console.log('profil:', p.error ? p.error.message : JSON.stringify(p.data));
  const a = await db.from('pengajuan').select('*',{count:'exact',head:true});
  console.log('pengajuan:', a.error ? a.error.message : 'OK count='+a.count);
  const b = await db.storage.getBucket('pengajuan');
  console.log('bucket:', b.error ? b.error.message : 'public='+b.data.public+' limit='+b.data.file_size_limit);
})();
"
```
Expected: `profil:` berisi akun admin yang ada dengan `"peran":"admin","status":"aktif"`; `pengajuan: OK count=0`; `bucket: public=false limit=10485760`.

- [ ] **Step 5: Commit.**

```bash
git add supabase/schema.sql supabase/migrasi-2026-10-peran.sql
git commit -m "feat(dosen): skema profil & pengajuan, bucket privat, migrasi peran admin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Inti otorisasi — peran, middleware, guard admin, alat uji

**Files:**
- Modify: `src/lib/auth.ts` (ganti seluruh isi), `src/lib/crud.ts:4,24-29`, `src/middleware.ts` (ganti seluruh isi), `src/app/admin/(panel)/layout.tsx` (ganti seluruh isi)
- Create: `src/app/api/profil/saya/route.ts`, `scripts/uji.mjs`

**Interfaces:**
- Consumes: `supabaseServer()` (`src/lib/supabase/server.ts`), `supabaseAdmin()` (`src/lib/supabase/admin.ts`), tabel `profil` (Task 1).
- Produces:
  - `type Peran = 'admin' | 'dosen'`, `type StatusAkun = 'menunggu' | 'aktif' | 'ditolak'`
  - `type Profil = { user_id: string; nama: string; email: string; nidn: string; prodi: string; no_hp: string; peran: Peran; status: StatusAkun }`
  - `getSesi(): Promise<{ userId: string; profil: Profil | null } | null>`
  - `requireAdmin(): Promise<NextResponse | null>` — 401 tanpa sesi, 403 bukan admin aktif
  - `requireDosen(): Promise<{ profil: Profil } | NextResponse>` — pakai: `const r = await requireDosen(); if (r instanceof NextResponse) return r;`
  - `GET /api/profil/saya` → `{ peran, status, nama }` | 401 | 404
  - `scripts/uji.mjs`: `daftar A|B`, `cookie A|B`, `cookie-admin <email> <password>`, `bersihkan`

- [ ] **Step 1: Ganti isi `src/lib/auth.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type Peran = 'admin' | 'dosen';
export type StatusAkun = 'menunggu' | 'aktif' | 'ditolak';
export type Profil = {
  user_id: string;
  nama: string;
  email: string;
  nidn: string;
  prodi: string;
  no_hp: string;
  peran: Peran;
  status: StatusAkun;
};

// Sesi dari cookie + baris profil-nya. null bila tidak login.
export async function getSesi(): Promise<{ userId: string; profil: Profil | null } | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabaseAdmin()
    .from('profil')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return { userId: user.id, profil: (data as Profil | null) ?? null };
}

// null bila pemanggil admin aktif; selain itu respons 401/403 siap-kirim.
export async function requireAdmin(): Promise<NextResponse | null> {
  const sesi = await getSesi();
  if (!sesi) {
    return NextResponse.json({ error: 'Anda harus login sebagai admin.' }, { status: 401 });
  }
  const p = sesi.profil;
  if (!p || p.peran !== 'admin' || p.status !== 'aktif') {
    return NextResponse.json({ error: 'Akses khusus admin LPPM.' }, { status: 403 });
  }
  return null;
}

// Profil dosen aktif, atau respons 401/403 siap-kirim.
export async function requireDosen(): Promise<{ profil: Profil } | NextResponse> {
  const sesi = await getSesi();
  if (!sesi) {
    return NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 });
  }
  const p = sesi.profil;
  if (!p || p.peran !== 'dosen') {
    return NextResponse.json({ error: 'Akses khusus dosen.' }, { status: 403 });
  }
  if (p.status !== 'aktif') {
    return NextResponse.json({ error: 'Akun dosen Anda belum aktif.' }, { status: 403 });
  }
  return { profil: p };
}
```

- [ ] **Step 2: Perbaiki `src/lib/crud.ts`** — hapus baris import `supabaseServer` (baris 4) dan ganti blok `skipPublicFilter` (baris 24–29):

Hapus:
```ts
import { supabaseServer } from '@/lib/supabase/server';
```

Ganti:
```ts
    let skipPublicFilter = false;
    if (url.searchParams.get('all') === '1') {
      const supabase = await supabaseServer();
      const { data: { user } } = await supabase.auth.getUser();
      skipPublicFilter = !!user;
    }
```
dengan:
```ts
    // ?all=1 (lihat draf) hanya untuk admin aktif — dosen yang login tetap melihat versi publik
    const skipPublicFilter =
      url.searchParams.get('all') === '1' && (await requireAdmin()) === null;
```

- [ ] **Step 3: Ganti isi `src/middleware.ts`:**

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIK = new Set(['/admin/login', '/dosen/login', '/dosen/daftar']);
const BATAS_MS = 3000;

// Middleware hanya menolak akses TANPA sesi. Pengecekan peran ada di layout & API (server).
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIK.has(pathname)) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Dibatasi waktu: bila Supabase lambat/terhenti, anggap tanpa sesi (→ login), bukan 504.
  const user = await Promise.race([
    supabase.auth.getUser().then((r) => r.data.user),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), BATAS_MS)),
  ]).catch(() => null);

  if (!user) {
    const login = pathname.startsWith('/dosen') ? '/dosen/login' : '/admin/login';
    return NextResponse.redirect(new URL(login, request.url));
  }
  return response;
}

export const config = { matcher: ['/admin/:path*', '/dosen/:path*'] };
```

- [ ] **Step 4: Buat `src/app/api/profil/saya/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { getSesi } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sesi = await getSesi();
  if (!sesi) return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  if (!sesi.profil) return NextResponse.json({ error: 'Profil tidak ditemukan.' }, { status: 404 });
  const { peran, status, nama } = sesi.profil;
  return NextResponse.json({ peran, status, nama });
}
```

- [ ] **Step 5: Ganti isi `src/app/admin/(panel)/layout.tsx`** (guard server; badge ditambah di Task 7):

```tsx
import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { getSesi } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sesi = await getSesi();
  if (!sesi) redirect('/admin/login');
  const p = sesi.profil;
  if (!p || p.peran !== 'admin' || p.status !== 'aktif') {
    redirect(p?.peran === 'dosen' ? '/dosen' : '/admin/login?e=akses');
  }
  return <AdminShell>{children}</AdminShell>;
}
```

- [ ] **Step 6: Buat `scripts/uji.mjs`** (alat uji lokal; akun uji `@example.com` dihapus oleh `bersihkan`):

```js
// Alat uji Layanan Dosen. Jalankan dari root repo.
//   node scripts/uji.mjs daftar A|B              → daftarkan akun uji via API
//   node scripts/uji.mjs cookie A|B              → cetak header Cookie sesi akun uji
//   node scripts/uji.mjs cookie-admin EMAIL PASS → cetak header Cookie sesi admin
//   node scripts/uji.mjs bersihkan               → hapus akun uji + pengajuan, file, baris publiknya
//   node scripts/uji.mjs set-status ID STATUS    → ubah status pengajuan langsung (khusus uji)
//   node scripts/uji.mjs berkas ID               → file Storage proposal & surat milik pengajuan ID
//   node scripts/uji.mjs unggah "COOKIE" FILE ENDPOINT [JSON]
//                                                → minta token di ENDPOINT, unggah FILE ke Storage, cetak path
// BASE=http://localhost:3000 (default) bisa diganti lewat env.
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.BASE || 'http://localhost:3000';

const AKUN = {
  A: { nama: 'Dosen Uji A', email: 'uji.dosen.a@example.com', password: 'UjiDosenA#2026', nidn: '0101010101', prodi: 'Teknik Informatika', no_hp: '081234567890' },
  B: { nama: 'Dosen Uji B', email: 'uji.dosen.b@example.com', password: 'UjiDosenB#2026', nidn: '0202020202', prodi: 'Sistem Informasi', no_hp: '081298765432' },
};

async function cookie(email, password) {
  const jar = new Map();
  const sb = createServerClient(SB_URL, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cs) => cs.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return [...jar].map(([n, v]) => `${n}=${v}`).join('; ');
}

async function bersihkan() {
  const db = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });
  const emails = Object.values(AKUN).map((a) => a.email);
  const { data: prof } = await db.from('profil').select('user_id,email').in('email', emails);
  for (const p of prof ?? []) {
    const { data: aj } = await db.from('pengajuan').select('jenis,publik_id').eq('dosen_id', p.user_id);
    for (const x of aj ?? []) if (x.publik_id) await db.from(x.jenis).delete().eq('id', x.publik_id);
    const { data: folders } = await db.storage.from('pengajuan').list(p.user_id);
    for (const f of folders ?? []) {
      const { data: isi } = await db.storage.from('pengajuan').list(`${p.user_id}/${f.name}`);
      if (isi?.length) {
        await db.storage.from('pengajuan').remove(isi.map((x) => `${p.user_id}/${f.name}/${x.name}`));
      }
    }
    await db.auth.admin.deleteUser(p.user_id); // cascade: profil → pengajuan
    console.log('dihapus', p.email);
  }
  console.log('selesai');
}

const [cmd, a1, a2] = process.argv.slice(2);
if (cmd === 'daftar') {
  const r = await fetch(`${BASE}/api/dosen/daftar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...AKUN[a1], website: '' }),
  });
  console.log(r.status, await r.text());
} else if (cmd === 'cookie') {
  console.log(await cookie(AKUN[a1].email, AKUN[a1].password));
} else if (cmd === 'cookie-admin') {
  console.log(await cookie(a1, a2));
} else if (cmd === 'bersihkan') {
  await bersihkan();
} else if (cmd === 'set-status') {
  const db = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });
  const r = await db.from('pengajuan').update({ status: a2, catatan: 'Catatan uji otomatis' })
    .eq('id', a1).select('status,proposal_path').single();
  console.log(r.error ? r.error.message : JSON.stringify(r.data));
} else if (cmd === 'berkas') {
  const db = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });
  const { data: aj } = await db.from('pengajuan').select('dosen_id').eq('id', a1).single();
  const { data: prop } = await db.storage.from('pengajuan').list(`${aj.dosen_id}/proposal`);
  const { data: surat } = await db.storage.from('pengajuan').list(`${aj.dosen_id}/${a1}`);
  console.log(JSON.stringify({
    proposal: (prop ?? []).map((f) => f.name),
    surat: (surat ?? []).map((f) => f.name),
  }));
} else if (cmd === 'unggah') {
  const [ck, file, endpoint, json] = [a1, a2, process.argv[5], process.argv[6]];
  const r = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: ck },
    body: json || '{}',
  });
  const t = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.log('GAGAL-TOKEN', r.status, JSON.stringify(t));
    process.exit(1);
  }
  const sb = createClient(SB_URL, ANON, { auth: { persistSession: false } });
  const { error } = await sb.storage
    .from('pengajuan')
    .uploadToSignedUrl(t.path, t.token, readFileSync(file), { contentType: 'application/pdf' });
  if (error) {
    console.log('GAGAL-UNGGAH', error.message);
    process.exit(1);
  }
  console.log(t.path);
} else {
  console.log('Perintah: daftar A|B · cookie A|B · cookie-admin EMAIL PASS · bersihkan · set-status ID STATUS · berkas ID · unggah "COOKIE" FILE ENDPOINT [JSON]');
}
```

- [ ] **Step 7: Verifikasi.** `npm run typecheck` → exit 0. Jalankan `npm run dev`, lalu (kredensial admin diberikan controller sebagai `ADMIN_EMAIL`/`ADMIN_PASSWORD` di shell, jangan ditulis ke file):

```bash
curl -s -o /dev/null -w "profil tanpa login: %{http_code}\n" http://localhost:3000/api/profil/saya
curl -s -o /dev/null -w "POST berita tanpa login: %{http_code}\n" -X POST -H "Content-Type: application/json" -d "{}" http://localhost:3000/api/berita
curl -s -o /dev/null -w "/admin tanpa login: %{http_code} -> %{redirect_url}\n" http://localhost:3000/admin
curl -s -o /dev/null -w "/dosen tanpa login: %{http_code} -> %{redirect_url}\n" http://localhost:3000/dosen
ADMIN_COOKIE=$(node scripts/uji.mjs cookie-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
curl -s -H "Cookie: $ADMIN_COOKIE" http://localhost:3000/api/profil/saya; echo
curl -s -o /dev/null -w "POST berita admin (body kosong): %{http_code}\n" -X POST -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d "{}" http://localhost:3000/api/berita
```
Expected: `401`; `401`; `/admin` → `307 -> http://localhost:3000/admin/login`; `/dosen` → `307 -> http://localhost:3000/dosen/login`; profil admin `{"peran":"admin","status":"aktif",...}`; POST berita admin `400` (lolos otorisasi, gagal validasi). Lalu di browser: login admin di `/admin/login` → dashboard tampil normal.

- [ ] **Step 8: Commit.**

```bash
git add src/lib/auth.ts src/lib/crud.ts src/middleware.ts "src/app/admin/(panel)/layout.tsx" src/app/api/profil scripts/uji.mjs
git commit -m "feat(dosen): otorisasi berbasis peran, guard admin, middleware bertimeout, alat uji

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Pendaftaran & login dosen, kerangka portal, login admin menolak non-admin

**Files:**
- Create: `src/components/auth/AuthLayout.tsx`, `src/components/auth/fields.tsx`, `src/app/api/dosen/daftar/route.ts`, `src/app/dosen/login/page.tsx`, `src/app/dosen/daftar/page.tsx`, `src/components/dosen/DosenShell.tsx`, `src/app/dosen/(portal)/layout.tsx`, `src/app/dosen/(portal)/page.tsx` (sementara; diganti di Task 5)
- Modify: `src/app/admin/login/page.tsx` (ganti seluruh isi), `src/components/admin/LogoutButton.tsx` (ganti seluruh isi), `src/lib/validation.ts` (append)

**Interfaces:**
- Consumes: `getSesi`, `Profil` (Task 2); `supabaseAdmin`; `rateLimitOk(ip: string, max?: number, windowMs?: number): boolean` (`src/lib/rate-limit.ts`); `GET /api/profil/saya` (Task 2); primitif `ui.tsx`.
- Produces:
  - `POST /api/dosen/daftar` → 201 `{ ok: true }` | 400 | 409 `Email sudah terdaftar.` | 429 | 500
  - `daftarDosenSchema` (zod) di `src/lib/validation.ts`
  - `<AuthLayout judul sorotan deskripsi catatan lebar?>`; `IconInput`, `PasswordInput`, `TombolKirim`, `PesanGalat` dari `src/components/auth/fields.tsx`
  - `<LogoutButton redirectTo? className? />` (default `redirectTo='/admin/login'`, tampilan lama)
  - `<DosenShell nama aktif>` — kerangka portal; `(portal)/layout.tsx` menjaga akses dosen

- [ ] **Step 1: Append ke `src/lib/validation.ts`:**

```ts
export const daftarDosenSchema = z.object({
  nama: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter.'),
  email: z.string().trim().toLowerCase().email('Email tidak valid.'),
  password: z.string().min(8, 'Password minimal 8 karakter.'),
  nidn: z.string().trim().regex(/^\d{8,18}$/, 'NIDN/NIDK harus berupa angka (8–18 digit).'),
  prodi: z.string().trim().min(2, 'Program studi wajib diisi.'),
  no_hp: z.string().trim().regex(/^[0-9+\-\s]{8,20}$/, 'Nomor HP tidak valid.'),
  website: z.string().default(''), // honeypot — harus kosong
});
```

- [ ] **Step 2: Buat `src/app/api/dosen/daftar/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { daftarDosenSchema } from '@/lib/validation';
import { rateLimitOk } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = daftarDosenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Data pendaftaran tidak valid.' },
      { status: 400 },
    );
  }
  const { website, password, ...data } = parsed.data;
  if (website) return NextResponse.json({ ok: true }, { status: 201 }); // honeypot: pura-pura sukses

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimitOk(`daftar:${ip}`)) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan pendaftaran. Silakan coba lagi nanti.' },
      { status: 429 },
    );
  }

  const db = supabaseAdmin();
  const { data: dibuat, error } = await db.auth.admin.createUser({
    email: data.email,
    password,
    email_confirm: true,
    user_metadata: { nama: data.nama },
  });
  if (error || !dibuat.user) {
    const sudahAda = error?.status === 422 || /already|registered|exists/i.test(error?.message ?? '');
    return sudahAda
      ? NextResponse.json({ error: 'Email sudah terdaftar.' }, { status: 409 })
      : NextResponse.json({ error: 'Pendaftaran gagal. Silakan coba lagi.' }, { status: 500 });
  }

  const { error: pErr } = await db
    .from('profil')
    .insert({ user_id: dibuat.user.id, ...data, peran: 'dosen', status: 'menunggu' });
  if (pErr) {
    await db.auth.admin.deleteUser(dibuat.user.id); // rollback agar tidak ada akun tanpa profil
    return NextResponse.json({ error: 'Pendaftaran gagal. Silakan coba lagi.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
```

- [ ] **Step 3: Buat `src/components/auth/AuthLayout.tsx`:**

```tsx
import { ShieldCheckIcon } from '@/components/admin/icons';

export default function AuthLayout({
  judul,
  sorotan,
  deskripsi,
  catatan,
  lebar = 'max-w-sm',
  children,
}: {
  judul: string;
  sorotan: string;
  deskripsi: string;
  catatan: string;
  lebar?: 'max-w-sm' | 'max-w-md';
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <div className="bg-brand-gradient relative overflow-hidden flex flex-col justify-between p-8 lg:p-12 text-white">
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-navy-500/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <img
            src="/assets/img/logo-color.png"
            alt="Logo Universitas Sapta Mandiri"
            className="h-11 w-11 object-contain drop-shadow"
          />
          <div className="leading-tight">
            <p className="font-bold tracking-wide">LPPM UnivSM</p>
            <p className="text-gold-300 text-[11px] font-medium tracking-widest uppercase">
              Universitas Sapta Mandiri
            </p>
          </div>
        </div>

        <div className="relative hidden lg:block max-w-md">
          <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight">
            {judul}
            <br />
            <span className="text-gold-400">{sorotan}</span>
          </h1>
          <p className="mt-4 text-white/70 leading-relaxed">{deskripsi}</p>
        </div>

        <div className="relative flex items-center gap-2 text-white/60 text-xs">
          <ShieldCheckIcon className="w-4 h-4 text-gold-400" />
          <span>{catatan}</span>
        </div>
      </div>

      <div className="flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className={`w-full ${lebar}`}>
          {children}
          <p className="mt-8 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} LPPM Universitas Sapta Mandiri
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Buat `src/components/auth/fields.tsx`:**

```tsx
'use client';

import { useState } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon } from '@/components/admin/icons';

const fieldCls =
  'w-full rounded-xl border border-gray-300 bg-white py-2.5 text-sm outline-none transition focus:border-navy-800 focus:ring-2 focus:ring-navy-800/15';

export function IconInput({
  id,
  label,
  icon,
  ...rest
}: { id: string; label: string; icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        <input id={id} name={id} {...rest} className={`${fieldCls} pl-10 pr-3`} />
      </div>
    </div>
  );
}

export function PasswordInput({
  id,
  label,
  ...rest
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [lihat, setLihat] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <LockIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id={id}
          name={id}
          {...rest}
          type={lihat ? 'text' : 'password'}
          className={`${fieldCls} pl-10 pr-11`}
        />
        <button
          type="button"
          onClick={() => setLihat((v) => !v)}
          aria-label={lihat ? 'Sembunyikan password' : 'Tampilkan password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
        >
          {lihat ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

export function TombolKirim({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-xl bg-navy-800 hover:bg-navy-700 active:bg-navy-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 text-sm shadow-lg shadow-navy-800/20 transition flex items-center justify-center gap-2 cursor-pointer"
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
        </svg>
      )}
      {loading ? 'Memproses...' : label}
    </button>
  );
}

export function PesanGalat({ pesan }: { pesan: string }) {
  if (!pesan) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5">
      {pesan}
    </p>
  );
}
```

- [ ] **Step 5: Ganti isi `src/app/admin/login/page.tsx`** (tampilan sama, kini menolak akun non-admin):

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import AuthLayout from '@/components/auth/AuthLayout';
import { IconInput, PasswordInput, TombolKirim, PesanGalat } from '@/components/auth/fields';
import { MailIcon } from '@/components/admin/icons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('e') === 'akses') {
      setError('Akun Anda tidak memiliki akses ke panel admin.');
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Email atau password salah.');
      setLoading(false);
      return;
    }
    const res = await fetch('/api/profil/saya', { cache: 'no-store' });
    const profil = res.ok ? await res.json() : null;
    if (!profil || profil.peran !== 'admin' || profil.status !== 'aktif') {
      await sb.auth.signOut();
      setError(
        profil?.peran === 'dosen'
          ? 'Ini akun dosen. Silakan masuk lewat halaman Layanan Dosen.'
          : 'Akun ini bukan akun admin LPPM.',
      );
      setLoading(false);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <AuthLayout
      judul="Panel Admin"
      sorotan="Pengelolaan Konten"
      deskripsi="Kelola berita, dokumen, data penelitian & pengabdian, publikasi, pengajuan dosen, serta pesan masuk situs LPPM dari satu tempat."
      catatan="Akses terbatas untuk pengelola resmi LPPM."
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-navy-800">Selamat datang kembali</h2>
        <p className="text-sm text-gray-500 mt-1">Masuk untuk melanjutkan ke panel admin.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <PesanGalat pesan={error} />
        <IconInput
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="nama@univsm.ac.id"
          icon={<MailIcon className="w-5 h-5" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordInput
          id="password"
          label="Password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TombolKirim loading={loading} label="Masuk" />
      </form>
    </AuthLayout>
  );
}
```

- [ ] **Step 6: Buat `src/app/dosen/login/page.tsx`:**

```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import AuthLayout from '@/components/auth/AuthLayout';
import { IconInput, PasswordInput, TombolKirim, PesanGalat } from '@/components/auth/fields';
import { MailIcon } from '@/components/admin/icons';

export default function LoginDosenPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Email atau password salah.');
      setLoading(false);
      return;
    }
    const res = await fetch('/api/profil/saya', { cache: 'no-store' });
    const profil = res.ok ? await res.json() : null;
    if (!profil) {
      await sb.auth.signOut();
      setError('Akun tidak ditemukan. Silakan daftar terlebih dahulu.');
      setLoading(false);
      return;
    }
    router.push(profil.peran === 'admin' ? '/admin' : '/dosen');
    router.refresh();
  }

  return (
    <AuthLayout
      judul="Layanan Dosen"
      sorotan="Pengajuan Penelitian & PkM"
      deskripsi="Ajukan penelitian dan pengabdian kepada masyarakat, pantau statusnya, dan unduh Surat Tugas serta SK langsung dari portal ini."
      catatan="Khusus dosen Universitas Sapta Mandiri."
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-navy-800">Masuk Layanan Dosen</h2>
        <p className="text-sm text-gray-500 mt-1">Gunakan akun yang sudah diverifikasi LPPM.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <PesanGalat pesan={error} />
        <IconInput
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="nama@univsm.ac.id"
          icon={<MailIcon className="w-5 h-5" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordInput
          id="password"
          label="Password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TombolKirim loading={loading} label="Masuk" />
      </form>
      <p className="mt-6 text-sm text-gray-600 text-center">
        Belum punya akun?{' '}
        <Link href="/dosen/daftar" className="font-semibold text-navy-700 hover:underline">
          Daftar di sini
        </Link>
      </p>
      <p className="mt-2 text-center">
        <a href="/" className="text-xs text-gray-400 hover:text-gray-600">
          ← Kembali ke situs LPPM
        </a>
      </p>
    </AuthLayout>
  );
}
```

- [ ] **Step 7: Buat `src/app/dosen/daftar/page.tsx`:**

```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import AuthLayout from '@/components/auth/AuthLayout';
import { PasswordInput, TombolKirim, PesanGalat } from '@/components/auth/fields';
import { inputCls, labelCls } from '@/components/admin/ui';

const KOSONG = { nama: '', email: '', nidn: '', prodi: '', no_hp: '', password: '', ulang: '', website: '' };
type Isian = typeof KOSONG;

export default function DaftarDosenPage() {
  const [f, setF] = useState<Isian>(KOSONG);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selesai, setSelesai] = useState(false);

  const ubah = (k: keyof Isian) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (f.password !== f.ulang) {
      setError('Konfirmasi password tidak sama.');
      return;
    }
    setLoading(true);
    const { nama, email, nidn, prodi, no_hp, password, website } = f;
    const res = await fetch('/api/dosen/daftar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, email, nidn, prodi, no_hp, password, website }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error || 'Pendaftaran gagal.');
      return;
    }
    setSelesai(true);
  }

  return (
    <AuthLayout
      judul="Layanan Dosen"
      sorotan="Pendaftaran Akun"
      deskripsi="Daftarkan akun Anda. Setelah diverifikasi LPPM, Anda dapat mengajukan penelitian dan PkM secara daring."
      catatan="Akun diaktifkan setelah verifikasi data oleh LPPM."
      lebar="max-w-md"
    >
      {selesai ? (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-navy-800">Pendaftaran terkirim</h2>
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">
            Akun Anda akan aktif setelah diverifikasi LPPM. Anda sudah bisa masuk untuk melihat status verifikasi.
          </p>
          <Link href="/dosen/login" className="inline-block mt-6 font-semibold text-navy-700 hover:underline">
            Ke halaman masuk →
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-navy-800">Daftar Akun Dosen</h2>
            <p className="text-sm text-gray-500 mt-1">Lengkapi data sesuai identitas dosen Anda.</p>
          </div>
          <form onSubmit={kirim} className="space-y-4">
            <PesanGalat pesan={error} />
            <div>
              <label htmlFor="nama" className={labelCls}>Nama Lengkap & Gelar</label>
              <input id="nama" required value={f.nama} onChange={ubah('nama')} className={inputCls} />
            </div>
            <div>
              <label htmlFor="email" className={labelCls}>Email</label>
              <input id="email" type="email" autoComplete="email" required value={f.email} onChange={ubah('email')} placeholder="nama@univsm.ac.id" className={inputCls} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nidn" className={labelCls}>NIDN / NIDK</label>
                <input id="nidn" inputMode="numeric" required value={f.nidn} onChange={ubah('nidn')} className={inputCls} />
              </div>
              <div>
                <label htmlFor="no_hp" className={labelCls}>No. HP / WhatsApp</label>
                <input id="no_hp" type="tel" required value={f.no_hp} onChange={ubah('no_hp')} className={inputCls} />
              </div>
            </div>
            <div>
              <label htmlFor="prodi" className={labelCls}>Program Studi</label>
              <input id="prodi" required value={f.prodi} onChange={ubah('prodi')} className={inputCls} />
            </div>
            <PasswordInput id="password" label="Password (min. 8 karakter)" autoComplete="new-password" required minLength={8} value={f.password} onChange={ubah('password')} />
            <PasswordInput id="ulang" label="Ulangi Password" autoComplete="new-password" required value={f.ulang} onChange={ubah('ulang')} />
            <input type="text" name="website" value={f.website} onChange={ubah('website')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <TombolKirim loading={loading} label="Daftar" />
          </form>
          <p className="mt-6 text-sm text-gray-600 text-center">
            Sudah punya akun?{' '}
            <Link href="/dosen/login" className="font-semibold text-navy-700 hover:underline">Masuk</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
```

- [ ] **Step 8: Ganti isi `src/components/admin/LogoutButton.tsx`:**

```tsx
'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';
import { LogoutIcon } from './icons';

export default function LogoutButton({
  redirectTo = '/admin/login',
  className,
}: {
  redirectTo?: string;
  className?: string;
}) {
  async function handleLogout() {
    await supabaseBrowser().auth.signOut();
    window.location.href = redirectTo;
  }
  return (
    <button
      onClick={handleLogout}
      className={
        className ??
        'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/75 hover:bg-white/10 hover:text-white transition-colors cursor-pointer'
      }
    >
      <LogoutIcon className="w-5 h-5 text-white/60" />
      Keluar
    </button>
  );
}
```

- [ ] **Step 9: Buat `src/components/dosen/DosenShell.tsx`:**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/admin/LogoutButton';

const MENU = [
  { href: '/dosen', label: 'Pengajuan Saya' },
  { href: '/dosen/ajukan', label: 'Ajukan Baru' },
];

export default function DosenShell({
  nama,
  aktif,
  children,
}: {
  nama: string;
  aktif: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname();
  return (
    <div className="min-h-dvh bg-gray-100">
      <header className="bg-navy-900 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 shrink-0">
            <img src="/assets/img/logo-color.png" alt="Logo UnivSM" className="h-8 w-8 object-contain" />
            <span className="font-bold text-sm hidden sm:inline">Layanan Dosen LPPM</span>
          </a>
          {aktif && (
            <nav className="flex items-center gap-1 text-sm">
              {MENU.map((m) => {
                const on =
                  m.href === '/dosen'
                    ? path === '/dosen' || path.startsWith('/dosen/pengajuan')
                    : path.startsWith(m.href);
                return (
                  <Link
                    key={m.href}
                    href={m.href}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      on ? 'bg-gold-500 text-navy-900 font-semibold' : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {m.label}
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden md:inline text-xs text-white/70 truncate max-w-48">{nama}</span>
            <LogoutButton
              redirectTo="/dosen/login"
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
            />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 10: Buat `src/app/dosen/(portal)/layout.tsx`:**

```tsx
import { redirect } from 'next/navigation';
import DosenShell from '@/components/dosen/DosenShell';
import { getSesi } from '@/lib/auth';
import { cardCls } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const sesi = await getSesi();
  if (!sesi || !sesi.profil) redirect('/dosen/login');
  const p = sesi.profil;
  if (p.peran === 'admin') redirect('/admin');
  const aktif = p.status === 'aktif';

  return (
    <DosenShell nama={p.nama} aktif={aktif}>
      {aktif ? (
        children
      ) : (
        <div className={`${cardCls} max-w-xl mx-auto p-8 text-center`}>
          <h1 className="text-xl font-bold text-navy-800 mb-2">
            {p.status === 'menunggu' ? 'Akun Menunggu Verifikasi' : 'Akun Tidak Disetujui'}
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            {p.status === 'menunggu'
              ? 'Pendaftaran Anda sudah kami terima. Anda dapat mengajukan penelitian dan PkM setelah akun diverifikasi LPPM.'
              : 'Pendaftaran akun Anda tidak disetujui. Silakan hubungi LPPM untuk informasi lebih lanjut.'}
          </p>
        </div>
      )}
    </DosenShell>
  );
}
```

- [ ] **Step 11: Buat halaman sementara `src/app/dosen/(portal)/page.tsx`** (diganti di Task 5):

```tsx
export default function PortalBeranda() {
  return <p className="text-sm text-gray-600">Portal pengajuan sedang disiapkan.</p>;
}
```

- [ ] **Step 12: Verifikasi API.** `npm run typecheck` → exit 0. Dev server jalan (restart bila sudah lama jalan, agar rate limiter bersih):

```bash
node scripts/uji.mjs daftar A
node scripts/uji.mjs daftar A
curl -s -w " → %{http_code}\n" -X POST -H "Content-Type: application/json" -d '{"nama":"Dosen Uji A","email":"  UJI.Dosen.A@EXAMPLE.com ","password":"UjiDosenA#2026","nidn":"0101010101","prodi":"Teknik Informatika","no_hp":"081234567890"}' http://localhost:3000/api/dosen/daftar
curl -s -w " → %{http_code}\n" -X POST -H "Content-Type: application/json" -d '{"nama":"Dosen Uji X","email":"uji.x@example.com","password":"UjiDosenX#2026","nidn":"abc","prodi":"TI","no_hp":"081234567890"}' http://localhost:3000/api/dosen/daftar
curl -s -w " → %{http_code}\n" -X POST -H "Content-Type: application/json" -d '{"nama":"Bot Spam","email":"uji.bot@example.com","password":"BotSpam#2026","nidn":"0909090909","prodi":"TI","no_hp":"081234567890","website":"http://spam.example"}' http://localhost:3000/api/dosen/daftar
```
Expected (berurutan): `201 {"ok":true}`; `409 {"error":"Email sudah terdaftar."}`; varian huruf besar/spasi → `{"error":"Email sudah terdaftar."} → 409` *(Review Focus #3)*; NIDN salah → `...NIDN/NIDK harus berupa angka (8–18 digit)... → 400`; honeypot → `{"ok":true} → 201`.

Pastikan honeypot TIDAK membuat akun:
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('fs').readFileSync('.env.local','utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].trim();});
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
db.from('profil').select('email,peran,status').in('email',['uji.bot@example.com','uji.dosen.a@example.com']).then(r=>console.log(JSON.stringify(r.data)));
"
```
Expected: hanya `uji.dosen.a@example.com` dengan `"peran":"dosen","status":"menunggu"`.

Akses dosen berstatus menunggu:
```bash
A=$(node scripts/uji.mjs cookie A)
curl -s -H "Cookie: $A" http://localhost:3000/api/profil/saya; echo
curl -s -o /dev/null -w "POST berita sbg dosen: %{http_code}\n" -X POST -H "Cookie: $A" -H "Content-Type: application/json" -d "{}" http://localhost:3000/api/berita
curl -s -o /dev/null -w "/admin sbg dosen: %{http_code} -> %{redirect_url}\n" -H "Cookie: $A" http://localhost:3000/admin
curl -s -H "Cookie: $A" "http://localhost:3000/api/berita?all=1" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log('berita all=1 sbg dosen, ada draf?', JSON.parse(d).some(b=>!b.published)))"
```
Expected: `{"peran":"dosen","status":"menunggu",...}`; `403`; `/admin` → `307 -> http://localhost:3000/dosen`; `ada draf? false`.

- [ ] **Step 13: Verifikasi browser.**
  1. `/dosen/daftar` tampil (split-screen, form lengkap); `/dosen/login` tampil dengan tautan "Daftar di sini".
  2. Login sebagai dosen uji A di `/dosen/login` → `/dosen` menampilkan kartu **"Akun Menunggu Verifikasi"**, topbar tanpa menu pengajuan, tombol Keluar → kembali ke `/dosen/login`.
  3. Login dosen uji A di `/admin/login` → pesan **"Ini akun dosen. Silakan masuk lewat halaman Layanan Dosen."**, tetap di halaman login.
  4. Login admin di `/admin/login` → dashboard normal; tampilan login sama seperti sebelumnya.

- [ ] **Step 14: Commit.**

```bash
git add src/lib/validation.ts src/app/api/dosen/daftar src/components/auth src/app/admin/login/page.tsx src/app/dosen src/components/dosen/DosenShell.tsx src/components/admin/LogoutButton.tsx
git commit -m "feat(dosen): pendaftaran & login dosen, kerangka portal, login admin tolak non-admin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Persetujuan akun dosen (panel admin)

**Files:**
- Create: `src/app/api/admin/dosen/route.ts`, `src/app/api/admin/dosen/[id]/route.ts`, `src/app/admin/(panel)/akun-dosen/page.tsx`
- Modify: `src/lib/validation.ts` (append), `src/components/admin/icons.tsx` (tambah `UserCheckIcon`)

**Interfaces:**
- Consumes: `requireAdmin` (Task 2), `supabaseAdmin`, primitif `ui.tsx`.
- Produces:
  - `GET /api/admin/dosen?status=menunggu|aktif|ditolak` → `Array<{ user_id, nama, email, nidn, prodi, no_hp, status, created_at }>`
  - `PATCH /api/admin/dosen/[id]` body `{ status: 'aktif' | 'ditolak' }` → baris profil | 400 | 404
  - `statusDosenSchema` (zod); `UserCheckIcon` (dipakai Task 7)

- [ ] **Step 1: Append ke `src/lib/validation.ts`:**

```ts
export const statusDosenSchema = z.object({
  status: z.enum(['aktif', 'ditolak'], { errorMap: () => ({ message: 'Status akun tidak valid.' }) }),
});
```

- [ ] **Step 2: Tambahkan ke `src/components/admin/icons.tsx`** (sebelum `export function MenuIcon`):

```tsx
export function UserCheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </Svg>
  );
}
```

- [ ] **Step 3: Buat `src/app/api/admin/dosen/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const status = new URL(req.url).searchParams.get('status');
  let q = supabaseAdmin()
    .from('profil')
    .select('user_id,nama,email,nidn,prodi,no_hp,status,created_at')
    .eq('peran', 'dosen')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: 'Gagal mengambil data akun dosen.' }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 4: Buat `src/app/api/admin/dosen/[id]/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { statusDosenSchema } from '@/lib/validation';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = statusDosenSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin()
    .from('profil')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('user_id', id)
    .eq('peran', 'dosen') // akun admin tidak bisa diubah dari sini
    .select('user_id,nama,status')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Gagal mengubah status akun.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Akun dosen tidak ditemukan.' }, { status: 404 });
  return NextResponse.json(data);
}
```

- [ ] **Step 5: Buat `src/app/admin/(panel)/akun-dosen/page.tsx`:**

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PageHeader,
  Alert,
  TableEmptyRow,
  cardCls,
  theadCls,
  thCls,
  tdCls,
  rowEditBtn,
  rowDeleteBtn,
} from '@/components/admin/ui';
import { UserCheckIcon } from '@/components/admin/icons';

type StatusAkun = 'menunggu' | 'aktif' | 'ditolak';
type Dosen = {
  user_id: string;
  nama: string;
  email: string;
  nidn: string;
  prodi: string;
  no_hp: string;
  status: StatusAkun;
  created_at: string;
};

const TAB: { v: StatusAkun; l: string }[] = [
  { v: 'menunggu', l: 'Menunggu' },
  { v: 'aktif', l: 'Aktif' },
  { v: 'ditolak', l: 'Ditolak' },
];

export default function AkunDosenPage() {
  const [tab, setTab] = useState<StatusAkun>('menunggu');
  const [rows, setRows] = useState<Dosen[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    const res = await fetch(`/api/admin/dosen?status=${tab}`, { cache: 'no-store' });
    if (!res.ok) {
      setError('Gagal memuat data akun dosen.');
      setRows([]);
      return;
    }
    setRows(await res.json());
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  async function ubah(d: Dosen, status: 'aktif' | 'ditolak') {
    const kata = status === 'aktif' ? 'mengaktifkan' : d.status === 'aktif' ? 'menonaktifkan' : 'menolak';
    if (!confirm(`Yakin ${kata} akun ${d.nama}?`)) return;
    setBusy(d.user_id);
    setError('');
    const res = await fetch(`/api/admin/dosen/${d.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(json.error || 'Gagal mengubah status akun.');
      return;
    }
    load();
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        icon={<UserCheckIcon className="w-6 h-6" />}
        title="Akun Dosen"
        subtitle="Verifikasi pendaftaran dosen untuk Layanan Dosen."
      />
      <div className="flex flex-wrap gap-2 mb-4">
        {TAB.map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
              tab === t.v ? 'bg-navy-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>
      {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={theadCls}>
              <th className={thCls}>Nama / Email</th>
              <th className={thCls}>NIDN/NIDK</th>
              <th className={thCls}>Program Studi</th>
              <th className={thCls}>No. HP</th>
              <th className={thCls}>Terdaftar</th>
              <th className={`${thCls} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && (
              <TableEmptyRow colSpan={6} icon={<UserCheckIcon className="w-6 h-6" />} text="Tidak ada akun pada kategori ini." />
            )}
            {rows.map((d) => (
              <tr key={d.user_id} className="hover:bg-gray-50 transition-colors">
                <td className={tdCls}>
                  <p className="font-medium text-gray-800">{d.nama}</p>
                  <p className="text-xs text-gray-500">{d.email}</p>
                </td>
                <td className={`${tdCls} tabular-nums`}>{d.nidn}</td>
                <td className={tdCls}>{d.prodi}</td>
                <td className={`${tdCls} tabular-nums`}>{d.no_hp}</td>
                <td className={tdCls}>{new Date(d.created_at).toLocaleDateString('id-ID')}</td>
                <td className={`${tdCls} text-right whitespace-nowrap`}>
                  <div className="inline-flex gap-1">
                    {d.status !== 'aktif' && (
                      <button disabled={busy === d.user_id} onClick={() => ubah(d, 'aktif')} className={rowEditBtn}>
                        {d.status === 'menunggu' ? 'Setujui' : 'Aktifkan'}
                      </button>
                    )}
                    {d.status !== 'ditolak' && (
                      <button disabled={busy === d.user_id} onClick={() => ubah(d, 'ditolak')} className={rowDeleteBtn}>
                        {d.status === 'menunggu' ? 'Tolak' : 'Nonaktifkan'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verifikasi.** `npm run typecheck` → exit 0. Dev server jalan:

```bash
ADMIN_COOKIE=$(node scripts/uji.mjs cookie-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
A=$(node scripts/uji.mjs cookie A)
curl -s -o /dev/null -w "daftar dosen sbg dosen: %{http_code}\n" -H "Cookie: $A" http://localhost:3000/api/admin/dosen
curl -s -H "Cookie: $ADMIN_COOKIE" "http://localhost:3000/api/admin/dosen?status=menunggu" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const a=JSON.parse(d);console.log('menunggu:',a.map(x=>x.email).join(','));require('fs').writeFileSync('.superpowers/uji-id-A.txt',(a.find(x=>x.email==='uji.dosen.a@example.com')||{}).user_id||'')})"
ID_A=$(cat .superpowers/uji-id-A.txt)
curl -s -w " → %{http_code}\n" -X PATCH -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d '{"status":"menunggu"}' http://localhost:3000/api/admin/dosen/$ID_A
curl -s -w " → %{http_code}\n" -X PATCH -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d '{"status":"aktif"}' http://localhost:3000/api/admin/dosen/00000000-0000-0000-0000-000000000000
curl -s -w " → %{http_code}\n" -X PATCH -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d '{"status":"aktif"}' http://localhost:3000/api/admin/dosen/$ID_A
curl -s -H "Cookie: $A" http://localhost:3000/api/profil/saya; echo
```
(`.superpowers/` sudah di-gitignore.) Expected: `403`; `menunggu:` berisi `uji.dosen.a@example.com`; status `menunggu` → `400 ...Status akun tidak valid.`; uuid acak → `404 ...Akun dosen tidak ditemukan.`; setujui A → `200 {...,"status":"aktif"}`; profil A → `"status":"aktif"`.

Browser: buka `/admin/akun-dosen` sebagai admin → tab Menunggu/Aktif/Ditolak bekerja, A ada di tab **Aktif**; login dosen A di `/dosen` → kini topbar menampilkan menu **Pengajuan Saya** & **Ajukan Baru**.

- [ ] **Step 7: Commit.**

```bash
git add src/lib/validation.ts src/components/admin/icons.tsx src/app/api/admin/dosen "src/app/admin/(panel)/akun-dosen"
git commit -m "feat(dosen): persetujuan akun dosen di panel admin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Pengajuan oleh dosen (unggah langsung ke Storage, ajukan, revisi, unduh)

**Files:**
- Create: `src/lib/pengajuan-shared.ts`, `src/lib/pengajuan-server.ts`, `src/lib/unggah-client.ts`, `src/app/api/dosen/unggah/route.ts`, `src/app/api/dosen/pengajuan/route.ts`, `src/app/api/dosen/pengajuan/[id]/route.ts`, `src/app/api/dosen/pengajuan/[id]/file/route.ts`, `src/components/dosen/PengajuanForm.tsx`, `src/app/dosen/(portal)/ajukan/page.tsx`, `src/app/dosen/(portal)/pengajuan/[id]/page.tsx`
- Modify: `src/app/dosen/(portal)/page.tsx` (ganti seluruh isi), `src/lib/validation.ts` (import di atas + append)

**Interfaces:**
- Consumes: `requireDosen`, `requireAdmin` (Task 2); `supabaseAdmin`; `supabaseBrowser` (`src/lib/supabase/browser.ts`); primitif `ui.tsx`; ikon `DocIcon`, `PlusIcon`, `DownloadIcon`.
- Produces (dipakai Task 6 & 7):
  - `src/lib/pengajuan-shared.ts`: `type Jenis`, `type StatusPengajuan`, `type FileJenis = 'proposal'|'surat_tugas'|'sk'`, `type Pengajuan`, `SKEMA`, `JENIS_LABEL`, `STATUS_LABEL`, `STATUS_BADGE`, `FILE_LABEL`, `KOLOM_FILE`, `MAX_PDF`
  - `src/lib/pengajuan-server.ts`: `BUCKET`, `pathProposalBaru(dosenId)`, `pathSuratBaru(dosenId, pengajuanId, jenis)`, `cocokProposal(dosenId, path)`, `cocokSurat(dosenId, pengajuanId, jenis, path)`, `tokenUnggah(path): Promise<{path, token}>`, `periksaPdf(path): Promise<string | null>`, `hapusFile(path)`, `urlUnduh(path): Promise<string | null>`, `pathDipakai(path): Promise<boolean>`
  - `src/lib/unggah-client.ts`: `unggahPdf(endpoint, body, file): Promise<string>` (mengembalikan path)
  - `pengajuanSchema` (zod)
  - API: `POST /api/dosen/unggah` → `{ path, token }`; `GET|POST /api/dosen/pengajuan`; `GET|PUT /api/dosen/pengajuan/[id]`; `GET /api/dosen/pengajuan/[id]/file?jenis=` → 302
  - `<PengajuanForm awal? url method labelKirim fileWajib onSelesai />`

- [ ] **Step 1: Buat `src/lib/pengajuan-shared.ts`** (tanpa impor server — aman untuk komponen client):

```ts
export type Jenis = 'penelitian' | 'pkm';
export type StatusPengajuan = 'diajukan' | 'revisi' | 'ditolak' | 'disetujui' | 'terbit';
export type FileJenis = 'proposal' | 'surat_tugas' | 'sk';

export type Pengajuan = {
  id: string;
  dosen_id: string;
  jenis: Jenis;
  judul: string;
  skema: string;
  tahun: number;
  anggota: string;
  sumber_dana: string;
  ringkasan: string;
  proposal_path: string;
  status: StatusPengajuan;
  catatan: string;
  surat_tugas_path: string | null;
  sk_path: string | null;
  publik_id: string | null;
  created_at: string;
  updated_at: string | null;
};

export const MAX_PDF = 10 * 1024 * 1024;

export const SKEMA: Record<Jenis, readonly string[]> = {
  penelitian: ['Penelitian Mandiri', 'Penelitian Kelompok', 'Penelitian Kolaborasi', 'Hibah Eksternal Dikti'],
  pkm: ['PkM Mandiri', 'PkM Berbasis Riset', 'PkM KKN-Tematik', 'PkM Kolaborasi Mitra'],
};

export const JENIS_LABEL: Record<Jenis, string> = { penelitian: 'Penelitian', pkm: 'PkM' };

export const STATUS_LABEL: Record<StatusPengajuan, string> = {
  diajukan: 'Diajukan',
  revisi: 'Perlu Revisi',
  ditolak: 'Ditolak',
  disetujui: 'Disetujui',
  terbit: 'ST & SK Terbit',
};

export const STATUS_BADGE: Record<StatusPengajuan, string> = {
  diajukan: 'bg-blue-100 text-blue-700',
  revisi: 'bg-amber-100 text-amber-700',
  ditolak: 'bg-red-100 text-red-700',
  disetujui: 'bg-violet-100 text-violet-700',
  terbit: 'bg-emerald-100 text-emerald-700',
};

export const FILE_LABEL: Record<FileJenis, string> = {
  proposal: 'Proposal',
  surat_tugas: 'Surat Tugas',
  sk: 'SK',
};

export const KOLOM_FILE = {
  proposal: 'proposal_path',
  surat_tugas: 'surat_tugas_path',
  sk: 'sk_path',
} as const satisfies Record<FileJenis, keyof Pengajuan>;
```

- [ ] **Step 2: Buat `src/lib/pengajuan-server.ts`** (server saja — memakai service role):

```ts
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { MAX_PDF, type FileJenis } from '@/lib/pengajuan-shared';

export const BUCKET = 'pengajuan';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
type JenisSurat = Exclude<FileJenis, 'proposal'>;
const AWALAN: Record<JenisSurat, string> = { surat_tugas: 'surat-tugas', sk: 'sk' };

export function pathProposalBaru(dosenId: string): string {
  return `${dosenId}/proposal/${randomUUID()}.pdf`;
}

export function pathSuratBaru(dosenId: string, pengajuanId: string, jenis: JenisSurat): string {
  return `${dosenId}/${pengajuanId}/${AWALAN[jenis]}-${Date.now()}.pdf`;
}

export function cocokProposal(dosenId: string, path: string): boolean {
  return new RegExp(`^${dosenId}/proposal/${UUID}\\.pdf$`).test(path);
}

export function cocokSurat(dosenId: string, pengajuanId: string, jenis: JenisSurat, path: string): boolean {
  return new RegExp(`^${dosenId}/${pengajuanId}/${AWALAN[jenis]}-\\d+\\.pdf$`).test(path);
}

// Token unggah sekali-pakai; path ditentukan server, bukan browser.
export async function tokenUnggah(path: string): Promise<{ path: string; token: string }> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? 'Token unggah gagal dibuat.');
  return { path: data.path, token: data.token };
}

export async function hapusFile(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabaseAdmin().storage.from(BUCKET).remove([path]);
}

export async function urlUnduh(path: string): Promise<string | null> {
  const { data } = await supabaseAdmin().storage.from(BUCKET).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

// Verifikasi objek hasil unggah langsung: ada, ≤10 MB, diawali %PDF-. Objek tidak sah dihapus.
export async function periksaPdf(path: string): Promise<string | null> {
  const db = supabaseAdmin();
  const i = path.lastIndexOf('/');
  const nama = path.slice(i + 1);
  const { data: daftar } = await db.storage.from(BUCKET).list(path.slice(0, i), { search: nama });
  const obj = daftar?.find((o) => o.name === nama);
  if (!obj) return 'File belum terunggah. Silakan unggah ulang.';
  const ukuran = Number((obj.metadata as { size?: number } | null)?.size ?? 0);
  if (ukuran > MAX_PDF) {
    await hapusFile(path);
    return 'Ukuran file melebihi batas 10 MB.';
  }
  const { data: tanda } = await db.storage.from(BUCKET).createSignedUrl(path, 60);
  if (!tanda) return 'File tidak dapat diperiksa. Silakan unggah ulang.';
  const res = await fetch(tanda.signedUrl, { headers: { Range: 'bytes=0-4' } });
  const awal = new Uint8Array(await res.arrayBuffer()).slice(0, 5);
  if (String.fromCharCode(...awal) !== '%PDF-') {
    await hapusFile(path);
    return 'File harus berformat PDF.';
  }
  return null;
}

// Satu berkas proposal hanya boleh dipakai satu pengajuan.
export async function pathDipakai(path: string): Promise<boolean> {
  const { count } = await supabaseAdmin()
    .from('pengajuan')
    .select('id', { count: 'exact', head: true })
    .eq('proposal_path', path);
  return (count ?? 0) > 0;
}
```

- [ ] **Step 3: Buat `src/lib/unggah-client.ts`** (dipakai komponen client):

```ts
import { supabaseBrowser } from '@/lib/supabase/browser';
import { MAX_PDF } from '@/lib/pengajuan-shared';

// Minta token unggah ke `endpoint` (server menentukan path), lalu unggah langsung ke Storage.
// Melewati batas body 4,5 MB fungsi Vercel. Mengembalikan path untuk dikirim ke API.
export async function unggahPdf(endpoint: string, body: Record<string, unknown>, file: File): Promise<string> {
  const pdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!pdf) throw new Error('File harus berformat PDF.');
  if (file.size > MAX_PDF) {
    throw new Error('Ukuran file melebihi batas 10 MB. Silakan kompres PDF terlebih dahulu.');
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Gagal menyiapkan unggahan.');
  const { error } = await supabaseBrowser()
    .storage.from('pengajuan')
    .uploadToSignedUrl(json.path, json.token, file, { contentType: 'application/pdf' });
  if (error) throw new Error('Gagal mengunggah file. Periksa koneksi lalu coba lagi.');
  return json.path as string;
}
```

- [ ] **Step 4: Ubah `src/lib/validation.ts`.** Tambahkan di baris paling atas (setelah `import { z } from 'zod';`):

```ts
import { SKEMA } from '@/lib/pengajuan-shared';
```

Append di akhir file:

```ts
export const pengajuanSchema = z
  .object({
    jenis: z.enum(['penelitian', 'pkm'], { errorMap: () => ({ message: 'Jenis kegiatan tidak valid.' }) }),
    judul: z.string().trim().min(10, 'Judul minimal 10 karakter.'),
    skema: z.string().trim(),
    tahun: z.coerce.number().int().min(2000, 'Tahun tidak valid.').max(2100, 'Tahun tidak valid.'),
    anggota: z.string().trim().default(''),
    sumber_dana: z.string().trim().default(''),
    ringkasan: z.string().trim().default(''),
  })
  .refine((d) => SKEMA[d.jenis].includes(d.skema), {
    message: 'Skema tidak sesuai dengan jenis kegiatan.',
    path: ['skema'],
  });
```

- [ ] **Step 5: Buat `src/app/api/dosen/unggah/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { requireDosen } from '@/lib/auth';
import { pathProposalBaru, tokenUnggah } from '@/lib/pengajuan-server';

export async function POST() {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  try {
    return NextResponse.json(await tokenUnggah(pathProposalBaru(r.profil.user_id)));
  } catch {
    return NextResponse.json({ error: 'Gagal menyiapkan unggahan.' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Buat `src/app/api/dosen/pengajuan/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireDosen } from '@/lib/auth';
import { pengajuanSchema } from '@/lib/validation';
import { cocokProposal, pathDipakai, periksaPdf } from '@/lib/pengajuan-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  const { data, error } = await supabaseAdmin()
    .from('pengajuan')
    .select('*')
    .eq('dosen_id', r.profil.user_id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Gagal mengambil pengajuan.' }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  const body = await req.json().catch(() => null);
  const parsed = pengajuanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const path = typeof body?.proposal_path === 'string' ? body.proposal_path : '';
  if (!cocokProposal(r.profil.user_id, path)) {
    return NextResponse.json({ error: 'Berkas proposal tidak valid. Silakan unggah ulang.' }, { status: 400 });
  }
  if (await pathDipakai(path)) {
    return NextResponse.json({ error: 'Berkas proposal ini sudah dipakai pengajuan lain.' }, { status: 409 });
  }
  const salah = await periksaPdf(path);
  if (salah) return NextResponse.json({ error: salah }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from('pengajuan')
    .insert({ dosen_id: r.profil.user_id, ...parsed.data, proposal_path: path, status: 'diajukan' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: 'Gagal menyimpan pengajuan.' }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 7: Buat `src/app/api/dosen/pengajuan/[id]/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireDosen } from '@/lib/auth';
import { pengajuanSchema } from '@/lib/validation';
import { cocokProposal, hapusFile, pathDipakai, periksaPdf } from '@/lib/pengajuan-server';
import type { Pengajuan } from '@/lib/pengajuan-shared';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

async function milik(id: string, dosenId: string): Promise<Pengajuan | null> {
  const { data } = await supabaseAdmin()
    .from('pengajuan')
    .select('*')
    .eq('id', id)
    .eq('dosen_id', dosenId)
    .maybeSingle();
  return (data as Pengajuan | null) ?? null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  const { id } = await ctx.params;
  const p = await milik(id, r.profil.user_id);
  if (!p) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  return NextResponse.json(p);
}

// Perbaikan saat status 'revisi' → kembali 'diajukan'. proposal_path opsional (kosong = proposal lama dipakai).
export async function PUT(req: Request, ctx: Ctx) {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  const { id } = await ctx.params;
  const uid = r.profil.user_id;
  const lama = await milik(id, uid);
  if (!lama) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  if (lama.status !== 'revisi') {
    return NextResponse.json(
      { error: 'Pengajuan hanya dapat diubah saat berstatus Perlu Revisi.' },
      { status: 409 },
    );
  }
  const body = await req.json().catch(() => null);
  const parsed = pengajuanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const dikirim = typeof body?.proposal_path === 'string' ? body.proposal_path : '';
  const ganti = dikirim !== '' && dikirim !== lama.proposal_path;
  if (ganti) {
    if (!cocokProposal(uid, dikirim)) {
      return NextResponse.json({ error: 'Berkas proposal tidak valid. Silakan unggah ulang.' }, { status: 400 });
    }
    if (await pathDipakai(dikirim)) {
      return NextResponse.json({ error: 'Berkas proposal ini sudah dipakai pengajuan lain.' }, { status: 409 });
    }
    const salah = await periksaPdf(dikirim);
    if (salah) return NextResponse.json({ error: salah }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from('pengajuan')
    .update({
      ...parsed.data,
      ...(ganti ? { proposal_path: dikirim } : {}),
      status: 'diajukan',
      catatan: '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'revisi')
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Gagal menyimpan perbaikan.' }, { status: 500 });
  if (!data) {
    return NextResponse.json({ error: 'Status pengajuan sudah berubah. Muat ulang halaman.' }, { status: 409 });
  }
  if (ganti) await hapusFile(lama.proposal_path);
  return NextResponse.json(data);
}
```

- [ ] **Step 8: Buat `src/app/api/dosen/pengajuan/[id]/file/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireDosen } from '@/lib/auth';
import { urlUnduh } from '@/lib/pengajuan-server';
import { KOLOM_FILE, type FileJenis } from '@/lib/pengajuan-shared';

export const dynamic = 'force-dynamic';
const JENIS: FileJenis[] = ['proposal', 'surat_tugas', 'sk'];

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  const { id } = await ctx.params;
  const jenis = new URL(req.url).searchParams.get('jenis') as FileJenis;
  if (!JENIS.includes(jenis)) return NextResponse.json({ error: 'Jenis berkas tidak valid.' }, { status: 400 });
  const { data } = await supabaseAdmin()
    .from('pengajuan')
    .select('proposal_path,surat_tugas_path,sk_path')
    .eq('id', id)
    .eq('dosen_id', r.profil.user_id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  const path = (data as Record<string, string | null>)[KOLOM_FILE[jenis]];
  if (!path) return NextResponse.json({ error: 'Berkas belum tersedia.' }, { status: 404 });
  const url = await urlUnduh(path);
  if (!url) return NextResponse.json({ error: 'Gagal menyiapkan unduhan.' }, { status: 500 });
  return NextResponse.redirect(url, 302);
}
```

- [ ] **Step 9: Buat `src/components/dosen/PengajuanForm.tsx`:**

```tsx
'use client';

import { useState } from 'react';
import { Alert, btnPrimary, cardCls, inputCls, labelCls } from '@/components/admin/ui';
import { SKEMA, type Jenis, type Pengajuan } from '@/lib/pengajuan-shared';
import { unggahPdf } from '@/lib/unggah-client';

const fileCls =
  'block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-700 hover:file:bg-navy-100 file:cursor-pointer';
const FIELD = ['jenis', 'skema', 'tahun', 'judul', 'anggota', 'sumber_dana', 'ringkasan'] as const;

export default function PengajuanForm({
  awal,
  url,
  method,
  labelKirim,
  fileWajib,
  onSelesai,
}: {
  awal?: Pengajuan;
  url: string;
  method: 'POST' | 'PUT';
  labelKirim: string;
  fileWajib: boolean;
  onSelesai: (p: Pengajuan) => void;
}) {
  const [jenis, setJenis] = useState<Jenis>(awal?.jenis ?? 'penelitian');
  const [skema, setSkema] = useState<string>(awal?.skema ?? SKEMA.penelitian[0]);
  const [error, setError] = useState('');
  const [tahap, setTahap] = useState<'' | 'unggah' | 'simpan'>('');

  function gantiJenis(j: Jenis) {
    setJenis(j);
    setSkema(SKEMA[j][0]);
  }

  async function kirim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    for (const k of FIELD) data[k] = fd.get(k) ?? '';
    const file = fd.get('proposal');
    try {
      if (file instanceof File && file.size > 0) {
        setTahap('unggah');
        data.proposal_path = await unggahPdf('/api/dosen/unggah', {}, file);
      } else if (fileWajib) {
        setError('File proposal (PDF) wajib diunggah.');
        return;
      }
      setTahap('simpan');
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Gagal mengirim pengajuan.');
      onSelesai(json as Pengajuan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pengajuan.');
    } finally {
      setTahap('');
    }
  }

  return (
    <form onSubmit={kirim} className={`${cardCls} p-6 space-y-4`}>
      {error && <Alert kind="error">{error}</Alert>}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="jenis" className={labelCls}>Jenis Kegiatan</label>
          <select id="jenis" name="jenis" value={jenis} onChange={(e) => gantiJenis(e.target.value as Jenis)} className={inputCls}>
            <option value="penelitian">Penelitian</option>
            <option value="pkm">Pengabdian kepada Masyarakat</option>
          </select>
        </div>
        <div>
          <label htmlFor="skema" className={labelCls}>Skema</label>
          <select id="skema" name="skema" value={skema} onChange={(e) => setSkema(e.target.value)} className={inputCls}>
            {SKEMA[jenis].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tahun" className={labelCls}>Tahun</label>
          <input id="tahun" name="tahun" type="number" min={2000} max={2100} required defaultValue={awal?.tahun ?? new Date().getFullYear()} className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="judul" className={labelCls}>Judul</label>
        <input id="judul" name="judul" required minLength={10} defaultValue={awal?.judul ?? ''} className={inputCls} />
      </div>
      <div>
        <label htmlFor="anggota" className={labelCls}>
          Anggota Tim <span className="font-normal text-gray-400">(pisahkan dengan koma; dosen & mahasiswa)</span>
        </label>
        <textarea id="anggota" name="anggota" rows={2} defaultValue={awal?.anggota ?? ''} className={inputCls} />
      </div>
      <div>
        <label htmlFor="sumber_dana" className={labelCls}>Sumber Dana</label>
        <input id="sumber_dana" name="sumber_dana" defaultValue={awal?.sumber_dana ?? ''} placeholder="mis. Hibah Internal UnivSM / Mandiri" className={inputCls} />
      </div>
      <div>
        <label htmlFor="ringkasan" className={labelCls}>Ringkasan</label>
        <textarea id="ringkasan" name="ringkasan" rows={4} defaultValue={awal?.ringkasan ?? ''} className={inputCls} />
      </div>
      <div>
        <label htmlFor="proposal" className={labelCls}>
          File Proposal (PDF, maks 10 MB)
          {!fileWajib && <span className="font-normal text-gray-400"> — kosongkan bila tidak diganti</span>}
        </label>
        <input id="proposal" name="proposal" type="file" accept="application/pdf,.pdf" required={fileWajib} className={fileCls} />
      </div>
      <button type="submit" disabled={tahap !== ''} className={btnPrimary}>
        {tahap === 'unggah' ? 'Mengunggah proposal…' : tahap === 'simpan' ? 'Menyimpan…' : labelKirim}
      </button>
    </form>
  );
}
```

- [ ] **Step 10: Ganti isi `src/app/dosen/(portal)/page.tsx`:**

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader, Alert, TableEmptyRow, cardCls, btnPrimary, theadCls, thCls, tdCls } from '@/components/admin/ui';
import { DocIcon, PlusIcon } from '@/components/admin/icons';
import { JENIS_LABEL, STATUS_BADGE, STATUS_LABEL, type Pengajuan } from '@/lib/pengajuan-shared';

export default function PengajuanSayaPage() {
  const [rows, setRows] = useState<Pengajuan[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dosen/pengajuan', { cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json.error || 'Gagal memuat pengajuan.');
        return json as Pengajuan[];
      })
      .then(setRows)
      .catch((e: Error) => {
        setError(e.message);
        setRows([]);
      });
  }, []);

  return (
    <div>
      <PageHeader
        icon={<DocIcon className="w-6 h-6" />}
        title="Pengajuan Saya"
        subtitle="Pantau status pengajuan penelitian dan PkM Anda."
        action={
          <Link href="/dosen/ajukan" className={btnPrimary}>
            <PlusIcon className="w-4 h-4" /> Ajukan Baru
          </Link>
        }
      />
      {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={theadCls}>
              <th className={thCls}>Judul</th>
              <th className={thCls}>Jenis</th>
              <th className={thCls}>Tahun</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Diajukan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows === null && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Memuat…</td></tr>
            )}
            {rows?.length === 0 && !error && (
              <TableEmptyRow colSpan={5} icon={<DocIcon className="w-6 h-6" />} text="Belum ada pengajuan. Klik “Ajukan Baru” untuk memulai." />
            )}
            {rows?.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className={tdCls}>
                  <Link href={`/dosen/pengajuan/${p.id}`} className="font-medium text-navy-700 hover:underline">{p.judul}</Link>
                </td>
                <td className={tdCls}>{JENIS_LABEL[p.jenis]}</td>
                <td className={`${tdCls} tabular-nums`}>{p.tahun}</td>
                <td className={tdCls}>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                </td>
                <td className={tdCls}>{new Date(p.created_at).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Buat `src/app/dosen/(portal)/ajukan/page.tsx`:**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import PengajuanForm from '@/components/dosen/PengajuanForm';
import { PageHeader } from '@/components/admin/ui';
import { PlusIcon } from '@/components/admin/icons';

export default function AjukanPage() {
  const router = useRouter();
  return (
    <div className="max-w-3xl">
      <PageHeader
        icon={<PlusIcon className="w-6 h-6" />}
        title="Ajukan Penelitian / PkM"
        subtitle="Lengkapi data kegiatan dan unggah proposal dalam format PDF."
      />
      <PengajuanForm
        url="/api/dosen/pengajuan"
        method="POST"
        labelKirim="Kirim Pengajuan"
        fileWajib
        onSelesai={(p) => router.push(`/dosen/pengajuan/${p.id}`)}
      />
    </div>
  );
}
```

- [ ] **Step 12: Buat `src/app/dosen/(portal)/pengajuan/[id]/page.tsx`:**

```tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import PengajuanForm from '@/components/dosen/PengajuanForm';
import { Alert, btnGhost, cardCls } from '@/components/admin/ui';
import { DownloadIcon } from '@/components/admin/icons';
import {
  FILE_LABEL,
  JENIS_LABEL,
  STATUS_BADGE,
  STATUS_LABEL,
  type FileJenis,
  type Pengajuan,
} from '@/lib/pengajuan-shared';

export default function DetailPengajuanPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Pengajuan | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/dosen/pengajuan/${id}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || 'Pengajuan tidak ditemukan.');
      return;
    }
    setP(json as Pengajuan);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="max-w-3xl">
        <Alert kind="error">{error}</Alert>
        <Link href="/dosen" className="inline-block mt-4 text-sm text-navy-700 hover:underline">← Pengajuan Saya</Link>
      </div>
    );
  }
  if (!p) return <p className="text-sm text-gray-400">Memuat…</p>;

  const berkas: FileJenis[] = [
    'proposal',
    ...(p.surat_tugas_path ? (['surat_tugas'] as const) : []),
    ...(p.sk_path ? (['sk'] as const) : []),
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/dosen" className="text-sm text-navy-700 hover:underline">← Pengajuan Saya</Link>

      <div className={`${cardCls} p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              {JENIS_LABEL[p.jenis]} · {p.skema} · {p.tahun}
            </p>
            <h1 className="text-xl font-bold text-navy-800 mt-1">{p.judul}</h1>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-400">Anggota Tim</dt>
            <dd className="text-gray-800">{p.anggota || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Sumber Dana</dt>
            <dd className="text-gray-800">{p.sumber_dana || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-400">Ringkasan</dt>
            <dd className="text-gray-800 whitespace-pre-wrap">{p.ringkasan || '—'}</dd>
          </div>
        </dl>
      </div>

      {p.catatan && (p.status === 'revisi' || p.status === 'ditolak') && (
        <Alert kind="error">Catatan LPPM: {p.catatan}</Alert>
      )}
      {p.status === 'terbit' && (
        <Alert kind="success">Surat Tugas dan SK telah terbit. Silakan unduh di bawah.</Alert>
      )}

      <div className={`${cardCls} p-6`}>
        <h2 className="font-bold text-navy-800 mb-3">Berkas</h2>
        <div className="flex flex-wrap gap-2">
          {berkas.map((j) => (
            <a key={j} href={`/api/dosen/pengajuan/${p.id}/file?jenis=${j}`} target="_blank" rel="noopener noreferrer" className={btnGhost}>
              <DownloadIcon className="w-4 h-4" /> {FILE_LABEL[j]}
            </a>
          ))}
        </div>
      </div>

      {p.status === 'revisi' && (
        <div>
          <h2 className="font-bold text-navy-800 mb-3">Perbaiki & Kirim Ulang</h2>
          <PengajuanForm
            awal={p}
            url={`/api/dosen/pengajuan/${p.id}`}
            method="PUT"
            labelKirim="Kirim Ulang"
            fileWajib={false}
            onSelesai={(baru) => setP(baru)}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 13: Siapkan berkas uji.** `npm run typecheck` → exit 0. Lalu:

```bash
mkdir -p .superpowers/uji
node -e "
const fs=require('fs');
fs.writeFileSync('.superpowers/uji/uji.pdf','%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
fs.writeFileSync('.superpowers/uji/uji2.pdf','%PDF-1.4\n% versi revisi\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
fs.writeFileSync('.superpowers/uji/palsu.pdf','ini bukan pdf sungguhan');
const b=Buffer.alloc(11*1024*1024,32); b.write('%PDF-1.4'); fs.writeFileSync('.superpowers/uji/besar.pdf',b);
console.log('berkas uji siap');
"
```

- [ ] **Step 14: Verifikasi alur utama & tolakan file.** Dev server jalan. Buat helper `jid` untuk membaca `.id` dari respons tersimpan:

```bash
A=$(node scripts/uji.mjs cookie A)
jid() { node -e "console.log(JSON.parse(require('fs').readFileSync('$1','utf8')).id||'')"; }
BODY='"jenis":"penelitian","judul":"Uji Pengajuan Penelitian Dosen A","skema":"Penelitian Mandiri","tahun":2026,"anggota":"Mahasiswa Uji","sumber_dana":"Mandiri","ringkasan":"Ringkasan uji"'

P1=$(node scripts/uji.mjs unggah "$A" .superpowers/uji/uji.pdf /api/dosen/unggah); echo "P1=$P1"
curl -s -o .superpowers/uji/aj1.json -w "ajukan: %{http_code}\n" -X POST -H "Cookie: $A" -H "Content-Type: application/json" -d "{$BODY,\"proposal_path\":\"$P1\"}" http://localhost:3000/api/dosen/pengajuan
ID=$(jid .superpowers/uji/aj1.json); echo "ID=$ID"; echo "$ID" > .superpowers/uji/id-A.txt

PF=$(node scripts/uji.mjs unggah "$A" .superpowers/uji/palsu.pdf /api/dosen/unggah)
curl -s -w " ← PDF palsu (%{http_code})\n" -X POST -H "Cookie: $A" -H "Content-Type: application/json" -d "{$BODY,\"proposal_path\":\"$PF\"}" http://localhost:3000/api/dosen/pengajuan
node scripts/uji.mjs berkas "$ID"

node scripts/uji.mjs unggah "$A" .superpowers/uji/besar.pdf /api/dosen/unggah

P0=$(node scripts/uji.mjs unggah "$A" .superpowers/uji/uji.pdf /api/dosen/unggah)
curl -s -w " ← skema salah (%{http_code})\n" -X POST -H "Cookie: $A" -H "Content-Type: application/json" -d "{\"jenis\":\"pkm\",\"judul\":\"Uji Skema Tidak Cocok\",\"skema\":\"Penelitian Mandiri\",\"tahun\":2026,\"proposal_path\":\"$P0\"}" http://localhost:3000/api/dosen/pengajuan
curl -s -w " ← path dipakai ulang (%{http_code})\n" -X POST -H "Cookie: $A" -H "Content-Type: application/json" -d "{$BODY,\"proposal_path\":\"$P1\"}" http://localhost:3000/api/dosen/pengajuan
curl -s -o /dev/null -w "unduh proposal: %{http_code} -> %{redirect_url}\n" -H "Cookie: $A" "http://localhost:3000/api/dosen/pengajuan/$ID/file?jenis=proposal"
curl -s -H "Cookie: $A" http://localhost:3000/api/dosen/pengajuan | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log('jumlah pengajuan A:',JSON.parse(d).length))"
```
Expected: `ajukan: 201`; `ID=` sebuah uuid; PDF palsu → `{"error":"File harus berformat PDF."} ← PDF palsu (400)` *(Review Focus #2)*; `berkas` → `"proposal"` hanya memuat file `P1` dan `P0` belum dibuat (file palsu sudah terhapus — nama berkas `PF` tidak muncul); besar → `GAGAL-UNGGAH ...` (ditolak batas 10 MB bucket); skema salah → `...Skema tidak sesuai dengan jenis kegiatan. ← (400)`; path dipakai ulang → `(409)`; unduh → `302 -> https://...supabase.co/storage/v1/object/sign/pengajuan/...`; `jumlah pengajuan A: 1`.

- [ ] **Step 15: Verifikasi isolasi antar dosen.** Daftarkan & aktifkan dosen B:

```bash
node scripts/uji.mjs daftar B
ADMIN_COOKIE=$(node scripts/uji.mjs cookie-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
ID_B=$(curl -s -H "Cookie: $ADMIN_COOKIE" "http://localhost:3000/api/admin/dosen?status=menunggu" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log((JSON.parse(d).find(x=>x.email==='uji.dosen.b@example.com')||{}).user_id))")
curl -s -o /dev/null -w "aktifkan B: %{http_code}\n" -X PATCH -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d '{"status":"aktif"}' http://localhost:3000/api/admin/dosen/$ID_B
B=$(node scripts/uji.mjs cookie B)
curl -s -w " ← B pakai berkas A (%{http_code})\n" -X POST -H "Cookie: $B" -H "Content-Type: application/json" -d "{$BODY,\"proposal_path\":\"$P1\"}" http://localhost:3000/api/dosen/pengajuan
curl -s -w " ← B lihat pengajuan A (%{http_code})\n" -H "Cookie: $B" http://localhost:3000/api/dosen/pengajuan/$ID
curl -s -o /dev/null -w "B unduh berkas A: %{http_code}\n" -H "Cookie: $B" "http://localhost:3000/api/dosen/pengajuan/$ID/file?jenis=proposal"
```
Expected: `aktifkan B: 200`; B pakai berkas A → `...Berkas proposal tidak valid... (400)`; B lihat pengajuan A → `...Pengajuan tidak ditemukan. (404)`; B unduh → `404`.

- [ ] **Step 16: Verifikasi revisi & penonaktifan akun.**

```bash
curl -s -w " ← PUT saat diajukan (%{http_code})\n" -X PUT -H "Cookie: $A" -H "Content-Type: application/json" -d "{$BODY}" http://localhost:3000/api/dosen/pengajuan/$ID
node scripts/uji.mjs set-status "$ID" revisi
curl -s -o /dev/null -w "PUT revisi tanpa file baru: %{http_code}\n" -X PUT -H "Cookie: $A" -H "Content-Type: application/json" -d "{$BODY}" http://localhost:3000/api/dosen/pengajuan/$ID
node scripts/uji.mjs berkas "$ID"
curl -s -o /dev/null -w "unduh proposal lama: %{http_code}\n" -H "Cookie: $A" "http://localhost:3000/api/dosen/pengajuan/$ID/file?jenis=proposal"
node scripts/uji.mjs set-status "$ID" revisi
P3=$(node scripts/uji.mjs unggah "$A" .superpowers/uji/uji2.pdf /api/dosen/unggah); echo "P3=$P3"
curl -s -o /dev/null -w "PUT revisi dengan file baru: %{http_code}\n" -X PUT -H "Cookie: $A" -H "Content-Type: application/json" -d "{$BODY,\"proposal_path\":\"$P3\"}" http://localhost:3000/api/dosen/pengajuan/$ID
node scripts/uji.mjs berkas "$ID"

ID_A=$(cat .superpowers/uji-id-A.txt)
curl -s -o /dev/null -w "nonaktifkan A: %{http_code}\n" -X PATCH -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d '{"status":"ditolak"}' http://localhost:3000/api/admin/dosen/$ID_A
curl -s -w " ← A setelah dinonaktifkan (%{http_code})\n" -H "Cookie: $A" http://localhost:3000/api/dosen/pengajuan
curl -s -o /dev/null -w "aktifkan lagi A: %{http_code}\n" -X PATCH -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d '{"status":"aktif"}' http://localhost:3000/api/admin/dosen/$ID_A
curl -s -o /dev/null -w "A setelah diaktifkan: %{http_code}\n" -H "Cookie: $A" http://localhost:3000/api/dosen/pengajuan
```
Expected: PUT saat diajukan → `...hanya dapat diubah saat berstatus Perlu Revisi. (409)`; `PUT revisi tanpa file baru: 200`; `berkas` pertama → `proposal` masih memuat file P1 (dan file P0 sisa uji skema); `unduh proposal lama: 302` *(Review Focus #5)*; `PUT revisi dengan file baru: 200`; `berkas` kedua → file P1 **sudah tidak ada**, file P3 ada; `nonaktifkan A: 200`; A setelah dinonaktifkan → `...Akun dosen Anda belum aktif. (403)` *(Review Focus #4)*; aktifkan lagi → `200`; `A setelah diaktifkan: 200`. Pengajuan `$ID` kini berstatus `diajukan` (dipakai Task 6).

- [ ] **Step 17: Verifikasi browser** (login dosen uji A):
  1. `/dosen` → tabel menampilkan 1 pengajuan berstatus **Diajukan**; judul bisa diklik.
  2. `/dosen/ajukan` → ganti Jenis ke **PkM**: pilihan Skema berubah ke 4 skema PkM.
  3. Detail pengajuan → data tampil, tombol **Proposal** membuka PDF di tab baru.
  4. (Opsional, bila alat browser mendukung pemilihan file) kirim pengajuan baru lewat form dengan `.superpowers/uji/uji.pdf` → teks tombol berubah "Mengunggah proposal…" lalu diarahkan ke halaman detail. Bila tidak dapat diotomasi, catat di laporan; jalur API sudah teruji di Step 14.

- [ ] **Step 18: Commit.**

```bash
git add src/lib/pengajuan-shared.ts src/lib/pengajuan-server.ts src/lib/unggah-client.ts src/lib/validation.ts src/app/api/dosen src/components/dosen/PengajuanForm.tsx "src/app/dosen/(portal)"
git commit -m "feat(dosen): pengajuan penelitian/PkM dengan unggah langsung ke Storage, revisi, unduh

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Verifikasi pengajuan & penerbitan Surat Tugas / SK (panel admin)

**Files:**
- Create: `src/app/api/admin/pengajuan/route.ts`, `src/app/api/admin/pengajuan/[id]/route.ts`, `src/app/api/admin/pengajuan/[id]/keputusan/route.ts`, `src/app/api/admin/pengajuan/[id]/unggah/route.ts`, `src/app/api/admin/pengajuan/[id]/surat/route.ts`, `src/app/api/admin/pengajuan/[id]/file/route.ts`, `src/components/admin/PengajuanAksi.tsx`, `src/app/admin/(panel)/pengajuan/page.tsx`, `src/app/admin/(panel)/pengajuan/[id]/page.tsx`
- Modify: `src/lib/validation.ts` (append), `src/components/admin/icons.tsx` (tambah `InboxIcon`)

**Interfaces:**
- Consumes: `requireAdmin` (Task 2); dari Task 5: `Pengajuan`, `StatusPengajuan`, `KOLOM_FILE`, `FILE_LABEL`, `JENIS_LABEL`, `STATUS_LABEL`, `STATUS_BADGE`, `pathSuratBaru`, `cocokSurat`, `tokenUnggah`, `periksaPdf`, `hapusFile`, `urlUnduh`, `unggahPdf`; primitif `ui.tsx`.
- Produces:
  - `GET /api/admin/pengajuan?status=&jenis=` → `Array<Pengajuan-ringkas & { profil: { nama, prodi } | null }>`
  - `GET /api/admin/pengajuan/[id]` → `Pengajuan & { profil: { nama, email, nidn, prodi, no_hp } | null }`
  - `POST /api/admin/pengajuan/[id]/keputusan` `{ aksi, catatan }` → `{ ok, status }` | 400 | 404 | 409
  - `POST /api/admin/pengajuan/[id]/unggah` `{ jenis }` → `{ path, token }` | 409
  - `POST /api/admin/pengajuan/[id]/surat` `{ jenis, path }` → `{ ok, status }`
  - `GET /api/admin/pengajuan/[id]/file?jenis=` → 302
  - `InboxIcon` (dipakai Task 7)

- [ ] **Step 1: Append ke `src/lib/validation.ts`:**

```ts
export const keputusanSchema = z
  .object({
    aksi: z.enum(['setujui', 'revisi', 'tolak'], { errorMap: () => ({ message: 'Aksi tidak valid.' }) }),
    catatan: z.string().trim().default(''),
  })
  .refine((d) => d.aksi === 'setujui' || d.catatan.length >= 5, {
    message: 'Catatan wajib diisi (minimal 5 karakter) untuk revisi atau penolakan.',
    path: ['catatan'],
  });

const jenisSurat = z.enum(['surat_tugas', 'sk'], { errorMap: () => ({ message: 'Jenis surat tidak valid.' }) });
export const jenisSuratSchema = z.object({ jenis: jenisSurat });
export const suratSchema = z.object({
  jenis: jenisSurat,
  path: z.string().min(1, 'Berkas surat belum diunggah.'),
});
```

- [ ] **Step 2: Tambahkan ke `src/components/admin/icons.tsx`** (sebelum `export function MenuIcon`):

```tsx
export function InboxIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </Svg>
  );
}
```

- [ ] **Step 3: Buat `src/app/api/admin/pengajuan/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const url = new URL(req.url);
  let q = supabaseAdmin()
    .from('pengajuan')
    .select('id,jenis,judul,skema,tahun,status,created_at,profil(nama,prodi)')
    .order('created_at', { ascending: false });
  const status = url.searchParams.get('status');
  if (status) q = q.eq('status', status);
  const jenis = url.searchParams.get('jenis');
  if (jenis) q = q.eq('jenis', jenis);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: 'Gagal mengambil pengajuan.' }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 4: Buat `src/app/api/admin/pengajuan/[id]/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const { data, error } = await supabaseAdmin()
    .from('pengajuan')
    .select('*, profil(nama,email,nidn,prodi,no_hp)')
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Gagal mengambil pengajuan.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  return NextResponse.json(data);
}
```

- [ ] **Step 5: Buat `src/app/api/admin/pengajuan/[id]/keputusan/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { keputusanSchema } from '@/lib/validation';
import type { Pengajuan, StatusPengajuan } from '@/lib/pengajuan-shared';

const HASIL: Record<'setujui' | 'revisi' | 'tolak', StatusPengajuan> = {
  setujui: 'disetujui',
  revisi: 'revisi',
  tolak: 'ditolak',
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = keputusanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const { aksi, catatan } = parsed.data;
  const statusBaru = HASIL[aksi];
  const db = supabaseAdmin();

  // Update bersyarat: hanya dari 'diajukan'. Permintaan ganda/bersamaan → hanya satu yang berhasil.
  const { data: aj, error } = await db
    .from('pengajuan')
    .update({ status: statusBaru, catatan, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'diajukan')
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Gagal menyimpan keputusan.' }, { status: 500 });
  if (!aj) {
    const { data: ada } = await db.from('pengajuan').select('id').eq('id', id).maybeSingle();
    return ada
      ? NextResponse.json({ error: 'Pengajuan ini sudah diputuskan sebelumnya.' }, { status: 409 })
      : NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  }

  if (aksi === 'setujui') {
    const p = aj as Pengajuan;
    const { data: prof } = await db.from('profil').select('nama').eq('user_id', p.dosen_id).single();
    const { data: pub, error: pubErr } = await db
      .from(p.jenis)
      .insert({
        judul: p.judul,
        ketua: prof?.nama ?? '',
        anggota: p.anggota,
        skema: p.skema,
        tahun: p.tahun,
        sumber_dana: p.sumber_dana,
        status: 'aktif',
      })
      .select('id')
      .single();
    if (pubErr || !pub) {
      await db.from('pengajuan').update({ status: 'diajukan', catatan: '' }).eq('id', id);
      return NextResponse.json(
        { error: 'Gagal mencatat ke daftar publik. Keputusan dibatalkan, silakan coba lagi.' },
        { status: 500 },
      );
    }
    await db.from('pengajuan').update({ publik_id: pub.id }).eq('id', id);
  }
  return NextResponse.json({ ok: true, status: statusBaru });
}
```

- [ ] **Step 6: Buat `src/app/api/admin/pengajuan/[id]/unggah/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { jenisSuratSchema } from '@/lib/validation';
import { pathSuratBaru, tokenUnggah } from '@/lib/pengajuan-server';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = jenisSuratSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const { data: aj } = await supabaseAdmin().from('pengajuan').select('dosen_id,status').eq('id', id).maybeSingle();
  if (!aj) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  if (aj.status !== 'disetujui' && aj.status !== 'terbit') {
    return NextResponse.json({ error: 'Surat hanya dapat diunggah setelah pengajuan disetujui.' }, { status: 409 });
  }
  try {
    return NextResponse.json(await tokenUnggah(pathSuratBaru(aj.dosen_id, id, parsed.data.jenis)));
  } catch {
    return NextResponse.json({ error: 'Gagal menyiapkan unggahan.' }, { status: 500 });
  }
}
```

- [ ] **Step 7: Buat `src/app/api/admin/pengajuan/[id]/surat/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { suratSchema } from '@/lib/validation';
import { cocokSurat, hapusFile, periksaPdf } from '@/lib/pengajuan-server';
import { KOLOM_FILE, type Pengajuan } from '@/lib/pengajuan-shared';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = suratSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const { jenis, path } = parsed.data;
  const db = supabaseAdmin();
  const { data } = await db.from('pengajuan').select('*').eq('id', id).maybeSingle();
  const aj = data as Pengajuan | null;
  if (!aj) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  if (aj.status !== 'disetujui' && aj.status !== 'terbit') {
    return NextResponse.json({ error: 'Surat hanya dapat diunggah setelah pengajuan disetujui.' }, { status: 409 });
  }
  if (!cocokSurat(aj.dosen_id, id, jenis, path)) {
    return NextResponse.json({ error: 'Berkas surat tidak valid. Silakan unggah ulang.' }, { status: 400 });
  }
  const salah = await periksaPdf(path);
  if (salah) return NextResponse.json({ error: salah }, { status: 400 });

  const kolom = KOLOM_FILE[jenis];
  const lama = aj[kolom];
  const st = jenis === 'surat_tugas' ? path : aj.surat_tugas_path;
  const sk = jenis === 'sk' ? path : aj.sk_path;
  const statusBaru = st && sk ? 'terbit' : aj.status;

  const { data: hasil, error } = await db
    .from('pengajuan')
    .update({ [kolom]: path, status: statusBaru, updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['disetujui', 'terbit'])
    .select('status')
    .maybeSingle();
  if (error || !hasil) {
    await hapusFile(path);
    return error
      ? NextResponse.json({ error: 'Gagal menyimpan surat.' }, { status: 500 })
      : NextResponse.json({ error: 'Status pengajuan sudah berubah. Muat ulang halaman.' }, { status: 409 });
  }
  if (lama && lama !== path) await hapusFile(lama);
  return NextResponse.json({ ok: true, status: hasil.status });
}
```

- [ ] **Step 8: Buat `src/app/api/admin/pengajuan/[id]/file/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { urlUnduh } from '@/lib/pengajuan-server';
import { KOLOM_FILE, type FileJenis } from '@/lib/pengajuan-shared';

export const dynamic = 'force-dynamic';
const JENIS: FileJenis[] = ['proposal', 'surat_tugas', 'sk'];

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const jenis = new URL(req.url).searchParams.get('jenis') as FileJenis;
  if (!JENIS.includes(jenis)) return NextResponse.json({ error: 'Jenis berkas tidak valid.' }, { status: 400 });
  const { data } = await supabaseAdmin()
    .from('pengajuan')
    .select('proposal_path,surat_tugas_path,sk_path')
    .eq('id', id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  const path = (data as Record<string, string | null>)[KOLOM_FILE[jenis]];
  if (!path) return NextResponse.json({ error: 'Berkas belum tersedia.' }, { status: 404 });
  const url = await urlUnduh(path);
  if (!url) return NextResponse.json({ error: 'Gagal menyiapkan unduhan.' }, { status: 500 });
  return NextResponse.redirect(url, 302);
}
```

- [ ] **Step 9: Buat `src/components/admin/PengajuanAksi.tsx`:**

```tsx
'use client';

import { useState } from 'react';
import { Alert, btnDangerOutline, btnGhost, btnPrimary, btnSuccess, cardCls, inputCls, labelCls } from './ui';
import { CheckIcon, DownloadIcon, EditIcon, UploadIcon } from './icons';
import { FILE_LABEL, type Pengajuan } from '@/lib/pengajuan-shared';
import { unggahPdf } from '@/lib/unggah-client';

const fileCls =
  'block text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-700 hover:file:bg-navy-100 file:cursor-pointer';

const TANYA = {
  setujui: 'Setujui pengajuan ini? Kegiatan akan otomatis tercatat di daftar publik.',
  revisi: 'Kembalikan pengajuan ini ke dosen untuk revisi?',
  tolak: 'Tolak pengajuan ini? Keputusan ini final.',
} as const;

export function PanelKeputusan({ id, onSelesai }: { id: string; onSelesai: () => void }) {
  const [catatan, setCatatan] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function putuskan(aksi: keyof typeof TANYA) {
    if (aksi !== 'setujui' && catatan.trim().length < 5) {
      setError('Tulis catatan (minimal 5 karakter) untuk revisi atau penolakan.');
      return;
    }
    if (!confirm(TANYA[aksi])) return;
    setBusy(true);
    setError('');
    const res = await fetch(`/api/admin/pengajuan/${id}/keputusan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aksi, catatan }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error || 'Gagal menyimpan keputusan.');
      return;
    }
    onSelesai();
  }

  return (
    <div className={`${cardCls} p-6 space-y-4`}>
      <h2 className="font-bold text-navy-800">Keputusan LPPM</h2>
      {error && <Alert kind="error">{error}</Alert>}
      <div>
        <label htmlFor="catatan" className={labelCls}>
          Catatan untuk dosen <span className="font-normal text-gray-400">(wajib untuk revisi/penolakan)</span>
        </label>
        <textarea id="catatan" rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inputCls} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => putuskan('setujui')} className={btnSuccess}>
          <CheckIcon className="w-4 h-4" /> Setujui
        </button>
        <button disabled={busy} onClick={() => putuskan('revisi')} className={btnGhost}>
          <EditIcon className="w-4 h-4" /> Minta Revisi
        </button>
        <button disabled={busy} onClick={() => putuskan('tolak')} className={btnDangerOutline}>
          Tolak
        </button>
      </div>
    </div>
  );
}

function BarisSurat({
  p,
  jenis,
  onSelesai,
}: {
  p: Pengajuan;
  jenis: 'surat_tugas' | 'sk';
  onSelesai: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [kunci, setKunci] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ada = jenis === 'surat_tugas' ? p.surat_tugas_path : p.sk_path;

  async function unggah() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const path = await unggahPdf(`/api/admin/pengajuan/${p.id}/unggah`, { jenis }, file);
      const res = await fetch(`/api/admin/pengajuan/${p.id}/surat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jenis, path }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan surat.');
      setFile(null);
      setKunci((k) => k + 1);
      onSelesai();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengunggah surat.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="font-medium text-gray-800">{FILE_LABEL[jenis]}</p>
        {ada ? (
          <a
            href={`/api/admin/pengajuan/${p.id}/file?jenis=${jenis}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-navy-700 hover:underline"
          >
            <DownloadIcon className="w-4 h-4" /> Lihat berkas saat ini
          </a>
        ) : (
          <span className="text-xs text-gray-400">Belum diunggah</span>
        )}
      </div>
      {error && <div className="mb-3"><Alert kind="error">{error}</Alert></div>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          key={kunci}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={fileCls}
        />
        <button disabled={!file || busy} onClick={unggah} className={btnPrimary}>
          <UploadIcon className="w-4 h-4" /> {busy ? 'Mengunggah…' : ada ? 'Ganti' : 'Unggah'}
        </button>
      </div>
    </div>
  );
}

export function PanelSurat({ p, onSelesai }: { p: Pengajuan; onSelesai: () => void }) {
  return (
    <div className={`${cardCls} p-6 space-y-4`}>
      <div>
        <h2 className="font-bold text-navy-800">Surat Tugas &amp; SK</h2>
        <p className="text-sm text-gray-500 mt-1">
          Unggah PDF yang sudah ditandatangani. Status menjadi “ST &amp; SK Terbit” setelah keduanya terunggah.
        </p>
      </div>
      <BarisSurat p={p} jenis="surat_tugas" onSelesai={onSelesai} />
      <BarisSurat p={p} jenis="sk" onSelesai={onSelesai} />
    </div>
  );
}
```

- [ ] **Step 10: Buat `src/app/admin/(panel)/pengajuan/page.tsx`:**

```tsx
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Alert, TableEmptyRow, cardCls, inputCls, theadCls, thCls, tdCls, rowEditBtn } from '@/components/admin/ui';
import { InboxIcon } from '@/components/admin/icons';
import {
  JENIS_LABEL,
  STATUS_BADGE,
  STATUS_LABEL,
  type Pengajuan,
  type StatusPengajuan,
} from '@/lib/pengajuan-shared';

type Baris = Pick<Pengajuan, 'id' | 'jenis' | 'judul' | 'skema' | 'tahun' | 'status' | 'created_at'> & {
  profil: { nama: string; prodi: string } | null;
};

const FILTER: { v: '' | StatusPengajuan; l: string }[] = [
  { v: '', l: 'Semua' },
  { v: 'diajukan', l: 'Diajukan' },
  { v: 'revisi', l: 'Revisi' },
  { v: 'disetujui', l: 'Disetujui' },
  { v: 'terbit', l: 'Terbit' },
  { v: 'ditolak', l: 'Ditolak' },
];

export default function PengajuanAdminPage() {
  const [status, setStatus] = useState<'' | StatusPengajuan>('');
  const [jenis, setJenis] = useState('');
  const [rows, setRows] = useState<Baris[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const q = new URLSearchParams();
    if (status) q.set('status', status);
    if (jenis) q.set('jenis', jenis);
    const res = await fetch(`/api/admin/pengajuan?${q}`, { cache: 'no-store' });
    if (!res.ok) {
      setError('Gagal memuat pengajuan.');
      setRows([]);
      return;
    }
    setRows(await res.json());
  }, [status, jenis]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-6xl">
      <PageHeader
        icon={<InboxIcon className="w-6 h-6" />}
        title="Pengajuan Dosen"
        subtitle="Verifikasi pengajuan penelitian & PkM serta terbitkan Surat Tugas dan SK."
      />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTER.map((f) => (
          <button
            key={f.v || 'semua'}
            onClick={() => setStatus(f.v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
              status === f.v ? 'bg-navy-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.l}
          </button>
        ))}
        <select value={jenis} onChange={(e) => setJenis(e.target.value)} className={`${inputCls} w-auto ml-auto`}>
          <option value="">Semua jenis</option>
          <option value="penelitian">Penelitian</option>
          <option value="pkm">PkM</option>
        </select>
      </div>
      {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={theadCls}>
              <th className={thCls}>Diajukan</th>
              <th className={thCls}>Dosen</th>
              <th className={thCls}>Judul</th>
              <th className={thCls}>Jenis</th>
              <th className={thCls}>Status</th>
              <th className={`${thCls} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && (
              <TableEmptyRow colSpan={6} icon={<InboxIcon className="w-6 h-6" />} text="Tidak ada pengajuan pada filter ini." />
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className={tdCls}>{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                <td className={tdCls}>
                  <p className="font-medium text-gray-800">{r.profil?.nama ?? '—'}</p>
                  <p className="text-xs text-gray-500">{r.profil?.prodi ?? ''}</p>
                </td>
                <td className={`${tdCls} max-w-sm`}>{r.judul}</td>
                <td className={tdCls}>{JENIS_LABEL[r.jenis]}</td>
                <td className={tdCls}>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                </td>
                <td className={`${tdCls} text-right`}>
                  <Link href={`/admin/pengajuan/${r.id}`} className={rowEditBtn}>Periksa</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Buat `src/app/admin/(panel)/pengajuan/[id]/page.tsx`:**

```tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Alert, btnGhost, cardCls } from '@/components/admin/ui';
import { DownloadIcon } from '@/components/admin/icons';
import { PanelKeputusan, PanelSurat } from '@/components/admin/PengajuanAksi';
import { JENIS_LABEL, STATUS_BADGE, STATUS_LABEL, type Pengajuan } from '@/lib/pengajuan-shared';

type Detail = Pengajuan & {
  profil: { nama: string; email: string; nidn: string; prodi: string; no_hp: string } | null;
};

export default function DetailPengajuanAdminPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/pengajuan/${id}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || 'Pengajuan tidak ditemukan.');
      return;
    }
    setP(json as Detail);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="max-w-4xl">
        <Alert kind="error">{error}</Alert>
        <Link href="/admin/pengajuan" className="inline-block mt-4 text-sm text-navy-700 hover:underline">← Daftar pengajuan</Link>
      </div>
    );
  }
  if (!p) return <p className="text-sm text-gray-400">Memuat…</p>;

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/pengajuan" className="text-sm text-navy-700 hover:underline">← Daftar pengajuan</Link>

      <div className={`${cardCls} p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              {JENIS_LABEL[p.jenis]} · {p.skema} · {p.tahun}
            </p>
            <h1 className="text-xl font-bold text-navy-800 mt-1">{p.judul}</h1>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-400">Pengusul</dt>
            <dd className="text-gray-800">{p.profil?.nama ?? '—'}</dd>
            <dd className="text-xs text-gray-500">
              NIDN/NIDK {p.profil?.nidn ?? '—'} · {p.profil?.prodi ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Kontak</dt>
            <dd className="text-gray-800">{p.profil?.email ?? '—'}</dd>
            <dd className="text-xs text-gray-500">{p.profil?.no_hp ?? ''}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Anggota Tim</dt>
            <dd className="text-gray-800">{p.anggota || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Sumber Dana</dt>
            <dd className="text-gray-800">{p.sumber_dana || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-400">Ringkasan</dt>
            <dd className="text-gray-800 whitespace-pre-wrap">{p.ringkasan || '—'}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href={`/api/admin/pengajuan/${p.id}/file?jenis=proposal`} target="_blank" rel="noopener noreferrer" className={btnGhost}>
            <DownloadIcon className="w-4 h-4" /> Unduh Proposal
          </a>
          {p.publik_id && (
            <Link href={`/admin/${p.jenis}`} className="text-sm text-emerald-700 hover:underline">
              Tercatat di daftar {JENIS_LABEL[p.jenis]} publik →
            </Link>
          )}
        </div>
      </div>

      {p.catatan && <Alert kind={p.status === 'ditolak' || p.status === 'revisi' ? 'error' : 'success'}>Catatan: {p.catatan}</Alert>}
      {p.status === 'diajukan' && <PanelKeputusan id={p.id} onSelesai={load} />}
      {(p.status === 'disetujui' || p.status === 'terbit') && <PanelSurat p={p} onSelesai={load} />}
    </div>
  );
}
```

- [ ] **Step 12: Verifikasi API.** `npm run typecheck` → exit 0. Dev server jalan:

```bash
ID=$(cat .superpowers/uji/id-A.txt)
A=$(node scripts/uji.mjs cookie A)
B=$(node scripts/uji.mjs cookie B)
ADMIN_COOKIE=$(node scripts/uji.mjs cookie-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
K=http://localhost:3000/api/admin/pengajuan

curl -s -o /dev/null -w "daftar pengajuan sbg dosen: %{http_code}\n" -H "Cookie: $A" $K
curl -s -o /dev/null -w "keputusan sbg dosen: %{http_code}\n" -X POST -H "Cookie: $A" -H "Content-Type: application/json" -d '{"aksi":"setujui"}' $K/$ID/keputusan
curl -s -H "Cookie: $ADMIN_COOKIE" "$K?status=diajukan" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log('ada di daftar diajukan:',JSON.parse(d).some(x=>x.id==='$ID')))"
curl -s -w " ← revisi tanpa catatan (%{http_code})\n" -X POST -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d '{"aksi":"revisi"}' $K/$ID/keputusan
curl -s -w " ← revisi (%{http_code})\n" -X POST -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d '{"aksi":"revisi","catatan":"Lengkapi metodologi penelitian."}' $K/$ID/keputusan
curl -s -H "Cookie: $A" http://localhost:3000/api/dosen/pengajuan/$ID | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('dosen lihat:',j.status,'|',j.catatan)})"
curl -s -o /dev/null -w "dosen kirim ulang: %{http_code}\n" -X PUT -H "Cookie: $A" -H "Content-Type: application/json" -d '{"jenis":"penelitian","judul":"Uji Pengajuan Penelitian Dosen A","skema":"Penelitian Mandiri","tahun":2026,"anggota":"Mahasiswa Uji","sumber_dana":"Mandiri","ringkasan":"Metodologi dilengkapi"}' http://localhost:3000/api/dosen/pengajuan/$ID

for i in 1 2; do curl -s -o /dev/null -w "setujui#$i: %{http_code}\n" -X POST -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d '{"aksi":"setujui"}' $K/$ID/keputusan & done; wait
curl -s http://localhost:3000/api/penelitian | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log('baris publik dgn judul uji:',JSON.parse(d).filter(x=>x.judul==='Uji Pengajuan Penelitian Dosen A').length))"
```
Expected: `403`; `403`; `ada di daftar diajukan: true`; revisi tanpa catatan → `...Catatan wajib diisi... (400)`; revisi → `{"ok":true,"status":"revisi"} (200)`; `dosen lihat: revisi | Lengkapi metodologi penelitian.`; `dosen kirim ulang: 200`; setujui ganda → satu `200`, satu `409` (urutan bebas); `baris publik dgn judul uji: 1` *(Review Focus #1)*.

- [ ] **Step 13: Verifikasi Surat Tugas & SK.**

```bash
U() { node scripts/uji.mjs unggah "$ADMIN_COOKIE" "$1" /api/admin/pengajuan/$ID/unggah "{\"jenis\":\"$2\"}"; }
PST=$(U .superpowers/uji/uji.pdf surat_tugas); echo "PST=$PST"
curl -s -w " ← simpan ST (%{http_code})\n" -X POST -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d "{\"jenis\":\"surat_tugas\",\"path\":\"$PST\"}" $K/$ID/surat
curl -s -w " ← ST dikirim sbg SK (%{http_code})\n" -X POST -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d "{\"jenis\":\"sk\",\"path\":\"$PST\"}" $K/$ID/surat
PF=$(U .superpowers/uji/palsu.pdf sk)
curl -s -w " ← SK palsu (%{http_code})\n" -X POST -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d "{\"jenis\":\"sk\",\"path\":\"$PF\"}" $K/$ID/surat
PSK=$(U .superpowers/uji/uji2.pdf sk)
curl -s -w " ← simpan SK (%{http_code})\n" -X POST -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d "{\"jenis\":\"sk\",\"path\":\"$PSK\"}" $K/$ID/surat
PST2=$(U .superpowers/uji/uji2.pdf surat_tugas)
curl -s -w " ← ganti ST (%{http_code})\n" -X POST -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d "{\"jenis\":\"surat_tugas\",\"path\":\"$PST2\"}" $K/$ID/surat
node scripts/uji.mjs berkas "$ID"
curl -s -o /dev/null -w "dosen unduh ST: %{http_code}\n" -H "Cookie: $A" "http://localhost:3000/api/dosen/pengajuan/$ID/file?jenis=surat_tugas"
curl -s -o /dev/null -w "dosen unduh SK: %{http_code}\n" -H "Cookie: $A" "http://localhost:3000/api/dosen/pengajuan/$ID/file?jenis=sk"
curl -s -o /dev/null -w "dosen B unduh SK milik A: %{http_code}\n" -H "Cookie: $B" "http://localhost:3000/api/dosen/pengajuan/$ID/file?jenis=sk"
```
Expected: simpan ST → `{"ok":true,"status":"disetujui"} (200)`; ST dikirim sbg SK → `...Berkas surat tidak valid... (400)`; SK palsu → `...File harus berformat PDF. (400)`; simpan SK → `{"ok":true,"status":"terbit"} (200)`; ganti ST → `{"ok":true,"status":"terbit"} (200)`; `berkas` → `"surat"` berisi tepat 2 file (`surat-tugas-…` terbaru dan `sk-…`; ST lama & SK palsu sudah terhapus); unduh ST `302`; unduh SK `302`; B → `404`.

- [ ] **Step 14: Verifikasi alur tolak** (pengajuan milik dosen B):

```bash
PB=$(node scripts/uji.mjs unggah "$B" .superpowers/uji/uji.pdf /api/dosen/unggah)
curl -s -o .superpowers/uji/ajB.json -w "B ajukan PkM: %{http_code}\n" -X POST -H "Cookie: $B" -H "Content-Type: application/json" -d "{\"jenis\":\"pkm\",\"judul\":\"Uji Pengajuan PkM Dosen B\",\"skema\":\"PkM Mandiri\",\"tahun\":2026,\"proposal_path\":\"$PB\"}" http://localhost:3000/api/dosen/pengajuan
IDB=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.superpowers/uji/ajB.json','utf8')).id)")
curl -s -w " ← token surat sblm disetujui (%{http_code})\n" -X POST -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d '{"jenis":"sk"}' $K/$IDB/unggah
curl -s -w " ← tolak (%{http_code})\n" -X POST -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d '{"aksi":"tolak","catatan":"Di luar bidang fokus roadmap."}' $K/$IDB/keputusan
curl -s -w " ← putuskan lagi (%{http_code})\n" -X POST -H "Cookie: $ADMIN_COOKIE" -H "Content-Type: application/json" -d '{"aksi":"setujui"}' $K/$IDB/keputusan
curl -s -w " ← B edit setelah ditolak (%{http_code})\n" -X PUT -H "Cookie: $B" -H "Content-Type: application/json" -d '{"jenis":"pkm","judul":"Uji Pengajuan PkM Dosen B","skema":"PkM Mandiri","tahun":2026}' http://localhost:3000/api/dosen/pengajuan/$IDB
```
Expected: `B ajukan PkM: 201`; token sebelum disetujui → `...Surat hanya dapat diunggah setelah pengajuan disetujui. (409)`; tolak → `{"ok":true,"status":"ditolak"} (200)`; putuskan lagi → `...sudah diputuskan sebelumnya. (409)`; B edit → `...hanya dapat diubah saat berstatus Perlu Revisi. (409)`.

- [ ] **Step 15: Verifikasi browser.**
  1. Admin `/admin/pengajuan` → filter status & jenis bekerja; dua pengajuan uji tampil dengan badge benar; "Periksa" membuka detail.
  2. Detail pengajuan A (Terbit) → data dosen lengkap, "Unduh Proposal" membuka PDF, tautan "Tercatat di daftar Penelitian publik", panel Surat Tugas & SK menampilkan "Lihat berkas saat ini" untuk keduanya.
  3. Detail pengajuan B (Ditolak) → catatan tampil, tanpa panel keputusan/surat.
  4. Dosen A `/dosen/pengajuan/<ID>` → alert "Surat Tugas dan SK telah terbit", tombol **Surat Tugas** & **SK** membuka PDF.
  5. Situs publik `/penelitian.html` → judul "Uji Pengajuan Penelitian Dosen A" muncul di tabel daftar penelitian.
  6. (Opsional, bila pemilihan file dapat diotomasi) unggah ulang SK lewat panel admin dengan `.superpowers/uji/uji.pdf` → status tetap Terbit.

- [ ] **Step 16: Commit.**

```bash
git add src/lib/validation.ts src/components/admin/icons.tsx src/components/admin/PengajuanAksi.tsx src/app/api/admin/pengajuan "src/app/admin/(panel)/pengajuan"
git commit -m "feat(dosen): verifikasi pengajuan, catat ke daftar publik, unggah Surat Tugas & SK

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Menu & badge admin, kartu "Perlu Tindakan", menu publik "Layanan Dosen", README

**Files:**
- Modify: `src/components/admin/Sidebar.tsx` (ganti seluruh isi), `src/components/admin/AdminShell.tsx:7,15,28`, `src/app/admin/(panel)/layout.tsx` (ganti seluruh isi), `src/app/admin/(panel)/page.tsx` (dashboard), 13 file `public/*.html`, `README.md`

**Interfaces:**
- Consumes: `InboxIcon` (Task 6), `UserCheckIcon` (Task 4), tabel `pengajuan` & `profil`.
- Produces: `export type Badges = { pengajuan: number; dosen: number }` dari `Sidebar.tsx`; `<AdminShell badges?>`; `<Sidebar badges? onNavigate?>`.

- [ ] **Step 1: Ganti isi `src/components/admin/Sidebar.tsx`:**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from './LogoutButton';
import {
  DashboardIcon,
  InboxIcon,
  UserCheckIcon,
  NewsIcon,
  DocIcon,
  ResearchIcon,
  CommunityIcon,
  PublicationIcon,
  MessageIcon,
  SettingsIcon,
  ChartIcon,
} from './icons';

export type Badges = { pengajuan: number; dosen: number };

const items: { href: string; label: string; Icon: typeof DashboardIcon; badge?: keyof Badges }[] = [
  { href: '/admin', label: 'Dashboard', Icon: DashboardIcon },
  { href: '/admin/pengajuan', label: 'Pengajuan', Icon: InboxIcon, badge: 'pengajuan' },
  { href: '/admin/akun-dosen', label: 'Akun Dosen', Icon: UserCheckIcon, badge: 'dosen' },
  { href: '/admin/berita', label: 'Berita & Agenda', Icon: NewsIcon },
  { href: '/admin/dokumen', label: 'Dokumen', Icon: DocIcon },
  { href: '/admin/penelitian', label: 'Penelitian', Icon: ResearchIcon },
  { href: '/admin/pkm', label: 'PkM', Icon: CommunityIcon },
  { href: '/admin/publikasi', label: 'Publikasi', Icon: PublicationIcon },
  { href: '/admin/monev-ojs', label: 'Monev OJS', Icon: ChartIcon },
  { href: '/admin/pesan', label: 'Pesan Masuk', Icon: MessageIcon },
  { href: '/admin/pengaturan', label: 'Pengaturan', Icon: SettingsIcon },
];

export default function Sidebar({ onNavigate, badges }: { onNavigate?: () => void; badges?: Badges }) {
  const path = usePathname();
  return (
    <div className="h-full flex flex-col bg-navy-900 text-white">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 shrink-0">
        <img src="/assets/img/logo-color.png" alt="Logo UnivSM" className="h-9 w-9 object-contain" />
        <div className="leading-tight">
          <p className="font-bold text-sm">Admin LPPM</p>
          <p className="text-gold-400 text-[10px] tracking-widest uppercase">Universitas Sapta Mandiri</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {items.map(({ href, label, Icon, badge }) => {
          const active = path === href || (href !== '/admin' && path.startsWith(`${href}/`));
          const jumlah = badge ? badges?.[badge] ?? 0 : 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active
                  ? 'bg-gold-500 text-navy-900 font-semibold shadow-sm'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${active ? 'text-navy-900' : 'text-white/60 group-hover:text-white'}`}
              />
              {label}
              {jumlah > 0 && (
                <span
                  aria-label={`${jumlah} perlu tindakan`}
                  className={`ml-auto min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums ${
                    active ? 'bg-navy-900 text-white' : 'bg-gold-500 text-navy-900'
                  }`}
                >
                  {jumlah}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 shrink-0">
        <LogoutButton />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Teruskan badge di `src/components/admin/AdminShell.tsx`** — tiga perubahan:

Ganti:
```tsx
import Sidebar from './Sidebar';
```
dengan:
```tsx
import Sidebar, { type Badges } from './Sidebar';
```

Ganti:
```tsx
export default function AdminShell({ children }: { children: React.ReactNode }) {
```
dengan:
```tsx
export default function AdminShell({ children, badges }: { children: React.ReactNode; badges?: Badges }) {
```

Ganti `<Sidebar />` (sidebar desktop) dengan `<Sidebar badges={badges} />`, dan `<Sidebar onNavigate={() => setOpen(false)} />` (drawer) dengan `<Sidebar badges={badges} onNavigate={() => setOpen(false)} />`.

- [ ] **Step 3: Ganti isi `src/app/admin/(panel)/layout.tsx`** (guard + hitungan badge):

```tsx
import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { getSesi } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sesi = await getSesi();
  if (!sesi) redirect('/admin/login');
  const p = sesi.profil;
  if (!p || p.peran !== 'admin' || p.status !== 'aktif') {
    redirect(p?.peran === 'dosen' ? '/dosen' : '/admin/login?e=akses');
  }

  const db = supabaseAdmin();
  const [aj, akun] = await Promise.all([
    db.from('pengajuan').select('id', { count: 'exact', head: true }).eq('status', 'diajukan'),
    db.from('profil').select('user_id', { count: 'exact', head: true }).eq('peran', 'dosen').eq('status', 'menunggu'),
  ]);
  return (
    <AdminShell badges={{ pengajuan: aj.count ?? 0, dosen: akun.count ?? 0 }}>{children}</AdminShell>
  );
}
```

- [ ] **Step 4: Tambahkan kartu "Perlu Tindakan" di `src/app/admin/(panel)/page.tsx`.**

Ganti baris impor ikon:
```tsx
import {
  NewsIcon,
  DocIcon,
  ResearchIcon,
  CommunityIcon,
  PublicationIcon,
  MessageIcon,
} from '@/components/admin/icons';
```
dengan:
```tsx
import {
  NewsIcon,
  DocIcon,
  ResearchIcon,
  CommunityIcon,
  PublicationIcon,
  MessageIcon,
  InboxIcon,
  UserCheckIcon,
} from '@/components/admin/icons';
```

Sisipkan setelah baris `    .limit(10);` (akhir query `pesanBaru`):
```tsx
  const [ajBaru, akunBaru] = await Promise.all([
    db.from('pengajuan').select('id', { count: 'exact', head: true }).eq('status', 'diajukan'),
    db.from('profil').select('user_id', { count: 'exact', head: true }).eq('peran', 'dosen').eq('status', 'menunggu'),
  ]);
```

Sisipkan tepat sebelum baris `      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">` (awal kartu Pesan Baru):
```tsx
      <h2 className="font-bold text-navy-800 mb-3">Perlu Tindakan</h2>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/admin/pengajuan"
          className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 p-5 transition hover:shadow-lg hover:shadow-navy-900/5 hover:border-navy-200"
        >
          <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <InboxIcon className="w-6 h-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-navy-800 tabular-nums">{ajBaru.count ?? 0}</p>
            <p className="text-sm text-gray-500">Pengajuan menunggu verifikasi</p>
          </div>
        </Link>
        <Link
          href="/admin/akun-dosen"
          className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 p-5 transition hover:shadow-lg hover:shadow-navy-900/5 hover:border-navy-200"
        >
          <span className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <UserCheckIcon className="w-6 h-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-navy-800 tabular-nums">{akunBaru.count ?? 0}</p>
            <p className="text-sm text-gray-500">Akun dosen menunggu persetujuan</p>
          </div>
        </Link>
      </div>

```

- [ ] **Step 5: Tambahkan menu "Layanan Dosen" ke 13 halaman publik.** Jalankan dari root repo (skrip menjaga akhir baris asli tiap file; jangan memakai pipeline string PowerShell):

```bash
python -c "
import glob
desk = '<a href=\"/dosen/login\" class=\"dropdown-item\">Layanan Dosen</a>'
desk_ikon = '<a href=\"/dosen/login\" class=\"dropdown-item\"><i class=\"ri-user-star-line w-4 text-navy-600\"></i>Layanan Dosen</a>'
mob = '<a href=\"/dosen/login\" class=\"block px-3 py-2 text-white/90 hover:bg-white/10 rounded-lg\">Layanan Dosen</a>'
jangkar_desk = '<a href=\"dokumen.html\" class=\"dropdown-item'
jangkar_mob = '<a href=\"kontak.html\" class=\"block'
for f in sorted(glob.glob('public/*.html')):
    s = open(f, encoding='utf-8', newline='').read()
    if '/dosen/login' in s:
        print(f, 'sudah ada'); continue
    if jangkar_desk not in s:
        print(f, 'TIDAK ADA dropdown Layanan'); continue
    s = s.replace(jangkar_desk, (desk_ikon if f.endswith('index.html') else desk) + jangkar_desk, 1)
    hasil = 'desktop'
    if jangkar_mob in s:
        s = s.replace(jangkar_mob, mob + jangkar_mob, 1); hasil += '+mobile'
    open(f, 'w', encoding='utf-8', newline='').write(s)
    print(f, hasil)
"
grep -l '/dosen/login' public/*.html | wc -l
```
Expected: 13 baris `public/<file>.html desktop+mobile` kecuali `public/roadmap.html desktop` (tak punya menu mobile Kontak); hitungan akhir `13`. `git diff --stat public` hanya menunjukkan perubahan 1–2 baris per file (bukan seluruh file).

- [ ] **Step 6: Perbarui `README.md`.** Ganti baris ke-5:
```markdown
- **Panel admin** — `/admin` (kelola berita, dokumen unduhan, data penelitian/PkM/publikasi, pesan masuk, statistik beranda)
```
dengan:
```markdown
- **Panel admin** — `/admin` (kelola berita, dokumen unduhan, data penelitian/PkM/publikasi, pesan masuk, statistik beranda, Monev OJS, verifikasi pengajuan & akun dosen)
- **Layanan Dosen** — `/dosen` (dosen mendaftar, mengajukan penelitian/PkM, mengunduh Surat Tugas & SK)
```

Ganti bagian `## Setup Supabase (sekali saja)` (judul + 3 langkahnya) dengan:
```markdown
## Setup Supabase (sekali saja)

1. Buat project di https://supabase.com (region Singapore).
2. SQL Editor → jalankan seluruh isi `supabase/schema.sql` (tabel, RLS, seed statistik, bucket `dokumen` & `gambar` publik, bucket `pengajuan` privat).
3. Authentication → Users → Add user → email & password admin (centang Auto Confirm), lalu jadikan admin (lihat "Akun Admin").
4. Authentication → Sign In / Providers → Email → **matikan "Allow new users to sign up"**. Akun dosen dibuat lewat halaman `/dosen/daftar`, bukan sign-up publik Supabase.

> Proyek yang sudah berjalan sebelum Oktober 2026: jalankan sekali `supabase/migrasi-2026-10-peran.sql` agar akun admin lama mendapat peran admin. Jangan dijalankan ulang.
```

Ganti bagian `## Akun Admin` (judul + paragrafnya) dengan:
```markdown
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

Dosen mendaftar di `/dosen/daftar` → status **menunggu** → admin menyetujui di **Panel Admin → Akun Dosen**. Dosen aktif dapat mengajukan penelitian/PkM; admin memverifikasi di **Pengajuan**, lalu mengunggah Surat Tugas & SK (PDF, maks 10 MB, diunggah langsung ke Storage privat).

## Alat Uji (pengembangan)

`node scripts/uji.mjs` — membuat akun dosen uji (`@example.com`), cookie sesi, unggah berkas, dan `bersihkan` untuk menghapus semua data uji. Jalankan `bersihkan` setiap selesai menguji karena database bersama produksi.
```

- [ ] **Step 7: Verifikasi.** `npm run typecheck` → exit 0. Dev server jalan:

```bash
IDB=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.superpowers/uji/ajB.json','utf8')).id)")
node scripts/uji.mjs set-status "$IDB" diajukan
curl -s http://localhost:3000/index.html | grep -c '/dosen/login'
```
Expected: set-status mencetak `{"status":"diajukan",...}`; hitungan `2` (desktop + mobile index).

Browser (admin):
  1. Sidebar: menu **Pengajuan** (badge kuning **1**) dan **Akun Dosen** (tanpa badge karena tidak ada yang menunggu) berada setelah Dashboard.
  2. Dashboard: kartu **Perlu Tindakan** menampilkan `1` pengajuan & `0` akun.
  3. Buka `/admin/pengajuan/<IDB>` → menu **Pengajuan** di sidebar tetap tersorot (aktif untuk sub-halaman).
  4. Mobile (375px): drawer sidebar menampilkan badge yang sama.
Browser (publik): dropdown **Layanan** di beranda & satu halaman lain (mis. `/publikasi.html`) memuat **Layanan Dosen** → klik → `/dosen/login`.

Kembalikan status uji: `node scripts/uji.mjs set-status "$IDB" ditolak`.

- [ ] **Step 8: Commit.**

```bash
git add src/components/admin/Sidebar.tsx src/components/admin/AdminShell.tsx "src/app/admin/(panel)/layout.tsx" "src/app/admin/(panel)/page.tsx" public README.md
git commit -m "feat(dosen): menu & badge admin, kartu Perlu Tindakan, menu publik Layanan Dosen, README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Build produksi, verifikasi menyeluruh, pembersihan data uji

**Files:**
- (tidak ada file baru; perbaikan kecil bila verifikasi menemukan masalah)

- [ ] **Step 1: Build.** `npm run typecheck` → exit 0. `npm run build` → sukses; rute baru terdaftar: `/dosen`, `/dosen/login`, `/dosen/daftar`, `/dosen/ajukan`, `/dosen/pengajuan/[id]`, `/admin/pengajuan`, `/admin/pengajuan/[id]`, `/admin/akun-dosen`, `/api/dosen/*`, `/api/admin/dosen*`, `/api/admin/pengajuan*`, `/api/profil/saya`.

- [ ] **Step 2: Matriks akses** (dev server jalan; cookie dibuat ulang):

```bash
A=$(node scripts/uji.mjs cookie A); B=$(node scripts/uji.mjs cookie B)
ADMIN_COOKIE=$(node scripts/uji.mjs cookie-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
for u in /api/admin/pengajuan /api/admin/dosen /api/pesan; do
  printf "%-24s tanpa:%s dosen:%s admin:%s\n" "$u" \
    "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$u)" \
    "$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: $A" http://localhost:3000$u)" \
    "$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: $ADMIN_COOKIE" http://localhost:3000$u)"
done
printf "%-24s tanpa:%s dosen:%s admin:%s\n" /api/dosen/pengajuan \
  "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/dosen/pengajuan)" \
  "$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: $A" http://localhost:3000/api/dosen/pengajuan)" \
  "$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: $ADMIN_COOKIE" http://localhost:3000/api/dosen/pengajuan)"
```
Expected: tiga baris pertama `tanpa:401 dosen:403 admin:200`; baris `/api/dosen/pengajuan` → `tanpa:401 dosen:200 admin:403`.

- [ ] **Step 3: Akses langsung bucket privat ditolak.**

```bash
node -e "
require('fs').readFileSync('.env.local','utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].trim();});
fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/storage/v1/object/public/pengajuan/x/y.pdf').then(r=>console.log('URL publik bucket pengajuan:',r.status));
"
```
Expected: status `400` atau `404` (bucket bukan publik) — tidak pernah `200`.

- [ ] **Step 4: Penelusuran browser end-to-end singkat** (alur lengkap sudah teruji per task; ini memastikan halaman tetap utuh setelah build):
  1. `/dosen/daftar` → `/dosen/login` → login dosen A → `/dosen` (daftar), `/dosen/ajukan` (form), detail pengajuan Terbit (unduh ST & SK).
  2. Login admin → `/admin` (kartu Perlu Tindakan, badge) → `/admin/pengajuan` → detail → `/admin/akun-dosen`.
  3. Login admin lama tetap berhasil; seluruh menu panel lama (Berita, Dokumen, Penelitian, PkM, Publikasi, Monev OJS, Pesan, Pengaturan) terbuka tanpa error console.
  4. Mobile 375px: `/dosen`, `/dosen/login`, `/admin/pengajuan` tanpa scroll horizontal.

- [ ] **Step 5: Bersihkan data uji (WAJIB — database produksi).**

```bash
node scripts/uji.mjs bersihkan
node -e "
const { createClient } = require('@supabase/supabase-js');
require('fs').readFileSync('.env.local','utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].trim();});
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async()=>{
  const p = await db.from('profil').select('email').like('email','%@example.com');
  const a = await db.from('pengajuan').select('id',{count:'exact',head:true});
  const pn = await db.from('penelitian').select('id').like('judul','Uji Pengajuan%');
  const pk = await db.from('pkm').select('id').like('judul','Uji Pengajuan%');
  const u = await db.auth.admin.listUsers();
  console.log('profil uji:', p.data.length, '| pengajuan:', a.count, '| publik uji:', pn.data.length + pk.data.length,
    '| user Auth uji:', u.data.users.filter(x=>x.email.endsWith('@example.com')).length);
})();
"
rm -rf .superpowers/uji .superpowers/uji-id-A.txt
```
Expected: `dihapus uji.dosen.a@example.com`, `dihapus uji.dosen.b@example.com`, `selesai`; lalu `profil uji: 0 | pengajuan: 0 | publik uji: 0 | user Auth uji: 0`.

- [ ] **Step 6: Commit penutup** (hanya bila ada perbaikan dari Step 1–4):

```bash
git status --short
git add -A
git commit -m "fix(dosen): perbaikan hasil verifikasi akhir

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Catatan Eksekusi

- Kerjakan di branch `feature/layanan-dosen` (bukan langsung di `main`).
- Task 1 Step 3 adalah PAUSE: user me-resume Supabase, menjalankan DDL + migrasi, dan mematikan sign-up publik. Jangan lewati — semua task berikutnya bergantung padanya.
- Kredensial admin hanya diberikan controller lewat variabel shell `ADMIN_EMAIL`/`ADMIN_PASSWORD`; jangan ditulis ke file atau commit.
- Database dipakai bersama produksi: setiap akun/berkas/baris uji harus berakhir terhapus (Task 8 Step 5). Bila eksekusi berhenti di tengah, jalankan `node scripts/uji.mjs bersihkan` sebelum berhenti.
- Rate limiter pendaftaran in-memory; bila Task 3–5 mendaftarkan akun berkali-kali dan muncul 429, restart dev server.
- Edit HTML publik hanya lewat skrip Python di Task 7 Step 5 atau Edit tool (bukan pipeline string PowerShell) — risiko mojibake.
- Setelah merge & deploy: aplikasi memakai database yang sama, jadi skema sudah siap. Verifikasi produksi cukup membuka `/dosen/login`, `/dosen/daftar`, dan login admin; bila menguji pendaftaran di produksi, jalankan `BASE=https://lppm-univsm.vercel.app node scripts/uji.mjs daftar A` lalu `node scripts/uji.mjs bersihkan`.
