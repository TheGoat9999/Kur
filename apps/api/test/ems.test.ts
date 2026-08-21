import { describe, expect, it } from 'vitest';
import { emsCallPayout, nextEmsReputation, treatmentEffect } from '../src/domain/ems.js';

describe('EMS domain rules', () => {
  it('keeps treatment effects bounded and CPR as the strongest immediate intervention', () => {
    expect(treatmentEffect('bandage')).toBe(5);
    expect(treatmentEffect('cpr')).toBe(15);
  });

  it('rewards higher priority calls and caps procedure bonuses', () => {
    expect(emsCallPayout('p1', 0)).toBeGreaterThan(emsCallPayout('p4', 0));
    expect(emsCallPayout('p3', 100)).toBe(9000);
  });

  it('clamps reputation at 100', () => {
    expect(nextEmsReputation(99, 'p1', true, 2)).toBe(100);
  });
});
