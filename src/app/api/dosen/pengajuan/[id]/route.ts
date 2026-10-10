import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireDosen } from '@/lib/auth';
import { pengajuanSchema } from '@/lib/validation';
import { cocokProposal, hapusFile, pathDipakai, periksaPdf } from '@/lib/pengajuan-server';
import type { Pengajuan } from '@/lib/pengajuan-shared';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

async function milik(id: string, dosenId: string): Promise<Pengajuan | null> {
  const { data } = await supabaseAdmin()
    .from('pengajuan')
    .select('*')
    .eq('id', id)
    .eq('dosen_id', dosenId)
    .maybeSingle();
  return (data as Pengajuan | null) ?? null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  const { id } = await ctx.params;
  const p = await milik(id, r.profil.user_id);
  if (!p) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  return NextResponse.json(p);
}

// Perbaikan saat status 'revisi' → kembali 'diajukan'. proposal_path opsional (kosong = proposal lama dipakai).
export async function PUT(req: Request, ctx: Ctx) {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  const { id } = await ctx.params;
  const uid = r.profil.user_id;
  const lama = await milik(id, uid);
  if (!lama) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  if (lama.status !== 'revisi') {
    return NextResponse.json(
      { error: 'Pengajuan hanya dapat diubah saat berstatus Perlu Revisi.' },
      { status: 409 },
    );
  }
  const body = await req.json().catch(() => null);
  const parsed = pengajuanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const dikirim = typeof body?.proposal_path === 'string' ? body.proposal_path : '';
  const ganti = dikirim !== '' && dikirim !== lama.proposal_path;
  if (ganti) {
    if (!cocokProposal(uid, dikirim)) {
      return NextResponse.json({ error: 'Berkas proposal tidak valid. Silakan unggah ulang.' }, { status: 400 });
    }
    if (await pathDipakai(dikirim)) {
      return NextResponse.json({ error: 'Berkas proposal ini sudah dipakai pengajuan lain.' }, { status: 409 });
    }
    const salah = await periksaPdf(dikirim);
    if (salah) return NextResponse.json({ error: salah }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from('pengajuan')
    .update({
      ...parsed.data,
      ...(ganti ? { proposal_path: dikirim } : {}),
      status: 'diajukan',
      catatan: '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'revisi')
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Gagal menyimpan perbaikan.' }, { status: 500 });
  if (!data) {
    return NextResponse.json({ error: 'Status pengajuan sudah berubah. Muat ulang halaman.' }, { status: 409 });
  }
  if (ganti) await hapusFile(lama.proposal_path);
  return NextResponse.json(data);
}
