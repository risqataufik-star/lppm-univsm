'use client';

import ResourceCrud from '@/components/admin/ResourceCrud';

const JENIS = [
  { value: 'artikel', label: 'Artikel Jurnal' },
  { value: 'buku', label: 'Buku' },
  { value: 'hki', label: 'HKI' },
  { value: 'inovasi', label: 'Produk Inovasi' },
];

export default function PublikasiAdminPage() {
  return (
    <ResourceCrud
      resource="publikasi"
      title="Publikasi & Luaran"
      fields={[
        { name: 'judul', label: 'Judul', type: 'text', required: true },
        { name: 'penulis', label: 'Penulis', type: 'text', required: true },
        { name: 'jenis', label: 'Jenis', type: 'select', options: JENIS, required: true },
        { name: 'penerbit', label: 'Jurnal / Penerbit / No. HKI', type: 'text' },
        { name: 'tahun', label: 'Tahun', type: 'number', required: true },
        { name: 'tautan', label: 'Tautan (URL)', type: 'text' },
        { name: 'indeksasi', label: 'Indeksasi (Sinta/Scopus/dll)', type: 'text' },
      ]}
      columns={[
        { key: 'judul', label: 'Judul' },
        { key: 'penulis', label: 'Penulis' },
        { key: 'jenis', label: 'Jenis' },
        { key: 'tahun', label: 'Tahun' },
      ]}
    />
  );
}
