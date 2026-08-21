import type { ItemDefinition } from '@sol-dorado/contracts/items';

const rainmadGallery = 'https://items.rainmad.com/';

/**
 * Abstract gameplay components. They intentionally do not model real-world
 * weapon manufacturing parts or procedures; recipes consume these as economy
 * resources while keeping the system game-focused.
 *
 * The local artwork aliases already-vendored Rainmad item icons. The alias
 * provenance is tracked in apps/web/public/assets/items/_weapon-crafting-source-map.json.
 */
export const CRAFTING_ITEMS: ItemDefinition[] = [
  {
    key: 'weapon_parts_kit',
    displayName: 'Weapon Parts Kit',
    category: 'material',
    subcategory: 'crafting_component',
    unitWeightGrams: 650,
    stackable: true,
    maxStack: 10,
    basePriceCents: 7500,
    legality: 'regulated',
    useEffects: {},
    tags: ['material', 'crafting_component', 'weapon_support'],
    image: {
      provider: 'rainmad',
      galleryUrl: rainmadGallery,
      localPath: '/assets/items/weapon_parts_kit.png',
      searchTerms: ['weapon parts', 'weapon cleaning kit'],
      preferredSourceFile: 'weapon_cleaning_kit.png'
    }
  },
  {
    key: 'ammo_components_box',
    displayName: 'Ammunition Components Box',
    category: 'material',
    subcategory: 'crafting_component',
    unitWeightGrams: 900,
    stackable: true,
    maxStack: 10,
    basePriceCents: 5200,
    legality: 'regulated',
    useEffects: {},
    tags: ['material', 'crafting_component', 'ammunition_support'],
    image: {
      provider: 'rainmad',
      galleryUrl: rainmadGallery,
      localPath: '/assets/items/ammo_components_box.png',
      searchTerms: ['ammunition components', 'rifle ammo'],
      preferredSourceFile: 'rifle_ammo.png'
    }
  },
  {
    key: 'precision_hardware_pack',
    displayName: 'Precision Hardware Pack',
    category: 'material',
    subcategory: 'crafting_component',
    unitWeightGrams: 420,
    stackable: true,
    maxStack: 20,
    basePriceCents: 3400,
    legality: 'restricted',
    useEffects: {},
    tags: ['material', 'crafting_component', 'hardware'],
    image: {
      provider: 'rainmad',
      galleryUrl: rainmadGallery,
      localPath: '/assets/items/precision_hardware_pack.png',
      searchTerms: ['hardware', 'screws'],
      preferredSourceFile: 'screws_box.png'
    }
  }
];
