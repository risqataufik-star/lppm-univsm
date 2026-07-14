'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from './LogoutButton';

const items = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/berita', label: 'Berita & Agenda' },
  { href: '/admin/dokumen', label: 'Dokumen' },
  { href: '/admin/penelitian', label: 'Penelitian' },
  { href: '/admin/pkm', label: 'PkM' },
  { href: '/admin/publikasi', label: 'Publikasi' },
  { href: '/admin/pesan', label: 'Pesan Masuk' },
  { href: '/admin/pengaturan', label: 'Pengaturan' },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 shrink-0 bg-navy-900 text-white min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-white/10">
        <p className="font-bold">Admin LPPM</p>
        <p className="text-gold-400 text-xs">Universitas Sapta Mandiri</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`block px-3 py-2 rounded-lg text-sm ${
              path === it.href
                ? 'bg-gold-500 text-navy-900 font-semibold'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            {it.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <LogoutButton />
      </div>
    </aside>
  );
}
