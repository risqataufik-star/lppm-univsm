import { makeItemRoutes } from '@/lib/crud';
import { penelitianSchema } from '@/lib/validation';

const item = makeItemRoutes({ table: 'penelitian', schema: penelitianSchema });
export const PUT = item.PUT;
export const DELETE = item.DELETE;
