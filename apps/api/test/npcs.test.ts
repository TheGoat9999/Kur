import { describe, expect, it } from 'vitest';
import { NPC_PROFILES, getSolDoradoHour, resolveNpcPresence } from '../src/services/npcs.js';

describe('living NPC schedules', () => {
  it('resolves Sol Dorado time in the city timezone', () => {
    expect(getSolDoradoHour(new Date('2026-08-21T16:00:00.000Z'))).toBe(9);
  });

  it('moves Maya between authored places based on schedule instead of random client animation', () => {
    const morning = resolveNpcPresence(NPC_PROFILES.maya_rojas, new Date('2026-08-21T16:00:00.000Z'));
    const afternoon = resolveNpcPresence(NPC_PROFILES.maya_rojas, new Date('2026-08-21T21:00:00.000Z'));

    expect(morning.segmentId).toBe('cypress_corner');
    expect(morning.intent).toBe('socialize');
    expect(afternoon.segmentId).toBe('market_block_3');
    expect(afternoon.intent).toBe('errand');
  });

  it('gives every canonical NPC a complete daily schedule and a future system hook', () => {
    for (const profile of Object.values(NPC_PROFILES)) {
      const covered = new Set<number>();
      for (const entry of profile.schedule) {
        for (let hour = entry.startHour; hour < entry.endHour; hour += 1) covered.add(hour);
      }
      expect(covered.size).toBe(24);
      expect(profile.missionHooks.length).toBeGreaterThan(0);
    }
  });
});
