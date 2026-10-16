'use client';

import Link from 'next/link';
import { useState } from 'react';
import AuthLayout from '@/components/auth/AuthLayout';
import { PasswordInput, TombolKirim, PesanGalat } from '@/components/auth/fields';
import { inputCls, labelCls } from '@/components/admin/ui';

const KOSONG = { nama: '', email: '', nidn: '', prodi: '', no_hp: '', password: '', ulang: '', website: '' };
type Isian = typeof KOSONG;

export default function DaftarDosenPage() {
  const [f, setF] = useState<Isian>(KOSONG);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selesai, setSelesai] = useState(false);

  const ubah = (k: keyof Isian) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (f.password !== f.ulang) {
      setError('Konfirmasi password tidak sama.');
      return;
    }
    setLoading(true);
    const { nama, email, nidn, prodi, no_hp, password, website } = f;
    const res = await fetch('/api/dosen/daftar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, email, nidn, prodi, no_hp, password, website }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error || 'Pendaftaran gagal.');
      return;
    }
    setSelesai(true);
  }

  return (
    <AuthLayout
      judul="Layanan Dosen"
      sorotan="Pendaftaran Akun"
      deskripsi="Daftarkan akun Anda. Setelah diverifikasi LPPM, Anda dapat mengajukan penelitian, PkM, dan publikasi secara daring."
      catatan="Akun diaktifkan setelah verifikasi data oleh LPPM."
      lebar="max-w-md"
    >
      {selesai ? (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-navy-800">Pendaftaran terkirim</h2>
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">
            Akun Anda akan aktif setelah diverifikasi LPPM. Anda sudah bisa masuk untuk melihat status verifikasi.
          </p>
          <Link href="/dosen/login" className="inline-block mt-6 font-semibold text-navy-700 hover:underline">
            Ke halaman masuk →
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-navy-800">Daftar Akun Dosen</h2>
            <p className="text-sm text-gray-500 mt-1">Lengkapi data sesuai identitas dosen Anda.</p>
          </div>
          <form method="post" onSubmit={kirim} className="space-y-4">
            <PesanGalat pesan={error} />
            <div>
              <label htmlFor="nama" className={labelCls}>Nama Lengkap & Gelar</label>
              <input id="nama" required value={f.nama} onChange={ubah('nama')} className={inputCls} />
            </div>
            <div>
              <label htmlFor="email" className={labelCls}>Email</label>
              <input id="email" type="email" autoComplete="email" required value={f.email} onChange={ubah('email')} placeholder="nama@univsm.ac.id" className={inputCls} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nidn" className={labelCls}>NIDN / NIDK</label>
                <input id="nidn" inputMode="numeric" required value={f.nidn} onChange={ubah('nidn')} className={inputCls} />
              </div>
              <div>
                <label htmlFor="no_hp" className={labelCls}>No. HP / WhatsApp</label>
                <input id="no_hp" type="tel" required value={f.no_hp} onChange={ubah('no_hp')} className={inputCls} />
              </div>
            </div>
            <div>
              <label htmlFor="prodi" className={labelCls}>Program Studi</label>
              <input id="prodi" required value={f.prodi} onChange={ubah('prodi')} className={inputCls} />
            </div>
            <PasswordInput id="password" label="Password (min. 8 karakter)" autoComplete="new-password" required minLength={8} value={f.password} onChange={ubah('password')} />
            <PasswordInput id="ulang" label="Ulangi Password" autoComplete="new-password" required value={f.ulang} onChange={ubah('ulang')} />
            <input type="text" name="website" value={f.website} onChange={ubah('website')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <TombolKirim loading={loading} label="Daftar" />
          </form>
          <p className="mt-6 text-sm text-gray-600 text-center">
            Sudah punya akun?{' '}
            <Link href="/dosen/login" className="font-semibold text-navy-700 hover:underline">Masuk</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
