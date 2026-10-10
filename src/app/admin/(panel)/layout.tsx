import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { getSesi } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sesi = await getSesi();
  if (!sesi) redirect('/admin/login');
  const p = sesi.profil;
  if (!p || p.peran !== 'admin' || p.status !== 'aktif') {
    redirect(p?.peran === 'dosen' ? '/dosen' : '/admin/login?e=akses');
  }
  return <AdminShell>{children}</AdminShell>;
}
