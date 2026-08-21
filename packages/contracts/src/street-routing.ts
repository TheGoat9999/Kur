import {
  getStreetRoute,
  streetDistance,
  type StreetMoveResult,
  type StreetPosition,
  type StreetSpatialSegmentId
} from './world-position.js';

export const STREET_INTERACTION_CORRIDOR_RADIUS = 7.5;

/**
 * Refines the authored navigation graph so pointer destinations remain where the
 * player actually clicked instead of visibly snapping to the graph centreline.
 * The graph still owns routing, but the final short step is allowed inside a
 * narrow pedestrian corridor around that graph.
 */
export function getResponsiveStreetRoute(
  segmentId: StreetSpatialSegmentId,
  start: StreetPosition,
  requested: StreetPosition,
  corridorRadius = STREET_INTERACTION_CORRIDOR_RADIUS
): StreetMoveResult | null {
  const base = getStreetRoute(segmentId, start, requested);
  if (!base) return null;

  const offset = streetDistance(base.position, requested);
  if (offset > corridorRadius) return null;

  const route = base.route.map(point => ({ ...point }));
  const previous = route[route.length - 1];
  if (!previous || streetDistance(previous, requested) > 0.25) route.push({ ...requested });

  return {
    ...base,
    requestedPosition: { ...requested },
    position: { ...requested },
    route,
    distance: base.distance + offset
  };
}

export function isResponsiveStreetPositionWalkable(
  segmentId: StreetSpatialSegmentId,
  position: StreetPosition,
  corridorRadius = STREET_INTERACTION_CORRIDOR_RADIUS
): boolean {
  return getResponsiveStreetRoute(segmentId, position, position, corridorRadius) !== null;
}
