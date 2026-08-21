import { describe, expect, it } from 'vitest';
import {
  CORE_ITEM_CATALOG,
  CORE_ITEM_CATEGORY_COUNTS,
  getItemDefinition,
  ITEM_BY_KEY,
  resolveItemKey
} from '../src/domain/items/index.js';
import { QUATERNIUS_WEAPON_ITEMS } from '../src/domain/items/quaternius-weapon-items.js';

const EXPECTED_COUNTS = {
  personal: 5,
  food: 40,
  drink: 25,
  tool: 25,
  material: 35,
  electronics: 25,
  medical: 20,
  weapon: 80
} as const;

describe('core item catalog', () => {
  it('contains exactly 255 core items', () => {
    expect(CORE_ITEM_CATALOG).toHaveLength(255);
    expect(CORE_ITEM_CATEGORY_COUNTS).toEqual(EXPECTED_COUNTS);
  });

  it('uses unique item keys and local asset paths', () => {
    expect(new Set(CORE_ITEM_CATALOG.map(item => item.key)).size).toBe(255);
    expect(new Set(CORE_ITEM_CATALOG.map(item => item.image.localPath)).size).toBe(255);
  });

  it('contains the MVP anchor items', () => {
    for (const key of ['phone', 'water_bottle', 'sandwich', 'toolbox', 'steel_bar', 'medkit', 'compact_pistol']) {
      expect(ITEM_BY_KEY.has(key)).toBe(true);
    }
  });

  it('resolves legacy prototype keys to the canonical catalog', () => {
    expect(resolveItemKey('water')).toBe('water_bottle');
    expect(resolveItemKey('gloves')).toBe('work_gloves');
    expect(getItemDefinition('water')?.category).toBe('drink');
    expect(getItemDefinition('water')?.useEffects.hydration).toBe(22);
    expect(getItemDefinition('gloves')?.key).toBe('work_gloves');
  });

  it('keeps non-stackable definitions at one item per stack', () => {
    for (const item of CORE_ITEM_CATALOG) {
      if (!item.stackable) expect(item.maxStack).toBe(1);
    }
  });

  it('keeps every catalog entry mapped to the Rainmad asset workflow', () => {
    for (const item of CORE_ITEM_CATALOG) {
      expect(item.image.provider).toBe('rainmad');
      expect(item.image.galleryUrl).toBe('https://items.rainmad.com/');
      expect(item.image.localPath).toBe(`/assets/items/${item.key}.png`);
      expect(item.image.searchTerms.length).toBeGreaterThan(0);
    }
  });

  it('registers every uploaded Quaternius asset with provenance and real-world reference data', () => {
    expect(QUATERNIUS_WEAPON_ITEMS).toHaveLength(55);
    expect(new Set(QUATERNIUS_WEAPON_ITEMS.map(item => item.worldAssetSource?.sourceEntry)).size).toBe(55);
    for (const item of QUATERNIUS_WEAPON_ITEMS) {
      expect(item.realWorldReference?.matchType).toBe('representative');
      expect(item.realWorldReference?.referenceName.length).toBeGreaterThan(2);
      expect(item.worldAssetSource?.provider).toBe('quaternius');
      expect(item.worldAssetSource?.license).toBe('CC0-1.0');
      expect(item.image.provider).toBe('rainmad');
      expect(item.image.preferredSourceFile).toBeTruthy();
    }
  });
});
