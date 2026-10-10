'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import PengajuanForm from '@/components/dosen/PengajuanForm';
import { Alert, btnGhost, cardCls } from '@/components/admin/ui';
import { DownloadIcon } from '@/components/admin/icons';
import {
  FILE_LABEL,
  JENIS_LABEL,
  STATUS_BADGE,
  STATUS_LABEL,
  type FileJenis,
  type Pengajuan,
} from '@/lib/pengajuan-shared';

export default function DetailPengajuanPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Pengajuan | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/dosen/pengajuan/${id}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || 'Pengajuan tidak ditemukan.');
      return;
    }
    setP(json as Pengajuan);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="max-w-3xl">
        <Alert kind="error">{error}</Alert>
        <Link href="/dosen" className="inline-block mt-4 text-sm text-navy-700 hover:underline">← Pengajuan Saya</Link>
      </div>
    );
  }
  if (!p) return <p className="text-sm text-gray-400">Memuat…</p>;

  const berkas: FileJenis[] = [
    'proposal',
    ...(p.surat_tugas_path ? (['surat_tugas'] as const) : []),
    ...(p.sk_path ? (['sk'] as const) : []),
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/dosen" className="text-sm text-navy-700 hover:underline">← Pengajuan Saya</Link>

      <div className={`${cardCls} p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              {JENIS_LABEL[p.jenis]} · {p.skema} · {p.tahun}
            </p>
            <h1 className="text-xl font-bold text-navy-800 mt-1">{p.judul}</h1>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
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
      </div>

      {p.catatan && (p.status === 'revisi' || p.status === 'ditolak') && (
        <Alert kind="error">Catatan LPPM: {p.catatan}</Alert>
      )}
      {p.status === 'terbit' && (
        <Alert kind="success">Surat Tugas dan SK telah terbit. Silakan unduh di bawah.</Alert>
      )}

      <div className={`${cardCls} p-6`}>
        <h2 className="font-bold text-navy-800 mb-3">Berkas</h2>
        <div className="flex flex-wrap gap-2">
          {berkas.map((j) => (
            <a key={j} href={`/api/dosen/pengajuan/${p.id}/file?jenis=${j}`} target="_blank" rel="noopener noreferrer" className={btnGhost}>
              <DownloadIcon className="w-4 h-4" /> {FILE_LABEL[j]}
            </a>
          ))}
        </div>
      </div>

      {p.status === 'revisi' && (
        <div>
          <h2 className="font-bold text-navy-800 mb-3">Perbaiki & Kirim Ulang</h2>
          <PengajuanForm
            awal={p}
            url={`/api/dosen/pengajuan/${p.id}`}
            method="PUT"
            labelKirim="Kirim Ulang"
            fileWajib={false}
            onSelesai={(baru) => setP(baru)}
          />
        </div>
      )}
    </div>
  );
}
