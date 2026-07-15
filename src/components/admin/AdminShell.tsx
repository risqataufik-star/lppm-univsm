'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import { MenuIcon } from './icons';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:flex bg-gray-100">
      {/* Sidebar desktop (fixed) */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="fixed inset-y-0 left-0 w-64">
          <Sidebar />
        </div>
      </aside>

      {/* Drawer mobile — hanya dirender saat terbuka */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="admin-overlay-in absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="admin-drawer-in absolute inset-y-0 left-0 w-72 max-w-[80%] shadow-2xl">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Kolom konten */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar mobile */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-navy-900 text-white shadow-sm">
          <button
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/assets/img/logo-color.png" alt="" className="h-7 w-7 object-contain" />
            <span className="font-semibold text-sm">Admin LPPM</span>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-6 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
