import { makeListRoutes } from '@/lib/crud';
import { beritaSchema } from '@/lib/validation';
import { slugify } from '@/lib/slug';

const routes = makeListRoutes({
  table: 'berita',
  schema: beritaSchema,
  filters: ['kategori'],
  orderBy: { column: 'tanggal', ascending: false },
  publicOnly: { published: true },
  beforeInsert: (row) => ({ ...row, slug: slugify(String(row.judul)) }),
});

export const GET = routes.GET;
export const POST = routes.POST;
