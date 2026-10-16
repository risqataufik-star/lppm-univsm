import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { keputusanSchema } from '@/lib/validation';
import { barisPublik, type Pengajuan, type StatusPengajuan } from '@/lib/pengajuan-shared';

const HASIL: Record<'setujui' | 'revisi' | 'tolak', StatusPengajuan> = {
  setujui: 'disetujui',
  revisi: 'revisi',
  tolak: 'ditolak',
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = keputusanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const { aksi, catatan } = parsed.data;
  const statusBaru = HASIL[aksi];
  const db = supabaseAdmin();

  // Update bersyarat: hanya dari 'diajukan'. Permintaan ganda/bersamaan → hanya satu yang berhasil.
  const { data: aj, error } = await db
    .from('pengajuan')
    .update({ status: statusBaru, catatan, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'diajukan')
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Gagal menyimpan keputusan.' }, { status: 500 });
  if (!aj) {
    const { data: ada } = await db.from('pengajuan').select('id').eq('id', id).maybeSingle();
    return ada
      ? NextResponse.json({ error: 'Pengajuan ini sudah diputuskan sebelumnya.' }, { status: 409 })
      : NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  }

  if (aksi === 'setujui') {
    const p = aj as Pengajuan;
    const { data: prof } = await db.from('profil').select('nama').eq('user_id', p.dosen_id).single();
    const { tabel, data: baris } = barisPublik(p, prof?.nama ?? '');
    const { data: pub, error: pubErr } = await db.from(tabel).insert(baris).select('id').single();
    if (pubErr || !pub) {
      await db.from('pengajuan').update({ status: 'diajukan', catatan: '' }).eq('id', id);
      return NextResponse.json(
        { error: 'Gagal mencatat ke daftar publik. Keputusan dibatalkan, silakan coba lagi.' },
        { status: 500 },
      );
    }
    await db.from('pengajuan').update({ publik_id: pub.id }).eq('id', id);
  }
  return NextResponse.json({ ok: true, status: statusBaru });
}
