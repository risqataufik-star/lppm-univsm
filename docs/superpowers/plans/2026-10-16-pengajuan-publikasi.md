# Pengajuan Publikasi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tambah jenis pengajuan **Publikasi** (skema Artikel Jurnal/Prosiding/Buku/HKI) dengan alur proposal → ST & SK → laporan yang sama, otomatis tercatat di tabel publik `publikasi` saat disetujui.

**Architecture:** Perluas union `Jenis` dan konstanta bersama; pemetaan ke tabel publik dipusatkan di fungsi murni `barisPublik()`; langkah "selesai" saat laporan diterima dibatasi `adaStatusPublik()`.

**Tech Stack:** Next.js 15, TypeScript, zod v3, Supabase.

**Spec:** `docs/superpowers/specs/2026-10-16-pengajuan-publikasi-design.md`

## Global Constraints

- Teks Indonesia; error API `{ error }`. Tanpa framework unit test — tes = skrip curl/node/browser, RED dulu.
- Edit file lewat Edit tool/Python yang menjaga CRLF.
- Kredensial admin hanya lewat `ADMIN_EMAIL`/`ADMIN_PASSWORD` di shell. `MSYS_NO_PATHCONV=1` hanya untuk `node scripts/uji.mjs unggah ... /api/...`.
- DB bersama produksi: data uji (`@example.com`, judul `Uji Publikasi%`/`Uji Regresi%`) wajib dibersihkan di Task 4. Jangan sentuh pengajuan nyata ("uji coba aplikasi website LPPM").

## Review Focus

1. **Laporan publikasi diterima** → 200 dan berlabel Selesai; tidak mencoba update kolom `status` yang tidak ada di `publikasi` (Task 2).
2. **Persetujuan publikasi** → satu baris `publikasi` dengan kategori sesuai pemetaan & penulis tergabung; bila insert gagal, keputusan dibatalkan (Task 2).
3. **Skema silang jenis** (skema PkM untuk publikasi, atau sebaliknya) → 400 (Task 2).
4. **Regresi penelitian/PkM**: persetujuan tetap ke tabel masing-masing; laporan diterima → `selesai` (Task 2).
5. **Anggota kosong** → penulis hanya nama dosen, tanpa koma menggantung (Task 2).

---

### Task 1: Skema DB, konstanta bersama, validasi

**Files:** Create `supabase/migrasi-2026-10-publikasi.sql`; Modify `supabase/schema.sql`, `src/lib/pengajuan-shared.ts`, `src/lib/validation.ts`

**Produces:** `Jenis = 'penelitian' | 'pkm' | 'publikasi'`; `SKEMA.publikasi`; `JENIS_LABEL.publikasi`; `KATEGORI_PUBLIKASI`; `barisPublik(p, ketua): { tabel: Jenis; data: Record<string, unknown> }`; `adaStatusPublik(jenis: Jenis): boolean`.

- [ ] **Step 1: RED** — dev server jalan; dosen uji A aktif (`node scripts/uji.mjs daftar A` + aktifkan via `PATCH /api/admin/dosen/[id]`), lalu `POST /api/dosen/pengajuan` dengan `jenis:"publikasi"` → Expected `400 {"error":"Jenis kegiatan tidak valid."}`.
- [ ] **Step 2:** `supabase/migrasi-2026-10-publikasi.sql`:
```sql
-- Migrasi Oktober 2026: jenis pengajuan 'publikasi'. Jalankan sekali di SQL Editor; aman bila terulang.
alter table pengajuan drop constraint if exists pengajuan_jenis_check;
alter table pengajuan add constraint pengajuan_jenis_check check (jenis in ('penelitian','pkm','publikasi'));
notify pgrst, 'reload schema';
```
- [ ] **Step 3:** `schema.sql` — di tabel `pengajuan` ganti `check (jenis in ('penelitian','pkm'))` dengan `check (jenis in ('penelitian','pkm','publikasi'))`.
- [ ] **Step 4:** `pengajuan-shared.ts`:
  - `export type Jenis = 'penelitian' | 'pkm' | 'publikasi';`
  - `SKEMA` tambah `publikasi: ['Artikel Jurnal', 'Prosiding', 'Buku', 'HKI'],`
  - `JENIS_LABEL` → `{ penelitian: 'Penelitian', pkm: 'PkM', publikasi: 'Publikasi' }`
  - Append:
```ts
// Kategori daftar Publikasi publik untuk tiap skema pengajuan Publikasi.
export const KATEGORI_PUBLIKASI: Record<string, 'artikel' | 'buku' | 'hki'> = {
  'Artikel Jurnal': 'artikel',
  Prosiding: 'artikel',
  Buku: 'buku',
  HKI: 'hki',
};

// Tabel publik punya kolom status (aktif/proses/selesai)? Tabel publikasi tidak.
export function adaStatusPublik(jenis: Jenis): boolean {
  return jenis !== 'publikasi';
}

// Baris yang dicatat ke daftar publik saat pengajuan disetujui.
export function barisPublik(
  p: Pick<Pengajuan, 'jenis' | 'judul' | 'skema' | 'tahun' | 'anggota' | 'sumber_dana'>,
  ketua: string,
): { tabel: Jenis; data: Record<string, unknown> } {
  if (p.jenis === 'publikasi') {
    return {
      tabel: 'publikasi',
      data: {
        judul: p.judul,
        penulis: [ketua, p.anggota].map((s) => s.trim()).filter(Boolean).join(', '),
        jenis: KATEGORI_PUBLIKASI[p.skema] ?? 'artikel',
        tahun: p.tahun,
      },
    };
  }
  return {
    tabel: p.jenis,
    data: {
      judul: p.judul,
      ketua,
      anggota: p.anggota,
      skema: p.skema,
      tahun: p.tahun,
      sumber_dana: p.sumber_dana,
      status: 'aktif',
    },
  };
}
```
- [ ] **Step 5:** `validation.ts` `pengajuanSchema`: `z.enum(['penelitian', 'pkm', 'publikasi'], ...)`.
- [ ] **Step 6: PAUSE** — user menjalankan migrasi di Supabase SQL Editor.
- [ ] **Step 7: Verifikasi** — `npx tsc --noEmit` exit 0; ulangi POST Step 1 dengan proposal sah, skema "Prosiding" → `201`; skema "PkM Mandiri" → `400 ...Skema tidak sesuai...`.
- [ ] **Step 8: Commit** `feat(publikasi): jenis pengajuan publikasi — skema DB, konstanta & validasi`.

### Task 2: Persetujuan & laporan untuk publikasi

**Files:** Modify `src/app/api/admin/pengajuan/[id]/keputusan/route.ts`, `src/app/api/admin/pengajuan/[id]/laporan/route.ts`

**Consumes:** `barisPublik`, `adaStatusPublik` (Task 1).

- [ ] **Step 1: RED** — pengajuan publikasi Task 1 (skema Prosiding, anggota "Mahasiswa Uji") → `POST keputusan {aksi:setujui}` → Expected `500 ...Gagal mencatat ke daftar publik...` (insert kolom `ketua`/`status` ke tabel `publikasi` gagal), status kembali `diajukan`.
- [ ] **Step 2:** keputusan route — ganti blok insert dengan:
```ts
    const { tabel, data: baris } = barisPublik(p, prof?.nama ?? '');
    const { data: pub, error: pubErr } = await db.from(tabel).insert(baris).select('id').single();
```
  (impor `barisPublik` dari `@/lib/pengajuan-shared`; blok rollback & update `publik_id` tetap).
- [ ] **Step 3:** laporan route — ganti `if (aksi === 'terima' && aj.publik_id) {` dengan `if (aksi === 'terima' && aj.publik_id && adaStatusPublik(aj.jenis)) {` (impor `adaStatusPublik`).
- [ ] **Step 4: Verifikasi** (skrip `verify-t2.sh`):
  - setujui publikasi → 200; baris `publikasi` dengan `jenis='artikel'`, `penulis='Dosen Uji A, Mahasiswa Uji'`.
  - publikasi kedua skema "Buku" anggota kosong → `jenis='buku'`, `penulis='Dosen Uji A'` (Review Focus #5).
  - set-status terbit → kirim laporan → terima → 200 (Review Focus #1); dosen melihat `laporan_status:"diterima"`.
  - regresi: pengajuan penelitian → setujui → baris `penelitian` status `aktif`; terbit → laporan → terima → `selesai` (Review Focus #4).
- [ ] **Step 5: Commit** `feat(publikasi): persetujuan mencatat ke daftar Publikasi, laporan publikasi dapat diterima`.

### Task 3: UI & teks

**Files:** Modify `src/components/dosen/PengajuanForm.tsx`, `src/app/admin/(panel)/pengajuan/page.tsx`, `src/app/dosen/(portal)/ajukan/page.tsx`, `src/app/dosen/(portal)/layout.tsx`, `src/app/dosen/(portal)/page.tsx`, `src/app/dosen/daftar/page.tsx`, `src/app/dosen/login/page.tsx`

- [ ] **Step 1: RED** — browser: form `/dosen/ajukan` tidak punya opsi Publikasi; filter admin tidak punya Publikasi.
- [ ] **Step 2:** form: setelah `<option value="pkm">Pengabdian kepada Masyarakat</option>` tambah `<option value="publikasi">Publikasi</option>`. Admin filter: setelah `<option value="pkm">PkM</option>` tambah `<option value="publikasi">Publikasi</option>`.
- [ ] **Step 3: Teks:**
  - admin pengajuan subtitle: "Verifikasi pengajuan penelitian, PkM & publikasi serta terbitkan Surat Tugas dan SK."
  - ajukan title: "Ajukan Penelitian / PkM / Publikasi"
  - portal layout: "...mengajukan penelitian, PkM, dan publikasi setelah akun diverifikasi LPPM."
  - portal page subtitle: "Pantau status pengajuan penelitian, PkM, dan publikasi Anda."
  - daftar deskripsi: "...mengajukan penelitian, PkM, dan publikasi secara daring."
  - login sorotan: "Pengajuan Penelitian, PkM & Publikasi"
- [ ] **Step 4: Verifikasi** — tsc; browser: pilih Publikasi → skema berubah ke 4 skema publikasi; kirim lewat form (DataTransfer) → detail berlabel Publikasi; filter admin Publikasi menampilkan hanya publikasi; tautan "Tercatat di daftar Publikasi publik" → `/admin/publikasi`; halaman publik `publikasi.html` memuat judul uji.
- [ ] **Step 5: Commit** `feat(publikasi): opsi Publikasi di form & filter admin, teks portal`.

### Task 4: README, build, pembersihan

- [ ] README "Akun Dosen": sebut jenis publikasi; catatan migrasi Oktober 2026 tambah `supabase/migrasi-2026-10-publikasi.sql`.
- [ ] `npm run build` (dev server dihentikan) → sukses; `next start` → ulangi `verify-t2-ulang.sh` (asersi tanpa mutasi) → PASS.
- [ ] `node scripts/uji.mjs bersihkan` → profil uji 0, pengajuan uji 0, publik uji (`Uji Publikasi%`/`Uji Regresi%` di penelitian/pkm/publikasi) 0, user Auth uji 0.
- [ ] Commit `docs(publikasi): README jenis publikasi & migrasi`.
