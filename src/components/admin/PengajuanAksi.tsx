'use client';

import { useState } from 'react';
import { Alert, btnDangerOutline, btnGhost, btnPrimary, btnSuccess, cardCls, inputCls, labelCls } from './ui';
import { CheckIcon, DownloadIcon, EditIcon, UploadIcon } from './icons';
import { FILE_LABEL, type Pengajuan } from '@/lib/pengajuan-shared';
import { unggahPdf } from '@/lib/unggah-client';

const fileCls =
  'block text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-700 hover:file:bg-navy-100 file:cursor-pointer';

const TANYA = {
  setujui: 'Setujui pengajuan ini? Kegiatan akan otomatis tercatat di daftar publik.',
  revisi: 'Kembalikan pengajuan ini ke dosen untuk revisi?',
  tolak: 'Tolak pengajuan ini? Keputusan ini final.',
} as const;

export function PanelKeputusan({ id, onSelesai }: { id: string; onSelesai: () => void }) {
  const [catatan, setCatatan] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function putuskan(aksi: keyof typeof TANYA) {
    if (aksi !== 'setujui' && catatan.trim().length < 5) {
      setError('Tulis catatan (minimal 5 karakter) untuk revisi atau penolakan.');
      return;
    }
    if (!confirm(TANYA[aksi])) return;
    setBusy(true);
    setError('');
    const res = await fetch(`/api/admin/pengajuan/${id}/keputusan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aksi, catatan }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error || 'Gagal menyimpan keputusan.');
      return;
    }
    onSelesai();
  }

  return (
    <div className={`${cardCls} p-6 space-y-4`}>
      <h2 className="font-bold text-navy-800">Keputusan LPPM</h2>
      {error && <Alert kind="error">{error}</Alert>}
      <div>
        <label htmlFor="catatan" className={labelCls}>
          Catatan untuk dosen <span className="font-normal text-gray-400">(wajib untuk revisi/penolakan)</span>
        </label>
        <textarea id="catatan" rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inputCls} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => putuskan('setujui')} className={btnSuccess}>
          <CheckIcon className="w-4 h-4" /> Setujui
        </button>
        <button disabled={busy} onClick={() => putuskan('revisi')} className={btnGhost}>
          <EditIcon className="w-4 h-4" /> Minta Revisi
        </button>
        <button disabled={busy} onClick={() => putuskan('tolak')} className={btnDangerOutline}>
          Tolak
        </button>
      </div>
    </div>
  );
}

function BarisSurat({
  p,
  jenis,
  onSelesai,
}: {
  p: Pengajuan;
  jenis: 'surat_tugas' | 'sk';
  onSelesai: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [kunci, setKunci] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ada = jenis === 'surat_tugas' ? p.surat_tugas_path : p.sk_path;

  async function unggah() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const path = await unggahPdf(`/api/admin/pengajuan/${p.id}/unggah`, { jenis }, file);
      const res = await fetch(`/api/admin/pengajuan/${p.id}/surat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jenis, path }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan surat.');
      setFile(null);
      setKunci((k) => k + 1);
      onSelesai();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengunggah surat.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="font-medium text-gray-800">{FILE_LABEL[jenis]}</p>
        {ada ? (
          <a
            href={`/api/admin/pengajuan/${p.id}/file?jenis=${jenis}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-navy-700 hover:underline"
          >
            <DownloadIcon className="w-4 h-4" /> Lihat berkas saat ini
          </a>
        ) : (
          <span className="text-xs text-gray-400">Belum diunggah</span>
        )}
      </div>
      {error && <div className="mb-3"><Alert kind="error">{error}</Alert></div>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          key={kunci}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={fileCls}
        />
        <button disabled={!file || busy} onClick={unggah} className={btnPrimary}>
          <UploadIcon className="w-4 h-4" /> {busy ? 'Mengunggah…' : ada ? 'Ganti' : 'Unggah'}
        </button>
      </div>
    </div>
  );
}

export function PanelSurat({ p, onSelesai }: { p: Pengajuan; onSelesai: () => void }) {
  return (
    <div className={`${cardCls} p-6 space-y-4`}>
      <div>
        <h2 className="font-bold text-navy-800">Surat Tugas &amp; SK</h2>
        <p className="text-sm text-gray-500 mt-1">
          Unggah PDF yang sudah ditandatangani. Status menjadi “ST &amp; SK Terbit” setelah keduanya terunggah.
        </p>
      </div>
      <BarisSurat p={p} jenis="surat_tugas" onSelesai={onSelesai} />
      <BarisSurat p={p} jenis="sk" onSelesai={onSelesai} />
    </div>
  );
}

export function PanelPemeriksaanLaporan({ p, onSelesai }: { p: Pengajuan; onSelesai: () => void }) {
  const [catatan, setCatatan] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const unduh = p.laporan_path && (
    <a href={`/api/admin/pengajuan/${p.id}/file?jenis=laporan`} target="_blank" rel="noopener noreferrer" className={btnGhost}>
      <DownloadIcon className="w-4 h-4" /> Unduh Laporan
    </a>
  );

  async function putuskan(aksi: 'terima' | 'revisi') {
    if (aksi === 'revisi' && catatan.trim().length < 5) {
      setError('Tulis catatan (minimal 5 karakter) untuk revisi laporan.');
      return;
    }
    const tanya =
      aksi === 'terima'
        ? 'Terima laporan ini? Kegiatan akan tercatat selesai di daftar publik.'
        : 'Kembalikan laporan ini ke dosen untuk revisi?';
    if (!confirm(tanya)) return;
    setBusy(true);
    setError('');
    const res = await fetch(`/api/admin/pengajuan/${p.id}/laporan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aksi, catatan }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error || 'Gagal menyimpan keputusan laporan.');
      return;
    }
    setCatatan('');
    onSelesai();
  }

  if (p.laporan_status !== 'dikirim') {
    return (
      <div className={`${cardCls} p-6 space-y-3`}>
        <h2 className="font-bold text-navy-800">Laporan Akhir</h2>
        <p className="text-sm text-gray-600">
          {p.laporan_status === 'diterima'
            ? 'Laporan telah diterima. Kegiatan tercatat selesai.'
            : p.laporan_status === 'revisi'
              ? `Menunggu dosen mengirim ulang laporan. Catatan: ${p.laporan_catatan}`
              : 'Dosen belum mengirim laporan akhir.'}
        </p>
        {unduh}
      </div>
    );
  }

  return (
    <div className={`${cardCls} p-6 space-y-4`}>
      <h2 className="font-bold text-navy-800">Pemeriksaan Laporan</h2>
      {error && <Alert kind="error">{error}</Alert>}
      {unduh}
      <div>
        <label htmlFor="catatan-laporan" className={labelCls}>
          Catatan untuk dosen <span className="font-normal text-gray-400">(wajib untuk revisi)</span>
        </label>
        <textarea id="catatan-laporan" rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inputCls} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => putuskan('terima')} className={btnSuccess}>
          <CheckIcon className="w-4 h-4" /> Terima Laporan
        </button>
        <button disabled={busy} onClick={() => putuskan('revisi')} className={btnGhost}>
          <EditIcon className="w-4 h-4" /> Minta Revisi
        </button>
      </div>
    </div>
  );
}
