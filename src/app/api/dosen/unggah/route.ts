import { NextResponse } from 'next/server';
import { requireDosen } from '@/lib/auth';
import { pathProposalBaru, tokenUnggah } from '@/lib/pengajuan-server';

export async function POST() {
  const r = await requireDosen();
  if (r instanceof NextResponse) return r;
  try {
    return NextResponse.json(await tokenUnggah(pathProposalBaru(r.profil.user_id)));
  } catch {
    return NextResponse.json({ error: 'Gagal menyiapkan unggahan.' }, { status: 500 });
  }
}
