import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { pesanStatusSchema } from '@/lib/validation';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = pesanStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Status tidak valid.' }, { status: 400 });
  }
  const { error } = await supabaseAdmin()
    .from('pesan')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: 'Gagal memperbarui status.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const { error } = await supabaseAdmin().from('pesan').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Gagal menghapus pesan.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
