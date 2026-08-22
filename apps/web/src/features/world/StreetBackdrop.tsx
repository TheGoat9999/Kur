import type { StreetSceneDefinition } from './street-config';

type Theme = StreetSceneDefinition['theme'];

export function StreetBackdrop({ theme, alerted }: { theme: Theme; alerted: boolean }) {
  return <svg className={`street-backdrop street-backdrop-${theme}`} viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="sd-road" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#39474c"/><stop offset=".52" stopColor="#2d393e"/><stop offset="1" stopColor="#222d31"/></linearGradient>
      <linearGradient id="sd-sidewalk" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c7c0b1"/><stop offset="1" stopColor="#918f85"/></linearGradient>
      <linearGradient id="sd-building-cool"><stop stopColor="#49626a"/><stop offset="1" stopColor="#273c43"/></linearGradient>
      <linearGradient id="sd-building-warm"><stop stopColor="#805846"/><stop offset="1" stopColor="#44372f"/></linearGradient>
      <linearGradient id="sd-building-industrial"><stop stopColor="#5c5a51"/><stop offset="1" stopColor="#343a39"/></linearGradient>
      <linearGradient id="sd-glass" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a3d5da" stopOpacity=".76"/><stop offset="1" stopColor="#355862" stopOpacity=".92"/></linearGradient>
      <linearGradient id="sd-grass"><stop stopColor="#55774e"/><stop offset="1" stopColor="#31563d"/></linearGradient>
      <pattern id="sd-asphalt-noise" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="4" cy="7" r="1" fill="#fff" opacity=".026"/><circle cx="19" cy="22" r="1" fill="#000" opacity=".1"/></pattern>
      <pattern id="sd-industrial-grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M0 34L34 0M-8 8L8-8M26 42L42 26" stroke="#b4a572" strokeWidth="3" opacity=".08"/></pattern>
      <filter id="sd-shadow" x="-20%" y="-20%" width="150%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#02080a" floodOpacity=".4"/></filter>
    </defs>
    <rect width="1200" height="700" fill={theme === 'alley' ? '#202c2e' : theme === 'corner' ? '#1d3430' : '#1b3035'}/>
    {theme === 'market' && <MarketBoulevard alerted={alerted}/>} {theme === 'corner' && <CypressParkCorner/>} {theme === 'alley' && <MiraServiceYard/>}
    <rect width="1200" height="700" fill="url(#sd-asphalt-noise)" pointerEvents="none"/><rect x="7" y="7" width="1186" height="686" rx="24" fill="none" stroke="#fff" strokeOpacity=".045"/>
  </svg>;
}

function MarketBoulevard({ alerted }: { alerted: boolean }) {
  return <>
    <rect x="0" y="232" width="1200" height="78" fill="url(#sd-sidewalk)"/><rect x="0" y="310" width="1200" height="138" fill="url(#sd-road)"/><rect x="0" y="448" width="1200" height="82" fill="url(#sd-sidewalk)"/>
    <rect x="0" y="372" width="1200" height="14" fill="#59634e" opacity=".9"/><path d="M0 310H1200M0 448H1200" stroke="#e6ded0" strokeWidth="5" opacity=".7"/><path d="M0 355H1200M0 404H1200" stroke="#ece4d6" strokeWidth="2" strokeDasharray="22 26" opacity=".34"/><path d="M0 379H1200" stroke="#d6b65c" strokeWidth="2" strokeDasharray="13 17" opacity=".58"/>
    <Crosswalk x={555} y={314} h={130}/><MedianPalms/><SideStreet x={590} direction="north" width={118}/><SideStreet x={892} direction="south" width={98}/>
    <Building x={32} y={42} w={280} h={184} label="EL CAMINO" tone="warm"/><Building x={345} y={28} w={330} h={198} label="CYPRESS APARTMENTS" tone="cool"/><Building x={805} y={40} w={330} h={186} label="MERCADO 24" tone={alerted ? 'alert' : 'warm'}/>
    <Building x={28} y={538} w={255} h={136} label="LAVANDERIA" tone="warm"/><Building x={308} y={538} w={238} h={136} label="DORADO OFFICES" tone="cool"/><Parking x={612} y={548} w={184} h={112}/><Building x={824} y={538} w={340} h={136} label="PALMAS MARKET" tone="cool"/>
    <Tree x={90} y={264}/><Tree x={332} y={264}/><Tree x={742} y={264}/><Tree x={1102} y={264}/><Tree x={282} y={505}/><Tree x={815} y={505}/><Lamp x={214} y={276}/><Lamp x={754} y={276}/><Lamp x={1080} y={510}/><BusStop x={710} y={505}/><StreetSign x={650} y={280} a="MARKET ST" b="VESPUCCI"/><Continuation y={379}/>
  </>;
}

function CypressParkCorner() {
  return <>
    <path d="M0 315C230 305 350 320 535 331C720 342 888 324 1200 300V455C924 473 719 461 532 449C335 438 185 446 0 461Z" fill="url(#sd-road)"/>
    <path d="M0 299C225 289 361 304 542 315C729 326 894 309 1200 284" fill="none" stroke="#ded7c8" strokeWidth="18" opacity=".75"/><path d="M0 477C188 462 336 455 525 466C721 478 931 491 1200 471" fill="none" stroke="#ded7c8" strokeWidth="18" opacity=".75"/><path d="M0 382C236 370 362 382 536 391C725 401 902 385 1200 367" fill="none" stroke="#d8bc69" strokeWidth="4" strokeDasharray="34 31" opacity=".68"/>
    <path d="M818 320C850 286 900 268 956 272C1020 277 1065 309 1088 352C1108 393 1104 438 1079 474" fill="none" stroke="#273337" strokeWidth="128" strokeLinecap="round"/><path d="M818 320C850 286 900 268 956 272C1020 277 1065 309 1088 352C1108 393 1104 438 1079 474" fill="none" stroke="#677478" strokeWidth="92" strokeLinecap="round"/><path d="M830 323C864 295 910 283 958 288C1010 293 1047 318 1065 353C1083 389 1078 427 1057 460" fill="none" stroke="#d4ba68" strokeWidth="3" strokeDasharray="26 24"/>
    <Crosswalk x={805} y={318} h={126}/><Building x={38} y={38} w={292} h={188} label="CYPRESS APARTMENTS" tone="cool"/><Park x={365} y={40} w={350} h={186}/><Building x={752} y={44} w={392} h={180} label="LOCAL SHOPS" tone="warm"/>
    <Building x={28} y={534} w={250} h={140} label="TOWNHOUSES" tone="cool"/><Building x={307} y={536} w={242} h={138} label="BODEGA" tone="warm"/><Parking x={585} y={548} w={235} h={112}/><Building x={862} y={536} w={302} h={138} label="PALMAS OFFICES" tone="cool"/>
    <Tree x={405} y={82}/><Tree x={492} y={136}/><Tree x={602} y={85}/><Tree x={676} y={154}/><Tree x={350} y={505}/><Tree x={1110} y={498}/><Bench x={522} y={186}/><Bench x={634} y={186}/><BusStop x={618} y={505}/><Lamp x={335} y={276}/><Lamp x={760} y={278}/><StreetSign x={762} y={280} a="CYPRESS AVE" b="PALM GROVE"/><Continuation y={384}/>
  </>;
}

function MiraServiceYard() {
  return <>
    <rect width="1200" height="700" fill="url(#sd-industrial-grid)"/><path d="M0 330L280 320L472 342L680 324L900 339L1200 318V462L912 480L684 463L465 482L274 458L0 472Z" fill="#242f32"/>
    <path d="M0 349L279 340L469 361L681 343L900 358L1200 337" fill="none" stroke="#6c7777" strokeWidth="56" strokeLinecap="round" strokeLinejoin="round"/><path d="M0 446L272 433L466 458L682 440L910 457L1200 434" fill="none" stroke="#6c7777" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round" opacity=".72"/><path d="M350 349L351 210M505 365L506 221M783 350L848 205" stroke="#525f60" strokeWidth="44" strokeLinecap="round"/><path d="M350 349L351 210M505 365L506 221M783 350L848 205" stroke="#b3a66b" strokeWidth="3" strokeDasharray="19 17" opacity=".45"/>
    <Crosswalk x={512} y={339} h={112} muted/><Building x={24} y={46} w={270} h={174} label="WAREHOUSE A" tone="industrial"/><Building x={330} y={34} w={320} h={186} label="SERVICE BLOCK" tone="industrial"/><Building x={716} y={42} w={338} h={178} label="EL CAMINO · REAR" tone="warm"/><Building x={1070} y={58} w={105} h={162} label="UTIL" tone="industrial"/>
    <Building x={18} y={534} w={258} h={140} label="STORAGE" tone="industrial"/><LoadingYard x={302} y={538} w={288} h={126}/><Parking x={625} y={546} w={250} h={116} industrial/><Building x={910} y={534} w={266} h={140} label="WAREHOUSE B" tone="warm"/>
    <Dumpster x={260} y={500}/><Crates x={408} y={507}/><Crates x={455} y={511}/><UtilityBox x={650} y={252}/><Lamp x={326} y={276}/><Lamp x={865} y={278}/><Lamp x={615} y={514}/><StreetSign x={770} y={280} a="MIRA LANE" b="SERVICE"/><Continuation y={398} industrial/>
  </>;
}

function Building({x,y,w,h,label,tone}:{x:number;y:number;w:number;h:number;label:string;tone:'cool'|'warm'|'industrial'|'alert'}) { const fill=tone==='cool'?'url(#sd-building-cool)':tone==='industrial'?'url(#sd-building-industrial)':tone==='alert'?'#6c3733':'url(#sd-building-warm)'; return <g filter="url(#sd-shadow)"><rect x={x} y={y} width={w} height={h} rx="8" fill={fill}/><rect x={x+12} y={y+12} width={Math.max(20,w-24)} height={Math.max(20,h-24)} rx="5" fill="#203237" opacity=".62"/>{Array.from({length:Math.max(1,Math.floor(w/72))},(_,i)=><rect key={i} x={x+24+i*58} y={y+38} width="32" height="35" rx="3" fill="url(#sd-glass)" opacity={tone==='industrial'?.44:.72}/>) }<rect x={x+w*.58-22} y={y+h-61} width="44" height="61" rx="3" fill="#274249"/><text x={x+18} y={y+h-18} fill="#e8eeea" fontSize="11" fontWeight="800">{label}</text></g>; }
function Park({x,y,w,h}:{x:number;y:number;w:number;h:number}) { return <g filter="url(#sd-shadow)"><rect x={x} y={y} width={w} height={h} rx="28" fill="url(#sd-grass)" stroke="#78936c" strokeWidth="3"/><path d={`M${x+25} ${y+h-28}C${x+w*.34} ${y+56},${x+w*.64} ${y+h-44},${x+w-28} ${y+32}`} fill="none" stroke="#ccb990" strokeWidth="14" opacity=".65"/><ellipse cx={x+w*.48} cy={y+h*.53} rx={w*.13} ry={h*.16} fill="#2f7280"/></g>; }
function Parking({x,y,w,h,industrial=false}:{x:number;y:number;w:number;h:number;industrial?:boolean}) { return <g><rect x={x} y={y} width={w} height={h} rx="5" fill={industrial?'#3b4140':'#505a5c'}/>{Array.from({length:Math.max(2,Math.floor(w/45))},(_,i)=><path key={i} d={`M${x+15+i*42} ${y+8}v${h-16}`} stroke="#d6d0bc" strokeWidth="2" opacity=".34"/>)}</g>; }
function LoadingYard({x,y,w,h}:{x:number;y:number;w:number;h:number}) { return <g><rect x={x} y={y} width={w} height={h} fill="#464b48"/>{Array.from({length:7},(_,i)=><path key={i} d={`M${x+i*48} ${y+h}l70 -${h}`} stroke="#bea668" strokeWidth="4" opacity=".18"/>)}</g>; }
function SideStreet({x,direction,width}:{x:number;direction:'north'|'south';width:number}) { const y=direction==='north'?205:448; const h=direction==='north'?168:165; return <g><rect x={x} y={y} width={width} height={h} fill="#2d393d"/><path d={`M${x+width/2} ${y}v${h}`} stroke="#cfb666" strokeWidth="3" strokeDasharray="20 18"/></g>; }
function Crosswalk({x,y,h,muted=false}:{x:number;y:number;h:number;muted?:boolean}) { return <g opacity={muted?.45:.78}>{Array.from({length:8},(_,i)=><rect key={i} x={x} y={y+i*(h/8)} width="104" height={h/16} rx="2" fill="#e6e1d5"/>)}</g>; }
function MedianPalms(){return <g>{[120,300,760,1040].map(x=><g key={x}><circle cx={x} cy="379" r="12" fill="#455942"/><path d={`M${x} 379v-18`} stroke="#8c7051" strokeWidth="4"/><path d={`M${x} 361l-13 -7m13 7l13 -7m-13 7l-4 -13m4 13l5 -13`} stroke="#4f8156" strokeWidth="5"/></g>)}</g>;}
function Tree({x,y}:{x:number;y:number}){return <g><path d={`M${x} ${y+8}v23`} stroke="#765d45" strokeWidth="6"/><circle cx={x} cy={y} r="19" fill="#3f704b"/><circle cx={x-9} cy={y+3} r="11" fill="#558158"/></g>;}
function Lamp({x,y}:{x:number;y:number}){return <g><path d={`M${x} ${y}v34`} stroke="#263537" strokeWidth="5"/><circle cx={x} cy={y} r="6" fill="#f4d887"/></g>;}
function Bench({x,y}:{x:number;y:number}){return <g><rect x={x-24} y={y} width="48" height="8" rx="3" fill="#755f47"/><path d={`M${x-18} ${y+7}v13m36-13v13`} stroke="#373a36" strokeWidth="4"/></g>;}
function BusStop({x,y}:{x:number;y:number}){return <g><rect x={x-42} y={y-18} width="84" height="26" rx="5" fill="#314a50"/><circle cx={x+53} cy={y-8} r="10" fill="#466f93"/><text x={x+53} y={y-4} textAnchor="middle" fontSize="10" fill="#fff">B</text></g>;}
function Dumpster({x,y}:{x:number;y:number}){return <g><rect x={x-28} y={y-18} width="56" height="35" rx="5" fill="#344f49"/><path d={`M${x-31} ${y-18}h62`} stroke="#263b37" strokeWidth="7"/></g>;}
function Crates({x,y}:{x:number;y:number}){return <g><rect x={x-20} y={y-20} width="40" height="40" fill="#6d563e"/><path d={`M${x-16} ${y-16}l32 32m0-32l-32 32`} stroke="#a88a62" strokeWidth="2"/></g>;}
function UtilityBox({x,y}:{x:number;y:number}){return <rect x={x-17} y={y-24} width="34" height="48" rx="3" fill="#536264"/>;}
function StreetSign({x,y,a,b}:{x:number;y:number;a:string;b:string}){return <g><path d={`M${x} ${y}v45`} stroke="#273436" strokeWidth="6"/><rect x={x-55} y={y-14} width="110" height="22" rx="4" fill="#204f48"/><rect x={x-42} y={y+11} width="84" height="20" rx="4" fill="#334b66"/><text x={x} y={y+1} textAnchor="middle" fill="#edf2e9" fontSize="9">{a}</text><text x={x} y={y+25} textAnchor="middle" fill="#edf2e9" fontSize="8">{b}</text></g>;}
function Continuation({y,industrial=false}:{y:number;industrial?:boolean}){return <path d={`M20 ${y-24}L2 ${y}l18 24M58 ${y-24}L40 ${y}l18 24M1180 ${y-24}l18 24-18 24M1142 ${y-24}l18 24-18 24`} fill="none" stroke={industrial?'#c0a35e':'#e3c66f'} strokeWidth="7" opacity=".74"/>;}
