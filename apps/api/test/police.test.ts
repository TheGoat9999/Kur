import { describe, expect, it } from 'vitest';
import { PoliceStateSchema } from '@sol-dorado/contracts/police';
import { evaluateFieldAction, normalizePoliceUnitIdentity, resolvePursuitAction } from '../src/services/police.js';

describe('police AIO domain', () => {
  it('keeps search authority separate from a generic detention', () => {
    expect(evaluateFieldAction({ action: 'search', legalGround: 'traffic_violation', detained: true, searched: false })).toEqual({ lawful: false, violation: 'unlawful_search' });
    expect(evaluateFieldAction({ action: 'search', legalGround: 'probable_cause', detained: true, searched: false })).toEqual({ lawful: true, violation: null });
  });

  it('records an arrest as unlawful without probable cause or warrant', () => {
    expect(evaluateFieldAction({ action: 'arrest', legalGround: 'reasonable_suspicion', detained: true, searched: true })).toEqual({ lawful: false, violation: 'unlawful_arrest' });
    expect(evaluateFieldAction({ action: 'arrest', legalGround: 'warrant', detained: false, searched: false })).toEqual({ lawful: true, violation: null });
  });

  it('normalizes nullable NPC ownership flags to strict booleans', () => {
    expect(normalizePoliceUnitIdentity(null)).toBe(false);
    expect(normalizePoliceUnitIdentity(undefined)).toBe(false);
    expect(normalizePoliceUnitIdentity(false)).toBe(false);
    expect(normalizePoliceUnitIdentity(true)).toBe(true);
  });

  it('removes live visual position when pursuit visual is lost', () => {
    const next = resolvePursuitAction({ distanceIndex: 62, risk: 40, searchConfidence: 92, visualContact: true }, 'lose_visual');
    expect(next.visualContact).toBe(false);
    expect(next.status).toBe('lost');
    expect(next.searchConfidence).toBeLessThan(92);
    expect(next.distanceIndex).toBeGreaterThan(62);
  });

  it('lets containment finish a pursuit without inventing hidden identity knowledge', () => {
    const next = resolvePursuitAction({ distanceIndex: 24, risk: 45, searchConfidence: 70, visualContact: true }, 'contain');
    expect(next.status).toBe('contained');
    expect(next.distanceIndex).toBe(0);
  });

  it('validates the AIO state while keeping police knowledge in explicit intel records', () => {
    const parsed = PoliceStateSchema.parse({
      serverTime: new Date().toISOString(),
      profile: { careerStatus: 'officer', academyStage: 2, badgeNumber: 'SD-12345', rankCode: 'officer', callsign: '24', onDuty: true, complaints: 0, citations: 0, arrests: 0 },
      dashboard: { activeCalls: 0, activeWarrants: 0, activeBolos: 0, officersOnDuty: 1, openReports: 0 },
      units: [], calls: [], intel: [], activeEncounter: null, reports: [], warrants: [], bolos: [], evidence: [], pursuit: null, audit: []
    });
    expect(parsed.profile.onDuty).toBe(true);
    expect(parsed.intel).toHaveLength(0);
  });
});