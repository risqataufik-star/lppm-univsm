'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { btnPrimary } from './ui';

export default function SyncOjsButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const router = useRouter();

  async function sync() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/ojs/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyinkronkan.');
      setMsg(`Berhasil: ${json.jurnal} jurnal, ${json.artikel} artikel.`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal menyinkronkan.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={sync} disabled={busy} className={btnPrimary}>
        {busy ? 'Menyinkronkan…' : 'Sinkronkan dari OJS'}
      </button>
      {msg && <p className="text-xs text-gray-500 max-w-xs text-right">{msg}</p>}
    </div>
  );
}
