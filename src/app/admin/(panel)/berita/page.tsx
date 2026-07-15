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
import { NewsIcon, PlusIcon, EditIcon, TrashIcon } from '@/components/admin/icons';

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
    <div className="max-w-6xl">
      <PageHeader
        icon={<NewsIcon className="w-6 h-6" />}
        title="Berita & Agenda"
        subtitle="Kelola berita, pengumuman, dan agenda situs LPPM."
        action={
          <button onClick={() => setForm(emptyForm())} className={btnPrimary}>
            <PlusIcon className="w-4 h-4" /> Tulis Baru
          </button>
        }
      />

      {form && (
        <form onSubmit={save} className={`${cardCls} p-6 mb-6 space-y-4`}>
          <h2 className="font-bold text-navy-800">{form.id ? 'Edit' : 'Tulis'} Berita</h2>
          {error && <Alert kind="error">{error}</Alert>}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Judul</label>
              <input className={inputCls} value={form.judul ?? ''} onChange={(e) => set('judul', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Kategori</label>
              <select className={inputCls} value={form.kategori} onChange={(e) => set('kategori', e.target.value as Berita['kategori'])}>
                {KATEGORI.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Tanggal</label>
              <input type="date" className={inputCls} value={form.tanggal ?? ''} onChange={(e) => set('tanggal', e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Gambar (opsional, maks 3 MB)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-700 hover:file:bg-navy-100 file:cursor-pointer"
                onChange={(e) => e.target.files?.[0] && uploadGambar(e.target.files[0])}
              />
              {form.gambar_url && (
                <img src={form.gambar_url} alt="Pratinjau" className="mt-2 h-20 rounded-lg object-cover border border-gray-200" />
              )}
            </div>
          </div>
          <div>
            <label className={labelCls}>Ringkasan</label>
            <input className={inputCls} value={form.ringkasan ?? ''} onChange={(e) => set('ringkasan', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>
              Konten <span className="font-normal text-gray-400">(markdown sederhana: ## Judul, **tebal**, - daftar)</span>
            </label>
            <textarea rows={10} className={inputCls} value={form.konten ?? ''} onChange={(e) => set('konten', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 rounded accent-navy-800" checked={!!form.published} onChange={(e) => set('published', e.target.checked)} />
            Publikasikan sekarang
          </label>
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
              <th className={thCls}>Tanggal</th>
              <th className={thCls}>Status</th>
              <th className={`${thCls} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && (
              <TableEmptyRow colSpan={5} icon={<NewsIcon className="w-6 h-6" />} text="Belum ada berita." />
            )}
            {rows.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                <td className={`${tdCls} font-medium text-gray-800`}>{b.judul}</td>
                <td className={`${tdCls} capitalize`}>{b.kategori}</td>
                <td className={tdCls}>{new Date(b.tanggal + 'T00:00:00').toLocaleDateString('id-ID')}</td>
                <td className={tdCls}>
                  <button
                    onClick={() => togglePublish(b)}
                    title="Klik untuk mengubah status"
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition cursor-pointer ${
                      b.published
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {b.published ? 'Tayang' : 'Draf'}
                  </button>
                </td>
                <td className={`${tdCls} whitespace-nowrap text-right`}>
                  <div className="inline-flex gap-1">
                    <button onClick={() => setForm(b)} className={rowEditBtn}>
                      <EditIcon className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => remove(b)} className={rowDeleteBtn}>
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
