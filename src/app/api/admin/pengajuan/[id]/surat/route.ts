import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { suratSchema } from '@/lib/validation';
import { cocokSurat, hapusFile, periksaPdf } from '@/lib/pengajuan-server';
import { KOLOM_FILE, type Pengajuan } from '@/lib/pengajuan-shared';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = suratSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const { jenis, path } = parsed.data;
  const db = supabaseAdmin();
  const { data } = await db.from('pengajuan').select('*').eq('id', id).maybeSingle();
  const aj = data as Pengajuan | null;
  if (!aj) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  if (aj.status !== 'disetujui' && aj.status !== 'terbit') {
    return NextResponse.json({ error: 'Surat hanya dapat diunggah setelah pengajuan disetujui.' }, { status: 409 });
  }
  if (!cocokSurat(aj.dosen_id, id, jenis, path)) {
    return NextResponse.json({ error: 'Berkas surat tidak valid. Silakan unggah ulang.' }, { status: 400 });
  }
  const salah = await periksaPdf(path);
  if (salah) return NextResponse.json({ error: salah }, { status: 400 });

  const kolom = KOLOM_FILE[jenis];
  const lama = aj[kolom];
  const st = jenis === 'surat_tugas' ? path : aj.surat_tugas_path;
  const sk = jenis === 'sk' ? path : aj.sk_path;
  const statusBaru = st && sk ? 'terbit' : aj.status;

  const { data: hasil, error } = await db
    .from('pengajuan')
    .update({ [kolom]: path, status: statusBaru, updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['disetujui', 'terbit'])
    .select('status')
    .maybeSingle();
  if (error || !hasil) {
    await hapusFile(path);
    return error
      ? NextResponse.json({ error: 'Gagal menyimpan surat.' }, { status: 500 })
      : NextResponse.json({ error: 'Status pengajuan sudah berubah. Muat ulang halaman.' }, { status: 409 });
  }
  let status = hasil.status;
  if (status !== 'terbit') {
    // ST & SK yang disimpan bersamaan masing-masing membaca kolom lain masih kosong;
    // naikkan status berdasarkan isi baris terbaru, bukan baris yang dibaca di awal.
    const { data: naik } = await db
      .from('pengajuan')
      .update({ status: 'terbit' })
      .eq('id', id)
      .eq('status', 'disetujui')
      .not('surat_tugas_path', 'is', null)
      .not('sk_path', 'is', null)
      .select('status')
      .maybeSingle();
    if (naik) status = naik.status;
  }
  if (lama && lama !== path) await hapusFile(lama);
  return NextResponse.json({ ok: true, status });
}
