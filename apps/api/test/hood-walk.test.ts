import { describe, expect, it } from 'vitest';
import type { HoodWalkStreetMemory } from '@sol-dorado/contracts/hood-walk';
import { buildHoodWalkLeads, resolveHoodWalkChoice, summarizeHoodWalk } from '../src/domain/hood-walk.js';

function memory(overrides: Partial<HoodWalkStreetMemory> = {}): HoodWalkStreetMemory {
  return { segmentId:'market_block_3', familiarity:0, completedRuns:0, helpfulActs:0, recentEventIds:[], ...overrides };
}

describe('hood walk roguelike deck', () => {
  it('is deterministic for the same server seed and run step', () => {
    const input = { seed:41721, step:1, segmentId:'market_block_3', clues:0, memory:memory(), seenEventIds:[] };
    expect(buildHoodWalkLeads(input)).toEqual(buildHoodWalkLeads(input));
    expect(buildHoodWalkLeads(input)).toHaveLength(3);
  });

  it('suppresses recent events when enough fresh events exist', () => {
    const recent = buildHoodWalkLeads({ seed:12, step:0, segmentId:'market_block_3', clues:0, memory:memory(), seenEventIds:[] });
    const next = buildHoodWalkLeads({ seed:12, step:1, segmentId:'market_block_3', clues:0, memory:memory({ recentEventIds:recent.map(item => item.eventId) }), seenEventIds:recent.map(item => item.eventId) });
    expect(next.every(item => !recent.some(previous => previous.eventId === item.eventId))).toBe(true);
  });

  it('unlocks clue and familiarity events only after the street has been learned', () => {
    const cold = buildHoodWalkLeads({ seed:99, step:2, segmentId:'market_block_3', clues:0, memory:memory(), seenEventIds:[] });
    expect(cold.some(item => item.eventId === 'pattern_spotted' || item.eventId === 'local_recognition')).toBe(false);
    let sawPattern = false;
    let sawRecognition = false;
    for (let seed=1; seed<120; seed+=1) {
      const warm = buildHoodWalkLeads({ seed, step:2, segmentId:'market_block_3', clues:4, memory:memory({ familiarity:22 }), seenEventIds:[] });
      sawPattern ||= warm.some(item => item.eventId === 'pattern_spotted');
      sawRecognition ||= warm.some(item => item.eventId === 'local_recognition');
    }
    expect(sawPattern).toBe(true);
    expect(sawRecognition).toBe(true);
  });

  it('resolves risky decisions deterministically instead of rerolling on refresh', () => {
    const first = resolveHoodWalkChoice({ seed:713, step:3, eventId:'open_garage', choiceId:'snoop', danger:4 });
    const second = resolveHoodWalkChoice({ seed:713, step:3, eventId:'open_garage', choiceId:'snoop', danger:4 });
    expect(first).toEqual(second);
    expect(first?.choiceId).toBe('snoop');
  });

  it('grades a learned, clue-rich route above a quiet first walk', () => {
    const quiet = summarizeHoodWalk({ reason:'route_complete', step:5, momentum:1, danger:0, clues:1, memory:memory({ familiarity:2 }) });
    const learned = summarizeHoodWalk({ reason:'route_complete', step:5, momentum:5, danger:1, clues:5, memory:memory({ familiarity:18 }) });
    expect(learned.score).toBeGreaterThan(quiet.score);
    expect(['sharp','connected','wild']).toContain(learned.grade);
  });
});
