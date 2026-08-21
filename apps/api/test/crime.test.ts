import { describe, expect, it } from 'vitest';
import { CRIME_OPPORTUNITIES, deterministicCrimeRoll, opportunitiesForSegment, resolveAttempt } from '../src/domain/crime.js';

describe('crime and illegal economy domain', () => {
  it('only exposes opportunities physically present on the current segment', () => {
    expect(opportunitiesForSegment('market_block_3').every(value => value.segmentId === 'market_block_3')).toBe(true);
    expect(opportunitiesForSegment('cypress_corner').some(value => value.crimeType === 'vehicle_theft')).toBe(true);
  });

  it('resolves the same request seed deterministically for idempotent gameplay', () => {
    expect(deterministicCrimeRoll('player:request')).toBe(deterministicCrimeRoll('player:request'));
    const opportunity = CRIME_OPPORTUNITIES.find(value => value.id === 'cypress_burglary')!;
    expect(resolveAttempt(opportunity, 'stable-seed', true)).toEqual(resolveAttempt(opportunity, 'stable-seed', true));
  });

  it('keeps recognition and police notification separate from raw heat', () => {
    const opportunity = CRIME_OPPORTUNITIES.find(value => value.id === 'market_shoplift')!;
    const result = resolveAttempt(opportunity, 'recognition-seed', true);
    expect(result.recognition).toBeGreaterThanOrEqual(0);
    expect(result.heatDelta).toBeGreaterThanOrEqual(0);
    expect(typeof result.policeNotified).toBe('boolean');
  });
});
