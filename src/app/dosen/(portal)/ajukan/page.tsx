'use client';

import { useRouter } from 'next/navigation';
import PengajuanForm from '@/components/dosen/PengajuanForm';
import { PageHeader } from '@/components/admin/ui';
import { PlusIcon } from '@/components/admin/icons';

export default function AjukanPage() {
  const router = useRouter();
  return (
    <div className="max-w-3xl">
      <PageHeader
        icon={<PlusIcon className="w-6 h-6" />}
        title="Ajukan Penelitian / PkM / Publikasi"
        subtitle="Lengkapi data kegiatan dan unggah proposal dalam format PDF."
      />
      <PengajuanForm
        url="/api/dosen/pengajuan"
        method="POST"
        labelKirim="Kirim Pengajuan"
        fileWajib
        onSelesai={(p) => router.push(`/dosen/pengajuan/${p.id}`)}
      />
    </div>
  );
}
