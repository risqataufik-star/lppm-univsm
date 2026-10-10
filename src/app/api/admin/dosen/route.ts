import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const status = new URL(req.url).searchParams.get('status');
  let q = supabaseAdmin()
    .from('profil')
    .select('user_id,nama,email,nidn,prodi,no_hp,status,created_at')
    .eq('peran', 'dosen')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: 'Gagal mengambil data akun dosen.' }, { status: 500 });
  return NextResponse.json(data);
}
