'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from './LogoutButton';
import {
  DashboardIcon,
  NewsIcon,
  DocIcon,
  ResearchIcon,
  CommunityIcon,
  PublicationIcon,
  MessageIcon,
  SettingsIcon,
  ChartIcon,
} from './icons';

const items = [
  { href: '/admin', label: 'Dashboard', Icon: DashboardIcon },
  { href: '/admin/berita', label: 'Berita & Agenda', Icon: NewsIcon },
  { href: '/admin/dokumen', label: 'Dokumen', Icon: DocIcon },
  { href: '/admin/penelitian', label: 'Penelitian', Icon: ResearchIcon },
  { href: '/admin/pkm', label: 'PkM', Icon: CommunityIcon },
  { href: '/admin/publikasi', label: 'Publikasi', Icon: PublicationIcon },
  { href: '/admin/monev-ojs', label: 'Monev OJS', Icon: ChartIcon },
  { href: '/admin/pesan', label: 'Pesan Masuk', Icon: MessageIcon },
  { href: '/admin/pengaturan', label: 'Pengaturan', Icon: SettingsIcon },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <div className="h-full flex flex-col bg-navy-900 text-white">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 shrink-0">
        <img
          src="/assets/img/logo-color.png"
          alt="Logo UnivSM"
          className="h-9 w-9 object-contain"
        />
        <div className="leading-tight">
          <p className="font-bold text-sm">Admin LPPM</p>
          <p className="text-gold-400 text-[10px] tracking-widest uppercase">Universitas Sapta Mandiri</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {items.map(({ href, label, Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active
                  ? 'bg-gold-500 text-navy-900 font-semibold shadow-sm'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${active ? 'text-navy-900' : 'text-white/60 group-hover:text-white'}`}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 shrink-0">
        <LogoutButton />
      </div>
    </div>
  );
}
