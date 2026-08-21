import { describe, expect, it } from 'vitest';
import {
  WorldMapStateSchema,
  WorldMapTravelResultSchema,
  resolveWorldConnectionRoute,
  resolveWorldPath,
  resolveWorldRoute,
  type WorldMapState,
  type WorldStreetConnection
} from '@sol-dorado/contracts/world-map';

const geometry = { center: { x: 50, y: 50 }, polygon: [], path: [] };
const fixture: WorldMapState = {
  regions: [{ id: 'region', name: 'Region', geometry }],
  settlements: [{ id: 'city', regionId: 'region', name: 'City', kind: 'city', geometry }],
  zones: [{ id: 'zone', settlementId: 'city', name: 'Zone', kind: 'urban', geometry }],
  districts: [{ id: 'district', zoneId: 'zone', name: 'District', kind: 'mixed_use', maxPlayerPropertyShare: 0.15, geometry }],
  streets: [{ id: 'street', districtId: 'district', name: 'Street', kind: 'street', maxPropertiesPerOwner: 2, geometry }],
  segments: [
    { id: 'segment', streetId: 'street', displayName: 'Street / Block 1', kind: 'block', playable: true, geometry },
    { id: 'segment_b', streetId: 'street', displayName: 'Street / Block 2', kind: 'block', playable: true, geometry },
    { id: 'segment_c', streetId: 'street', displayName: 'Street / Block 3', kind: 'block', playable: true, geometry }
  ],
  connections: [
    { fromSegmentId: 'segment', toSegmentId: 'segment_b', distanceMeters: 90, bidirectional: true, modes: ['walk', 'car', 'taxi'] },
    { fromSegmentId: 'segment_b', toSegmentId: 'segment_c', distanceMeters: 70, bidirectional: true, modes: ['walk', 'car', 'taxi', 'bus'] },
    { fromSegmentId: 'segment', toSegmentId: 'segment_c', distanceMeters: 240, bidirectional: true, modes: ['walk'] }
  ],
  parcels: [{ id: 'parcel', segmentId: 'segment', name: 'Shop', kind: 'commercial', playerOwnable: true, serviceKey: null, geometry }],
  current: { regionId: 'region', settlementId: 'city', zoneId: 'zone', districtId: 'district', streetId: 'street', segmentId: 'segment' }
};

const connectionFixture: WorldStreetConnection[] = fixture.connections;

describe('canonical world hierarchy', () => {
  it('validates a normalized region-to-parcel world map', () => {
    expect(WorldMapStateSchema.parse(fixture).current.segmentId).toBe('segment');
  });

  it('resolves a street segment back through the entire world hierarchy', () => {
    expect(resolveWorldPath(fixture, 'segment')).toEqual(fixture.current);
  });

  it('rejects an unknown segment path without inventing geography', () => {
    expect(resolveWorldPath(fixture, 'missing')).toBeNull();
  });

  it('finds the shortest multi-segment walking route instead of requiring a direct edge', () => {
    expect(resolveWorldRoute(fixture, 'segment', 'segment_c', 'walk')).toEqual({
      segmentIds: ['segment', 'segment_b', 'segment_c'],
      distanceMeters: 160
    });
  });

  it('respects travel mode availability while routing', () => {
    expect(resolveWorldConnectionRoute(connectionFixture, 'segment', 'segment_c', 'bus')).toBeNull();
    expect(resolveWorldConnectionRoute(connectionFixture, 'segment_b', 'segment_c', 'bus')).toEqual({
      segmentIds: ['segment_b', 'segment_c'],
      distanceMeters: 70
    });
  });

  it('validates server-authoritative map travel costs', () => {
    expect(WorldMapTravelResultSchema.parse({ segmentId: 'segment', distanceMeters: 140, energyCost: 2, hydrationCost: 1 })).toEqual({
      segmentId: 'segment', distanceMeters: 140, energyCost: 2, hydrationCost: 1
    });
  });
});
