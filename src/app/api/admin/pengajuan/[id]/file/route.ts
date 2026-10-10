import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { urlUnduh } from '@/lib/pengajuan-server';
import { KOLOM_FILE, type FileJenis } from '@/lib/pengajuan-shared';

export const dynamic = 'force-dynamic';
const JENIS: FileJenis[] = ['proposal', 'surat_tugas', 'sk'];

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const jenis = new URL(req.url).searchParams.get('jenis') as FileJenis;
  if (!JENIS.includes(jenis)) return NextResponse.json({ error: 'Jenis berkas tidak valid.' }, { status: 400 });
  const { data } = await supabaseAdmin()
    .from('pengajuan')
    .select('proposal_path,surat_tugas_path,sk_path')
    .eq('id', id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  const path = (data as Record<string, string | null>)[KOLOM_FILE[jenis]];
  if (!path) return NextResponse.json({ error: 'Berkas belum tersedia.' }, { status: 404 });
  const url = await urlUnduh(path);
  if (!url) return NextResponse.json({ error: 'Gagal menyiapkan unduhan.' }, { status: 500 });
  return NextResponse.redirect(url, 302);
}
