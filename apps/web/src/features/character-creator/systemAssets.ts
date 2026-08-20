import type { CharacterSex, GarmentSlot } from './characterRecipe';

export type SystemAssetKind = 'hair' | 'clothing';

export type MakeHumanSystemAsset = {
  id: string;
  kind: SystemAssetKind;
  directory: 'base/hair' | 'base/clothes';
  fileBase?: string;
  displayNameBg: string;
  displayNameEn: string;
  categoryBg: string;
  categoryEn: string;
  compatibleSexes: CharacterSex[];
  slots: GarmentSlot[];
  fallbackColor: string;
  thumbnailUrl: string;
  license: 'CC0-1.0';
  runtime: 'legacy-mhclo';
  qualityTier: 'dev-fitting';
};

const thumbnail = (id: string) => `https://static.makehumancommunity.org/assets/assetpacks/${id}.png`;

export const HAIR_ASSETS: MakeHumanSystemAsset[] = [
  asset('short01', 'hair', 'base/hair', 'Къса 01', 'Short 01', 'Къса коса', 'Short hair', '#2d211b'),
  asset('short02', 'hair', 'base/hair', 'Къса 02', 'Short 02', 'Къса коса', 'Short hair', '#2d211b'),
  asset('short03', 'hair', 'base/hair', 'Къса 03', 'Short 03', 'Къса коса', 'Short hair', '#2d211b'),
  asset('short04', 'hair', 'base/hair', 'Къса 04', 'Short 04', 'Къса коса', 'Short hair', '#2d211b'),
  asset('afro01', 'hair', 'base/hair', 'Афро', 'Afro', 'Текстурирана', 'Textured', '#211a16'),
  asset('bob01', 'hair', 'base/hair', 'Боб 01', 'Bob 01', 'Средна дължина', 'Medium', '#3b2b24'),
  asset('bob02', 'hair', 'base/hair', 'Боб 02', 'Bob 02', 'Средна дължина', 'Medium', '#3b2b24'),
  asset('braid01', 'hair', 'base/hair', 'Плитка', 'Braid', 'Сплетена', 'Braided', '#2a211d'),
  asset('ponytail01', 'hair', 'base/hair', 'Конска опашка', 'Ponytail', 'Вързана', 'Tied', '#3b2b24'),
  asset('long01', 'hair', 'base/hair', 'Дълга 01', 'Long 01', 'Дълга коса', 'Long hair', '#3b2b24')
];

export const CLOTHING_ASSETS: MakeHumanSystemAsset[] = [
  clothing('male_casualsuit01', 'Мъжки ежедневен комплект 01', 'Male casual set 01', ['male'], ['torsoOuter', 'legs'], '#32383d'),
  clothing('male_casualsuit02', 'Мъжки ежедневен комплект 02', 'Male casual set 02', ['male'], ['torsoOuter', 'legs'], '#3b4146'),
  clothing('male_casualsuit03', 'Мъжки ежедневен комплект 03', 'Male casual set 03', ['male'], ['torsoOuter', 'legs'], '#34383c'),
  clothing('male_elegantsuit01', 'Мъжки елегантен костюм', 'Male elegant suit', ['male'], ['torsoOuter', 'legs'], '#24292d'),
  clothing('male_worksuit01', 'Мъжки работен комплект', 'Male work suit', ['male'], ['torsoOuter', 'legs'], '#4b4f4d'),
  clothing('female_casualsuit01', 'Дамски ежедневен комплект 01', 'Female casual set 01', ['female'], ['torsoOuter', 'legs'], '#454047'),
  clothing('female_casualsuit02', 'Дамски ежедневен комплект 02', 'Female casual set 02', ['female'], ['torsoOuter', 'legs'], '#3d3a40'),
  clothing('female_elegantsuit01', 'Дамски елегантен костюм', 'Female elegant suit', ['female'], ['torsoOuter', 'legs'], '#332f35'),
  clothing('female_sportsuit01', 'Дамски спортен комплект', 'Female sport suit', ['female'], ['torsoOuter', 'legs'], '#3d4145'),
  clothing('shoes01', 'Обувки 01', 'Shoes 01', ['male', 'female'], ['feet'], '#2b2d2f'),
  clothing('shoes02', 'Обувки 02', 'Shoes 02', ['male', 'female'], ['feet'], '#34312f'),
  clothing('shoes03', 'Обувки 03', 'Shoes 03', ['male', 'female'], ['feet'], '#292a2b'),
  {
    ...clothing('fedora01', 'Шапка федора', 'Fedora', ['male', 'female'], ['head'], '#352d29'),
    fileBase: 'fedora'
  }
];

export const ALL_SYSTEM_ASSETS = [...HAIR_ASSETS, ...CLOTHING_ASSETS];
const BY_ID = new Map(ALL_SYSTEM_ASSETS.map(asset => [asset.id, asset]));

export function getSystemAsset(id: string | null | undefined) {
  return id ? BY_ID.get(id) : undefined;
}

export function assetsForSex(sex: CharacterSex) {
  return CLOTHING_ASSETS.filter(asset => asset.compatibleSexes.includes(sex));
}

function asset(
  id: string,
  kind: SystemAssetKind,
  directory: MakeHumanSystemAsset['directory'],
  displayNameBg: string,
  displayNameEn: string,
  categoryBg: string,
  categoryEn: string,
  fallbackColor: string
): MakeHumanSystemAsset {
  return {
    id,
    kind,
    directory,
    displayNameBg,
    displayNameEn,
    categoryBg,
    categoryEn,
    compatibleSexes: ['male', 'female'],
    slots: [],
    fallbackColor,
    thumbnailUrl: thumbnail(id),
    license: 'CC0-1.0',
    runtime: 'legacy-mhclo',
    qualityTier: 'dev-fitting'
  };
}

function clothing(
  id: string,
  displayNameBg: string,
  displayNameEn: string,
  compatibleSexes: CharacterSex[],
  slots: GarmentSlot[],
  fallbackColor: string
): MakeHumanSystemAsset {
  return {
    id,
    kind: 'clothing',
    directory: 'base/clothes',
    displayNameBg,
    displayNameEn,
    categoryBg: slots.includes('feet') ? 'Обувки' : slots.includes('head') ? 'Шапки' : 'Комплект',
    categoryEn: slots.includes('feet') ? 'Shoes' : slots.includes('head') ? 'Headwear' : 'Outfit',
    compatibleSexes,
    slots,
    fallbackColor,
    thumbnailUrl: thumbnail(id),
    license: 'CC0-1.0',
    runtime: 'legacy-mhclo',
    qualityTier: 'dev-fitting'
  };
}
