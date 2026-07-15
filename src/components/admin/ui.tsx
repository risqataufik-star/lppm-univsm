/* Primitif UI bersama untuk halaman CRUD admin — menjaga konsistensi & DRY. */

export const inputCls =
  'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-navy-800 focus:ring-2 focus:ring-navy-800/15';

export const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

export const cardCls = 'bg-white rounded-2xl border border-gray-200';

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-navy-800 hover:bg-navy-700 active:bg-navy-900 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 shadow-sm shadow-navy-800/20 transition cursor-pointer';

export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 transition cursor-pointer';

export const btnSuccess =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm shadow-emerald-600/20 transition cursor-pointer';

export const btnDangerOutline =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white hover:bg-red-50 text-red-600 text-sm font-medium px-4 py-2.5 transition cursor-pointer';

// Tabel
export const theadCls = 'bg-navy-800 text-white text-left';
export const thCls = 'px-4 py-3.5 font-semibold text-[11px] uppercase tracking-wider';
export const tdCls = 'px-4 py-3 text-gray-700 align-middle';

// Tombol aksi kecil di baris tabel
export const rowEditBtn =
  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-navy-600 hover:bg-navy-50 transition cursor-pointer';
export const rowDeleteBtn =
  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition cursor-pointer';

export function PageHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-11 h-11 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-navy-800 leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Alert({ kind, children }: { kind: 'error' | 'success'; children: React.ReactNode }) {
  const cls =
    kind === 'error'
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-emerald-50 border-emerald-200 text-emerald-700';
  return (
    <p role="alert" className={`rounded-xl border text-sm px-3.5 py-2.5 ${cls}`}>
      {children}
    </p>
  );
}

export function TableEmptyRow({
  colSpan,
  icon,
  text,
}: {
  colSpan: number;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
          {icon}
        </div>
        <p className="text-sm text-gray-400">{text}</p>
      </td>
    </tr>
  );
}
