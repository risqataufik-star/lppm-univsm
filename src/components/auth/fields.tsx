'use client';

import { useState } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon } from '@/components/admin/icons';

const fieldCls =
  'w-full rounded-xl border border-gray-300 bg-white py-2.5 text-sm outline-none transition focus:border-navy-800 focus:ring-2 focus:ring-navy-800/15';

export function IconInput({
  id,
  label,
  icon,
  ...rest
}: { id: string; label: string; icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        <input id={id} name={id} {...rest} className={`${fieldCls} pl-10 pr-3`} />
      </div>
    </div>
  );
}

export function PasswordInput({
  id,
  label,
  ...rest
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [lihat, setLihat] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <LockIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id={id}
          name={id}
          {...rest}
          type={lihat ? 'text' : 'password'}
          className={`${fieldCls} pl-10 pr-11`}
        />
        <button
          type="button"
          onClick={() => setLihat((v) => !v)}
          aria-label={lihat ? 'Sembunyikan password' : 'Tampilkan password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
        >
          {lihat ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

export function TombolKirim({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-xl bg-navy-800 hover:bg-navy-700 active:bg-navy-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 text-sm shadow-lg shadow-navy-800/20 transition flex items-center justify-center gap-2 cursor-pointer"
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
        </svg>
      )}
      {loading ? 'Memproses...' : label}
    </button>
  );
}

export function PesanGalat({ pesan }: { pesan: string }) {
  if (!pesan) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5">
      {pesan}
    </p>
  );
}
