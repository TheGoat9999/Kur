import type { CharacterSex } from './characterVisualRecipe';

export type CharacterCatalogSlot =
  | 'hair'
  | 'facialHair'
  | 'top'
  | 'outerwear'
  | 'bottoms'
  | 'shoes'
  | 'eyewear'
  | 'headwear'
  | 'jewelry'
  | 'accessory';

export type CharacterCatalogItem = {
  id: string;
  slot: CharacterCatalogSlot;
  nameBg: string;
  nameEn: string;
  prompt: string;
  sexes: Array<CharacterSex | 'unisex'>;
  tags: string[];
  primary: string;
  secondary: string;
  renderKind: string;
  source: 'seed' | 'ai-generated' | 'web-inspired';
};

export const CHARACTER_CATALOG: CharacterCatalogItem[] = [
  item('bald','hair','Без коса','Bald','clean-shaven scalp',['unisex'],['minimal'],'#2a211c','#2a211c','bald'),
  item('fade-textured','hair','Текстуриран fade','Textured fade','short textured fade haircut',['male','unisex'],['street','modern'],'#2b211c','#171311','fade'),
  item('buzz-clean','hair','Къс buzz cut','Clean buzz cut','clean short buzz cut',['male','unisex'],['minimal','sport'],'#2c211b','#171311','buzz'),
  item('waves-short','hair','Къси вълни','Short waves','short brushed waves with a clean hairline',['male','unisex'],['street'],'#33241e','#171311','waves'),
  item('afro-rounded','hair','Обемно афро','Rounded afro','rounded natural afro hairstyle',['unisex'],['natural','street'],'#211815','#130f0d','afro'),
  item('braids-clean','hair','Чисти плитки','Clean braids','neat medium box braids',['unisex'],['street','fashion'],'#241915','#100d0b','braids'),
  item('cornrows-back','hair','Cornrows назад','Cornrows back','tight cornrows swept back',['unisex'],['street','sport'],'#211814','#100d0b','cornrows'),
  item('bob-modern','hair','Модерен боб','Modern bob','sleek modern chin-length bob haircut',['female','unisex'],['fashion','modern'],'#382720','#171311','bob'),
  item('long-layered','hair','Дълга на пластове','Long layered','long layered hair with soft volume',['female','unisex'],['fashion'],'#3b2920','#171311','long'),
  item('ponytail-high','hair','Висока опашка','High ponytail','high sleek ponytail',['female','unisex'],['sport','fashion'],'#2c201b','#171311','ponytail'),
  item('curly-volume','hair','Обемни къдрици','Voluminous curls','voluminous shoulder-length curls',['female','unisex'],['natural','fashion'],'#3a281f','#18120f','curls'),
  item('undercut-swept','hair','Undercut настрани','Side-swept undercut','side-swept undercut with textured top',['male','unisex'],['modern','luxury'],'#33231d','#171311','undercut'),

  item('clean','facialHair','Без брада','Clean shaven','clean shaven face',['male','unisex'],['clean'],'#000000','#000000','none'),
  item('stubble','facialHair','Лека брада','Light stubble','short even designer stubble',['male'],['street','modern'],'#2a211c','#171311','stubble'),
  item('boxed-beard','facialHair','Поддържана брада','Boxed beard','well-groomed short boxed beard',['male'],['classic','luxury'],'#2a211c','#171311','beard'),

  item('tee-urban-black','top','Черна градска тениска','Black urban tee','premium black relaxed-fit t-shirt',['unisex'],['street','minimal'],'#171a1d','#31363b','tee'),
  item('tee-cream','top','Кремава тениска','Cream tee','heavyweight cream oversized t-shirt',['unisex'],['street','clean'],'#d8c8ae','#eee0c9','tee'),
  item('tank-white','top','Бял потник','White tank','clean white ribbed tank top',['unisex'],['sport','street'],'#e8e7e1','#c7c6bf','tank'),
  item('shirt-open-blue','top','Синя отворена риза','Open blue shirt','relaxed blue open-collar shirt',['unisex'],['casual','coastal'],'#345f82','#88a9c2','shirt'),
  item('hoodie-graphite','top','Графитено худи','Graphite hoodie','premium graphite oversized hoodie',['unisex'],['street','sport'],'#33383f','#171a1d','hoodie'),
  item('crop-black','top','Черен crop top','Black crop top','fitted black cropped top',['female'],['fashion','nightlife'],'#18191b','#383b40','crop'),
  item('blouse-satin-red','top','Червена сатенена блуза','Red satin blouse','deep red satin blouse',['female'],['luxury','nightlife'],'#8e2632','#c45c64','blouse'),

  item('none','outerwear','Без връхна дреха','No outerwear','no outerwear',['unisex'],['none'],'#000000','#000000','none'),
  item('bomber-olive','outerwear','Маслинен bomber','Olive bomber','olive green cropped bomber jacket',['unisex'],['street','utility'],'#4e5945','#222820','bomber'),
  item('denim-washed','outerwear','Избелено дънково яке','Washed denim jacket','washed blue denim jacket',['unisex'],['casual','street'],'#4d6d85','#9bb0bf','denim'),
  item('leather-black','outerwear','Черно кожено яке','Black leather jacket','black premium leather biker jacket',['unisex'],['nightlife','luxury'],'#17191b','#3a3d41','leather'),
  item('varsity-sd','outerwear','SOL DORADO varsity','SOL DORADO varsity','navy and gold varsity jacket with subtle Sol Dorado insignia',['unisex'],['street','campus'],'#162d49','#d1a447','varsity'),
  item('blazer-sand','outerwear','Пясъчен blazer','Sand blazer','relaxed sand-colored tailored blazer',['unisex'],['luxury','coastal'],'#b89b77','#ede1cf','blazer'),
  item('puffer-black','outerwear','Черно puffer яке','Black puffer','matte black cropped puffer jacket',['unisex'],['street','winter'],'#191d21','#353c43','puffer'),

  item('cargo-charcoal','bottoms','Графитено cargo','Charcoal cargo','charcoal utility cargo pants',['unisex'],['street','utility'],'#2c3338','#161a1d','cargo'),
  item('jeans-blue-relaxed','bottoms','Свободни сини дънки','Relaxed blue jeans','relaxed straight-leg blue jeans',['unisex'],['casual','street'],'#365f7f','#8aa5b8','jeans'),
  item('trousers-black','bottoms','Черни панталони','Black trousers','clean black tailored trousers',['unisex'],['luxury','minimal'],'#181a1d','#33363a','trousers'),
  item('shorts-utility','bottoms','Utility къси панталони','Utility shorts','dark utility shorts with structured pockets',['unisex'],['street','summer'],'#394047','#1f2428','shorts'),
  item('skirt-mini-black','bottoms','Черна мини пола','Black mini skirt','structured black mini skirt',['female'],['nightlife','fashion'],'#17191c','#383c42','skirt'),
  item('leggings-graphite','bottoms','Графитен клин','Graphite leggings','matte graphite performance leggings',['female','unisex'],['sport'],'#30343a','#17191c','leggings'),
  item('wide-leg-cream','bottoms','Кремав широк панталон','Cream wide-leg trousers','high-waisted cream wide-leg trousers',['female','unisex'],['fashion','coastal'],'#c9bda8','#efe6d7','wide'),

  item('sneakers-white','shoes','Бели sneakers','White sneakers','clean premium white low-top sneakers',['unisex'],['street','clean'],'#e9e9e5','#a9adb1','sneakers'),
  item('sneakers-black','shoes','Черни sneakers','Black sneakers','matte black low-top sneakers',['unisex'],['street','minimal'],'#17191b','#35383d','sneakers'),
  item('boots-combat','shoes','Черни combat boots','Black combat boots','black lace-up combat boots',['unisex'],['utility','street'],'#191815','#39342e','boots'),
  item('loafers-brown','shoes','Кафяви loafers','Brown loafers','polished dark brown leather loafers',['unisex'],['luxury','classic'],'#4f3425','#9b7558','loafers'),
  item('heels-black','shoes','Черни токчета','Black heels','minimal black block-heel shoes',['female'],['nightlife','luxury'],'#151618','#34363a','heels'),

  item('none','eyewear','Без очила','No eyewear','no eyewear',['unisex'],['none'],'#000000','#000000','none'),
  item('glasses-clear','eyewear','Прозрачни очила','Clear glasses','thin clear-frame optical glasses',['unisex'],['clean','creative'],'#d8e0e5','#7a8993','glasses'),
  item('sunglasses-black','eyewear','Черни слънчеви очила','Black sunglasses','sharp black rectangular sunglasses',['unisex'],['nightlife','street'],'#111315','#555b61','sunglasses'),
  item('aviators-gold','eyewear','Златни aviator','Gold aviators','gold metal aviator sunglasses',['unisex'],['luxury','coastal'],'#c9a24a','#362d20','aviators'),

  item('none','headwear','Без шапка','No headwear','no headwear',['unisex'],['none'],'#000000','#000000','none'),
  item('cap-black','headwear','Черна шапка','Black cap','black structured baseball cap',['unisex'],['street','sport'],'#15181b','#353a40','cap'),
  item('bucket-sand','headwear','Пясъчна bucket hat','Sand bucket hat','sand-colored bucket hat',['unisex'],['street','summer'],'#b8a184','#e1d3bf','bucket'),
  item('beanie-charcoal','headwear','Графитена beanie','Charcoal beanie','charcoal rib-knit beanie',['unisex'],['street','winter'],'#34383d','#17191c','beanie'),

  item('none','jewelry','Без бижу','No jewelry','no visible jewelry',['unisex'],['none'],'#000000','#000000','none'),
  item('chain-silver','jewelry','Сребърна верижка','Silver chain','minimal polished silver chain necklace',['unisex'],['street','luxury'],'#c5cbd0','#646c73','chain'),
  item('chain-gold','jewelry','Златна верижка','Gold chain','subtle polished gold chain necklace',['unisex'],['luxury','nightlife'],'#d0a746','#73551b','chain'),
  item('pearls-modern','jewelry','Модерни перли','Modern pearls','modern minimal pearl necklace',['female','unisex'],['fashion','luxury'],'#eee8dc','#aea89d','pearls'),

  item('none','accessory','Без аксесоар','No accessory','no additional accessory',['unisex'],['none'],'#000000','#000000','none'),
  item('watch-steel','accessory','Стоманен часовник','Steel watch','brushed steel luxury wristwatch',['unisex'],['luxury'],'#b9c1c8','#4d555c','watch'),
  item('watch-sport','accessory','Спортен часовник','Sport watch','black digital performance watch',['unisex'],['sport','utility'],'#16191c','#3d444a','watch'),
  item('bag-crossbody','accessory','Crossbody чанта','Crossbody bag','compact black crossbody utility bag',['unisex'],['street','utility'],'#202428','#4c535a','bag')
];

const BY_SLOT = new Map<CharacterCatalogSlot, CharacterCatalogItem[]>();
const BY_ID = new Map<string, CharacterCatalogItem>();
for (const entry of CHARACTER_CATALOG) {
  const list = BY_SLOT.get(entry.slot) ?? [];
  list.push(entry);
  BY_SLOT.set(entry.slot, list);
  BY_ID.set(`${entry.slot}:${entry.id}`, entry);
}

export function catalogFor(slot: CharacterCatalogSlot, sex: CharacterSex) {
  return (BY_SLOT.get(slot) ?? []).filter(item => item.sexes.includes('unisex') || item.sexes.includes(sex));
}
export function catalogItem(slot: CharacterCatalogSlot, id: string) {
  return BY_ID.get(`${slot}:${id}`);
}

function item(
  id: string,
  slot: CharacterCatalogSlot,
  nameBg: string,
  nameEn: string,
  prompt: string,
  sexes: Array<CharacterSex | 'unisex'>,
  tags: string[],
  primary: string,
  secondary: string,
  renderKind: string
): CharacterCatalogItem {
  return { id, slot, nameBg, nameEn, prompt, sexes, tags, primary, secondary, renderKind, source: 'seed' };
}
