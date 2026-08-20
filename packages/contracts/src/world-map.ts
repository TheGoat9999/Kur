import { z } from 'zod';

export const WorldMapPointSchema = z.object({
  x: z.number().finite().min(0).max(100),
  y: z.number().finite().min(0).max(100)
});

export const WorldMapGeometrySchema = z.object({
  center: WorldMapPointSchema,
  polygon: z.array(WorldMapPointSchema),
  path: z.array(WorldMapPointSchema)
});

export const WorldRegionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  geometry: WorldMapGeometrySchema
});

export const WorldSettlementKindSchema = z.enum(['city', 'town', 'village']);
export const WorldSettlementSchema = z.object({
  id: z.string().min(1),
  regionId: z.string().min(1),
  name: z.string().min(1),
  kind: WorldSettlementKindSchema,
  geometry: WorldMapGeometrySchema
});

export const WorldZoneKindSchema = z.enum(['urban', 'industrial', 'coastal', 'airport', 'suburban', 'desert', 'rural']);
export const WorldZoneSchema = z.object({
  id: z.string().min(1),
  settlementId: z.string().min(1),
  name: z.string().min(1),
  kind: WorldZoneKindSchema,
  geometry: WorldMapGeometrySchema
});

export const WorldDistrictKindSchema = z.enum(['mixed_use', 'residential', 'commercial', 'civic', 'industrial', 'nightlife', 'transit']);
export const WorldDistrictSchema = z.object({
  id: z.string().min(1),
  zoneId: z.string().min(1),
  name: z.string().min(1),
  kind: WorldDistrictKindSchema,
  maxPlayerPropertyShare: z.number().min(0).max(1),
  geometry: WorldMapGeometrySchema
});

export const WorldStreetKindSchema = z.enum(['avenue', 'street', 'boulevard', 'alley', 'road', 'highway']);
export const WorldStreetSchema = z.object({
  id: z.string().min(1),
  districtId: z.string().min(1),
  name: z.string().min(1),
  kind: WorldStreetKindSchema,
  maxPropertiesPerOwner: z.number().int().nonnegative(),
  geometry: WorldMapGeometrySchema
});

export const WorldStreetSegmentKindSchema = z.enum(['block', 'intersection', 'alley', 'road']);
export const WorldStreetSegmentSchema = z.object({
  id: z.string().min(1),
  streetId: z.string().min(1),
  displayName: z.string().min(1),
  kind: WorldStreetSegmentKindSchema,
  playable: z.boolean(),
  geometry: WorldMapGeometrySchema
});

export const WorldTravelModeSchema = z.enum(['walk', 'car', 'taxi', 'bus']);
export const WorldStreetConnectionSchema = z.object({
  fromSegmentId: z.string().min(1),
  toSegmentId: z.string().min(1),
  distanceMeters: z.number().int().positive(),
  bidirectional: z.boolean(),
  modes: z.array(WorldTravelModeSchema).min(1)
});

export const WorldParcelKindSchema = z.enum(['residential', 'commercial', 'civic', 'emergency', 'transport', 'industrial', 'park', 'utility', 'parking']);
export const WorldParcelSchema = z.object({
  id: z.string().min(1),
  segmentId: z.string().min(1),
  name: z.string().min(1),
  kind: WorldParcelKindSchema,
  playerOwnable: z.boolean(),
  serviceKey: z.string().nullable(),
  geometry: WorldMapGeometrySchema
});

export const WorldMapCurrentSchema = z.object({
  regionId: z.string().min(1),
  settlementId: z.string().min(1),
  zoneId: z.string().min(1),
  districtId: z.string().min(1),
  streetId: z.string().min(1),
  segmentId: z.string().min(1)
});

export const WorldMapStateSchema = z.object({
  regions: z.array(WorldRegionSchema),
  settlements: z.array(WorldSettlementSchema),
  zones: z.array(WorldZoneSchema),
  districts: z.array(WorldDistrictSchema),
  streets: z.array(WorldStreetSchema),
  segments: z.array(WorldStreetSegmentSchema),
  connections: z.array(WorldStreetConnectionSchema),
  parcels: z.array(WorldParcelSchema),
  current: WorldMapCurrentSchema
});

export type WorldMapPoint = z.infer<typeof WorldMapPointSchema>;
export type WorldMapGeometry = z.infer<typeof WorldMapGeometrySchema>;
export type WorldRegion = z.infer<typeof WorldRegionSchema>;
export type WorldSettlement = z.infer<typeof WorldSettlementSchema>;
export type WorldZone = z.infer<typeof WorldZoneSchema>;
export type WorldDistrict = z.infer<typeof WorldDistrictSchema>;
export type WorldStreet = z.infer<typeof WorldStreetSchema>;
export type WorldStreetSegment = z.infer<typeof WorldStreetSegmentSchema>;
export type WorldStreetConnection = z.infer<typeof WorldStreetConnectionSchema>;
export type WorldParcel = z.infer<typeof WorldParcelSchema>;
export type WorldMapCurrent = z.infer<typeof WorldMapCurrentSchema>;
export type WorldMapState = z.infer<typeof WorldMapStateSchema>;

export function resolveWorldPath(map: WorldMapState, segmentId: string): WorldMapCurrent | null {
  const segment = map.segments.find(item => item.id === segmentId);
  if (!segment) return null;
  const street = map.streets.find(item => item.id === segment.streetId);
  if (!street) return null;
  const district = map.districts.find(item => item.id === street.districtId);
  if (!district) return null;
  const zone = map.zones.find(item => item.id === district.zoneId);
  if (!zone) return null;
  const settlement = map.settlements.find(item => item.id === zone.settlementId);
  if (!settlement) return null;
  const region = map.regions.find(item => item.id === settlement.regionId);
  if (!region) return null;
  return {
    regionId: region.id,
    settlementId: settlement.id,
    zoneId: zone.id,
    districtId: district.id,
    streetId: street.id,
    segmentId: segment.id
  };
}
