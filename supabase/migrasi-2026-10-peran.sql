-- Migrasi sekali jalan (Oktober 2026): sebelum Layanan Dosen, semua akun Auth adalah admin.
-- Beri mereka baris profil ber-peran admin. JANGAN dijalankan ulang setelah dosen mulai mendaftar.
insert into profil (user_id, nama, email, peran, status)
select id, email, email, 'admin', 'aktif' from auth.users
on conflict (user_id) do nothing;
