import { redirect } from 'next/navigation';
import DosenShell from '@/components/dosen/DosenShell';
import { getSesi } from '@/lib/auth';
import { cardCls } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const sesi = await getSesi();
  if (!sesi || !sesi.profil) redirect('/dosen/login');
  const p = sesi.profil;
  if (p.peran === 'admin') redirect('/admin');
  const aktif = p.status === 'aktif';

  return (
    <DosenShell nama={p.nama} aktif={aktif}>
      {aktif ? (
        children
      ) : (
        <div className={`${cardCls} max-w-xl mx-auto p-8 text-center`}>
          <h1 className="text-xl font-bold text-navy-800 mb-2">
            {p.status === 'menunggu' ? 'Akun Menunggu Verifikasi' : 'Akun Tidak Disetujui'}
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            {p.status === 'menunggu'
              ? 'Pendaftaran Anda sudah kami terima. Anda dapat mengajukan penelitian, PkM, dan publikasi setelah akun diverifikasi LPPM.'
              : 'Pendaftaran akun Anda tidak disetujui. Silakan hubungi LPPM untuk informasi lebih lanjut.'}
          </p>
        </div>
      )}
    </DosenShell>
  );
}
