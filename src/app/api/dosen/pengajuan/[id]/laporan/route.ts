import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireDosen } from '@/lib/auth';
import { laporanSchema } from '@/lib/validation';
import { cocokSurat, hapusFile, periksaPdf } from '@/lib/pengajuan-server';
import { alasanTolakLaporan, type Pengajuan } from '@/lib/pengajuan-shared';

// Kirim / kirim ulang laporan akhir. Hanya saat status 'terbit' dan laporan belum ada atau perlu revisi.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  const { id } = await ctx.params;
  const uid = r.profil.user_id;
  const parsed = laporanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const { path } = parsed.data;
  const db = supabaseAdmin();
  const { data } = await db.from('pengajuan').select('*').eq('id', id).eq('dosen_id', uid).maybeSingle();
  const aj = data as Pengajuan | null;
  if (!aj) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  const alasan = alasanTolakLaporan(aj);
  if (alasan) return NextResponse.json({ error: alasan }, { status: 409 });
  if (!cocokSurat(uid, id, 'laporan', path)) {
    return NextResponse.json({ error: 'Berkas laporan tidak valid. Silakan unggah ulang.' }, { status: 400 });
  }
  const salah = await periksaPdf(path);
  if (salah) return NextResponse.json({ error: salah }, { status: 400 });

  const now = new Date().toISOString();
  let q = db
    .from('pengajuan')
    .update({ laporan_path: path, laporan_status: 'dikirim', laporan_catatan: '', laporan_at: now, updated_at: now })
    .eq('id', id)
    .eq('status', 'terbit');
  q = aj.laporan_status ? q.eq('laporan_status', aj.laporan_status) : q.is('laporan_status', null);
  const { data: baru, error } = await q.select().maybeSingle();
  if (error || !baru) {
    // Kirim ganda dengan path yang sama: jangan hapus file yang kini tersimpan milik permintaan pemenang.
    const { data: kini } = await db.from('pengajuan').select('laporan_path').eq('id', id).maybeSingle();
    if (kini?.laporan_path !== path) await hapusFile(path);
    return error
      ? NextResponse.json({ error: 'Gagal menyimpan laporan.' }, { status: 500 })
      : NextResponse.json({ error: 'Status laporan sudah berubah. Muat ulang halaman.' }, { status: 409 });
  }
  if (aj.laporan_path && aj.laporan_path !== path) await hapusFile(aj.laporan_path);
  return NextResponse.json(baru);
}
