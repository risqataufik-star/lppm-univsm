-- Migrasi Oktober 2026: laporan akhir pada pengajuan Layanan Dosen.
-- Jalankan sekali di Supabase SQL Editor. Aman bila terulang.
alter table pengajuan add column if not exists laporan_path text;
alter table pengajuan add column if not exists laporan_status text
  check (laporan_status in ('dikirim','revisi','diterima'));
alter table pengajuan add column if not exists laporan_catatan text not null default '';
alter table pengajuan add column if not exists laporan_at timestamptz;
create index if not exists idx_pengajuan_laporan_status on pengajuan (laporan_status);
notify pgrst, 'reload schema';
