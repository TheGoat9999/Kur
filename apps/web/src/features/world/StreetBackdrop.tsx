import type { StreetSegmentId } from '@sol-dorado/contracts';
import streetGeometry from './street-geometry.json';

type Point = [number, number];
type MarkingKind = 'dash' | 'solid' | 'double';
type PropKind = 'lamp' | 'hydrant' | 'drain' | 'dumpster' | 'bollard';
type StreetTheme = 'market' | 'corner' | 'alley';

interface RoadDefinition {
  id: string;
  path: string;
  width: number;
  sidewalkWidth: number;
  curbWidth: number;
  markings: Array<{ path: string; kind: MarkingKind; color: string }>;
}
interface BuildingDefinition {
  id: string;
  points: Point[];
  height: number;
  roof: string;
  facade: string;
  trim: string;
  seed: number;
  roofUnits: number;
}
interface StreetGeometryScene {
  surfaceSeed: number;
  ground: string;
  ambient: string;
  roads: RoadDefinition[];
  crosswalks: Array<{ x: number; y: number; length: number; width: number; angle: number; stripes: number }>;
  lots: Array<{ points: Point[]; fill: string }>;
  buildings: BuildingDefinition[];
  parking: Array<{ x: number; y: number; width: number; height: number; angle: number; spaces: number }>;
  props: Array<{ kind: PropKind; x: number; y: number }>;
  trees: Array<{ x: number; y: number; r: number }>;
  foreground: Array<{ kind: 'tree'; x: number; y: number; r: number }>;
}

const geometry = streetGeometry as unknown as {
  version: number;
  canvas: { width: number; height: number };
  scenes: Record<StreetSegmentId, StreetGeometryScene>;
};

const SEGMENT_BY_THEME: Record<StreetTheme, StreetSegmentId> = {
  market: 'market_block_3',
  corner: 'cypress_corner',
  alley: 'mira_alley'
};

export function StreetBackdrop({ theme, alerted }: { theme: StreetTheme; alerted: boolean }) {
  const segmentId = SEGMENT_BY_THEME[theme];
  const scene = geometry.scenes[segmentId];
  const { width, height } = geometry.canvas;
  const roadMaskId = `sd-road-mask-${segmentId}`;
  const surfaceNoiseId = `sd-surface-noise-${segmentId}`;
  const concreteNoiseId = `sd-concrete-noise-${segmentId}`;
  const shadowId = `sd-building-shadow-${segmentId}`;
  const foliageId = `sd-foliage-${segmentId}`;
  const ambientId = `sd-ambient-${segmentId}`;

  return (
    <svg
      className="street-backdrop street-backdrop-json"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={ambientId} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={scene.ambient} stopOpacity=".17" />
          <stop offset=".52" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#172124" stopOpacity=".19" />
        </linearGradient>
        <radialGradient id={foliageId} cx="38%" cy="30%" r="70%">
          <stop stopColor="#769269" />
          <stop offset=".48" stopColor="#476846" />
          <stop offset="1" stopColor="#263e31" />
        </radialGradient>
        <filter id={surfaceNoiseId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency=".018 .085" numOctaves="3" seed={scene.surfaceSeed} result="noise" />
          <feColorMatrix in="noise" type="matrix" values=".36 0 0 0 .08  0 .36 0 0 .08  0 0 .36 0 .08  0 0 0 .42 0" />
        </filter>
        <filter id={concreteNoiseId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency=".055" numOctaves="2" seed={scene.surfaceSeed + 17} result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" />
        </filter>
        <filter id={shadowId} x="-35%" y="-35%" width="180%" height="190%">
          <feDropShadow dx="7" dy="11" stdDeviation="7" floodColor="#071012" floodOpacity=".48" />
        </filter>
        <mask id={roadMaskId}>
          <rect width={width} height={height} fill="black" />
          {scene.roads.map(road => (
            <path key={road.id} d={road.path} fill="none" stroke="white" strokeWidth={road.width} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </mask>
      </defs>

      <rect width={width} height={height} fill={scene.ground} />
      <rect width={width} height={height} filter={`url(#${concreteNoiseId})`} opacity=".11" />

      <g className="street-vector-lots">
        {scene.lots.map((lot, index) => (
          <polygon key={index} points={points(lot.points)} fill={lot.fill} stroke="#b6b1a3" strokeOpacity=".28" strokeWidth="2" />
        ))}
      </g>

      <g className="street-vector-road-bed">
        {scene.roads.map(road => (
          <path key={`walk-${road.id}`} d={road.path} fill="none" stroke="#a9a69d" strokeWidth={road.sidewalkWidth} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {scene.roads.map(road => (
          <path key={`curb-${road.id}`} d={road.path} fill="none" stroke="#d1ccc0" strokeWidth={road.curbWidth} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {scene.roads.map(road => (
          <path key={`road-${road.id}`} d={road.path} fill="none" stroke="#30383a" strokeWidth={road.width} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <rect width={width} height={height} filter={`url(#${surfaceNoiseId})`} mask={`url(#${roadMaskId})`} opacity=".56" />
        {roadWear(scene.surfaceSeed, width, height, roadMaskId)}
      </g>

      <g className="street-vector-markings">
        {scene.roads.flatMap(road => road.markings.map((marking, index) => (
          <RoadMarking key={`${road.id}:${index}`} definition={marking} />
        )))}
        {scene.crosswalks.map((crosswalk, index) => <Crosswalk key={index} {...crosswalk} />)}
      </g>

      <g className="street-vector-parking">
        {scene.parking.map((parking, index) => <ParkingLot key={index} {...parking} />)}
      </g>

      <g className="street-vector-buildings">
        {scene.buildings.map(building => (
          <Building key={building.id} definition={building} alerted={alerted && building.id === 'corner_store'} shadowId={shadowId} />
        ))}
      </g>

      <g className="street-vector-props">
        {scene.trees.map((tree, index) => <Tree key={`tree:${index}`} {...tree} foliageId={foliageId} />)}
        {scene.props.map((prop, index) => <StreetProp key={`${prop.kind}:${index}`} {...prop} />)}
      </g>

      <rect width={width} height={height} fill={`url(#${ambientId})`} pointerEvents="none" />
      <path d={`M0 ${height - 3}H${width}`} stroke="#071012" strokeOpacity=".22" strokeWidth="6" />

      <g className="street-vector-foreground">
        {scene.foreground.map((item, index) => <Tree key={`foreground:${index}`} {...item} foliageId={foliageId} foreground />)}
      </g>
    </svg>
  );
}

function RoadMarking({ definition }: { definition: RoadDefinition['markings'][number] }) {
  const common = { d: definition.path, fill: 'none', stroke: definition.color, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (definition.kind === 'double') {
    return <g opacity=".72"><path {...common} strokeWidth="7" /><path {...common} stroke="#30383a" strokeWidth="2.5" /></g>;
  }
  if (definition.kind === 'dash') return <path {...common} strokeWidth="2.7" strokeDasharray="19 18" opacity=".55" />;
  return <path {...common} strokeWidth="3" opacity=".62" />;
}

function Crosswalk({ x, y, length, width, angle, stripes }: StreetGeometryScene['crosswalks'][number]) {
  const stripe = length / Math.max(1, stripes * 1.7);
  return (
    <g transform={`rotate(${angle} ${x} ${y})`} opacity=".74">
      {Array.from({ length: stripes }, (_, index) => {
        const start = x - length / 2 + index * (length / stripes);
        return <rect key={index} x={start} y={y - width / 2} width={stripe} height={width} rx="1.4" fill="#e3dfd3" />;
      })}
    </g>
  );
}

function ParkingLot({ x, y, width, height, angle, spaces }: StreetGeometryScene['parking'][number]) {
  const gap = width / Math.max(1, spaces);
  return (
    <g transform={`rotate(${angle} ${x + width / 2} ${y + height / 2})`}>
      <rect x={x} y={y} width={width} height={height} rx="3" fill="#444c4d" stroke="#c8c2b4" strokeOpacity=".32" />
      {Array.from({ length: spaces + 1 }, (_, index) => (
        <path key={index} d={`M ${x + index * gap} ${y + 8} V ${y + height - 8}`} stroke="#d7d2c5" strokeWidth="2" opacity=".34" />
      ))}
      <path d={`M ${x + 8} ${y + height * .52} H ${x + width - 8}`} stroke="#0f191b" strokeWidth="2" opacity=".35" />
    </g>
  );
}

function Building({ definition, alerted, shadowId }: { definition: BuildingDefinition; alerted: boolean; shadowId: string }) {
  const shiftX = Math.max(7, Math.round(definition.height * .34));
  const shiftY = Math.max(10, Math.round(definition.height * .66));
  const shifted = definition.points.map(([x, y]) => [x + shiftX, y + shiftY] as Point);
  const bounds = polygonBounds(definition.points);
  const units = deterministicUnits(definition, bounds);
  const roof = alerted ? '#76504b' : definition.roof;

  return (
    <g filter={`url(#${shadowId})`}>
      {definition.points.map((point, index) => {
        const next = definition.points[(index + 1) % definition.points.length]!;
        const shiftedPoint = shifted[index]!;
        const shiftedNext = shifted[(index + 1) % shifted.length]!;
        return (
          <polygon
            key={index}
            points={points([point, next, shiftedNext, shiftedPoint])}
            fill={definition.facade}
            stroke={definition.trim}
            strokeOpacity={index % 2 ? '.16' : '.1'}
            strokeWidth="1"
          />
        );
      })}
      <polygon points={points(definition.points)} fill={roof} stroke={definition.trim} strokeOpacity=".54" strokeWidth="3" />
      <polygon points={points(insetPolygon(definition.points, 7))} fill="#182326" fillOpacity=".16" stroke="#fff" strokeOpacity=".08" strokeWidth="1" />
      {units.map((unit, index) => (
        <g key={index} transform={`translate(${unit.x} ${unit.y})`}>
          <rect width={unit.w} height={unit.h} rx="2" fill="#3d4848" stroke="#9ca29a" strokeOpacity=".42" />
          <path d={`M3 ${unit.h / 2}H${unit.w - 3}M${unit.w / 2} 3V${unit.h - 3}`} stroke="#202a2b" strokeWidth="1.2" opacity=".8" />
        </g>
      ))}
      {roofWeather(definition.seed, bounds)}
      <path d={`M ${bounds.minX + 10} ${bounds.maxY - 7} H ${bounds.maxX - 12}`} stroke={definition.trim} strokeWidth="3" opacity=".28" />
    </g>
  );
}

function Tree({ x, y, r, foliageId, foreground = false }: { x: number; y: number; r: number; foliageId: string; foreground?: boolean }) {
  const opacity = foreground ? .96 : 1;
  return (
    <g opacity={opacity}>
      <ellipse cx={x + r * .35} cy={y + r * .62} rx={r * .9} ry={r * .46} fill="#081416" opacity={foreground ? '.42' : '.3'} />
      <rect x={x - 2} y={y} width="5" height={r * .82} rx="2" fill="#574b38" />
      <circle cx={x} cy={y} r={r} fill={`url(#${foliageId})`} stroke="#233a2c" strokeWidth="2" />
      <circle cx={x - r * .38} cy={y - r * .08} r={r * .56} fill="#5b7b50" opacity=".72" />
      <circle cx={x + r * .34} cy={y - r * .18} r={r * .5} fill="#34563b" opacity=".86" />
      <circle cx={x - r * .1} cy={y - r * .46} r={r * .42} fill="#789067" opacity=".48" />
    </g>
  );
}

function StreetProp({ kind, x, y }: StreetGeometryScene['props'][number]) {
  if (kind === 'lamp') return <g><ellipse cx={x + 4} cy={y + 10} rx="7" ry="3" fill="#071012" opacity=".28"/><path d={`M${x} ${y + 8}V${y - 18}`} stroke="#293638" strokeWidth="4"/><circle cx={x} cy={y - 20} r="5" fill="#4b5657" stroke="#a4aaa5" strokeWidth="1"/><circle cx={x - 1} cy={y - 21} r="2" fill="#e3d6ac" opacity=".72"/></g>;
  if (kind === 'hydrant') return <g><ellipse cx={x + 2} cy={y + 5} rx="6" ry="2.5" fill="#071012" opacity=".28"/><rect x={x - 4} y={y - 8} width="8" height="13" rx="3" fill="#9a4a3c"/><rect x={x - 6} y={y - 5} width="12" height="4" rx="2" fill="#b55b49"/><circle cx={x} cy={y - 9} r="4" fill="#a84f3f"/></g>;
  if (kind === 'drain') return <g transform={`translate(${x} ${y})`}><rect x="-8" y="-3" width="16" height="7" rx="1" fill="#283031" stroke="#151b1c"/><path d="M-5-2V3M0-2V3M5-2V3" stroke="#687071" strokeWidth="1"/></g>;
  if (kind === 'dumpster') return <g transform={`translate(${x} ${y})`}><ellipse cx="7" cy="8" rx="14" ry="5" fill="#071012" opacity=".28"/><rect x="-10" y="-8" width="23" height="16" rx="2" fill="#3e5c4c" stroke="#22352b" strokeWidth="2"/><path d="M-9-5H12M-6-11H9" stroke="#718474" strokeWidth="2"/></g>;
  return <g transform={`translate(${x} ${y})`}><ellipse cx="2" cy="4" rx="4" ry="2" fill="#071012" opacity=".3"/><rect x="-2" y="-7" width="4" height="11" rx="1" fill="#3a4547"/><circle cy="-8" r="3" fill="#586466"/></g>;
}

function roadWear(seed: number, width: number, height: number, maskId: string) {
  const random = mulberry32(seed);
  const marks = Array.from({ length: 92 }, (_, index) => {
    const x = random() * width;
    const y = random() * height;
    const length = 4 + random() * 28;
    const angle = random() * 180;
    const opacity = .035 + random() * .09;
    return <path key={index} d={`M${x - length / 2} ${y}h${length}`} transform={`rotate(${angle} ${x} ${y})`} stroke={index % 4 === 0 ? '#c4bca8' : '#071012'} strokeWidth={index % 5 === 0 ? 2 : 1} opacity={opacity} />;
  });
  return <g mask={`url(#${maskId})`}>{marks}</g>;
}

function roofWeather(seed: number, bounds: ReturnType<typeof polygonBounds>) {
  const random = mulberry32(seed * 31 + 7);
  return Array.from({ length: 9 }, (_, index) => {
    const x = bounds.minX + 14 + random() * Math.max(1, bounds.width - 28);
    const y = bounds.minY + 14 + random() * Math.max(1, bounds.height - 28);
    const r = 4 + random() * 12;
    return <circle key={index} cx={x} cy={y} r={r} fill={index % 3 ? '#10191a' : '#c4b69a'} opacity={.025 + random() * .045} />;
  });
}

function deterministicUnits(definition: BuildingDefinition, bounds: ReturnType<typeof polygonBounds>) {
  const random = mulberry32(definition.seed);
  const units: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (let index = 0; index < definition.roofUnits; index += 1) {
    const w = 13 + random() * 18;
    const h = 9 + random() * 12;
    units.push({
      x: bounds.minX + 16 + random() * Math.max(1, bounds.width - w - 32),
      y: bounds.minY + 16 + random() * Math.max(1, bounds.height - h - 32),
      w,
      h
    });
  }
  return units;
}

function insetPolygon(input: Point[], amount: number): Point[] {
  const center = input.reduce((sum, [x, y]) => ({ x: sum.x + x, y: sum.y + y }), { x: 0, y: 0 });
  center.x /= input.length;
  center.y /= input.length;
  return input.map(([x, y]) => {
    const distance = Math.max(1, Math.hypot(x - center.x, y - center.y));
    const ratio = Math.max(0, (distance - amount) / distance);
    return [center.x + (x - center.x) * ratio, center.y + (y - center.y) * ratio];
  });
}

function polygonBounds(input: Point[]) {
  const xs = input.map(([x]) => x);
  const ys = input.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

function points(input: Point[]) { return input.map(([x, y]) => `${x},${y}`).join(' '); }

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}
