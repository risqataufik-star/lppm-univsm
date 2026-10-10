'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/admin/LogoutButton';

const MENU = [
  { href: '/dosen', label: 'Pengajuan Saya' },
  { href: '/dosen/ajukan', label: 'Ajukan Baru' },
];

export default function DosenShell({
  nama,
  aktif,
  children,
}: {
  nama: string;
  aktif: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname();
  return (
    <div className="min-h-dvh bg-gray-100">
      <header className="bg-navy-900 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 shrink-0">
            <img src="/assets/img/logo-color.png" alt="Logo UnivSM" className="h-8 w-8 object-contain" />
            <span className="font-bold text-sm hidden sm:inline">Layanan Dosen LPPM</span>
          </a>
          {aktif && (
            <nav className="flex items-center gap-1 text-sm">
              {MENU.map((m) => {
                const on =
                  m.href === '/dosen'
                    ? path === '/dosen' || path.startsWith('/dosen/pengajuan')
                    : path.startsWith(m.href);
                return (
                  <Link
                    key={m.href}
                    href={m.href}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      on ? 'bg-gold-500 text-navy-900 font-semibold' : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {m.label}
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden md:inline text-xs text-white/70 truncate max-w-48">{nama}</span>
            <LogoutButton
              redirectTo="/dosen/login"
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
            />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
