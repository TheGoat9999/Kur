import { describe, expect, it } from 'vitest';
import { applyWorldAction, type MutablePlayerState } from '../src/domain/actions.js';

const base: MutablePlayerState = { health: 100, energy: 82, satiety: 71, hydration: 77, stress: 14, policeHeat: 0, cashCents: 420_000, streetSegment: 'Vespucci Blvd / Block 2' };

describe('applyWorldAction', () => {
  it('applies a legal shift without mutating source state', () => {
    const outcome = applyWorldAction(base, 'work_delivery_shift');
    expect(outcome.next.cashCents).toBe(428_500);
    expect(outcome.next.energy).toBe(74);
    expect(base.cashCents).toBe(420_000);
  });
  it('separates witnessed crime heat from cash', () => {
    const outcome = applyWorldAction(base, 'shoplift_corner_store', () => 0.1);
    expect(outcome.next.policeHeat).toBe(22);
    expect(outcome.next.stress).toBe(32);
    expect(outcome.next.cashCents).toBe(421_200);
  });
});
