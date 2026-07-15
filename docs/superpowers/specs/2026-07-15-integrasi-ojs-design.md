# Spec Desain: Integrasi OJS UnivSM + Modul Monev OJS

- **Tanggal:** 15 Juli 2026
- **Status:** Disetujui user (arsitektur & desain), siap untuk perencanaan implementasi
- **Konteks:** Website LPPM UnivSM (Next.js + Supabase, deploy di Vercel) akan dihubungkan dengan portal jurnal universitas **OJS UnivSM** (`https://ojs.univsm.ac.id/`, Open Journal Systems **3.4.0.7**, multi-jurnal). Fitur ini aditif — tidak mengubah fitur `publikasi` manual (input dosen: artikel/buku/HKI/inovasi) yang sudah ada.

## Tujuan

1. **Sisi publik:** Menampilkan daftar jurnal UnivSM dan artikel terbaru dari OJS secara otomatis di halaman "Jurnal" baru, dengan tautan ke OJS.
2. **Sisi admin:** Modul **Monev OJS** untuk memantau kesehatan tiap jurnal (jumlah artikel/terbitan, terbit terakhir, tren per tahun, status Aktif/Dorman).
3. Data ditarik otomatis dari OJS (bukan input manual), disimpan ke Supabase, dan diperbarui lewat tombol sinkronisasi di panel admin.

## Temuan Teknis (terverifikasi)

Diuji langsung terhadap `ojs.univsm.ac.id` pada 15 Juli 2026:

| Endpoint | Hasil | Catatan |
|---|---|---|
| OAI-PMH site-wide `/index/oai` | **200 OK** (XML) | `verb=Identify`, `verb=ListRecords&metadataPrefix=oai_dc` (336 KB halaman pertama), `verb=ListSets` |
| REST API `/{jurnal}/api/v1/...` | **403** `api.403.unauthorized` | Butuh token API — TIDAK dipakai |
| Atom WebFeed `/{jurnal}/gateway/plugin/WebFeedGatewayPlugin/atom` | **200 OK** | Alternatif ringan (hanya terbitan terkini) — TIDAK dipakai sebagai sumber utama |

**Penting — WAF/bot filter:** WebFetch generic (UA non-browser) mendapat **403** di semua endpoint OJS. **Node `fetch` server-side dengan header `User-Agent` browser mendapat 200** untuk OAI Identify, ListRecords, dan Atom. Kesimpulan: harvesting server-side **harus** mengirim `User-Agent` browser yang realistis. (Risiko sisa: bila WAF OJS memblokir IP datacenter Vercel secara spesifik, sync bisa gagal di produksi meski lolos di lokal — dimitigasi oleh desain cache: data lama tetap dipakai, dan error ditampilkan jelas. Verifikasi nyata dilakukan setelah deploy.)

**9 jurnal (kode → nama):**
- `univsm` → SINTESA: Jurnal Sains & Teknologi
- `lex` → Lex Mandiri
- `INFOTECH` → Jurnal Teknologi dan Inovasi Digital
- `logic` → Jurnal Riset dan Aplikasi Sistem Informasi
- `BITCODE` → Jurnal Ilmiah Ilmu Komputer
- `edumandiri`, `manajerial`, `civilia`, `nutri` → (nama lengkap diambil dari OAI ListSets saat sync)

URL jurnal: `https://ojs.univsm.ac.id/<kode>`. URL artikel: dari `dc:identifier` tiap record OAI.

## Sumber Data & Harvesting

- **Protokol:** OAI-PMH 2.0, `metadataPrefix=oai_dc`, endpoint site-wide `https://ojs.univsm.ac.id/index/oai`.
- **Daftar jurnal:** `verb=ListSets` → tiap `<set>` punya `setSpec` (kode jurnal) dan `setName` (nama jurnal). Menyediakan nama resmi tiap jurnal.
- **Artikel:** `verb=ListRecords&metadataPrefix=oai_dc`, diikuti `resumptionToken` sampai habis. Tiap `<record>`:
  - `header/setSpec` → kode jurnal
  - `dc:title` → judul
  - `dc:creator` (bisa banyak) → penulis (digabung dengan "; ")
  - `dc:date` → tanggal (ambil yang paling relevan; parse ke `YYYY-MM-DD`)
  - `dc:source` → nama jurnal + info issue (untuk label terbitan)
  - `dc:identifier` (URL, diawali `http`) → URL artikel
  - `header/identifier` (mis. `oai:ojs.univsm.ac.id:article/123`) → id unik artikel (kunci upsert)
  - Record dengan `header status="deleted"` dilewati.
- **Header HTTP wajib:** `User-Agent: Mozilla/5.0 (...) Chrome/... Safari/537.36`, timeout wajar (mis. 20 dtk/permintaan).
- **Parsing:** dependency baru `fast-xml-parser` (kecil, tanpa peer-deps). DOMParser tidak tersedia di runtime Node route handler.
- **Terbitan (issue):** OJS OAI `oai_dc` tidak mengekspos daftar issue secara langsung; `jml_terbitan` dihitung sebagai **jumlah label issue unik** (dari `dc:source`/`dc:relation`) per jurnal saat sync. (Pendekatan pragmatis; cukup untuk monev.)

## Skema Database (Supabase Postgres)

Tabel baru, RLS aktif tanpa policy anon (akses hanya lewat service role di server, konsisten dengan tabel lain).

### `ojs_jurnal`
- `kode` text PRIMARY KEY — mis. `univsm`
- `nama` text NOT NULL
- `url` text NOT NULL — `https://ojs.univsm.ac.id/<kode>`
- `jml_artikel` int NOT NULL default 0
- `jml_terbitan` int NOT NULL default 0
- `terbit_terakhir` date — tanggal artikel terbaru jurnal ini (null bila belum ada)
- `updated_at` timestamptz

### `ojs_artikel`
- `id` text PRIMARY KEY — dari `header/identifier` OAI (stabil, idempoten)
- `jurnal_kode` text NOT NULL — FK logis ke `ojs_jurnal.kode`
- `judul` text NOT NULL
- `penulis` text NOT NULL default ''
- `tanggal` date — tanggal terbit (null bila tak terparse)
- `tahun` int — diambil dari `tanggal` untuk agregasi tren (null bila tak ada)
- `issue` text NOT NULL default '' — label terbitan
- `url` text NOT NULL default ''
- `created_at` timestamptz default now()

Index: `ojs_artikel(jurnal_kode)`, `ojs_artikel(tahun)`.

### `pengaturan` (tabel yang sudah ada, tambah key)
- `ojs_last_sync` — ISO timestamp sinkronisasi terakhir yang sukses
- `ojs_last_status` — ringkas hasil sync terakhir (mis. `"9 jurnal, 342 artikel"` atau pesan error)
- `ojs_resume_token` — resumptionToken OAI untuk melanjutkan sync inkremental (kosong bila selesai/tidak dipakai)

## API (Route Handlers)

### Admin (wajib sesi, `requireAdmin`)
- `POST /api/ojs/sync` — jalankan harvest:
  1. `ListSets` → upsert `ojs_jurnal` (kode, nama, url).
  2. `ListRecords` (paginasi) → kumpulkan artikel, upsert `ojs_artikel` (idempoten by `id`) secara **batch** (mis. 500/insert).
  3. Hitung ulang agregat per jurnal (`jml_artikel`, `jml_terbitan`, `terbit_terakhir`) dan simpan ke `ojs_jurnal`.
  4. Set `pengaturan.ojs_last_sync` + `ojs_last_status`.
  5. Balas `{ ok: true, jurnal: N, artikel: M }`.
  - Bila OAI gagal (non-200/timeout): **jangan hapus data lama**; balas `{ error: "<pesan Indonesia>" }` status 502, simpan `ojs_last_status` = pesan error.
  - Batas waktu eksekusi Vercel (Hobby: 10 dtk/‑fungsi). Bila harvest melebihi batas, sync dilakukan **inkremental**: proses hanya sebagian resumptionToken per pemanggilan dan simpan token lanjutan di `pengaturan.ojs_resume_token`; tombol dapat ditekan lagi untuk melanjutkan, dan UI menampilkan progres. (Alternatif bila 1 panggilan cukup: selesai sekali jalan.)

### Publik (tanpa login)
- `GET /api/ojs/jurnal` → array `ojs_jurnal` (urut nama).
- `GET /api/ojs/artikel?limit=&jurnal=` → artikel terbaru dari `ojs_artikel` (urut `tanggal` desc; filter opsional per `jurnal_kode`).

Semua error `{ error: string }` berbahasa Indonesia, status HTTP semestinya.

## Sisi Publik — Halaman "Jurnal"

- File baru `public/jurnal.html` (shell statis, gaya/komponen sama dengan halaman lain: navbar, footer, kelas Tailwind CDN yang ada).
- **Bagian 1 — Daftar Jurnal:** grid kartu 9 jurnal (nama, deskripsi singkat statis/among fallback, badge jumlah artikel, tombol "Kunjungi di OJS" → `url`). Diisi dari `GET /api/ojs/jurnal`.
- **Bagian 2 — Artikel Terbaru:** daftar ~10 artikel terbaru lintas jurnal (judul → link `url`, penulis, nama jurnal, tanggal). Diisi dari `GET /api/ojs/artikel?limit=10`.
- **Fallback:** bila API gagal/masih kosong, tampilkan pesan ramah ("Data jurnal sedang dimuat / belum tersedia") + tautan langsung ke `https://ojs.univsm.ac.id`. Konsisten dengan pola fallback `api-content.js` yang ada.
- **Integrasi `api-content.js`:** tambah fungsi `fillOjsJurnal()` dan `fillOjsArtikel()` dengan kontrak DOM: `#list-ojs-jurnal`, `#list-ojs-artikel`.
- **Navbar:** tambah entri **"Jurnal Ilmiah (OJS)"** (href `jurnal.html`) ke dropdown **Tridharma** di navbar SEMUA halaman publik (12 file HTML) — baik menu desktop maupun mobile.

## Modul Monev OJS — Panel Admin

- Halaman baru `/admin/monev-ojs` (server component, `dynamic = 'force-dynamic'`, baca langsung via `supabaseAdmin()`), memakai primitif UI bersama (`PageHeader`, `cardCls`, tabel) yang sudah ada.
- Menu sidebar baru **"Monev OJS"** berikon (ikon baru di `icons.tsx`, mis. grafik/jurnal) diletakkan setelah "Publikasi".
- **Header + tombol sinkron:** `PageHeader` + tombol **"Sinkronkan dari OJS"** (client component kecil `SyncOjsButton` yang memanggil `POST /api/ojs/sync`, menampilkan status memproses/sukses/gagal + `router.refresh()`), serta teks "Terakhir disinkronkan: <ojs_last_sync>".
- **Kartu ringkasan (4):** Total Jurnal, Total Artikel, Total Terbitan, Jurnal Aktif (dari N). Ikonik berwarna seperti dashboard.
- **Tabel per jurnal:** Nama · Jml Artikel · Jml Terbitan · Terbit Terakhir · Status.
  - **Status Aktif** = `terbit_terakhir` dalam **≤ 12 bulan** terakhir (relatif terhadap tanggal sekarang). **Dorman** = lebih lama atau null. Badge hijau (Aktif) / abu (Dorman).
- **Tren artikel per tahun:** agregasi `count(*) group by tahun` dari `ojs_artikel` (mis. 6 tahun terakhir), ditampilkan sebagai deretan **bar CSS** sederhana (lebar proporsional), tanpa library chart.

## Penanganan Error

- Sync: OAI non-200/timeout/parse gagal → data lama dipertahankan, `{ error }` Indonesia (status 502), status disimpan ke `pengaturan`.
- Publik: kegagalan fetch dibiarkan senyap (fallback statis + tautan OJS), hanya `console.warn`.
- Sinkronisasi hanya bisa dipicu admin (mencegah OJS dibebani).

## Pengujian & Verifikasi

- Lokal: jalankan `POST /api/ojs/sync` (login admin) → cek baris `ojs_jurnal`/`ojs_artikel` di Supabase → buka `/jurnal.html` (kartu + artikel tampil) → buka `/admin/monev-ojs` (ringkasan, tabel status, tren).
- Uji fallback: kosongkan/tanpa sync → halaman publik tampil pesan ramah, tidak rusak.
- Uji proteksi: `POST /api/ojs/sync` tanpa login → 401.
- Setelah deploy Vercel: pastikan sync sungguhan berhasil (konfirmasi WAF OJS tidak memblokir IP Vercel); bila 403, catat sebagai kendala dan pertimbangkan proxy/allowlist.

## Refresh / Otomasi

- **Tahap ini:** manual via tombol "Sinkronkan dari OJS" (cocok free tier, sederhana, tahan gangguan).
- **Di luar lingkup (opsional nanti):** Vercel Cron mingguan memanggil endpoint sync (butuh secret header agar tidak publik).

## Di Luar Lingkup

- REST API OJS (butuh token) dan integrasi tulis-balik ke OJS.
- Sitasi/metrik sitasi, unduhan, atau data yang tidak ada di `oai_dc`.
- Menggabungkan data OJS ke tabel `publikasi` manual (keduanya tetap terpisah).
- Otomasi cron (disebut sebagai opsi masa depan).
