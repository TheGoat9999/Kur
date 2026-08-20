import type { ItemCategory, ItemDefinition, ItemLegality, ItemUseEffects } from '@sol-dorado/contracts/items';

export type CompactItemRow = readonly [
  key: string,
  displayName: string,
  subcategory: string,
  unitWeightGrams: number,
  maxStack: number,
  basePriceCents: number,
  legality?: ItemLegality,
  useEffects?: ItemUseEffects,
  imageSearchTerms?: readonly string[],
  preferredSourceFile?: string | null
];

const sourceGalleryUrl = 'https://items.rainmad.com/';

export function defineCategory(category: ItemCategory, rows: readonly CompactItemRow[]): ItemDefinition[] {
  return rows.map(([
    key,
    displayName,
    subcategory,
    unitWeightGrams,
    maxStack,
    basePriceCents,
    legality = 'legal',
    useEffects = {},
    imageSearchTerms = [displayName.toLowerCase()],
    preferredSourceFile = null
  ]) => ({
    key,
    displayName,
    category,
    subcategory,
    unitWeightGrams,
    stackable: maxStack > 1,
    maxStack,
    basePriceCents,
    legality,
    useEffects,
    tags: [category, subcategory],
    image: {
      provider: 'rainmad',
      galleryUrl: sourceGalleryUrl,
      localPath: `/assets/items/${key}.png`,
      searchTerms: [...imageSearchTerms],
      preferredSourceFile
    }
  }));
}
