import type { StreetObjectId, StreetSegmentId, WorldActionId } from '@sol-dorado/contracts';
import { getStreetActionAnchor } from '@sol-dorado/contracts/world-position';
import type { GameIconName } from '../../components/GameIcon';
import type { TranslationKey } from '../../i18n';

export type StreetObjectKind = 'poi' | 'entrance' | 'street' | 'npc' | 'exit';
export type StreetObjectImportance = 'anchor' | 'contextual' | 'route';
export type StreetActionTone = 'neutral' | 'legal' | 'crime' | 'travel';

export interface StreetActionPresentation {
  id: WorldActionId;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: GameIconName;
  tone: StreetActionTone;
}

export interface StreetObjectDefinition {
  id: StreetObjectId;
  kind: StreetObjectKind;
  importance: StreetObjectImportance;
  labelKey: TranslationKey;
  detailKey: TranslationKey;
  icon: GameIconName;
  x: number;
  y: number;
  hitbox: { width: number; height: number };
  actions: WorldActionId[];
}

export interface StreetSceneDefinition {
  id: StreetSegmentId;
  nameKey: TranslationKey;
  atmosphereKey: TranslationKey;
  theme: 'market' | 'corner' | 'alley';
  objects: StreetObjectDefinition[];
}

export const STREET_ACTION_COPY: Record<WorldActionId, StreetActionPresentation> = {
  travel_market_block_3: action('travel_market_block_3', 'world.action.travelMarket', 'world.action.travelMarketDetail', 'footprints', 'travel'),
  travel_cypress_corner: action('travel_cypress_corner', 'world.action.travelCypress', 'world.action.travelCypressDetail', 'footprints', 'travel'),
  travel_mira_alley: action('travel_mira_alley', 'world.action.travelAlley', 'world.action.travelAlleyDetail', 'footprints', 'travel'),
  inspect_corner_store: action('inspect_corner_store', 'world.action.inspectStore', 'world.action.inspectStoreDetail', 'eye', 'neutral'),
  enter_corner_store: action('enter_corner_store', 'world.action.enterStore', 'world.action.enterStoreDetail', 'door-open', 'neutral'),
  shoplift_corner_store: action('shoplift_corner_store', 'world.action.shoplift', 'world.action.shopliftDetail', 'alert-triangle', 'crime'),
  speak_corner_clerk: action('speak_corner_clerk', 'world.action.speakClerk', 'world.action.speakClerkDetail', 'message', 'neutral'),
  deliver_el_camino: action('deliver_el_camino', 'world.action.deliver', 'world.action.deliverDetail', 'package', 'legal'),
  inspect_el_camino: action('inspect_el_camino', 'world.action.inspectRestaurant', 'world.action.inspectRestaurantDetail', 'eye', 'neutral'),
  enter_el_camino: action('enter_el_camino', 'world.action.enterRestaurant', 'world.action.enterRestaurantDetail', 'door-open', 'neutral'),
  inspect_apartment: action('inspect_apartment', 'world.action.inspectApartment', 'world.action.inspectApartmentDetail', 'eye', 'neutral'),
  enter_apartment: action('enter_apartment', 'world.action.enterApartment', 'world.action.enterApartmentDetail', 'lock', 'neutral'),
  inspect_service_alley: action('inspect_service_alley', 'world.action.inspectAlley', 'world.action.inspectAlleyDetail', 'search', 'neutral'),
  search_dumpster: action('search_dumpster', 'world.action.searchDumpster', 'world.action.searchDumpsterDetail', 'search', 'legal'),
  talk_maya: action('talk_maya', 'world.action.talkMaya', 'world.action.talkMayaDetail', 'message', 'neutral'),
  ask_maya_information: action('ask_maya_information', 'world.action.askMaya', 'world.action.askMayaDetail', 'info', 'neutral')
};

export const STREET_SCENES: Record<StreetSegmentId, StreetSceneDefinition> = {
  market_block_3: {
    id: 'market_block_3', nameKey: 'world.segment.market', atmosphereKey: 'world.segment.marketAtmosphere', theme: 'market',
    objects: [
      object('market_block_3', 'corner_store', 'poi', 'anchor', 'world.object.cornerStore', 'world.object.cornerStoreDetail', 'store', ['inspect_corner_store', 'enter_corner_store', 'shoplift_corner_store', 'speak_corner_clerk']),
      object('market_block_3', 'el_camino', 'poi', 'anchor', 'world.object.elCamino', 'world.object.elCaminoDetail', 'utensils', ['deliver_el_camino', 'inspect_el_camino', 'enter_el_camino']),
      object('market_block_3', 'cypress_apartments', 'entrance', 'anchor', 'world.object.apartments', 'world.object.apartmentsDetail', 'building', ['inspect_apartment', 'enter_apartment']),
      object('market_block_3', 'service_alley', 'street', 'contextual', 'world.object.serviceAlley', 'world.object.serviceAlleyDetail', 'search', ['inspect_service_alley']),
      object('market_block_3', 'exit_cypress', 'exit', 'route', 'world.object.exitCypress', 'world.object.exitCypressDetail', 'arrow-right', ['travel_cypress_corner']),
      object('market_block_3', 'exit_alley', 'exit', 'route', 'world.object.exitAlley', 'world.object.exitAlleyDetail', 'arrow-right', ['travel_mira_alley'])
    ]
  },
  cypress_corner: {
    id: 'cypress_corner', nameKey: 'world.segment.cypress', atmosphereKey: 'world.segment.cypressAtmosphere', theme: 'corner',
    objects: [
      object('cypress_corner', 'cypress_apartments', 'entrance', 'anchor', 'world.object.apartments', 'world.object.apartmentsDetail', 'building', ['inspect_apartment', 'enter_apartment']),
      object('cypress_corner', 'maya_rojas', 'npc', 'contextual', 'world.object.maya', 'world.object.mayaDetail', 'user', ['talk_maya', 'ask_maya_information']),
      object('cypress_corner', 'exit_market', 'exit', 'route', 'world.object.exitMarket', 'world.object.exitMarketDetail', 'arrow-right', ['travel_market_block_3']),
      object('cypress_corner', 'exit_alley', 'exit', 'route', 'world.object.exitAlley', 'world.object.exitAlleyDetail', 'arrow-right', ['travel_mira_alley'])
    ]
  },
  mira_alley: {
    id: 'mira_alley', nameKey: 'world.segment.alley', atmosphereKey: 'world.segment.alleyAtmosphere', theme: 'alley',
    objects: [
      object('mira_alley', 'market_dumpster', 'street', 'contextual', 'world.object.dumpster', 'world.object.dumpsterDetail', 'trash', ['search_dumpster']),
      object('mira_alley', 'service_alley', 'street', 'contextual', 'world.object.serviceAlley', 'world.object.serviceAlleyDetail', 'search', ['inspect_service_alley']),
      object('mira_alley', 'el_camino', 'entrance', 'anchor', 'world.object.elCaminoBack', 'world.object.elCaminoBackDetail', 'utensils', ['inspect_el_camino']),
      object('mira_alley', 'exit_market', 'exit', 'route', 'world.object.exitMarket', 'world.object.exitMarketDetail', 'arrow-right', ['travel_market_block_3']),
      object('mira_alley', 'exit_cypress', 'exit', 'route', 'world.object.exitCypress', 'world.object.exitCypressDetail', 'arrow-right', ['travel_cypress_corner'])
    ]
  }
};

function action(id: WorldActionId, labelKey: TranslationKey, descriptionKey: TranslationKey, icon: GameIconName, tone: StreetActionTone): StreetActionPresentation {
  return { id, labelKey, descriptionKey, icon, tone };
}

function object(
  segmentId: StreetSegmentId,
  id: StreetObjectId,
  kind: StreetObjectKind,
  importance: StreetObjectImportance,
  labelKey: TranslationKey,
  detailKey: TranslationKey,
  icon: GameIconName,
  actions: WorldActionId[]
): StreetObjectDefinition {
  const anchor = getStreetActionAnchor(segmentId, actions[0]);
  if (!anchor) throw new Error(`Missing street anchor for ${segmentId}:${actions[0]}`);
  return {
    id, kind, importance, labelKey, detailKey, icon,
    x: anchor.x, y: anchor.y,
    hitbox: { width: kind === 'exit' ? 8 : 6, height: kind === 'exit' ? 10 : 8 },
    actions
  };
}
