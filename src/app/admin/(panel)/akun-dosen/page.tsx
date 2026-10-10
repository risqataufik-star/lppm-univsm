'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PageHeader,
  Alert,
  TableEmptyRow,
  cardCls,
  theadCls,
  thCls,
  tdCls,
  rowEditBtn,
  rowDeleteBtn,
} from '@/components/admin/ui';
import { UserCheckIcon } from '@/components/admin/icons';

type StatusAkun = 'menunggu' | 'aktif' | 'ditolak';
type Dosen = {
  user_id: string;
  nama: string;
  email: string;
  nidn: string;
  prodi: string;
  no_hp: string;
  status: StatusAkun;
  created_at: string;
};

const TAB: { v: StatusAkun; l: string }[] = [
  { v: 'menunggu', l: 'Menunggu' },
  { v: 'aktif', l: 'Aktif' },
  { v: 'ditolak', l: 'Ditolak' },
];

export default function AkunDosenPage() {
  const [tab, setTab] = useState<StatusAkun>('menunggu');
  const [rows, setRows] = useState<Dosen[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    const res = await fetch(`/api/admin/dosen?status=${tab}`, { cache: 'no-store' });
    if (!res.ok) {
      setError('Gagal memuat data akun dosen.');
      setRows([]);
      return;
    }
    setRows(await res.json());
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  async function ubah(d: Dosen, status: 'aktif' | 'ditolak') {
    const kata = status === 'aktif' ? 'mengaktifkan' : d.status === 'aktif' ? 'menonaktifkan' : 'menolak';
    if (!confirm(`Yakin ${kata} akun ${d.nama}?`)) return;
    setBusy(d.user_id);
    setError('');
    const res = await fetch(`/api/admin/dosen/${d.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(json.error || 'Gagal mengubah status akun.');
      return;
    }
    load();
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        icon={<UserCheckIcon className="w-6 h-6" />}
        title="Akun Dosen"
        subtitle="Verifikasi pendaftaran dosen untuk Layanan Dosen."
      />
      <div className="flex flex-wrap gap-2 mb-4">
        {TAB.map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
              tab === t.v ? 'bg-navy-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>
      {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={theadCls}>
              <th className={thCls}>Nama / Email</th>
              <th className={thCls}>NIDN/NIDK</th>
              <th className={thCls}>Program Studi</th>
              <th className={thCls}>No. HP</th>
              <th className={thCls}>Terdaftar</th>
              <th className={`${thCls} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && (
              <TableEmptyRow colSpan={6} icon={<UserCheckIcon className="w-6 h-6" />} text="Tidak ada akun pada kategori ini." />
            )}
            {rows.map((d) => (
              <tr key={d.user_id} className="hover:bg-gray-50 transition-colors">
                <td className={tdCls}>
                  <p className="font-medium text-gray-800">{d.nama}</p>
                  <p className="text-xs text-gray-500">{d.email}</p>
                </td>
                <td className={`${tdCls} tabular-nums`}>{d.nidn}</td>
                <td className={tdCls}>{d.prodi}</td>
                <td className={`${tdCls} tabular-nums`}>{d.no_hp}</td>
                <td className={tdCls}>{new Date(d.created_at).toLocaleDateString('id-ID')}</td>
                <td className={`${tdCls} text-right whitespace-nowrap`}>
                  <div className="inline-flex gap-1">
                    {d.status !== 'aktif' && (
                      <button disabled={busy === d.user_id} onClick={() => ubah(d, 'aktif')} className={rowEditBtn}>
                        {d.status === 'menunggu' ? 'Setujui' : 'Aktifkan'}
                      </button>
                    )}
                    {d.status !== 'ditolak' && (
                      <button disabled={busy === d.user_id} onClick={() => ubah(d, 'ditolak')} className={rowDeleteBtn}>
                        {d.status === 'menunggu' ? 'Tolak' : 'Nonaktifkan'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
