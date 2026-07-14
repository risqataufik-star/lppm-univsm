import { makeListRoutes } from '@/lib/crud';
import { publikasiSchema } from '@/lib/validation';

const routes = makeListRoutes({
  table: 'publikasi',
  schema: publikasiSchema,
  filters: ['jenis', 'tahun'],
  orderBy: { column: 'tahun', ascending: false },
});

export const GET = routes.GET;
export const POST = routes.POST;
