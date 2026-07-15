'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ShieldCheckIcon } from '@/components/admin/icons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
    <div className="min-h-dvh grid lg:grid-cols-2">
      {/* Panel brand (kiri di desktop, header ringkas di mobile) */}
      <div className="bg-brand-gradient relative overflow-hidden flex flex-col justify-between p-8 lg:p-12 text-white">
        {/* Ornamen dekoratif */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-navy-500/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <img
            src="/assets/img/logo-color.png"
            alt="Logo Universitas Sapta Mandiri"
            className="h-11 w-11 object-contain drop-shadow"
          />
          <div className="leading-tight">
            <p className="font-bold tracking-wide">LPPM UnivSM</p>
            <p className="text-gold-300 text-[11px] font-medium tracking-widest uppercase">
              Universitas Sapta Mandiri
            </p>
          </div>
        </div>

        <div className="relative hidden lg:block max-w-md">
          <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight">
            Panel Admin<br />
            <span className="text-gold-400">Pengelolaan Konten</span>
          </h1>
          <p className="mt-4 text-white/70 leading-relaxed">
            Kelola berita, dokumen, data penelitian &amp; pengabdian, publikasi, serta
            pesan masuk situs LPPM dari satu tempat.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-white/60 text-xs">
          <ShieldCheckIcon className="w-4 h-4 text-gold-400" />
          <span>Akses terbatas untuk pengelola resmi LPPM.</span>
        </div>
      </div>

      {/* Panel form */}
      <div className="flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-navy-800">Selamat datang kembali</h2>
            <p className="text-sm text-gray-500 mt-1">Masuk untuk melanjutkan ke panel admin.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5"
              >
                {error}
              </p>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <MailIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="nama@univsm.ac.id"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 py-2.5 text-sm outline-none transition focus:border-navy-800 focus:ring-2 focus:ring-navy-800/15"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <LockIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-11 py-2.5 text-sm outline-none transition focus:border-navy-800 focus:ring-2 focus:ring-navy-800/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                >
                  {showPw ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

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
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} LPPM Universitas Sapta Mandiri
          </p>
        </div>
      </div>
    </div>
  );
}
