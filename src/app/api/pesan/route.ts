import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { pesanSchema } from '@/lib/validation';
import { rateLimitOk } from '@/lib/rate-limit';

// Daftar pesan untuk panel admin
export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const url = new URL(req.url);
  let q = supabaseAdmin().from('pesan').select('*').order('created_at', { ascending: false });
  const status = url.searchParams.get('status');
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 });
  return NextResponse.json(data);
}

// Form publik
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = pesanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Data tidak lengkap atau tidak valid.' },
      { status: 400 },
    );
  }
  const { website, ...row } = parsed.data;
  if (website) return NextResponse.json({ ok: true }); // honeypot terisi: pura-pura sukses
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimitOk(ip)) {
    return NextResponse.json(
      { error: 'Terlalu banyak pesan terkirim. Silakan coba lagi nanti.' },
      { status: 429 },
    );
  }
  const { error } = await supabaseAdmin().from('pesan').insert(row);
  if (error) {
    return NextResponse.json(
      { error: 'Gagal menyimpan pesan. Silakan kirim email langsung ke LPPM.' },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
