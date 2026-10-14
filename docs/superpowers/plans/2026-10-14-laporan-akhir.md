# Laporan Akhir Penelitian & PkM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dosen mengunggah satu PDF laporan akhir pada pengajuan berstatus ST & SK Terbit; LPPM menerima atau meminta revisi; laporan diterima menandai kegiatan publik `selesai`.

**Architecture:** Empat kolom laporan di tabel `pengajuan` (status laporan terpisah dari status utama, sehingga alur ST/SK tidak berubah). Unggah memakai pola yang sudah ada: token unggah sekali-pakai dari server → unggah langsung ke bucket privat → server memverifikasi path & isi PDF → update bersyarat. Label tampilan gabungan (`labelPengajuan`) dipakai di kedua portal.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind v4, zod v3, Supabase (Postgres, Storage, Auth) via service role.

**Spec:** `docs/superpowers/specs/2026-10-14-laporan-akhir-design.md`

## Global Constraints

- Semua teks UI & pesan error berbahasa Indonesia; respons error API berbentuk `{ error: string }`.
- Tidak ada framework unit test (keputusan proyek); "tes" = perintah verifikasi (curl/node/typecheck/browser) yang dijalankan dan dibaca keluarannya. Langkah RED dijalankan sebelum implementasi.
- Akses data hanya di server via `supabaseAdmin()`; route dosen memakai `requireDosen` + filter `dosen_id`; route admin memakai `requireAdmin`.
- PDF maks 10 MB (`MAX_PDF`), bucket privat `pengajuan`, path ditentukan server, isi diperiksa `%PDF-` lewat `periksaPdf`.
- Setiap transisi status memakai update bersyarat (`.eq/.is` pada status asal + `.maybeSingle()`), kalah balapan → 409.
- File sumber memakai CRLF; edit lewat Edit tool atau skrip Python yang mempertahankan akhir baris (jangan pipeline string PowerShell).
- Kredensial admin hanya lewat variabel shell `ADMIN_EMAIL`/`ADMIN_PASSWORD`; jangan ditulis ke file/commit.
- Di Git Bash, perintah `node scripts/uji.mjs unggah ... /api/...` dijalankan dengan `MSYS_NO_PATHCONV=1` (Git Bash mengubah argumen berawalan `/`). Jangan set variabel itu global (merusak `curl -o /dev/null`).
- Database dipakai bersama produksi: semua akun/berkas/baris uji (`@example.com`, judul `Uji Laporan%`) wajib dihapus di Task 6 (`node scripts/uji.mjs bersihkan`).

## Review Focus

1. **Laporan dikirim ganda (klik dua kali / dua tab) dengan berkas yang sama** → tepat satu 200, lainnya 409; berkas yang tersimpan tidak ikut terhapus oleh permintaan yang kalah dan tetap bisa diunduh. (Dosen vs admin tidak dapat bertabrakan: dosen hanya mengirim saat `null`/`revisi`, admin hanya memutuskan saat `dikirim`.) (Tes di Task 3 Step 6.)
2. **Path laporan milik pengajuan lain dari dosen yang sama** (mis. token untuk pengajuan X dipakai untuk Y) → 400 "Berkas laporan tidak valid." (Tes di Task 2 Step 7.)
3. **Baris publik sudah dihapus admin sebelum laporan diterima** → laporan tetap diterima (200), tidak error. (Tes di Task 3 Step 6.)
4. **Klik "Terima" dua kali / dua admin** → satu 200, satu 409; baris publik `selesai`. (Tes di Task 3 Step 6.)
5. **PDF palsu saat revisi** → 400, file palsu terhapus, laporan lama tetap ada & bisa diunduh; kirim ulang sah → file lama terhapus. (Tes di Task 2 Step 7 & Task 3 Step 6.)

## Peta File

| File | Tanggung jawab |
|---|---|
| `supabase/migrasi-2026-10-laporan.sql` (baru) | tambah 4 kolom + index (sekali jalan) |
| `supabase/schema.sql` | kolom laporan untuk instalasi baru |
| `src/lib/pengajuan-shared.ts` | tipe `LaporanStatus`, kolom laporan di `Pengajuan`, `FileJenis` + `laporan`, `labelPengajuan`, `alasanTolakLaporan` |
| `src/lib/pengajuan-server.ts` | awalan path `laporan` (dipakai `pathSuratBaru`/`cocokSurat`) |
| `src/lib/validation.ts` | `laporanSchema`, `keputusanLaporanSchema` |
| `src/app/api/dosen/pengajuan/[id]/laporan/unggah/route.ts` (baru) | token unggah laporan |
| `src/app/api/dosen/pengajuan/[id]/laporan/route.ts` (baru) | simpan laporan (kirim/kirim ulang) |
| `src/app/api/dosen/pengajuan/[id]/file/route.ts`, `src/app/api/admin/pengajuan/[id]/file/route.ts` | jenis `laporan` |
| `src/app/api/admin/pengajuan/[id]/laporan/route.ts` (baru) | keputusan laporan (terima/revisi) + publik `selesai` |
| `src/app/api/admin/pengajuan/route.ts` | filter `?laporan=`, pilih `laporan_status` |
| `src/components/dosen/PanelLaporan.tsx` (baru) | panel laporan di portal dosen |
| `src/app/dosen/(portal)/page.tsx`, `src/app/dosen/(portal)/pengajuan/[id]/page.tsx` | label gabungan, panel laporan, tombol unduh laporan |
| `src/components/admin/PengajuanAksi.tsx` | `PanelPemeriksaanLaporan` |
| `src/app/admin/(panel)/pengajuan/page.tsx`, `.../pengajuan/[id]/page.tsx` | filter "Laporan Masuk", label gabungan, panel pemeriksaan |
| `src/app/admin/(panel)/layout.tsx`, `src/app/admin/(panel)/page.tsx` | badge + kartu "Laporan menunggu pemeriksaan" |
| `scripts/uji.mjs` | `berkas` menampilkan berkas per-pengajuan dengan nama kunci yang jelas |
| `README.md` | alur laporan & migrasi |

---

### Task 1: Skema, tipe bersama, validasi

**Files:**
- Create: `supabase/migrasi-2026-10-laporan.sql`
- Modify: `supabase/schema.sql` (tabel `pengajuan`), `src/lib/pengajuan-shared.ts`, `src/lib/pengajuan-server.ts:7-8`, `src/lib/validation.ts` (append)

**Interfaces:**
- Consumes: tabel `pengajuan`, `KOLOM_FILE`, `FILE_LABEL`, `STATUS_LABEL`, `STATUS_BADGE` yang ada.
- Produces:
  - `type LaporanStatus = 'dikirim' | 'revisi' | 'diterima'`
  - `Pengajuan` + `laporan_path: string | null; laporan_status: LaporanStatus | null; laporan_catatan: string; laporan_at: string | null`
  - `FileJenis` = `'proposal' | 'surat_tugas' | 'sk' | 'laporan'`; `KOLOM_FILE.laporan = 'laporan_path'`; `FILE_LABEL.laporan = 'Laporan'`
  - `labelPengajuan(p: Pick<Pengajuan,'status'|'laporan_status'>): { label: string; badge: string }`
  - `alasanTolakLaporan(p: Pick<Pengajuan,'status'|'laporan_status'>): string | null`
  - `pathSuratBaru(dosenId, pengajuanId, 'laporan')` / `cocokSurat(dosenId, pengajuanId, 'laporan', path)` (awalan `laporan-`)
  - `laporanSchema` (`{ path }`), `keputusanLaporanSchema` (`{ aksi: 'terima'|'revisi', catatan }`)

- [ ] **Step 1: RED — kolom belum ada.** Simpan sebagai `<workspace>/cek-kolom.cjs` dan jalankan `node <workspace>/cek-kolom.cjs`:

```js
const { createClient } = require('@supabase/supabase-js');
require('fs').readFileSync('.env.local','utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].trim();});
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
db.from('pengajuan').select('laporan_path,laporan_status,laporan_catatan,laporan_at').limit(1)
  .then(r => { if (r.error) { console.log('BELUM:', r.error.message); process.exit(1); } console.log('PASS kolom laporan ada'); });
```
Expected: `BELUM: column pengajuan.laporan_path does not exist` (exit 1).

- [ ] **Step 2: Buat `supabase/migrasi-2026-10-laporan.sql`:**

```sql
-- Migrasi Oktober 2026: laporan akhir pada pengajuan Layanan Dosen.
-- Jalankan sekali di Supabase SQL Editor. Aman bila terulang.
alter table pengajuan add column if not exists laporan_path text;
alter table pengajuan add column if not exists laporan_status text
  check (laporan_status in ('dikirim','revisi','diterima'));
alter table pengajuan add column if not exists laporan_catatan text not null default '';
alter table pengajuan add column if not exists laporan_at timestamptz;
create index if not exists idx_pengajuan_laporan_status on pengajuan (laporan_status);
notify pgrst, 'reload schema';
```

- [ ] **Step 3: Perbarui `supabase/schema.sql`.** Di definisi `create table if not exists pengajuan`, ganti baris
```sql
  publik_id uuid,
```
dengan
```sql
  publik_id uuid,
  laporan_path text,
  laporan_status text check (laporan_status in ('dikirim','revisi','diterima')),
  laporan_catatan text not null default '',
  laporan_at timestamptz,
```
dan setelah baris `create index if not exists idx_pengajuan_status on pengajuan (status);` tambahkan
```sql
create index if not exists idx_pengajuan_laporan_status on pengajuan (laporan_status);
```

- [ ] **Step 4: PAUSE — user menjalankan migrasi.** Minta user menempelkan isi `supabase/migrasi-2026-10-laporan.sql` ke Supabase → SQL Editor → Run, lalu menunggu konfirmasi. Setelah dikonfirmasi jalankan `node <workspace>/cek-kolom.cjs`.
Expected: `PASS kolom laporan ada`.

- [ ] **Step 5: Ubah `src/lib/pengajuan-shared.ts`.**

Ganti
```ts
export type FileJenis = 'proposal' | 'surat_tugas' | 'sk';
```
dengan
```ts
export type FileJenis = 'proposal' | 'surat_tugas' | 'sk' | 'laporan';
export type LaporanStatus = 'dikirim' | 'revisi' | 'diterima';
```

Ganti
```ts
  publik_id: string | null;
```
dengan
```ts
  publik_id: string | null;
  laporan_path: string | null;
  laporan_status: LaporanStatus | null;
  laporan_catatan: string;
  laporan_at: string | null;
```

Ganti
```ts
  sk: 'SK',
};
```
dengan
```ts
  sk: 'SK',
  laporan: 'Laporan',
};
```

Ganti
```ts
  sk: 'sk_path',
} as const satisfies Record<FileJenis, keyof Pengajuan>;
```
dengan
```ts
  sk: 'sk_path',
  laporan: 'laporan_path',
} as const satisfies Record<FileJenis, keyof Pengajuan>;

// Label & badge gabungan status pengajuan + status laporan akhir.
export function labelPengajuan(p: Pick<Pengajuan, 'status' | 'laporan_status'>): { label: string; badge: string } {
  if (p.status === 'terbit') {
    if (p.laporan_status === 'dikirim') return { label: 'Laporan Diperiksa', badge: 'bg-blue-100 text-blue-700' };
    if (p.laporan_status === 'revisi') return { label: 'Laporan Perlu Revisi', badge: 'bg-amber-100 text-amber-700' };
    if (p.laporan_status === 'diterima') return { label: 'Selesai', badge: 'bg-slate-200 text-slate-800' };
  }
  return { label: STATUS_LABEL[p.status], badge: STATUS_BADGE[p.status] };
}

// Alasan laporan tidak dapat dikirim, atau null bila boleh.
export function alasanTolakLaporan(p: Pick<Pengajuan, 'status' | 'laporan_status'>): string | null {
  if (p.status !== 'terbit') return 'Laporan hanya dapat diunggah setelah ST & SK terbit.';
  if (p.laporan_status === 'dikirim' || p.laporan_status === 'diterima') {
    return 'Laporan sedang diperiksa atau sudah diterima.';
  }
  return null;
}
```

- [ ] **Step 6: Ubah `src/lib/pengajuan-server.ts`.** Ganti
```ts
type JenisSurat = Exclude<FileJenis, 'proposal'>;
const AWALAN: Record<JenisSurat, string> = { surat_tugas: 'surat-tugas', sk: 'sk' };
```
dengan
```ts
// Berkas per-pengajuan (Surat Tugas, SK, laporan akhir) di <dosen>/<pengajuan>/<awalan>-<epoch>.pdf.
type JenisSurat = Exclude<FileJenis, 'proposal'>;
const AWALAN: Record<JenisSurat, string> = { surat_tugas: 'surat-tugas', sk: 'sk', laporan: 'laporan' };
```

- [ ] **Step 7: Append ke `src/lib/validation.ts`:**

```ts

export const laporanSchema = z.object({
  path: z.string().min(1, 'Berkas laporan belum diunggah.'),
});

export const keputusanLaporanSchema = z
  .object({
    aksi: z.enum(['terima', 'revisi'], { errorMap: () => ({ message: 'Aksi tidak valid.' }) }),
    catatan: z.string().trim().default(''),
  })
  .refine((d) => d.aksi === 'terima' || d.catatan.length >= 5, {
    message: 'Catatan wajib diisi (minimal 5 karakter) untuk revisi laporan.',
    path: ['catatan'],
  });
```

- [ ] **Step 8: Verifikasi.** `npx tsc --noEmit` → exit 0. Lalu `node <workspace>/cek-kolom.cjs` → `PASS kolom laporan ada`.
Catatan: `jenisSuratSchema` tetap `surat_tugas|sk`, sehingga route surat admin tidak bisa dipakai untuk laporan.

- [ ] **Step 9: Commit.**

```bash
git add supabase/migrasi-2026-10-laporan.sql supabase/schema.sql src/lib/pengajuan-shared.ts src/lib/pengajuan-server.ts src/lib/validation.ts
git commit -m "feat(laporan): kolom laporan akhir, tipe & label bersama, validasi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: API laporan untuk dosen + unduh berkas laporan

**Files:**
- Create: `src/app/api/dosen/pengajuan/[id]/laporan/unggah/route.ts`, `src/app/api/dosen/pengajuan/[id]/laporan/route.ts`
- Modify: `src/app/api/dosen/pengajuan/[id]/file/route.ts:8`, `src/app/api/admin/pengajuan/[id]/file/route.ts:8`, `scripts/uji.mjs` (perintah `berkas`)

**Interfaces:**
- Consumes: `requireDosen`, `alasanTolakLaporan`, `pathSuratBaru`, `cocokSurat`, `tokenUnggah`, `periksaPdf`, `hapusFile`, `laporanSchema` (Task 1).
- Produces:
  - `POST /api/dosen/pengajuan/[id]/laporan/unggah` → `{ path, token }` | 404 | 409
  - `POST /api/dosen/pengajuan/[id]/laporan` `{ path }` → baris `Pengajuan` | 400 | 404 | 409 | 500
  - `GET .../file?jenis=laporan` (dosen & admin) → 302
  - `node scripts/uji.mjs berkas ID` → `{"proposal":[...],"per_pengajuan":[...]}`

- [ ] **Step 1: RED.** Dev server jalan (`preview_start lppm-website`).
```bash
curl -s -o /dev/null -w "RED laporan/unggah: %{http_code}\n" -X POST http://localhost:3000/api/dosen/pengajuan/00000000-0000-0000-0000-000000000000/laporan/unggah
```
Expected: `404` (route belum ada; HTML 404 Next).

- [ ] **Step 2: Buat `src/app/api/dosen/pengajuan/[id]/laporan/unggah/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireDosen } from '@/lib/auth';
import { pathSuratBaru, tokenUnggah } from '@/lib/pengajuan-server';
import { alasanTolakLaporan } from '@/lib/pengajuan-shared';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  const { id } = await ctx.params;
  const uid = r.profil.user_id;
  const { data: aj } = await supabaseAdmin()
    .from('pengajuan')
    .select('status,laporan_status')
    .eq('id', id)
    .eq('dosen_id', uid)
    .maybeSingle();
  if (!aj) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  const alasan = alasanTolakLaporan(aj);
  if (alasan) return NextResponse.json({ error: alasan }, { status: 409 });
  try {
    return NextResponse.json(await tokenUnggah(pathSuratBaru(uid, id, 'laporan')));
  } catch {
    return NextResponse.json({ error: 'Gagal menyiapkan unggahan.' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Buat `src/app/api/dosen/pengajuan/[id]/laporan/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireDosen } from '@/lib/auth';
import { laporanSchema } from '@/lib/validation';
import { cocokSurat, hapusFile, periksaPdf } from '@/lib/pengajuan-server';
import { alasanTolakLaporan, type Pengajuan } from '@/lib/pengajuan-shared';

// Kirim / kirim ulang laporan akhir. Hanya saat status 'terbit' dan laporan belum ada atau perlu revisi.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  const { id } = await ctx.params;
  const uid = r.profil.user_id;
  const parsed = laporanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const { path } = parsed.data;
  const db = supabaseAdmin();
  const { data } = await db.from('pengajuan').select('*').eq('id', id).eq('dosen_id', uid).maybeSingle();
  const aj = data as Pengajuan | null;
  if (!aj) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  const alasan = alasanTolakLaporan(aj);
  if (alasan) return NextResponse.json({ error: alasan }, { status: 409 });
  if (!cocokSurat(uid, id, 'laporan', path)) {
    return NextResponse.json({ error: 'Berkas laporan tidak valid. Silakan unggah ulang.' }, { status: 400 });
  }
  const salah = await periksaPdf(path);
  if (salah) return NextResponse.json({ error: salah }, { status: 400 });

  const now = new Date().toISOString();
  let q = db
    .from('pengajuan')
    .update({ laporan_path: path, laporan_status: 'dikirim', laporan_catatan: '', laporan_at: now, updated_at: now })
    .eq('id', id)
    .eq('status', 'terbit');
  q = aj.laporan_status ? q.eq('laporan_status', aj.laporan_status) : q.is('laporan_status', null);
  const { data: baru, error } = await q.select().maybeSingle();
  if (error || !baru) {
    // Kirim ganda dengan path yang sama: jangan hapus file yang kini tersimpan milik permintaan pemenang.
    const { data: kini } = await db.from('pengajuan').select('laporan_path').eq('id', id).maybeSingle();
    if (kini?.laporan_path !== path) await hapusFile(path);
    return error
      ? NextResponse.json({ error: 'Gagal menyimpan laporan.' }, { status: 500 })
      : NextResponse.json({ error: 'Status laporan sudah berubah. Muat ulang halaman.' }, { status: 409 });
  }
  if (aj.laporan_path && aj.laporan_path !== path) await hapusFile(aj.laporan_path);
  return NextResponse.json(baru);
}
```

- [ ] **Step 4: Tambah jenis `laporan` di kedua route unduh.** Di `src/app/api/dosen/pengajuan/[id]/file/route.ts` **dan** `src/app/api/admin/pengajuan/[id]/file/route.ts`, ganti
```ts
const JENIS: FileJenis[] = ['proposal', 'surat_tugas', 'sk'];
```
dengan
```ts
const JENIS: FileJenis[] = ['proposal', 'surat_tugas', 'sk', 'laporan'];
```
dan di kedua file ganti
```ts
    .select('proposal_path,surat_tugas_path,sk_path')
```
dengan
```ts
    .select('proposal_path,surat_tugas_path,sk_path,laporan_path')
```

- [ ] **Step 5: Perjelas perintah `berkas` di `scripts/uji.mjs`.** Ganti
```js
    surat: (surat ?? []).map((f) => f.name),
```
dengan
```js
    per_pengajuan: (surat ?? []).map((f) => f.name), // surat-tugas-*, sk-*, laporan-*
```
dan di komentar kepala file ganti `→ file Storage proposal & surat milik pengajuan ID` dengan `→ file Storage proposal & berkas per-pengajuan (ST, SK, laporan)`.

- [ ] **Step 6: Siapkan data uji.** `npx tsc --noEmit` → exit 0. Lalu (ganti `<W>` dengan path workspace):

```bash
export ADMIN_EMAIL=... ADMIN_PASSWORD=...   # dari controller, jangan ditulis ke file
mkdir -p .superpowers/uji
node -e "const fs=require('fs');fs.writeFileSync('.superpowers/uji/uji.pdf','%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');fs.writeFileSync('.superpowers/uji/uji2.pdf','%PDF-1.4\n% revisi\n%%EOF\n');fs.writeFileSync('.superpowers/uji/palsu.pdf','bukan pdf');"
node scripts/uji.mjs daftar A; node scripts/uji.mjs daftar B
AC=$(node scripts/uji.mjs cookie-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
for e in uji.dosen.a@example.com uji.dosen.b@example.com; do
  U=$(curl -s -H "Cookie: $AC" "http://localhost:3000/api/admin/dosen?status=menunggu" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log((JSON.parse(d).find(x=>x.email==='$e')||{}).user_id))")
  curl -s -o /dev/null -w "aktifkan $e: %{http_code}\n" -X PATCH -H "Cookie: $AC" -H "Content-Type: application/json" -d '{"status":"aktif"}' http://localhost:3000/api/admin/dosen/$U
done
A=$(node scripts/uji.mjs cookie A)
ajukan() { P=$(MSYS_NO_PATHCONV=1 node scripts/uji.mjs unggah "$A" .superpowers/uji/uji.pdf /api/dosen/unggah); curl -s -X POST -H "Cookie: $A" -H "Content-Type: application/json" -d "{\"jenis\":\"$1\",\"judul\":\"$2\",\"skema\":\"$3\",\"tahun\":2026,\"proposal_path\":\"$P\"}" http://localhost:3000/api/dosen/pengajuan | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))"; }
X=$(ajukan penelitian "Uji Laporan Penelitian A" "Penelitian Mandiri"); Y=$(ajukan pkm "Uji Laporan PkM A" "PkM Mandiri")
for i in $X $Y; do curl -s -o /dev/null -w "setujui: %{http_code}\n" -X POST -H "Cookie: $AC" -H "Content-Type: application/json" -d '{"aksi":"setujui"}' http://localhost:3000/api/admin/pengajuan/$i/keputusan; done
node scripts/uji.mjs set-status "$X" terbit
printf "X=%s\nY=%s\n" "$X" "$Y" > .superpowers/uji/ids.txt
```
Expected: dua `aktifkan ...: 200`, dua `setujui: 200`, `set-status` mencetak `{"status":"terbit",...}`. `X` = pengajuan penelitian berstatus `terbit` (punya baris publik), `Y` = pengajuan PkM berstatus `disetujui`.

- [ ] **Step 7: Verifikasi API dosen.** Simpan sebagai `<W>/verify-t2.sh`, jalankan `bash <W>/verify-t2.sh`:

```bash
set -e
source <(sed 's/^/export /' .superpowers/uji/ids.txt)
A=$(node scripts/uji.mjs cookie A); B=$(node scripts/uji.mjs cookie B)
D=http://localhost:3000/api/dosen/pengajuan; J='Content-Type: application/json'
c() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
un() { MSYS_NO_PATHCONV=1 node scripts/uji.mjs unggah "$1" "$2" "$3"; }
# status belum terbit → 409; bukan milik → 404; anonim → 401
curl -s -X POST -H "Cookie: $A" $D/$Y/laporan/unggah | grep -q 'setelah ST & SK terbit'
[ "$(c -X POST -H "Cookie: $B" $D/$X/laporan/unggah)" = 404 ]
[ "$(c -X POST $D/$X/laporan/unggah)" = 401 ]
# path pengajuan lain (Review Focus #2): token untuk X dipakai di Y & path proposal dipakai sbg laporan
PX=$(un "$A" .superpowers/uji/uji.pdf /api/dosen/pengajuan/$X/laporan/unggah)
node scripts/uji.mjs set-status "$Y" terbit > /dev/null
curl -s -X POST -H "Cookie: $A" -H "$J" -d "{\"path\":\"$PX\"}" $D/$Y/laporan | grep -q 'Berkas laporan tidak valid'
node scripts/uji.mjs set-status "$Y" disetujui > /dev/null
# B memakai path milik A → 404 (bukan pengajuannya)
[ "$(c -X POST -H "Cookie: $B" -H "$J" -d "{\"path\":\"$PX\"}" $D/$X/laporan)" = 404 ]
# PDF palsu → 400 & terhapus
PF=$(un "$A" .superpowers/uji/palsu.pdf /api/dosen/pengajuan/$X/laporan/unggah)
curl -s -X POST -H "Cookie: $A" -H "$J" -d "{\"path\":\"$PF\"}" $D/$X/laporan | grep -q 'File harus berformat PDF.'
! node scripts/uji.mjs berkas "$X" | grep -q "${PF##*/}"
# kirim sah → dikirim; kirim lagi → 409; unduh dosen & admin → 302; B unduh → 404
curl -s -X POST -H "Cookie: $A" -H "$J" -d "{\"path\":\"$PX\"}" $D/$X/laporan | grep -q '"laporan_status":"dikirim"'
[ "$(c -X POST -H "Cookie: $A" $D/$X/laporan/unggah)" = 409 ]
[ "$(c -H "Cookie: $A" "$D/$X/file?jenis=laporan")" = 302 ]
AC=$(node scripts/uji.mjs cookie-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
[ "$(c -H "Cookie: $AC" "http://localhost:3000/api/admin/pengajuan/$X/file?jenis=laporan")" = 302 ]
[ "$(c -H "Cookie: $B" "$D/$X/file?jenis=laporan")" = 404 ]
[ "$(c -H "Cookie: $A" "$D/$Y/file?jenis=laporan")" = 404 ]
node scripts/uji.mjs berkas "$X" | grep -q "${PX##*/}"
echo "PX=$PX" >> .superpowers/uji/ids.txt
echo "PASS t2: belum terbit=409, bukan milik=404, anon=401, path pengajuan lain=400, B=404, PDF palsu ditolak+dihapus, kirim=dikirim, kirim ulang saat diperiksa=409, unduh A/admin=302, B/belum ada=404"
```
Expected: baris terakhir `PASS t2: ...`. Bila gagal, baris yang gagal menunjukkan kasusnya (`set -e`).

- [ ] **Step 8: Commit.**

```bash
git add "src/app/api/dosen/pengajuan/[id]/laporan" "src/app/api/dosen/pengajuan/[id]/file/route.ts" "src/app/api/admin/pengajuan/[id]/file/route.ts" scripts/uji.mjs
git commit -m "feat(laporan): API unggah & kirim laporan akhir oleh dosen, unduh laporan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: API pemeriksaan laporan oleh admin + filter daftar

**Files:**
- Create: `src/app/api/admin/pengajuan/[id]/laporan/route.ts`
- Modify: `src/app/api/admin/pengajuan/route.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `keputusanLaporanSchema`, `Pengajuan` (Task 1); data uji `X`, `PX` (Task 2).
- Produces:
  - `POST /api/admin/pengajuan/[id]/laporan` `{ aksi, catatan }` → `{ ok: true, laporan_status }` | 400 | 404 | 409 | 500
  - `GET /api/admin/pengajuan?laporan=dikirim|revisi|diterima` → daftar ter-filter; setiap baris memuat `laporan_status`

- [ ] **Step 1: RED.**
```bash
AC=$(node scripts/uji.mjs cookie-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
curl -s -o /dev/null -w "RED keputusan laporan: %{http_code}\n" -X POST -H "Cookie: $AC" -H "Content-Type: application/json" -d '{"aksi":"terima"}' http://localhost:3000/api/admin/pengajuan/00000000-0000-0000-0000-000000000000/laporan
curl -s -H "Cookie: $AC" "http://localhost:3000/api/admin/pengajuan?laporan=dikirim" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const a=JSON.parse(d);console.log('RED filter: baris=',a.length,'punya laporan_status=',a.length>0&&'laporan_status' in a[0])})"
```
Expected: `RED keputusan laporan: 404` (HTML Next); `RED filter: baris= <semua pengajuan> punya laporan_status= false`.

- [ ] **Step 2: Ubah `src/app/api/admin/pengajuan/route.ts`.** Ganti
```ts
    .select('id,jenis,judul,skema,tahun,status,created_at,profil(nama,prodi)')
```
dengan
```ts
    .select('id,jenis,judul,skema,tahun,status,laporan_status,created_at,profil(nama,prodi)')
```
dan setelah baris `if (jenis) q = q.eq('jenis', jenis);` tambahkan
```ts
  const laporan = url.searchParams.get('laporan');
  if (laporan) q = q.eq('laporan_status', laporan);
```

- [ ] **Step 3: Buat `src/app/api/admin/pengajuan/[id]/laporan/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { keputusanLaporanSchema } from '@/lib/validation';
import type { Pengajuan } from '@/lib/pengajuan-shared';

// Pemeriksaan laporan akhir: hanya dari 'dikirim'. Diterima → kegiatan publik 'selesai'.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = keputusanLaporanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const { aksi, catatan } = parsed.data;
  const statusBaru = aksi === 'terima' ? 'diterima' : 'revisi';
  const db = supabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from('pengajuan')
    .update({ laporan_status: statusBaru, laporan_catatan: aksi === 'revisi' ? catatan : '', updated_at: now })
    .eq('id', id)
    .eq('laporan_status', 'dikirim')
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Gagal menyimpan keputusan laporan.' }, { status: 500 });
  if (!data) {
    const { data: ada } = await db.from('pengajuan').select('laporan_status').eq('id', id).maybeSingle();
    if (!ada) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
    return NextResponse.json(
      { error: ada.laporan_status ? 'Laporan ini sudah diperiksa sebelumnya.' : 'Belum ada laporan untuk diperiksa.' },
      { status: 409 },
    );
  }

  const aj = data as Pengajuan;
  if (aksi === 'terima' && aj.publik_id) {
    // Baris publik yang sudah dihapus admin → update 0 baris, bukan error; laporan tetap diterima.
    const { error: pubErr } = await db.from(aj.jenis).update({ status: 'selesai', updated_at: now }).eq('id', aj.publik_id);
    if (pubErr) {
      await db.from('pengajuan').update({ laporan_status: 'dikirim' }).eq('id', id).eq('laporan_status', 'diterima');
      return NextResponse.json(
        { error: 'Gagal memperbarui daftar publik. Keputusan dibatalkan, silakan coba lagi.' },
        { status: 500 },
      );
    }
  }
  return NextResponse.json({ ok: true, laporan_status: statusBaru });
}
```

- [ ] **Step 4: Typecheck.** `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Verifikasi alur revisi → kirim ulang → terima.** Simpan sebagai `<W>/verify-t3.sh`, jalankan:

```bash
set -e
source <(sed 's/^/export /' .superpowers/uji/ids.txt)
A=$(node scripts/uji.mjs cookie A); B=$(node scripts/uji.mjs cookie B)
AC=$(node scripts/uji.mjs cookie-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
K=http://localhost:3000/api/admin/pengajuan; D=http://localhost:3000/api/dosen/pengajuan; J='Content-Type: application/json'
c() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
un() { MSYS_NO_PATHCONV=1 node scripts/uji.mjs unggah "$1" "$2" "$3"; }
# akses: anon 401, dosen 403; validasi; tidak ada laporan → 409; uuid acak → 404
[ "$(c -X POST -H "$J" -d '{"aksi":"terima"}' $K/$X/laporan)" = 401 ]
[ "$(c -X POST -H "Cookie: $A" -H "$J" -d '{"aksi":"terima"}' $K/$X/laporan)" = 403 ]
curl -s -X POST -H "Cookie: $AC" -H "$J" -d '{"aksi":"revisi"}' $K/$X/laporan | grep -q 'Catatan wajib diisi'
curl -s -X POST -H "Cookie: $AC" -H "$J" -d '{"aksi":"terima"}' $K/$Y/laporan | grep -q 'Belum ada laporan'
[ "$(c -X POST -H "Cookie: $AC" -H "$J" -d '{"aksi":"terima"}' $K/00000000-0000-0000-0000-000000000000/laporan)" = 404 ]
# filter laporan masuk memuat X
curl -s -H "Cookie: $AC" "$K?laporan=dikirim" | grep -q "$X"
# revisi → dosen melihat catatan
curl -s -X POST -H "Cookie: $AC" -H "$J" -d '{"aksi":"revisi","catatan":"Lengkapi lampiran dokumentasi."}' $K/$X/laporan | grep -q '"laporan_status":"revisi"'
curl -s -H "Cookie: $A" $D/$X | grep -q 'Lengkapi lampiran dokumentasi.'
# Review Focus #5: PDF palsu saat revisi → laporan lama tetap
PF=$(un "$A" .superpowers/uji/palsu.pdf /api/dosen/pengajuan/$X/laporan/unggah)
curl -s -X POST -H "Cookie: $A" -H "$J" -d "{\"path\":\"$PF\"}" $D/$X/laporan | grep -q 'File harus berformat PDF.'
node scripts/uji.mjs berkas "$X" | grep -q "${PX##*/}"
[ "$(c -H "Cookie: $A" "$D/$X/file?jenis=laporan")" = 302 ]
# kirim ulang sah → dikirim, file lama terhapus
P2=$(un "$A" .superpowers/uji/uji2.pdf /api/dosen/pengajuan/$X/laporan/unggah)
curl -s -X POST -H "Cookie: $A" -H "$J" -d "{\"path\":\"$P2\"}" $D/$X/laporan | grep -q '"laporan_status":"dikirim"'
B2=$(node scripts/uji.mjs berkas "$X"); echo "$B2" | grep -q "${P2##*/}"; ! echo "$B2" | grep -q "${PX##*/}"
# Review Focus #4: terima ganda bersamaan → satu 200, satu 409
R=$( (c -X POST -H "Cookie: $AC" -H "$J" -d '{"aksi":"terima"}' $K/$X/laporan; echo) & (c -X POST -H "Cookie: $AC" -H "$J" -d '{"aksi":"terima"}' $K/$X/laporan; echo) & wait )
echo "terima ganda: $(echo $R)"; [ "$(echo "$R" | grep -c 200)" = 1 ]; [ "$(echo "$R" | grep -c 409)" = 1 ]
# publik selesai; dosen tak bisa kirim lagi
PUB=$(curl -s -H "Cookie: $AC" $K/$X | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).publik_id))")
curl -s http://localhost:3000/api/penelitian | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d).find(x=>x.id==='$PUB');if(!r||r.status!=='selesai'){console.log('publik bukan selesai',r&&r.status);process.exit(1)}})"
[ "$(c -X POST -H "Cookie: $A" $D/$X/laporan/unggah)" = 409 ]
echo "PASS t3: anon=401, dosen=403, catatan wajib, belum ada laporan=409, uuid=404, filter, revisi+catatan, PDF palsu saat revisi aman, kirim ulang hapus file lama, terima ganda 200/409, publik selesai, terkunci"
```
Expected: baris terakhir `PASS t3: ...`.

- [ ] **Step 6: Verifikasi balapan & baris publik terhapus** (Review Focus #1 & #3), pada pengajuan `Y`. Simpan sebagai `<W>/verify-t3b.sh`, jalankan:

```bash
set -e
source <(sed 's/^/export /' .superpowers/uji/ids.txt)
A=$(node scripts/uji.mjs cookie A)
AC=$(node scripts/uji.mjs cookie-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
K=http://localhost:3000/api/admin/pengajuan; D=http://localhost:3000/api/dosen/pengajuan; J='Content-Type: application/json'
c() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
un() { MSYS_NO_PATHCONV=1 node scripts/uji.mjs unggah "$1" "$2" "$3"; }
node scripts/uji.mjs set-status "$Y" terbit > /dev/null
P=$(un "$A" .superpowers/uji/uji.pdf /api/dosen/pengajuan/$Y/laporan/unggah)
[ "$(c -X POST -H "Cookie: $A" -H "$J" -d "{\"path\":\"$P\"}" $D/$Y/laporan)" = 200 ]
# #1: kirim ulang ganda dengan berkas yang sama → satu 200, satu 409, berkas pemenang tetap ada
curl -s -o /dev/null -X POST -H "Cookie: $AC" -H "$J" -d '{"aksi":"revisi","catatan":"Perbaiki format laporan."}' $K/$Y/laporan
P2=$(un "$A" .superpowers/uji/uji2.pdf /api/dosen/pengajuan/$Y/laporan/unggah)
R=$( (c -X POST -H "Cookie: $A" -H "$J" -d "{\"path\":\"$P2\"}" $D/$Y/laporan; echo) & (c -X POST -H "Cookie: $A" -H "$J" -d "{\"path\":\"$P2\"}" $D/$Y/laporan; echo) & wait )
echo "kirim ulang ganda: $(echo $R)"; [ "$(echo "$R" | grep -c 200)" = 1 ]; [ "$(echo "$R" | grep -c 409)" = 1 ]
curl -s -H "Cookie: $A" $D/$Y | grep -q '"laporan_status":"dikirim"'
node scripts/uji.mjs berkas "$Y" | grep -q "${P2##*/}"
[ "$(c -H "Cookie: $A" "$D/$Y/file?jenis=laporan")" = 302 ]
curl -s -L -H "Cookie: $A" "$D/$Y/file?jenis=laporan" | head -c 5 | grep -q '%PDF-'
# #3: hapus baris publik lalu terima → 200
PUB=$(curl -s -H "Cookie: $AC" $K/$Y | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).publik_id))")
[ "$(c -X DELETE -H "Cookie: $AC" http://localhost:3000/api/pkm/$PUB)" = 200 ]
curl -s -X POST -H "Cookie: $AC" -H "$J" -d '{"aksi":"terima"}' $K/$Y/laporan | grep -q '"laporan_status":"diterima"'
echo "PASS t3b: kirim ulang ganda 200/409 tanpa keadaan campuran, terima setelah baris publik dihapus=200"
```
Expected: `PASS t3b: ...` (`DELETE /api/pkm/[id]` dari `src/lib/crud.ts` membalas `200 {"ok":true}`). RED untuk kasus ini: sebelum menjalankan skrip pertama kali, ganti sementara `if (kini?.laporan_path !== path) await hapusFile(path);` di route kirim laporan dengan `await hapusFile(path);` → asersi `berkas ... P2` gagal (permintaan yang kalah menghapus berkas pemenang). Kembalikan baris aslinya, ulangi langkah persiapan pengajuan `Y` (set-status `terbit` + kirim + revisi) bila perlu, lalu jalankan lagi → PASS.

- [ ] **Step 7: Commit.**

```bash
git add "src/app/api/admin/pengajuan/[id]/laporan" src/app/api/admin/pengajuan/route.ts
git commit -m "feat(laporan): pemeriksaan laporan oleh admin (terima/revisi), kegiatan publik selesai, filter laporan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: UI portal dosen

**Files:**
- Create: `src/components/dosen/PanelLaporan.tsx`
- Modify: `src/app/dosen/(portal)/pengajuan/[id]/page.tsx`, `src/app/dosen/(portal)/page.tsx`

**Interfaces:**
- Consumes: `unggahPdf` (`src/lib/unggah-client.ts`), `labelPengajuan`, `Pengajuan` (Task 1); API Task 2.
- Produces: `<PanelLaporan p={Pengajuan} onSelesai={(p: Pengajuan) => void} />`

- [ ] **Step 1: RED.** Login dosen A di browser (`/dosen/login`), buka `/dosen/pengajuan/<Y>` (laporan diterima) dan `/dosen`.
Expected sebelum implementasi: tidak ada panel "Laporan Akhir"; badge `Y` masih "ST & SK Terbit" (bukan "Selesai"); tidak ada tombol unduh "Laporan".

- [ ] **Step 2: Buat `src/components/dosen/PanelLaporan.tsx`:**

```tsx
'use client';

import { useState } from 'react';
import { Alert, btnGhost, btnPrimary, cardCls } from '@/components/admin/ui';
import { DownloadIcon, UploadIcon } from '@/components/admin/icons';
import type { Pengajuan } from '@/lib/pengajuan-shared';
import { unggahPdf } from '@/lib/unggah-client';

const fileCls =
  'block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-700 hover:file:bg-navy-100 file:cursor-pointer';

// Laporan akhir: tampil pada pengajuan berstatus 'terbit'.
export default function PanelLaporan({ p, onSelesai }: { p: Pengajuan; onSelesai: (p: Pengajuan) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [kunci, setKunci] = useState(0);
  const [tahap, setTahap] = useState<'' | 'unggah' | 'simpan'>('');
  const [error, setError] = useState('');
  const bolehKirim = p.laporan_status === null || p.laporan_status === 'revisi';

  async function kirim() {
    if (!file) return;
    setError('');
    try {
      setTahap('unggah');
      const path = await unggahPdf(`/api/dosen/pengajuan/${p.id}/laporan/unggah`, {}, file);
      setTahap('simpan');
      const res = await fetch(`/api/dosen/pengajuan/${p.id}/laporan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Gagal mengirim laporan.');
      setFile(null);
      setKunci((k) => k + 1);
      onSelesai(json as Pengajuan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim laporan.');
    } finally {
      setTahap('');
    }
  }

  return (
    <div className={`${cardCls} p-6 space-y-4`}>
      <div>
        <h2 className="font-bold text-navy-800">Laporan Akhir</h2>
        <p className="text-sm text-gray-500 mt-1">
          Unggah laporan akhir kegiatan dalam format PDF (maks 10 MB). LPPM akan memeriksa laporan Anda.
        </p>
      </div>
      {p.laporan_status === 'dikirim' && <Alert kind="success">Laporan sedang diperiksa LPPM.</Alert>}
      {p.laporan_status === 'revisi' && (
        <Alert kind="error">Laporan perlu revisi. Catatan LPPM: {p.laporan_catatan}</Alert>
      )}
      {p.laporan_status === 'diterima' && (
        <Alert kind="success">Laporan diterima. Kegiatan tercatat selesai.</Alert>
      )}
      {error && <Alert kind="error">{error}</Alert>}
      {p.laporan_path && (
        <a href={`/api/dosen/pengajuan/${p.id}/file?jenis=laporan`} target="_blank" rel="noopener noreferrer" className={btnGhost}>
          <DownloadIcon className="w-4 h-4" /> Laporan yang dikirim
        </a>
      )}
      {bolehKirim && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            key={kunci}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={fileCls}
          />
          <button disabled={!file || tahap !== ''} onClick={kirim} className={btnPrimary}>
            <UploadIcon className="w-4 h-4" />
            {tahap === 'unggah' ? 'Mengunggah laporan…' : tahap === 'simpan' ? 'Menyimpan…' : p.laporan_status === 'revisi' ? 'Kirim Ulang Laporan' : 'Kirim Laporan'}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Ubah `src/app/dosen/(portal)/pengajuan/[id]/page.tsx`.**

Tambahkan impor setelah `import PengajuanForm from '@/components/dosen/PengajuanForm';`:
```tsx
import PanelLaporan from '@/components/dosen/PanelLaporan';
```

Ganti blok impor dari `@/lib/pengajuan-shared`:
```tsx
import {
  FILE_LABEL,
  JENIS_LABEL,
  STATUS_BADGE,
  STATUS_LABEL,
  type FileJenis,
  type Pengajuan,
} from '@/lib/pengajuan-shared';
```
dengan
```tsx
import { FILE_LABEL, JENIS_LABEL, labelPengajuan, type FileJenis, type Pengajuan } from '@/lib/pengajuan-shared';
```

Ganti
```tsx
    ...(p.sk_path ? (['sk'] as const) : []),
  ];
```
dengan
```tsx
    ...(p.sk_path ? (['sk'] as const) : []),
    ...(p.laporan_path ? (['laporan'] as const) : []),
  ];
  const lbl = labelPengajuan(p);
```

Ganti
```tsx
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
```
dengan
```tsx
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${lbl.badge}`}>{lbl.label}</span>
```

Ganti
```tsx
      {p.status === 'terbit' && (
        <Alert kind="success">Surat Tugas dan SK telah terbit. Silakan unduh di bawah.</Alert>
      )}
```
dengan
```tsx
      {p.status === 'terbit' && !p.laporan_status && (
        <Alert kind="success">Surat Tugas dan SK telah terbit. Silakan unduh di bawah.</Alert>
      )}
```

Sisipkan tepat sebelum `      {p.status === 'revisi' && (` (form perbaikan pengajuan):
```tsx
      {p.status === 'terbit' && <PanelLaporan p={p} onSelesai={setP} />}

```

- [ ] **Step 4: Ubah `src/app/dosen/(portal)/page.tsx`.** Ganti
```tsx
import { JENIS_LABEL, STATUS_BADGE, STATUS_LABEL, type Pengajuan } from '@/lib/pengajuan-shared';
```
dengan
```tsx
import { JENIS_LABEL, labelPengajuan, type Pengajuan } from '@/lib/pengajuan-shared';
```
dan ganti
```tsx
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
```
dengan
```tsx
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${labelPengajuan(p).badge}`}>{labelPengajuan(p).label}</span>
```

- [ ] **Step 5: Verifikasi.** `npx tsc --noEmit` → exit 0. Browser (dosen A, pane mungkin tersembunyi — baca lewat `javascript_tool`/`get_page_text`):
  1. `/dosen` → `X` dan `Y` berlabel **Selesai**.
  2. `/dosen/pengajuan/<Y>` → panel "Laporan Akhir" dengan alert "Laporan diterima…", tombol "Laporan yang dikirim" mengunduh PDF (fetch → 200, diawali `%PDF-`), tanpa input file.
  3. Siapkan pengajuan uji ketiga `Z` berstatus `terbit` tanpa laporan (pakai fungsi `ajukan` dari Task 2 Step 6 + setujui + `set-status Z terbit`; simpan `Z=` ke `ids.txt`). `/dosen/pengajuan/<Z>` → panel menampilkan input file + tombol "Kirim Laporan"; lampirkan PDF via `DataTransfer` lalu klik → teks tombol "Mengunggah laporan…" → panel berubah ke "Laporan sedang diperiksa LPPM", badge **Laporan Diperiksa**.
  4. Lebar 375px: `/dosen/pengajuan/<Z>` tanpa scroll horizontal (`scrollWidth === innerWidth`).

- [ ] **Step 6: Commit.**

```bash
git add src/components/dosen/PanelLaporan.tsx "src/app/dosen/(portal)/pengajuan/[id]/page.tsx" "src/app/dosen/(portal)/page.tsx"
git commit -m "feat(laporan): panel laporan akhir di portal dosen, label Selesai

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: UI panel admin (pemeriksaan, filter, badge, dashboard)

**Files:**
- Modify: `src/components/admin/PengajuanAksi.tsx` (append), `src/app/admin/(panel)/pengajuan/[id]/page.tsx`, `src/app/admin/(panel)/pengajuan/page.tsx`, `src/app/admin/(panel)/layout.tsx`, `src/app/admin/(panel)/page.tsx`

**Interfaces:**
- Consumes: API Task 3; `labelPengajuan`, `Pengajuan` (Task 1).
- Produces: `export function PanelPemeriksaanLaporan({ p, onSelesai }: { p: Pengajuan; onSelesai: () => void })`

- [ ] **Step 1: RED.** Login admin di browser, buka `/admin/pengajuan/<Z>` (laporan `dikirim`) dan `/admin/pengajuan`.
Expected sebelum implementasi: tidak ada panel "Pemeriksaan Laporan", tidak ada filter "Laporan Masuk", badge `X` "ST & SK Terbit"; dashboard hanya 2 kartu Perlu Tindakan.

- [ ] **Step 2: Append ke `src/components/admin/PengajuanAksi.tsx`:**

```tsx

export function PanelPemeriksaanLaporan({ p, onSelesai }: { p: Pengajuan; onSelesai: () => void }) {
  const [catatan, setCatatan] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const unduh = p.laporan_path && (
    <a href={`/api/admin/pengajuan/${p.id}/file?jenis=laporan`} target="_blank" rel="noopener noreferrer" className={btnGhost}>
      <DownloadIcon className="w-4 h-4" /> Unduh Laporan
    </a>
  );

  async function putuskan(aksi: 'terima' | 'revisi') {
    if (aksi === 'revisi' && catatan.trim().length < 5) {
      setError('Tulis catatan (minimal 5 karakter) untuk revisi laporan.');
      return;
    }
    const tanya =
      aksi === 'terima'
        ? 'Terima laporan ini? Kegiatan akan tercatat selesai di daftar publik.'
        : 'Kembalikan laporan ini ke dosen untuk revisi?';
    if (!confirm(tanya)) return;
    setBusy(true);
    setError('');
    const res = await fetch(`/api/admin/pengajuan/${p.id}/laporan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aksi, catatan }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error || 'Gagal menyimpan keputusan laporan.');
      return;
    }
    setCatatan('');
    onSelesai();
  }

  if (p.laporan_status !== 'dikirim') {
    return (
      <div className={`${cardCls} p-6 space-y-3`}>
        <h2 className="font-bold text-navy-800">Laporan Akhir</h2>
        <p className="text-sm text-gray-600">
          {p.laporan_status === 'diterima'
            ? 'Laporan telah diterima. Kegiatan tercatat selesai.'
            : p.laporan_status === 'revisi'
              ? `Menunggu dosen mengirim ulang laporan. Catatan: ${p.laporan_catatan}`
              : 'Dosen belum mengirim laporan akhir.'}
        </p>
        {unduh}
      </div>
    );
  }

  return (
    <div className={`${cardCls} p-6 space-y-4`}>
      <h2 className="font-bold text-navy-800">Pemeriksaan Laporan</h2>
      {error && <Alert kind="error">{error}</Alert>}
      {unduh}
      <div>
        <label htmlFor="catatan-laporan" className={labelCls}>
          Catatan untuk dosen <span className="font-normal text-gray-400">(wajib untuk revisi)</span>
        </label>
        <textarea id="catatan-laporan" rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inputCls} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => putuskan('terima')} className={btnSuccess}>
          <CheckIcon className="w-4 h-4" /> Terima Laporan
        </button>
        <button disabled={busy} onClick={() => putuskan('revisi')} className={btnGhost}>
          <EditIcon className="w-4 h-4" /> Minta Revisi
        </button>
      </div>
    </div>
  );
}
```
(Impor yang dipakai — `useState`, `Alert`, `btnGhost`, `btnSuccess`, `cardCls`, `inputCls`, `labelCls`, `CheckIcon`, `DownloadIcon`, `EditIcon`, `Pengajuan` — sudah ada di kepala file.)

- [ ] **Step 3: Ubah `src/app/admin/(panel)/pengajuan/[id]/page.tsx`.**

Ganti
```tsx
import { PanelKeputusan, PanelSurat } from '@/components/admin/PengajuanAksi';
import { JENIS_LABEL, STATUS_BADGE, STATUS_LABEL, type Pengajuan } from '@/lib/pengajuan-shared';
```
dengan
```tsx
import { PanelKeputusan, PanelPemeriksaanLaporan, PanelSurat } from '@/components/admin/PengajuanAksi';
import { JENIS_LABEL, labelPengajuan, type Pengajuan } from '@/lib/pengajuan-shared';
```

Ganti
```tsx
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
```
dengan
```tsx
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${labelPengajuan(p).badge}`}>{labelPengajuan(p).label}</span>
```

Ganti
```tsx
      {(p.status === 'disetujui' || p.status === 'terbit') && <PanelSurat p={p} onSelesai={load} />}
```
dengan
```tsx
      {p.status === 'terbit' && <PanelPemeriksaanLaporan p={p} onSelesai={load} />}
      {(p.status === 'disetujui' || p.status === 'terbit') && <PanelSurat p={p} onSelesai={load} />}
```

- [ ] **Step 4: Ubah `src/app/admin/(panel)/pengajuan/page.tsx`.**

Ganti
```tsx
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
```
dengan
```tsx
import { JENIS_LABEL, labelPengajuan, type Pengajuan, type StatusPengajuan } from '@/lib/pengajuan-shared';

type Baris = Pick<Pengajuan, 'id' | 'jenis' | 'judul' | 'skema' | 'tahun' | 'status' | 'laporan_status' | 'created_at'> & {
  profil: { nama: string; prodi: string } | null;
};
type Filter = '' | StatusPengajuan | 'laporan';

const FILTER: { v: Filter; l: string }[] = [
```

Ganti
```tsx
  { v: 'ditolak', l: 'Ditolak' },
];
```
dengan
```tsx
  { v: 'ditolak', l: 'Ditolak' },
  { v: 'laporan', l: 'Laporan Masuk' },
];
```

Ganti
```tsx
  const [status, setStatus] = useState<'' | StatusPengajuan>('');
```
dengan
```tsx
  const [status, setStatus] = useState<Filter>('');
```

Ganti
```tsx
    if (status) q.set('status', status);
```
dengan
```tsx
    if (status === 'laporan') q.set('laporan', 'dikirim');
    else if (status) q.set('status', status);
```

Ganti
```tsx
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
```
dengan
```tsx
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${labelPengajuan(r).badge}`}>{labelPengajuan(r).label}</span>
```

- [ ] **Step 5: Badge sidebar — `src/app/admin/(panel)/layout.tsx`.** Ganti
```tsx
  const [aj, akun] = await Promise.all([
    db.from('pengajuan').select('id', { count: 'exact', head: true }).eq('status', 'diajukan'),
    db.from('profil').select('user_id', { count: 'exact', head: true }).eq('peran', 'dosen').eq('status', 'menunggu'),
  ]);
  return (
    <AdminShell badges={{ pengajuan: aj.count ?? 0, dosen: akun.count ?? 0 }}>{children}</AdminShell>
  );
```
dengan
```tsx
  const [aj, lap, akun] = await Promise.all([
    db.from('pengajuan').select('id', { count: 'exact', head: true }).eq('status', 'diajukan'),
    db.from('pengajuan').select('id', { count: 'exact', head: true }).eq('laporan_status', 'dikirim'),
    db.from('profil').select('user_id', { count: 'exact', head: true }).eq('peran', 'dosen').eq('status', 'menunggu'),
  ]);
  return (
    <AdminShell badges={{ pengajuan: (aj.count ?? 0) + (lap.count ?? 0), dosen: akun.count ?? 0 }}>{children}</AdminShell>
  );
```

- [ ] **Step 6: Kartu dashboard — `src/app/admin/(panel)/page.tsx`.**

Ganti seluruh blok
```tsx
  const [ajBaru, akunBaru] = await Promise.all([
    db.from('pengajuan').select('id', { count: 'exact', head: true }).eq('status', 'diajukan'),
    db.from('profil').select('user_id', { count: 'exact', head: true }).eq('peran', 'dosen').eq('status', 'menunggu'),
  ]);
```
dengan
```tsx
  const [ajBaru, akunBaru, lapBaru] = await Promise.all([
    db.from('pengajuan').select('id', { count: 'exact', head: true }).eq('status', 'diajukan'),
    db.from('profil').select('user_id', { count: 'exact', head: true }).eq('peran', 'dosen').eq('status', 'menunggu'),
    db.from('pengajuan').select('id', { count: 'exact', head: true }).eq('laporan_status', 'dikirim'),
  ]);
```

Ganti
```tsx
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
```
dengan
```tsx
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
```

Sisipkan setelah blok `<Link href="/admin/akun-dosen" ...>...</Link>` (sebelum `      </div>` penutup grid):
```tsx
        <Link
          href="/admin/pengajuan"
          className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 p-5 transition hover:shadow-lg hover:shadow-navy-900/5 hover:border-navy-200"
        >
          <span className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DocIcon className="w-6 h-6" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-navy-800 tabular-nums">{lapBaru.count ?? 0}</p>
            <p className="text-sm text-gray-500">Laporan menunggu pemeriksaan</p>
          </div>
        </Link>
```
(`DocIcon` sudah diimpor di file ini.)

- [ ] **Step 7: Verifikasi.** `npx tsc --noEmit` → exit 0. Lalu:
```bash
AC=$(node scripts/uji.mjs cookie-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
H=$(curl -s -H "Cookie: $AC" http://localhost:3000/admin)
echo "$H" | grep -q 'Laporan menunggu pemeriksaan' && echo "kartu ok"
echo "$H" | grep -o 'aria-label="[0-9]* perlu tindakan"' | head -2
```
Expected: `kartu ok`; badge Pengajuan menghitung pengajuan `diajukan` + laporan `dikirim` (dengan data uji: laporan `Z` = 1, plus pengajuan diajukan lain bila ada).

Browser (admin):
  1. `/admin/pengajuan` → filter **Laporan Masuk** hanya menampilkan `Z` berlabel "Laporan Diperiksa"; `X`/`Y` berlabel "Selesai" di filter Semua.
  2. `/admin/pengajuan/<Z>` → panel "Pemeriksaan Laporan"; "Unduh Laporan" → PDF; klik **Minta Revisi** tanpa catatan → pesan galat lokal; isi catatan → Minta Revisi (konfirmasi `window.confirm` di-override `() => true` saat otomasi) → panel berubah "Menunggu dosen mengirim ulang laporan. Catatan: …", badge "Laporan Perlu Revisi".
  3. `/admin/pengajuan/<X>` → panel "Laporan Akhir" berisi "Laporan telah diterima…" + Unduh; panel Surat Tugas & SK tetap ada.
  4. Dashboard → tiga kartu Perlu Tindakan; lebar 375px tanpa scroll horizontal.

- [ ] **Step 8: Commit.**

```bash
git add src/components/admin/PengajuanAksi.tsx "src/app/admin/(panel)/pengajuan" "src/app/admin/(panel)/layout.tsx" "src/app/admin/(panel)/page.tsx"
git commit -m "feat(laporan): panel pemeriksaan laporan, filter Laporan Masuk, badge & kartu dashboard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: README, build produksi, verifikasi menyeluruh, pembersihan

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README.** Ganti
```markdown
> Proyek yang sudah berjalan sebelum Oktober 2026: jalankan sekali `supabase/migrasi-2026-10-peran.sql` agar akun admin lama mendapat peran admin. Jangan dijalankan ulang.
```
dengan
```markdown
> Proyek yang sudah berjalan sebelum Oktober 2026: jalankan sekali `supabase/migrasi-2026-10-peran.sql` agar akun admin lama mendapat peran admin (jangan dijalankan ulang), lalu `supabase/migrasi-2026-10-laporan.sql` untuk kolom laporan akhir (aman bila terulang).
```
dan ganti paragraf di bawah `## Akun Dosen`
```markdown
Dosen mendaftar di `/dosen/daftar` → status **menunggu** → admin menyetujui di **Panel Admin → Akun Dosen**. Dosen aktif dapat mengajukan penelitian/PkM; admin memverifikasi di **Pengajuan**, lalu mengunggah Surat Tugas & SK (PDF, maks 10 MB, diunggah langsung ke Storage privat).
```
dengan
```markdown
Dosen mendaftar di `/dosen/daftar` → status **menunggu** → admin menyetujui di **Panel Admin → Akun Dosen**. Dosen aktif dapat mengajukan penelitian/PkM; admin memverifikasi di **Pengajuan**, lalu mengunggah Surat Tugas & SK (PDF, maks 10 MB, diunggah langsung ke Storage privat).

Setelah ST & SK terbit, dosen mengunggah **laporan akhir** (PDF) di halaman detail pengajuan. Admin memeriksanya lewat filter **Laporan Masuk**: **Terima** (kegiatan di daftar publik otomatis berstatus *selesai*) atau **Minta Revisi** dengan catatan.
```

- [ ] **Step 2: Matriks akses & regresi (dev).** Simpan sebagai `<W>/verify-t6.sh`:

```bash
set -e
BASE=${BASE:-http://localhost:3000}
source <(sed 's/^/export /' .superpowers/uji/ids.txt)
A=$(node scripts/uji.mjs cookie A); B=$(node scripts/uji.mjs cookie B)
AC=$(node scripts/uji.mjs cookie-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
c() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
J='Content-Type: application/json'
r="tanpa:$(c -X POST -H "$J" -d '{}' $BASE/api/admin/pengajuan/$X/laporan) dosen:$(c -X POST -H "Cookie: $A" -H "$J" -d '{}' $BASE/api/admin/pengajuan/$X/laporan)"
echo "keputusan laporan $r"; [ "$r" = "tanpa:401 dosen:403" ]
r="tanpa:$(c -X POST $BASE/api/dosen/pengajuan/$X/laporan/unggah) admin:$(c -X POST -H "Cookie: $AC" $BASE/api/dosen/pengajuan/$X/laporan/unggah) B:$(c -X POST -H "Cookie: $B" $BASE/api/dosen/pengajuan/$X/laporan/unggah)"
echo "token laporan $r"; [ "$r" = "tanpa:401 admin:403 B:404" ]
[ "$(c -H "Cookie: $AC" $BASE/admin/pengajuan)" = 200 ]
[ "$(c -H "Cookie: $A" $BASE/api/dosen/pengajuan)" = 200 ]
[ "$(c $BASE/dosen)" = 307 ]
echo "PASS t6 ($BASE): matriks akses laporan, halaman admin & portal dosen"
```
Jalankan `bash <W>/verify-t6.sh` (dev) → `PASS t6 (http://localhost:3000): ...`.

- [ ] **Step 3: Build produksi.** Hentikan dev server (`preview_stop`), `npx tsc --noEmit` → exit 0, `npm run build` → sukses dan rute baru terdaftar: `/api/dosen/pengajuan/[id]/laporan`, `/api/dosen/pengajuan/[id]/laporan/unggah`, `/api/admin/pengajuan/[id]/laporan`. Jalankan `preview_start lppm-prod`, ulangi `bash <W>/verify-t6.sh` → `PASS t6 ...`. Hentikan `lppm-prod`, jalankan lagi `preview_start lppm-website`.

- [ ] **Step 4: Bersihkan data uji (WAJIB — database produksi).**

```bash
node scripts/uji.mjs bersihkan
node -e "
const { createClient } = require('@supabase/supabase-js');
require('fs').readFileSync('.env.local','utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].trim();});
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async()=>{
  const p = await db.from('profil').select('email').like('email','%@example.com');
  const a = await db.from('pengajuan').select('id',{count:'exact',head:true});
  const pn = await db.from('penelitian').select('id').like('judul','Uji Laporan%');
  const pk = await db.from('pkm').select('id').like('judul','Uji Laporan%');
  const u = await db.auth.admin.listUsers();
  const st = await db.storage.from('pengajuan').list('', {limit:100});
  console.log('profil uji:', p.data.length, '| pengajuan:', a.count, '| publik uji:', pn.data.length + pk.data.length,
    '| user Auth uji:', u.data.users.filter(x=>x.email.endsWith('@example.com')).length, '| folder bucket:', (st.data||[]).length);
})();
"
rm -rf .superpowers/uji
```
Expected: `dihapus uji.dosen.b@example.com`, `dihapus uji.dosen.a@example.com`, `selesai`; lalu `profil uji: 0 | pengajuan: 0 | publik uji: 0 | user Auth uji: 0 | folder bucket: 0`. (Baris publik `Y` sudah dihapus di Task 3 Step 6; `bersihkan` mengabaikan `publik_id` yang barisnya tidak ada.)

- [ ] **Step 5: Commit.**

```bash
git add README.md
git commit -m "docs(laporan): README alur laporan akhir & migrasi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Catatan Eksekusi

- Kerjakan di branch `feature/laporan-akhir` (sudah dibuat; spec ada di commit `aed1dc3`).
- Task 1 Step 4 adalah **PAUSE**: user menjalankan migrasi di Supabase SQL Editor. Semua task berikutnya bergantung padanya.
- Migrasi hanya menambah kolom nullable/default — aman untuk produksi yang sedang berjalan (kode lama mengabaikan kolom baru).
- Setelah merge & deploy: tidak ada langkah database tambahan (migrasi sudah dijalankan di Task 1).
