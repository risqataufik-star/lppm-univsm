import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type Peran = 'admin' | 'dosen';
export type StatusAkun = 'menunggu' | 'aktif' | 'ditolak';
export type Profil = {
  user_id: string;
  nama: string;
  email: string;
  nidn: string;
  prodi: string;
  no_hp: string;
  peran: Peran;
  status: StatusAkun;
};

// Sesi dari cookie + baris profil-nya. null bila tidak login.
export async function getSesi(): Promise<{ userId: string; profil: Profil | null } | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabaseAdmin()
    .from('profil')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return { userId: user.id, profil: (data as Profil | null) ?? null };
}

// null bila pemanggil admin aktif; selain itu respons 401/403 siap-kirim.
export async function requireAdmin(): Promise<NextResponse | null> {
  const sesi = await getSesi();
  if (!sesi) {
    return NextResponse.json({ error: 'Anda harus login sebagai admin.' }, { status: 401 });
  }
  const p = sesi.profil;
  if (!p || p.peran !== 'admin' || p.status !== 'aktif') {
    return NextResponse.json({ error: 'Akses khusus admin LPPM.' }, { status: 403 });
  }
  return null;
}

// Penjaga server component halaman admin. Penjagaan di layout saja tidak cukup:
// Next.js merender segmen halaman sejajar dengan layout dan dapat melewatkan layout
// pada navigasi RSC parsial, sehingga data halaman bisa terkirim ke non-admin.
export async function requireAdminPage(): Promise<Profil> {
  const sesi = await getSesi();
  if (!sesi) redirect('/admin/login');
  const p = sesi.profil;
  if (!p || p.peran !== 'admin' || p.status !== 'aktif') {
    redirect(p?.peran === 'dosen' ? '/dosen' : '/admin/login?e=akses');
  }
  return p;
}

// Profil dosen aktif, atau respons 401/403 siap-kirim.
export async function requireDosen(): Promise<{ profil: Profil } | NextResponse> {
  const sesi = await getSesi();
  if (!sesi) {
    return NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 });
  }
  const p = sesi.profil;
  if (!p || p.peran !== 'dosen') {
    return NextResponse.json({ error: 'Akses khusus dosen.' }, { status: 403 });
  }
  if (p.status !== 'aktif') {
    return NextResponse.json({ error: 'Akun dosen Anda belum aktif.' }, { status: 403 });
  }
  return { profil: p };
}
