import type { VehicleModel } from '@sol-dorado/contracts/vehicles';

const modelPalette: Record<string, { body: string; accent: string; glass: string }> = {
  bravura_compact_s: { body: '#3f8f98', accent: '#86d0d4', glass: '#a8dfe2' },
  aurelia_r7: { body: '#7a6cc0', accent: '#b9adf0', glass: '#b9d7e1' },
  mesa_trail_150: { body: '#b07b3f', accent: '#e2b36f', glass: '#b9d7d9' },
  veloce_sprint: { body: '#a84f5d', accent: '#ed8b96', glass: '#c6dce0' }
};

export function VehicleArtwork({ model, className = '', compact = false }: { model: VehicleModel; className?: string; compact?: boolean }) {
  const palette = modelPalette[model.id] ?? { body: '#477b85', accent: '#8bc5ca', glass: '#b9d7dc' };
  const pickup = model.vehicleClass === 'pickup' || model.vehicleClass === 'utility';
  const sports = model.vehicleClass === 'sports';
  const suv = model.vehicleClass === 'suv';
  const roofStart = sports ? 78 : pickup ? 64 : suv ? 64 : 70;
  const roofTop = sports ? 46 : suv ? 30 : 36;
  const roofEnd = pickup ? 126 : sports ? 156 : 150;

  return <svg className={`vehicle-artwork ${compact ? 'vehicle-artwork-compact' : ''} ${className}`} viewBox="0 0 240 120" role="img" aria-label={model.displayName}>
    <defs>
      <linearGradient id={`body-${model.id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={palette.accent} />
        <stop offset=".42" stopColor={palette.body} />
        <stop offset="1" stopColor="#17272d" />
      </linearGradient>
      <linearGradient id={`glass-${model.id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={palette.glass} stopOpacity=".9" />
        <stop offset="1" stopColor="#17323a" stopOpacity=".95" />
      </linearGradient>
      <filter id={`shadow-${model.id}`}><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000" floodOpacity=".45" /></filter>
    </defs>
    <ellipse cx="120" cy="96" rx="94" ry="10" fill="#02090c" opacity=".55" />
    <g filter={`url(#shadow-${model.id})`}>
      {pickup && <path d="M139 54h56c12 0 21 9 21 21v12h-79Z" fill={`url(#body-${model.id})`} />}
      <path d={`M26 77c3-12 11-20 25-24l17-4 18-${Math.max(8, 52 - roofTop)}h62c14 0 24 3 34 10l20 15c10 2 17 8 20 18l2 9H20l2-13c1-5 2-8 4-11Z`} fill={`url(#body-${model.id})`} stroke={palette.accent} strokeOpacity=".62" strokeWidth="1.4" />
      {!pickup && <path d={`M${roofStart} 49 90 ${roofTop} ${roofEnd} ${roofTop + (sports ? 8 : 4)} 171 53Z`} fill={`url(#glass-${model.id})`} stroke="#c9e4e7" strokeOpacity=".28" />}
      {pickup && <><path d="M78 49 94 32h44l10 22Z" fill={`url(#glass-${model.id})`} stroke="#c9e4e7" strokeOpacity=".28" /><path d="M151 54h45v5h-45Z" fill="#21363b" /></>}
      <path d="M29 75h184" stroke="#d9eff1" strokeOpacity=".14" />
      <path d="M42 67h19M184 67h19" stroke={palette.accent} strokeWidth="4" strokeLinecap="round" opacity=".9" />
      <rect x="25" y="82" width="13" height="6" rx="2" fill="#e7cf88" opacity=".9" />
      <rect x="204" y="82" width="13" height="6" rx="2" fill="#d46463" opacity=".9" />
      <circle cx="67" cy="89" r="17" fill="#071014" stroke="#263b40" strokeWidth="4" />
      <circle cx="67" cy="89" r="7" fill="#51666c" stroke="#9bb0b4" strokeWidth="2" />
      <circle cx="180" cy="89" r="17" fill="#071014" stroke="#263b40" strokeWidth="4" />
      <circle cx="180" cy="89" r="7" fill="#51666c" stroke="#9bb0b4" strokeWidth="2" />
      <path d="M104 42v42M145 43v41" stroke="#071317" strokeOpacity=".48" />
      <path d="M91 76h16M150 76h16" stroke="#d8eef0" strokeOpacity=".32" strokeWidth="2" strokeLinecap="round" />
      {sports && <path d="M29 77 18 72h31" fill="none" stroke={palette.accent} strokeWidth="3" strokeLinecap="round" />}
      {suv && <path d="M54 35h116" stroke={palette.accent} strokeWidth="3" strokeLinecap="round" opacity=".65" />}
    </g>
  </svg>;
}
