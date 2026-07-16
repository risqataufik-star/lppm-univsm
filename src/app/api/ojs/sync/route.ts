import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { harvestOjs, type OjsJurnal } from '@/lib/ojs';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = supabaseAdmin();

  let harvest: Awaited<ReturnType<typeof harvestOjs>>;
  try {
    harvest = await harvestOjs();
  } catch {
    const msg = 'Gagal mengambil data dari OJS. Data lama tetap dipakai.';
    await db.from('pengaturan').upsert({ key: 'ojs_last_status', value: msg });
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Peta jurnal: dari ListSets + kode apa pun yang muncul di artikel
  const jurnalMap = new Map<string, OjsJurnal>(harvest.jurnal.map((j) => [j.kode, j]));
  for (const a of harvest.artikel) {
    if (!jurnalMap.has(a.jurnal_kode)) {
      jurnalMap.set(a.jurnal_kode, {
        kode: a.jurnal_kode,
        nama: a.jurnal_kode,
        url: `https://ojs.univsm.ac.id/${a.jurnal_kode}`,
      });
    }
  }

  // Agregat per jurnal
  const agg = new Map<string, { count: number; issues: Set<string>; last: string | null }>();
  for (const a of harvest.artikel) {
    const g = agg.get(a.jurnal_kode) ?? { count: 0, issues: new Set<string>(), last: null };
    g.count += 1;
    if (a.issue) g.issues.add(a.issue);
    if (a.tanggal && (!g.last || a.tanggal > g.last)) g.last = a.tanggal;
    agg.set(a.jurnal_kode, g);
  }

  const jurnalRows = [...jurnalMap.values()].map((j) => {
    const g = agg.get(j.kode);
    return {
      kode: j.kode,
      nama: j.nama,
      url: j.url,
      jml_artikel: g?.count ?? 0,
      jml_terbitan: g?.issues.size ?? 0,
      terbit_terakhir: g?.last ?? null,
      updated_at: new Date().toISOString(),
    };
  });

  const { error: jErr } = await db.from('ojs_jurnal').upsert(jurnalRows);
  if (jErr) return NextResponse.json({ error: 'Gagal menyimpan data jurnal.' }, { status: 500 });

  // Ganti total isi ojs_artikel (harvest sudah sukses penuh sebelum menyentuh DB)
  await db.from('ojs_artikel').delete().neq('id', '');
  for (let i = 0; i < harvest.artikel.length; i += 500) {
    const batch = harvest.artikel.slice(i, i + 500);
    const { error } = await db.from('ojs_artikel').insert(batch);
    if (error) return NextResponse.json({ error: 'Gagal menyimpan artikel.' }, { status: 500 });
  }

  const status = `${jurnalRows.length} jurnal, ${harvest.artikel.length} artikel`;
  await db.from('pengaturan').upsert([
    { key: 'ojs_last_sync', value: new Date().toISOString() },
    { key: 'ojs_last_status', value: status },
  ]);

  return NextResponse.json({ ok: true, jurnal: jurnalRows.length, artikel: harvest.artikel.length });
}
