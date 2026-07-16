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
