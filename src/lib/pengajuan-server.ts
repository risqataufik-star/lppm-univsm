import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { MAX_PDF, type FileJenis } from '@/lib/pengajuan-shared';

export const BUCKET = 'pengajuan';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
type JenisSurat = Exclude<FileJenis, 'proposal'>;
const AWALAN: Record<JenisSurat, string> = { surat_tugas: 'surat-tugas', sk: 'sk' };

export function pathProposalBaru(dosenId: string): string {
  return `${dosenId}/proposal/${randomUUID()}.pdf`;
}

export function pathSuratBaru(dosenId: string, pengajuanId: string, jenis: JenisSurat): string {
  return `${dosenId}/${pengajuanId}/${AWALAN[jenis]}-${Date.now()}.pdf`;
}

export function cocokProposal(dosenId: string, path: string): boolean {
  return new RegExp(`^${dosenId}/proposal/${UUID}\\.pdf$`).test(path);
}

export function cocokSurat(dosenId: string, pengajuanId: string, jenis: JenisSurat, path: string): boolean {
  return new RegExp(`^${dosenId}/${pengajuanId}/${AWALAN[jenis]}-\\d+\\.pdf$`).test(path);
}

// Token unggah sekali-pakai; path ditentukan server, bukan browser.
export async function tokenUnggah(path: string): Promise<{ path: string; token: string }> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? 'Token unggah gagal dibuat.');
  return { path: data.path, token: data.token };
}

export async function hapusFile(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabaseAdmin().storage.from(BUCKET).remove([path]);
}

export async function urlUnduh(path: string): Promise<string | null> {
  const { data } = await supabaseAdmin().storage.from(BUCKET).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

// Verifikasi objek hasil unggah langsung: ada, ≤10 MB, diawali %PDF-. Objek tidak sah dihapus.
export async function periksaPdf(path: string): Promise<string | null> {
  const db = supabaseAdmin();
  const i = path.lastIndexOf('/');
  const nama = path.slice(i + 1);
  const { data: daftar } = await db.storage.from(BUCKET).list(path.slice(0, i), { search: nama });
  const obj = daftar?.find((o) => o.name === nama);
  if (!obj) return 'File belum terunggah. Silakan unggah ulang.';
  const ukuran = Number((obj.metadata as { size?: number } | null)?.size ?? 0);
  if (ukuran > MAX_PDF) {
    await hapusFile(path);
    return 'Ukuran file melebihi batas 10 MB.';
  }
  const { data: tanda } = await db.storage.from(BUCKET).createSignedUrl(path, 60);
  if (!tanda) return 'File tidak dapat diperiksa. Silakan unggah ulang.';
  const res = await fetch(tanda.signedUrl, { headers: { Range: 'bytes=0-4' } });
  const awal = new Uint8Array(await res.arrayBuffer()).slice(0, 5);
  if (String.fromCharCode(...awal) !== '%PDF-') {
    await hapusFile(path);
    return 'File harus berformat PDF.';
  }
  return null;
}

// Satu berkas proposal hanya boleh dipakai satu pengajuan.
export async function pathDipakai(path: string): Promise<boolean> {
  const { count } = await supabaseAdmin()
    .from('pengajuan')
    .select('id', { count: 'exact', head: true })
    .eq('proposal_path', path);
  return (count ?? 0) > 0;
}
