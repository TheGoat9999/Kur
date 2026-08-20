import type { StreetSceneDefinition } from './street-config';

export function StreetBackdrop({ theme, alerted }: { theme: StreetSceneDefinition['theme']; alerted: boolean }) {
  return (
    <svg className={`street-backdrop street-backdrop-${theme}`} viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sd-sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#1d3f4b" /><stop offset=".62" stopColor="#d18862" /><stop offset="1" stopColor="#e8ae79" /></linearGradient>
        <linearGradient id="sd-road" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#27343a" /><stop offset="1" stopColor="#111b20" /></linearGradient>
        <linearGradient id="sd-left" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#34515a" /><stop offset="1" stopColor="#172a31" /></linearGradient>
        <linearGradient id="sd-right" x1="1" y1="0" x2="0" y2="1"><stop stopColor="#60493f" /><stop offset="1" stopColor="#1f2f33" /></linearGradient>
        <linearGradient id="sd-glass" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#84c3cf" stopOpacity=".6" /><stop offset="1" stopColor="#1c3a43" stopOpacity=".9" /></linearGradient>
        <radialGradient id="sd-lamp"><stop stopColor="#ffe8a6" stopOpacity=".72" /><stop offset="1" stopColor="#eebd68" stopOpacity="0" /></radialGradient>
        <filter id="sd-shadow" x="-30%" y="-30%" width="160%" height="190%"><feDropShadow dx="0" dy="18" stdDeviation="14" floodColor="#020709" floodOpacity=".5" /></filter>
        <filter id="sd-soft"><feGaussianBlur stdDeviation="12" /></filter>
        <pattern id="sd-windows" width="54" height="55" patternUnits="userSpaceOnUse"><rect x="13" y="14" width="24" height="19" rx="2" fill="#8dc5cd" opacity=".18" /><path d="M25 14v19" stroke="#d1e4e5" opacity=".12" /></pattern>
      </defs>
      <rect width="1200" height="700" fill="url(#sd-sky)" />
      <circle cx="930" cy="112" r="86" fill="#f3c68a" opacity=".2" filter="url(#sd-soft)" />
      <path d="M0 286 95 250l80 23 79-63 95 47 86-103 73 96 77-47 82 55 105-92 69 91 113-42 126 72v96H0Z" fill="#183039" opacity=".72" />
      <rect y="315" width="1200" height="385" fill="#0d171b" />
      {theme === 'market' && <MarketScene alerted={alerted} />}
      {theme === 'corner' && <CornerScene />}
      {theme === 'alley' && <AlleyScene />}
      <rect width="1200" height="700" fill="url(#sd-vignette)" opacity=".25" />
      <defs><radialGradient id="sd-vignette"><stop offset=".48" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".82" /></radialGradient></defs>
    </svg>
  );
}

function MarketScene({ alerted }: { alerted: boolean }) {
  return <>
    <path d="M430 340 770 340 1110 700H90Z" fill="url(#sd-road)" />
    <path d="M0 433 430 340 90 700H0Z" fill="#a4a099" /><path d="M770 340 1200 430v270h-90Z" fill="#95938d" />
    <path d="M430 340 90 700" stroke="#d5c9b0" strokeWidth="11" opacity=".55" /><path d="M770 340 1110 700" stroke="#d5c9b0" strokeWidth="11" opacity=".55" />
    <path d="M600 370v48M600 454v68M600 566v88" stroke="#e4cf88" strokeWidth="6" strokeDasharray="28 30" opacity=".72" />
    <g opacity=".82"><path d="m410 436 53-10 23 17-58 13Zm-45 51 69-15 28 20-76 18Zm-52 64 91-23 36 25-101 29" fill="#ded5c2" /><path d="m790 435-53-10-23 17 58 13Zm45 51-69-15-28 20 76 18Zm52 64-91-23-36 25 101 29" fill="#ded5c2" /></g>
    <g filter="url(#sd-shadow)">
      <path d="M0 120 358 172v300L0 551Z" fill="url(#sd-left)" /><path d="M0 120 358 172l-38 28L0 164Z" fill="#48636a" />
      <path d="M0 162 335 206v222L0 492Z" fill="url(#sd-windows)" opacity=".7" />
      <path d="M0 363 350 333v148L0 551Z" fill="#193139" /><path d="M26 375 292 353v100L26 493Z" fill="#112329" stroke="#67929b" strokeOpacity=".25" />
      <path d="M20 354 328 326v36L20 394Z" fill="#a84f3e" /><text x="77" y="367" fill="#ffe0b0" fontSize="26" fontWeight="800" letterSpacing="7">EL CAMINO</text>
      <path d="M117 370v111M227 360v104" stroke="#bcd6d8" strokeOpacity=".28" /><path d="M129 432h83v42h-83Z" fill="#0b181d" />
    </g>
    <g filter="url(#sd-shadow)">
      <path d="M836 155 1200 92v453l-356-72Z" fill="url(#sd-right)" /><path d="m836 155 364-63v55l-344 55Z" fill="#72564a" />
      <path d="M866 195 1200 151v240l-334 8Z" fill="url(#sd-windows)" opacity=".58" />
      <path d="M845 333 1200 326v219l-356-72Z" fill="#24383c" />
      <path d="M841 325 1200 316v50l-357 9Z" fill="#d4a84f" /><path d="M878 349h247v37H878Z" fill="#1d2c30" /><text x="911" y="376" fill="#ffe3a3" fontSize="23" fontWeight="900" letterSpacing="4">MERCADO 24</text>
      <path d="M884 399h145v105H884Z" fill="url(#sd-glass)" stroke="#a8d1d5" strokeOpacity=".22" /><path d="M1045 394h85v135h-85Z" fill="#12252a" stroke="#d6bd78" strokeOpacity=".45" />
      {alerted && <><rect x="1049" y="425" width="76" height="25" rx="4" fill="#d75f56" /><text x="1060" y="443" fill="#fff5ec" fontSize="12" fontWeight="800">ALERT</text></>}
    </g>
    <g filter="url(#sd-shadow)"><path d="M385 165h376v194H385Z" fill="#263e45" /><path d="M405 184h336v160H405Z" fill="url(#sd-windows)" /><path d="M515 270h78v91h-78Z" fill="#13262c" /><path d="M616 270h76v91h-76Z" fill="#14272d" /></g>
    <StreetFurniture />
    <StreetSign x={685} y={318} lines={['MARKET ST', 'BLOCK 3']} />
    <path d="M1156 354h44v226l-79-16V412Z" fill="#071014" opacity=".78" />
  </>;
}

function CornerScene() {
  return <>
    <path d="M0 475 1200 350v350H0Z" fill="url(#sd-road)" />
    <path d="M0 402 1200 315v54L0 512Z" fill="#a19d94" />
    <path d="M0 511 1200 369" stroke="#d9d0bc" strokeWidth="12" opacity=".5" />
    <path d="m55 522 121-18 22 35-129 22Zm176-27 124-17 25 36-133 20Zm735-89 121-15 36 32-133 19" fill="#ddd4c2" opacity=".72" />
    <g filter="url(#sd-shadow)"><path d="M0 115 392 144v329L0 516Z" fill="url(#sd-left)" /><path d="M30 154h330v256H30Z" fill="url(#sd-windows)" /><path d="M112 351h111v112H112Z" fill="#14272c" /><path d="M92 333h154v26H92Z" fill="#bb9653" /></g>
    <g filter="url(#sd-shadow)"><path d="M800 170 1200 128v277l-400 50Z" fill="url(#sd-right)" /><path d="M835 196h365v174H835Z" fill="url(#sd-windows)" opacity=".68" /><path d="M868 347h215v81H868Z" fill="#183037" /></g>
    <g><path d="M503 387h128l29 21H479Z" fill="#35515a" /><path d="M495 407h145v83H495Z" fill="url(#sd-glass)" opacity=".72" /><path d="M535 407v83M600 407v83" stroke="#b9d1d2" strokeOpacity=".25" /></g>
    <StreetFurniture />
    <StreetSign x={706} y={318} lines={['CYPRESS AVE', 'MARKET']} />
    <g transform="translate(684 431)"><circle r="24" fill="url(#sd-lamp)" /><path d="M0 0v159" stroke="#17272d" strokeWidth="7" /><path d="M-19 0h38" stroke="#17272d" strokeWidth="7" /></g>
    <path d="M0 620c260-55 510-76 1200-53v133H0Z" fill="#0b1418" opacity=".35" />
  </>;
}

function AlleyScene() {
  return <>
    <path d="M364 322 836 322 1038 700H144Z" fill="url(#sd-road)" />
    <path d="M0 110 385 168v532H0Z" fill="#20353c" /><path d="M815 144 1200 90v610H815Z" fill="#392f2d" />
    <path d="M29 155h326v545H29Z" fill="url(#sd-windows)" opacity=".42" /><path d="M846 138h328v562H846Z" fill="url(#sd-windows)" opacity=".35" />
    <path d="M385 168 815 144v178H385Z" fill="#1a3037" /><path d="M469 194h258v128H469Z" fill="url(#sd-windows)" opacity=".55" />
    <g stroke="#101b1f" strokeWidth="8" fill="none"><path d="M91 239h196v92H91v92h196v97H91" /><path d="M899 211h192v104H899v98h192v103H899" /><path d="M111 239 82 208M267 331l35-30M111 423l-32-34M919 315l-35-33M1071 413l35-35" /></g>
    <path d="M145 700 364 322" stroke="#8f8b84" strokeWidth="13" /><path d="M1038 700 836 322" stroke="#88847e" strokeWidth="13" />
    <path d="m494 617 168-11 63 42-233 14Z" fill="#5a7b82" opacity=".27" /><path d="m520 626 116-7 42 18-151 10Z" fill="#91b5bb" opacity=".15" />
    <g transform="translate(220 392)" filter="url(#sd-shadow)"><rect width="148" height="114" rx="7" fill="#31535a" /><path d="M-7 9h162M21 0l8-29h91l8 29" stroke="#15262b" strokeWidth="12" /><path d="M28 36h92M36 61h76" stroke="#172a2f" strokeWidth="8" /></g>
    <g transform="translate(866 284)"><path d="M0 0h231v132H0Z" fill="#182a2f" /><path d="M19 20h193v77H19Z" fill="#102127" /><path d="M80 97h74v35H80Z" fill="#0c181c" /><text x="45" y="69" fill="#d3a95f" fontSize="18" fontWeight="800" letterSpacing="3">EL CAMINO</text></g>
    <StreetSign x={704} y={318} lines={['MIRA', 'SERVICE']} />
    <g opacity=".7"><path d="M421 330v278M779 330v278" stroke="#17262b" strokeWidth="6" /><circle cx="421" cy="351" r="56" fill="url(#sd-lamp)" /><circle cx="779" cy="351" r="56" fill="url(#sd-lamp)" /></g>
  </>;
}

function StreetFurniture() {
  return <g>
    <g transform="translate(384 350)"><circle r="55" fill="url(#sd-lamp)" /><path d="M0 0v245" stroke="#1b2c31" strokeWidth="7" /><path d="M-18 0h36" stroke="#1b2c31" strokeWidth="7" /></g>
    <g transform="translate(817 352)"><circle r="55" fill="url(#sd-lamp)" /><path d="M0 0v244" stroke="#1b2c31" strokeWidth="7" /><path d="M-18 0h36" stroke="#1b2c31" strokeWidth="7" /></g>
    <g transform="translate(1035 530)"><rect width="94" height="16" rx="4" fill="#293c41" /><path d="M10 16v31M84 16v31M20 0v16M43 0v16M66 0v16" stroke="#17272b" strokeWidth="6" /></g>
    <g transform="translate(85 438)"><rect x="-8" y="42" width="16" height="70" fill="#563c2d" /><circle cy="24" r="46" fill="#295347" /><circle cx="-25" cy="15" r="30" fill="#326454" /><circle cx="25" cy="6" r="31" fill="#366759" /></g>
    <g transform="translate(1125 410)"><rect x="-7" y="38" width="14" height="62" fill="#563c2d" /><circle cy="20" r="41" fill="#2d574b" /><circle cx="-23" cy="9" r="27" fill="#37685a" /></g>
  </g>;
}

function StreetSign({ x, y, lines }: { x: number; y: number; lines: [string, string] }) {
  return <g transform={`translate(${x} ${y})`}><path d="M0 0v185" stroke="#203239" strokeWidth="7" /><rect x="-79" y="-17" width="158" height="30" rx="4" fill="#214c4a" stroke="#8ec1ad" strokeOpacity=".38" /><text y="4" textAnchor="middle" fill="#d4eee1" fontSize="13" fontWeight="800" letterSpacing="2">{lines[0]}</text><rect x="-66" y="18" width="132" height="25" rx="4" fill="#2b5a59" /><text y="36" textAnchor="middle" fill="#cbe6dc" fontSize="11" fontWeight="750" letterSpacing="2">{lines[1]}</text></g>;
}
