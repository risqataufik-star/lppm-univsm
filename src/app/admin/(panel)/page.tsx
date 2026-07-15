import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  NewsIcon,
  DocIcon,
  ResearchIcon,
  CommunityIcon,
  PublicationIcon,
  MessageIcon,
} from '@/components/admin/icons';

const CARDS = [
  { table: 'berita', label: 'Berita & Agenda', href: '/admin/berita', Icon: NewsIcon, tile: 'bg-blue-50 text-blue-600' },
  { table: 'dokumen', label: 'Dokumen', href: '/admin/dokumen', Icon: DocIcon, tile: 'bg-amber-50 text-amber-600' },
  { table: 'penelitian', label: 'Penelitian', href: '/admin/penelitian', Icon: ResearchIcon, tile: 'bg-violet-50 text-violet-600' },
  { table: 'pkm', label: 'PkM', href: '/admin/pkm', Icon: CommunityIcon, tile: 'bg-emerald-50 text-emerald-600' },
  { table: 'publikasi', label: 'Publikasi', href: '/admin/publikasi', Icon: PublicationIcon, tile: 'bg-teal-50 text-teal-600' },
] as const;

const JENIS_BADGE: Record<string, string> = {
  kontak: 'bg-navy-50 text-navy-700',
  konsultasi: 'bg-blue-50 text-blue-700',
  kerjasama: 'bg-emerald-50 text-emerald-700',
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const db = supabaseAdmin();
  const counts = await Promise.all(
    CARDS.map((c) => db.from(c.table).select('*', { count: 'exact', head: true })),
  );
  const { data: pesanBaru } = await db
    .from('pesan')
    .select('id, nama, jenis, subjek, created_at')
    .eq('status', 'baru')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-800">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Ringkasan konten dan pesan masuk LPPM UnivSM.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {CARDS.map((c, i) => (
          <Link
            key={c.table}
            href={c.href}
            className="group bg-white rounded-2xl border border-gray-200 p-5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-navy-900/5 hover:border-navy-200"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${c.tile}`}>
              <c.Icon className="w-6 h-6" />
            </div>
            <p className="text-3xl font-extrabold text-navy-800 tabular-nums">{counts[i].count ?? 0}</p>
            <p className="text-sm text-gray-500 mt-0.5">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center">
              <MessageIcon className="w-4 h-4" />
            </span>
            <h2 className="font-bold text-navy-800">Pesan Baru</h2>
            {!!pesanBaru?.length && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold-100 text-gold-600">
                {pesanBaru.length}
              </span>
            )}
          </div>
          <Link href="/admin/pesan" className="text-sm font-medium text-navy-600 hover:text-navy-800 hover:underline">
            Lihat semua
          </Link>
        </div>

        {!pesanBaru?.length ? (
          <div className="text-center py-14 px-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <MessageIcon className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-400">Tidak ada pesan baru.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pesanBaru.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <span className="w-9 h-9 shrink-0 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-sm font-semibold">
                  {p.nama?.charAt(0).toUpperCase() || '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-800 truncate">{p.nama}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${JENIS_BADGE[p.jenis] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.jenis}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{p.subjek || '(tanpa subjek)'}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                  {new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
