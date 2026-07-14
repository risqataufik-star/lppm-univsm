import { makeItemRoutes } from '@/lib/crud';
import { pkmSchema } from '@/lib/validation';

const item = makeItemRoutes({ table: 'pkm', schema: pkmSchema });
export const PUT = item.PUT;
export const DELETE = item.DELETE;
