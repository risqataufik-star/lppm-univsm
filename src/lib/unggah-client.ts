import { supabaseBrowser } from '@/lib/supabase/browser';
import { MAX_PDF } from '@/lib/pengajuan-shared';

// Minta token unggah ke `endpoint` (server menentukan path), lalu unggah langsung ke Storage.
// Melewati batas body 4,5 MB fungsi Vercel. Mengembalikan path untuk dikirim ke API.
export async function unggahPdf(endpoint: string, body: Record<string, unknown>, file: File): Promise<string> {
  const pdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!pdf) throw new Error('File harus berformat PDF.');
  if (file.size > MAX_PDF) {
    throw new Error('Ukuran file melebihi batas 10 MB. Silakan kompres PDF terlebih dahulu.');
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Gagal menyiapkan unggahan.');
  const { error } = await supabaseBrowser()
    .storage.from('pengajuan')
    .uploadToSignedUrl(json.path, json.token, file, { contentType: 'application/pdf' });
  if (error) throw new Error('Gagal mengunggah file. Periksa koneksi lalu coba lagi.');
  return json.path as string;
}
