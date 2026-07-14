// Slug unik: bentuk dasar dari judul + sufiks waktu base36 agar tidak perlu cek duplikat.
export function slugify(judul: string): string {
  const base = judul
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 80);
  return `${base || 'berita'}-${Date.now().toString(36)}`;
}
