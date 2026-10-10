import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const { data, error } = await supabaseAdmin()
    .from('pengajuan')
    .select('*, profil(nama,email,nidn,prodi,no_hp)')
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Gagal mengambil pengajuan.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  return NextResponse.json(data);
}
