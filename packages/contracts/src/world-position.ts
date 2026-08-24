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
export const StreetMoveResultSchema = z.object({
  segmentId: StreetSpatialSegmentIdSchema,
  position: StreetPositionSchema,
  requestedPosition: StreetPositionSchema,
  route: z.array(StreetPositionSchema).min(1),
  distance: z.number().finite().nonnegative()
});

export type StreetSpatialSegmentId = z.infer<typeof StreetSpatialSegmentIdSchema>;
export type StreetPosition = z.infer<typeof StreetPositionSchema>;
export type StreetPositionResult = z.infer<typeof StreetPositionResultSchema>;
export type StreetMoveResult = z.infer<typeof StreetMoveResultSchema>;

export type StreetNavigationNodeKind = 'sidewalk' | 'crossing' | 'entrance' | 'exit';
export interface StreetNavigationNode {
  id: string;
  kind: StreetNavigationNodeKind;
  position: StreetPosition;
}
export interface StreetNavigationEdge {
  from: string;
  to: string;
}
export interface StreetNavigationGraph {
  snapRadius: number;
  nodes: StreetNavigationNode[];
  edges: StreetNavigationEdge[];
}
export interface StreetNavigationTarget {
  position: StreetPosition;
  edge: StreetNavigationEdge;
  edgeProgress: number;
  distanceFromRequested: number;
}

export interface StreetInteractionAnchor extends StreetPosition { radius: number; }
interface StreetSpatialDefinition {
  spawn: StreetPosition;
  actions: Record<string, StreetInteractionAnchor>;
  navigation: StreetNavigationGraph;
}

const same = (x: number, y: number, radius = 8): StreetInteractionAnchor => ({ x, y, radius });
const nav = (id: string, x: number, y: number, kind: StreetNavigationNodeKind = 'sidewalk'): StreetNavigationNode => ({ id, kind, position: { x, y } });
const edge = (from: string, to: string): StreetNavigationEdge => ({ from, to });

export const STREET_SPATIAL: Record<StreetSpatialSegmentId, StreetSpatialDefinition> = {
  market_block_3: {
    spawn: { x: 50, y: 67 },
    actions: {
      inspect_corner_store: same(80, 35), enter_corner_store: same(80, 35), shoplift_corner_store: same(80, 35), speak_corner_clerk: same(80, 35),
      deliver_el_camino: same(20, 35), inspect_el_camino: same(20, 35), enter_el_camino: same(20, 35),
      inspect_apartment: same(50, 35), enter_apartment: same(50, 35),
      inspect_service_alley: same(90, 73),
      travel_cypress_corner: same(4, 55, 9), travel_mira_alley: same(96, 55, 9)
    },
    navigation: {
      snapRadius: 13,
      nodes: [
        nav('north_west', 8, 42), nav('el_camino', 20, 42, 'entrance'), nav('north_mid', 35, 42), nav('apartments_crossing', 50, 42, 'crossing'), nav('north_east_mid', 65, 42), nav('mercado', 80, 42, 'entrance'), nav('north_east', 92, 42),
        nav('south_west', 8, 67), nav('south_mid_west', 28, 67), nav('crossing_south', 50, 67, 'crossing'), nav('south_mid_east', 72, 67), nav('south_east', 92, 67),
        nav('west_exit', 4, 55, 'exit'), nav('east_exit', 96, 55, 'exit'), nav('service_alley', 90, 73, 'entrance'), nav('service_south', 91, 96, 'exit'),

        nav('dorado_north', 59, 4, 'exit'), nav('dorado_upper', 59, 22), nav('dorado_north_cross', 59, 42, 'crossing'), nav('dorado_south_cross', 59, 67, 'crossing'), nav('dorado_lower', 59, 82), nav('dorado_south', 59, 96, 'exit'),

        nav('cortez_southwest', 4, 94, 'exit'), nav('cortez_lower', 24, 78), nav('cortez_market_south', 39, 64, 'crossing'), nav('cortez_market_north', 45, 47, 'crossing'), nav('cortez_upper', 56, 28), nav('cortez_northeast', 66, 5, 'exit'),

        nav('cypress_northeast', 96, 18, 'exit'), nav('cypress_upper', 84, 34), nav('cypress_market_north', 77, 47, 'crossing'), nav('cypress_market_south', 70, 64, 'crossing'), nav('cypress_lower', 66, 82), nav('cypress_south', 64, 96, 'exit')
      ],
      edges: [
        edge('north_west', 'el_camino'), edge('el_camino', 'north_mid'), edge('north_mid', 'apartments_crossing'), edge('apartments_crossing', 'dorado_north_cross'), edge('dorado_north_cross', 'north_east_mid'), edge('north_east_mid', 'mercado'), edge('mercado', 'north_east'),
        edge('south_west', 'south_mid_west'), edge('south_mid_west', 'cortez_market_south'), edge('cortez_market_south', 'crossing_south'), edge('crossing_south', 'dorado_south_cross'), edge('dorado_south_cross', 'cypress_market_south'), edge('cypress_market_south', 'south_mid_east'), edge('south_mid_east', 'south_east'),
        edge('apartments_crossing', 'crossing_south'), edge('west_exit', 'north_west'), edge('west_exit', 'south_west'), edge('east_exit', 'north_east'), edge('east_exit', 'south_east'), edge('south_east', 'service_alley'), edge('service_alley', 'service_south'),

        edge('dorado_north', 'dorado_upper'), edge('dorado_upper', 'dorado_north_cross'), edge('dorado_north_cross', 'dorado_south_cross'), edge('dorado_south_cross', 'dorado_lower'), edge('dorado_lower', 'dorado_south'),

        edge('cortez_southwest', 'cortez_lower'), edge('cortez_lower', 'cortez_market_south'), edge('cortez_market_south', 'cortez_market_north'), edge('cortez_market_north', 'cortez_upper'), edge('cortez_upper', 'cortez_northeast'),
        edge('cortez_market_north', 'north_mid'), edge('cortez_market_north', 'apartments_crossing'), edge('cortez_market_south', 'south_mid_west'),

        edge('cypress_northeast', 'cypress_upper'), edge('cypress_upper', 'cypress_market_north'), edge('cypress_market_north', 'cypress_market_south'), edge('cypress_market_south', 'cypress_lower'), edge('cypress_lower', 'cypress_south'),
        edge('cypress_market_north', 'mercado'), edge('cypress_market_north', 'north_east_mid'), edge('cypress_market_south', 'south_mid_east')
      ]
    }
  },
  cypress_corner: {
    spawn: { x: 50, y: 67 },
    actions: {
      inspect_apartment: same(20, 35), enter_apartment: same(20, 35),
      talk_maya: same(62, 72), ask_maya_information: same(62, 72),
      travel_market_block_3: same(4, 55, 9), travel_mira_alley: same(96, 55, 9)
    },
    navigation: {
      snapRadius: 14,
      nodes: [
        nav('north_west', 8, 42), nav('apartments', 20, 42, 'entrance'), nav('park_north', 42, 42), nav('crossing_north', 50, 42, 'crossing'), nav('shops', 78, 42, 'entrance'), nav('north_east', 92, 42),
        nav('south_west', 8, 67), nav('south_mid_west', 30, 67), nav('crossing_south', 50, 67, 'crossing'), nav('maya', 62, 72, 'entrance'), nav('south_mid_east', 75, 67), nav('south_east', 92, 67),
        nav('west_exit', 4, 55, 'exit'), nav('east_exit', 96, 55, 'exit')
      ],
      edges: [
        edge('north_west', 'apartments'), edge('apartments', 'park_north'), edge('park_north', 'crossing_north'), edge('crossing_north', 'shops'), edge('shops', 'north_east'),
        edge('south_west', 'south_mid_west'), edge('south_mid_west', 'crossing_south'), edge('crossing_south', 'maya'), edge('maya', 'south_mid_east'), edge('south_mid_east', 'south_east'),
        edge('crossing_north', 'crossing_south'), edge('west_exit', 'north_west'), edge('west_exit', 'south_west'), edge('east_exit', 'north_east'), edge('east_exit', 'south_east')
      ]
    }
  },
  mira_alley: {
    spawn: { x: 50, y: 67 },
    actions: {
      search_dumpster: same(26, 72),
      inspect_service_alley: same(50, 35),
      inspect_el_camino: same(79, 35),
      travel_market_block_3: same(4, 55, 9), travel_cypress_corner: same(96, 55, 9)
    },
    navigation: {
      snapRadius: 15,
      nodes: [
        nav('left_north', 35, 35), nav('service', 50, 35, 'entrance'), nav('el_camino', 79, 35, 'entrance'),
        nav('left_mid', 35, 52), nav('center_mid', 50, 52, 'crossing'), nav('right_mid', 65, 52),
        nav('dumpster', 26, 72, 'entrance'), nav('left_south', 35, 70), nav('center_south', 50, 70), nav('right_south', 65, 70), nav('right_service', 78, 70),
        nav('west_exit', 4, 55, 'exit'), nav('east_exit', 96, 55, 'exit')
      ],
      edges: [
        edge('left_north', 'service'), edge('service', 'el_camino'), edge('left_north', 'left_mid'), edge('service', 'center_mid'), edge('el_camino', 'right_mid'),
        edge('left_mid', 'center_mid'), edge('center_mid', 'right_mid'), edge('left_mid', 'left_south'), edge('center_mid', 'center_south'), edge('right_mid', 'right_south'),
        edge('dumpster', 'left_south'), edge('left_south', 'center_south'), edge('center_south', 'right_south'), edge('right_south', 'right_service'),
        edge('west_exit', 'left_mid'), edge('east_exit', 'right_mid')
      ]
    }
  }
};

export function getStreetSpawnPosition(segmentId: StreetSpatialSegmentId): StreetPosition {
  return { ...STREET_SPATIAL[segmentId].spawn };
}

export function getStreetActionAnchor(segmentId: StreetSpatialSegmentId, actionId: string): StreetInteractionAnchor | null {
  return STREET_SPATIAL[segmentId].actions[actionId] ?? null;
}

export function getStreetNavigationGraph(segmentId: StreetSpatialSegmentId): StreetNavigationGraph {
  return STREET_SPATIAL[segmentId].navigation;
}

export function streetDistance(a: StreetPosition, b: StreetPosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function isStreetActionWithinReach(segmentId: StreetSpatialSegmentId, position: StreetPosition, actionId: string): boolean {
  const anchor = getStreetActionAnchor(segmentId, actionId);
  return anchor !== null && streetDistance(position, anchor) <= anchor.radius;
}

export function resolveStreetNavigationTarget(segmentId: StreetSpatialSegmentId, requested: StreetPosition): StreetNavigationTarget | null {
  const graph = STREET_SPATIAL[segmentId].navigation;
  const target = projectOntoGraph(graph, requested);
  return target && target.distanceFromRequested <= graph.snapRadius ? target : null;
}

export function isStreetPositionWalkable(segmentId: StreetSpatialSegmentId, position: StreetPosition): boolean {
  return resolveStreetNavigationTarget(segmentId, position) !== null;
}

export function clampStreetPosition(segmentId: StreetSpatialSegmentId, position: StreetPosition): StreetPosition {
  return resolveStreetNavigationTarget(segmentId, position)?.position ?? getStreetSpawnPosition(segmentId);
}

export function getStreetRoute(segmentId: StreetSpatialSegmentId, start: StreetPosition, requested: StreetPosition): StreetMoveResult | null {
  const graph = STREET_SPATIAL[segmentId].navigation;
  const startTarget = projectOntoGraph(graph, start);
  const target = resolveStreetNavigationTarget(segmentId, requested);
  if (!startTarget || !target) return null;

  const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
  const candidates: RouteCandidate[] = [];
  const startOffset = streetDistance(start, startTarget.position);

  if (sameEdge(startTarget.edge, target.edge)) {
    const edgeLength = navigationEdgeLength(nodeById, startTarget.edge);
    if (edgeLength !== null) {
      candidates.push({
        distance: startOffset + Math.abs(startTarget.edgeProgress - target.edgeProgress) * edgeLength,
        nodeIds: [],
        direct: true
      });
    }
  }

  const startEndpoints = [startTarget.edge.from, startTarget.edge.to];
  const targetEndpoints = [target.edge.from, target.edge.to];
  for (const startEndpoint of startEndpoints) {
    const startNode = nodeById.get(startEndpoint);
    if (!startNode) continue;
    for (const targetEndpoint of targetEndpoints) {
      const targetNode = nodeById.get(targetEndpoint);
      if (!targetNode) continue;
      const base = shortestPath(graph, startEndpoint, targetEndpoint);
      if (!base) continue;
      candidates.push({
        distance: startOffset + streetDistance(startTarget.position, startNode.position) + base.distance + streetDistance(targetNode.position, target.position),
        nodeIds: base.nodeIds,
        direct: false
      });
    }
  }

  const best = candidates.sort((a, b) => a.distance - b.distance)[0];
  if (!best) return null;

  const route: StreetPosition[] = [];
  pushDistinct(route, start);
  pushDistinct(route, startTarget.position);
  if (!best.direct) {
    for (const id of best.nodeIds) {
      const node = nodeById.get(id);
      if (node) pushDistinct(route, node.position);
    }
  }
  pushDistinct(route, target.position);

  let distance = 0;
  for (let index = 1; index < route.length; index += 1) distance += streetDistance(route[index - 1]!, route[index]!);

  return {
    segmentId,
    requestedPosition: { ...requested },
    position: { ...target.position },
    route,
    distance
  };
}

interface RouteCandidate {
  distance: number;
  nodeIds: string[];
  direct: boolean;
}

function projectOntoGraph(graph: StreetNavigationGraph, requested: StreetPosition): StreetNavigationTarget | null {
  const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
  let best: StreetNavigationTarget | null = null;
  for (const connection of graph.edges) {
    const from = nodeById.get(connection.from);
    const to = nodeById.get(connection.to);
    if (!from || !to) continue;
    const projection = projectOntoSegment(requested, from.position, to.position);
    const distanceFromRequested = streetDistance(requested, projection.position);
    if (!best || distanceFromRequested < best.distanceFromRequested) {
      best = { position: projection.position, edge: connection, edgeProgress: projection.progress, distanceFromRequested };
    }
  }
  return best;
}

function projectOntoSegment(point: StreetPosition, from: StreetPosition, to: StreetPosition) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return { position: { ...from }, progress: 0 };
  const raw = ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared;
  const progress = Math.max(0, Math.min(1, raw));
  return {
    position: { x: from.x + dx * progress, y: from.y + dy * progress },
    progress
  };
}

function sameEdge(a: StreetNavigationEdge, b: StreetNavigationEdge) {
  return (a.from === b.from && a.to === b.to) || (a.from === b.to && a.to === b.from);
}

function navigationEdgeLength(nodeById: Map<string, StreetNavigationNode>, connection: StreetNavigationEdge) {
  const from = nodeById.get(connection.from);
  const to = nodeById.get(connection.to);
  return from && to ? streetDistance(from.position, to.position) : null;
}

function pushDistinct(route: StreetPosition[], position: StreetPosition) {
  const previous = route[route.length - 1];
  if (!previous || streetDistance(previous, position) > 0.25) route.push({ ...position });
}

function shortestPath(graph: StreetNavigationGraph, startId: string, targetId: string): { nodeIds: string[]; distance: number } | null {
  if (startId === targetId) return { nodeIds: [startId], distance: 0 };
  const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
  const adjacency = new Map<string, Array<{ id: string; weight: number }>>();
  for (const node of graph.nodes) adjacency.set(node.id, []);
  for (const connection of graph.edges) {
    const from = nodeById.get(connection.from);
    const to = nodeById.get(connection.to);
    if (!from || !to) continue;
    const weight = streetDistance(from.position, to.position);
    adjacency.get(from.id)?.push({ id: to.id, weight });
    adjacency.get(to.id)?.push({ id: from.id, weight });
  }

  const unvisited = new Set(graph.nodes.map(node => node.id));
  const distances = new Map(graph.nodes.map(node => [node.id, Number.POSITIVE_INFINITY]));
  const previous = new Map<string, string>();
  distances.set(startId, 0);

  while (unvisited.size) {
    let current: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;
    for (const id of unvisited) {
      const distance = distances.get(id) ?? Number.POSITIVE_INFINITY;
      if (distance < currentDistance) { current = id; currentDistance = distance; }
    }
    if (!current || currentDistance === Number.POSITIVE_INFINITY) break;
    if (current === targetId) break;
    unvisited.delete(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!unvisited.has(neighbor.id)) continue;
      const candidate = currentDistance + neighbor.weight;
      if (candidate < (distances.get(neighbor.id) ?? Number.POSITIVE_INFINITY)) {
        distances.set(neighbor.id, candidate);
        previous.set(neighbor.id, current);
      }
    }
  }

  const total = distances.get(targetId) ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(total)) return null;
  const nodeIds = [targetId];
  let cursor = targetId;
  while (cursor !== startId) {
    const parent = previous.get(cursor);
    if (!parent) return null;
    nodeIds.push(parent);
    cursor = parent;
  }
  return { nodeIds: nodeIds.reverse(), distance: total };
}
