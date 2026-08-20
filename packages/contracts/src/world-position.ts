import { z } from 'zod';

export const StreetSpatialSegmentIdSchema = z.enum(['market_block_3', 'cypress_corner', 'mira_alley']);
export const StreetPositionSchema = z.object({
  x: z.number().finite().min(0).max(100),
  y: z.number().finite().min(0).max(100)
});
export const StreetMoveRequestSchema = StreetPositionSchema;
export const StreetPositionResultSchema = z.object({
  segmentId: StreetSpatialSegmentIdSchema,
  position: StreetPositionSchema
});

export type StreetSpatialSegmentId = z.infer<typeof StreetSpatialSegmentIdSchema>;
export type StreetPosition = z.infer<typeof StreetPositionSchema>;
export type StreetPositionResult = z.infer<typeof StreetPositionResultSchema>;

export interface StreetInteractionAnchor extends StreetPosition { radius: number; }
interface StreetWalkBounds { minX: number; maxX: number; minY: number; maxY: number; }
interface StreetSpatialDefinition {
  spawn: StreetPosition;
  walkBounds: StreetWalkBounds;
  actions: Record<string, StreetInteractionAnchor>;
}

const same = (x: number, y: number, radius = 8): StreetInteractionAnchor => ({ x, y, radius });

export const STREET_SPATIAL: Record<StreetSpatialSegmentId, StreetSpatialDefinition> = {
  market_block_3: {
    spawn: { x: 50, y: 57 },
    walkBounds: { minX: 3, maxX: 97, minY: 31, maxY: 76 },
    actions: {
      inspect_corner_store: same(80, 35), enter_corner_store: same(80, 35), shoplift_corner_store: same(80, 35), speak_corner_clerk: same(80, 35),
      deliver_el_camino: same(20, 35), inspect_el_camino: same(20, 35), enter_el_camino: same(20, 35),
      inspect_apartment: same(50, 35), enter_apartment: same(50, 35),
      inspect_service_alley: same(90, 73),
      travel_cypress_corner: same(4, 55, 9), travel_mira_alley: same(96, 55, 9)
    }
  },
  cypress_corner: {
    spawn: { x: 50, y: 57 },
    walkBounds: { minX: 3, maxX: 97, minY: 31, maxY: 76 },
    actions: {
      inspect_apartment: same(20, 35), enter_apartment: same(20, 35),
      talk_maya: same(62, 72), ask_maya_information: same(62, 72),
      travel_market_block_3: same(4, 55, 9), travel_mira_alley: same(96, 55, 9)
    }
  },
  mira_alley: {
    spawn: { x: 50, y: 57 },
    walkBounds: { minX: 3, maxX: 97, minY: 31, maxY: 76 },
    actions: {
      search_dumpster: same(26, 72),
      inspect_service_alley: same(50, 35),
      inspect_el_camino: same(79, 35),
      travel_market_block_3: same(4, 55, 9), travel_cypress_corner: same(96, 55, 9)
    }
  }
};

export function getStreetSpawnPosition(segmentId: StreetSpatialSegmentId): StreetPosition {
  return { ...STREET_SPATIAL[segmentId].spawn };
}

export function getStreetActionAnchor(segmentId: StreetSpatialSegmentId, actionId: string): StreetInteractionAnchor | null {
  return STREET_SPATIAL[segmentId].actions[actionId] ?? null;
}

export function streetDistance(a: StreetPosition, b: StreetPosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function isStreetActionWithinReach(segmentId: StreetSpatialSegmentId, position: StreetPosition, actionId: string): boolean {
  const anchor = getStreetActionAnchor(segmentId, actionId);
  return anchor !== null && streetDistance(position, anchor) <= anchor.radius;
}

export function isStreetPositionWalkable(segmentId: StreetSpatialSegmentId, position: StreetPosition): boolean {
  const bounds = STREET_SPATIAL[segmentId].walkBounds;
  return position.x >= bounds.minX && position.x <= bounds.maxX && position.y >= bounds.minY && position.y <= bounds.maxY;
}

export function clampStreetPosition(segmentId: StreetSpatialSegmentId, position: StreetPosition): StreetPosition {
  const bounds = STREET_SPATIAL[segmentId].walkBounds;
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, position.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, position.y))
  };
}
