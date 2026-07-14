import { makeListRoutes } from '@/lib/crud';
import { pkmSchema } from '@/lib/validation';

const routes = makeListRoutes({
  table: 'pkm',
  schema: pkmSchema,
  filters: ['status', 'tahun'],
  orderBy: { column: 'tahun', ascending: false },
});

export const GET = routes.GET;
export const POST = routes.POST;
