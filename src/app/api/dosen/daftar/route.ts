import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { daftarDosenSchema } from '@/lib/validation';
import { rateLimitOk } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = daftarDosenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Data pendaftaran tidak valid.' },
      { status: 400 },
    );
  }
  const { website, password, ...data } = parsed.data;
  if (website) return NextResponse.json({ ok: true }, { status: 201 }); // honeypot: pura-pura sukses

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimitOk(`daftar:${ip}`)) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan pendaftaran. Silakan coba lagi nanti.' },
      { status: 429 },
    );
  }

  const db = supabaseAdmin();
  const { data: dibuat, error } = await db.auth.admin.createUser({
    email: data.email,
    password,
    email_confirm: true,
    user_metadata: { nama: data.nama },
  });
  if (error || !dibuat.user) {
    const sudahAda = error?.status === 422 || /already|registered|exists/i.test(error?.message ?? '');
    return sudahAda
      ? NextResponse.json({ error: 'Email sudah terdaftar.' }, { status: 409 })
      : NextResponse.json({ error: 'Pendaftaran gagal. Silakan coba lagi.' }, { status: 500 });
  }

  const { error: pErr } = await db
    .from('profil')
    .insert({ user_id: dibuat.user.id, ...data, peran: 'dosen', status: 'menunggu' });
  if (pErr) {
    await db.auth.admin.deleteUser(dibuat.user.id); // rollback agar tidak ada akun tanpa profil
    return NextResponse.json({ error: 'Pendaftaran gagal. Silakan coba lagi.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
