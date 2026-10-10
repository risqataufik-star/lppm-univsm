import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireDosen } from '@/lib/auth';
import { pengajuanSchema } from '@/lib/validation';
import { cocokProposal, pathDipakai, periksaPdf } from '@/lib/pengajuan-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  const { data, error } = await supabaseAdmin()
    .from('pengajuan')
    .select('*')
    .eq('dosen_id', r.profil.user_id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Gagal mengambil pengajuan.' }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  const body = await req.json().catch(() => null);
  const parsed = pengajuanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const path = typeof body?.proposal_path === 'string' ? body.proposal_path : '';
  if (!cocokProposal(r.profil.user_id, path)) {
    return NextResponse.json({ error: 'Berkas proposal tidak valid. Silakan unggah ulang.' }, { status: 400 });
  }
  if (await pathDipakai(path)) {
    return NextResponse.json({ error: 'Berkas proposal ini sudah dipakai pengajuan lain.' }, { status: 409 });
  }
  const salah = await periksaPdf(path);
  if (salah) return NextResponse.json({ error: salah }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from('pengajuan')
    .insert({ dosen_id: r.profil.user_id, ...parsed.data, proposal_path: path, status: 'diajukan' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: 'Gagal menyimpan pengajuan.' }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
