import AdminShell from '@/components/admin/AdminShell';
import { requireAdminPage } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();

  const db = supabaseAdmin();
  const [aj, akun] = await Promise.all([
    db.from('pengajuan').select('id', { count: 'exact', head: true }).eq('status', 'diajukan'),
    db.from('profil').select('user_id', { count: 'exact', head: true }).eq('peran', 'dosen').eq('status', 'menunggu'),
  ]);
  return (
    <AdminShell badges={{ pengajuan: aj.count ?? 0, dosen: akun.count ?? 0 }}>{children}</AdminShell>
  );
}
