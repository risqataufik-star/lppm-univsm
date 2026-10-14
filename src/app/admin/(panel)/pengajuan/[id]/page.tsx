'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Alert, btnGhost, cardCls } from '@/components/admin/ui';
import { DownloadIcon } from '@/components/admin/icons';
import { PanelKeputusan, PanelPemeriksaanLaporan, PanelSurat } from '@/components/admin/PengajuanAksi';
import { JENIS_LABEL, labelPengajuan, type Pengajuan } from '@/lib/pengajuan-shared';

type Detail = Pengajuan & {
  profil: { nama: string; email: string; nidn: string; prodi: string; no_hp: string } | null;
};

export default function DetailPengajuanAdminPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/pengajuan/${id}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || 'Pengajuan tidak ditemukan.');
      return;
    }
    setP(json as Detail);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="max-w-4xl">
        <Alert kind="error">{error}</Alert>
        <Link href="/admin/pengajuan" className="inline-block mt-4 text-sm text-navy-700 hover:underline">← Daftar pengajuan</Link>
      </div>
    );
  }
  if (!p) return <p className="text-sm text-gray-400">Memuat…</p>;

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/pengajuan" className="text-sm text-navy-700 hover:underline">← Daftar pengajuan</Link>

      <div className={`${cardCls} p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              {JENIS_LABEL[p.jenis]} · {p.skema} · {p.tahun}
            </p>
            <h1 className="text-xl font-bold text-navy-800 mt-1">{p.judul}</h1>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${labelPengajuan(p).badge}`}>{labelPengajuan(p).label}</span>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-400">Pengusul</dt>
            <dd className="text-gray-800">{p.profil?.nama ?? '—'}</dd>
            <dd className="text-xs text-gray-500">
              NIDN/NIDK {p.profil?.nidn ?? '—'} · {p.profil?.prodi ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Kontak</dt>
            <dd className="text-gray-800">{p.profil?.email ?? '—'}</dd>
            <dd className="text-xs text-gray-500">{p.profil?.no_hp ?? ''}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Anggota Tim</dt>
            <dd className="text-gray-800">{p.anggota || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Sumber Dana</dt>
            <dd className="text-gray-800">{p.sumber_dana || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-400">Ringkasan</dt>
            <dd className="text-gray-800 whitespace-pre-wrap">{p.ringkasan || '—'}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href={`/api/admin/pengajuan/${p.id}/file?jenis=proposal`} target="_blank" rel="noopener noreferrer" className={btnGhost}>
            <DownloadIcon className="w-4 h-4" /> Unduh Proposal
          </a>
          {p.publik_id && (
            <Link href={`/admin/${p.jenis}`} className="text-sm text-emerald-700 hover:underline">
              Tercatat di daftar {JENIS_LABEL[p.jenis]} publik →
            </Link>
          )}
        </div>
      </div>

      {p.catatan && <Alert kind={p.status === 'ditolak' || p.status === 'revisi' ? 'error' : 'success'}>Catatan: {p.catatan}</Alert>}
      {p.status === 'diajukan' && <PanelKeputusan id={p.id} onSelesai={load} />}
      {p.status === 'terbit' && <PanelPemeriksaanLaporan p={p} onSelesai={load} />}
      {(p.status === 'disetujui' || p.status === 'terbit') && <PanelSurat p={p} onSelesai={load} />}
    </div>
  );
}
