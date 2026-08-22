import { getItemDefinition } from './items/index.js';
import { CORE_JOBS } from './core-registry.js';

export function assertCanonicalBusinessItem(itemKey: string) {
  const item = getItemDefinition(itemKey);
  if (!item) throw new Error('business_item_unknown');
  return item;
}

export function isCanonicalBusinessJob(jobKey: string | null | undefined) {
  if (!jobKey) return true;
  return CORE_JOBS.some(job => job.id === jobKey);
}

export function calculateSaleBreakdown(priceCents: number, quantity: number, salesTaxBasisPoints: number, serviceFeeBasisPoints: number) {
  const subtotalCents = priceCents * quantity;
  const taxCents = Math.round(subtotalCents * salesTaxBasisPoints / 10_000);
  const serviceFeeCents = Math.round(subtotalCents * serviceFeeBasisPoints / 10_000);
  return { subtotalCents, taxCents, serviceFeeCents, totalCents: subtotalCents + taxCents + serviceFeeCents };
}

export function supplierUnitCost(basePriceCents: number, multiplierBasisPoints: number) {
  return Math.max(1, Math.round(basePriceCents * multiplierBasisPoints / 10_000));
}
