import { describe, expect, it } from 'vitest';
import { RealEstateMutationResultSchema, RealEstateStateSchema } from '@sol-dorado/contracts/real-estate';
import { scorePropertyMatch } from '../src/services/real-estate.js';

const client = {
  id:'cole', name:'Jason Cole', budgetMinCents:18000000, budgetMaxCents:26000000,
  kind:'apartment' as const, district:'Downtown', parkingRequired:1
};

describe('real estate behavior', () => {
  it('rewards a complete client-property match', () => {
    expect(scorePropertyMatch(client, { priceCents:24500000, district:'Downtown', kind:'apartment', parkingSpaces:1 })).toBe(100);
  });

  it('allows bad proposals to have a materially lower score', () => {
    expect(scorePropertyMatch(client, { priceCents:48000000, district:'Harbor', kind:'warehouse', parkingSpaces:0 })).toBe(0);
  });

  it('requires structured authoritative property state and cash mutation results', () => {
    expect(RealEstateStateSchema.safeParse({}).success).toBe(false);
    expect(RealEstateMutationResultSchema.safeParse({ state:{}, cashCents:100, message:'ok' }).success).toBe(false);
  });
});
