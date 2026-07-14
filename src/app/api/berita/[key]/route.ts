import { NextResponse } from 'next/server';
import { makeItemRoutes } from '@/lib/crud';
import { beritaSchema } from '@/lib/validation';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const { data, error } = await supabaseAdmin()
    .from('berita')
    .select('*')
    .eq('slug', key)
    .eq('published', true)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: 'Berita tidak ditemukan.' }, { status: 404 });
  }
  return NextResponse.json(data);
}

const item = makeItemRoutes({ table: 'berita', schema: beritaSchema, idParam: 'key' });
export const PUT = item.PUT;
export const DELETE = item.DELETE;
