'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import AuthLayout from '@/components/auth/AuthLayout';
import { IconInput, PasswordInput, TombolKirim, PesanGalat } from '@/components/auth/fields';
import { MailIcon } from '@/components/admin/icons';

export default function LoginDosenPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    if (!profil) {
      await sb.auth.signOut();
      setError('Akun tidak ditemukan. Silakan daftar terlebih dahulu.');
      setLoading(false);
      return;
    }
    router.push(profil.peran === 'admin' ? '/admin' : '/dosen');
    router.refresh();
  }

  return (
    <AuthLayout
      judul="Layanan Dosen"
      sorotan="Pengajuan Penelitian & PkM"
      deskripsi="Ajukan penelitian dan pengabdian kepada masyarakat, pantau statusnya, dan unduh Surat Tugas serta SK langsung dari portal ini."
      catatan="Khusus dosen Universitas Sapta Mandiri."
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-navy-800">Masuk Layanan Dosen</h2>
        <p className="text-sm text-gray-500 mt-1">Gunakan akun yang sudah diverifikasi LPPM.</p>
      </div>
      <form method="post" onSubmit={handleSubmit} className="space-y-5">
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
      <p className="mt-6 text-sm text-gray-600 text-center">
        Belum punya akun?{' '}
        <Link href="/dosen/daftar" className="font-semibold text-navy-700 hover:underline">
          Daftar di sini
        </Link>
      </p>
      <p className="mt-2 text-center">
        <a href="/" className="text-xs text-gray-400 hover:text-gray-600">
          ← Kembali ke situs LPPM
        </a>
      </p>
    </AuthLayout>
  );
}
