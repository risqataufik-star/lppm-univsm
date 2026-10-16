# Spec Desain: Layanan Dosen — Jenis Pengajuan Publikasi

- **Tanggal:** 16 Oktober 2026
- **Status:** Desain disetujui user ("sudah sesuai, lanjut eksekusi")
- **Permintaan (Ketua LPPM):** (1) pengajuan dosen punya pilihan **Publikasi** selain penelitian & PkM; (2) publikasi juga mengunggah **proposal dan laporan**.
- **Konteks:** Layanan Dosen (spec `2026-10-10-layanan-dosen-design.md`) dan Laporan Akhir (`2026-10-14-laporan-akhir-design.md`) sudah di produksi.

## Keputusan (disetujui user)

| Topik | Keputusan |
|---|---|
| Alur Publikasi | Sama dengan penelitian/PkM: proposal saat mengajukan → verifikasi → ST & SK → laporan akhir → terima/revisi |
| Skema Publikasi | Artikel Jurnal, Prosiding, Buku, HKI |
| Pencatatan publik | **Revisi 16 Okt (keputusan user):** publikasi dicatat ke tabel `publikasi` saat **laporan diterima**, bukan saat disetujui — agar daftar publik hanya memuat luaran yang sudah jadi. Penelitian/PkM tetap dicatat saat disetujui |
| Pemetaan kategori | Artikel Jurnal & Prosiding → `artikel`; Buku → `buku`; HKI → `hki` |
| Penulis | Nama dosen pengusul + isi "Anggota Tim" (dipisah koma, yang kosong dilewati) |
| Laporan diterima | Penelitian/PkM: baris publik → `selesai` (seperti sekarang). Publikasi: tabel `publikasi` tidak punya kolom status → langkah dilewati; pengajuan berlabel **Selesai** |

## Database

Migrasi `supabase/migrasi-2026-10-publikasi.sql` (sekali jalan, aman bila terulang):

```sql
alter table pengajuan drop constraint if exists pengajuan_jenis_check;
alter table pengajuan add constraint pengajuan_jenis_check check (jenis in ('penelitian','pkm','publikasi'));
notify pgrst, 'reload schema';
```

`schema.sql` diperbarui untuk instalasi baru.

## Kode

- `pengajuan-shared.ts`: `Jenis` + `'publikasi'`; `SKEMA.publikasi`; `JENIS_LABEL.publikasi = 'Publikasi'`; fungsi murni `barisPublik(p, ketua)` → `{ tabel, data }` untuk insert ke tabel publik; `adaStatusPublik(jenis)` (false untuk publikasi).
- `validation.ts`: enum jenis `pengajuanSchema` + `'publikasi'` (refine skema tetap berlaku).
- Keputusan "setujui" (`api/admin/pengajuan/[id]/keputusan`): memakai `barisPublik`; rollback bila insert gagal tetap seperti sekarang.
- Keputusan laporan "terima" (`api/admin/pengajuan/[id]/laporan`): update status publik hanya bila `adaStatusPublik(jenis)`.
- UI: opsi "Publikasi" di form pengajuan dosen & filter jenis admin; teks "penelitian dan PkM" → "penelitian, PkM, dan publikasi" pada halaman dosen/admin terkait. Tautan "Tercatat di daftar Publikasi publik" → `/admin/publikasi` (sudah otomatis dari `/admin/${jenis}`).

## Pengujian

Skrip API + browser + build, data uji dibersihkan (`bersihkan` menghapus baris publik via `from(jenis)`, termasuk `publikasi`):
- Ajukan publikasi skema Prosiding → 201; skema PkM untuk publikasi → 400.
- Setujui → baris `publikasi` dengan `jenis='artikel'`, penulis "Nama Dosen, Anggota".
- Laporan publikasi diterima → 200 (sebelum perbaikan: 500 karena kolom status tidak ada).
- Regresi: penelitian disetujui tetap masuk `penelitian`; laporan penelitian diterima → `selesai`.

## Di Luar Lingkup

- Akun admin `lppm@univsm.ac.id` (permintaan 3): dibuat user sendiri di Supabase (kredensial), lalu SQL peran admin — instruksi diberikan di chat; Claude hanya memverifikasi peran.
- Kolom khusus publikasi (penerbit, tautan, indeksasi) di form pengajuan — admin melengkapinya di halaman Publikasi.
