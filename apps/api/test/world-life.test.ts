import { describe, expect, it } from 'vitest';
import { WorldMapStateSchema, resolveWorldPath } from '@sol-dorado/contracts/world-map';

describe('outer-world population', () => {
  it('keeps planned streets valid map entities without turning them into playable street scenes', () => {
    const map = WorldMapStateSchema.parse({
      regions: [{ id: 'sol_dorado_region', name: 'SOL DORADO', geometry: geometry(50, 50) }],
      settlements: [{ id: 'mesa_roja', regionId: 'sol_dorado_region', name: 'Mesa Roja', kind: 'town', geometry: geometry(75, 65) }],
      zones: [{ id: 'mesa_centro', settlementId: 'mesa_roja', name: 'Mesa Centro', kind: 'urban', geometry: geometry(35, 40) }],
      districts: [{ id: 'mesa_main_street', zoneId: 'mesa_centro', name: 'Mesa Main Street', kind: 'mixed_use', maxPlayerPropertyShare: 0.18, geometry: geometry(50, 50) }],
      streets: [{ id: 'mesa_main_street_street_1', districtId: 'mesa_main_street', name: 'Dustfall Avenue', kind: 'road', maxPropertiesPerOwner: 2, geometry: pathGeometry() }],
      segments: [{ id: 'mesa_main_street_street_1_segment_1', streetId: 'mesa_main_street_street_1', displayName: 'Dustfall Avenue · Block 1', kind: 'block', playable: false, geometry: geometry(50, 30) }],
      connections: [],
      parcels: [{ id: 'life_mesa_main_street', segmentId: 'mesa_main_street_street_1_segment_1', name: 'Mesa Roja General Store', kind: 'commercial', playerOwnable: true, serviceKey: null, geometry: geometry(50, 50) }],
      current: {
        regionId: 'sol_dorado_region',
        settlementId: 'mesa_roja',
        zoneId: 'mesa_centro',
        districtId: 'mesa_main_street',
        streetId: 'mesa_main_street_street_1',
        segmentId: 'mesa_main_street_street_1_segment_1'
      }
    });

    expect(map.segments[0]?.playable).toBe(false);
    expect(map.parcels[0]?.name).toBe('Mesa Roja General Store');
    expect(resolveWorldPath(map, 'mesa_main_street_street_1_segment_1')).toEqual(map.current);
  });
});

function geometry(x: number, y: number) {
  return {
    center: { x, y },
    polygon: [{ x: Math.max(0, x - 4), y: Math.max(0, y - 4) }, { x: Math.min(100, x + 4), y: Math.max(0, y - 4) }, { x: Math.min(100, x + 4), y: Math.min(100, y + 4) }],
    path: []
  };
}

function pathGeometry() {
  return { center: { x: 50, y: 30 }, polygon: [], path: [{ x: 8, y: 30 }, { x: 92, y: 30 }] };
}
