'use client';

import { useEffect, useState } from 'react';
import { PageHeader, cardCls, btnSuccess, btnGhost, btnDangerOutline } from '@/components/admin/ui';
import { MessageIcon, CheckIcon, ReplyIcon, TrashIcon } from '@/components/admin/icons';

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
  selesai: 'bg-emerald-100 text-emerald-700',
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
    <div className="max-w-6xl">
      <PageHeader
        icon={<MessageIcon className="w-6 h-6" />}
        title="Pesan Masuk"
        subtitle="Pesan dari form kontak, konsultasi, dan kerja sama."
      />

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Daftar pesan */}
        <div className={`${cardCls} divide-y divide-gray-100 overflow-hidden`}>
          {!rows.length && (
            <div className="text-center py-14 px-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                <MessageIcon className="w-6 h-6" />
              </div>
              <p className="text-sm text-gray-400">Belum ada pesan.</p>
            </div>
          )}
          {rows.map((p) => (
            <button
              key={p.id}
              onClick={() => open(p)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer ${
                selected?.id === p.id ? 'bg-navy-50' : 'hover:bg-gray-50'
              }`}
            >
              <span className="w-9 h-9 shrink-0 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-sm font-semibold">
                {p.nama?.charAt(0).toUpperCase() || '?'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm text-gray-800 truncate ${p.status === 'baru' ? 'font-bold' : ''}`}>
                    {p.nama}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${STATUS_CLS[p.status]}`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  <span className="capitalize">{p.jenis}</span> · {p.subjek || '(tanpa subjek)'}
                </p>
              </div>
              <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                {new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </span>
            </button>
          ))}
        </div>

        {/* Detail pesan */}
        <div className={`${cardCls} p-6 lg:sticky lg:top-6`}>
          {!selected ? (
            <div className="text-center py-14">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                <ReplyIcon className="w-6 h-6" />
              </div>
              <p className="text-gray-400 text-sm">Pilih pesan untuk membaca.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h2 className="font-bold text-navy-800">{selected.subjek || '(tanpa subjek)'}</h2>
                  <p className="text-sm text-gray-500 mt-1 break-words">
                    {selected.nama} &lt;{selected.email}&gt;
                    {selected.telepon && ` · ${selected.telepon}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(selected.created_at).toLocaleString('id-ID')} · <span className="capitalize">{selected.jenis}</span>
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${STATUS_CLS[selected.status]}`}>
                  {selected.status}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap border-t border-gray-100 pt-4 mb-6 leading-relaxed">
                {selected.isi}
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.status !== 'selesai' && (
                  <button onClick={() => setStatus(selected, 'selesai')} className={btnSuccess}>
                    <CheckIcon className="w-4 h-4" /> Tandai Selesai
                  </button>
                )}
                <a
                  href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subjek || 'Pesan Anda ke LPPM UnivSM')}`}
                  className={btnGhost}
                >
                  <ReplyIcon className="w-4 h-4" /> Balas via Email
                </a>
                <button onClick={() => remove(selected)} className={btnDangerOutline}>
                  <TrashIcon className="w-4 h-4" /> Hapus
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
