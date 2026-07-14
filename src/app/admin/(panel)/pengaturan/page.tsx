'use client';

import { useEffect, useState } from 'react';

const STATS = [
  { key: 'stat_penelitian', label: 'Penelitian Aktif' },
  { key: 'stat_pkm', label: 'Kegiatan PkM' },
  { key: 'stat_publikasi', label: 'Publikasi' },
  { key: 'stat_hki', label: 'HKI Terdaftar' },
  { key: 'stat_mitra', label: 'Mitra Aktif' },
];

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:ring-2 focus:ring-navy-800/20 outline-none';

export default function PengaturanAdminPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/pengaturan')
      .then((r) => r.json())
      .then(setValues)
      .catch(() => setError('Gagal memuat pengaturan.'));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setError('');
    const res = await fetch('/api/pengaturan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || 'Gagal menyimpan.'); return; }
    setMsg('Pengaturan tersimpan.');
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-navy-800 mb-2">Pengaturan</h1>
      <p className="text-sm text-gray-500 mb-6">Angka statistik yang tampil di beranda situs publik.</p>
      <form onSubmit={save} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        {msg && <p className="rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">{msg}</p>}
        {error && <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</p>}
        {STATS.map((s) => (
          <div key={s.key}>
            <label className="block text-sm font-medium mb-1">{s.label}</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={values[s.key] ?? ''}
              onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
              required
            />
          </div>
        ))}
        <button type="submit" disabled={busy} className="rounded-lg bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2">
          {busy ? 'Menyimpan...' : 'Simpan'}
        </button>
      </form>
    </div>
  );
}
