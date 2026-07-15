'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader,
  Alert,
  TableEmptyRow,
  inputCls,
  labelCls,
  cardCls,
  btnPrimary,
  btnGhost,
  theadCls,
  thCls,
  tdCls,
  rowEditBtn,
  rowDeleteBtn,
} from '@/components/admin/ui';
import { DocIcon, UploadIcon, EditIcon, TrashIcon, DownloadIcon } from '@/components/admin/icons';

type Dokumen = {
  id: string;
  judul: string;
  kategori: 'pedoman' | 'template' | 'sk' | 'laporan' | 'lainnya';
  deskripsi: string;
  file_url: string;
  nama_file: string;
  ukuran_bytes: number;
  tipe_file: string;
};

const KATEGORI = [
  { value: 'pedoman', label: 'Pedoman' },
  { value: 'template', label: 'Template' },
  { value: 'sk', label: 'SK & Kebijakan' },
  { value: 'laporan', label: 'Laporan' },
  { value: 'lainnya', label: 'Lainnya' },
];

const fmtSize = (b: number) =>
  b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

export default function DokumenAdminPage() {
  const [rows, setRows] = useState<Dokumen[]>([]);
  const [form, setForm] = useState<Partial<Dokumen> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/dokumen');
    setRows(res.ok ? await res.json() : []);
  }
  useEffect(() => { load(); }, []);

  function set<K extends keyof Dokumen>(k: K, v: Dokumen[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadFile(file: File) {
    setBusy(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bucket', 'dokumen');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || 'Gagal mengunggah file.'); return; }
    setForm((f) => ({
      ...f,
      file_url: json.url,
      nama_file: json.nama_file,
      ukuran_bytes: json.ukuran_bytes,
      tipe_file: json.tipe_file,
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.file_url) { setError('File wajib diunggah.'); return; }
    setBusy(true);
    setError('');
    const payload = {
      judul: form.judul,
      kategori: form.kategori ?? 'pedoman',
      deskripsi: form.deskripsi ?? '',
      file_url: form.file_url,
      nama_file: form.nama_file,
      ukuran_bytes: form.ukuran_bytes ?? 0,
      tipe_file: form.tipe_file ?? '',
    };
    const res = await fetch(form.id ? `/api/dokumen/${form.id}` : '/api/dokumen', {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || 'Gagal menyimpan.'); return; }
    setForm(null);
    load();
  }

  async function remove(d: Dokumen) {
    if (!confirm(`Hapus dokumen "${d.judul}"?`)) return;
    await fetch(`/api/dokumen/${d.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        icon={<DocIcon className="w-6 h-6" />}
        title="Dokumen & Template"
        subtitle="Unggah pedoman, template, SK, dan laporan untuk pusat unduhan."
        action={
          <button onClick={() => setForm({ kategori: 'pedoman' })} className={btnPrimary}>
            <UploadIcon className="w-4 h-4" /> Unggah Dokumen
          </button>
        }
      />

      {form && (
        <form onSubmit={save} className={`${cardCls} p-6 mb-6 space-y-4`}>
          <h2 className="font-bold text-navy-800">{form.id ? 'Edit' : 'Unggah'} Dokumen</h2>
          {error && <Alert kind="error">{error}</Alert>}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Judul</label>
              <input className={inputCls} value={form.judul ?? ''} onChange={(e) => set('judul', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Kategori</label>
              <select className={inputCls} value={form.kategori} onChange={(e) => set('kategori', e.target.value as Dokumen['kategori'])}>
                {KATEGORI.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Deskripsi</label>
            <input className={inputCls} value={form.deskripsi ?? ''} onChange={(e) => set('deskripsi', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>File (PDF/DOC/DOCX/XLS/XLSX, maks 10 MB)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-700 hover:file:bg-navy-100 file:cursor-pointer"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
            />
            {form.nama_file && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1">
                <DownloadIcon className="w-3.5 h-3.5" />
                {form.nama_file} ({fmtSize(form.ukuran_bytes ?? 0)})
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" onClick={() => setForm(null)} className={btnGhost}>
              Batal
            </button>
          </div>
        </form>
      )}

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={theadCls}>
              <th className={thCls}>Judul</th>
              <th className={thCls}>Kategori</th>
              <th className={thCls}>File</th>
              <th className={thCls}>Ukuran</th>
              <th className={`${thCls} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && (
              <TableEmptyRow colSpan={5} icon={<DocIcon className="w-6 h-6" />} text="Belum ada dokumen." />
            )}
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                <td className={`${tdCls} font-medium text-gray-800`}>{d.judul}</td>
                <td className={`${tdCls} capitalize`}>{d.kategori}</td>
                <td className={tdCls}>
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-navy-600 hover:text-navy-800 hover:underline">
                    <DownloadIcon className="w-3.5 h-3.5" /> {d.nama_file}
                  </a>
                </td>
                <td className={`${tdCls} tabular-nums`}>{fmtSize(d.ukuran_bytes)}</td>
                <td className={`${tdCls} whitespace-nowrap text-right`}>
                  <div className="inline-flex gap-1">
                    <button onClick={() => setForm(d)} className={rowEditBtn}>
                      <EditIcon className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => remove(d)} className={rowDeleteBtn}>
                      <TrashIcon className="w-3.5 h-3.5" /> Hapus
                    </button>
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
