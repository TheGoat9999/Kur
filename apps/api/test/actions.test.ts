import { describe, expect, it } from 'vitest';
import { applyWorldAction, getActionAvailability, type MutablePlayerState } from '../src/domain/actions.js';

const base: MutablePlayerState = {
  health: 100,
  energy: 82,
  satiety: 71,
  hydration: 77,
  stress: 14,
  policeHeat: 0,
  cashCents: 420_000,
  currentSegmentId: 'market_block_3',
  visitedSegmentIds: ['market_block_3'],
  flags: { cornerStoreAlerted: false, alleyTipKnown: false }
};

describe('applyWorldAction', () => {
  it('applies a legal shift without mutating source state', () => {
    const outcome = applyWorldAction(base, 'deliver_el_camino');
    expect(outcome.next.cashCents).toBe(424_500);
    expect(outcome.next.energy).toBe(75);
    expect(base.cashCents).toBe(420_000);
  });

  it('moves through connected segments and records exploration', () => {
    const outcome = applyWorldAction(base, 'travel_mira_alley');
    expect(outcome.next.currentSegmentId).toBe('mira_alley');
    expect(outcome.next.visitedSegmentIds).toEqual(['market_block_3', 'mira_alley']);
    expect(base.visitedSegmentIds).toEqual(['market_block_3']);
  });

  it('separates witnessed crime heat from cash', () => {
    const outcome = applyWorldAction(base, 'shoplift_corner_store', () => 0.1);
    expect(outcome.next.policeHeat).toBe(22);
    expect(outcome.next.stress).toBe(32);
    expect(outcome.next.cashCents).toBe(421_200);
    expect(outcome.next.flags.cornerStoreAlerted).toBe(true);
  });

  it('creates a physical dumpster reward only in the alley', () => {
    const alley = { ...base, currentSegmentId: 'mira_alley' as const, visitedSegmentIds: ['market_block_3', 'mira_alley'] as const };
    const outcome = applyWorldAction({ ...alley, visitedSegmentIds: [...alley.visitedSegmentIds] }, 'search_dumpster', () => 0.9);
    expect(outcome.reward).toEqual({ itemKey: 'salvaged_electronics', displayName: 'Salvaged Electronics', quantity: 2 });
    expect(outcome.cooldownMs).toBe(4 * 60 * 60 * 1_000);
  });

  it('protects locked access, learned information and active cooldowns', () => {
    expect(getActionAvailability(base, 'enter_apartment')).toBe('locked');
    expect(getActionAvailability(base, 'deliver_el_camino', Date.now() + 60_000)).toBe('cooldown');
    const cypress = {
      ...base,
      currentSegmentId: 'cypress_corner' as const,
      flags: { cornerStoreAlerted: false, alleyTipKnown: true }
    };
    expect(getActionAvailability(cypress, 'ask_maya_information')).toBe('already_done');
    expect(applyWorldAction(base, 'speak_corner_clerk').cooldownMs).toBe(2 * 60 * 1_000);
  });
});
