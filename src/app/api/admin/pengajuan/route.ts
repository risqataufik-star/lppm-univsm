import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const url = new URL(req.url);
  let q = supabaseAdmin()
    .from('pengajuan')
    .select('id,jenis,judul,skema,tahun,status,laporan_status,created_at,profil(nama,prodi)')
    .order('created_at', { ascending: false });
  const status = url.searchParams.get('status');
  if (status) q = q.eq('status', status);
  const jenis = url.searchParams.get('jenis');
  if (jenis) q = q.eq('jenis', jenis);
  const laporan = url.searchParams.get('laporan');
  if (laporan) q = q.eq('laporan_status', laporan);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: 'Gagal mengambil pengajuan.' }, { status: 500 });
  return NextResponse.json(data);
}
