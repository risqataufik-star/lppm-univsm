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
