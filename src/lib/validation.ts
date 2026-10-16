import { z } from 'zod';
import { SKEMA } from '@/lib/pengajuan-shared';

export const beritaSchema = z.object({
  judul: z.string().min(3, 'Judul minimal 3 karakter.'),
  kategori: z.enum(['berita', 'pengumuman', 'agenda']),
  ringkasan: z.string().default(''),
  konten: z.string().default(''),
  gambar_url: z.string().nullable().default(null),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.'),
  published: z.boolean().default(false),
});

export const dokumenSchema = z.object({
  judul: z.string().min(3, 'Judul minimal 3 karakter.'),
  kategori: z.enum(['pedoman', 'template', 'sk', 'laporan', 'lainnya']),
  deskripsi: z.string().default(''),
  file_url: z.string().min(1, 'File wajib diunggah.'),
  nama_file: z.string().min(1),
  ukuran_bytes: z.number().int().nonnegative().default(0),
  tipe_file: z.string().default(''),
});

const kegiatanShape = {
  judul: z.string().min(3, 'Judul minimal 3 karakter.'),
  ketua: z.string().min(2, 'Nama ketua wajib diisi.'),
  anggota: z.string().default(''),
  skema: z.string().default(''),
  tahun: z.coerce.number().int().min(2000, 'Tahun tidak valid.').max(2100, 'Tahun tidak valid.'),
  sumber_dana: z.string().default(''),
  status: z.enum(['aktif', 'proses', 'selesai']),
};
export const penelitianSchema = z.object(kegiatanShape);
export const pkmSchema = z.object(kegiatanShape);

export const publikasiSchema = z.object({
  judul: z.string().min(3, 'Judul minimal 3 karakter.'),
  penulis: z.string().min(2, 'Penulis wajib diisi.'),
  jenis: z.enum(['artikel', 'buku', 'hki', 'inovasi']),
  penerbit: z.string().default(''),
  tahun: z.coerce.number().int().min(2000, 'Tahun tidak valid.').max(2100, 'Tahun tidak valid.'),
  tautan: z.string().default(''),
  indeksasi: z.string().default(''),
});

export const pesanSchema = z.object({
  nama: z.string().min(2, 'Nama wajib diisi.'),
  email: z.string().email('Email tidak valid.'),
  telepon: z.string().default(''),
  jenis: z.enum(['kontak', 'konsultasi', 'kerjasama']),
  subjek: z.string().default(''),
  isi: z.string().min(5, 'Isi pesan terlalu pendek.'),
  website: z.string().default(''), // honeypot — harus kosong
});

export const pesanStatusSchema = z.object({
  status: z.enum(['baru', 'dibaca', 'selesai']),
});

const angka = z.string().regex(/^\d+$/, 'Harus berupa angka.');
export const pengaturanSchema = z.object({
  stat_penelitian: angka,
  stat_pkm: angka,
  stat_publikasi: angka,
  stat_hki: angka,
  stat_mitra: angka,
});

export const daftarDosenSchema = z.object({
  nama: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter.'),
  email: z.string().trim().toLowerCase().email('Email tidak valid.'),
  password: z.string().min(8, 'Password minimal 8 karakter.'),
  nidn: z.string().trim().regex(/^\d{8,18}$/, 'NIDN/NIDK harus berupa angka (8–18 digit).'),
  prodi: z.string().trim().min(2, 'Program studi wajib diisi.'),
  no_hp: z.string().trim().regex(/^[0-9+\-\s]{8,20}$/, 'Nomor HP tidak valid.'),
  website: z.string().default(''), // honeypot — harus kosong
});

export const statusDosenSchema = z.object({
  status: z.enum(['aktif', 'ditolak'], { errorMap: () => ({ message: 'Status akun tidak valid.' }) }),
});

export const pengajuanSchema = z
  .object({
    jenis: z.enum(['penelitian', 'pkm', 'publikasi'], { errorMap: () => ({ message: 'Jenis kegiatan tidak valid.' }) }),
    judul: z.string().trim().min(10, 'Judul minimal 10 karakter.'),
    skema: z.string().trim(),
    tahun: z.coerce.number().int().min(2000, 'Tahun tidak valid.').max(2100, 'Tahun tidak valid.'),
    anggota: z.string().trim().default(''),
    sumber_dana: z.string().trim().default(''),
    ringkasan: z.string().trim().default(''),
  })
  .refine((d) => SKEMA[d.jenis].includes(d.skema), {
    message: 'Skema tidak sesuai dengan jenis kegiatan.',
    path: ['skema'],
  });

export const keputusanSchema = z
  .object({
    aksi: z.enum(['setujui', 'revisi', 'tolak'], { errorMap: () => ({ message: 'Aksi tidak valid.' }) }),
    catatan: z.string().trim().default(''),
  })
  .refine((d) => d.aksi === 'setujui' || d.catatan.length >= 5, {
    message: 'Catatan wajib diisi (minimal 5 karakter) untuk revisi atau penolakan.',
    path: ['catatan'],
  });

const jenisSurat = z.enum(['surat_tugas', 'sk'], { errorMap: () => ({ message: 'Jenis surat tidak valid.' }) });
export const jenisSuratSchema = z.object({ jenis: jenisSurat });
export const suratSchema = z.object({
  jenis: jenisSurat,
  path: z.string().min(1, 'Berkas surat belum diunggah.'),
});

export const laporanSchema = z.object({
  path: z.string().min(1, 'Berkas laporan belum diunggah.'),
});

export const keputusanLaporanSchema = z
  .object({
    aksi: z.enum(['terima', 'revisi'], { errorMap: () => ({ message: 'Aksi tidak valid.' }) }),
    catatan: z.string().trim().default(''),
  })
  .refine((d) => d.aksi === 'terima' || d.catatan.length >= 5, {
    message: 'Catatan wajib diisi (minimal 5 karakter) untuk revisi laporan.',
    path: ['catatan'],
  });
