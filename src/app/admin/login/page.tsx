'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    if (error) {
      setError('Email atau password salah.');
      setLoading(false);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-xl font-bold text-navy-800">Panel Admin LPPM</h1>
        <p className="text-sm text-gray-500 mb-6">Universitas Sapta Mandiri</p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {error}
          </p>
        )}
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-4 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:ring-2 focus:ring-navy-800/20 outline-none"
        />
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-6 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-800 focus:ring-2 focus:ring-navy-800/20 outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-white font-semibold py-2.5 text-sm"
        >
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
