'use client';

import { useState } from 'react';
import { Alert, btnGhost, btnPrimary, cardCls } from '@/components/admin/ui';
import { DownloadIcon, UploadIcon } from '@/components/admin/icons';
import { dicatatSaatDisetujui, type Pengajuan } from '@/lib/pengajuan-shared';
import { unggahPdf } from '@/lib/unggah-client';

const fileCls =
  'block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-700 hover:file:bg-navy-100 file:cursor-pointer';

// Laporan akhir: tampil pada pengajuan berstatus 'terbit'.
export default function PanelLaporan({ p, onSelesai }: { p: Pengajuan; onSelesai: (p: Pengajuan) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [kunci, setKunci] = useState(0);
  const [tahap, setTahap] = useState<'' | 'unggah' | 'simpan'>('');
  const [error, setError] = useState('');
  const bolehKirim = p.laporan_status === null || p.laporan_status === 'revisi';

  async function kirim() {
    if (!file) return;
    setError('');
    try {
      setTahap('unggah');
      const path = await unggahPdf(`/api/dosen/pengajuan/${p.id}/laporan/unggah`, {}, file);
      setTahap('simpan');
      const res = await fetch(`/api/dosen/pengajuan/${p.id}/laporan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Gagal mengirim laporan.');
      setFile(null);
      setKunci((k) => k + 1);
      onSelesai(json as Pengajuan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim laporan.');
    } finally {
      setTahap('');
    }
  }

  return (
    <div className={`${cardCls} p-6 space-y-4`}>
      <div>
        <h2 className="font-bold text-navy-800">Laporan Akhir</h2>
        <p className="text-sm text-gray-500 mt-1">
          Unggah laporan akhir kegiatan dalam format PDF (maks 10 MB). LPPM akan memeriksa laporan Anda.
        </p>
      </div>
      {p.laporan_status === 'dikirim' && <Alert kind="success">Laporan sedang diperiksa LPPM.</Alert>}
      {p.laporan_status === 'revisi' && (
        <Alert kind="error">Laporan perlu revisi. Catatan LPPM: {p.laporan_catatan}</Alert>
      )}
      {p.laporan_status === 'diterima' && (
        <Alert kind="success">
          {dicatatSaatDisetujui(p.jenis)
            ? 'Laporan diterima. Kegiatan tercatat selesai.'
            : 'Laporan diterima. Publikasi tercatat di daftar Publikasi situs.'}
        </Alert>
      )}
      {error && <Alert kind="error">{error}</Alert>}
      {p.laporan_path && (
        <a href={`/api/dosen/pengajuan/${p.id}/file?jenis=laporan`} target="_blank" rel="noopener noreferrer" className={btnGhost}>
          <DownloadIcon className="w-4 h-4" /> Laporan yang dikirim
        </a>
      )}
      {bolehKirim && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            key={kunci}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={fileCls}
          />
          <button disabled={!file || tahap !== ''} onClick={kirim} className={btnPrimary}>
            <UploadIcon className="w-4 h-4" />
            {tahap === 'unggah' ? 'Mengunggah laporan…' : tahap === 'simpan' ? 'Menyimpan…' : p.laporan_status === 'revisi' ? 'Kirim Ulang Laporan' : 'Kirim Laporan'}
          </button>
        </div>
      )}
    </div>
  );
}
