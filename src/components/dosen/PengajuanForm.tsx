'use client';

import { useState } from 'react';
import { Alert, btnPrimary, cardCls, inputCls, labelCls } from '@/components/admin/ui';
import { SKEMA, type Jenis, type Pengajuan } from '@/lib/pengajuan-shared';
import { unggahPdf } from '@/lib/unggah-client';

const fileCls =
  'block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-700 hover:file:bg-navy-100 file:cursor-pointer';
const FIELD = ['jenis', 'skema', 'tahun', 'judul', 'anggota', 'sumber_dana', 'ringkasan'] as const;

export default function PengajuanForm({
  awal,
  url,
  method,
  labelKirim,
  fileWajib,
  onSelesai,
}: {
  awal?: Pengajuan;
  url: string;
  method: 'POST' | 'PUT';
  labelKirim: string;
  fileWajib: boolean;
  onSelesai: (p: Pengajuan) => void;
}) {
  const [jenis, setJenis] = useState<Jenis>(awal?.jenis ?? 'penelitian');
  const [skema, setSkema] = useState<string>(awal?.skema ?? SKEMA.penelitian[0]);
  const [error, setError] = useState('');
  const [tahap, setTahap] = useState<'' | 'unggah' | 'simpan'>('');

  function gantiJenis(j: Jenis) {
    setJenis(j);
    setSkema(SKEMA[j][0]);
  }

  async function kirim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    for (const k of FIELD) data[k] = fd.get(k) ?? '';
    const file = fd.get('proposal');
    try {
      if (file instanceof File && file.size > 0) {
        setTahap('unggah');
        data.proposal_path = await unggahPdf('/api/dosen/unggah', {}, file);
      } else if (fileWajib) {
        setError('File proposal (PDF) wajib diunggah.');
        return;
      }
      setTahap('simpan');
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Gagal mengirim pengajuan.');
      onSelesai(json as Pengajuan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pengajuan.');
    } finally {
      setTahap('');
    }
  }

  return (
    <form onSubmit={kirim} className={`${cardCls} p-6 space-y-4`}>
      {error && <Alert kind="error">{error}</Alert>}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="jenis" className={labelCls}>Jenis Kegiatan</label>
          <select id="jenis" name="jenis" value={jenis} onChange={(e) => gantiJenis(e.target.value as Jenis)} className={inputCls}>
            <option value="penelitian">Penelitian</option>
            <option value="pkm">Pengabdian kepada Masyarakat</option>
          </select>
        </div>
        <div>
          <label htmlFor="skema" className={labelCls}>Skema</label>
          <select id="skema" name="skema" value={skema} onChange={(e) => setSkema(e.target.value)} className={inputCls}>
            {SKEMA[jenis].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tahun" className={labelCls}>Tahun</label>
          <input id="tahun" name="tahun" type="number" min={2000} max={2100} required defaultValue={awal?.tahun ?? new Date().getFullYear()} className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="judul" className={labelCls}>Judul</label>
        <input id="judul" name="judul" required minLength={10} defaultValue={awal?.judul ?? ''} className={inputCls} />
      </div>
      <div>
        <label htmlFor="anggota" className={labelCls}>
          Anggota Tim <span className="font-normal text-gray-400">(pisahkan dengan koma; dosen & mahasiswa)</span>
        </label>
        <textarea id="anggota" name="anggota" rows={2} defaultValue={awal?.anggota ?? ''} className={inputCls} />
      </div>
      <div>
        <label htmlFor="sumber_dana" className={labelCls}>Sumber Dana</label>
        <input id="sumber_dana" name="sumber_dana" defaultValue={awal?.sumber_dana ?? ''} placeholder="mis. Hibah Internal UnivSM / Mandiri" className={inputCls} />
      </div>
      <div>
        <label htmlFor="ringkasan" className={labelCls}>Ringkasan</label>
        <textarea id="ringkasan" name="ringkasan" rows={4} defaultValue={awal?.ringkasan ?? ''} className={inputCls} />
      </div>
      <div>
        <label htmlFor="proposal" className={labelCls}>
          File Proposal (PDF, maks 10 MB)
          {!fileWajib && <span className="font-normal text-gray-400"> — kosongkan bila tidak diganti</span>}
        </label>
        <input id="proposal" name="proposal" type="file" accept="application/pdf,.pdf" required={fileWajib} className={fileCls} />
      </div>
      <button type="submit" disabled={tahap !== ''} className={btnPrimary}>
        {tahap === 'unggah' ? 'Mengunggah proposal…' : tahap === 'simpan' ? 'Menyimpan…' : labelKirim}
      </button>
    </form>
  );
}
