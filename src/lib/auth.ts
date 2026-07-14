import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// Kembalikan null bila ada sesi admin; bila tidak, respons 401 siap-kirim.
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Anda harus login sebagai admin.' }, { status: 401 });
  }
  return null;
}
