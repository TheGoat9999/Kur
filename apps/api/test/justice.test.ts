import { describe, expect, it } from 'vitest';
import { calculateBail, calculateSentence, npcCourtOutcome, npcProsecutionDecision } from '../src/domain/justice.js';

describe('Justice domain rules', () => {
  it('keeps guilt determination tied to current-case evidence rather than prior record', () => {
    expect(npcCourtOutcome([{ evidenceStrength: 80, count: 1 }])).toBe('guilty');
    expect(npcCourtOutcome([{ evidenceStrength: 60, count: 1 }])).toBe('plea');
    expect(npcCourtOutcome([{ evidenceStrength: 40, count: 1 }])).toBe('not_guilty');
  });

  it('declines weak prosecutions before court', () => {
    expect(npcProsecutionDecision([{ evidenceStrength: 30, count: 2 }])).toBe('declined');
    expect(npcProsecutionDecision([{ evidenceStrength: 65, count: 1 }])).toBe('filed');
  });

  it('uses prior convictions for bail and sentencing severity, not guilt', () => {
    const charge = [{ severity: 'felony', count: 1, baseBailCents: 300_000 }];
    expect(calculateBail(charge, 0).amountCents).toBe(300_000);
    expect(calculateBail(charge, 2).amountCents).toBe(400_000);
    expect(calculateBail([...charge, ...charge], 2).denied).toBe(true);
    const first = calculateSentence([{ severity: 'felony', count: 1, baseFineCents: 100_000, baseJailMinutes: 20 }], 'guilty', 0);
    const repeat = calculateSentence([{ severity: 'felony', count: 1, baseFineCents: 100_000, baseJailMinutes: 20 }], 'guilty', 3);
    expect(repeat.fineCents).toBeGreaterThan(first.fineCents);
    expect(repeat.jailMinutes).toBeGreaterThan(first.jailMinutes);
  });
});
