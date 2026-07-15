'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Alert, cardCls, inputCls, labelCls, btnPrimary } from '@/components/admin/ui';
import { SettingsIcon } from '@/components/admin/icons';

const STATS = [
  { key: 'stat_penelitian', label: 'Penelitian Aktif' },
  { key: 'stat_pkm', label: 'Kegiatan PkM' },
  { key: 'stat_publikasi', label: 'Publikasi' },
  { key: 'stat_hki', label: 'HKI Terdaftar' },
  { key: 'stat_mitra', label: 'Mitra Aktif' },
];

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
      <PageHeader
        icon={<SettingsIcon className="w-6 h-6" />}
        title="Pengaturan"
        subtitle="Angka statistik yang tampil di beranda situs publik."
      />
      <form onSubmit={save} className={`${cardCls} p-6 space-y-4`}>
        {msg && <Alert kind="success">{msg}</Alert>}
        {error && <Alert kind="error">{error}</Alert>}
        <div className="grid sm:grid-cols-2 gap-4">
          {STATS.map((s) => (
            <div key={s.key}>
              <label className={labelCls}>{s.label}</label>
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
        </div>
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </form>
    </div>
  );
}
