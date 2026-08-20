import { describe, expect, it } from 'vitest';
import {
  clampStreetPosition,
  getStreetActionAnchor,
  getStreetSpawnPosition,
  isStreetActionWithinReach,
  isStreetPositionWalkable
} from '@sol-dorado/contracts/world-position';

describe('street spatial contract', () => {
  it('keeps movement inside the authored walkable corridor', () => {
    expect(isStreetPositionWalkable('market_block_3', { x: 50, y: 57 })).toBe(true);
    expect(isStreetPositionWalkable('market_block_3', { x: 50, y: 10 })).toBe(false);
    expect(clampStreetPosition('market_block_3', { x: -20, y: 99 })).toEqual({ x: 3, y: 76 });
  });

  it('requires the player to stand near the actual interaction anchor', () => {
    const anchor = getStreetActionAnchor('market_block_3', 'deliver_el_camino');
    expect(anchor).not.toBeNull();
    expect(isStreetActionWithinReach('market_block_3', { x: 20, y: 35 }, 'deliver_el_camino')).toBe(true);
    expect(isStreetActionWithinReach('market_block_3', { x: 80, y: 35 }, 'deliver_el_camino')).toBe(false);
  });

  it('uses a stable spawn point after street travel', () => {
    expect(getStreetSpawnPosition('mira_alley')).toEqual({ x: 50, y: 57 });
  });
});
