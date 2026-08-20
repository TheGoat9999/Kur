import { Router } from 'express';
import { ItemCatalogResponseSchema, ItemCategorySchema } from '@sol-dorado/contracts/items';
import { findItems } from '../domain/items/index.js';

export function itemRoutes() {
  const router = Router();

  router.get('/v1/items/catalog', (request, response) => {
    const rawCategory = typeof request.query.category === 'string' ? request.query.category : undefined;
    const rawSearch = typeof request.query.search === 'string' ? request.query.search : undefined;

    const category = rawCategory ? ItemCategorySchema.safeParse(rawCategory) : undefined;
    if (category && !category.success) {
      return response.status(400).json({ error: 'invalid_item_category' });
    }

    const items = findItems({
      ...(category?.success ? { category: category.data } : {}),
      ...(rawSearch ? { search: rawSearch } : {})
    });

    response.json(ItemCatalogResponseSchema.parse({ total: items.length, items }));
  });

  return router;
}
