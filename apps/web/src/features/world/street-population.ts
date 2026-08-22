import type { StreetObjectId, StreetSegmentId } from '@sol-dorado/contracts';
import type { WorldCharacterDirection, WorldCharacterVisual } from '../../components/WorldCharacter';
import { visualFromSeed } from '../../components/WorldCharacter';
import type { WorldVehicleHeading, WorldVehicleService, WorldVehicleType } from '../../components/WorldVehicle';

export interface StreetNpcSlot {
  id: string;
  x: number;
  y: number;
  toX?: number;
  toY?: number;
  durationSeconds?: number;
  delaySeconds?: number;
  direction?: WorldCharacterDirection;
  patrol?: boolean;
  namedObjectId?: StreetObjectId;
  visual?: WorldCharacterVisual;
}

export interface StreetVehicleSlot {
  id: string;
  x: number;
  y: number;
  toX?: number;
  durationSeconds?: number;
  delaySeconds?: number;
  type: WorldVehicleType;
  heading: WorldVehicleHeading;
  color: string;
  widthPercent?: number;
  service?: WorldVehicleService;
  serviceLabel?: string;
  parked?: boolean;
}

export interface StreetPopulationDefinition {
  npcs: StreetNpcSlot[];
  vehicles: StreetVehicleSlot[];
}

type StreetNpcMotion = Partial<Pick<StreetNpcSlot, 'toX' | 'toY' | 'durationSeconds' | 'delaySeconds' | 'direction' | 'patrol'>>;
type StreetVehiclePresentation = Partial<Pick<StreetVehicleSlot, 'widthPercent' | 'service' | 'serviceLabel' | 'parked'>>;

const MAYA_VISUAL: WorldCharacterVisual = {
  ...visualFromSeed('maya-rojas'),
  body: 'female',
  hairStyle: 'long',
  hairColor: '#3a241d',
  skinColor: '#c98e65',
  topColor: '#705f87',
  bottomColor: '#303943',
  accentColor: '#d8b86d'
};

export const STREET_POPULATION: Record<StreetSegmentId, StreetPopulationDefinition> = {
  market_block_3: {
    npcs: [
      npc('market-west-north', 14.2, 37.3, 'market-west-north', patrol(27.5, 37.3, 13, -2, 'east')),
      npc('market-east-north', 86.7, 37.1, 'market-east-north', patrol(74.5, 37.1, 15, -7, 'west')),
      npc('market-office-south', 35.8, 71.4, 'market-office-south', patrol(48.5, 71.4, 14, -5, 'east')),
      npc('market-cafe-north', 51.5, 37.2, 'market-cafe-north', patrol(60.5, 37.2, 12, -8, 'east')),
      npc('market-bodega-south', 77.2, 71.7, 'market-bodega-south', patrol(65.5, 71.7, 16, -11, 'west')),
      npc('market-walker-a', -5, 72, 'market-walker-a', { toX: 105, toY: 72, durationSeconds: 34, delaySeconds: -3, direction: 'east' }),
      npc('market-walker-b', 105, 38, 'market-walker-b', { toX: -5, toY: 38, durationSeconds: 37, delaySeconds: -11, direction: 'west' }),
      npc('market-walker-c', -12, 72, 'market-walker-c', { toX: 112, toY: 72, durationSeconds: 43, delaySeconds: -24, direction: 'east' }),
      npc('market-walker-d', 112, 38, 'market-walker-d', { toX: -12, toY: 38, durationSeconds: 46, delaySeconds: -31, direction: 'west' })
    ],
    vehicles: [
      vehicle('market-parked-1', 57.8, 82.2, 'hatchback', 'east', '#526c73', { parked: true, widthPercent: 8.2 }),
      vehicle('market-parked-2', 69.7, 82.2, 'coupe', 'west', '#6d5a52', { parked: true, widthPercent: 8.0 }),
      movingVehicle('market-traffic-east-a', -12, 52.0, 112, 18, -8, 'sedan', 'east', '#354e63'),
      movingVehicle('market-traffic-west-a', 112, 58.2, -12, 22, -15, 'hatchback', 'west', '#66574f'),
      movingVehicle('market-traffic-east-b', -14, 52.6, 114, 25, -20, 'coupe', 'east', '#4f5963'),
      movingVehicle('market-traffic-west-b', 116, 58.7, -16, 29, -4, 'suv', 'west', '#425d66'),
      movingVehicle('market-taxi', -18, 51.7, 118, 31, -22, 'sedan', 'east', '#c7a146', { service: 'taxi' })
    ]
  },
  cypress_corner: {
    npcs: [
      { ...npc('maya-rojas-visual', 62, 72, 'maya-rojas'), namedObjectId: 'maya_rojas', visual: MAYA_VISUAL, direction: 'south' },
      npc('cypress-park', 37.5, 36.9, 'cypress-park', patrol(45.5, 36.9, 15, -4, 'east')),
      npc('cypress-shops', 91.7, 36.9, 'cypress-shops', patrol(83.0, 36.9, 14, -9, 'west')),
      npc('cypress-bench', 49.5, 37.1, 'cypress-bench'),
      npc('cypress-office-south', 82.2, 71.6, 'cypress-office-south', patrol(70.5, 71.6, 17, -12, 'west')),
      npc('cypress-walker-a', -6, 72, 'cypress-walker-a', { toX: 106, toY: 72, durationSeconds: 38, delaySeconds: -5, direction: 'east' }),
      npc('cypress-walker-b', 106, 38, 'cypress-walker-b', { toX: -6, toY: 38, durationSeconds: 42, delaySeconds: -19, direction: 'west' }),
      npc('cypress-walker-c', -13, 72, 'cypress-walker-c', { toX: 113, toY: 72, durationSeconds: 49, delaySeconds: -32, direction: 'east' })
    ],
    vehicles: [
      vehicle('cypress-parked-1', 54.0, 82.0, 'sedan', 'east', '#647178', { parked: true, widthPercent: 8.2 }),
      vehicle('cypress-parked-2', 66.0, 82.0, 'suv', 'west', '#77594e', { parked: true, widthPercent: 8.6 }),
      movingVehicle('cypress-taxi', 114, 58.1, -14, 22, -11, 'sedan', 'west', '#c7a146', { service: 'taxi' }),
      movingVehicle('cypress-traffic-east', -14, 52.1, 114, 26, -7, 'suv', 'east', '#52656b'),
      movingVehicle('cypress-traffic-west', 116, 58.6, -16, 28, -21, 'coupe', 'west', '#6d635c'),
      movingVehicle('cypress-traffic-east-b', -18, 52.6, 118, 32, -17, 'hatchback', 'east', '#485e68'),
      movingVehicle('cypress-traffic-west-b', 120, 57.7, -20, 35, -5, 'sedan', 'west', '#5a655d')
    ]
  },
  mira_alley: {
    npcs: [
      npc('alley-service', 32.1, 37.1, 'alley-service', patrol(39.5, 37.1, 14, -3, 'east')),
      npc('alley-yard', 58.3, 72.1, 'alley-yard', patrol(68.0, 72.1, 15, -8, 'east')),
      npc('alley-loader', 42.5, 71.7, 'alley-loader', patrol(50.5, 71.7, 12, -6, 'east')),
      npc('alley-walker-a', 106, 72, 'alley-walker-a', { toX: -6, toY: 72, durationSeconds: 39, delaySeconds: -2, direction: 'west' }),
      npc('alley-walker-b', -7, 38, 'alley-walker-b', { toX: 107, toY: 38, durationSeconds: 44, delaySeconds: -17, direction: 'east' }),
      npc('alley-walker-c', -14, 72, 'alley-walker-c', { toX: 114, toY: 72, durationSeconds: 52, delaySeconds: -35, direction: 'east' })
    ],
    vehicles: [
      vehicle('alley-parked-van', 37.0, 82.2, 'van', 'east', '#697579', { parked: true, widthPercent: 10.4, service: 'delivery', serviceLabel: 'DORADO' }),
      vehicle('alley-parked-pickup', 61.0, 82.2, 'pickup', 'west', '#6e5c4f', { parked: true, widthPercent: 9.2 }),
      movingVehicle('alley-delivery-pass', -14, 52.0, 114, 27, -16, 'van', 'east', '#57676c', { widthPercent: 10.8, service: 'delivery', serviceLabel: 'EXPRESS' }),
      movingVehicle('alley-truck-pass', 116, 58.7, -16, 33, -8, 'truck', 'west', '#5a6467', { widthPercent: 12.2 }),
      movingVehicle('alley-traffic-east', -16, 52.6, 116, 31, -24, 'pickup', 'east', '#625449'),
      movingVehicle('alley-traffic-west', 118, 58.0, -18, 36, -19, 'suv', 'west', '#4f6267')
    ]
  }
};

function npc(id: string, x: number, y: number, seed: string, overrides: StreetNpcMotion = {}): StreetNpcSlot {
  return { id, x, y, visual: visualFromSeed(seed), ...overrides };
}

function patrol(toX: number, toY: number, durationSeconds: number, delaySeconds: number, direction: WorldCharacterDirection): StreetNpcMotion {
  return { toX, toY, durationSeconds, delaySeconds, direction, patrol: true };
}

function vehicle(id: string, x: number, y: number, type: WorldVehicleType, heading: WorldVehicleHeading, color: string, presentation: StreetVehiclePresentation = {}): StreetVehicleSlot {
  return { id, x, y, type, heading, color, widthPercent: 9.6, ...presentation };
}

function movingVehicle(
  id: string,
  x: number,
  y: number,
  toX: number,
  durationSeconds: number,
  delaySeconds: number,
  type: WorldVehicleType,
  heading: WorldVehicleHeading,
  color: string,
  presentation: StreetVehiclePresentation = {}
): StreetVehicleSlot {
  return { ...vehicle(id, x, y, type, heading, color, presentation), toX, durationSeconds, delaySeconds };
}
