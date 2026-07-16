import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const url = new URL(req.url);
  let q = supabaseAdmin()
    .from('ojs_artikel')
    .select('*')
    .order('tanggal', { ascending: false, nullsFirst: false });
  const jurnal = url.searchParams.get('jurnal');
  if (jurnal) q = q.eq('jurnal_kode', jurnal);
  const limit = Number(url.searchParams.get('limit'));
  if (limit > 0) q = q.limit(limit);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: 'Gagal mengambil artikel.' }, { status: 500 });
  return NextResponse.json(data);
}
