import { describe, expect, it } from 'vitest';
import { calculateHospitalityDemand } from '../src/domain/hospitality-demand.js';
import { calculatePreparedQuality, consumeRecipeStock, missingRecipeStock, PRODUCTION_RECIPES } from '../src/domain/hospitality-production.js';
import { canReceiveShipment, deterministicDelayMinutes, effectiveShipmentStatus, shortageSignal } from '../src/domain/supply-chain.js';

describe('hospitality production', () => {
  const recipe = PRODUCTION_RECIPES[0];

  it('requires every recipe input before production', () => {
    const missing = missingRecipeStock(recipe, [
      { itemKey: 'bread_loaf', quantity: 1 },
      { itemKey: 'raw_beef', quantity: 0 },
      { itemKey: 'cheese_block', quantity: 1 }
    ]);
    expect(missing).toEqual([{ itemKey: 'raw_beef', required: 1, available: 0 }]);
  });

  it('consumes exact ingredient quantities without touching unrelated stock', () => {
    const next = consumeRecipeStock(recipe, [
      { itemKey: 'bread_loaf', quantity: 3 },
      { itemKey: 'raw_beef', quantity: 4 },
      { itemKey: 'cheese_block', quantity: 2 },
      { itemKey: 'water_bottle', quantity: 10 }
    ], 2);
    expect(next).toEqual([
      { itemKey: 'bread_loaf', quantity: 1 },
      { itemKey: 'raw_beef', quantity: 2 },
      { itemKey: 'cheese_block', quantity: 0 },
      { itemKey: 'water_bottle', quantity: 10 }
    ]);
  });

  it('turns ingredient quality, freshness and skill into bounded prepared quality', () => {
    expect(calculatePreparedQuality(90, 80, 6)).toBe(83);
    expect(calculatePreparedQuality(200, 200, 20)).toBe(100);
  });
});

describe('hospitality demand', () => {
  it('is deterministic for a business, district and server time bucket', () => {
    const input = { businessKey:'el_camino', district:'Las Palmas West', timeBucket:480019, concept:'restaurant' as const, reputation:75, priceIndexBasisPoints:10000, capacity:28, open:true };
    expect(calculateHospitalityDemand(input)).toEqual(calculateHospitalityDemand(input));
  });

  it('creates no customers while the venue is closed', () => {
    expect(calculateHospitalityDemand({ businessKey:'el_camino', district:'Las Palmas West', timeBucket:480019, concept:'restaurant', reputation:75, priceIndexBasisPoints:10000, capacity:28, open:false }).requestedCustomers).toBe(0);
  });

  it('makes service period and pricing matter without exceeding capacity', () => {
    const dinner = calculateHospitalityDemand({ businessKey:'el_camino', district:'Las Palmas West', timeBucket:480019, concept:'restaurant', reputation:80, priceIndexBasisPoints:9500, capacity:28, open:true });
    const offHours = calculateHospitalityDemand({ businessKey:'el_camino', district:'Las Palmas West', timeBucket:480005, concept:'restaurant', reputation:80, priceIndexBasisPoints:14000, capacity:28, open:true });
    expect(dinner.requestedCustomers).toBeGreaterThan(offHours.requestedCustomers);
    expect(dinner.requestedCustomers).toBeLessThanOrEqual(28);
  });
});

describe('supply chain', () => {
  const dispatchedAt = new Date('2026-08-22T08:00:00Z');
  const etaAt = new Date('2026-08-22T09:00:00Z');

  it('does not allow stock receipt before the authoritative ETA', () => {
    const shipment = { status: 'in_transit' as const, dispatchedAt, etaAt, deliveredAt: null, delayMinutes: 15 };
    expect(canReceiveShipment(shipment, new Date('2026-08-22T09:10:00Z'))).toBe(false);
    expect(canReceiveShipment(shipment, new Date('2026-08-22T09:15:00Z'))).toBe(true);
  });

  it('exposes delayed transit after ETA plus deterministic delay', () => {
    const shipment = { status: 'in_transit' as const, dispatchedAt, etaAt, deliveredAt: null, delayMinutes: 10 };
    expect(effectiveShipmentStatus(shipment, new Date('2026-08-22T09:11:00Z'))).toBe('delayed');
  });

  it('distinguishes shortage from a low-stock watch with incoming freight', () => {
    expect(shortageSignal({ itemKey: 'raw_beef', quantity: 0, reorderPoint: 5, incomingQuantity: 0 }).severity).toBe('shortage');
    expect(shortageSignal({ itemKey: 'raw_beef', quantity: 2, reorderPoint: 5, incomingQuantity: 2 }).severity).toBe('watch');
    expect(shortageSignal({ itemKey: 'raw_beef', quantity: 2, reorderPoint: 5, incomingQuantity: 10 }).severity).toBe('none');
  });

  it('produces repeatable supplier-delay outcomes for the same shipment seed', () => {
    const first = deterministicDelayMinutes('shipment:abc', 60);
    expect(deterministicDelayMinutes('shipment:abc', 60)).toBe(first);
  });
});
