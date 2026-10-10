import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { jenisSuratSchema } from '@/lib/validation';
import { pathSuratBaru, tokenUnggah } from '@/lib/pengajuan-server';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = jenisSuratSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const { data: aj } = await supabaseAdmin().from('pengajuan').select('dosen_id,status').eq('id', id).maybeSingle();
  if (!aj) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  if (aj.status !== 'disetujui' && aj.status !== 'terbit') {
    return NextResponse.json({ error: 'Surat hanya dapat diunggah setelah pengajuan disetujui.' }, { status: 409 });
  }
  try {
    return NextResponse.json(await tokenUnggah(pathSuratBaru(aj.dosen_id, id, parsed.data.jenis)));
  } catch {
    return NextResponse.json({ error: 'Gagal menyiapkan unggahan.' }, { status: 500 });
  }
}
