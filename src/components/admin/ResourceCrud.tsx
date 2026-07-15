'use client';

import { useCallback, useEffect, useState } from 'react';
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
} from './ui';
import { PlusIcon, EditIcon, TrashIcon } from './icons';

export type Field = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select';
  options?: { value: string; label: string }[];
  required?: boolean;
};

export type Column = { key: string; label: string };

type Row = Record<string, unknown> & { id: string };

export default function ResourceCrud({
  resource,
  title,
  subtitle,
  icon,
  fields,
  columns,
}: {
  resource: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
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
    <div className="max-w-6xl">
      <PageHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        action={
          <button onClick={openNew} className={btnPrimary}>
            <PlusIcon className="w-4 h-4" /> Tambah
          </button>
        }
      />

      {form && (
        <form onSubmit={save} className={`${cardCls} p-6 mb-6 space-y-4`}>
          <h2 className="font-bold text-navy-800">{form.id ? 'Edit' : 'Tambah'} {title}</h2>
          {error && <Alert kind="error">{error}</Alert>}
          <div className="grid sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.name} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className={labelCls}>{f.label}</label>
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
              {columns.map((c) => <th key={c.key} className={thCls}>{c.label}</th>)}
              <th className={`${thCls} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && (
              <TableEmptyRow colSpan={columns.length + 1} icon={icon} text="Belum ada data." />
            )}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className={tdCls}>{String(row[c.key] ?? '')}</td>
                ))}
                <td className={`${tdCls} whitespace-nowrap text-right`}>
                  <div className="inline-flex gap-1">
                    <button onClick={() => { setForm(row); setError(''); }} className={rowEditBtn}>
                      <EditIcon className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => remove(row)} className={rowDeleteBtn}>
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
