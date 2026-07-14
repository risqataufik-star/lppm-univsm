'use client';

import { useCallback, useEffect, useState } from 'react';

export type Field = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select';
  options?: { value: string; label: string }[];
  required?: boolean;
};

export type Column = { key: string; label: string };

type Row = Record<string, unknown> & { id: string };

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:ring-2 focus:ring-navy-800/20 outline-none';

export default function ResourceCrud({
  resource,
  title,
  fields,
  columns,
}: {
  resource: string;
  title: string;
  fields: Field[];
  columns: Column[];
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/${resource}`);
    setRows(res.ok ? await res.json() : []);
  }, [resource]);
  useEffect(() => { load(); }, [load]);

  function openNew() {
    const init: Record<string, unknown> = {};
    for (const f of fields) init[f.name] = f.type === 'select' ? f.options?.[0]?.value ?? '' : '';
    setForm(init);
    setError('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError('');
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      payload[f.name] = f.type === 'number' ? Number(form[f.name] ?? 0) : form[f.name] ?? '';
    }
    const id = form.id as string | undefined;
    const res = await fetch(id ? `/api/${resource}/${id}` : `/api/${resource}`, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || 'Gagal menyimpan.'); return; }
    setForm(null);
    load();
  }

  async function remove(row: Row) {
    if (!confirm('Hapus data ini?')) return;
    await fetch(`/api/${resource}/${row.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy-800">{title}</h1>
        <button onClick={openNew} className="rounded-lg bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-4 py-2">
          + Tambah
        </button>
      </div>

      {form && (
        <form onSubmit={save} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-bold text-navy-800">{form.id ? 'Edit' : 'Tambah'} {title}</h2>
          {error && <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.name} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="block text-sm font-medium mb-1">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    className={inputCls}
                    value={String(form[f.name] ?? '')}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  >
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    className={inputCls}
                    value={String(form[f.name] ?? '')}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                ) : (
                  <input
                    type={f.type}
                    className={inputCls}
                    value={String(form[f.name] ?? '')}
                    required={f.required}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                )}
              </div>
            ))}
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
              {columns.map((c) => <th key={c.key} className="px-4 py-3 font-medium">{c.label}</th>)}
              <th className="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && (
              <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400">Belum ada data.</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-gray-800">{String(row[c.key] ?? '')}</td>
                ))}
                <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                  <button onClick={() => { setForm(row); setError(''); }} className="text-navy-600 hover:underline">Edit</button>
                  <button onClick={() => remove(row)} className="text-red-600 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
