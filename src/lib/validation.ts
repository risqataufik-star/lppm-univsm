import { z } from 'zod';

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
