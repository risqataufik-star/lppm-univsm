'use client';

import ResourceCrud from '@/components/admin/ResourceCrud';
import { ResearchIcon } from '@/components/admin/icons';

const STATUS = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'proses', label: 'Proses' },
  { value: 'selesai', label: 'Selesai' },
];

export default function PenelitianAdminPage() {
  return (
    <ResourceCrud
      resource="penelitian"
      title="Penelitian"
      subtitle="Daftar kegiatan penelitian dosen."
      icon={<ResearchIcon className="w-6 h-6" />}
      fields={[
        { name: 'judul', label: 'Judul', type: 'text', required: true },
        { name: 'ketua', label: 'Ketua', type: 'text', required: true },
        { name: 'anggota', label: 'Anggota', type: 'textarea' },
        { name: 'skema', label: 'Skema', type: 'text' },
        { name: 'tahun', label: 'Tahun', type: 'number', required: true },
        { name: 'sumber_dana', label: 'Sumber Dana', type: 'text' },
        { name: 'status', label: 'Status', type: 'select', options: STATUS, required: true },
      ]}
      columns={[
        { key: 'judul', label: 'Judul' },
        { key: 'ketua', label: 'Ketua' },
        { key: 'tahun', label: 'Tahun' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
