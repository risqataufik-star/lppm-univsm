import { makeListRoutes } from '@/lib/crud';
import { penelitianSchema } from '@/lib/validation';

const routes = makeListRoutes({
  table: 'penelitian',
  schema: penelitianSchema,
  filters: ['status', 'tahun'],
  orderBy: { column: 'tahun', ascending: false },
});

export const GET = routes.GET;
export const POST = routes.POST;
