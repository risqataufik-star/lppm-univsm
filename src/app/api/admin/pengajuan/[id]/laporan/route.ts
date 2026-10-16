import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { keputusanLaporanSchema } from '@/lib/validation';
import { barisPublik, dicatatSaatDisetujui, type Pengajuan } from '@/lib/pengajuan-shared';

// Pemeriksaan laporan akhir: hanya dari 'dikirim'. Diterima → penelitian/PkM publik 'selesai';
// publikasi baru dicatat ke daftar Publikasi.
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
  const batal = async (pesan: string) => {
    await db.from('pengajuan').update({ laporan_status: 'dikirim' }).eq('id', id).eq('laporan_status', 'diterima');
    return NextResponse.json({ error: `${pesan} Keputusan dibatalkan, silakan coba lagi.` }, { status: 500 });
  };
  if (aksi === 'terima' && dicatatSaatDisetujui(aj.jenis) && aj.publik_id) {
    // Baris publik yang sudah dihapus admin → update 0 baris, bukan error; laporan tetap diterima.
    const { error: pubErr } = await db.from(aj.jenis).update({ status: 'selesai', updated_at: now }).eq('id', aj.publik_id);
    if (pubErr) return batal('Gagal memperbarui daftar publik.');
  }
  if (aksi === 'terima' && !dicatatSaatDisetujui(aj.jenis) && !aj.publik_id) {
    const { data: prof } = await db.from('profil').select('nama').eq('user_id', aj.dosen_id).maybeSingle();
    const { tabel, data: baris } = barisPublik(aj, prof?.nama ?? '');
    const { data: pub, error: pubErr } = await db.from(tabel).insert(baris).select('id').single();
    if (pubErr || !pub) return batal('Gagal mencatat ke daftar publik.');
    await db.from('pengajuan').update({ publik_id: pub.id }).eq('id', id);
  }
  return NextResponse.json({ ok: true, laporan_status: statusBaru });
}
