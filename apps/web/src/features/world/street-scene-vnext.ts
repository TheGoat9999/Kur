import type { StreetSegmentId } from '@sol-dorado/contracts';
import type { StreetPosition } from '@sol-dorado/contracts/world-position';

export type StreetRuntimeActorDirection = 'north' | 'south' | 'east' | 'west';

export interface StreetRuntimePath {
  id: string;
  points: StreetPosition[];
  loop?: boolean;
}

export interface StreetRuntimePedestrian {
  id: string;
  pathId: string;
  durationSeconds: number;
  delaySeconds: number;
  spriteVariant: 1 | 2 | 3 | 4;
  reverse?: boolean;
}

export interface StreetRuntimeVehicle {
  id: string;
  laneId: string;
  durationSeconds: number;
  delaySeconds: number;
  type: 'sedan' | 'suv' | 'taxi';
  reverse?: boolean;
}

export interface StreetSceneVNextDefinition {
  id: StreetSegmentId;
  enabled: boolean;
  backgroundImage: string;
  foregroundImage?: string;
  pedestrianPaths: StreetRuntimePath[];
  vehicleLanes: StreetRuntimePath[];
  pedestrians: StreetRuntimePedestrian[];
  vehicles: StreetRuntimeVehicle[];
}

const path = (id: string, points: StreetPosition[], loop = true): StreetRuntimePath => ({ id, points, loop });

export const STREET_SCENE_VNEXT: Partial<Record<StreetSegmentId, StreetSceneVNextDefinition>> = {
  market_block_3: {
    id: 'market_block_3',
    enabled: true,
    backgroundImage: '/assets/world/vnext/market-street-block-3.webp',
    foregroundImage: '/assets/world/vnext/market-street-block-3-foreground.svg',
    pedestrianPaths: [
      path('north-sidewalk', [{ x: 4, y: 38 }, { x: 18, y: 38 }, { x: 34, y: 38.2 }, { x: 49, y: 38 }, { x: 66, y: 38 }, { x: 82, y: 38.2 }, { x: 96, y: 38 }]),
      path('south-sidewalk', [{ x: 4, y: 69 }, { x: 20, y: 69.1 }, { x: 36, y: 69 }, { x: 50, y: 68.8 }, { x: 67, y: 69 }, { x: 83, y: 69.1 }, { x: 96, y: 69 }]),
      path('crosswalk', [{ x: 50, y: 38 }, { x: 50, y: 44 }, { x: 50, y: 52 }, { x: 50, y: 60 }, { x: 50, y: 69 }], false),
      path('service-walk', [{ x: 79, y: 69 }, { x: 86, y: 72 }, { x: 91, y: 75 }, { x: 94, y: 84 }], false)
    ],
    vehicleLanes: [
      path('eastbound', [{ x: -12, y: 51.5 }, { x: 20, y: 51.2 }, { x: 49, y: 51.4 }, { x: 73, y: 51.3 }, { x: 112, y: 51.4 }], false),
      path('westbound', [{ x: 112, y: 58.1 }, { x: 82, y: 58.0 }, { x: 51, y: 58.2 }, { x: 24, y: 58.0 }, { x: -12, y: 58.1 }], false)
    ],
    pedestrians: [
      { id: 'market-vnext-ped-1', pathId: 'north-sidewalk', durationSeconds: 31, delaySeconds: -4, spriteVariant: 1 },
      { id: 'market-vnext-ped-2', pathId: 'north-sidewalk', durationSeconds: 37, delaySeconds: -18, spriteVariant: 2, reverse: true },
      { id: 'market-vnext-ped-3', pathId: 'south-sidewalk', durationSeconds: 34, delaySeconds: -11, spriteVariant: 3 },
      { id: 'market-vnext-ped-4', pathId: 'south-sidewalk', durationSeconds: 42, delaySeconds: -27, spriteVariant: 4, reverse: true },
      { id: 'market-vnext-ped-cross', pathId: 'crosswalk', durationSeconds: 12, delaySeconds: -5, spriteVariant: 2 }
    ],
    vehicles: [
      { id: 'market-vnext-car-1', laneId: 'eastbound', durationSeconds: 18, delaySeconds: -3, type: 'sedan' },
      { id: 'market-vnext-car-2', laneId: 'westbound', durationSeconds: 23, delaySeconds: -11, type: 'suv' },
      { id: 'market-vnext-car-3', laneId: 'eastbound', durationSeconds: 29, delaySeconds: -17, type: 'taxi' },
      { id: 'market-vnext-car-4', laneId: 'westbound', durationSeconds: 33, delaySeconds: -25, type: 'sedan' }
    ]
  }
};

export function getStreetSceneVNext(segmentId: StreetSegmentId) {
  const definition = STREET_SCENE_VNEXT[segmentId];
  return definition?.enabled ? definition : null;
}
