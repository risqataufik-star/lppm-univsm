import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from('ojs_jurnal')
    .select('*')
    .order('nama', { ascending: true });
  if (error) return NextResponse.json({ error: 'Gagal mengambil data jurnal.' }, { status: 500 });
  return NextResponse.json(data);
}
