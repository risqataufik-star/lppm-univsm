'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';
import { LogoutIcon } from './icons';

export default function LogoutButton() {
  async function handleLogout() {
    await supabaseBrowser().auth.signOut();
    window.location.href = '/admin/login';
  }
  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/75 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
    >
      <LogoutIcon className="w-5 h-5 text-white/60" />
      Keluar
    </button>
  );
}
