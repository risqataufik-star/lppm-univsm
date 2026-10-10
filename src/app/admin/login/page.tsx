'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import AuthLayout from '@/components/auth/AuthLayout';
import { IconInput, PasswordInput, TombolKirim, PesanGalat } from '@/components/auth/fields';
import { MailIcon } from '@/components/admin/icons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('e') === 'akses') {
      setError('Akun Anda tidak memiliki akses ke panel admin.');
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Email atau password salah.');
      setLoading(false);
      return;
    }
    const res = await fetch('/api/profil/saya', { cache: 'no-store' });
    const profil = res.ok ? await res.json() : null;
    if (!profil || profil.peran !== 'admin' || profil.status !== 'aktif') {
      await sb.auth.signOut();
      setError(
        profil?.peran === 'dosen'
          ? 'Ini akun dosen. Silakan masuk lewat halaman Layanan Dosen.'
          : 'Akun ini bukan akun admin LPPM.',
      );
      setLoading(false);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <AuthLayout
      judul="Panel Admin"
      sorotan="Pengelolaan Konten"
      deskripsi="Kelola berita, dokumen, data penelitian & pengabdian, publikasi, pengajuan dosen, serta pesan masuk situs LPPM dari satu tempat."
      catatan="Akses terbatas untuk pengelola resmi LPPM."
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-navy-800">Selamat datang kembali</h2>
        <p className="text-sm text-gray-500 mt-1">Masuk untuk melanjutkan ke panel admin.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <PesanGalat pesan={error} />
        <IconInput
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="nama@univsm.ac.id"
          icon={<MailIcon className="w-5 h-5" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordInput
          id="password"
          label="Password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TombolKirim loading={loading} label="Masuk" />
      </form>
    </AuthLayout>
  );
}
