import { makeListRoutes } from '@/lib/crud';
import { dokumenSchema } from '@/lib/validation';

const routes = makeListRoutes({
  table: 'dokumen',
  schema: dokumenSchema,
  filters: ['kategori'],
});

export const GET = routes.GET;
export const POST = routes.POST;
