import { catalogItem } from './characterCatalog';
import type { CharacterVisualRecipeV2 } from './characterVisualRecipe';

const SKIN: Record<string, string> = {
  porcelain: '#f2c8b6',
  'light-warm': '#d9a186',
  'warm-medium': '#b9785f',
  olive: '#9e7356',
  'deep-warm': '#734a37',
  'deep-neutral': '#4d3028'
};
const EYE: Record<string, string> = {
  brown: '#4c3528', hazel: '#79633e', green: '#4b6f55', blue: '#4d7591', gray: '#78858d', amber: '#9a6a2e'
};
const HAIR: Record<string, string> = {
  black: '#171515', 'dark-brown': '#30221e', brown: '#604438', auburn: '#7a4638', blonde: '#c6a877', platinum: '#ded8c8', gray: '#777b80'
};

export function StylizedCharacterPreview({ recipe, name }: { recipe: CharacterVisualRecipeV2; name: string }) {
  const a = recipe.appearance;
  const g = recipe.grooming;
  const top = catalogItem('top', g.top);
  const outer = catalogItem('outerwear', g.outerwear);
  const bottoms = catalogItem('bottoms', g.bottoms);
  const shoes = catalogItem('shoes', g.shoes);
  const hair = catalogItem('hair', g.hairStyle);
  const glasses = catalogItem('eyewear', g.eyewear);
  const hat = catalogItem('headwear', g.headwear);
  const jewelry = catalogItem('jewelry', g.jewelry);
  const accessory = catalogItem('accessory', g.accessory);
  const skin = SKIN[a.skinTone] ?? SKIN['warm-medium'];
  const hairColor = HAIR[g.hairColor] ?? HAIR['dark-brown'];
  const eyeColor = EYE[a.eyeColor] ?? EYE.brown;
  const bodyScale = a.bodyBuild === 'slim' ? .90 : a.bodyBuild === 'athletic' ? 1.08 : a.bodyBuild === 'heavy' ? 1.18 : 1;
  const heightScale = 1 + a.height / 700;
  const shoulder = recipe.body === 'male' ? 116 * bodyScale : 102 * bodyScale;
  const hip = recipe.body === 'male' ? 82 * bodyScale : 96 * bodyScale;
  const headRx = a.faceShape === 'round' ? 44 : a.faceShape === 'heart' ? 41 : a.faceShape === 'angular' ? 40 : 42;
  const headRy = a.faceShape === 'round' ? 52 : a.faceShape === 'angular' ? 59 : 57;

  return (
    <div className="relative isolate h-full min-h-[560px] overflow-hidden rounded-[28px] border border-white/10 bg-[#11171e]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(255,190,76,.25),transparent_28%),radial-gradient(circle_at_82%_30%,rgba(255,72,126,.22),transparent_30%),linear-gradient(145deg,#182833_0%,#0d141b_50%,#17121b_100%)]" />
      <div className="absolute -left-16 top-[28%] h-52 w-72 -rotate-12 rounded-[48px] bg-cyan-400/10 blur-[2px]" />
      <div className="absolute -right-20 top-24 h-72 w-72 rotate-12 rounded-full border-[42px] border-fuchsia-400/10" />
      <div className="absolute bottom-0 left-0 right-0 h-[34%] bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.58))]" />
      <svg viewBox="0 0 520 760" className="absolute inset-0 h-full w-full" role="img" aria-label={`Стилизиран преглед на ${name}`}>
        <defs>
          <linearGradient id="sd-top" x1="0" x2="1" y1="0" y2="1"><stop stopColor={outer && outer.id !== 'none' ? outer.primary : top?.primary ?? '#1a1d20'} /><stop offset="1" stopColor={outer && outer.id !== 'none' ? outer.secondary : top?.secondary ?? '#363a40'} /></linearGradient>
          <linearGradient id="sd-bottom" x1="0" x2="1"><stop stopColor={bottoms?.primary ?? '#30353b'} /><stop offset="1" stopColor={bottoms?.secondary ?? '#171b1f'} /></linearGradient>
          <linearGradient id="sd-accent" x1="0" x2="1"><stop stopColor={g.accentColor} /><stop offset="1" stopColor="#ff5c8a" /></linearGradient>
          <filter id="sd-shadow"><feDropShadow dx="0" dy="18" stdDeviation="16" floodOpacity=".34" /></filter>
        </defs>

        <g transform={`translate(260 690) scale(${heightScale}) translate(-260 -690)`} filter="url(#sd-shadow)">
          <ellipse cx="260" cy="694" rx="118" ry="22" fill="rgba(0,0,0,.42)" />

          <g id="legs">
            <path d={`M${260-hip/2} 470 C${250-hip/2} 535 ${250-hip/2} 620 ${232-hip/2} 680 L${264-hip/2} 680 C${276-hip/2} 610 ${282-hip/2} 535 260 470Z`} fill="url(#sd-bottom)" />
            <path d={`M${260+hip/2} 470 C${270+hip/2} 535 ${270+hip/2} 620 ${288+hip/2} 680 L${256+hip/2} 680 C${244+hip/2} 610 ${238+hip/2} 535 260 470Z`} fill="url(#sd-bottom)" />
            <path d="M176 676 Q211 662 236 678 L231 700 Q195 705 171 695Z" fill={shoes?.primary ?? '#e7e7e5'} />
            <path d="M344 676 Q309 662 284 678 L289 700 Q325 705 349 695Z" fill={shoes?.primary ?? '#e7e7e5'} />
          </g>

          <g id="arms">
            <path d={`M${260-shoulder/2+8} 292 Q170 330 145 440 Q142 456 156 462 Q171 464 178 448 Q200 365 ${260-shoulder/2+28} 340Z`} fill={skin} />
            <path d={`M${260+shoulder/2-8} 292 Q350 330 375 440 Q378 456 364 462 Q349 464 342 448 Q320 365 ${260+shoulder/2-28} 340Z`} fill={skin} />
          </g>

          <g id="torso">
            <path d={`M${260-shoulder/2} 285 Q260 250 ${260+shoulder/2} 285 L${260+hip/2+18} 486 Q260 506 ${260-hip/2-18} 486Z`} fill="url(#sd-top)" />
            {outer && outer.id !== 'none' && <path d={`M${260-shoulder/2+10} 294 Q260 268 ${260+shoulder/2-10} 294 L${260+hip/2+8} 472 Q260 488 ${260-hip/2-8} 472Z`} fill="none" stroke={outer.secondary} strokeWidth="7" opacity=".8" />}
            {top?.renderKind === 'hoodie' && <path d="M210 294 Q260 326 310 294 Q295 258 260 254 Q225 258 210 294Z" fill={top.secondary} opacity=".9" />}
            {outer?.renderKind === 'varsity' && <path d="M252 280 L252 482 M268 280 L268 482" stroke={g.accentColor} strokeWidth="5" opacity=".85" />}
            {outer?.renderKind === 'blazer' && <><path d="M215 294 L255 372 L242 456" fill="none" stroke={outer.secondary} strokeWidth="11" /><path d="M305 294 L265 372 L278 456" fill="none" stroke={outer.secondary} strokeWidth="11" /></>}
          </g>

          <g id="neck"><rect x="239" y="230" width="42" height="68" rx="20" fill={skin} /></g>

          <g id="head">
            <ellipse cx="260" cy="190" rx={headRx} ry={headRy} fill={skin} />
            <path d={`M${260-headRx+5} 190 Q260 ${190+headRy+13} ${260+headRx-5} 190`} fill="none" stroke="rgba(70,35,25,.18)" strokeWidth="3" />
            <g id="eyes">
              <ellipse cx="242" cy="188" rx="9" ry={a.eyeShape === 'round' ? 6 : 4.8} fill="#f5f1e9" /><ellipse cx="278" cy="188" rx="9" ry={a.eyeShape === 'round' ? 6 : 4.8} fill="#f5f1e9" />
              <circle cx="242" cy="188" r="3.6" fill={eyeColor} /><circle cx="278" cy="188" r="3.6" fill={eyeColor} />
              <circle cx="242" cy="188" r="1.5" fill="#101216" /><circle cx="278" cy="188" r="1.5" fill="#101216" />
            </g>
            <path d="M232 174 Q242 168 251 173" fill="none" stroke={hairColor} strokeWidth={a.eyebrows === 'bold' ? 5 : 3.4} strokeLinecap="round" /><path d="M269 173 Q278 168 288 174" fill="none" stroke={hairColor} strokeWidth={a.eyebrows === 'bold' ? 5 : 3.4} strokeLinecap="round" />
            <path d={a.nose === 'button' ? 'M260 191 Q254 211 260 213 Q266 211 260 209' : a.nose === 'wide' ? 'M260 190 L254 212 Q260 217 269 212' : 'M260 190 Q257 207 260 214 Q265 214 269 211'} fill="none" stroke="rgba(86,43,32,.46)" strokeWidth="2.5" strokeLinecap="round" />
            <path d={a.lips === 'full' ? 'M244 229 Q260 220 276 229 Q260 241 244 229Z' : a.lips === 'thin' ? 'M245 228 Q260 232 275 228' : 'M245 228 Q260 223 275 228 Q260 235 245 228Z'} fill={recipe.body === 'female' ? '#8f4c50' : '#70443e'} opacity=".9" />
            <HairShape kind={hair?.renderKind ?? 'fade'} color={hairColor} />
            {g.facialHair !== 'clean' && recipe.body === 'male' && <path d="M229 216 Q260 256 291 216 Q286 252 260 263 Q234 252 229 216Z" fill={hairColor} opacity={g.facialHair === 'stubble' ? .28 : .82} />}
            {glasses && glasses.id !== 'none' && <><rect x="225" y="177" width="29" height="20" rx="7" fill="none" stroke={glasses.primary} strokeWidth="4" /><rect x="266" y="177" width="29" height="20" rx="7" fill="none" stroke={glasses.primary} strokeWidth="4" /><path d="M254 185 L266 185" stroke={glasses.primary} strokeWidth="4" /></>}
            {hat && hat.id !== 'none' && <Hat kind={hat.renderKind} primary={hat.primary} secondary={hat.secondary} />}
          </g>

          {jewelry && jewelry.id !== 'none' && <path d="M226 286 Q260 323 294 286" fill="none" stroke={jewelry.primary} strokeWidth="5" />}
          {accessory?.renderKind === 'bag' && <path d="M188 302 Q260 390 326 455" fill="none" stroke={accessory.primary} strokeWidth="12" opacity=".9" />}
        </g>
      </svg>

      <div className="absolute left-5 top-5 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-white/80 backdrop-blur">SOL DORADO · ART V2</div>
      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
        <div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-200/80">КАНОНИЧЕН ОБЛИК</div><div className="mt-1 text-2xl font-black tracking-tight text-white">{name || 'Моят герой'}</div><div className="mt-1 text-xs text-white/50">{g.vibe.replaceAll('-', ' ')} · {a.bodyBuild} · {a.ageBand}</div></div>
        <div className="h-14 w-2 rounded-full" style={{ background: `linear-gradient(${g.accentColor},#ff5c8a)` }} />
      </div>
    </div>
  );
}

function HairShape({ kind, color }: { kind: string; color: string }) {
  if (kind === 'bald') return null;
  if (kind === 'afro') return <circle cx="260" cy="153" r="57" fill={color} />;
  if (kind === 'bob') return <path d="M215 151 Q260 111 307 151 L308 222 Q294 240 288 220 L286 151 Q260 126 232 151 L230 226 Q214 220 214 199Z" fill={color} />;
  if (kind === 'long' || kind === 'curls') return <path d="M215 151 Q260 108 307 151 L310 277 Q297 300 286 279 L286 152 Q260 126 232 152 L232 282 Q214 293 210 272Z" fill={color} />;
  if (kind === 'ponytail') return <><path d="M218 153 Q260 112 302 153 L292 190 Q260 128 228 190Z" fill={color} /><ellipse cx="306" cy="146" rx="21" ry="51" fill={color} transform="rotate(-20 306 146)" /></>;
  if (kind === 'braids' || kind === 'cornrows') return <><path d="M220 154 Q260 119 300 154 L294 177 Q260 135 226 177Z" fill={color} />{[-26,-13,0,13,26].map(x => <path key={x} d={`M${260+x} 146 Q${260+x+4} 205 ${260+x+1} 257`} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" />)}</>;
  if (kind === 'undercut') return <path d="M221 153 Q262 111 305 144 Q280 126 236 165 L225 192Z" fill={color} />;
  if (kind === 'waves') return <path d="M221 154 Q260 119 301 154 L294 176 Q260 138 227 176Z" fill={color} />;
  if (kind === 'buzz') return <path d="M224 155 Q260 123 297 155 L292 168 Q260 140 229 168Z" fill={color} />;
  return <path d="M221 155 Q260 116 302 151 L294 180 Q264 131 227 177Z" fill={color} />;
}

function Hat({ kind, primary, secondary }: { kind: string; primary: string; secondary: string }) {
  if (kind === 'cap') return <><path d="M218 151 Q260 115 302 151 L296 166 L224 166Z" fill={primary} /><path d="M267 159 Q306 159 321 171 Q286 172 263 168Z" fill={secondary} /></>;
  if (kind === 'bucket') return <><path d="M222 146 Q260 120 298 146 L291 170 L229 170Z" fill={primary} /><ellipse cx="260" cy="169" rx="51" ry="10" fill={secondary} /></>;
  return <path d="M224 147 Q260 116 296 147 L291 166 L229 166Z" fill={primary} />;
}
