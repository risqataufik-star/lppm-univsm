import { NextResponse } from 'next/server';
import { getSesi } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sesi = await getSesi();
  if (!sesi) return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  if (!sesi.profil) return NextResponse.json({ error: 'Profil tidak ditemukan.' }, { status: 404 });
  const { peran, status, nama } = sesi.profil;
  return NextResponse.json({ peran, status, nama });
}
