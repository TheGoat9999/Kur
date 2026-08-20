import { describe, expect, it } from 'vitest';
import {
  clampStreetPosition,
  getStreetActionAnchor,
  getStreetRoute,
  getStreetSpawnPosition,
  isStreetActionWithinReach,
  isStreetPositionWalkable,
  resolveStreetNavigationTarget
} from '@sol-dorado/contracts/world-position';

describe('street spatial contract', () => {
  it('snaps movement to the authored pedestrian graph instead of a free-form rectangle', () => {
    expect(isStreetPositionWalkable('market_block_3', { x: 50, y: 67 })).toBe(true);
    expect(isStreetPositionWalkable('market_block_3', { x: 50, y: 10 })).toBe(false);
    expect(resolveStreetNavigationTarget('market_block_3', { x: 79, y: 38 })?.id).toBe('mercado');
    expect(clampStreetPosition('market_block_3', { x: 79, y: 38 })).toEqual({ x: 80, y: 42 });
  });

  it('routes across authored crossings rather than walking through the block', () => {
    const route = getStreetRoute('market_block_3', { x: 28, y: 67 }, { x: 80, y: 35 });
    expect(route).not.toBeNull();
    expect(route?.position).toEqual({ x: 80, y: 42 });
    expect(route?.route).toContainEqual({ x: 50, y: 67 });
    expect(route?.route).toContainEqual({ x: 50, y: 42 });
    expect(route?.distance).toBeGreaterThan(40);
  });

  it('rejects destinations outside the authored navigation corridor', () => {
    expect(getStreetRoute('cypress_corner', { x: 50, y: 67 }, { x: 50, y: 5 })).toBeNull();
  });

  it('requires the player to stand near the actual interaction anchor', () => {
    const anchor = getStreetActionAnchor('market_block_3', 'deliver_el_camino');
    expect(anchor).not.toBeNull();
    expect(isStreetActionWithinReach('market_block_3', { x: 20, y: 42 }, 'deliver_el_camino')).toBe(true);
    expect(isStreetActionWithinReach('market_block_3', { x: 80, y: 42 }, 'deliver_el_camino')).toBe(false);
  });

  it('uses a stable navigation node after street travel', () => {
    expect(getStreetSpawnPosition('mira_alley')).toEqual({ x: 50, y: 67 });
  });
});
