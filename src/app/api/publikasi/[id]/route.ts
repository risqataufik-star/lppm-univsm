import { makeItemRoutes } from '@/lib/crud';
import { publikasiSchema } from '@/lib/validation';

const item = makeItemRoutes({ table: 'publikasi', schema: publikasiSchema });
export const PUT = item.PUT;
export const DELETE = item.DELETE;
