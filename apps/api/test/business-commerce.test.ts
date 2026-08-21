import { describe, expect, it } from 'vitest';
import { calculateSaleBreakdown, isCanonicalBusinessJob, supplierUnitCost } from '../src/domain/business-commerce.js';
import { getItemDefinition } from '../src/domain/items/index.js';

describe('business commerce domain', () => {
  it('reuses canonical item keys for business stock and pricing', () => {
    expect(getItemDefinition('water_bottle')?.basePriceCents).toBe(250);
    expect(getItemDefinition('coffee')?.category).toBe('drink');
  });

  it('links staff positions to the canonical jobs registry', () => {
    expect(isCanonicalBusinessJob('retail')).toBe(true);
    expect(isCanonicalBusinessJob('mechanic_assistant')).toBe(true);
    expect(isCanonicalBusinessJob('not_a_real_job')).toBe(false);
  });

  it('calculates POS tax and service fees without hiding them in revenue', () => {
    expect(calculateSaleBreakdown(750, 2, 850, 800)).toEqual({
      subtotalCents: 1500,
      taxCents: 128,
      serviceFeeCents: 120,
      totalCents: 1748
    });
  });

  it('derives supplier cost from canonical base price and supplier terms', () => {
    expect(supplierUnitCost(250, 7800)).toBe(195);
  });
});
