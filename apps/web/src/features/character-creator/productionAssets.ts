import type {
  CharacterAssetManifest,
  CharacterSex,
  GarmentSlot
} from './characterRecipe';

export type ProductionCharacterAsset = CharacterAssetManifest & {
  runtime: 'glb-v1';
  status: 'ready';
  slots: GarmentSlot[];
  bodyMaskUrl?: string;
  fitProfile: 'sol-dorado-humanoid-v1';
};

/**
 * Production character assets live here after the automated content pipeline
 * has generated, fitted, validated and optimized them. The registry is empty
 * until the first game-owned GLB is published intentionally.
 *
 * Legacy MakeHuman MHCLO assets remain in systemAssets.ts as fitting/dev data.
 * They are not the target visual library for SOL DORADO.
 */
export const PRODUCTION_CHARACTER_ASSETS: ProductionCharacterAsset[] = [];

const BY_ID = new Map(PRODUCTION_CHARACTER_ASSETS.map(asset => [asset.id, asset]));

export function getProductionCharacterAsset(id: string | null | undefined) {
  return id ? BY_ID.get(id) : undefined;
}

export function productionAssetsForSex(sex: CharacterSex) {
  return PRODUCTION_CHARACTER_ASSETS.filter(asset => asset.compatibleSexes.includes(sex));
}

export function isProductionAssetReady(asset: CharacterAssetManifest): asset is ProductionCharacterAsset {
  return asset.status === 'ready' && asset.compatibleRig === 'sol-dorado-humanoid-v1' && !!asset.glbUrl;
}
