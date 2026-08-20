import { z } from 'zod';

export const InventorySplitRequestSchema = z.object({
  itemId: z.uuid(),
  quantity: z.number().int().positive(),
  toSlotIndex: z.number().int().nonnegative().optional()
});

export type InventorySplitRequest = z.infer<typeof InventorySplitRequestSchema>;
