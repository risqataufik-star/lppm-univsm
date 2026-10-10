'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Alert, TableEmptyRow, cardCls, inputCls, theadCls, thCls, tdCls, rowEditBtn } from '@/components/admin/ui';
import { InboxIcon } from '@/components/admin/icons';
import {
  JENIS_LABEL,
  STATUS_BADGE,
  STATUS_LABEL,
  type Pengajuan,
  type StatusPengajuan,
} from '@/lib/pengajuan-shared';

type Baris = Pick<Pengajuan, 'id' | 'jenis' | 'judul' | 'skema' | 'tahun' | 'status' | 'created_at'> & {
  profil: { nama: string; prodi: string } | null;
};

const FILTER: { v: '' | StatusPengajuan; l: string }[] = [
  { v: '', l: 'Semua' },
  { v: 'diajukan', l: 'Diajukan' },
  { v: 'revisi', l: 'Revisi' },
  { v: 'disetujui', l: 'Disetujui' },
  { v: 'terbit', l: 'Terbit' },
  { v: 'ditolak', l: 'Ditolak' },
];

export default function PengajuanAdminPage() {
  const [status, setStatus] = useState<'' | StatusPengajuan>('');
  const [jenis, setJenis] = useState('');
  const [rows, setRows] = useState<Baris[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const q = new URLSearchParams();
    if (status) q.set('status', status);
    if (jenis) q.set('jenis', jenis);
    const res = await fetch(`/api/admin/pengajuan?${q}`, { cache: 'no-store' });
    if (!res.ok) {
      setError('Gagal memuat pengajuan.');
      setRows([]);
      return;
    }
    setRows(await res.json());
  }, [status, jenis]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-6xl">
      <PageHeader
        icon={<InboxIcon className="w-6 h-6" />}
        title="Pengajuan Dosen"
        subtitle="Verifikasi pengajuan penelitian & PkM serta terbitkan Surat Tugas dan SK."
      />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTER.map((f) => (
          <button
            key={f.v || 'semua'}
            onClick={() => setStatus(f.v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
              status === f.v ? 'bg-navy-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.l}
          </button>
        ))}
        <select value={jenis} onChange={(e) => setJenis(e.target.value)} className={`${inputCls} w-auto ml-auto`}>
          <option value="">Semua jenis</option>
          <option value="penelitian">Penelitian</option>
          <option value="pkm">PkM</option>
        </select>
      </div>
      {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={theadCls}>
              <th className={thCls}>Diajukan</th>
              <th className={thCls}>Dosen</th>
              <th className={thCls}>Judul</th>
              <th className={thCls}>Jenis</th>
              <th className={thCls}>Status</th>
              <th className={`${thCls} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && (
              <TableEmptyRow colSpan={6} icon={<InboxIcon className="w-6 h-6" />} text="Tidak ada pengajuan pada filter ini." />
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className={tdCls}>{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                <td className={tdCls}>
                  <p className="font-medium text-gray-800">{r.profil?.nama ?? '—'}</p>
                  <p className="text-xs text-gray-500">{r.profil?.prodi ?? ''}</p>
                </td>
                <td className={`${tdCls} max-w-sm`}>{r.judul}</td>
                <td className={tdCls}>{JENIS_LABEL[r.jenis]}</td>
                <td className={tdCls}>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                </td>
                <td className={`${tdCls} text-right`}>
                  <Link href={`/admin/pengajuan/${r.id}`} className={rowEditBtn}>Periksa</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
