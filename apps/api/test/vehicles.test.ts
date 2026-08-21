import { describe, expect, it } from 'vitest';
import { VehicleStateSchema, VehicleTravelResultSchema } from '@sol-dorado/contracts/vehicles';

const model = {
  id: 'bravura_compact_s',
  brand: 'Bravura',
  model: 'Compact S',
  displayName: '2012 Bravura Compact S',
  year: 2012,
  vehicleClass: 'compact' as const,
  reliability: 91,
  performance: 50,
  comfort: 61,
  economy: 89,
  cargoKg: 310,
  tankLiters: 46
};

const emptyDealer = {
  key: 'dorado_motors' as const,
  name: 'Dorado Motors',
  segmentId: 'cypress_corner',
  segmentDisplayName: 'Cypress Avenue / Market Corner',
  accessible: false,
  stock: []
};

describe('vehicle system contracts', () => {
  it('keeps dealership access tied to a physical world segment', () => {
    const state = VehicleStateSchema.parse({ activeVehicleId: null, ownedVehicles: [], dealership: emptyDealer });
    expect(state.dealership.segmentId).toBe('cypress_corner');
    expect(state.dealership.accessible).toBe(false);
  });

  it('validates persistent parked vehicle state independently from player location', () => {
    const vehicleId = '11111111-1111-4111-8111-111111111111';
    const state = VehicleStateSchema.parse({
      activeVehicleId: vehicleId,
      ownedVehicles: [{
        id: vehicleId,
        model,
        active: true,
        fuelPercent: 72,
        engineCondition: 92,
        bodyCondition: 88,
        tireCondition: 84,
        mileageKm: 118600,
        parkedSegmentId: 'cypress_corner',
        parkedDisplayName: 'Cypress Avenue / Market Corner',
        atPlayerLocation: false,
        locked: true,
        occupied: false,
        parkingKind: 'dealership'
      }],
      dealership: emptyDealer
    });
    expect(state.ownedVehicles[0].parkedSegmentId).toBe('cypress_corner');
    expect(state.ownedVehicles[0].atPlayerLocation).toBe(false);
  });

  it('validates dealership listings as condition-bearing persistent stock', () => {
    const state = VehicleStateSchema.parse({
      activeVehicleId: null,
      ownedVehicles: [],
      dealership: {
        ...emptyDealer,
        accessible: true,
        stock: [{
          stockKey: 'dm_bravura_01',
          model,
          priceCents: 360000,
          mileageKm: 118600,
          engineCondition: 92,
          bodyCondition: 88,
          tireCondition: 84
        }]
      }
    });
    expect(state.dealership.stock[0].priceCents).toBe(360000);
    expect(state.dealership.stock[0].model.reliability).toBe(91);
  });

  it('validates driving consequences together with relocated vehicle state', () => {
    const vehicleId = '11111111-1111-4111-8111-111111111111';
    const result = VehicleTravelResultSchema.parse({
      segmentId: 'market_block_3',
      distanceMeters: 420,
      fuelCostPercent: 1.2,
      mileageAddedKm: 0.42,
      state: {
        activeVehicleId: vehicleId,
        ownedVehicles: [{
          id: vehicleId,
          model,
          active: true,
          fuelPercent: 70.8,
          engineCondition: 91.9,
          bodyCondition: 88,
          tireCondition: 83.9,
          mileageKm: 118601,
          parkedSegmentId: 'market_block_3',
          parkedDisplayName: 'Market Street / Block 3',
          atPlayerLocation: true,
          locked: false,
          occupied: true,
          parkingKind: 'street'
        }],
        dealership: emptyDealer
      }
    });
    expect(result.segmentId).toBe('market_block_3');
    expect(result.state.ownedVehicles[0].parkedSegmentId).toBe('market_block_3');
    expect(result.fuelCostPercent).toBeGreaterThan(0);
  });
});
