-- Migrasi Oktober 2026: jenis pengajuan 'publikasi'. Jalankan sekali di SQL Editor; aman bila terulang.
alter table pengajuan drop constraint if exists pengajuan_jenis_check;
alter table pengajuan add constraint pengajuan_jenis_check check (jenis in ('penelitian','pkm','publikasi'));
notify pgrst, 'reload schema';
