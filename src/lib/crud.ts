import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export type CrudConfig = {
  table: string;
  schema: z.ZodObject<z.ZodRawShape>;
  /** query param yang boleh dipakai publik sebagai filter eq() */
  filters?: string[];
  orderBy?: { column: string; ascending?: boolean };
  /** filter yang dipaksakan untuk GET publik (mis. { published: true });
      dilewati bila ?all=1 dan pemanggil punya sesi admin */
  publicOnly?: Record<string, unknown>;
  beforeInsert?: (row: Record<string, unknown>) => Record<string, unknown>;
  /** nama segmen dinamis pada item routes; default 'id' */
  idParam?: string;
};

export function makeListRoutes(cfg: CrudConfig) {
  async function GET(req: Request) {
    const url = new URL(req.url);
    let skipPublicFilter = false;
    if (url.searchParams.get('all') === '1') {
      const supabase = await supabaseServer();
      const { data: { user } } = await supabase.auth.getUser();
      skipPublicFilter = !!user;
    }
    let q = supabaseAdmin().from(cfg.table).select('*');
    if (!skipPublicFilter) {
      for (const [k, v] of Object.entries(cfg.publicOnly ?? {})) q = q.eq(k, v);
    }
    for (const f of cfg.filters ?? []) {
      const v = url.searchParams.get(f);
      if (v) q = q.eq(f, v);
    }
    const ob = cfg.orderBy ?? { column: 'created_at', ascending: false };
    q = q.order(ob.column, { ascending: ob.ascending ?? false });
    const limit = Number(url.searchParams.get('limit'));
    if (limit > 0) q = q.limit(limit);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 });
    return NextResponse.json(data);
  }

  async function POST(req: Request) {
    const denied = await requireAdmin();
    if (denied) return denied;
    const body = await req.json().catch(() => null);
    const parsed = cfg.schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' },
        { status: 400 },
      );
    }
    let row = parsed.data as Record<string, unknown>;
    if (cfg.beforeInsert) row = cfg.beforeInsert(row);
    const { data, error } = await supabaseAdmin().from(cfg.table).insert(row).select().single();
    if (error) return NextResponse.json({ error: 'Gagal menyimpan data.' }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  return { GET, POST };
}

export function makeItemRoutes(cfg: CrudConfig) {
  const idParam = cfg.idParam ?? 'id';

  async function PUT(req: Request, ctx: { params: Promise<Record<string, string>> }) {
    const denied = await requireAdmin();
    if (denied) return denied;
    const id = (await ctx.params)[idParam];
    const body = await req.json().catch(() => null);
    const parsed = cfg.schema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' },
        { status: 400 },
      );
    }
    const { data, error } = await supabaseAdmin()
      .from(cfg.table)
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: 'Gagal memperbarui data.' }, { status: 500 });
    return NextResponse.json(data);
  }

  async function DELETE(_req: Request, ctx: { params: Promise<Record<string, string>> }) {
    const denied = await requireAdmin();
    if (denied) return denied;
    const id = (await ctx.params)[idParam];
    const { error } = await supabaseAdmin().from(cfg.table).delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Gagal menghapus data.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return { PUT, DELETE };
}
