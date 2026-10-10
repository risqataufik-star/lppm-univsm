'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader, Alert, TableEmptyRow, cardCls, btnPrimary, theadCls, thCls, tdCls } from '@/components/admin/ui';
import { DocIcon, PlusIcon } from '@/components/admin/icons';
import { JENIS_LABEL, STATUS_BADGE, STATUS_LABEL, type Pengajuan } from '@/lib/pengajuan-shared';

export default function PengajuanSayaPage() {
  const [rows, setRows] = useState<Pengajuan[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dosen/pengajuan', { cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json.error || 'Gagal memuat pengajuan.');
        return json as Pengajuan[];
      })
      .then(setRows)
      .catch((e: Error) => {
        setError(e.message);
        setRows([]);
      });
  }, []);

  return (
    <div>
      <PageHeader
        icon={<DocIcon className="w-6 h-6" />}
        title="Pengajuan Saya"
        subtitle="Pantau status pengajuan penelitian dan PkM Anda."
        action={
          <Link href="/dosen/ajukan" className={btnPrimary}>
            <PlusIcon className="w-4 h-4" /> Ajukan Baru
          </Link>
        }
      />
      {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={theadCls}>
              <th className={thCls}>Judul</th>
              <th className={thCls}>Jenis</th>
              <th className={thCls}>Tahun</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Diajukan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows === null && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Memuat…</td></tr>
            )}
            {rows?.length === 0 && !error && (
              <TableEmptyRow colSpan={5} icon={<DocIcon className="w-6 h-6" />} text="Belum ada pengajuan. Klik “Ajukan Baru” untuk memulai." />
            )}
            {rows?.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className={tdCls}>
                  <Link href={`/dosen/pengajuan/${p.id}`} className="font-medium text-navy-700 hover:underline">{p.judul}</Link>
                </td>
                <td className={tdCls}>{JENIS_LABEL[p.jenis]}</td>
                <td className={`${tdCls} tabular-nums`}>{p.tahun}</td>
                <td className={tdCls}>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                </td>
                <td className={tdCls}>{new Date(p.created_at).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
