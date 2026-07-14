import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

const LIMITS = {
  dokumen: {
    max: 10 * 1024 * 1024,
    label: '10 MB',
    types: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  gambar: {
    max: 3 * 1024 * 1024,
    label: '3 MB',
    types: ['image/jpeg', 'image/png', 'image/webp'],
  },
} as const;

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const bucket = String(form?.get('bucket') ?? '');
  if (!(file instanceof File) || !Object.prototype.hasOwnProperty.call(LIMITS, bucket)) {
    return NextResponse.json({ error: 'Permintaan upload tidak valid.' }, { status: 400 });
  }
  const cfg = LIMITS[bucket as keyof typeof LIMITS];
  if (!(cfg.types as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: 'Tipe file tidak diizinkan.' }, { status: 400 });
  }
  if (file.size > cfg.max) {
    return NextResponse.json({ error: `Ukuran file melebihi batas ${cfg.label}.` }, { status: 400 });
  }
  const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${Date.now()}-${safeName}`;
  const db = supabaseAdmin();
  const { error } = await db.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) return NextResponse.json({ error: 'Gagal mengunggah file.' }, { status: 500 });
  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({
    url: data.publicUrl,
    nama_file: file.name,
    ukuran_bytes: file.size,
    tipe_file: file.type,
  });
}
