# Spec Desain: Layanan Dosen — Laporan Akhir Penelitian & PkM

- **Tanggal:** 14 Oktober 2026
- **Status:** Desain disetujui user; menunggu review spec tertulis
- **Permintaan:** Dosen juga mengunggah laporan penelitian/PkM yang sudah dilaksanakan melalui Layanan Dosen.
- **Konteks:** Melanjutkan Layanan Dosen (spec `2026-10-10-layanan-dosen-design.md`, sudah di produksi). Alur saat ini berakhir di status `terbit` (ST & SK terunggah). Fitur ini menambah tahap laporan akhir setelah `terbit`.

## Tujuan & Kriteria Sukses

1. Pada pengajuan berstatus **ST & SK Terbit**, dosen pemilik dapat mengunggah **satu PDF laporan akhir** (maks 10 MB).
2. LPPM memeriksa laporan: **Terima** atau **Minta Revisi** (dengan catatan).
3. Dosen melihat status laporan dan catatan revisi, lalu dapat mengunggah ulang.
4. Saat laporan diterima, baris kegiatan di daftar publik (`penelitian`/`pkm`) otomatis berstatus **`selesai`**, dan kegiatan tampil berlabel **Selesai** di portal dosen dan panel admin.
5. Laporan yang menunggu pemeriksaan terlihat di panel admin (filter, badge, kartu "Perlu Tindakan").
6. Laporan tetap privat: hanya dosen pemilik dan admin yang dapat mengunduhnya.

## Keputusan (disetujui user)

| Topik | Keputusan |
|---|---|
| Tindakan LPPM | Diperiksa: terima / minta revisi |
| Efek "diterima" | Status kegiatan di daftar publik otomatis `selesai` |
| Berkas | Laporan akhir saja (satu PDF per kegiatan) |
| Cakupan | Hanya pengajuan yang ST & SK-nya sudah terbit (bukan kegiatan lama di luar portal) |
| Pendekatan data | Kolom laporan di tabel `pengajuan` (bukan tabel terpisah, bukan memperpanjang status utama) |

## Skema Database

Tambahan kolom pada `pengajuan` (migrasi `supabase/migrasi-2026-10-laporan.sql`, dijalankan sekali; `schema.sql` ikut diperbarui untuk instalasi baru):

| Kolom | Tipe | Keterangan |
|---|---|---|
| `laporan_path` | `text` null | path objek di bucket `pengajuan` |
| `laporan_status` | `text` null, check in (`dikirim`,`revisi`,`diterima`) | null = belum ada laporan |
| `laporan_catatan` | `text not null default ''` | catatan revisi dari LPPM |
| `laporan_at` | `timestamptz` null | waktu laporan terakhir dikirim |

Ditambah index `idx_pengajuan_laporan_status` pada `laporan_status`. Migrasi memakai `add column if not exists` agar aman bila terulang.

### Storage

- Bucket privat `pengajuan` yang sudah ada (10 MB, `application/pdf`).
- Path ditentukan server: `<dosen_id>/<pengajuan_id>/laporan-<epoch ms>.pdf`.
- Validasi path dengan regex berjangkar (pola sama dengan `cocokSurat`); isi diperiksa diawali `%PDF-` lewat `periksaPdf` (objek tidak sah dihapus).

## Alur Status Laporan

Status utama pengajuan tetap `terbit`; laporan punya status sendiri.

```
(terbit, laporan null) --dosen kirim--> dikirim
dikirim --admin terima--> diterima   (publik → selesai; terkunci)
dikirim --admin revisi--> revisi     (catatan wajib ≥5 karakter)
revisi  --dosen kirim ulang--> dikirim
```

- Dosen hanya dapat mengirim saat `status = 'terbit'` dan `laporan_status` null atau `revisi`.
- Admin hanya dapat memutuskan saat `laporan_status = 'dikirim'`.
- Semua transisi memakai **update bersyarat** (`.eq(...)` pada status asal + `maybeSingle()`); permintaan ganda/bersamaan → hanya satu berhasil, lainnya 409.
- Kirim ulang: file lama dihapus **setelah** update baris berhasil; bila update gagal, file baru yang dihapus.
- **Terima**: setelah update bersyarat berhasil, `update <jenis> set status='selesai' where id = publik_id`. Bila update publik mengembalikan error → kembalikan `laporan_status` ke `dikirim` (bersyarat `diterima`) dan balas 500 "Gagal memperbarui daftar publik…". Bila `publik_id` null atau barisnya sudah dihapus admin → laporan tetap diterima (tidak ada yang perlu diperbarui).

### Label tampilan

Fungsi bersama `labelPengajuan(p)` di `pengajuan-shared.ts` mengembalikan label + kelas badge:

| Kondisi | Label | Badge |
|---|---|---|
| `terbit` & laporan null | ST & SK Terbit | emerald |
| `terbit` & `dikirim` | Laporan Diperiksa | blue |
| `terbit` & `revisi` | Laporan Perlu Revisi | amber |
| `terbit` & `diterima` | Selesai | slate/gelap |
| status lain | label `STATUS_LABEL` yang ada | badge yang ada |

Dipakai di daftar & detail pada portal dosen dan panel admin.

## Otorisasi

Mengikuti pola yang ada: route dosen memakai `requireDosen` + filter `dosen_id`; route admin memakai `requireAdmin`. Tidak ada akses langsung ke Storage dari klien selain unggah memakai token sekali-pakai yang path-nya ditentukan server.

## API (Route Handlers)

**Dosen**
- `POST /api/dosen/pengajuan/[id]/laporan/unggah` → `{ path, token }`. 404 bila bukan milik; 409 "Laporan hanya dapat diunggah setelah ST & SK terbit." / "Laporan sedang diperiksa atau sudah diterima."
- `POST /api/dosen/pengajuan/[id]/laporan` body `{ path }` → baris pengajuan terbaru. 400 path tidak valid / bukan PDF; 409 status tidak memungkinkan.
- `GET /api/dosen/pengajuan/[id]/file?jenis=laporan` → 302 signed URL (memperluas route yang ada).

**Admin**
- `POST /api/admin/pengajuan/[id]/laporan` body `{ aksi: 'terima'|'revisi', catatan }` → `{ ok, laporan_status }`. 400 aksi/catatan; 404; 409 "Laporan ini sudah diperiksa sebelumnya." / tidak ada laporan.
- `GET /api/admin/pengajuan/[id]/file?jenis=laporan` → 302 (memperluas route yang ada).
- `GET /api/admin/pengajuan?laporan=dikirim` → filter laporan masuk (memperluas route daftar; kolom `laporan_status` ikut dipilih).

Skema zod baru: `laporanSchema` (`{ path }`), `keputusanLaporanSchema` (`aksi` + catatan wajib ≥5 untuk `revisi`).

## Halaman

**Portal dosen — detail pengajuan (`/dosen/pengajuan/[id]`)**, saat `status = terbit`:
- Panel **Laporan Akhir**:
  - belum ada: penjelasan singkat + input PDF + tombol "Kirim Laporan" (unggah lewat `unggahPdf`).
  - `dikirim`: "Laporan sedang diperiksa LPPM" + tombol unduh laporan.
  - `revisi`: alert catatan LPPM + tombol unduh laporan lama + form unggah ulang.
  - `diterima`: alert sukses "Laporan diterima. Kegiatan tercatat selesai." + tombol unduh.
- Tombol berkas menampilkan **Laporan** bila `laporan_path` ada.
- Daftar `/dosen` memakai `labelPengajuan`.

**Panel admin**
- Detail pengajuan: panel **Pemeriksaan Laporan** saat `laporan_status = dikirim` (unduh, catatan, Terima, Minta Revisi; konfirmasi sebelum aksi). Status lain: info status laporan + unduh bila ada.
- Daftar `/admin/pengajuan`: filter tambahan **Laporan Masuk** (`?laporan=dikirim`), badge memakai `labelPengajuan`.
- Sidebar: badge menu Pengajuan = jumlah pengajuan `diajukan` + laporan `dikirim`.
- Dashboard "Perlu Tindakan": kartu ketiga **Laporan menunggu pemeriksaan**.

## Penanganan Error

- Pesan berbahasa Indonesia, pola `{ error }` seperti route yang ada.
- Gagal unggah ke Storage → pesan di form, tidak ada perubahan baris.
- PDF tidak sah → 400 "File harus berformat PDF.", objek dihapus.
- Status sudah berubah di tengah jalan → 409 "Status laporan sudah berubah. Muat ulang halaman."

## Prasyarat Operasional

- Jalankan `supabase/migrasi-2026-10-laporan.sql` sekali di Supabase SQL Editor sebelum deploy (database dipakai bersama dev & produksi).
- README: bagian "Akun Dosen" ditambah alur laporan; catatan migrasi Oktober 2026 ditambah file migrasi laporan.

## Pengujian & Verifikasi

Tanpa framework unit test (sama seperti fitur sebelumnya); skrip API + `scripts/uji.mjs` + browser:
- Unggah laporan pada pengajuan `terbit` → 200, status `dikirim`; pada pengajuan non-`terbit` → 409.
- PDF palsu → 400 dan objek terhapus.
- Dosen B tidak dapat mengunggah/mengunduh laporan milik A (404).
- Revisi tanpa catatan → 400; revisi → dosen kirim ulang → file lama terhapus.
- Terima → baris publik `selesai`; klik ganda/bersamaan → satu 200, satu 409.
- Kirim saat `dikirim`/`diterima` → 409.
- Badge, filter "Laporan Masuk", kartu dashboard, label "Selesai" di kedua portal.
- Build produksi lulus; data uji dibersihkan (`node scripts/uji.mjs bersihkan`). Perintah ini sudah menghapus semua objek di `<dosen_id>/<pengajuan_id>/`, termasuk file laporan; `berkas` diperluas agar menampilkan file laporan.

## Di Luar Lingkup

- Laporan kemajuan, bukti luaran (artikel/LoA/HKI), tautan publikasi.
- Riwayat versi laporan (hanya versi terakhir disimpan).
- Laporan untuk kegiatan lama di luar portal.
- Tenggat waktu / pengingat laporan.
- Publikasi file laporan di situs publik.
- Temuan minor tertunda dari review Layanan Dosen (mis. `periksaPdf` tidak memeriksa `res.ok`) — ditangani terpisah.
