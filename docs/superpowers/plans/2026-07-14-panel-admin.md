# Panel Admin LPPM UnivSM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Panel admin + API untuk mengelola konten website LPPM (berita, dokumen, penelitian/PkM/publikasi, pesan form), di-deploy gratis di Vercel dengan Supabase.

**Architecture:** Satu aplikasi Next.js (App Router). Situs publik statis yang ada dipindah ke `public/` tanpa perubahan tampilan; panel admin React di `/admin`; semua data lewat route handlers `/api/*` yang mengakses Supabase (Postgres + Storage + Auth) dengan service role key di server.

**Tech Stack:** Next.js 15 (TypeScript), React 19, Tailwind CSS v4, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), zod.

**Spec:** `docs/superpowers/specs/2026-07-14-admin-panel-design.md` — baca dulu sebelum mengerjakan task apa pun.

## Global Constraints

- Seluruh UI dan pesan error berbahasa Indonesia.
- Warna identitas: navy `#1d2b78`, gold `#f0a500` (skala lengkap ada di Task 1 `globals.css`).
- Batas upload: bucket `dokumen` maks 10 MB (PDF/DOC/DOCX/XLS/XLSX); bucket `gambar` maks 3 MB (JPG/PNG/WebP).
- Satu akun admin via Supabase Auth; TIDAK ada halaman registrasi.
- Format error API selalu `{ "error": "<pesan bahasa Indonesia>" }` dengan status HTTP semestinya (400/401/404/429/500).
- `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di server; tidak pernah terkirim ke browser.
- Tampilan situs publik TIDAK berubah — konten dinamis menggantikan konten statis dengan markup/kelas CSS yang sama; konten statis adalah fallback bila API gagal.
- Tidak ada framework unit test; verifikasi via `npm run typecheck`, `curl`, dan browser.
- Dev server: `npm run dev` (port 3000). Kerjakan dari root repo `E:\lab\lppm-univsm`.
- Commit setelah tiap task selesai diverifikasi.

---

### Task 1: Scaffold Next.js + pindahkan situs statis + perbaikan kecil

**Files:**
- Modify: `package.json` (root, sudah ada — merge)
- Create: `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/admin/(panel)/page.tsx`
- Move: `website/*` → `public/*` (git mv)
- Modify: `public/index.html` (hapus link repository.html, bersihkan mojibake)

**Interfaces:**
- Produces: struktur app Next.js berjalan; situs publik tersaji di `/`; alias import `@/*` → `src/*`; kelas Tailwind `navy-*`/`gold-*` untuk semua task admin berikutnya.

- [x] **Step 1: Tulis ulang `package.json`** (pertahankan dependency `docx` yang dipakai `generate-website-brief.js`):

```json
{
  "name": "lppm-univsm",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.50.0",
    "docx": "^9.7.1",
    "next": "^15.3.3",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.0",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.8.0"
  }
}
```

- [x] **Step 2: Install** — Run: `npm install`. Expected: sukses tanpa error resolusi.

- [x] **Step 3: Buat file konfigurasi.**

`next.config.ts`:
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/', destination: '/index.html' }];
  },
};

export default nextConfig;
```

`postcss.config.mjs`:
```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "public"]
}
```

- [x] **Step 4: Buat layout root + globals.css + placeholder dashboard.**

`src/app/globals.css`:
```css
@import "tailwindcss";

@theme {
  --color-navy-50: #eef1ff;
  --color-navy-100: #e0e5ff;
  --color-navy-200: #c7d0fe;
  --color-navy-300: #a5b0fb;
  --color-navy-400: #8089f4;
  --color-navy-500: #5d64e8;
  --color-navy-600: #4148d6;
  --color-navy-700: #2d36bd;
  --color-navy-800: #1d2b78;
  --color-navy-900: #141d54;
  --color-navy-950: #0c1237;
  --color-gold-50: #fffbeb;
  --color-gold-100: #fef3c7;
  --color-gold-300: #fcd34d;
  --color-gold-400: #fbbf24;
  --color-gold-500: #f0a500;
  --color-gold-600: #d97706;
}
```

`src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Admin LPPM UnivSM' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-gray-100 text-gray-800">{children}</body>
    </html>
  );
}
```

`src/app/admin/(panel)/page.tsx` (placeholder, diganti di Task 7):
```tsx
export default function DashboardPage() {
  return <p className="p-8">Panel admin LPPM — dalam pembangunan.</p>;
}
```

- [x] **Step 5: Pindahkan situs statis** — Run: `git mv website public`
  Lalu verifikasi: `ls public/index.html public/assets/js/main.js` → kedua file ada.

- [x] **Step 6: Hapus link rusak `repository.html`** di `public/index.html` — hapus SATU baris ini (dropdown Layanan, sekitar baris 68):

```html
            <a href="repository.html" class="dropdown-item"><i class="ri-folder-shield-2-line w-4 text-navy-600"></i>Repository Bukti Kinerja</a>
```

- [x] **Step 7: Bersihkan mojibake komentar** di `public/index.html` — jalankan python (byte-level, JANGAN lewat PowerShell string agar tidak double-encoding):

```python
# simpan sebagai scratch/fix_mojibake.py lalu: python scratch/fix_mojibake.py
p = 'public/index.html'
data = open(p, 'rb').read()
# 'â•\x90' hasil salah-baca '═' (U+2550), ter-encode ulang sebagai UTF-8:
data = data.replace('â•'.encode('utf-8'), b'=')
data = data.replace('â•'.encode('utf-8'), b'=')
open(p, 'wb').write(data)
print('selesai')
```

Verifikasi: `grep -c "â" public/index.html` → Expected: `0` (jika masih ada, lihat byte aslinya dengan `grep -o "â.." public/index.html | head` dan tambahkan pola replace).

- [x] **Step 8: Jalankan dev server dan verifikasi situs publik.**

Run: `npm run dev` (background), lalu:
- `curl -s http://localhost:3000/ | grep -o "<title>[^<]*"` → Expected: `<title>Beranda – LPPM Universitas Sapta Mandiri` (atau entity `&ndash;`)
- `curl -s http://localhost:3000/berita.html | grep -c "Berita"` → Expected: angka > 0
- `curl -s http://localhost:3000/admin | grep -c "dalam pembangunan"` → Expected: `1`
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/assets/css/custom.css` → Expected: `200`

- [x] **Step 9: Typecheck & commit.**

Run: `npm run typecheck` → Expected: exit 0.
```bash
git add -A
git commit -m "feat: scaffold Next.js, pindahkan situs statis ke public/, hapus link rusak & mojibake"
```

---

### Task 2: Skema Supabase + klien + environment

**Files:**
- Create: `supabase/schema.sql`, `.env.local.example`, `src/lib/supabase/admin.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`

**Interfaces:**
- Produces: `supabaseAdmin(): SupabaseClient` (service role, akses data), `supabaseServer(): Promise<SupabaseClient>` (baca sesi dari cookie), `supabaseBrowser(): SupabaseClient` (login di client). Tabel: `berita`, `dokumen`, `penelitian`, `pkm`, `publikasi`, `pesan`, `pengaturan`; bucket: `dokumen`, `gambar`.

- [x] **Step 1: Tulis `supabase/schema.sql`:**

```sql
-- Skema database LPPM UnivSM. Jalankan sekali di Supabase Dashboard > SQL Editor.

create table if not exists berita (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  slug text unique not null,
  kategori text not null check (kategori in ('berita','pengumuman','agenda')),
  ringkasan text not null default '',
  konten text not null default '',
  gambar_url text,
  tanggal date not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists dokumen (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  kategori text not null check (kategori in ('pedoman','template','sk','laporan','lainnya')),
  deskripsi text not null default '',
  file_url text not null,
  nama_file text not null,
  ukuran_bytes bigint not null default 0,
  tipe_file text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists penelitian (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  ketua text not null,
  anggota text not null default '',
  skema text not null default '',
  tahun int not null,
  sumber_dana text not null default '',
  status text not null default 'aktif' check (status in ('aktif','proses','selesai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists pkm (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  ketua text not null,
  anggota text not null default '',
  skema text not null default '',
  tahun int not null,
  sumber_dana text not null default '',
  status text not null default 'aktif' check (status in ('aktif','proses','selesai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists publikasi (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  penulis text not null,
  jenis text not null check (jenis in ('artikel','buku','hki','inovasi')),
  penerbit text not null default '',
  tahun int not null,
  tautan text not null default '',
  indeksasi text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists pesan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  email text not null,
  telepon text not null default '',
  jenis text not null check (jenis in ('kontak','konsultasi','kerjasama')),
  subjek text not null default '',
  isi text not null,
  status text not null default 'baru' check (status in ('baru','dibaca','selesai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists pengaturan (
  key text primary key,
  value text not null
);

-- RLS aktif tanpa policy anon: semua akses hanya lewat service role di server Next.js.
alter table berita enable row level security;
alter table dokumen enable row level security;
alter table penelitian enable row level security;
alter table pkm enable row level security;
alter table publikasi enable row level security;
alter table pesan enable row level security;
alter table pengaturan enable row level security;

-- Nilai awal statistik beranda (sesuai angka statis saat ini)
insert into pengaturan (key, value) values
  ('stat_penelitian', '45'),
  ('stat_pkm', '38'),
  ('stat_publikasi', '127'),
  ('stat_hki', '24'),
  ('stat_mitra', '18')
on conflict (key) do nothing;

-- Bucket storage publik (read-only publik; tulis via service role)
insert into storage.buckets (id, name, public) values
  ('dokumen', 'dokumen', true),
  ('gambar', 'gambar', true)
on conflict (id) do nothing;
```

- [x] **Step 2: Tulis `.env.local.example`:**

```bash
# Salin ke .env.local (di-gitignore) dan isi dari Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- [x] **Step 3: Tulis tiga klien Supabase.**

`src/lib/supabase/admin.ts`:
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Klien service role — HANYA untuk server (route handlers / server components).
export function supabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
```

`src/lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Klien untuk membaca sesi login dari cookie di server.
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // dipanggil dari Server Component — aman diabaikan, middleware yang refresh sesi
          }
        },
      },
    },
  );
}
```

`src/lib/supabase/browser.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr';

export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [x] **Step 4: PAUSE — setup manual oleh user (tidak bisa diotomasi).** Sampaikan instruksi ini ke user dan tunggu kredensialnya:

1. Buat akun/login di https://supabase.com → New project (nama: `lppm-univsm`, region Singapore).
2. SQL Editor → paste seluruh isi `supabase/schema.sql` → Run.
3. Authentication → Users → Add user → email `lppm@univsm.ac.id` (atau email admin), password kuat, centang Auto Confirm.
4. Settings → API → salin `Project URL`, `anon public`, `service_role` ke file `.env.local` (format sesuai `.env.local.example`).

Setelah user memberikan nilai env: tulis `.env.local`, restart dev server.

- [x] **Step 5: Verifikasi koneksi** (butuh `.env.local` terisi):

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('fs').readFileSync('.env.local','utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)process.env[m[1]]=m[2];});
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
db.from('pengaturan').select('*').then(r => console.log(r.error ?? r.data));
"
```
Expected: array 5 baris `stat_*`.

- [x] **Step 6: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add supabase/schema.sql .env.local.example src/lib/supabase
git commit -m "feat: skema Supabase, seed statistik, dan klien admin/server/browser"
```

---

### Task 3: Lapisan lib — validasi zod, slug, auth guard, CRUD factory, rate limit

**Files:**
- Create: `src/lib/validation.ts`, `src/lib/slug.ts`, `src/lib/auth.ts`, `src/lib/crud.ts`, `src/lib/rate-limit.ts`

**Interfaces:**
- Consumes: `supabaseAdmin()`, `supabaseServer()` dari Task 2.
- Produces:
  - `beritaSchema`, `dokumenSchema`, `penelitianSchema`, `pkmSchema`, `publikasiSchema`, `pesanSchema`, `pesanStatusSchema`, `pengaturanSchema` (zod)
  - `slugify(judul: string): string`
  - `requireAdmin(): Promise<NextResponse | null>` — `null` bila login, respons 401 bila tidak
  - `makeListRoutes(cfg: CrudConfig): { GET, POST }` dan `makeItemRoutes(cfg: CrudConfig): { PUT, DELETE }`
  - `rateLimitOk(ip: string): boolean`

- [x] **Step 1: Tulis `src/lib/validation.ts`:**

```ts
import { z } from 'zod';

export const beritaSchema = z.object({
  judul: z.string().min(3, 'Judul minimal 3 karakter.'),
  kategori: z.enum(['berita', 'pengumuman', 'agenda']),
  ringkasan: z.string().default(''),
  konten: z.string().default(''),
  gambar_url: z.string().nullable().default(null),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.'),
  published: z.boolean().default(false),
});

export const dokumenSchema = z.object({
  judul: z.string().min(3, 'Judul minimal 3 karakter.'),
  kategori: z.enum(['pedoman', 'template', 'sk', 'laporan', 'lainnya']),
  deskripsi: z.string().default(''),
  file_url: z.string().min(1, 'File wajib diunggah.'),
  nama_file: z.string().min(1),
  ukuran_bytes: z.number().int().nonnegative().default(0),
  tipe_file: z.string().default(''),
});

const kegiatanShape = {
  judul: z.string().min(3, 'Judul minimal 3 karakter.'),
  ketua: z.string().min(2, 'Nama ketua wajib diisi.'),
  anggota: z.string().default(''),
  skema: z.string().default(''),
  tahun: z.coerce.number().int().min(2000, 'Tahun tidak valid.').max(2100, 'Tahun tidak valid.'),
  sumber_dana: z.string().default(''),
  status: z.enum(['aktif', 'proses', 'selesai']),
};
export const penelitianSchema = z.object(kegiatanShape);
export const pkmSchema = z.object(kegiatanShape);

export const publikasiSchema = z.object({
  judul: z.string().min(3, 'Judul minimal 3 karakter.'),
  penulis: z.string().min(2, 'Penulis wajib diisi.'),
  jenis: z.enum(['artikel', 'buku', 'hki', 'inovasi']),
  penerbit: z.string().default(''),
  tahun: z.coerce.number().int().min(2000, 'Tahun tidak valid.').max(2100, 'Tahun tidak valid.'),
  tautan: z.string().default(''),
  indeksasi: z.string().default(''),
});

export const pesanSchema = z.object({
  nama: z.string().min(2, 'Nama wajib diisi.'),
  email: z.string().email('Email tidak valid.'),
  telepon: z.string().default(''),
  jenis: z.enum(['kontak', 'konsultasi', 'kerjasama']),
  subjek: z.string().default(''),
  isi: z.string().min(5, 'Isi pesan terlalu pendek.'),
  website: z.string().default(''), // honeypot — harus kosong
});

export const pesanStatusSchema = z.object({
  status: z.enum(['baru', 'dibaca', 'selesai']),
});

const angka = z.string().regex(/^\d+$/, 'Harus berupa angka.');
export const pengaturanSchema = z.object({
  stat_penelitian: angka,
  stat_pkm: angka,
  stat_publikasi: angka,
  stat_hki: angka,
  stat_mitra: angka,
});
```

- [x] **Step 2: Tulis `src/lib/slug.ts`:**

```ts
// Slug unik: bentuk dasar dari judul + sufiks waktu base36 agar tidak perlu cek duplikat.
export function slugify(judul: string): string {
  const base = judul
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 80);
  return `${base || 'berita'}-${Date.now().toString(36)}`;
}
```

- [x] **Step 3: Tulis `src/lib/auth.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// Kembalikan null bila ada sesi admin; bila tidak, respons 401 siap-kirim.
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Anda harus login sebagai admin.' }, { status: 401 });
  }
  return null;
}
```

- [x] **Step 4: Tulis `src/lib/crud.ts`:**

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export type CrudConfig = {
  table: string;
  schema: z.ZodObject<z.ZodRawShape>;
  /** query param yang boleh dipakai publik sebagai filter eq() */
  filters?: string[];
  orderBy?: { column: string; ascending?: boolean };
  /** filter yang dipaksakan untuk GET publik (mis. { published: true });
      dilewati bila ?all=1 dan pemanggil punya sesi admin */
  publicOnly?: Record<string, unknown>;
  beforeInsert?: (row: Record<string, unknown>) => Record<string, unknown>;
  /** nama segmen dinamis pada item routes; default 'id' */
  idParam?: string;
};

export function makeListRoutes(cfg: CrudConfig) {
  async function GET(req: Request) {
    const url = new URL(req.url);
    let skipPublicFilter = false;
    if (url.searchParams.get('all') === '1') {
      const supabase = await supabaseServer();
      const { data: { user } } = await supabase.auth.getUser();
      skipPublicFilter = !!user;
    }
    let q = supabaseAdmin().from(cfg.table).select('*');
    if (!skipPublicFilter) {
      for (const [k, v] of Object.entries(cfg.publicOnly ?? {})) q = q.eq(k, v);
    }
    for (const f of cfg.filters ?? []) {
      const v = url.searchParams.get(f);
      if (v) q = q.eq(f, v);
    }
    const ob = cfg.orderBy ?? { column: 'created_at', ascending: false };
    q = q.order(ob.column, { ascending: ob.ascending ?? false });
    const limit = Number(url.searchParams.get('limit'));
    if (limit > 0) q = q.limit(limit);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 });
    return NextResponse.json(data);
  }

  async function POST(req: Request) {
    const denied = await requireAdmin();
    if (denied) return denied;
    const body = await req.json().catch(() => null);
    const parsed = cfg.schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' },
        { status: 400 },
      );
    }
    let row = parsed.data as Record<string, unknown>;
    if (cfg.beforeInsert) row = cfg.beforeInsert(row);
    const { data, error } = await supabaseAdmin().from(cfg.table).insert(row).select().single();
    if (error) return NextResponse.json({ error: 'Gagal menyimpan data.' }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  return { GET, POST };
}

export function makeItemRoutes(cfg: CrudConfig) {
  const idParam = cfg.idParam ?? 'id';

  async function PUT(req: Request, ctx: { params: Promise<Record<string, string>> }) {
    const denied = await requireAdmin();
    if (denied) return denied;
    const id = (await ctx.params)[idParam];
    const body = await req.json().catch(() => null);
    const parsed = cfg.schema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' },
        { status: 400 },
      );
    }
    const { data, error } = await supabaseAdmin()
      .from(cfg.table)
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: 'Gagal memperbarui data.' }, { status: 500 });
    return NextResponse.json(data);
  }

  async function DELETE(_req: Request, ctx: { params: Promise<Record<string, string>> }) {
    const denied = await requireAdmin();
    if (denied) return denied;
    const id = (await ctx.params)[idParam];
    const { error } = await supabaseAdmin().from(cfg.table).delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Gagal menghapus data.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return { PUT, DELETE };
}
```

- [x] **Step 5: Tulis `src/lib/rate-limit.ts`:**

```ts
// Rate limit best-effort in-memory (reset saat cold start serverless — sesuai spec).
const hits = new Map<string, number[]>();

export function rateLimitOk(ip: string, max = 5, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}
```

- [x] **Step 6: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add src/lib
git commit -m "feat: validasi zod, slug, auth guard, CRUD factory, rate limit"
```

---

### Task 4: Middleware proteksi + halaman login + logout

**Files:**
- Create: `src/middleware.ts`, `src/app/admin/login/page.tsx`, `src/components/admin/LogoutButton.tsx`

**Interfaces:**
- Consumes: `supabaseBrowser()` (Task 2).
- Produces: `/admin/*` (kecuali `/admin/login`) dialihkan ke login bila tanpa sesi; komponen `<LogoutButton />` untuk layout Task 7.

- [x] **Step 1: Tulis `src/middleware.ts`:**

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !user) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  if (pathname === '/admin/login' && user) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  return response;
}

export const config = { matcher: ['/admin/:path*'] };
```

- [x] **Step 2: Tulis `src/app/admin/login/page.tsx`:**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    if (error) {
      setError('Email atau password salah.');
      setLoading(false);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-xl font-bold text-navy-800">Panel Admin LPPM</h1>
        <p className="text-sm text-gray-500 mb-6">Universitas Sapta Mandiri</p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {error}
          </p>
        )}
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-4 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:ring-2 focus:ring-navy-800/20 outline-none"
        />
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-6 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:ring-2 focus:ring-navy-800/20 outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-white font-semibold py-2.5 text-sm"
        >
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
```

- [x] **Step 3: Tulis `src/components/admin/LogoutButton.tsx`:**

```tsx
'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';

export default function LogoutButton() {
  async function handleLogout() {
    await supabaseBrowser().auth.signOut();
    window.location.href = '/admin/login';
  }
  return (
    <button
      onClick={handleLogout}
      className="w-full rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 text-left"
    >
      Keluar
    </button>
  );
}
```

- [x] **Step 4: Verifikasi proteksi.**

Dev server jalan, lalu:
- `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" http://localhost:3000/admin` → Expected: `307 http://localhost:3000/admin/login`
- `curl -s http://localhost:3000/admin/login | grep -c "Panel Admin LPPM"` → Expected: `1`
- Browser: buka `/admin/login`, login dengan akun admin Supabase → berhasil masuk ke `/admin` (placeholder Task 1).

- [x] **Step 5: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add src/middleware.ts src/app/admin/login src/components/admin/LogoutButton.tsx
git commit -m "feat: middleware proteksi admin, halaman login, tombol logout"
```

---

### Task 5: API publik — berita, dokumen, penelitian, pkm, publikasi, pengaturan, pesan

**Files:**
- Create: `src/app/api/berita/route.ts`, `src/app/api/berita/[key]/route.ts`, `src/app/api/dokumen/route.ts`, `src/app/api/penelitian/route.ts`, `src/app/api/pkm/route.ts`, `src/app/api/publikasi/route.ts`, `src/app/api/pengaturan/route.ts`, `src/app/api/pesan/route.ts`

**Interfaces:**
- Consumes: `makeListRoutes`, `makeItemRoutes`, semua schema, `slugify`, `rateLimitOk` (Task 3); `supabaseAdmin` (Task 2).
- Produces (dipakai panel admin & `api-content.js`):
  - `GET /api/berita?kategori=&limit=&all=1` → array berita (publik: hanya `published`)
  - `GET /api/berita/{slug}` → satu berita published; `PUT/DELETE /api/berita/{id}` (admin)
  - `GET /api/dokumen?kategori=`, `GET /api/penelitian`, `GET /api/pkm`, `GET /api/publikasi?jenis=`
  - `POST` pada koleksi di atas = create (admin)
  - `GET /api/pengaturan` → `{ "stat_penelitian": "45", ... }`; `PUT /api/pengaturan` (admin)
  - `POST /api/pesan` → `{ ok: true }` (honeypot + rate limit)

- [x] **Step 1: Tulis `src/app/api/berita/route.ts`:**

```ts
import { makeListRoutes } from '@/lib/crud';
import { beritaSchema } from '@/lib/validation';
import { slugify } from '@/lib/slug';

const routes = makeListRoutes({
  table: 'berita',
  schema: beritaSchema,
  filters: ['kategori'],
  orderBy: { column: 'tanggal', ascending: false },
  publicOnly: { published: true },
  beforeInsert: (row) => ({ ...row, slug: slugify(String(row.judul)) }),
});

export const GET = routes.GET;
export const POST = routes.POST;
```

- [x] **Step 2: Tulis `src/app/api/berita/[key]/route.ts`** (GET publik pakai slug; PUT/DELETE admin pakai id):

```ts
import { NextResponse } from 'next/server';
import { makeItemRoutes } from '@/lib/crud';
import { beritaSchema } from '@/lib/validation';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const { data, error } = await supabaseAdmin()
    .from('berita')
    .select('*')
    .eq('slug', key)
    .eq('published', true)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: 'Berita tidak ditemukan.' }, { status: 404 });
  }
  return NextResponse.json(data);
}

const item = makeItemRoutes({ table: 'berita', schema: beritaSchema, idParam: 'key' });
export const PUT = item.PUT;
export const DELETE = item.DELETE;
```

- [x] **Step 3: Tulis empat route koleksi lain.**

`src/app/api/dokumen/route.ts`:
```ts
import { makeListRoutes } from '@/lib/crud';
import { dokumenSchema } from '@/lib/validation';

const routes = makeListRoutes({
  table: 'dokumen',
  schema: dokumenSchema,
  filters: ['kategori'],
});

export const GET = routes.GET;
export const POST = routes.POST;
```

`src/app/api/penelitian/route.ts`:
```ts
import { makeListRoutes } from '@/lib/crud';
import { penelitianSchema } from '@/lib/validation';

const routes = makeListRoutes({
  table: 'penelitian',
  schema: penelitianSchema,
  filters: ['status', 'tahun'],
  orderBy: { column: 'tahun', ascending: false },
});

export const GET = routes.GET;
export const POST = routes.POST;
```

`src/app/api/pkm/route.ts`:
```ts
import { makeListRoutes } from '@/lib/crud';
import { pkmSchema } from '@/lib/validation';

const routes = makeListRoutes({
  table: 'pkm',
  schema: pkmSchema,
  filters: ['status', 'tahun'],
  orderBy: { column: 'tahun', ascending: false },
});

export const GET = routes.GET;
export const POST = routes.POST;
```

`src/app/api/publikasi/route.ts`:
```ts
import { makeListRoutes } from '@/lib/crud';
import { publikasiSchema } from '@/lib/validation';

const routes = makeListRoutes({
  table: 'publikasi',
  schema: publikasiSchema,
  filters: ['jenis', 'tahun'],
  orderBy: { column: 'tahun', ascending: false },
});

export const GET = routes.GET;
export const POST = routes.POST;
```

- [x] **Step 4: Tulis `src/app/api/pengaturan/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { pengaturanSchema } from '@/lib/validation';

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from('pengaturan')
    .select('*')
    .like('key', 'stat_%');
  if (error) return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 });
  return NextResponse.json(Object.fromEntries(data.map((r) => [r.key, r.value])));
}

export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = pengaturanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' },
      { status: 400 },
    );
  }
  const rows = Object.entries(parsed.data).map(([key, value]) => ({ key, value }));
  const { error } = await supabaseAdmin().from('pengaturan').upsert(rows);
  if (error) return NextResponse.json({ error: 'Gagal menyimpan pengaturan.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [x] **Step 5: Tulis `src/app/api/pesan/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { pesanSchema } from '@/lib/validation';
import { rateLimitOk } from '@/lib/rate-limit';

// Daftar pesan untuk panel admin
export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const url = new URL(req.url);
  let q = supabaseAdmin().from('pesan').select('*').order('created_at', { ascending: false });
  const status = url.searchParams.get('status');
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 });
  return NextResponse.json(data);
}

// Form publik
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = pesanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Data tidak lengkap atau tidak valid.' },
      { status: 400 },
    );
  }
  const { website, ...row } = parsed.data;
  if (website) return NextResponse.json({ ok: true }); // honeypot terisi: pura-pura sukses
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimitOk(ip)) {
    return NextResponse.json(
      { error: 'Terlalu banyak pesan terkirim. Silakan coba lagi nanti.' },
      { status: 429 },
    );
  }
  const { error } = await supabaseAdmin().from('pesan').insert(row);
  if (error) {
    return NextResponse.json(
      { error: 'Gagal menyimpan pesan. Silakan kirim email langsung ke LPPM.' },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
```

- [x] **Step 6: Verifikasi dengan curl** (dev server jalan, `.env.local` terisi):

- `curl -s http://localhost:3000/api/pengaturan` → Expected: JSON berisi 5 key `stat_*`
- `curl -s http://localhost:3000/api/berita` → Expected: `[]` (belum ada data)
- `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/berita -H "Content-Type: application/json" -d "{}"` → Expected: `401`
- `curl -s -X POST http://localhost:3000/api/pesan -H "Content-Type: application/json" -d '{"nama":"Tes","email":"tes@mail.com","jenis":"kontak","isi":"Halo LPPM, tes pesan."}'` → Expected: `{"ok":true}`
- Honeypot: kirim payload sama plus `"website":"http://spam.com"` → Expected: `{"ok":true}` TANPA baris baru di tabel `pesan` (cek via Supabase Table Editor: hanya 1 baris "Tes")

- [x] **Step 7: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add src/app/api
git commit -m "feat: API publik berita/dokumen/penelitian/pkm/publikasi/pengaturan + POST pesan"
```

---

### Task 6: API admin — item routes, pesan PATCH/DELETE, upload file

**Files:**
- Create: `src/app/api/dokumen/[id]/route.ts`, `src/app/api/penelitian/[id]/route.ts`, `src/app/api/pkm/[id]/route.ts`, `src/app/api/publikasi/[id]/route.ts`, `src/app/api/pesan/[id]/route.ts`, `src/app/api/upload/route.ts`

**Interfaces:**
- Consumes: `makeItemRoutes`, schema (Task 3), `requireAdmin`, `supabaseAdmin`.
- Produces:
  - `PUT/DELETE /api/{dokumen|penelitian|pkm|publikasi}/{id}` (admin)
  - `PATCH /api/pesan/{id}` body `{ status: 'baru'|'dibaca'|'selesai' }`; `DELETE /api/pesan/{id}` (admin)
  - `POST /api/upload` FormData `{ file, bucket: 'dokumen'|'gambar' }` → `{ url, nama_file, ukuran_bytes, tipe_file }`

- [x] **Step 1: Tulis empat item route** (pola identik, schema beda):

`src/app/api/dokumen/[id]/route.ts`:
```ts
import { makeItemRoutes } from '@/lib/crud';
import { dokumenSchema } from '@/lib/validation';

const item = makeItemRoutes({ table: 'dokumen', schema: dokumenSchema });
export const PUT = item.PUT;
export const DELETE = item.DELETE;
```

`src/app/api/penelitian/[id]/route.ts`:
```ts
import { makeItemRoutes } from '@/lib/crud';
import { penelitianSchema } from '@/lib/validation';

const item = makeItemRoutes({ table: 'penelitian', schema: penelitianSchema });
export const PUT = item.PUT;
export const DELETE = item.DELETE;
```

`src/app/api/pkm/[id]/route.ts`:
```ts
import { makeItemRoutes } from '@/lib/crud';
import { pkmSchema } from '@/lib/validation';

const item = makeItemRoutes({ table: 'pkm', schema: pkmSchema });
export const PUT = item.PUT;
export const DELETE = item.DELETE;
```

`src/app/api/publikasi/[id]/route.ts`:
```ts
import { makeItemRoutes } from '@/lib/crud';
import { publikasiSchema } from '@/lib/validation';

const item = makeItemRoutes({ table: 'publikasi', schema: publikasiSchema });
export const PUT = item.PUT;
export const DELETE = item.DELETE;
```

- [x] **Step 2: Tulis `src/app/api/pesan/[id]/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { pesanStatusSchema } from '@/lib/validation';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = pesanStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Status tidak valid.' }, { status: 400 });
  }
  const { error } = await supabaseAdmin()
    .from('pesan')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: 'Gagal memperbarui status.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const { error } = await supabaseAdmin().from('pesan').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Gagal menghapus pesan.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [x] **Step 3: Tulis `src/app/api/upload/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

const LIMITS = {
  dokumen: {
    max: 10 * 1024 * 1024,
    label: '10 MB',
    types: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  gambar: {
    max: 3 * 1024 * 1024,
    label: '3 MB',
    types: ['image/jpeg', 'image/png', 'image/webp'],
  },
} as const;

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const bucket = String(form?.get('bucket') ?? '');
  if (!(file instanceof File) || !(bucket in LIMITS)) {
    return NextResponse.json({ error: 'Permintaan upload tidak valid.' }, { status: 400 });
  }
  const cfg = LIMITS[bucket as keyof typeof LIMITS];
  if (!(cfg.types as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: 'Tipe file tidak diizinkan.' }, { status: 400 });
  }
  if (file.size > cfg.max) {
    return NextResponse.json({ error: `Ukuran file melebihi batas ${cfg.label}.` }, { status: 400 });
  }
  const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${Date.now()}-${safeName}`;
  const db = supabaseAdmin();
  const { error } = await db.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) return NextResponse.json({ error: 'Gagal mengunggah file.' }, { status: 500 });
  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({
    url: data.publicUrl,
    nama_file: file.name,
    ukuran_bytes: file.size,
    tipe_file: file.type,
  });
}
```

- [x] **Step 4: Verifikasi proteksi (tanpa login semua harus 401):**

- `curl -s -o /dev/null -w "%{http_code}" -X DELETE http://localhost:3000/api/penelitian/00000000-0000-0000-0000-000000000000` → `401`
- `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/upload` → `401`
- `curl -s -o /dev/null -w "%{http_code}" -X PATCH http://localhost:3000/api/pesan/00000000-0000-0000-0000-000000000000 -H "Content-Type: application/json" -d '{"status":"dibaca"}'` → `401`

- [x] **Step 5: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add src/app/api
git commit -m "feat: API admin item routes, status pesan, upload file ke Storage"
```

---

### Task 7: Layout panel admin + dashboard

**Files:**
- Create: `src/components/admin/Sidebar.tsx`, `src/app/admin/(panel)/layout.tsx`
- Modify: `src/app/admin/(panel)/page.tsx` (ganti placeholder Task 1 dengan dashboard)

**Interfaces:**
- Consumes: `<LogoutButton />` (Task 4), `supabaseAdmin()` (Task 2).
- Produces: layout sidebar untuk semua halaman `(panel)`; halaman dashboard di `/admin`.

- [x] **Step 1: Tulis `src/components/admin/Sidebar.tsx`:**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from './LogoutButton';

const items = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/berita', label: 'Berita & Agenda' },
  { href: '/admin/dokumen', label: 'Dokumen' },
  { href: '/admin/penelitian', label: 'Penelitian' },
  { href: '/admin/pkm', label: 'PkM' },
  { href: '/admin/publikasi', label: 'Publikasi' },
  { href: '/admin/pesan', label: 'Pesan Masuk' },
  { href: '/admin/pengaturan', label: 'Pengaturan' },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 shrink-0 bg-navy-900 text-white min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-white/10">
        <p className="font-bold">Admin LPPM</p>
        <p className="text-gold-400 text-xs">Universitas Sapta Mandiri</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`block px-3 py-2 rounded-lg text-sm ${
              path === it.href
                ? 'bg-gold-500 text-navy-900 font-semibold'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            {it.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <LogoutButton />
      </div>
    </aside>
  );
}
```

- [x] **Step 2: Tulis `src/app/admin/(panel)/layout.tsx`:**

```tsx
import Sidebar from '@/components/admin/Sidebar';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 bg-gray-100 min-w-0">{children}</main>
    </div>
  );
}
```

- [x] **Step 3: Ganti isi `src/app/admin/(panel)/page.tsx` dengan dashboard:**

```tsx
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';

const CARDS = [
  { table: 'berita', label: 'Berita & Agenda', href: '/admin/berita' },
  { table: 'dokumen', label: 'Dokumen', href: '/admin/dokumen' },
  { table: 'penelitian', label: 'Penelitian', href: '/admin/penelitian' },
  { table: 'pkm', label: 'PkM', href: '/admin/pkm' },
  { table: 'publikasi', label: 'Publikasi', href: '/admin/publikasi' },
] as const;

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const db = supabaseAdmin();
  const counts = await Promise.all(
    CARDS.map((c) => db.from(c.table).select('*', { count: 'exact', head: true })),
  );
  const { data: pesanBaru } = await db
    .from('pesan')
    .select('id, nama, jenis, subjek, created_at')
    .eq('status', 'baru')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {CARDS.map((c, i) => (
          <Link key={c.table} href={c.href} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md">
            <p className="text-3xl font-extrabold text-navy-800">{counts[i].count ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">{c.label}</p>
          </Link>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-navy-800">Pesan Baru</h2>
          <Link href="/admin/pesan" className="text-sm text-navy-600 hover:underline">Lihat semua</Link>
        </div>
        {!pesanBaru?.length && <p className="text-sm text-gray-400">Tidak ada pesan baru.</p>}
        <ul className="divide-y divide-gray-100">
          {pesanBaru?.map((p) => (
            <li key={p.id} className="py-2.5 text-sm">
              <span className="font-medium text-gray-800">{p.nama}</span>
              <span className="mx-2 text-xs px-2 py-0.5 rounded-full bg-navy-50 text-navy-700">{p.jenis}</span>
              <span className="text-gray-500">{p.subjek || '(tanpa subjek)'}</span>
              <span className="float-right text-xs text-gray-400">
                {new Date(p.created_at).toLocaleDateString('id-ID')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [x] **Step 4: Verifikasi di browser** — login ke `/admin`: sidebar tampil (8 menu), kartu jumlah tampil (semua 0 kecuali sudah ada data), bagian "Pesan Baru" berisi pesan tes dari Task 5.

- [x] **Step 5: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add src/components/admin/Sidebar.tsx "src/app/admin/(panel)"
git commit -m "feat: layout sidebar panel admin dan halaman dashboard"
```

---

### Task 8: Halaman admin — Berita & Agenda

**Files:**
- Create: `src/app/admin/(panel)/berita/page.tsx`

**Interfaces:**
- Consumes: `GET /api/berita?all=1`, `POST /api/berita`, `PUT/DELETE /api/berita/{id}`, `POST /api/upload` (bucket `gambar`).
- Produces: halaman `/admin/berita`.

- [x] **Step 1: Tulis `src/app/admin/(panel)/berita/page.tsx`:**

```tsx
'use client';

import { useEffect, useState } from 'react';

type Berita = {
  id: string;
  judul: string;
  slug: string;
  kategori: 'berita' | 'pengumuman' | 'agenda';
  ringkasan: string;
  konten: string;
  gambar_url: string | null;
  tanggal: string;
  published: boolean;
};

const KATEGORI = [
  { value: 'berita', label: 'Berita' },
  { value: 'pengumuman', label: 'Pengumuman' },
  { value: 'agenda', label: 'Agenda' },
];

const emptyForm = (): Partial<Berita> => ({
  judul: '',
  kategori: 'berita',
  ringkasan: '',
  konten: '',
  gambar_url: null,
  tanggal: new Date().toISOString().slice(0, 10),
  published: false,
});

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:ring-2 focus:ring-navy-800/20 outline-none';

export default function BeritaAdminPage() {
  const [rows, setRows] = useState<Berita[]>([]);
  const [form, setForm] = useState<Partial<Berita> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/berita?all=1');
    setRows(res.ok ? await res.json() : []);
  }
  useEffect(() => { load(); }, []);

  function set<K extends keyof Berita>(k: K, v: Berita[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadGambar(file: File) {
    setBusy(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bucket', 'gambar');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || 'Gagal mengunggah gambar.'); return; }
    set('gambar_url', json.url);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError('');
    const payload = {
      judul: form.judul,
      kategori: form.kategori,
      ringkasan: form.ringkasan ?? '',
      konten: form.konten ?? '',
      gambar_url: form.gambar_url ?? null,
      tanggal: form.tanggal,
      published: !!form.published,
    };
    const res = await fetch(form.id ? `/api/berita/${form.id}` : '/api/berita', {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || 'Gagal menyimpan.'); return; }
    setForm(null);
    load();
  }

  async function togglePublish(b: Berita) {
    await fetch(`/api/berita/${b.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !b.published }),
    });
    load();
  }

  async function remove(b: Berita) {
    if (!confirm(`Hapus "${b.judul}"?`)) return;
    await fetch(`/api/berita/${b.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy-800">Berita &amp; Agenda</h1>
        <button
          onClick={() => setForm(emptyForm())}
          className="rounded-lg bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-4 py-2"
        >
          + Tulis Baru
        </button>
      </div>

      {form && (
        <form onSubmit={save} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-bold text-navy-800">{form.id ? 'Edit' : 'Tulis'} Berita</h2>
          {error && <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</p>}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Judul</label>
              <input className={inputCls} value={form.judul ?? ''} onChange={(e) => set('judul', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategori</label>
              <select className={inputCls} value={form.kategori} onChange={(e) => set('kategori', e.target.value as Berita['kategori'])}>
                {KATEGORI.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tanggal</label>
              <input type="date" className={inputCls} value={form.tanggal ?? ''} onChange={(e) => set('tanggal', e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Gambar (opsional, maks 3 MB)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="text-sm"
                onChange={(e) => e.target.files?.[0] && uploadGambar(e.target.files[0])}
              />
              {form.gambar_url && (
                <img src={form.gambar_url} alt="Pratinjau" className="mt-2 h-20 rounded-lg object-cover" />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ringkasan</label>
            <input className={inputCls} value={form.ringkasan ?? ''} onChange={(e) => set('ringkasan', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Konten (markdown sederhana: `## Judul`, `**tebal**`, `- daftar`)
            </label>
            <textarea rows={10} className={inputCls} value={form.konten ?? ''} onChange={(e) => set('konten', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.published} onChange={(e) => set('published', e.target.checked)} />
            Publikasikan sekarang
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2">
              {busy ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-gray-300 text-sm px-4 py-2">
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-800 text-white text-left">
              <th className="px-4 py-3 font-medium">Judul</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Tanggal</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Belum ada berita.</td></tr>
            )}
            {rows.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium text-gray-800">{b.judul}</td>
                <td className="px-4 py-3 capitalize">{b.kategori}</td>
                <td className="px-4 py-3">{new Date(b.tanggal + 'T00:00:00').toLocaleDateString('id-ID')}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => togglePublish(b)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      b.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {b.published ? 'Tayang' : 'Draf'}
                  </button>
                </td>
                <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                  <button onClick={() => setForm(b)} className="text-navy-600 hover:underline">Edit</button>
                  <button onClick={() => remove(b)} className="text-red-600 hover:underline">Hapus</button>
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

- [x] **Step 2: Verifikasi di browser** — di `/admin/berita`: buat berita baru dengan gambar, simpan sebagai draf → muncul di tabel berstatus "Draf"; klik badge → jadi "Tayang". Cek publik: `curl -s http://localhost:3000/api/berita | grep -c "judul"` → `1`; toggle kembali ke Draf → `curl` publik mengembalikan `[]`.

- [x] **Step 3: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add "src/app/admin/(panel)/berita"
git commit -m "feat: halaman admin berita & agenda dengan upload gambar dan publish toggle"
```

---

### Task 9: Halaman admin — Dokumen

**Files:**
- Create: `src/app/admin/(panel)/dokumen/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/dokumen`, `PUT/DELETE /api/dokumen/{id}`, `POST /api/upload` (bucket `dokumen`).
- Produces: halaman `/admin/dokumen`.

- [x] **Step 1: Tulis `src/app/admin/(panel)/dokumen/page.tsx`:**

```tsx
'use client';

import { useEffect, useState } from 'react';

type Dokumen = {
  id: string;
  judul: string;
  kategori: 'pedoman' | 'template' | 'sk' | 'laporan' | 'lainnya';
  deskripsi: string;
  file_url: string;
  nama_file: string;
  ukuran_bytes: number;
  tipe_file: string;
};

const KATEGORI = [
  { value: 'pedoman', label: 'Pedoman' },
  { value: 'template', label: 'Template' },
  { value: 'sk', label: 'SK & Kebijakan' },
  { value: 'laporan', label: 'Laporan' },
  { value: 'lainnya', label: 'Lainnya' },
];

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:ring-2 focus:ring-navy-800/20 outline-none';

const fmtSize = (b: number) =>
  b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

export default function DokumenAdminPage() {
  const [rows, setRows] = useState<Dokumen[]>([]);
  const [form, setForm] = useState<Partial<Dokumen> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/dokumen');
    setRows(res.ok ? await res.json() : []);
  }
  useEffect(() => { load(); }, []);

  function set<K extends keyof Dokumen>(k: K, v: Dokumen[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadFile(file: File) {
    setBusy(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bucket', 'dokumen');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || 'Gagal mengunggah file.'); return; }
    setForm((f) => ({
      ...f,
      file_url: json.url,
      nama_file: json.nama_file,
      ukuran_bytes: json.ukuran_bytes,
      tipe_file: json.tipe_file,
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.file_url) { setError('File wajib diunggah.'); return; }
    setBusy(true);
    setError('');
    const payload = {
      judul: form.judul,
      kategori: form.kategori ?? 'pedoman',
      deskripsi: form.deskripsi ?? '',
      file_url: form.file_url,
      nama_file: form.nama_file,
      ukuran_bytes: form.ukuran_bytes ?? 0,
      tipe_file: form.tipe_file ?? '',
    };
    const res = await fetch(form.id ? `/api/dokumen/${form.id}` : '/api/dokumen', {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || 'Gagal menyimpan.'); return; }
    setForm(null);
    load();
  }

  async function remove(d: Dokumen) {
    if (!confirm(`Hapus dokumen "${d.judul}"?`)) return;
    await fetch(`/api/dokumen/${d.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy-800">Dokumen &amp; Template</h1>
        <button
          onClick={() => setForm({ kategori: 'pedoman' })}
          className="rounded-lg bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-4 py-2"
        >
          + Unggah Dokumen
        </button>
      </div>

      {form && (
        <form onSubmit={save} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-bold text-navy-800">{form.id ? 'Edit' : 'Unggah'} Dokumen</h2>
          {error && <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</p>}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Judul</label>
              <input className={inputCls} value={form.judul ?? ''} onChange={(e) => set('judul', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategori</label>
              <select className={inputCls} value={form.kategori} onChange={(e) => set('kategori', e.target.value as Dokumen['kategori'])}>
                {KATEGORI.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deskripsi</label>
            <input className={inputCls} value={form.deskripsi ?? ''} onChange={(e) => set('deskripsi', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">File (PDF/DOC/DOCX/XLS/XLSX, maks 10 MB)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              className="text-sm"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
            />
            {form.nama_file && (
              <p className="mt-1 text-xs text-gray-500">
                Terunggah: {form.nama_file} ({fmtSize(form.ukuran_bytes ?? 0)})
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2">
              {busy ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-gray-300 text-sm px-4 py-2">
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-800 text-white text-left">
              <th className="px-4 py-3 font-medium">Judul</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">Ukuran</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Belum ada dokumen.</td></tr>
            )}
            {rows.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium text-gray-800">{d.judul}</td>
                <td className="px-4 py-3 capitalize">{d.kategori}</td>
                <td className="px-4 py-3">
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-navy-600 hover:underline">
                    {d.nama_file}
                  </a>
                </td>
                <td className="px-4 py-3">{fmtSize(d.ukuran_bytes)}</td>
                <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                  <button onClick={() => setForm(d)} className="text-navy-600 hover:underline">Edit</button>
                  <button onClick={() => remove(d)} className="text-red-600 hover:underline">Hapus</button>
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

- [x] **Step 2: Verifikasi di browser** — unggah satu PDF asli (mis. `RKT LPPM 2024-2029.pdf` dari root repo) → muncul di tabel, link file bisa dibuka (URL Supabase Storage). Uji tolak: coba file > 10 MB atau .txt → pesan error tampil.

- [x] **Step 3: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add "src/app/admin/(panel)/dokumen"
git commit -m "feat: halaman admin dokumen dengan upload ke Supabase Storage"
```

---

### Task 10: Komponen ResourceCrud + halaman penelitian, PkM, publikasi

**Files:**
- Create: `src/components/admin/ResourceCrud.tsx`, `src/app/admin/(panel)/penelitian/page.tsx`, `src/app/admin/(panel)/pkm/page.tsx`, `src/app/admin/(panel)/publikasi/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/{resource}`, `PUT/DELETE /api/{resource}/{id}`.
- Produces: `<ResourceCrud resource title fields columns />` dengan tipe:
  - `Field = { name: string; label: string; type: 'text'|'textarea'|'number'|'date'|'select'; options?: {value,label}[]; required?: boolean }`
  - `Column = { key: string; label: string }`

- [x] **Step 1: Tulis `src/components/admin/ResourceCrud.tsx`:**

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';

export type Field = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select';
  options?: { value: string; label: string }[];
  required?: boolean;
};

export type Column = { key: string; label: string };

type Row = Record<string, unknown> & { id: string };

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:ring-2 focus:ring-navy-800/20 outline-none';

export default function ResourceCrud({
  resource,
  title,
  fields,
  columns,
}: {
  resource: string;
  title: string;
  fields: Field[];
  columns: Column[];
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/${resource}`);
    setRows(res.ok ? await res.json() : []);
  }, [resource]);
  useEffect(() => { load(); }, [load]);

  function openNew() {
    const init: Record<string, unknown> = {};
    for (const f of fields) init[f.name] = f.type === 'select' ? f.options?.[0]?.value ?? '' : '';
    setForm(init);
    setError('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError('');
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      payload[f.name] = f.type === 'number' ? Number(form[f.name] ?? 0) : form[f.name] ?? '';
    }
    const id = form.id as string | undefined;
    const res = await fetch(id ? `/api/${resource}/${id}` : `/api/${resource}`, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || 'Gagal menyimpan.'); return; }
    setForm(null);
    load();
  }

  async function remove(row: Row) {
    if (!confirm('Hapus data ini?')) return;
    await fetch(`/api/${resource}/${row.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy-800">{title}</h1>
        <button onClick={openNew} className="rounded-lg bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-4 py-2">
          + Tambah
        </button>
      </div>

      {form && (
        <form onSubmit={save} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-bold text-navy-800">{form.id ? 'Edit' : 'Tambah'} {title}</h2>
          {error && <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.name} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="block text-sm font-medium mb-1">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    className={inputCls}
                    value={String(form[f.name] ?? '')}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  >
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    className={inputCls}
                    value={String(form[f.name] ?? '')}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                ) : (
                  <input
                    type={f.type}
                    className={inputCls}
                    value={String(form[f.name] ?? '')}
                    required={f.required}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2">
              {busy ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-gray-300 text-sm px-4 py-2">
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-800 text-white text-left">
              {columns.map((c) => <th key={c.key} className="px-4 py-3 font-medium">{c.label}</th>)}
              <th className="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && (
              <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400">Belum ada data.</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-gray-800">{String(row[c.key] ?? '')}</td>
                ))}
                <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                  <button onClick={() => { setForm(row); setError(''); }} className="text-navy-600 hover:underline">Edit</button>
                  <button onClick={() => remove(row)} className="text-red-600 hover:underline">Hapus</button>
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

- [x] **Step 2: Tulis tiga halaman entitas.**

`src/app/admin/(panel)/penelitian/page.tsx`:
```tsx
'use client';

import ResourceCrud from '@/components/admin/ResourceCrud';

const STATUS = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'proses', label: 'Proses' },
  { value: 'selesai', label: 'Selesai' },
];

export default function PenelitianAdminPage() {
  return (
    <ResourceCrud
      resource="penelitian"
      title="Penelitian"
      fields={[
        { name: 'judul', label: 'Judul', type: 'text', required: true },
        { name: 'ketua', label: 'Ketua', type: 'text', required: true },
        { name: 'anggota', label: 'Anggota', type: 'textarea' },
        { name: 'skema', label: 'Skema', type: 'text' },
        { name: 'tahun', label: 'Tahun', type: 'number', required: true },
        { name: 'sumber_dana', label: 'Sumber Dana', type: 'text' },
        { name: 'status', label: 'Status', type: 'select', options: STATUS, required: true },
      ]}
      columns={[
        { key: 'judul', label: 'Judul' },
        { key: 'ketua', label: 'Ketua' },
        { key: 'tahun', label: 'Tahun' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
```

`src/app/admin/(panel)/pkm/page.tsx`:
```tsx
'use client';

import ResourceCrud from '@/components/admin/ResourceCrud';

const STATUS = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'proses', label: 'Proses' },
  { value: 'selesai', label: 'Selesai' },
];

export default function PkmAdminPage() {
  return (
    <ResourceCrud
      resource="pkm"
      title="Pengabdian kepada Masyarakat"
      fields={[
        { name: 'judul', label: 'Judul', type: 'text', required: true },
        { name: 'ketua', label: 'Ketua', type: 'text', required: true },
        { name: 'anggota', label: 'Anggota', type: 'textarea' },
        { name: 'skema', label: 'Skema', type: 'text' },
        { name: 'tahun', label: 'Tahun', type: 'number', required: true },
        { name: 'sumber_dana', label: 'Sumber Dana', type: 'text' },
        { name: 'status', label: 'Status', type: 'select', options: STATUS, required: true },
      ]}
      columns={[
        { key: 'judul', label: 'Judul' },
        { key: 'ketua', label: 'Ketua' },
        { key: 'tahun', label: 'Tahun' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
```

`src/app/admin/(panel)/publikasi/page.tsx`:
```tsx
'use client';

import ResourceCrud from '@/components/admin/ResourceCrud';

const JENIS = [
  { value: 'artikel', label: 'Artikel Jurnal' },
  { value: 'buku', label: 'Buku' },
  { value: 'hki', label: 'HKI' },
  { value: 'inovasi', label: 'Produk Inovasi' },
];

export default function PublikasiAdminPage() {
  return (
    <ResourceCrud
      resource="publikasi"
      title="Publikasi & Luaran"
      fields={[
        { name: 'judul', label: 'Judul', type: 'text', required: true },
        { name: 'penulis', label: 'Penulis', type: 'text', required: true },
        { name: 'jenis', label: 'Jenis', type: 'select', options: JENIS, required: true },
        { name: 'penerbit', label: 'Jurnal / Penerbit / No. HKI', type: 'text' },
        { name: 'tahun', label: 'Tahun', type: 'number', required: true },
        { name: 'tautan', label: 'Tautan (URL)', type: 'text' },
        { name: 'indeksasi', label: 'Indeksasi (Sinta/Scopus/dll)', type: 'text' },
      ]}
      columns={[
        { key: 'judul', label: 'Judul' },
        { key: 'penulis', label: 'Penulis' },
        { key: 'jenis', label: 'Jenis' },
        { key: 'tahun', label: 'Tahun' },
      ]}
    />
  );
}
```

- [x] **Step 3: Verifikasi di browser** — tambah 1 penelitian, 1 PkM, 1 publikasi; edit salah satu; hapus dan konfirmasi dialog muncul. `curl -s http://localhost:3000/api/penelitian | grep -c judul` → `1`.

- [x] **Step 4: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add src/components/admin/ResourceCrud.tsx "src/app/admin/(panel)/penelitian" "src/app/admin/(panel)/pkm" "src/app/admin/(panel)/publikasi"
git commit -m "feat: komponen ResourceCrud + halaman admin penelitian, PkM, publikasi"
```

---

### Task 11: Halaman admin — Pesan Masuk + Pengaturan

**Files:**
- Create: `src/app/admin/(panel)/pesan/page.tsx`, `src/app/admin/(panel)/pengaturan/page.tsx`

**Interfaces:**
- Consumes: `GET /api/pesan`, `PATCH/DELETE /api/pesan/{id}`, `GET/PUT /api/pengaturan`.
- Produces: halaman `/admin/pesan` dan `/admin/pengaturan`.

- [x] **Step 1: Tulis `src/app/admin/(panel)/pesan/page.tsx`:**

```tsx
'use client';

import { useEffect, useState } from 'react';

type Pesan = {
  id: string;
  nama: string;
  email: string;
  telepon: string;
  jenis: 'kontak' | 'konsultasi' | 'kerjasama';
  subjek: string;
  isi: string;
  status: 'baru' | 'dibaca' | 'selesai';
  created_at: string;
};

const STATUS_CLS: Record<Pesan['status'], string> = {
  baru: 'bg-amber-100 text-amber-700',
  dibaca: 'bg-blue-100 text-blue-700',
  selesai: 'bg-green-100 text-green-700',
};

export default function PesanAdminPage() {
  const [rows, setRows] = useState<Pesan[]>([]);
  const [selected, setSelected] = useState<Pesan | null>(null);

  async function load() {
    const res = await fetch('/api/pesan');
    setRows(res.ok ? await res.json() : []);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(p: Pesan, status: Pesan['status']) {
    await fetch(`/api/pesan/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSelected((s) => (s && s.id === p.id ? { ...s, status } : s));
    load();
  }

  async function open(p: Pesan) {
    setSelected(p);
    if (p.status === 'baru') setStatus(p, 'dibaca');
  }

  async function remove(p: Pesan) {
    if (!confirm(`Hapus pesan dari ${p.nama}?`)) return;
    await fetch(`/api/pesan/${p.id}`, { method: 'DELETE' });
    setSelected(null);
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800 mb-6">Pesan Masuk</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {!rows.length && <p className="px-4 py-8 text-center text-gray-400 text-sm">Belum ada pesan.</p>}
          {rows.map((p) => (
            <button
              key={p.id}
              onClick={() => open(p)}
              className={`w-full text-left px-4 py-3 hover:bg-navy-50 ${selected?.id === p.id ? 'bg-navy-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-gray-800">{p.nama}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[p.status]}`}>
                  {p.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="capitalize">{p.jenis}</span> · {p.subjek || '(tanpa subjek)'} ·{' '}
                {new Date(p.created_at).toLocaleDateString('id-ID')}
              </p>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {!selected ? (
            <p className="text-gray-400 text-sm">Pilih pesan untuk membaca.</p>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-bold text-navy-800">{selected.subjek || '(tanpa subjek)'}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selected.nama} &lt;{selected.email}&gt;
                    {selected.telepon && ` · ${selected.telepon}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(selected.created_at).toLocaleString('id-ID')} · <span className="capitalize">{selected.jenis}</span>
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[selected.status]}`}>
                  {selected.status}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap border-t border-gray-100 pt-4 mb-6">
                {selected.isi}
              </p>
              <div className="flex gap-2">
                {selected.status !== 'selesai' && (
                  <button
                    onClick={() => setStatus(selected, 'selesai')}
                    className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2"
                  >
                    Tandai Selesai
                  </button>
                )}
                <a
                  href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subjek || 'Pesan Anda ke LPPM UnivSM')}`}
                  className="rounded-lg border border-gray-300 text-sm px-4 py-2"
                >
                  Balas via Email
                </a>
                <button onClick={() => remove(selected)} className="rounded-lg border border-red-300 text-red-600 text-sm px-4 py-2">
                  Hapus
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Tulis `src/app/admin/(panel)/pengaturan/page.tsx`:**

```tsx
'use client';

import { useEffect, useState } from 'react';

const STATS = [
  { key: 'stat_penelitian', label: 'Penelitian Aktif' },
  { key: 'stat_pkm', label: 'Kegiatan PkM' },
  { key: 'stat_publikasi', label: 'Publikasi' },
  { key: 'stat_hki', label: 'HKI Terdaftar' },
  { key: 'stat_mitra', label: 'Mitra Aktif' },
];

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:ring-2 focus:ring-navy-800/20 outline-none';

export default function PengaturanAdminPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/pengaturan')
      .then((r) => r.json())
      .then(setValues)
      .catch(() => setError('Gagal memuat pengaturan.'));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setError('');
    const res = await fetch('/api/pengaturan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || 'Gagal menyimpan.'); return; }
    setMsg('Pengaturan tersimpan.');
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-navy-800 mb-2">Pengaturan</h1>
      <p className="text-sm text-gray-500 mb-6">Angka statistik yang tampil di beranda situs publik.</p>
      <form onSubmit={save} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        {msg && <p className="rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">{msg}</p>}
        {error && <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</p>}
        {STATS.map((s) => (
          <div key={s.key}>
            <label className="block text-sm font-medium mb-1">{s.label}</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={values[s.key] ?? ''}
              onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
              required
            />
          </div>
        ))}
        <button type="submit" disabled={busy} className="rounded-lg bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2">
          {busy ? 'Menyimpan...' : 'Simpan'}
        </button>
      </form>
    </div>
  );
}
```

- [x] **Step 3: Verifikasi di browser** — `/admin/pesan`: pesan tes Task 5 tampil berstatus `baru`; klik → status jadi `dibaca`; "Tandai Selesai" → `selesai`. `/admin/pengaturan`: ubah "Penelitian Aktif" jadi 50 → simpan → `curl -s http://localhost:3000/api/pengaturan` menunjukkan `"stat_penelitian":"50"`; kembalikan ke 45.

- [x] **Step 4: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add "src/app/admin/(panel)/pesan" "src/app/admin/(panel)/pengaturan"
git commit -m "feat: halaman admin pesan masuk dan pengaturan statistik"
```

---

### Task 12: Integrasi situs publik — api-content.js, edit HTML, form nyata

**Files:**
- Create: `public/assets/js/api-content.js`
- Modify: `public/assets/js/main.js` (fungsi `initForms`), `public/index.html`, `public/berita.html`, `public/dokumen.html`, `public/publikasi.html`, `public/penelitian.html`, `public/pkm.html`, `public/kontak.html`, `public/kerjasama.html`

**Interfaces:**
- Consumes: `GET /api/pengaturan`, `GET /api/berita[?limit|/slug]`, `GET /api/dokumen`, `GET /api/penelitian`, `GET /api/pkm`, `GET /api/publikasi`, `POST /api/pesan`.
- Produces: konten dinamis di situs publik. Kontrak DOM (id/atribut yang dicari `api-content.js`):
  - `[data-stat="penelitian|pkm|publikasi|hki|mitra"]` pada elemen counter beranda
  - `#list-berita-index` (grid 3 kartu beranda), `#list-berita` + `#berita-list-section` + `#berita-detail` (halaman berita)
  - `#list-dokumen` (kontainer kartu `.doc-card`)
  - `#list-penelitian`, `#list-pkm`, `#list-publikasi` (tbody tabel)
  - `form[data-ajax-form]` dengan `data-jenis` + input `name="nama|email|telepon|subjek|isi"` + honeypot `name="website"`

**PENTING:** Konten statis yang ada TIDAK dihapus — hanya diberi id/atribut. JS mengganti isinya hanya bila fetch sukses DAN ada data.

- [x] **Step 1: Tulis `public/assets/js/api-content.js`:**

```js
/* ================================================================
   LPPM UnivSM — Pengisi konten dinamis dari API panel admin.
   Konten statis di HTML adalah fallback: hanya diganti bila
   fetch sukses dan data tersedia.
   ================================================================ */

'use strict';

(function () {
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmtTgl = (iso) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

  const fmtSize = (b) =>
    b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

  async function getJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  /* Markdown mini: ## judul, **tebal**, - daftar, paragraf */
  function md(text) {
    const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    let html = '';
    let inList = false;
    for (const raw of String(text || '').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) { if (inList) { html += '</ul>'; inList = false; } continue; }
      if (line.startsWith('- ')) {
        if (!inList) { html += '<ul class="list-disc pl-6 mb-4 space-y-1">'; inList = true; }
        html += '<li>' + inline(line.slice(2)) + '</li>';
        continue;
      }
      if (inList) { html += '</ul>'; inList = false; }
      if (line.startsWith('## ')) {
        html += '<h3 class="text-xl font-bold text-navy-800 mt-6 mb-3">' + inline(line.slice(3)) + '</h3>';
        continue;
      }
      html += '<p class="mb-4 leading-relaxed">' + inline(line) + '</p>';
    }
    if (inList) html += '</ul>';
    return html;
  }

  /* ── Statistik beranda ── */
  async function fillStats() {
    const els = document.querySelectorAll('[data-stat]');
    if (!els.length) return;
    const stats = await getJson('/api/pengaturan');
    els.forEach((el) => {
      const v = stats['stat_' + el.dataset.stat];
      if (v === undefined) return;
      el.dataset.counter = v;
      if (el.dataset.done) el.textContent = Number(v).toLocaleString('id-ID');
    });
  }

  /* ── Kartu berita ── */
  const KAT_BADGE = {
    berita: 'bg-blue-100 text-blue-700',
    pengumuman: 'bg-amber-100 text-amber-700',
    agenda: 'bg-green-100 text-green-700',
  };

  function beritaCard(b) {
    const img = b.gambar_url
      ? '<img src="' + esc(b.gambar_url) + '" alt="' + esc(b.judul) + '" class="w-full h-44 object-cover">'
      : '<div class="w-full h-44 bg-navy-100 flex items-center justify-center text-navy-300 text-4xl"><i class="ri-newspaper-line"></i></div>';
    return (
      '<article class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden card-hover">' + img +
      '<div class="p-5">' +
      '<div class="flex items-center gap-2 mb-2">' +
      '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ' + (KAT_BADGE[b.kategori] || KAT_BADGE.berita) + '">' + esc(b.kategori) + '</span>' +
      '<span class="text-xs text-gray-400">' + fmtTgl(b.tanggal) + '</span>' +
      '</div>' +
      '<h3 class="font-bold text-navy-800 mb-2 leading-snug"><a href="berita.html?slug=' + encodeURIComponent(b.slug) + '" class="hover:text-navy-600">' + esc(b.judul) + '</a></h3>' +
      '<p class="text-gray-500 text-sm">' + esc(b.ringkasan) + '</p>' +
      '</div></article>'
    );
  }

  async function fillBeritaIndex() {
    const wrap = document.getElementById('list-berita-index');
    if (!wrap) return;
    const data = await getJson('/api/berita?limit=3');
    if (data.length) wrap.innerHTML = data.map(beritaCard).join('');
  }

  async function fillBeritaPage() {
    const wrap = document.getElementById('list-berita');
    if (!wrap) return;
    const slug = new URLSearchParams(location.search).get('slug');
    if (slug) return showBeritaDetail(slug);
    const data = await getJson('/api/berita');
    if (data.length) wrap.innerHTML = data.map(beritaCard).join('');
  }

  async function showBeritaDetail(slug) {
    const detail = document.getElementById('berita-detail');
    if (!detail) return;
    const b = await getJson('/api/berita/' + encodeURIComponent(slug));
    detail.querySelector('[data-d-judul]').textContent = b.judul;
    detail.querySelector('[data-d-meta]').textContent =
      b.kategori.charAt(0).toUpperCase() + b.kategori.slice(1) + ' — ' + fmtTgl(b.tanggal);
    const img = detail.querySelector('[data-d-gambar]');
    if (b.gambar_url) { img.src = b.gambar_url; img.alt = b.judul; img.classList.remove('hidden'); }
    detail.querySelector('[data-d-konten]').innerHTML = md(b.konten);
    const list = document.getElementById('berita-list-section');
    if (list) list.classList.add('hidden');
    detail.classList.remove('hidden');
    document.title = b.judul + ' — LPPM Universitas Sapta Mandiri';
  }

  /* ── Dokumen ── */
  const DOK_STYLE = {
    pedoman: { icon: 'ri-book-2-line', cls: 'bg-blue-100 text-blue-600' },
    template: { icon: 'ri-file-word-line', cls: 'bg-indigo-100 text-indigo-600' },
    sk: { icon: 'ri-stamp-line', cls: 'bg-red-100 text-red-600' },
    laporan: { icon: 'ri-file-chart-line', cls: 'bg-green-100 text-green-600' },
    lainnya: { icon: 'ri-file-line', cls: 'bg-gray-100 text-gray-600' },
  };

  async function fillDokumen() {
    const wrap = document.getElementById('list-dokumen');
    if (!wrap) return;
    const data = await getJson('/api/dokumen');
    if (!data.length) return;
    wrap.innerHTML = data.map((d) => {
      const st = DOK_STYLE[d.kategori] || DOK_STYLE.lainnya;
      return (
        '<a href="' + esc(d.file_url) + '" target="_blank" rel="noopener" class="doc-card" ' +
        'data-doc-item="' + esc(d.judul) + '" data-doc-cat="' + esc(d.kategori) + '">' +
        '<div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ' + st.cls + '"><i class="' + st.icon + '"></i></div>' +
        '<div class="min-w-0">' +
        '<p class="font-semibold text-sm text-gray-800 leading-snug">' + esc(d.judul) + '</p>' +
        (d.deskripsi ? '<p class="text-xs text-gray-500 mt-0.5">' + esc(d.deskripsi) + '</p>' : '') +
        '<p class="text-xs text-gray-400 mt-1"><i class="ri-download-2-line"></i> ' + esc(d.nama_file) + ' · ' + fmtSize(d.ukuran_bytes) + '</p>' +
        '</div></a>'
      );
    }).join('');
  }

  /* ── Tabel penelitian / PkM / publikasi ── */
  const BADGE = { aktif: 'badge-aktif', proses: 'badge-proses', selesai: 'badge-selesai' };

  const rowKegiatan = (r) =>
    '<tr>' +
    '<td><span class="font-medium text-gray-800">' + esc(r.judul) + '</span><br>' +
    '<span class="text-xs text-gray-500">' + esc(r.ketua) + (r.anggota ? '; ' + esc(r.anggota) : '') + '</span></td>' +
    '<td>' + esc(r.skema) + '</td>' +
    '<td>' + esc(r.tahun) + '</td>' +
    '<td><span class="' + (BADGE[r.status] || 'badge-proses') + ' capitalize">' + esc(r.status) + '</span></td>' +
    '</tr>';

  const rowPublikasi = (r) =>
    '<tr>' +
    '<td>' + (r.tautan
      ? '<a href="' + esc(r.tautan) + '" target="_blank" rel="noopener" class="font-medium text-navy-700 hover:underline">' + esc(r.judul) + '</a>'
      : '<span class="font-medium text-gray-800">' + esc(r.judul) + '</span>') + '</td>' +
    '<td>' + esc(r.penulis) + '</td>' +
    '<td class="capitalize">' + esc(r.jenis) + '</td>' +
    '<td>' + esc(r.penerbit) + '</td>' +
    '<td>' + esc(r.tahun) + '</td>' +
    '</tr>';

  async function fillTable(id, url, rowFn) {
    const tbody = document.getElementById(id);
    if (!tbody) return;
    const data = await getJson(url);
    if (data.length) tbody.innerHTML = data.map(rowFn).join('');
  }

  /* ── Init (kegagalan dibiarkan senyap — fallback statis tampil) ── */
  document.addEventListener('DOMContentLoaded', () => {
    [
      fillStats(),
      fillBeritaIndex(),
      fillBeritaPage(),
      fillDokumen(),
      fillTable('list-penelitian', '/api/penelitian', rowKegiatan),
      fillTable('list-pkm', '/api/pkm', rowKegiatan),
      fillTable('list-publikasi', '/api/publikasi', rowPublikasi),
    ].forEach((p) => p.catch((err) => console.warn('api-content:', err.message)));
  });
})();
```

- [x] **Step 2: Ganti fungsi `initForms` di `public/assets/js/main.js`** — hapus seluruh fungsi `initForms` lama (yang memakai `setTimeout` simulasi) dan ganti dengan:

```js
/* ── Contact / consultation form (POST nyata ke /api/pesan) ────── */
function initForms() {
  document.querySelectorAll('form[data-ajax-form]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg class="animate-spin w-4 h-4 mr-2 inline" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/></svg>Mengirim...';
      btn.disabled = true;

      const fd = new FormData(form);
      const body = {
        nama: fd.get('nama') || '',
        email: fd.get('email') || '',
        telepon: fd.get('telepon') || '',
        jenis: form.dataset.jenis || 'kontak',
        subjek: fd.get('subjek') || '',
        isi: fd.get('isi') || '',
        website: fd.get('website') || '', // honeypot
      };

      try {
        const res = await fetch('/api/pesan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Gagal mengirim pesan.');

        const wrapper = form.closest('[data-form-wrap]') || form.parentElement;
        wrapper.innerHTML = `
          <div class="text-center py-14">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">Pesan Berhasil Terkirim!</h3>
            <p class="text-gray-500 max-w-sm mx-auto">Tim LPPM akan menghubungi Anda melalui email atau telepon dalam 1–2 hari kerja.</p>
          </div>`;
      } catch (err) {
        btn.innerHTML = orig;
        btn.disabled = false;
        alert(err.message + '\nJika masalah berlanjut, silakan kirim email langsung ke LPPM.');
      }
    });
  });
}
```

- [x] **Step 3: Edit `public/index.html`.**

1. Pada 5 elemen counter statistik (section STATISTIK, elemen dengan `data-counter`), tambahkan atribut `data-stat` sesuai urutan label: `data-stat="penelitian"` (Penelitian Aktif), `data-stat="pkm"` (Kegiatan PkM), `data-stat="publikasi"` (Publikasi), `data-stat="hki"` (HKI Terdaftar), `data-stat="mitra"` (Mitra Aktif). Contoh hasil:
   ```html
   <div class="text-3xl sm:text-4xl font-extrabold text-gold-400 counter-val" data-counter="45" data-stat="penelitian">0</div>
   ```
2. Di section `PENGUMUMAN + BERITA`, cari kontainer grid yang berisi kartu-kartu berita statis (cek dengan `grep -n "BERITA" public/index.html` lalu baca sekitarnya) dan tambahkan `id="list-berita-index"` ke elemen grid tersebut. Jika grid memuat campuran (pengumuman + berita), pilih kontainer kartu beritanya saja.
3. Tepat sebelum `<script src="assets/js/main.js"></script>` (atau path serupa di bagian bawah file), tambahkan:
   ```html
   <script src="assets/js/api-content.js" defer></script>
   ```

- [x] **Step 4: Edit `public/berita.html`.**

1. Bungkus/tandai section daftar berita: tambahkan `id="berita-list-section"` pada elemen `<section>` (atau `<main>` anak pertama) yang memuat daftar kartu berita, dan `id="list-berita"` pada kontainer grid kartunya.
2. Tambahkan section detail (hidden) tepat sebelum penutup `</main>` atau sebelum footer:
   ```html
   <!-- ===== DETAIL BERITA (diisi api-content.js) ===== -->
   <section id="berita-detail" class="hidden py-16 bg-white">
     <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
       <a href="berita.html" class="text-sm text-navy-600 hover:underline"><i class="ri-arrow-left-line"></i> Kembali ke daftar berita</a>
       <h1 data-d-judul class="text-3xl font-extrabold text-navy-800 mt-4 mb-2"></h1>
       <p data-d-meta class="text-sm text-gray-400 mb-6"></p>
       <img data-d-gambar src="" alt="" class="hidden w-full rounded-2xl mb-6">
       <div data-d-konten class="text-gray-700"></div>
     </div>
   </section>
   ```
3. Tambahkan `<script src="assets/js/api-content.js" defer></script>` sebelum script main.js.

- [x] **Step 5: Edit `public/dokumen.html`.**

1. Tambahkan `id="list-dokumen"` pada kontainer yang memuat kartu-kartu `.doc-card` (cek: `grep -n "doc-card" public/dokumen.html | head -3`, lalu cari parent grid-nya). Item hasil render JS membawa `data-doc-item` dan `data-doc-cat`, jadi pencarian dan filter kategori yang ada tetap berfungsi.
2. Tambahkan `<script src="assets/js/api-content.js" defer></script>` sebelum script main.js.

- [x] **Step 6: Edit `public/penelitian.html`, `public/pkm.html`, `public/publikasi.html`.**

1. Di masing-masing file cari tabel daftar (`grep -n "data-table" public/penelitian.html`). Tambahkan id pada `<tbody>`-nya: `id="list-penelitian"` / `id="list-pkm"` / `id="list-publikasi"`.
2. PENTING: pastikan urutan kolom `<thead>` tabel cocok dengan renderer JS — kegiatan: Judul (dengan ketua/anggota), Skema, Tahun, Status; publikasi: Judul, Penulis, Jenis, Penerbit, Tahun. Jika thead statis berbeda, sesuaikan thead-nya (bukan renderer), tetap memakai kelas yang ada.
3. Tambahkan `<script src="assets/js/api-content.js" defer></script>` sebelum script main.js di ketiga file.

- [x] **Step 7: Edit `public/kontak.html` dan `public/kerjasama.html`.**

Untuk setiap `form[data-ajax-form]` di kedua file:
1. Tambahkan atribut `data-jenis` pada tag form: `data-jenis="kontak"` (form kontak umum), `data-jenis="konsultasi"` (form konsultasi, bila ada), `data-jenis="kerjasama"` (form pengajuan kerja sama).
2. Pastikan input punya atribut `name`: `name="nama"`, `name="email"`, `name="telepon"`, `name="subjek"`, dan textarea `name="isi"`. Kolom bawaan yang tidak cocok persis (mis. "Institusi" di form kerjasama) gabungkan nilainya lewat `name="subjek"` atau biarkan tanpa name (tidak dikirim).
3. Tambahkan honeypot di dalam setiap form:
   ```html
   <input type="text" name="website" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true">
   ```

- [x] **Step 8: Verifikasi end-to-end di browser** (dev server jalan; pastikan ada ≥1 berita published, 1 dokumen, 1 penelitian, 1 pkm, 1 publikasi dari task sebelumnya):

1. Beranda `/`: statistik menampilkan angka dari `/api/pengaturan`; kartu berita menampilkan berita dari admin.
2. `/berita.html`: daftar dari API; klik judul → `berita.html?slug=...` menampilkan detail (judul, meta, konten markdown ter-render).
3. `/dokumen.html`: kartu dokumen dari API; klik → file terunduh dari Supabase Storage; kotak pencarian tetap memfilter.
4. `/penelitian.html`, `/pkm.html`, `/publikasi.html`: tabel terisi dari API.
5. `/kontak.html`: isi form → kirim → pesan sukses tampil → pesan muncul di `/admin/pesan` berstatus `baru`.
6. Uji fallback: hentikan dev server, buka file `public/index.html` langsung dari disk di browser → konten statis tetap tampil, console hanya warning `api-content:`.

- [x] **Step 9: Commit.**

```bash
git add public/assets/js/api-content.js public/assets/js/main.js public/*.html
git commit -m "feat: integrasi konten dinamis situs publik + form pesan nyata"
```

---

### Task 13: Build produksi, README deploy, push GitHub, verifikasi akhir

**Files:**
- Create: `README.md`
- Modify: `docs/superpowers/plans/2026-07-14-panel-admin.md` (centang semua checkbox)

**Interfaces:**
- Consumes: seluruh hasil Task 1–12.
- Produces: build produksi lolos; repo di GitHub; panduan deploy Vercel untuk user.

- [x] **Step 1: Build produksi** — Run: `npm run build`
  Expected: sukses; route `/admin/*` dan `/api/*` terdaftar di output. Jika error prerender pada halaman admin, pastikan `export const dynamic = 'force-dynamic'` ada di dashboard (Task 7).

- [x] **Step 2: Tulis `README.md`:**

```markdown
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
```

- [x] **Step 3: Commit README.**

```bash
git add README.md
git commit -m "docs: README setup, deploy Vercel, dan catatan free tier"
```

- [x] **Step 4: Push ke GitHub.**

Cek dulu: `gh auth status`.
- Jika login: `gh repo create lppm-univsm --private --source . --push`
- Jika tidak: minta user membuat repo kosong di GitHub lalu jalankan:
  ```bash
  git remote add origin https://github.com/<username>/lppm-univsm.git
  git push -u origin main
  ```

- [x] **Step 5: PAUSE — user menghubungkan Vercel.** Sampaikan ke user langkah "Deploy ke Vercel" di README (import repo + 3 env var). Ini butuh login akun Vercel milik user, tidak bisa diotomasi.

- [x] **Step 6: Verifikasi akhir menyeluruh** (checklist dari spec, di lokal atau di URL Vercel setelah deploy):

1. Login `/admin/login` → dashboard tampil. Logout → kembali ke login.
2. Akses `/admin` tanpa sesi → redirect login; `POST /api/berita` tanpa sesi → 401.
3. Buat berita + gambar + publish → tampil di beranda dan `/berita.html`; buka detail via `?slug=`.
4. Upload dokumen → tampil di `/dokumen.html` → file bisa diunduh.
5. Tambah penelitian/pkm/publikasi → tampil di halaman publik masing-masing.
6. Ubah statistik di `/admin/pengaturan` → angka beranda berubah setelah reload.
7. Kirim form kontak dari situs publik → muncul di `/admin/pesan` → tandai selesai.
8. Fallback: buka situs tanpa API (server mati / env kosong) → halaman statis tetap utuh.

- [x] **Step 7: Commit terakhir** (centang checkbox plan yang selesai):

```bash
git add docs/superpowers/plans/2026-07-14-panel-admin.md
git commit -m "chore: tandai plan panel admin selesai"
```

---

## Catatan Eksekusi

- Task 2 Step 4 dan Task 13 Step 5 adalah titik PAUSE yang butuh aksi user (buat project Supabase / hubungkan Vercel). Jangan lewati — task berikutnya bergantung padanya.
- Task 12 mengedit HTML yang ada: SELALU baca bagian file terkait dulu (`grep` petunjuk sudah disediakan per step), jangan menulis ulang seluruh file.
- Ingat catatan encoding: `public/index.html` diedit via Edit tool atau python byte-level, hindari pipeline string PowerShell.
