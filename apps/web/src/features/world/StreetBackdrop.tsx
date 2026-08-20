import type { StreetSceneDefinition } from './street-config';

export function StreetBackdrop({ theme, alerted }: { theme: StreetSceneDefinition['theme']; alerted: boolean }) {
  return (
    <svg className={`street-backdrop street-backdrop-${theme}`} viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sd-road-v2" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#35454b" /><stop offset="1" stopColor="#202e33" /></linearGradient>
        <linearGradient id="sd-sidewalk-v2"><stop stopColor="#bbb6aa" /><stop offset="1" stopColor="#8d8b82" /></linearGradient>
        <linearGradient id="sd-cool-v2" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#3e5962" /><stop offset="1" stopColor="#263b42" /></linearGradient>
        <linearGradient id="sd-warm-v2" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#664d44" /><stop offset="1" stopColor="#3b3330" /></linearGradient>
        <linearGradient id="sd-glass-v2" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#93c8cf" stopOpacity=".72" /><stop offset="1" stopColor="#31515a" stopOpacity=".9" /></linearGradient>
        <filter id="sd-drop-v2" x="-20%" y="-20%" width="150%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#02080a" floodOpacity=".42" /></filter>
        <pattern id="sd-asphalt-v2" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="4" cy="8" r="1" fill="#fff" opacity=".025" /><circle cx="21" cy="23" r="1" fill="#000" opacity=".08" /></pattern>
      </defs>
      <rect width="1200" height="700" fill="#14272d" />
      {theme === 'market' && <MarketScene alerted={alerted} />}
      {theme === 'corner' && <CornerScene />}
      {theme === 'alley' && <AlleyScene />}
      <rect width="1200" height="700" fill="url(#sd-asphalt-v2)" pointerEvents="none" />
      <rect x="7" y="7" width="1186" height="686" rx="24" fill="none" stroke="#fff" strokeOpacity=".04" />
    </svg>
  );
}

function StreetBase({ crosswalkX = 555 }: { crosswalkX?: number }) {
  return <>
    <rect x="0" y="220" width="1200" height="62" fill="url(#sd-sidewalk-v2)" />
    <rect x="0" y="282" width="1200" height="184" fill="url(#sd-road-v2)" />
    <rect x="0" y="466" width="1200" height="62" fill="url(#sd-sidewalk-v2)" />
    <path d="M0 282h1200M0 466h1200" stroke="#e1dbcf" strokeWidth="5" opacity=".58" />
    <path d="M0 374h1200" stroke="#d7bf70" strokeWidth="4" strokeDasharray="34 31" opacity=".7" />
    <Crosswalk x={crosswalkX} y={291} width={120} height={166} />
  </>;
}

function MarketScene({ alerted }: { alerted: boolean }) {
  return <>
    <StreetBase />
    <Building x={45} y={34} w={270} h={186} sign="EL CAMINO" tone="cool" entranceX={225} shop="RESTAURANT" />
    <Building x={350} y={24} w={330} h={196} sign="CYPRESS APARTMENTS" tone="cool" entranceX={590} />
    <Building x={805} y={36} w={300} h={184} sign="MERCADO 24" tone="warm" entranceX={955} shop={alerted ? 'ALERT' : 'OPEN'} alert={alerted} />
    <Building x={24} y={528} w={245} h={148} sign="LAVANDERIA" tone="warm" entranceX={188} side="south" />
    <Building x={292} y={528} w={260} h={148} sign="DORADO OFFICES" tone="cool" entranceX={420} side="south" />
    <ParkingLot x={575} y={540} w={210} />
    <Building x={812} y={528} w={350} h={148} sign="PALMAS MARKET" tone="cool" entranceX={950} side="south" />
    <Tree x={330} y={244} /><Tree x={716} y={244} /><Tree x={1118} y={244} /><Tree x={286} y={503} /><Tree x={803} y={503} />
    <Lamp x={377} y={271} /><Lamp x={761} y={271} /><Lamp x={1100} y={515} /><Bench x={1010} y={508} />
    <Hydrant x={132} y={273} /><Mailbox x={998} y={273} /><Bicycle x={736} y={506} />
    <StreetSign x={690} y={272} top="MARKET ST" bottom="BLOCK 3" />
    <ServiceGate x={1060} y={535} />
  </>;
}

function CornerScene() {
  return <>
    <StreetBase crosswalkX={840} />
    <Building x={55} y={30} w={300} h={190} sign="CYPRESS APARTMENTS" tone="cool" entranceX={238} />
    <Park x={390} y={38} w={330} h={172} />
    <Building x={755} y={42} w={390} h={178} sign="LOCAL SHOPS" tone="warm" entranceX={960} shop="NEIGHBORHOOD" />
    <Building x={24} y={528} w={250} h={148} sign="TOWNHOUSES" tone="cool" entranceX={155} side="south" />
    <Building x={300} y={528} w={245} h={148} sign="BODEGA" tone="warm" entranceX={420} side="south" />
    <ParkingLot x={576} y={540} w={260} />
    <Building x={866} y={528} w={305} h={148} sign="PALMAS OFFICES" tone="cool" entranceX={1015} side="south" />
    <BusShelter x={598} y={504} /><Bench x={504} y={506} /><Bench x={705} y={506} />
    <Tree x={425} y={95} /><Tree x={515} y={120} /><Tree x={620} y={86} /><Tree x={675} y={160} /><Tree x={365} y={503} /><Tree x={1080} y={503} />
    <Lamp x={375} y={272} /><Lamp x={780} y={272} /><Hydrant x={315} y={273} /><Mailbox x={1040} y={273} />
    <StreetSign x={770} y={272} top="CYPRESS AVE" bottom="MARKET" />
  </>;
}

function AlleyScene() {
  return <>
    <StreetBase crosswalkX={545} />
    <Building x={25} y={38} w={275} h={182} sign="WAREHOUSE A" tone="cool" entranceX={180} />
    <Building x={330} y={30} w={310} h={190} sign="SERVICE BLOCK" tone="cool" entranceX={600} shop="LOADING" />
    <Building x={720} y={36} w={330} h={184} sign="EL CAMINO" tone="warm" entranceX={948} shop="BACK DOOR" />
    <Building x={1070} y={52} w={105} h={168} sign="UTIL" tone="cool" entranceX={1125} />
    <Building x={20} y={528} w={255} h={148} sign="STORAGE" tone="cool" entranceX={150} side="south" />
    <LoadingYard x={300} y={540} w={300} />
    <ParkingLot x={630} y={540} w={255} />
    <Building x={910} y={528} w={265} h={148} sign="WAREHOUSE B" tone="warm" entranceX={1040} side="south" />
    <Dumpster x={278} y={486} /><Pallets x={410} y={500} /><UtilityBox x={654} y={246} /><TrashBags x={870} y={502} />
    <Lamp x={335} y={271} /><Lamp x={865} y={271} /><Lamp x={610} y={516} />
    <StreetSign x={770} y={272} top="MIRA" bottom="SERVICE" />
  </>;
}

function Building({ x, y, w, h, sign, tone, entranceX, side = 'north', shop, alert = false }: { x:number; y:number; w:number; h:number; sign:string; tone:'cool'|'warm'; entranceX:number; side?:'north'|'south'; shop?:string; alert?:boolean }) {
  const entranceY = side === 'north' ? y + h - 58 : y;
  const windowY = side === 'north' ? y + 34 : y + 66;
  const signY = side === 'north' ? y + h - 18 : y + 27;
  return <g filter="url(#sd-drop-v2)">
    <rect x={x} y={y} width={w} height={h} rx="7" fill={tone === 'cool' ? 'url(#sd-cool-v2)' : 'url(#sd-warm-v2)'} />
    <rect x={x+12} y={y+12} width={w-24} height={h-24} rx="5" fill="#21363c" opacity=".72" />
    {Array.from({ length: Math.max(2, Math.floor(w/65)) }, (_,i) => <rect key={i} x={x+24+i*55} y={windowY} width="31" height="35" rx="3" fill="url(#sd-glass-v2)" opacity=".72" />)}
    <rect x={entranceX-24} y={entranceY} width="48" height="58" rx="3" fill="url(#sd-glass-v2)" stroke="#d7ecee" strokeOpacity=".2" />
    <path d={`M${entranceX} ${entranceY}v58`} stroke="#d7ecee" strokeOpacity=".24" />
    <text x={x+18} y={signY} fill="#e2ebeb" fontSize="11" fontWeight="800" letterSpacing="1.5">{sign}</text>
    {shop && <><rect x={entranceX-40} y={side==='north'?entranceY-22:entranceY+62} width="80" height="16" rx="3" fill={alert?'#93463f':'#253f45'} /><text x={entranceX} y={side==='north'?entranceY-10:entranceY+74} textAnchor="middle" fill="#f1d89f" fontSize="8" fontWeight="800" letterSpacing="1">{shop}</text></>}
  </g>;
}

function Park({x,y,w,h}:{x:number;y:number;w:number;h:number}) { return <g><rect x={x} y={y} width={w} height={h} rx="16" fill="#294b41" /><path d={`M${x+25} ${y+h-25}C${x+90} ${y+45} ${x+210} ${y+135} ${x+w-24} ${y+28}`} fill="none" stroke="#b9ad8e" strokeWidth="18" opacity=".65" /><Tree x={x+75} y={y+52} /><Tree x={x+178} y={y+72} /><Tree x={x+270} y={y+48} /><Bench x={x+120} y={y+h-35} /></g>; }
function Crosswalk({x,y,width,height}:{x:number;y:number;width:number;height:number}) { return <g opacity=".82">{Array.from({length:7},(_,i)=><rect key={i} x={x+i*(width/7)} y={y} width={width/12} height={height} fill="#dedbd2" />)}</g>; }
function Tree({x,y}:{x:number;y:number}) { return <g><rect x={x-4} y={y+15} width="8" height="28" fill="#5a4234" /><circle cx={x} cy={y} r="23" fill="#315b4e" /><circle cx={x-13} cy={y+3} r="14" fill="#3c6b59" /><circle cx={x+14} cy={y-5} r="14" fill="#294f44" /></g>; }
function Lamp({x,y}:{x:number;y:number}) { return <g><path d={`M${x} ${y}v-42`} stroke="#182a2e" strokeWidth="6" /><circle cx={x} cy={y-46} r="7" fill="#f0d181" /></g>; }
function Bench({x,y}:{x:number;y:number}) { return <g><rect x={x} y={y} width="64" height="10" rx="3" fill="#35484c" /><path d={`M${x+9} ${y+10}v17M${x+55} ${y+10}v17M${x+10} ${y-10}v10M${x+32} ${y-10}v10M${x+54} ${y-10}v10`} stroke="#1b2c30" strokeWidth="4" /></g>; }
function StreetSign({x,y,top,bottom}:{x:number;y:number;top:string;bottom:string}) { return <g><path d={`M${x} ${y}v-53`} stroke="#182b30" strokeWidth="6" /><rect x={x-50} y={y-75} width="100" height="19" rx="4" fill="#28514b" /><rect x={x-39} y={y-52} width="78" height="17" rx="4" fill="#35635b" /><text x={x} y={y-62} textAnchor="middle" fill="#e8efec" fontSize="8" fontWeight="800">{top}</text><text x={x} y={y-40} textAnchor="middle" fill="#e8efec" fontSize="7" fontWeight="800">{bottom}</text></g>; }
function ParkingLot({x,y,w}:{x:number;y:number;w:number}) { return <g><rect x={x} y={y} width={w} height="126" rx="6" fill="#26363b" /><path d={`M${x+20} ${y+8}v108M${x+w/2} ${y+8}v108M${x+w-20} ${y+8}v108`} stroke="#e6e1d7" strokeWidth="3" opacity=".36" /></g>; }
function LoadingYard({x,y,w}:{x:number;y:number;w:number}) { return <g><rect x={x} y={y} width={w} height="126" rx="6" fill="#29393e" /><path d={`M${x+20} ${y+35}h${w-40}M${x+20} ${y+70}h${w-40}`} stroke="#75868a" strokeWidth="5" opacity=".35" /><Pallets x={x+45} y={y+90} /></g>; }
function BusShelter({x,y}:{x:number;y:number}) { return <g><rect x={x} y={y-42} width="102" height="42" rx="5" fill="#2b444b" /><rect x={x+8} y={y-34} width="86" height="27" fill="url(#sd-glass-v2)" /><path d={`M${x+16} ${y}v20M${x+87} ${y}v20`} stroke="#1c2c31" strokeWidth="5" /></g>; }
function Hydrant({x,y}:{x:number;y:number}) { return <g><rect x={x-5} y={y-19} width="10" height="19" rx="3" fill="#b85b4e" /><circle cx={x} cy={y-21} r="7" fill="#d77462" /></g>; }
function Mailbox({x,y}:{x:number;y:number}) { return <g><rect x={x-10} y={y-25} width="20" height="24" rx="4" fill="#385a6b" /><rect x={x-3} y={y-1} width="6" height="19" fill="#1c2c33" /></g>; }
function Bicycle({x,y}:{x:number;y:number}) { return <g fill="none" stroke="#273d44" strokeWidth="4"><circle cx={x} cy={y} r="12" /><circle cx={x+32} cy={y} r="12" /><path d={`M${x} ${y}l13-17 10 17H${x}m13-17 19 17m-22-24h10`} /></g>; }
function ServiceGate({x,y}:{x:number;y:number}) { return <g><rect x={x} y={y} width="98" height="116" fill="#2a3a3f" /><path d={`M${x+12} ${y}v116M${x+38} ${y}v116M${x+64} ${y}v116M${x+90} ${y}v116`} stroke="#132429" strokeWidth="6" /></g>; }
function Dumpster({x,y}:{x:number;y:number}) { return <g filter="url(#sd-drop-v2)"><rect x={x} y={y} width="68" height="37" rx="5" fill="#31565a" /><path d={`M${x-3} ${y+5}h74M${x+12} ${y}l6-10h34l6 10`} stroke="#15292e" strokeWidth="5" /></g>; }
function Pallets({x,y}:{x:number;y:number}) { return <g><rect x={x} y={y} width="75" height="14" fill="#735743" /><rect x={x+6} y={y-16} width="63" height="14" fill="#806249" /><path d={`M${x+12} ${y-16}v30M${x+38} ${y-16}v30M${x+63} ${y-16}v30`} stroke="#4e392d" strokeWidth="4" /></g>; }
function UtilityBox({x,y}:{x:number;y:number}) { return <g><rect x={x} y={y} width="34" height="50" rx="4" fill="#4b5d61" /><path d={`M${x+7} ${y+15}h20M${x+7} ${y+27}h20`} stroke="#1d2c30" strokeWidth="3" /></g>; }
function TrashBags({x,y}:{x:number;y:number}) { return <g><circle cx={x} cy={y} r="13" fill="#18272a" /><circle cx={x+17} cy={y+4} r="11" fill="#1c2b2e" /><path d={`M${x-4} ${y-12}l4-7 5 7M${x+13} ${y-7}l4-7 4 8`} stroke="#38484b" strokeWidth="3" /></g>; }
