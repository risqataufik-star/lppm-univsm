'use client';

import { useEffect, useState } from 'react';

type Pesan = {
  id: string;
  nama: string;
  email: string;
  telepon: string;
  jenis: 'kontak' | 'konsultasi' | 'kerjasama';
  subjek: string;
  isi: string;
  status: 'baru' | 'dibaca' | 'selesai';
  created_at: string;
};

const STATUS_CLS: Record<Pesan['status'], string> = {
  baru: 'bg-amber-100 text-amber-700',
  dibaca: 'bg-blue-100 text-blue-700',
  selesai: 'bg-green-100 text-green-700',
};

export default function PesanAdminPage() {
  const [rows, setRows] = useState<Pesan[]>([]);
  const [selected, setSelected] = useState<Pesan | null>(null);

  async function load() {
    const res = await fetch('/api/pesan');
    setRows(res.ok ? await res.json() : []);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(p: Pesan, status: Pesan['status']) {
    await fetch(`/api/pesan/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSelected((s) => (s && s.id === p.id ? { ...s, status } : s));
    load();
  }

  async function open(p: Pesan) {
    setSelected(p);
    if (p.status === 'baru') setStatus(p, 'dibaca');
  }

  async function remove(p: Pesan) {
    if (!confirm(`Hapus pesan dari ${p.nama}?`)) return;
    await fetch(`/api/pesan/${p.id}`, { method: 'DELETE' });
    setSelected(null);
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800 mb-6">Pesan Masuk</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {!rows.length && <p className="px-4 py-8 text-center text-gray-400 text-sm">Belum ada pesan.</p>}
          {rows.map((p) => (
            <button
              key={p.id}
              onClick={() => open(p)}
              className={`w-full text-left px-4 py-3 hover:bg-navy-50 ${selected?.id === p.id ? 'bg-navy-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-gray-800">{p.nama}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[p.status]}`}>
                  {p.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="capitalize">{p.jenis}</span> · {p.subjek || '(tanpa subjek)'} ·{' '}
                {new Date(p.created_at).toLocaleDateString('id-ID')}
              </p>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {!selected ? (
            <p className="text-gray-400 text-sm">Pilih pesan untuk membaca.</p>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-bold text-navy-800">{selected.subjek || '(tanpa subjek)'}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selected.nama} &lt;{selected.email}&gt;
                    {selected.telepon && ` · ${selected.telepon}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(selected.created_at).toLocaleString('id-ID')} · <span className="capitalize">{selected.jenis}</span>
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[selected.status]}`}>
                  {selected.status}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap border-t border-gray-100 pt-4 mb-6">
                {selected.isi}
              </p>
              <div className="flex gap-2">
                {selected.status !== 'selesai' && (
                  <button
                    onClick={() => setStatus(selected, 'selesai')}
                    className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2"
                  >
                    Tandai Selesai
                  </button>
                )}
                <a
                  href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subjek || 'Pesan Anda ke LPPM UnivSM')}`}
                  className="rounded-lg border border-gray-300 text-sm px-4 py-2"
                >
                  Balas via Email
                </a>
                <button onClick={() => remove(selected)} className="rounded-lg border border-red-300 text-red-600 text-sm px-4 py-2">
                  Hapus
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
