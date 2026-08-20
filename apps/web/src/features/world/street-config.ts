import type { StreetObjectId, StreetSegmentId, WorldActionId } from '@sol-dorado/contracts';
import type { GameIconName } from '../../components/GameIcon';
import type { TranslationKey } from '../../i18n';

export type StreetObjectKind = 'poi' | 'entrance' | 'street' | 'npc' | 'exit';
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
  labelKey: TranslationKey;
  detailKey: TranslationKey;
  icon: GameIconName;
  x: number;
  y: number;
  actions: WorldActionId[];
}

export interface StreetSceneDefinition {
  id: StreetSegmentId;
  nameKey: TranslationKey;
  atmosphereKey: TranslationKey;
  theme: 'market' | 'corner' | 'alley';
  player: { x: number; y: number };
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
    id: 'market_block_3',
    nameKey: 'world.segment.market',
    atmosphereKey: 'world.segment.marketAtmosphere',
    theme: 'market',
    player: { x: 50, y: 77 },
    objects: [
      object('corner_store', 'poi', 'world.object.cornerStore', 'world.object.cornerStoreDetail', 'store', 77, 48,
        ['inspect_corner_store', 'enter_corner_store', 'shoplift_corner_store', 'speak_corner_clerk']),
      object('el_camino', 'poi', 'world.object.elCamino', 'world.object.elCaminoDetail', 'utensils', 23, 51,
        ['deliver_el_camino', 'inspect_el_camino', 'enter_el_camino']),
      object('cypress_apartments', 'entrance', 'world.object.apartments', 'world.object.apartmentsDetail', 'building', 43, 33,
        ['inspect_apartment', 'enter_apartment']),
      object('service_alley', 'street', 'world.object.serviceAlley', 'world.object.serviceAlleyDetail', 'search', 91, 42,
        ['inspect_service_alley', 'travel_mira_alley']),
      object('exit_cypress', 'exit', 'world.object.exitCypress', 'world.object.exitCypressDetail', 'arrow-right', 7, 79,
        ['travel_cypress_corner']),
      object('exit_alley', 'exit', 'world.object.exitAlley', 'world.object.exitAlleyDetail', 'arrow-right', 93, 79,
        ['travel_mira_alley'])
    ]
  },
  cypress_corner: {
    id: 'cypress_corner',
    nameKey: 'world.segment.cypress',
    atmosphereKey: 'world.segment.cypressAtmosphere',
    theme: 'corner',
    player: { x: 50, y: 78 },
    objects: [
      object('cypress_apartments', 'entrance', 'world.object.apartments', 'world.object.apartmentsDetail', 'building', 24, 43,
        ['inspect_apartment', 'enter_apartment']),
      object('maya_rojas', 'npc', 'world.object.maya', 'world.object.mayaDetail', 'user', 57, 58,
        ['talk_maya', 'ask_maya_information']),
      object('exit_market', 'exit', 'world.object.exitMarket', 'world.object.exitMarketDetail', 'arrow-right', 7, 80,
        ['travel_market_block_3']),
      object('exit_alley', 'exit', 'world.object.exitAlley', 'world.object.exitAlleyDetail', 'arrow-right', 93, 80,
        ['travel_mira_alley'])
    ]
  },
  mira_alley: {
    id: 'mira_alley',
    nameKey: 'world.segment.alley',
    atmosphereKey: 'world.segment.alleyAtmosphere',
    theme: 'alley',
    player: { x: 50, y: 81 },
    objects: [
      object('market_dumpster', 'street', 'world.object.dumpster', 'world.object.dumpsterDetail', 'trash', 27, 58,
        ['search_dumpster']),
      object('service_alley', 'street', 'world.object.serviceAlley', 'world.object.serviceAlleyDetail', 'search', 52, 34,
        ['inspect_service_alley']),
      object('el_camino', 'entrance', 'world.object.elCaminoBack', 'world.object.elCaminoBackDetail', 'utensils', 78, 44,
        ['inspect_el_camino']),
      object('exit_market', 'exit', 'world.object.exitMarket', 'world.object.exitMarketDetail', 'arrow-right', 7, 82,
        ['travel_market_block_3']),
      object('exit_cypress', 'exit', 'world.object.exitCypress', 'world.object.exitCypressDetail', 'arrow-right', 93, 82,
        ['travel_cypress_corner'])
    ]
  }
};

function action(id: WorldActionId, labelKey: TranslationKey, descriptionKey: TranslationKey, icon: GameIconName, tone: StreetActionTone): StreetActionPresentation {
  return { id, labelKey, descriptionKey, icon, tone };
}

function object(
  id: StreetObjectId,
  kind: StreetObjectKind,
  labelKey: TranslationKey,
  detailKey: TranslationKey,
  icon: GameIconName,
  x: number,
  y: number,
  actions: WorldActionId[]
): StreetObjectDefinition {
  return { id, kind, labelKey, detailKey, icon, x, y, actions };
}
