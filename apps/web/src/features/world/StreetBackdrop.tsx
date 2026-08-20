import type { StreetSceneDefinition } from './street-config';

export function StreetBackdrop({ theme, alerted }: { theme: StreetSceneDefinition['theme']; alerted: boolean }) {
  return (
    <svg className={`street-backdrop street-backdrop-${theme}`} viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#34444a" /><stop offset="1" stopColor="#1a282d" /></linearGradient>
        <linearGradient id="sidewalk" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b7b2a7" /><stop offset="1" stopColor="#89877f" /></linearGradient>
        <linearGradient id="roof" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#4d6670" /><stop offset="1" stopColor="#283d45" /></linearGradient>
        <linearGradient id="warmRoof" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#765b50" /><stop offset="1" stopColor="#3e3431" /></linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#8fc1c9" stopOpacity=".7" /><stop offset="1" stopColor="#27454d" stopOpacity=".92" /></linearGradient>
        <filter id="drop" x="-20%" y="-20%" width="150%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#02080a" floodOpacity=".5" /></filter>
        <pattern id="concrete" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M0 36 36 0M-10 10 10-10M26 46 46 26" stroke="#fff" strokeOpacity=".025" /></pattern>
      </defs>
      <rect width="1200" height="700" fill="#14272d" />
      <rect width="1200" height="700" fill="url(#concrete)" />
      {theme === 'market' && <MarketScene alerted={alerted} />}
      {theme === 'corner' && <CornerScene />}
      {theme === 'alley' && <AlleyScene />}
      <rect x="8" y="8" width="1184" height="684" rx="25" fill="none" stroke="#fff" strokeOpacity=".035" />
    </svg>
  );
}

function MarketScene({ alerted }: { alerted: boolean }) {
  return <>
    <rect x="0" y="445" width="1200" height="255" fill="url(#road)" />
    <rect x="0" y="395" width="1200" height="56" fill="url(#sidewalk)" />
    <rect x="0" y="638" width="1200" height="62" fill="url(#sidewalk)" />
    <path d="M0 451h1200M0 632h1200" stroke="#d6d1c5" strokeWidth="5" opacity=".65" />
    <path d="M0 541h1200" stroke="#d7bd6c" strokeWidth="4" strokeDasharray="34 30" opacity=".72" />
    <Crosswalk x={525} y={455} width={150} height={170} />

    <Building x={32} y={72} w={285} h={278} tone="cool" sign="EL CAMINO" />
    <Storefront x={64} y={286} w={220} h={89} label="RESTAURANT" />
    <Building x={420} y={46} w={355} h={303} tone="cool" sign="CYPRESS APARTMENTS" />
    <g filter="url(#drop)"><rect x="508" y="260" width="176" height="116" rx="5" fill="#1b2e34" /><rect x="542" y="284" width="108" height="92" fill="url(#glass)" /><path d="M596 284v92" stroke="#d8edef" strokeOpacity=".25" /></g>
    <Building x={861} y={66} w={306} h={288} tone="warm" sign="MERCADO 24" />
    <Storefront x={907} y={277} w={205} h={100} label={alerted ? 'ALERT / MERCADO 24' : 'OPEN / MERCADO 24'} alert={alerted} />

    <ParkingBay x={329} y={403} />
    <ParkingBay x={734} y={403} />
    <Car x={345} y={470} rotate={2} />
    <Car x={742} y={579} rotate={-2} />
    <Tree x={355} y={356} /><Tree x={817} y={354} /><Tree x={1126} y={384} />
    <Lamp x={390} y={405} /><Lamp x={806} y={405} /><Bench x={1045} y={411} />
    <Hydrant x={144} y={415} /><Mailbox x={965} y={416} />
    <StreetSign x={699} y={421} top="MARKET ST" bottom="BLOCK 3" />
    <rect x="1123" y="387" width="77" height="52" fill="#26373b" /><path d="M1140 387v52M1163 387v52" stroke="#0d1c20" strokeWidth="5" opacity=".7" />
  </>;
}

function CornerScene() {
  return <>
    <rect x="0" y="432" width="1200" height="268" fill="url(#road)" />
    <rect x="0" y="376" width="1200" height="60" fill="url(#sidewalk)" />
    <path d="M0 438h1200" stroke="#d6d1c5" strokeWidth="5" opacity=".65" />
    <path d="M0 550h1200" stroke="#d8c476" strokeWidth="4" strokeDasharray="34 28" opacity=".62" />
    <Crosswalk x={830} y={446} width={145} height={190} />

    <Building x={38} y={56} w={340} h={286} tone="cool" sign="CYPRESS APARTMENTS" />
    <g filter="url(#drop)"><rect x="118" y="250" width="170" height="127" rx="5" fill="#1a2c32" /><rect x="161" y="273" width="85" height="104" fill="url(#glass)" /></g>
    <Building x={821} y={83} w={330} h={260} tone="warm" sign="LOCAL SHOPS" />
    <Storefront x={878} y={278} w={208} h={96} label="NEIGHBORHOOD RETAIL" />

    <rect x="421" y="91" width="321" height="245" rx="18" fill="#29473f" stroke="#78948a" strokeOpacity=".22" />
    <path d="M447 282c78-70 160-94 265-132" stroke="#b7ae93" strokeWidth="24" fill="none" opacity=".65" />
    <Tree x={470} y={145} /><Tree x={586} y={119} /><Tree x={682} y={203} /><Tree x={534} y={274} />
    <Bench x={625} y={280} /><Lamp x={405} y={386} /><Lamp x={783} y={386} />
    <BusShelter x={522} y={354} />
    <Hydrant x={314} y={397} /><Mailbox x={1044} y={398} />
    <Car x={218} y={492} rotate={-1} /><Car x={958} y={594} rotate={2} />
    <StreetSign x={771} y={408} top="CYPRESS AVE" bottom="MARKET" />
  </>;
}

function AlleyScene() {
  return <>
    <rect x="300" y="0" width="600" height="700" fill="url(#road)" />
    <rect x="266" y="0" width="40" height="700" fill="#777971" /><rect x="894" y="0" width="40" height="700" fill="#777971" />
    <path d="M306 0v700M894 0v700" stroke="#c9c4b7" strokeWidth="5" opacity=".5" />
    <path d="M600 0v700" stroke="#cbb66d" strokeWidth="4" strokeDasharray="28 30" opacity=".42" />

    <Building x={20} y={35} w={245} h={560} tone="cool" sign="SERVICE BLOCK" />
    <Building x={935} y={25} w={245} h={570} tone="warm" sign="EL CAMINO" />
    <g filter="url(#drop)"><rect x="944" y="190" width="214" height="145" rx="5" fill="#1a292e" /><rect x="982" y="218" width="135" height="96" fill="#112126" /><text x="1001" y="274" fill="#d6aa5f" fontSize="17" fontWeight="800" letterSpacing="3">BACK DOOR</text></g>

    <LoadingDoor x={45} y={188} label="LOADING 01" /><LoadingDoor x={45} y={382} label="STORAGE" />
    <Dumpster x={218} y={392} />
    <UtilityBox x={824} y={112} /><UtilityBox x={333} y={194} />
    <Pallets x={751} y={344} />
    <DeliveryVan x={487} y={180} />
    <Lamp x={335} y={111} /><Lamp x={865} y={318} />
    <Drain x={557} y={506} /><Drain x={668} y={590} />
    <StreetSign x={771} y={77} top="MIRA" bottom="SERVICE" />
    <path d="M332 650h536" stroke="#d7d0bd" strokeWidth="10" opacity=".45" />
  </>;
}

function Building({ x, y, w, h, tone, sign }: { x: number; y: number; w: number; h: number; tone: 'cool' | 'warm'; sign: string }) {
  return <g filter="url(#drop)">
    <rect x={x} y={y} width={w} height={h} rx="8" fill={tone === 'cool' ? 'url(#roof)' : 'url(#warmRoof)'} />
    <rect x={x + 16} y={y + 18} width={w - 32} height={h - 60} rx="4" fill="#20353b" opacity=".82" />
    {Array.from({ length: Math.max(2, Math.floor(w / 70)) }, (_, index) => <rect key={index} x={x + 28 + index * 58} y={y + 54} width="34" height="42" rx="3" fill="url(#glass)" opacity=".66" />)}
    <rect x={x + 18} y={y + h - 49} width={w - 36} height="32" rx="4" fill="#13262b" />
    <text x={x + 30} y={y + h - 27} fill="#dce7e8" fontSize="13" fontWeight="800" letterSpacing="2">{sign}</text>
  </g>;
}

function Storefront({ x, y, w, h, label, alert = false }: { x: number; y: number; w: number; h: number; label: string; alert?: boolean }) {
  return <g filter="url(#drop)"><rect x={x} y={y} width={w} height={h} rx="5" fill="#172a30" /><rect x={x + 12} y={y + 16} width={w - 24} height={h - 30} rx="4" fill="url(#glass)" /><rect x={x + 12} y={y + 16} width={w - 24} height="24" rx="3" fill={alert ? '#9d443f' : '#2a3e43'} /><text x={x + 24} y={y + 33} fill="#f4e5c2" fontSize="10" fontWeight="800" letterSpacing="1.5">{label}</text></g>;
}

function Crosswalk({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  return <g opacity=".82">{Array.from({ length: 6 }, (_, index) => <rect key={index} x={x + index * (width / 6)} y={y} width={width / 10} height={height} fill="#ddd9cf" />)}</g>;
}

function ParkingBay({ x, y }: { x: number; y: number }) { return <g opacity=".36"><path d={`M${x} ${y}v45M${x + 105} ${y}v45`} stroke="#eff1ec" strokeWidth="3" /></g>; }
function Tree({ x, y }: { x: number; y: number }) { return <g filter="url(#drop)"><circle cx={x} cy={y} r="29" fill="#315c4e" /><circle cx={x - 16} cy={y + 4} r="18" fill="#3b6b59" /><circle cx={x + 18} cy={y - 6} r="18" fill="#294f44" /><rect x={x - 4} y={y + 22} width="8" height="31" fill="#5a4234" /></g>; }
function Lamp({ x, y }: { x: number; y: number }) { return <g><path d={`M${x} ${y}v-52`} stroke="#15282d" strokeWidth="7" /><circle cx={x} cy={y - 56} r="8" fill="#f2d488" /></g>; }
function Bench({ x, y }: { x: number; y: number }) { return <g><rect x={x} y={y} width="72" height="12" rx="3" fill="#35484c" /><path d={`M${x + 10} ${y + 12}v20M${x + 62} ${y + 12}v20M${x + 12} ${y - 12}v12M${x + 36} ${y - 12}v12M${x + 60} ${y - 12}v12`} stroke="#1a2a2e" strokeWidth="5" /></g>; }
function Hydrant({ x, y }: { x: number; y: number }) { return <g><rect x={x - 6} y={y - 24} width="12" height="24" rx="4" fill="#b85b4e" /><circle cx={x} cy={y - 27} r="8" fill="#d77462" /></g>; }
function Mailbox({ x, y }: { x: number; y: number }) { return <g><rect x={x - 12} y={y - 31} width="24" height="28" rx="4" fill="#36566a" /><rect x={x - 3} y={y - 3} width="6" height="24" fill="#1c2c33" /></g>; }
function Car({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) { return <g transform={`translate(${x} ${y}) rotate(${rotate})`} filter="url(#drop)"><rect width="115" height="48" rx="16" fill="#52636a" /><rect x="24" y="7" width="61" height="32" rx="8" fill="#1f333a" /><rect x="9" y="9" width="14" height="30" rx="5" fill="#2a383d" /><rect x="92" y="9" width="14" height="30" rx="5" fill="#2a383d" /></g>; }
function BusShelter({ x, y }: { x: number; y: number }) { return <g filter="url(#drop)"><rect x={x} y={y - 48} width="116" height="48" rx="5" fill="#2b434a" /><rect x={x + 8} y={y - 40} width="100" height="33" fill="url(#glass)" /><path d={`M${x + 19} ${y}v24M${x + 98} ${y}v24`} stroke="#1c2b30" strokeWidth="6" /></g>; }
function StreetSign({ x, y, top, bottom }: { x: number; y: number; top: string; bottom: string }) { return <g><path d={`M${x} ${y}v-65`} stroke="#16292e" strokeWidth="7" /><rect x={x - 54} y={y - 88} width="108" height="22" rx="4" fill="#274d48" /><rect x={x - 44} y={y - 62} width="88" height="20" rx="4" fill="#315b55" /><text x={x} y={y - 73} textAnchor="middle" fill="#e5eeea" fontSize="10" fontWeight="800">{top}</text><text x={x} y={y - 48} textAnchor="middle" fill="#e5eeea" fontSize="9" fontWeight="800">{bottom}</text></g>; }
function LoadingDoor({ x, y, label }: { x: number; y: number; label: string }) { return <g><rect x={x} y={y} width="177" height="124" rx="4" fill="#15282e" /><path d={`M${x + 18} ${y + 18}h141v88H${x + 18}Z`} stroke="#496067" strokeWidth="6" fill="none" /><text x={x + 88} y={y + 69} textAnchor="middle" fill="#7f949b" fontSize="12" fontWeight="800" letterSpacing="2">{label}</text></g>; }
function Dumpster({ x, y }: { x: number; y: number }) { return <g filter="url(#drop)"><rect x={x} y={y} width="72" height="42" rx="5" fill="#31575a" /><path d={`M${x - 4} ${y + 5}h80M${x + 12} ${y}l6-12h38l6 12`} stroke="#15292e" strokeWidth="6" /><circle cx={x + 13} cy={y + 45} r="4" fill="#111d21" /><circle cx={x + 59} cy={y + 45} r="4" fill="#111d21" /></g>; }
function UtilityBox({ x, y }: { x: number; y: number }) { return <g><rect x={x} y={y} width="42" height="61" rx="4" fill="#46575b" /><path d={`M${x + 8} ${y + 18}h26M${x + 8} ${y + 31}h26`} stroke="#1c2b2f" strokeWidth="4" /></g>; }
function Pallets({ x, y }: { x: number; y: number }) { return <g><rect x={x} y={y} width="86" height="18" fill="#735743" /><rect x={x + 8} y={y - 20} width="70" height="18" fill="#806249" /><path d={`M${x + 13} ${y - 20}v38M${x + 43} ${y - 20}v38M${x + 73} ${y - 20}v38`} stroke="#4e392d" strokeWidth="5" /></g>; }
function DeliveryVan({ x, y }: { x: number; y: number }) { return <g filter="url(#drop)"><rect x={x} y={y} width="126" height="68" rx="13" fill="#59676b" /><rect x={x + 72} y={y + 9} width="42" height="29" rx="4" fill="#20343b" /><rect x={x + 12} y={y + 12} width="49" height="40" rx="3" fill="#e4d4b5" opacity=".35" /><circle cx={x + 28} cy={y + 69} r="12" fill="#10191d" /><circle cx={x + 99} cy={y + 69} r="12" fill="#10191d" /></g>; }
function Drain({ x, y }: { x: number; y: number }) { return <g opacity=".5"><rect x={x} y={y} width="55" height="17" rx="3" fill="#101a1d" /><path d={`M${x + 10} ${y + 3}v11M${x + 21} ${y + 3}v11M${x + 32} ${y + 3}v11M${x + 43} ${y + 3}v11`} stroke="#526064" strokeWidth="2" /></g>; }
