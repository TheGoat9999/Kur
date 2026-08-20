import type { StreetObjectId, StreetSegmentId } from '@sol-dorado/contracts';
import type { WorldCharacterDirection, WorldCharacterVisual } from '../../components/WorldCharacter';
import { visualFromSeed } from '../../components/WorldCharacter';
import type { WorldVehicleHeading, WorldVehicleType } from '../../components/WorldVehicle';

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
  serviceLabel?: string;
}

export interface StreetPopulationDefinition {
  npcs: StreetNpcSlot[];
  vehicles: StreetVehicleSlot[];
}

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
      npc('market-walker-a', 18, 72, 'market-walker-a', { toX: 40, toY: 72, durationSeconds: 12, delaySeconds: -3, direction: 'east' }),
      npc('market-walker-b', 80, 38, 'market-walker-b', { toX: 60, toY: 38, durationSeconds: 15, delaySeconds: -9, direction: 'west' })
    ],
    vehicles: [
      vehicle('market-car-1', 32.2, 47.0, 'sedan', 'east', '#526c73'),
      vehicle('market-car-2', 64.7, 62.0, 'hatchback', 'west', '#6d5a52'),
      vehicle('market-car-3', 77.6, 47.4, 'suv', 'east', '#425d66'),
      vehicle('market-car-4', 14.7, 62.0, 'sedan', 'west', '#686f68'),
      { ...vehicle('market-traffic', -9, 53.5, 'sedan', 'east', '#354e63'), toX: 109, durationSeconds: 17, delaySeconds: -8 }
    ]
  },
  cypress_corner: {
    npcs: [
      { ...npc('maya-rojas-visual', 62, 72, 'maya-rojas'), namedObjectId: 'maya_rojas', visual: MAYA_VISUAL, direction: 'south' },
      npc('cypress-park', 37.5, 36.9, 'cypress-park'),
      npc('cypress-shops', 91.7, 36.9, 'cypress-shops'),
      npc('cypress-walker', 22, 72, 'cypress-walker', { toX: 43, toY: 72, durationSeconds: 14, delaySeconds: -5, direction: 'east' })
    ],
    vehicles: [
      vehicle('cypress-car-1', 20.5, 47.7, 'hatchback', 'east', '#647178'),
      vehicle('cypress-car-2', 45.1, 61.7, 'sedan', 'west', '#77594e'),
      vehicle('cypress-car-3', 80.5, 47.1, 'suv', 'east', '#485e68'),
      vehicle('cypress-car-4', 88.4, 61.9, 'sedan', 'west', '#5a655d'),
      { ...vehicle('cypress-traffic', 109, 53.7, 'hatchback', 'west', '#6a4f55'), toX: -9, durationSeconds: 20, delaySeconds: -11 }
    ]
  },
  mira_alley: {
    npcs: [
      npc('alley-service', 32.1, 37.1, 'alley-service'),
      npc('alley-yard', 58.3, 72.1, 'alley-yard'),
      npc('alley-walker', 72, 72, 'alley-walker', { toX: 54, toY: 72, durationSeconds: 11, delaySeconds: -2, direction: 'west' })
    ],
    vehicles: [
      vehicle('alley-van', 44.0, 47.7, 'van', 'east', '#697579', 11.2, 'DORADO'),
      vehicle('alley-car-1', 68.8, 61.7, 'suv', 'west', '#4f6267'),
      vehicle('alley-car-2', 13.3, 47.4, 'pickup', 'east', '#6e5c4f'),
      { ...vehicle('alley-delivery-pass', -10, 53.6, 'van', 'east', '#57676c', 10.8, 'EXPRESS'), toX: 110, durationSeconds: 24, delaySeconds: -16 }
    ]
  }
};

function npc(id: string, x: number, y: number, seed: string, overrides: Partial<StreetNpcSlot> = {}): StreetNpcSlot {
  return { id, x, y, visual: visualFromSeed(seed), ...overrides };
}

function vehicle(id: string, x: number, y: number, type: WorldVehicleType, heading: WorldVehicleHeading, color: string, widthPercent = 9.6, serviceLabel?: string): StreetVehicleSlot {
  return { id, x, y, type, heading, color, widthPercent, ...(serviceLabel ? { serviceLabel } : {}) };
}
