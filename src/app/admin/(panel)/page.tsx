import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';

const CARDS = [
  { table: 'berita', label: 'Berita & Agenda', href: '/admin/berita' },
  { table: 'dokumen', label: 'Dokumen', href: '/admin/dokumen' },
  { table: 'penelitian', label: 'Penelitian', href: '/admin/penelitian' },
  { table: 'pkm', label: 'PkM', href: '/admin/pkm' },
  { table: 'publikasi', label: 'Publikasi', href: '/admin/publikasi' },
] as const;

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
    <div>
      <h1 className="text-2xl font-bold text-navy-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {CARDS.map((c, i) => (
          <Link key={c.table} href={c.href} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md">
            <p className="text-3xl font-extrabold text-navy-800">{counts[i].count ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">{c.label}</p>
          </Link>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-navy-800">Pesan Baru</h2>
          <Link href="/admin/pesan" className="text-sm text-navy-600 hover:underline">Lihat semua</Link>
        </div>
        {!pesanBaru?.length && <p className="text-sm text-gray-400">Tidak ada pesan baru.</p>}
        <ul className="divide-y divide-gray-100">
          {pesanBaru?.map((p) => (
            <li key={p.id} className="py-2.5 text-sm">
              <span className="font-medium text-gray-800">{p.nama}</span>
              <span className="mx-2 text-xs px-2 py-0.5 rounded-full bg-navy-50 text-navy-700">{p.jenis}</span>
              <span className="text-gray-500">{p.subjek || '(tanpa subjek)'}</span>
              <span className="float-right text-xs text-gray-400">
                {new Date(p.created_at).toLocaleDateString('id-ID')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
