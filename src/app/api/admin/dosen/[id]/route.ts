import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { statusDosenSchema } from '@/lib/validation';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = statusDosenSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin()
    .from('profil')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('user_id', id)
    .eq('peran', 'dosen') // akun admin tidak bisa diubah dari sini
    .select('user_id,nama,status')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Gagal mengubah status akun.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Akun dosen tidak ditemukan.' }, { status: 404 });
  return NextResponse.json(data);
}
