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
}

export interface StreetPopulationDefinition {
  npcs: StreetNpcSlot[];
  vehicles: StreetVehicleSlot[];
}

type StreetNpcMotion = Partial<Pick<StreetNpcSlot, 'toX' | 'toY' | 'durationSeconds' | 'delaySeconds' | 'direction'>>;
type StreetVehiclePresentation = Partial<Pick<StreetVehicleSlot, 'widthPercent' | 'service' | 'serviceLabel'>>;

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
      npc('market-west-north', 14.2, 37.3, 'market-west-north'),
      npc('market-east-north', 86.7, 37.1, 'market-east-north'),
      npc('market-office-south', 35.8, 71.4, 'market-office-south'),
      npc('market-cafe-north', 51.5, 37.2, 'market-cafe-north'),
      npc('market-walker-a', 17, 72, 'market-walker-a', { toX: 41, toY: 72, durationSeconds: 16, delaySeconds: -3 }),
      npc('market-walker-b', 82, 38, 'market-walker-b', { toX: 58, toY: 38, durationSeconds: 19, delaySeconds: -9 }),
      npc('market-walker-c', 43, 72, 'market-walker-c', { toX: 69, toY: 72, durationSeconds: 21, delaySeconds: -12 }),
      npc('market-walker-d', 71, 38, 'market-walker-d', { toX: 47, toY: 38, durationSeconds: 17, delaySeconds: -6 })
    ],
    vehicles: [
      vehicle('market-car-1', 32.2, 47.0, 'sedan', 'east', '#526c73'),
      vehicle('market-car-2', 64.7, 62.0, 'hatchback', 'west', '#6d5a52'),
      vehicle('market-car-3', 77.6, 47.4, 'suv', 'east', '#425d66'),
      vehicle('market-car-4', 14.7, 62.0, 'coupe', 'west', '#686f68'),
      { ...vehicle('market-traffic-east-a', -11, 53.2, 'sedan', 'east', '#354e63'), toX: 111, durationSeconds: 18, delaySeconds: -8 },
      { ...vehicle('market-traffic-west-a', 111, 56.7, 'hatchback', 'west', '#66574f'), toX: -11, durationSeconds: 22, delaySeconds: -15 },
      { ...vehicle('market-traffic-east-b', -12, 53.8, 'coupe', 'east', '#4f5963'), toX: 112, durationSeconds: 25, delaySeconds: -20 }
    ]
  },
  cypress_corner: {
    npcs: [
      { ...npc('maya-rojas-visual', 62, 72, 'maya-rojas'), namedObjectId: 'maya_rojas', visual: MAYA_VISUAL, direction: 'south' },
      npc('cypress-park', 37.5, 36.9, 'cypress-park'),
      npc('cypress-shops', 91.7, 36.9, 'cypress-shops'),
      npc('cypress-bench', 49.5, 37.1, 'cypress-bench'),
      npc('cypress-walker-a', 20, 72, 'cypress-walker-a', { toX: 43, toY: 72, durationSeconds: 18, delaySeconds: -5 }),
      npc('cypress-walker-b', 78, 38, 'cypress-walker-b', { toX: 56, toY: 38, durationSeconds: 20, delaySeconds: -13 }),
      npc('cypress-walker-c', 45, 72, 'cypress-walker-c', { toX: 74, toY: 72, durationSeconds: 23, delaySeconds: -17 })
    ],
    vehicles: [
      vehicle('cypress-car-1', 20.5, 47.7, 'hatchback', 'east', '#647178'),
      vehicle('cypress-car-2', 45.1, 61.7, 'sedan', 'west', '#77594e'),
      vehicle('cypress-car-3', 80.5, 47.1, 'suv', 'east', '#485e68'),
      vehicle('cypress-car-4', 88.4, 61.9, 'sedan', 'west', '#5a655d'),
      { ...vehicle('cypress-taxi', 111, 56.5, 'sedan', 'west', '#c7a146', { service: 'taxi' }), toX: -11, durationSeconds: 22, delaySeconds: -11 },
      { ...vehicle('cypress-traffic-east', -12, 53.3, 'suv', 'east', '#52656b'), toX: 112, durationSeconds: 26, delaySeconds: -7 },
      { ...vehicle('cypress-traffic-west', 112, 56.9, 'coupe', 'west', '#6d635c'), toX: -12, durationSeconds: 28, delaySeconds: -21 }
    ]
  },
  mira_alley: {
    npcs: [
      npc('alley-service', 32.1, 37.1, 'alley-service'),
      npc('alley-yard', 58.3, 72.1, 'alley-yard'),
      npc('alley-walker-a', 73, 72, 'alley-walker-a', { toX: 52, toY: 72, durationSeconds: 15, delaySeconds: -2 }),
      npc('alley-walker-b', 18, 38, 'alley-walker-b', { toX: 37, toY: 38, durationSeconds: 18, delaySeconds: -10 }),
      npc('alley-walker-c', 47, 72, 'alley-walker-c', { toX: 67, toY: 72, durationSeconds: 21, delaySeconds: -14 })
    ],
    vehicles: [
      vehicle('alley-van', 44.0, 47.7, 'van', 'east', '#697579', { widthPercent: 11.2, service: 'delivery', serviceLabel: 'DORADO' }),
      vehicle('alley-car-1', 68.8, 61.7, 'suv', 'west', '#4f6267'),
      vehicle('alley-car-2', 13.3, 47.4, 'pickup', 'east', '#6e5c4f'),
      { ...vehicle('alley-delivery-pass', -12, 53.4, 'van', 'east', '#57676c', { widthPercent: 10.8, service: 'delivery', serviceLabel: 'EXPRESS' }), toX: 112, durationSeconds: 27, delaySeconds: -16 },
      { ...vehicle('alley-truck-pass', 112, 56.9, 'truck', 'west', '#5a6467', { widthPercent: 12.2 }), toX: -12, durationSeconds: 33, delaySeconds: -8 },
      { ...vehicle('alley-traffic-east', -12, 53.8, 'pickup', 'east', '#625449'), toX: 112, durationSeconds: 31, delaySeconds: -24 }
    ]
  }
};

function npc(id: string, x: number, y: number, seed: string, overrides: StreetNpcMotion = {}): StreetNpcSlot {
  return { id, x, y, visual: visualFromSeed(seed), ...overrides };
}

function vehicle(id: string, x: number, y: number, type: WorldVehicleType, heading: WorldVehicleHeading, color: string, presentation: StreetVehiclePresentation = {}): StreetVehicleSlot {
  return { id, x, y, type, heading, color, widthPercent: 9.6, ...presentation };
}
