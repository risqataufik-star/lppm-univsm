import { supabaseAdmin } from '@/lib/supabase/admin';
import { PageHeader, cardCls, theadCls, thCls, tdCls } from '@/components/admin/ui';
import { ChartIcon } from '@/components/admin/icons';
import SyncOjsButton from '@/components/admin/SyncOjsButton';

export const dynamic = 'force-dynamic';

type Jurnal = {
  kode: string; nama: string; url: string;
  jml_artikel: number; jml_terbitan: number; terbit_terakhir: string | null;
};

export default async function MonevOjsPage() {
  const db = supabaseAdmin();
  const [{ data: jurnalData }, { data: tahunData }, { data: setelan }] = await Promise.all([
    db.from('ojs_jurnal').select('*').order('nama', { ascending: true }),
    db.from('ojs_artikel').select('tahun'),
    db.from('pengaturan').select('key,value').in('key', ['ojs_last_sync', 'ojs_last_status']),
  ]);
  const jurnal = (jurnalData ?? []) as Jurnal[];

  // Ambang aktif: 12 bulan terakhir
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const isAktif = (j: Jurnal) => !!j.terbit_terakhir && j.terbit_terakhir >= cutoffStr;

  const totalArtikel = jurnal.reduce((s, j) => s + (j.jml_artikel ?? 0), 0);
  const totalTerbitan = jurnal.reduce((s, j) => s + (j.jml_terbitan ?? 0), 0);
  const jmlAktif = jurnal.filter(isAktif).length;

  // Tren artikel per tahun (6 tahun terakhir)
  const byYear = new Map<number, number>();
  for (const r of (tahunData ?? []) as { tahun: number | null }[]) {
    if (r.tahun) byYear.set(r.tahun, (byYear.get(r.tahun) ?? 0) + 1);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b).slice(-6);
  const maxYear = Math.max(1, ...years.map((y) => byYear.get(y) ?? 0));

  const settings = Object.fromEntries((setelan ?? []).map((s) => [s.key, s.value]));
  const lastSync = settings.ojs_last_sync
    ? new Date(settings.ojs_last_sync).toLocaleString('id-ID')
    : 'belum pernah';

  const CARDS = [
    { label: 'Jurnal', value: jurnal.length, tile: 'bg-blue-50 text-blue-600' },
    { label: 'Artikel', value: totalArtikel, tile: 'bg-emerald-50 text-emerald-600' },
    { label: 'Terbitan', value: totalTerbitan, tile: 'bg-violet-50 text-violet-600' },
    { label: `Jurnal Aktif (dari ${jurnal.length})`, value: jmlAktif, tile: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="max-w-6xl">
      <PageHeader
        icon={<ChartIcon className="w-6 h-6" />}
        title="Monev OJS"
        subtitle={`Pemantauan jurnal UnivSM dari OJS. Terakhir disinkronkan: ${lastSync}.`}
        action={<SyncOjsButton />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {CARDS.map((c) => (
          <div key={c.label} className={`${cardCls} p-5`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.tile}`}>
              <ChartIcon className="w-5 h-5" />
            </div>
            <p className="text-3xl font-extrabold text-navy-800 tabular-nums">{c.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {!!years.length && (
        <div className={`${cardCls} p-6 mb-8`}>
          <h2 className="font-bold text-navy-800 mb-4">Artikel per Tahun</h2>
          <div className="space-y-2">
            {years.map((y) => {
              const v = byYear.get(y) ?? 0;
              return (
                <div key={y} className="flex items-center gap-3">
                  <span className="w-12 text-sm text-gray-500 tabular-nums">{y}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div className="h-full bg-navy-700 rounded-full" style={{ width: `${(v / maxYear) * 100}%` }} />
                  </div>
                  <span className="w-8 text-sm font-semibold text-navy-800 tabular-nums text-right">{v}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={theadCls}>
              <th className={thCls}>Jurnal</th>
              <th className={thCls}>Artikel</th>
              <th className={thCls}>Terbitan</th>
              <th className={thCls}>Terbit Terakhir</th>
              <th className={thCls}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!jurnal.length && (
              <tr><td colSpan={5} className="px-4 py-14 text-center text-gray-400">Belum ada data. Klik &ldquo;Sinkronkan dari OJS&rdquo;.</td></tr>
            )}
            {jurnal.map((j) => {
              const aktif = isAktif(j);
              return (
                <tr key={j.kode} className="hover:bg-gray-50 transition-colors">
                  <td className={`${tdCls} font-medium text-gray-800`}>
                    <a href={j.url} target="_blank" rel="noopener noreferrer" className="hover:text-navy-600 hover:underline">{j.nama}</a>
                  </td>
                  <td className={`${tdCls} tabular-nums`}>{j.jml_artikel}</td>
                  <td className={`${tdCls} tabular-nums`}>{j.jml_terbitan}</td>
                  <td className={tdCls}>{j.terbit_terakhir ? new Date(j.terbit_terakhir + 'T00:00:00').toLocaleDateString('id-ID') : '—'}</td>
                  <td className={tdCls}>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {aktif ? 'Aktif' : 'Dorman'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
