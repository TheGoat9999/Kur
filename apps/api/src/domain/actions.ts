import {
  WORLD_ACTION_IDS,
  type HudState,
  type StreetActionAvailability,
  type StreetFlags,
  type StreetObjectId,
  type StreetSegmentId,
  type WorldActionId,
  type WorldNoticeId
} from '@sol-dorado/contracts';

export interface MutablePlayerState extends HudState {
  currentSegmentId: StreetSegmentId;
  visitedSegmentIds: StreetSegmentId[];
  flags: StreetFlags;
}

export type StreetActionContext = Pick<MutablePlayerState, 'currentSegmentId' | 'flags'>;

export interface ActionOutcome {
  noticeId: WorldNoticeId;
  next: MutablePlayerState;
  cooldownMs?: number;
  reward?: { itemKey: string; displayName: string; quantity: number };
}

export const STREET_SEGMENTS: Record<StreetSegmentId, {
  displayName: string;
  visibleObjectIds: StreetObjectId[];
}> = {
  market_block_3: {
    displayName: 'Market Street / Block 3',
    visibleObjectIds: ['corner_store', 'el_camino', 'cypress_apartments', 'service_alley', 'exit_cypress', 'exit_alley']
  },
  cypress_corner: {
    displayName: 'Cypress Avenue / Market Corner',
    visibleObjectIds: ['cypress_apartments', 'maya_rojas', 'exit_market', 'exit_alley']
  },
  mira_alley: {
    displayName: 'Mira Service Alley',
    visibleObjectIds: ['market_dumpster', 'service_alley', 'el_camino', 'exit_market', 'exit_cypress']
  }
};

export const ACTION_COOLDOWNS_MS = {
  deliver_el_camino: 10 * 60 * 1_000,
  shoplift_corner_store: 15 * 60 * 1_000,
  search_dumpster: 4 * 60 * 60 * 1_000,
  talk_maya: 2 * 60 * 1_000,
  speak_corner_clerk: 2 * 60 * 1_000
} as const satisfies Partial<Record<WorldActionId, number>>;

const actionSegments: Partial<Record<WorldActionId, StreetSegmentId[]>> = {
  inspect_corner_store: ['market_block_3'],
  enter_corner_store: ['market_block_3'],
  shoplift_corner_store: ['market_block_3'],
  speak_corner_clerk: ['market_block_3'],
  deliver_el_camino: ['market_block_3'],
  inspect_el_camino: ['market_block_3', 'mira_alley'],
  enter_el_camino: ['market_block_3'],
  inspect_apartment: ['market_block_3', 'cypress_corner'],
  enter_apartment: ['market_block_3', 'cypress_corner'],
  inspect_service_alley: ['market_block_3', 'mira_alley'],
  search_dumpster: ['mira_alley'],
  talk_maya: ['cypress_corner'],
  ask_maya_information: ['cypress_corner']
};

export const TRAVEL_DESTINATIONS: Partial<Record<WorldActionId, StreetSegmentId>> = {
  travel_market_block_3: 'market_block_3',
  travel_cypress_corner: 'cypress_corner',
  travel_mira_alley: 'mira_alley'
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function getActionAvailability(
  current: StreetActionContext,
  actionId: WorldActionId,
  cooldownEndsAt: number | null = null,
  now = Date.now()
): StreetActionAvailability {
  const destination = TRAVEL_DESTINATIONS[actionId];
  if (destination) return destination === current.currentSegmentId ? 'wrong_location' : 'available';
  if (!actionSegments[actionId]?.includes(current.currentSegmentId)) return 'wrong_location';
  if (actionId === 'enter_apartment') return 'locked';
  if (actionId === 'ask_maya_information' && current.flags.alleyTipKnown) return 'already_done';
  if (cooldownEndsAt !== null && cooldownEndsAt > now) return 'cooldown';
  return 'available';
}

export function applyWorldAction(
  current: MutablePlayerState,
  actionId: WorldActionId,
  random = Math.random
): ActionOutcome {
  const availability = getActionAvailability(current, actionId);
  if (availability !== 'available') throw new Error(`world_action_${availability}`);

  const next: MutablePlayerState = {
    ...current,
    visitedSegmentIds: [...current.visitedSegmentIds],
    flags: { ...current.flags }
  };
  const destination = TRAVEL_DESTINATIONS[actionId];
  if (destination) {
    next.energy = clamp(next.energy - 3);
    next.hydration = clamp(next.hydration - 1);
    next.currentSegmentId = destination;
    if (!next.visitedSegmentIds.includes(destination)) next.visitedSegmentIds.push(destination);
    const notices: Record<StreetSegmentId, WorldNoticeId> = {
      market_block_3: 'travel_market', cypress_corner: 'travel_cypress', mira_alley: 'travel_alley'
    };
    return { noticeId: notices[destination], next };
  }

  if (actionId === 'deliver_el_camino') {
    next.energy = clamp(next.energy - 7);
    next.satiety = clamp(next.satiety - 2);
    next.hydration = clamp(next.hydration - 4);
    next.cashCents += 4_500;
    return { noticeId: 'delivery_complete', next, cooldownMs: ACTION_COOLDOWNS_MS[actionId] };
  }

  if (actionId === 'shoplift_corner_store') {
    const witnessed = random() < (current.flags.cornerStoreAlerted ? 0.72 : 0.42);
    next.cashCents += witnessed ? 1_200 : 3_500;
    next.stress = clamp(next.stress + (witnessed ? 18 : 8));
    next.policeHeat = clamp(next.policeHeat + (witnessed ? 22 : 4));
    if (witnessed) next.flags.cornerStoreAlerted = true;
    return {
      noticeId: witnessed ? 'shoplift_witnessed' : 'shoplift_clean',
      next,
      cooldownMs: ACTION_COOLDOWNS_MS[actionId]
    };
  }

  if (actionId === 'search_dumpster') {
    const quantity = random() < 0.68 ? 1 : 2;
    next.energy = clamp(next.energy - 1);
    next.hydration = clamp(next.hydration - 1);
    return {
      noticeId: 'dumpster_salvage',
      next,
      cooldownMs: ACTION_COOLDOWNS_MS[actionId],
      reward: { itemKey: 'salvaged_electronics', displayName: 'Salvaged Electronics', quantity }
    };
  }

  if (actionId === 'talk_maya') {
    return { noticeId: 'maya_greeting', next, cooldownMs: ACTION_COOLDOWNS_MS[actionId] };
  }

  if (actionId === 'speak_corner_clerk') {
    return { noticeId: 'clerk_spoken', next, cooldownMs: ACTION_COOLDOWNS_MS[actionId] };
  }

  if (actionId === 'ask_maya_information') {
    next.flags.alleyTipKnown = true;
    return { noticeId: 'maya_tip', next };
  }

  const notices: Partial<Record<WorldActionId, WorldNoticeId>> = {
    inspect_corner_store: 'corner_inspected',
    enter_corner_store: 'corner_entered',
    inspect_el_camino: 'restaurant_inspected',
    enter_el_camino: 'restaurant_entered',
    inspect_apartment: 'apartment_inspected',
    inspect_service_alley: 'alley_inspected'
  };
  const noticeId = notices[actionId];
  if (!noticeId || !WORLD_ACTION_IDS.includes(actionId)) throw new Error('world_action_not_implemented');
  return { noticeId, next };
}
