'use client';

import { useEffect, useState } from 'react';

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

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:ring-2 focus:ring-navy-800/20 outline-none';

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy-800">Dokumen &amp; Template</h1>
        <button
          onClick={() => setForm({ kategori: 'pedoman' })}
          className="rounded-lg bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-4 py-2"
        >
          + Unggah Dokumen
        </button>
      </div>

      {form && (
        <form onSubmit={save} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-bold text-navy-800">{form.id ? 'Edit' : 'Unggah'} Dokumen</h2>
          {error && <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</p>}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Judul</label>
              <input className={inputCls} value={form.judul ?? ''} onChange={(e) => set('judul', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategori</label>
              <select className={inputCls} value={form.kategori} onChange={(e) => set('kategori', e.target.value as Dokumen['kategori'])}>
                {KATEGORI.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deskripsi</label>
            <input className={inputCls} value={form.deskripsi ?? ''} onChange={(e) => set('deskripsi', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">File (PDF/DOC/DOCX/XLS/XLSX, maks 10 MB)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              className="text-sm"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
            />
            {form.nama_file && (
              <p className="mt-1 text-xs text-gray-500">
                Terunggah: {form.nama_file} ({fmtSize(form.ukuran_bytes ?? 0)})
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2">
              {busy ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-gray-300 text-sm px-4 py-2">
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-800 text-white text-left">
              <th className="px-4 py-3 font-medium">Judul</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">Ukuran</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Belum ada dokumen.</td></tr>
            )}
            {rows.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium text-gray-800">{d.judul}</td>
                <td className="px-4 py-3 capitalize">{d.kategori}</td>
                <td className="px-4 py-3">
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-navy-600 hover:underline">
                    {d.nama_file}
                  </a>
                </td>
                <td className="px-4 py-3">{fmtSize(d.ukuran_bytes)}</td>
                <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                  <button onClick={() => setForm(d)} className="text-navy-600 hover:underline">Edit</button>
                  <button onClick={() => remove(d)} className="text-red-600 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
