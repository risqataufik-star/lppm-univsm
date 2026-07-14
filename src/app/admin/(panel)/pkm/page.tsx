'use client';

import ResourceCrud from '@/components/admin/ResourceCrud';

const STATUS = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'proses', label: 'Proses' },
  { value: 'selesai', label: 'Selesai' },
];

export default function PkmAdminPage() {
  return (
    <ResourceCrud
      resource="pkm"
      title="Pengabdian kepada Masyarakat"
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
