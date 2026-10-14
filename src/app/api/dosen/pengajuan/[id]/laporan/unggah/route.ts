import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireDosen } from '@/lib/auth';
import { pathSuratBaru, tokenUnggah } from '@/lib/pengajuan-server';
import { alasanTolakLaporan } from '@/lib/pengajuan-shared';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  const { id } = await ctx.params;
  const uid = r.profil.user_id;
  const { data: aj } = await supabaseAdmin()
    .from('pengajuan')
    .select('status,laporan_status')
    .eq('id', id)
    .eq('dosen_id', uid)
    .maybeSingle();
  if (!aj) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  const alasan = alasanTolakLaporan(aj);
  if (alasan) return NextResponse.json({ error: alasan }, { status: 409 });
  try {
    return NextResponse.json(await tokenUnggah(pathSuratBaru(uid, id, 'laporan')));
  } catch {
    return NextResponse.json({ error: 'Gagal menyiapkan unggahan.' }, { status: 500 });
  }
}
