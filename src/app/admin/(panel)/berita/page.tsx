'use client';

import { useEffect, useState } from 'react';

type Berita = {
  id: string;
  judul: string;
  slug: string;
  kategori: 'berita' | 'pengumuman' | 'agenda';
  ringkasan: string;
  konten: string;
  gambar_url: string | null;
  tanggal: string;
  published: boolean;
};

const KATEGORI = [
  { value: 'berita', label: 'Berita' },
  { value: 'pengumuman', label: 'Pengumuman' },
  { value: 'agenda', label: 'Agenda' },
];

const emptyForm = (): Partial<Berita> => ({
  judul: '',
  kategori: 'berita',
  ringkasan: '',
  konten: '',
  gambar_url: null,
  tanggal: new Date().toISOString().slice(0, 10),
  published: false,
});

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:ring-2 focus:ring-navy-800/20 outline-none';

export default function BeritaAdminPage() {
  const [rows, setRows] = useState<Berita[]>([]);
  const [form, setForm] = useState<Partial<Berita> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/berita?all=1');
    setRows(res.ok ? await res.json() : []);
  }
  useEffect(() => { load(); }, []);

  function set<K extends keyof Berita>(k: K, v: Berita[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadGambar(file: File) {
    setBusy(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bucket', 'gambar');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || 'Gagal mengunggah gambar.'); return; }
    set('gambar_url', json.url);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError('');
    const payload = {
      judul: form.judul,
      kategori: form.kategori,
      ringkasan: form.ringkasan ?? '',
      konten: form.konten ?? '',
      gambar_url: form.gambar_url ?? null,
      tanggal: form.tanggal,
      published: !!form.published,
    };
    const res = await fetch(form.id ? `/api/berita/${form.id}` : '/api/berita', {
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

  async function togglePublish(b: Berita) {
    await fetch(`/api/berita/${b.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !b.published }),
    });
    load();
  }

  async function remove(b: Berita) {
    if (!confirm(`Hapus "${b.judul}"?`)) return;
    await fetch(`/api/berita/${b.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy-800">Berita &amp; Agenda</h1>
        <button
          onClick={() => setForm(emptyForm())}
          className="rounded-lg bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-4 py-2"
        >
          + Tulis Baru
        </button>
      </div>

      {form && (
        <form onSubmit={save} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-bold text-navy-800">{form.id ? 'Edit' : 'Tulis'} Berita</h2>
          {error && <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</p>}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Judul</label>
              <input className={inputCls} value={form.judul ?? ''} onChange={(e) => set('judul', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategori</label>
              <select className={inputCls} value={form.kategori} onChange={(e) => set('kategori', e.target.value as Berita['kategori'])}>
                {KATEGORI.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tanggal</label>
              <input type="date" className={inputCls} value={form.tanggal ?? ''} onChange={(e) => set('tanggal', e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Gambar (opsional, maks 3 MB)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="text-sm"
                onChange={(e) => e.target.files?.[0] && uploadGambar(e.target.files[0])}
              />
              {form.gambar_url && (
                <img src={form.gambar_url} alt="Pratinjau" className="mt-2 h-20 rounded-lg object-cover" />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ringkasan</label>
            <input className={inputCls} value={form.ringkasan ?? ''} onChange={(e) => set('ringkasan', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Konten (markdown sederhana: `## Judul`, `**tebal**`, `- daftar`)
            </label>
            <textarea rows={10} className={inputCls} value={form.konten ?? ''} onChange={(e) => set('konten', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.published} onChange={(e) => set('published', e.target.checked)} />
            Publikasikan sekarang
          </label>
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
              <th className="px-4 py-3 font-medium">Tanggal</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Belum ada berita.</td></tr>
            )}
            {rows.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium text-gray-800">{b.judul}</td>
                <td className="px-4 py-3 capitalize">{b.kategori}</td>
                <td className="px-4 py-3">{new Date(b.tanggal + 'T00:00:00').toLocaleDateString('id-ID')}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => togglePublish(b)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      b.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {b.published ? 'Tayang' : 'Draf'}
                  </button>
                </td>
                <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                  <button onClick={() => setForm(b)} className="text-navy-600 hover:underline">Edit</button>
                  <button onClick={() => remove(b)} className="text-red-600 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
