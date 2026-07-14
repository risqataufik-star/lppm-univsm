'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';

export default function LogoutButton() {
  async function handleLogout() {
    await supabaseBrowser().auth.signOut();
    window.location.href = '/admin/login';
  }
  return (
    <button
      onClick={handleLogout}
      className="w-full rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 text-left"
    >
      Keluar
    </button>
  );
}
