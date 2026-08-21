import { describe, expect, it } from 'vitest';
import { VehicleStateSchema } from '@sol-dorado/contracts/vehicles';

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

const cypressLocation = {
  region: 'SOL DORADO',
  settlement: 'Sol Dorado City',
  zone: 'Las Palmas',
  district: 'Las Palmas West',
  street: 'Cypress Avenue',
  segment: 'Cypress Avenue / Market Corner'
};

const marketLocation = {
  region: 'SOL DORADO',
  settlement: 'Sol Dorado City',
  zone: 'Las Palmas',
  district: 'Las Palmas West',
  street: 'Market Street',
  segment: 'Market Street / Block 3'
};

const dealership = {
  key: 'dorado_motors' as const,
  name: 'Dorado Motors',
  segmentId: 'cypress_corner',
  segmentDisplayName: 'Cypress Avenue / Market Corner',
  location: cypressLocation,
  accessible: false,
  stock: []
};

describe('vehicle system contracts', () => {
  it('keeps dealership access tied to a physical world segment', () => {
    const state = VehicleStateSchema.parse({
      activeVehicleId: null,
      playerLocation: marketLocation,
      ownedVehicles: [],
      dealership
    });
    expect(state.dealership.segmentId).toBe('cypress_corner');
    expect(state.dealership.location.district).toBe('Las Palmas West');
    expect(state.dealership.accessible).toBe(false);
  });

  it('validates persistent parked vehicle state independently from player location', () => {
    const vehicleId = '11111111-1111-4111-8111-111111111111';
    const state = VehicleStateSchema.parse({
      activeVehicleId: vehicleId,
      playerLocation: marketLocation,
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
        parkedLocation: cypressLocation,
        parkedPosition: { x: 24, y: 58 },
        atPlayerLocation: false,
        withinInteractionRange: false,
        locked: true,
        occupied: false,
        parkingKind: 'dealership'
      }],
      dealership
    });
    expect(state.ownedVehicles[0].parkedSegmentId).toBe('cypress_corner');
    expect(state.ownedVehicles[0].parkedLocation.street).toBe('Cypress Avenue');
    expect(state.ownedVehicles[0].withinInteractionRange).toBe(false);
  });

  it('distinguishes being on the same street segment from being close enough to interact', () => {
    const vehicleId = '22222222-2222-4222-8222-222222222222';
    const state = VehicleStateSchema.parse({
      activeVehicleId: vehicleId,
      playerLocation: cypressLocation,
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
        parkedLocation: cypressLocation,
        parkedPosition: { x: 24, y: 58 },
        atPlayerLocation: true,
        withinInteractionRange: false,
        locked: true,
        occupied: false,
        parkingKind: 'street'
      }],
      dealership: { ...dealership, accessible: true }
    });
    expect(state.ownedVehicles[0].atPlayerLocation).toBe(true);
    expect(state.ownedVehicles[0].withinInteractionRange).toBe(false);
  });

  it('validates dealership listings as condition-bearing persistent stock', () => {
    const state = VehicleStateSchema.parse({
      activeVehicleId: null,
      playerLocation: cypressLocation,
      ownedVehicles: [],
      dealership: {
        ...dealership,
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
});
