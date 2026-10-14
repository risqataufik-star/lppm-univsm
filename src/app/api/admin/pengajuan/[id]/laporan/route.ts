import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { keputusanLaporanSchema } from '@/lib/validation';
import type { Pengajuan } from '@/lib/pengajuan-shared';

// Pemeriksaan laporan akhir: hanya dari 'dikirim'. Diterima → kegiatan publik 'selesai'.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = keputusanLaporanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const { aksi, catatan } = parsed.data;
  const statusBaru = aksi === 'terima' ? 'diterima' : 'revisi';
  const db = supabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from('pengajuan')
    .update({ laporan_status: statusBaru, laporan_catatan: aksi === 'revisi' ? catatan : '', updated_at: now })
    .eq('id', id)
    .eq('laporan_status', 'dikirim')
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Gagal menyimpan keputusan laporan.' }, { status: 500 });
  if (!data) {
    const { data: ada } = await db.from('pengajuan').select('laporan_status').eq('id', id).maybeSingle();
    if (!ada) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
    return NextResponse.json(
      { error: ada.laporan_status ? 'Laporan ini sudah diperiksa sebelumnya.' : 'Belum ada laporan untuk diperiksa.' },
      { status: 409 },
    );
  }

  const aj = data as Pengajuan;
  if (aksi === 'terima' && aj.publik_id) {
    // Baris publik yang sudah dihapus admin → update 0 baris, bukan error; laporan tetap diterima.
    const { error: pubErr } = await db.from(aj.jenis).update({ status: 'selesai', updated_at: now }).eq('id', aj.publik_id);
    if (pubErr) {
      await db.from('pengajuan').update({ laporan_status: 'dikirim' }).eq('id', id).eq('laporan_status', 'diterima');
      return NextResponse.json(
        { error: 'Gagal memperbarui daftar publik. Keputusan dibatalkan, silakan coba lagi.' },
        { status: 500 },
      );
    }
  }
  return NextResponse.json({ ok: true, laporan_status: statusBaru });
}
