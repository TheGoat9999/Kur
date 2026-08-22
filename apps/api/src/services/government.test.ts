import { describe, expect, it } from 'vitest';
import { GovernmentCommandError, ageOnDate, nextFineState } from './government.js';

describe('government domain rules', () => {
  it('calculates age around the birthday boundary', () => {
    const at = new Date('2026-08-22T12:00:00.000Z');
    expect(ageOnDate('2008-08-22', at)).toBe(18);
    expect(ageOnDate('2008-08-23', at)).toBe(17);
  });

  it('applies partial and final fine payments without overpaying', () => {
    expect(nextFineState(10_000, 2_500)).toEqual({ appliedCents: 2_500, nextBalanceCents: 7_500, status: 'partial' });
    expect(nextFineState(7_500, 20_000)).toEqual({ appliedCents: 7_500, nextBalanceCents: 0, status: 'paid' });
  });

  it('rejects invalid fine payments', () => {
    expect(() => nextFineState(1_000, 0)).toThrow(GovernmentCommandError);
  });
});
