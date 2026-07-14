import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { pengaturanSchema } from '@/lib/validation';

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from('pengaturan')
    .select('*')
    .like('key', 'stat_%');
  if (error) return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 });
  return NextResponse.json(Object.fromEntries(data.map((r) => [r.key, r.value])));
}

export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = pengaturanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' },
      { status: 400 },
    );
  }
  const rows = Object.entries(parsed.data).map(([key, value]) => ({ key, value }));
  const { error } = await supabaseAdmin().from('pengaturan').upsert(rows);
  if (error) return NextResponse.json({ error: 'Gagal menyimpan pengaturan.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
