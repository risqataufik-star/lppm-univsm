# Integrasi OJS UnivSM + Modul Monev OJS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menarik data jurnal & artikel dari OJS UnivSM (OAI-PMH) ke Supabase, menampilkannya di halaman "Jurnal" publik baru, dan menyediakan modul Monev OJS di panel admin.

**Architecture:** Rute admin `POST /api/ojs/sync` mem-harvest OAI-PMH OJS (server-side, User-Agent browser), mem-parse dengan `fast-xml-parser`, dan menyimpan ke tabel Supabase `ojs_jurnal`/`ojs_artikel`. Halaman publik & modul Monev membaca dari Supabase (cepat, tahan gangguan). Aditif — tidak menyentuh fitur `publikasi` manual yang sudah ada.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Supabase, `fast-xml-parser`, Tailwind (admin build + CDN publik).

**Spec:** `docs/superpowers/specs/2026-07-15-integrasi-ojs-design.md` — baca dulu sebelum mengerjakan task apa pun.

## Global Constraints

- Seluruh UI dan pesan error berbahasa Indonesia; format error API `{ "error": "<pesan>" }` dengan status HTTP semestinya.
- Harvest OJS WAJIB mengirim header `User-Agent` browser realistis (UA non-browser diblokir 403 oleh WAF OJS).
- Endpoint OAI: site-wide `https://ojs.univsm.ac.id/index/oai`, format `oai_dc`.
- `SUPABASE_SERVICE_ROLE_KEY` hanya server-side. `POST /api/ojs/sync` wajib `requireAdmin`.
- Warna identitas: navy `#1d2b78`, gold `#f0a500`. Panel admin memakai primitif UI bersama di `src/components/admin/ui.tsx` (`PageHeader`, `cardCls`, `theadCls`, `thCls`, `tdCls`, `btnPrimary`, dsb).
- Tampilan situs publik memakai pola fallback `api-content.js` yang ada: konten statis tampil bila API gagal.
- Ambang status jurnal: **Aktif** = `terbit_terakhir` ≤ 12 bulan terakhir; **Dorman** = lebih lama / null.
- Tidak ada framework unit test; verifikasi via `npm run typecheck`, skrip `node`, `curl`, dan browser.
- Dev server: `npm run dev` (port 3000), dari root repo `E:\lab\lppm-univsm`. `.env.local` sudah berisi kredensial Supabase nyata.
- 9 kode jurnal (nama resmi diambil dari OAI ListSets saat sync): `univsm`, `lex`, `INFOTECH`, `logic`, `BITCODE`, `edumandiri`, `manajerial`, `civilia`, `nutri`.
- Commit tiap akhir task; trailer commit: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Skema Supabase + dependency fast-xml-parser

**Files:**
- Modify: `supabase/schema.sql` (tambah tabel + seed key)
- Modify: `package.json` (tambah `fast-xml-parser`)

**Interfaces:**
- Produces: tabel `ojs_jurnal`, `ojs_artikel`; key `pengaturan`: `ojs_last_sync`, `ojs_last_status`, `ojs_resume_token`. Dependency `fast-xml-parser` untuk Task 2.

- [ ] **Step 1: Install dependency.**

Run: `npm install fast-xml-parser@^4.5.0`
Expected: sukses, `fast-xml-parser` muncul di `package.json` dependencies.

- [ ] **Step 2: Tambahkan DDL ke `supabase/schema.sql`** (append di akhir file, sebelum atau sesudah blok yang ada — letakkan setelah tabel `pengaturan`):

```sql
-- ============ Integrasi OJS UnivSM ============
create table if not exists ojs_jurnal (
  kode text primary key,
  nama text not null,
  url text not null,
  jml_artikel int not null default 0,
  jml_terbitan int not null default 0,
  terbit_terakhir date,
  updated_at timestamptz
);

create table if not exists ojs_artikel (
  id text primary key,
  jurnal_kode text not null,
  judul text not null,
  penulis text not null default '',
  tanggal date,
  tahun int,
  issue text not null default '',
  url text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_ojs_artikel_jurnal on ojs_artikel (jurnal_kode);
create index if not exists idx_ojs_artikel_tahun on ojs_artikel (tahun);

alter table ojs_jurnal enable row level security;
alter table ojs_artikel enable row level security;

insert into pengaturan (key, value) values
  ('ojs_last_sync', ''),
  ('ojs_last_status', ''),
  ('ojs_resume_token', '')
on conflict (key) do nothing;
```

- [ ] **Step 3: PAUSE — user menjalankan SQL.** Sampaikan ke user: buka Supabase Dashboard → SQL Editor → jalankan blok DDL di atas (atau seluruh `supabase/schema.sql` — semuanya idempoten dengan `if not exists` / `on conflict do nothing`). Tunggu konfirmasi.

- [ ] **Step 4: Verifikasi tabel ada** (setelah user konfirmasi):

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('fs').readFileSync('.env.local','utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].trim();});
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
Promise.all(['ojs_jurnal','ojs_artikel'].map(t=>db.from(t).select('*',{count:'exact',head:true}).then(r=>[t, r.error?r.error.message:'OK count='+r.count]))).then(rs=>rs.forEach(x=>console.log(x[0],x[1])));
"
```
Expected: `ojs_jurnal OK count=0` dan `ojs_artikel OK count=0`.

- [ ] **Step 5: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add supabase/schema.sql package.json package-lock.json
git commit -m "feat(ojs): skema tabel ojs_jurnal/ojs_artikel + dependency fast-xml-parser"
```

---

### Task 2: Lib harvest & parse OAI (`src/lib/ojs.ts`)

**Files:**
- Create: `src/lib/ojs.ts`

**Interfaces:**
- Consumes: `fast-xml-parser` (Task 1).
- Produces:
  - type `OjsJurnal = { kode: string; nama: string; url: string }`
  - type `OjsArtikel = { id: string; jurnal_kode: string; judul: string; penulis: string; tanggal: string | null; tahun: number | null; issue: string; url: string }`
  - `harvestOjs(): Promise<{ jurnal: OjsJurnal[]; artikel: OjsArtikel[] }>` — melempar Error bila OAI non-200.
  - (internal, diekspor untuk verifikasi) `parseSets(xml)`, `parseRecordsPage(xml)`.

**Catatan struktur OAI nyata (terverifikasi):** `header.setSpec` = `"<kode>:ART"` (ambil sebelum `:`); record `status="deleted"` dilewati; field `dc:*` punya `xml:lang` sehingga ter-parse jadi `{ '#text': ..., '@_lang': ... }` (butuh helper `textOf`); `resumptionToken` punya atribut + teks token; `completeListSize` ~130.

- [ ] **Step 1: Tulis `src/lib/ojs.ts`:**

```ts
import { XMLParser } from 'fast-xml-parser';

const OJS_BASE = 'https://ojs.univsm.ac.id';
const OAI = `${OJS_BASE}/index/oai`;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export type OjsJurnal = { kode: string; nama: string; url: string };
export type OjsArtikel = {
  id: string;
  jurnal_kode: string;
  judul: string;
  penulis: string;
  tanggal: string | null;
  tahun: number | null;
  issue: string;
  url: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  textNodeName: '#text',
  isArray: (name) => name === 'record' || name === 'set',
});

function toArray<T>(x: T | T[] | undefined | null): T[] {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

// Ekstrak teks dari node yang bisa berupa string, {'#text',...}, atau array
function textOf(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node.trim();
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    for (const n of node) { const t = textOf(n); if (t) return t; }
    return '';
  }
  if (typeof node === 'object' && '#text' in (node as Record<string, unknown>)) {
    return String((node as Record<string, unknown>)['#text'] ?? '').trim();
  }
  return '';
}

function normalizeDate(s: string): string | null {
  if (!s) return null;
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const y = s.match(/(\d{4})/);
  if (y) return `${y[1]}-01-01`;
  return null;
}

async function fetchOai(params: string): Promise<string> {
  const res = await fetch(`${OAI}?${params}`, {
    headers: { 'User-Agent': UA, Accept: 'application/xml,text/xml,*/*' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`OJS OAI HTTP ${res.status}`);
  return res.text();
}

export function parseSets(xml: string): OjsJurnal[] {
  const doc = parser.parse(xml) as Record<string, any>;
  const sets = toArray(doc?.['OAI-PMH']?.ListSets?.set);
  const out: OjsJurnal[] = [];
  const seen = new Set<string>();
  for (const s of sets) {
    const spec = textOf(s?.setSpec) || String(s?.setSpec ?? '');
    if (!spec || spec.includes(':')) continue; // hanya set tingkat-jurnal (tanpa ':')
    const kode = spec.trim();
    if (seen.has(kode)) continue;
    seen.add(kode);
    out.push({ kode, nama: textOf(s?.setName) || kode, url: `${OJS_BASE}/${kode}` });
  }
  return out;
}

export function parseRecordsPage(xml: string): { artikel: OjsArtikel[]; resumptionToken: string | null } {
  const doc = parser.parse(xml) as Record<string, any>;
  const lr = doc?.['OAI-PMH']?.ListRecords;
  const records = toArray(lr?.record);
  const artikel: OjsArtikel[] = [];
  for (const rec of records) {
    if (rec?.header?.['@_status'] === 'deleted') continue;
    const md = rec?.metadata?.dc;
    if (!md) continue;
    const id = String(rec?.header?.identifier ?? '').trim();
    if (!id) continue;
    const specRaw = textOf(rec?.header?.setSpec) || String(rec?.header?.setSpec ?? '');
    const jurnal_kode = specRaw.split(':')[0].trim();
    if (!jurnal_kode) continue;
    const judul = toArray(md.title).map(textOf).find(Boolean) ?? '';
    if (!judul) continue;
    const penulis = toArray(md.creator).map(textOf).filter(Boolean).join('; ');
    const tanggal = normalizeDate(toArray(md.date).map(textOf).find(Boolean) ?? '');
    const tahun = tanggal ? Number(tanggal.slice(0, 4)) : null;
    const source = toArray(md.source).map(textOf).find(Boolean) ?? '';
    const issue = source.includes(';') ? source.slice(source.indexOf(';') + 1).trim() : source.trim();
    const url = toArray(md.identifier).map(textOf).find((s) => s.startsWith('http')) ?? '';
    artikel.push({ id, jurnal_kode, judul, penulis, tanggal, tahun, issue, url });
  }
  const rtNode = lr?.resumptionToken;
  const rt = textOf(rtNode) || (typeof rtNode === 'string' ? rtNode.trim() : '');
  return { artikel, resumptionToken: rt || null };
}

export async function harvestOjs(): Promise<{ jurnal: OjsJurnal[]; artikel: OjsArtikel[] }> {
  const jurnal = parseSets(await fetchOai('verb=ListSets'));
  const artikel: OjsArtikel[] = [];
  const seenIds = new Set<string>();
  let params = 'verb=ListRecords&metadataPrefix=oai_dc';
  for (let page = 0; page < 30; page++) {
    const { artikel: pageArt, resumptionToken } = parseRecordsPage(await fetchOai(params));
    for (const a of pageArt) {
      if (seenIds.has(a.id)) continue;
      seenIds.add(a.id);
      artikel.push(a);
    }
    if (!resumptionToken) break;
    params = `verb=ListRecords&resumptionToken=${encodeURIComponent(resumptionToken)}`;
  }
  return { jurnal, artikel };
}
```

- [ ] **Step 2: Verifikasi parser terhadap OJS nyata** (skrip node, memakai file lib via `tsx` tidak tersedia — verifikasi lewat build TS ringan atau skrip JS setara). Jalankan skrip verifikasi berikut yang meniru logika `harvestOjs` untuk memastikan data nyata terparse benar:

```bash
node -e "
const { XMLParser } = require('fast-xml-parser');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_',removeNSPrefix:true,textNodeName:'#text',isArray:(n)=>n==='record'||n==='set'});
const toArr=x=>x==null?[]:Array.isArray(x)?x:[x];
const txt=n=>{if(n==null)return '';if(typeof n==='string')return n.trim();if(Array.isArray(n)){for(const m of n){const t=txt(m);if(t)return t;}return '';}if(typeof n==='object'&&'#text'in n)return String(n['#text']??'').trim();return '';};
(async()=>{
  const f=async p=>(await fetch('https://ojs.univsm.ac.id/index/oai?'+p,{headers:{'User-Agent':UA}})).text();
  const sets=parser.parse(await f('verb=ListSets'))['OAI-PMH'].ListSets.set;
  const jurnal=toArr(sets).filter(s=>!txt(s.setSpec).includes(':')).map(s=>({kode:txt(s.setSpec),nama:txt(s.setName)}));
  const doc=parser.parse(await f('verb=ListRecords&metadataPrefix=oai_dc'))['OAI-PMH'].ListRecords;
  const recs=toArr(doc.record).filter(r=>r.header['@_status']!=='deleted'&&r.metadata);
  const sample=recs.slice(0,2).map(r=>({kode:txt(r.header.setSpec).split(':')[0],judul:txt(toArr(r.metadata.dc.title)[0]).slice(0,50),penulis:toArr(r.metadata.dc.creator).map(txt).join('; ')}));
  console.log('jurnal:',jurnal.length, jurnal.map(j=>j.kode).join(','));
  console.log('records(non-deleted, page1):',recs.length);
  console.log('sample:',JSON.stringify(sample,null,2));
})();
"
```
Expected: `jurnal:` ≥ 9 dengan kode termasuk `univsm,lex,...`; `records` > 0; `sample` menampilkan judul & penulis nyata (bukan kosong), `kode` termasuk salah satu dari 9 kode jurnal.

- [ ] **Step 3: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add src/lib/ojs.ts
git commit -m "feat(ojs): lib harvest & parse OAI-PMH (fetch UA browser, oai_dc)"
```

---

### Task 3: API sinkronisasi (admin) — `POST /api/ojs/sync`

**Files:**
- Create: `src/app/api/ojs/sync/route.ts`

**Interfaces:**
- Consumes: `harvestOjs` (Task 2), `supabaseAdmin` (`src/lib/supabase/admin.ts`), `requireAdmin` (`src/lib/auth.ts`).
- Produces: `POST /api/ojs/sync` → `{ ok: true, jurnal: N, artikel: M }` (admin); `502 { error }` bila OAI gagal; `401` tanpa login.

- [ ] **Step 1: Tulis `src/app/api/ojs/sync/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { harvestOjs, type OjsJurnal } from '@/lib/ojs';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = supabaseAdmin();

  let harvest: Awaited<ReturnType<typeof harvestOjs>>;
  try {
    harvest = await harvestOjs();
  } catch {
    const msg = 'Gagal mengambil data dari OJS. Data lama tetap dipakai.';
    await db.from('pengaturan').upsert({ key: 'ojs_last_status', value: msg });
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Peta jurnal: dari ListSets + kode apa pun yang muncul di artikel
  const jurnalMap = new Map<string, OjsJurnal>(harvest.jurnal.map((j) => [j.kode, j]));
  for (const a of harvest.artikel) {
    if (!jurnalMap.has(a.jurnal_kode)) {
      jurnalMap.set(a.jurnal_kode, {
        kode: a.jurnal_kode,
        nama: a.jurnal_kode,
        url: `https://ojs.univsm.ac.id/${a.jurnal_kode}`,
      });
    }
  }

  // Agregat per jurnal
  const agg = new Map<string, { count: number; issues: Set<string>; last: string | null }>();
  for (const a of harvest.artikel) {
    const g = agg.get(a.jurnal_kode) ?? { count: 0, issues: new Set<string>(), last: null };
    g.count += 1;
    if (a.issue) g.issues.add(a.issue);
    if (a.tanggal && (!g.last || a.tanggal > g.last)) g.last = a.tanggal;
    agg.set(a.jurnal_kode, g);
  }

  const jurnalRows = [...jurnalMap.values()].map((j) => {
    const g = agg.get(j.kode);
    return {
      kode: j.kode,
      nama: j.nama,
      url: j.url,
      jml_artikel: g?.count ?? 0,
      jml_terbitan: g?.issues.size ?? 0,
      terbit_terakhir: g?.last ?? null,
      updated_at: new Date().toISOString(),
    };
  });

  const { error: jErr } = await db.from('ojs_jurnal').upsert(jurnalRows);
  if (jErr) return NextResponse.json({ error: 'Gagal menyimpan data jurnal.' }, { status: 500 });

  // Ganti total isi ojs_artikel (harvest sudah sukses penuh sebelum menyentuh DB)
  await db.from('ojs_artikel').delete().neq('id', '');
  for (let i = 0; i < harvest.artikel.length; i += 500) {
    const batch = harvest.artikel.slice(i, i + 500);
    const { error } = await db.from('ojs_artikel').insert(batch);
    if (error) return NextResponse.json({ error: 'Gagal menyimpan artikel.' }, { status: 500 });
  }

  const status = `${jurnalRows.length} jurnal, ${harvest.artikel.length} artikel`;
  await db.from('pengaturan').upsert([
    { key: 'ojs_last_sync', value: new Date().toISOString() },
    { key: 'ojs_last_status', value: status },
  ]);

  return NextResponse.json({ ok: true, jurnal: jurnalRows.length, artikel: harvest.artikel.length });
}
```

- [ ] **Step 2: Verifikasi proteksi (tanpa login → 401).** Dev server jalan (`npm run dev`):

`curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/ojs/sync` → Expected: `401`.

- [ ] **Step 3: Verifikasi sync nyata via service-role** (meniru jalur harvest→simpan tanpa perlu sesi login, untuk memastikan data masuk). Jalankan skrip node yang memanggil harvest langsung dan tulis ke Supabase:

```bash
node --input-type=module -e "
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
readFileSync('.env.local','utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].trim();});
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
const [j,a]=await Promise.all([db.from('ojs_jurnal').select('*',{count:'exact',head:true}),db.from('ojs_artikel').select('*',{count:'exact',head:true})]);
console.log('SEBELUM sync: jurnal',j.count,'artikel',a.count);
console.log('Jalankan POST /api/ojs/sync via browser admin (Task 6) untuk mengisi, atau uji manual di Step 4.');
"
```
Expected: menampilkan hitungan awal (0/0 jika belum pernah sync). Pengisian sesungguhnya diuji end-to-end lewat tombol admin di Task 6 (butuh sesi login). Catat di laporan bahwa proteksi 401 terverifikasi di Step 2.

- [ ] **Step 4: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add src/app/api/ojs/sync/route.ts
git commit -m "feat(ojs): API sinkronisasi admin POST /api/ojs/sync"
```

---

### Task 4: API publik — `GET /api/ojs/jurnal` & `GET /api/ojs/artikel`

**Files:**
- Create: `src/app/api/ojs/jurnal/route.ts`, `src/app/api/ojs/artikel/route.ts`

**Interfaces:**
- Consumes: `supabaseAdmin` (server-side read).
- Produces:
  - `GET /api/ojs/jurnal` → array `ojs_jurnal` (urut `nama` asc)
  - `GET /api/ojs/artikel?limit=&jurnal=` → array `ojs_artikel` (urut `tanggal` desc, filter opsional `jurnal_kode`)

- [ ] **Step 1: Tulis `src/app/api/ojs/jurnal/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from('ojs_jurnal')
    .select('*')
    .order('nama', { ascending: true });
  if (error) return NextResponse.json({ error: 'Gagal mengambil data jurnal.' }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Tulis `src/app/api/ojs/artikel/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const url = new URL(req.url);
  let q = supabaseAdmin()
    .from('ojs_artikel')
    .select('*')
    .order('tanggal', { ascending: false, nullsFirst: false });
  const jurnal = url.searchParams.get('jurnal');
  if (jurnal) q = q.eq('jurnal_kode', jurnal);
  const limit = Number(url.searchParams.get('limit'));
  if (limit > 0) q = q.limit(limit);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: 'Gagal mengambil artikel.' }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Verifikasi** (dev server jalan):

- `curl -s http://localhost:3000/api/ojs/jurnal` → Expected: `[]` (atau array jurnal bila sudah pernah sync).
- `curl -s "http://localhost:3000/api/ojs/artikel?limit=5"` → Expected: `[]` (atau array artikel).
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/ojs/jurnal` → Expected: `200`.

- [ ] **Step 4: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add src/app/api/ojs/jurnal/route.ts src/app/api/ojs/artikel/route.ts
git commit -m "feat(ojs): API publik daftar jurnal & artikel"
```

---

### Task 5: Halaman publik "Jurnal" + api-content.js + navbar

**Files:**
- Create: `public/jurnal.html`
- Modify: `public/assets/js/api-content.js` (tambah pengisi OJS)
- Modify: 12 file navbar publik: `public/index.html`, `berita.html`, `dokumen.html`, `hibah.html`, `kerjasama.html`, `kontak.html`, `monev.html`, `penelitian.html`, `pkm.html`, `profil.html`, `publikasi.html`, `roadmap.html`

**Interfaces:**
- Consumes: `GET /api/ojs/jurnal`, `GET /api/ojs/artikel?limit=10` (Task 4).
- Produces: kontrak DOM `#list-ojs-jurnal` (grid kartu jurnal) dan `#list-ojs-artikel` (daftar artikel) di `jurnal.html`; entri navbar "Jurnal Ilmiah (OJS)".

- [ ] **Step 1: Buat `public/jurnal.html`.** Duplikat kerangka dari `public/publikasi.html` (SALIN: seluruh `<head>`, `<nav>` navbar, page-header, `<footer>`, dan blok `<script src="assets/js/main.js">` + tambahkan `api-content.js`). GANTI `<title>` menjadi `Jurnal Ilmiah – LPPM Universitas Sapta Mandiri` dan isi `<main>` dengan dua section berikut (memakai kelas Tailwind CDN yang sama seperti halaman lain):

```html
<main class="page-content">
  <section class="page-header-bg text-white py-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 class="text-3xl sm:text-4xl font-extrabold">Jurnal Ilmiah UnivSM</h1>
      <p class="text-white/70 mt-3 max-w-2xl">Jurnal-jurnal ilmiah yang dikelola dan diterbitkan Universitas Sapta Mandiri melalui portal OJS.</p>
    </div>
  </section>

  <!-- Daftar Jurnal -->
  <section class="py-14 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 class="text-2xl font-bold text-navy-800 title-bar mb-8">Daftar Jurnal</h2>
      <div id="list-ojs-jurnal" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <!-- Fallback statis bila API gagal -->
        <div class="p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p class="text-gray-500 text-sm">Data jurnal sedang dimuat. Jika tidak muncul, kunjungi portal
            <a href="https://ojs.univsm.ac.id" target="_blank" rel="noopener" class="text-navy-700 font-semibold hover:underline">OJS UnivSM</a>.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Artikel Terbaru -->
  <section class="py-14 bg-navy-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 class="text-2xl font-bold text-navy-800 title-bar mb-8">Artikel Terbaru</h2>
      <div id="list-ojs-artikel" class="space-y-3">
        <p class="text-gray-500 text-sm">Memuat artikel terbaru…</p>
      </div>
    </div>
  </section>
</main>
```

- [ ] **Step 2: Tambahkan pengisi OJS ke `public/assets/js/api-content.js`.** Sisipkan dua fungsi berikut di dalam IIFE (setelah fungsi `fillDokumen`, sebelum blok `document.addEventListener('DOMContentLoaded', ...)`):

```js
  /* ── Jurnal OJS ── */
  async function fillOjsJurnal() {
    const wrap = document.getElementById('list-ojs-jurnal');
    if (!wrap) return;
    const data = await getJson('/api/ojs/jurnal');
    if (!data.length) return;
    wrap.innerHTML = data.map((j) =>
      '<div class="p-6 rounded-2xl border border-gray-100 shadow-sm bg-white card-hover flex flex-col">' +
      '<h3 class="font-bold text-navy-800 mb-2 leading-snug">' + esc(j.nama) + '</h3>' +
      '<p class="text-xs text-gray-400 mb-4"><i class="ri-article-line"></i> ' + esc(j.jml_artikel) + ' artikel · ' + esc(j.jml_terbitan) + ' terbitan</p>' +
      '<a href="' + esc(j.url) + '" target="_blank" rel="noopener" class="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-gold-600"><i class="ri-external-link-line"></i> Kunjungi di OJS</a>' +
      '</div>'
    ).join('');
  }

  async function fillOjsArtikel() {
    const wrap = document.getElementById('list-ojs-artikel');
    if (!wrap) return;
    const data = await getJson('/api/ojs/artikel?limit=10');
    if (!data.length) { wrap.innerHTML = '<p class="text-gray-500 text-sm">Belum ada artikel. Kunjungi <a href="https://ojs.univsm.ac.id" target="_blank" rel="noopener" class="text-navy-700 font-semibold hover:underline">OJS UnivSM</a>.</p>'; return; }
    wrap.innerHTML = data.map((a) =>
      '<article class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">' +
      '<a href="' + esc(a.url) + '" target="_blank" rel="noopener" class="font-semibold text-navy-800 hover:text-navy-600 leading-snug">' + esc(a.judul) + '</a>' +
      '<p class="text-xs text-gray-500 mt-1">' + esc(a.penulis) + (a.tanggal ? ' · ' + fmtTgl(a.tanggal) : '') + '</p>' +
      '</article>'
    ).join('');
  }
```

Lalu tambahkan keduanya ke array Promise di blok `DOMContentLoaded` (yang sudah berisi `fillStats()`, `fillDokumen()`, dst.):

```js
      fillOjsJurnal(),
      fillOjsArtikel(),
```

- [ ] **Step 3: Tambahkan entri navbar "Jurnal Ilmiah (OJS)" di 12 file.** Di SETIAP file HTML publik, di dropdown **Tridharma** (desktop), sisipkan entri baru setelah baris "Publikasi & Luaran". Cari dengan `grep -n "publikasi.html" public/index.html` untuk menemukan anchor. Contoh (desktop dropdown — sesuaikan kelas `dropdown-item` bila berbeda antar file, ikuti yang ada di file itu):

```html
            <a href="jurnal.html" class="dropdown-item"><i class="ri-booklet-line w-4 text-navy-600"></i>Jurnal Ilmiah (OJS)</a>
```

Dan di menu **mobile** (`#mob-tri`), setelah entri Publikasi:

```html
          <a href="jurnal.html" class="block px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg text-xs">Jurnal Ilmiah (OJS)</a>
```

PENTING: baca struktur navbar tiap file dulu (`grep -n "mob-tri\|Publikasi" public/<file>`); beberapa halaman mungkin punya format sedikit berbeda. Tambahkan hanya bila belum ada. Untuk `jurnal.html` sendiri, entri ini juga ada (karena navbar disalin dari publikasi.html).

- [ ] **Step 4: Verifikasi di browser** (dev server jalan). Karena tabel OJS mungkin masih kosong sampai Task 6 sync, verifikasi minimal:

- `curl -s http://localhost:3000/jurnal.html | grep -c "Jurnal Ilmiah UnivSM"` → Expected: `1`
- `curl -s http://localhost:3000/jurnal.html | grep -c "list-ojs-jurnal"` → Expected: `1`
- `curl -s http://localhost:3000/index.html | grep -c "jurnal.html"` → Expected: ≥ `1` (entri navbar)
- Buka `/jurnal.html` di browser: struktur tampil, fallback "Data jurnal sedang dimuat" muncul bila belum sync (tidak error). Setelah Task 6 sync, muat ulang → kartu jurnal & artikel terisi.

- [ ] **Step 5: Commit.**

```bash
git add public/jurnal.html public/assets/js/api-content.js public/*.html
git commit -m "feat(ojs): halaman publik Jurnal + pengisi api-content + entri navbar"
```

---

### Task 6: Modul Monev OJS (panel admin)

**Files:**
- Create: `src/app/admin/(panel)/monev-ojs/page.tsx`, `src/components/admin/SyncOjsButton.tsx`
- Modify: `src/components/admin/icons.tsx` (tambah `ChartIcon`), `src/components/admin/Sidebar.tsx` (menu baru)

**Interfaces:**
- Consumes: `supabaseAdmin`, primitif `ui.tsx` (`PageHeader`, `cardCls`, `theadCls`, `thCls`, `tdCls`), `POST /api/ojs/sync` (Task 3), ikon.
- Produces: halaman `/admin/monev-ojs`; komponen `<SyncOjsButton />`; menu sidebar "Monev OJS".

- [ ] **Step 1: Tambahkan `ChartIcon` ke `src/components/admin/icons.tsx`** (sebelum `export function MenuIcon`):

```tsx
export function ChartIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="5" rx="0.5" />
      <rect x="12" y="8" width="3" height="9" rx="0.5" />
      <rect x="17" y="5" width="3" height="12" rx="0.5" />
    </Svg>
  );
}
```

- [ ] **Step 2: Tambahkan menu "Monev OJS" ke `src/components/admin/Sidebar.tsx`.** Tambahkan import `ChartIcon` ke daftar impor dari `./icons`, lalu sisipkan item setelah Publikasi di array `items`:

```tsx
  { href: '/admin/monev-ojs', label: 'Monev OJS', Icon: ChartIcon },
```

(Diletakkan setelah `{ href: '/admin/publikasi', ... }` dan sebelum `{ href: '/admin/pesan', ... }`.)

- [ ] **Step 3: Tulis `src/components/admin/SyncOjsButton.tsx`:**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { btnPrimary } from './ui';

export default function SyncOjsButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const router = useRouter();

  async function sync() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/ojs/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyinkronkan.');
      setMsg(`Berhasil: ${json.jurnal} jurnal, ${json.artikel} artikel.`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal menyinkronkan.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={sync} disabled={busy} className={btnPrimary}>
        {busy ? 'Menyinkronkan…' : 'Sinkronkan dari OJS'}
      </button>
      {msg && <p className="text-xs text-gray-500 max-w-xs text-right">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Tulis `src/app/admin/(panel)/monev-ojs/page.tsx`:**

```tsx
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PageHeader, cardCls, theadCls, thCls, tdCls } from '@/components/admin/ui';
import { ChartIcon } from '@/components/admin/icons';
import SyncOjsButton from '@/components/admin/SyncOjsButton';

export const dynamic = 'force-dynamic';

type Jurnal = {
  kode: string; nama: string; url: string;
  jml_artikel: number; jml_terbitan: number; terbit_terakhir: string | null;
};

export default async function MonevOjsPage() {
  const db = supabaseAdmin();
  const [{ data: jurnalData }, { data: tahunData }, { data: setelan }] = await Promise.all([
    db.from('ojs_jurnal').select('*').order('nama', { ascending: true }),
    db.from('ojs_artikel').select('tahun'),
    db.from('pengaturan').select('key,value').in('key', ['ojs_last_sync', 'ojs_last_status']),
  ]);
  const jurnal = (jurnalData ?? []) as Jurnal[];

  // Ambang aktif: 12 bulan terakhir
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const isAktif = (j: Jurnal) => !!j.terbit_terakhir && j.terbit_terakhir >= cutoffStr;

  const totalArtikel = jurnal.reduce((s, j) => s + (j.jml_artikel ?? 0), 0);
  const totalTerbitan = jurnal.reduce((s, j) => s + (j.jml_terbitan ?? 0), 0);
  const jmlAktif = jurnal.filter(isAktif).length;

  // Tren artikel per tahun (6 tahun terakhir)
  const byYear = new Map<number, number>();
  for (const r of (tahunData ?? []) as { tahun: number | null }[]) {
    if (r.tahun) byYear.set(r.tahun, (byYear.get(r.tahun) ?? 0) + 1);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b).slice(-6);
  const maxYear = Math.max(1, ...years.map((y) => byYear.get(y) ?? 0));

  const settings = Object.fromEntries((setelan ?? []).map((s) => [s.key, s.value]));
  const lastSync = settings.ojs_last_sync
    ? new Date(settings.ojs_last_sync).toLocaleString('id-ID')
    : 'belum pernah';

  const CARDS = [
    { label: 'Jurnal', value: jurnal.length, tile: 'bg-blue-50 text-blue-600' },
    { label: 'Artikel', value: totalArtikel, tile: 'bg-emerald-50 text-emerald-600' },
    { label: 'Terbitan', value: totalTerbitan, tile: 'bg-violet-50 text-violet-600' },
    { label: `Jurnal Aktif (dari ${jurnal.length})`, value: jmlAktif, tile: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="max-w-6xl">
      <PageHeader
        icon={<ChartIcon className="w-6 h-6" />}
        title="Monev OJS"
        subtitle={`Pemantauan jurnal UnivSM dari OJS. Terakhir disinkronkan: ${lastSync}.`}
        action={<SyncOjsButton />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {CARDS.map((c) => (
          <div key={c.label} className={`${cardCls} p-5`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.tile}`}>
              <ChartIcon className="w-5 h-5" />
            </div>
            <p className="text-3xl font-extrabold text-navy-800 tabular-nums">{c.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {!!years.length && (
        <div className={`${cardCls} p-6 mb-8`}>
          <h2 className="font-bold text-navy-800 mb-4">Artikel per Tahun</h2>
          <div className="space-y-2">
            {years.map((y) => {
              const v = byYear.get(y) ?? 0;
              return (
                <div key={y} className="flex items-center gap-3">
                  <span className="w-12 text-sm text-gray-500 tabular-nums">{y}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div className="h-full bg-navy-700 rounded-full" style={{ width: `${(v / maxYear) * 100}%` }} />
                  </div>
                  <span className="w-8 text-sm font-semibold text-navy-800 tabular-nums text-right">{v}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={theadCls}>
              <th className={thCls}>Jurnal</th>
              <th className={thCls}>Artikel</th>
              <th className={thCls}>Terbitan</th>
              <th className={thCls}>Terbit Terakhir</th>
              <th className={thCls}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!jurnal.length && (
              <tr><td colSpan={5} className="px-4 py-14 text-center text-gray-400">Belum ada data. Klik &ldquo;Sinkronkan dari OJS&rdquo;.</td></tr>
            )}
            {jurnal.map((j) => {
              const aktif = isAktif(j);
              return (
                <tr key={j.kode} className="hover:bg-gray-50 transition-colors">
                  <td className={`${tdCls} font-medium text-gray-800`}>
                    <a href={j.url} target="_blank" rel="noopener noreferrer" className="hover:text-navy-600 hover:underline">{j.nama}</a>
                  </td>
                  <td className={`${tdCls} tabular-nums`}>{j.jml_artikel}</td>
                  <td className={`${tdCls} tabular-nums`}>{j.jml_terbitan}</td>
                  <td className={tdCls}>{j.terbit_terakhir ? new Date(j.terbit_terakhir + 'T00:00:00').toLocaleDateString('id-ID') : '—'}</td>
                  <td className={tdCls}>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {aktif ? 'Aktif' : 'Dorman'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verifikasi end-to-end di browser** (dev server jalan). Login admin (kredensial dari controller), buka `/admin/monev-ojs`:
  1. Sidebar menampilkan menu "Monev OJS" berikon.
  2. Klik **"Sinkronkan dari OJS"** → tunggu → muncul "Berhasil: N jurnal, M artikel." dan halaman refresh.
  3. Kartu ringkasan terisi (Jurnal ≥ 9, Artikel > 0), tabel per jurnal muncul dengan status Aktif/Dorman, grafik "Artikel per Tahun" tampil.
  4. `curl -s "http://localhost:3000/api/ojs/jurnal" | grep -c kode` → > 0 (data kini ada).
  5. Buka `/jurnal.html` publik → kartu jurnal & artikel terbaru kini terisi (verifikasi silang Task 5).

- [ ] **Step 6: Typecheck & commit.**

Run: `npm run typecheck` → exit 0.
```bash
git add src/app/admin/"(panel)"/monev-ojs src/components/admin/SyncOjsButton.tsx src/components/admin/icons.tsx src/components/admin/Sidebar.tsx
git commit -m "feat(ojs): modul Monev OJS admin (ringkasan, status Aktif/Dorman, tren, tombol sinkron)"
```

---

### Task 7: Build produksi, verifikasi menyeluruh, commit

**Files:**
- (tidak ada file baru; verifikasi + kemungkinan perbaikan kecil)

- [ ] **Step 1: Build produksi.** Run: `npm run build` → Expected: sukses, rute `/api/ojs/*` dan `/admin/monev-ojs` terdaftar; `/jurnal.html` tersaji dari `public/`.

- [ ] **Step 2: Verifikasi menyeluruh** (checklist spec):
  1. `POST /api/ojs/sync` tanpa login → 401 (Task 3).
  2. Login → `/admin/monev-ojs` → sync sukses → data jurnal/artikel muncul.
  3. `/jurnal.html` publik menampilkan kartu jurnal + artikel terbaru.
  4. Menu "Jurnal Ilmiah (OJS)" ada di navbar (cek 2-3 halaman).
  5. Status Aktif/Dorman benar (jurnal dengan `terbit_terakhir` > 12 bln → Dorman).
  6. Uji fallback publik: kondisi tabel kosong/tanpa API tidak merusak `/jurnal.html`.

- [ ] **Step 3: Commit penutup** (bila ada perbaikan) + tandai plan selesai.

```bash
git add -A
git commit -m "chore(ojs): verifikasi build & integrasi OJS selesai"
```

---

## Catatan Eksekusi

- Task 1 Step 3 adalah PAUSE: user menjalankan DDL di Supabase. Jangan lewati.
- Sync sesungguhnya butuh sesi admin (browser). Verifikasi 401 via curl; pengisian data via tombol admin di Task 6.
- Risiko WAF di IP Vercel: bila sync gagal di produksi (bukan lokal), catat sebagai kendala pasca-deploy (spec §Pengujian).
- Ingat encoding: edit HTML publik via Edit tool (bukan pipeline string PowerShell).
