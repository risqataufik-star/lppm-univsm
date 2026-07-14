import { makeItemRoutes } from '@/lib/crud';
import { dokumenSchema } from '@/lib/validation';

const item = makeItemRoutes({ table: 'dokumen', schema: dokumenSchema });
export const PUT = item.PUT;
export const DELETE = item.DELETE;
