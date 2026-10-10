export type Jenis = 'penelitian' | 'pkm';
export type StatusPengajuan = 'diajukan' | 'revisi' | 'ditolak' | 'disetujui' | 'terbit';
export type FileJenis = 'proposal' | 'surat_tugas' | 'sk';

export type Pengajuan = {
  id: string;
  dosen_id: string;
  jenis: Jenis;
  judul: string;
  skema: string;
  tahun: number;
  anggota: string;
  sumber_dana: string;
  ringkasan: string;
  proposal_path: string;
  status: StatusPengajuan;
  catatan: string;
  surat_tugas_path: string | null;
  sk_path: string | null;
  publik_id: string | null;
  created_at: string;
  updated_at: string | null;
};

export const MAX_PDF = 10 * 1024 * 1024;

export const SKEMA: Record<Jenis, readonly string[]> = {
  penelitian: ['Penelitian Mandiri', 'Penelitian Kelompok', 'Penelitian Kolaborasi', 'Hibah Eksternal Dikti'],
  pkm: ['PkM Mandiri', 'PkM Berbasis Riset', 'PkM KKN-Tematik', 'PkM Kolaborasi Mitra'],
};

export const JENIS_LABEL: Record<Jenis, string> = { penelitian: 'Penelitian', pkm: 'PkM' };

export const STATUS_LABEL: Record<StatusPengajuan, string> = {
  diajukan: 'Diajukan',
  revisi: 'Perlu Revisi',
  ditolak: 'Ditolak',
  disetujui: 'Disetujui',
  terbit: 'ST & SK Terbit',
};

export const STATUS_BADGE: Record<StatusPengajuan, string> = {
  diajukan: 'bg-blue-100 text-blue-700',
  revisi: 'bg-amber-100 text-amber-700',
  ditolak: 'bg-red-100 text-red-700',
  disetujui: 'bg-violet-100 text-violet-700',
  terbit: 'bg-emerald-100 text-emerald-700',
};

export const FILE_LABEL: Record<FileJenis, string> = {
  proposal: 'Proposal',
  surat_tugas: 'Surat Tugas',
  sk: 'SK',
};

export const KOLOM_FILE = {
  proposal: 'proposal_path',
  surat_tugas: 'surat_tugas_path',
  sk: 'sk_path',
} as const satisfies Record<FileJenis, keyof Pengajuan>;
