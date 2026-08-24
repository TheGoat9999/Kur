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

const STOREFRONT_IDS = new Set(['el_camino', 'corner_store', 'lavanderia', 'palmas_market', 'local_shops']);

export function StreetBackdrop({ theme, alerted }: { theme: StreetTheme; alerted: boolean }) {
  const segmentId = SEGMENT_BY_THEME[theme];
  const scene = geometry.scenes[segmentId];
  const { width, height } = geometry.canvas;

  const roadMaskId = `sd-road-mask-${segmentId}`;
  const roadNoiseId = `sd-road-noise-${segmentId}`;
  const concreteNoiseId = `sd-concrete-noise-${segmentId}`;
  const buildingShadowId = `sd-building-shadow-${segmentId}`;
  const propShadowId = `sd-prop-shadow-${segmentId}`;
  const asphaltId = `sd-asphalt-${segmentId}`;
  const sidewalkId = `sd-sidewalk-${segmentId}`;
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
        <linearGradient id={asphaltId} x1="0" y1="0" x2=".72" y2="1">
          <stop stopColor="#343b3c" />
          <stop offset=".47" stopColor="#2d3435" />
          <stop offset="1" stopColor="#252d2f" />
        </linearGradient>

        <linearGradient id={sidewalkId} x1="0" y1="0" x2="1" y2=".8">
          <stop stopColor="#999990" />
          <stop offset=".5" stopColor="#8b8c84" />
          <stop offset="1" stopColor="#7b7e77" />
        </linearGradient>

        <linearGradient id={ambientId} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={scene.ambient} stopOpacity=".08" />
          <stop offset=".56" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#0d1719" stopOpacity=".12" />
        </linearGradient>

        <radialGradient id={foliageId} cx="34%" cy="27%" r="73%">
          <stop stopColor="#78936b" />
          <stop offset=".38" stopColor="#53724f" />
          <stop offset=".72" stopColor="#36543d" />
          <stop offset="1" stopColor="#243b2d" />
        </radialGradient>

        <filter id={roadNoiseId} x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency=".022 .095" numOctaves="4" seed={scene.surfaceSeed} result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values=".22 0 0 0 .04  0 .22 0 0 .04  0 0 .22 0 .04  0 0 0 .32 0"
          />
        </filter>

        <filter id={concreteNoiseId} x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency=".075" numOctaves="2" seed={scene.surfaceSeed + 19} />
          <feColorMatrix type="saturate" values="0" />
        </filter>

        <filter id={buildingShadowId} x="-40%" y="-40%" width="190%" height="205%">
          <feDropShadow dx="8" dy="12" stdDeviation="7" floodColor="#071012" floodOpacity=".42" />
        </filter>

        <filter id={propShadowId} x="-80%" y="-80%" width="260%" height="280%">
          <feDropShadow dx="2" dy="4" stdDeviation="2.5" floodColor="#071012" floodOpacity=".35" />
        </filter>

        <mask id={roadMaskId}>
          <rect width={width} height={height} fill="black" />
          {scene.roads.map(road => (
            <path
              key={road.id}
              d={road.path}
              fill="none"
              stroke="white"
              strokeWidth={road.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </mask>
      </defs>

      <rect width={width} height={height} fill={scene.ground} />
      <rect width={width} height={height} filter={`url(#${concreteNoiseId})`} opacity=".05" />

      <g className="street-vector-lots">
        {scene.lots.map((lot, index) => (
          <g key={index}>
            <polygon points={points(lot.points)} fill={lot.fill} />
            <polygon points={points(insetPolygon(lot.points, 5))} fill="none" stroke="#d2cec2" strokeOpacity=".08" strokeWidth="1" />
          </g>
        ))}
      </g>

      <g className="street-vector-road-bed">
        {scene.roads.map(road => (
          <path
            key={`sidewalk-${road.id}`}
            d={road.path}
            fill="none"
            stroke={`url(#${sidewalkId})`}
            strokeWidth={road.sidewalkWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {scene.roads.map(road => (
          <path
            key={`sidewalk-edge-${road.id}`}
            d={road.path}
            fill="none"
            stroke="#c2bdb2"
            strokeOpacity=".48"
            strokeWidth={road.curbWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {scene.roads.map(road => (
          <path
            key={`gutter-${road.id}`}
            d={road.path}
            fill="none"
            stroke="#1f292b"
            strokeOpacity=".65"
            strokeWidth={road.width + 4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {scene.roads.map(road => (
          <path
            key={`road-${road.id}`}
            d={road.path}
            fill="none"
            stroke={`url(#${asphaltId})`}
            strokeWidth={road.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        <rect width={width} height={height} filter={`url(#${roadNoiseId})`} mask={`url(#${roadMaskId})`} opacity=".46" />
        <RoadSurfaceDetails seed={scene.surfaceSeed} width={width} height={height} maskId={roadMaskId} />
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
          <Building
            key={building.id}
            definition={building}
            alerted={alerted && building.id === 'corner_store'}
            shadowId={buildingShadowId}
          />
        ))}
      </g>

      <g className="street-vector-props" filter={`url(#${propShadowId})`}>
        {scene.trees.map((tree, index) => <Tree key={`tree:${index}`} {...tree} foliageId={foliageId} />)}
        {scene.props.map((prop, index) => <StreetProp key={`${prop.kind}:${index}`} {...prop} />)}
      </g>

      <rect width={width} height={height} fill={`url(#${ambientId})`} pointerEvents="none" />

      <g className="street-vector-foreground">
        {scene.foreground.map((item, index) => (
          <Tree key={`foreground:${index}`} {...item} foliageId={foliageId} foreground />
        ))}
      </g>
    </svg>
  );
}

function RoadMarking({ definition }: { definition: RoadDefinition['markings'][number] }) {
  const common = {
    d: definition.path,
    fill: 'none',
    stroke: definition.color,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };

  if (definition.kind === 'double') {
    return (
      <g opacity=".58">
        <path {...common} strokeWidth="5.2" />
        <path {...common} stroke="#2e3536" strokeWidth="2" />
      </g>
    );
  }

  if (definition.kind === 'dash') {
    return <path {...common} strokeWidth="2.1" strokeDasharray="15 17" opacity=".46" />;
  }

  return <path {...common} strokeWidth="2.2" opacity=".5" />;
}

function Crosswalk({ x, y, length, width, angle, stripes }: StreetGeometryScene['crosswalks'][number]) {
  const slot = length / stripes;
  const stripeWidth = Math.max(3.5, slot * .48);

  return (
    <g transform={`rotate(${angle} ${x} ${y})`} opacity=".56">
      {Array.from({ length: stripes }, (_, index) => (
        <rect
          key={index}
          x={x - length / 2 + index * slot}
          y={y - width / 2}
          width={stripeWidth}
          height={width}
          rx="1"
          fill="#ddd9ce"
        />
      ))}
    </g>
  );
}

function ParkingLot({ x, y, width, height, angle, spaces }: StreetGeometryScene['parking'][number]) {
  const gap = width / Math.max(1, spaces);

  return (
    <g transform={`rotate(${angle} ${x + width / 2} ${y + height / 2})`}>
      <rect x={x} y={y} width={width} height={height} rx="2" fill="#3b4243" stroke="#20292a" strokeWidth="2" />
      <rect x={x + 5} y={y + 5} width={width - 10} height={height - 10} rx="1" fill="none" stroke="#c8c2b4" strokeOpacity=".08" />
      {Array.from({ length: spaces + 1 }, (_, index) => (
        <path
          key={index}
          d={`M ${x + index * gap} ${y + 9} V ${y + height - 9}`}
          stroke="#d4d0c6"
          strokeWidth="1.4"
          opacity=".28"
        />
      ))}
      <path d={`M ${x + 7} ${y + height * .53} H ${x + width - 7}`} stroke="#11191b" strokeWidth="1.4" opacity=".32" />
    </g>
  );
}

function Building({ definition, alerted, shadowId }: { definition: BuildingDefinition; alerted: boolean; shadowId: string }) {
  const shiftX = Math.max(8, Math.round(definition.height * .28));
  const shiftY = Math.max(12, Math.round(definition.height * .56));
  const shifted = definition.points.map(([x, y]) => [x + shiftX, y + shiftY] as Point);
  const bounds = polygonBounds(definition.points);
  const units = deterministicUnits(definition, bounds);
  const roof = alerted ? '#76504b' : definition.roof;
  const visibleEdges = visibleFacadeEdges(definition.points);

  return (
    <g filter={`url(#${shadowId})`}>
      {definition.points.map((point, index) => {
        const next = definition.points[(index + 1) % definition.points.length]!;
        const shiftedPoint = shifted[index]!;
        const shiftedNext = shifted[(index + 1) % shifted.length]!;
        const visible = visibleEdges.has(index);
        const wallColor = visible ? mixColor(definition.facade, '#0a1112', index % 2 ? .08 : .16) : mixColor(definition.facade, '#000000', .28);

        return (
          <g key={index}>
            <polygon
              points={points([point, next, shiftedNext, shiftedPoint])}
              fill={wallColor}
              stroke={definition.trim}
              strokeOpacity={visible ? '.13' : '.06'}
              strokeWidth="1"
            />
            {visible && <FacadeWindows from={shiftedPoint} to={shiftedNext} height={shiftY} storefront={STOREFRONT_IDS.has(definition.id)} />}
          </g>
        );
      })}

      <polygon points={points(definition.points)} fill={roof} stroke="#171f20" strokeOpacity=".5" strokeWidth="2" />
      <polygon points={points(insetPolygon(definition.points, 5))} fill="none" stroke={definition.trim} strokeOpacity=".34" strokeWidth="2" />
      <polygon points={points(insetPolygon(definition.points, 10))} fill="#11191a" fillOpacity=".075" stroke="#fff" strokeOpacity=".035" strokeWidth="1" />

      {roofSeams(definition, bounds)}
      {units.map((unit, index) => <RoofUnit key={index} {...unit} seed={definition.seed + index * 13} />)}
      {roofWeather(definition.seed, bounds)}

      {STOREFRONT_IDS.has(definition.id) && (
        <path
          d={`M ${bounds.minX + 12} ${bounds.maxY - 5} H ${bounds.maxX - 12}`}
          stroke={alerted ? '#b87562' : definition.trim}
          strokeWidth="4"
          opacity=".42"
        />
      )}
    </g>
  );
}

function FacadeWindows({ from, to, height, storefront }: { from: Point; to: Point; height: number; storefront: boolean }) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  if (length < 55) return null;

  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const count = Math.max(2, Math.floor(length / (storefront ? 42 : 34)));
  const usable = length / count;

  return (
    <g transform={`translate(${from[0]} ${from[1]}) rotate(${angle})`}>
      {Array.from({ length: count }, (_, index) => {
        const x = index * usable + usable * .16;
        const w = usable * .68;
        return storefront ? (
          <g key={index}>
            <rect x={x} y={-Math.max(10, height * .34)} width={w} height={Math.max(9, height * .28)} rx="1" fill="#233d42" opacity=".8" />
            <path d={`M ${x + w * .5} ${-Math.max(10, height * .34)} V ${-Math.max(2, height * .07)}`} stroke="#9eb0ad" strokeOpacity=".22" />
            <path d={`M ${x - 1} ${-Math.max(12, height * .38)} H ${x + w + 1}`} stroke="#86715e" strokeWidth="3" opacity=".72" />
          </g>
        ) : (
          <rect
            key={index}
            x={x}
            y={-Math.max(9, height * .32)}
            width={Math.min(15, w)}
            height={Math.max(7, height * .18)}
            rx="1"
            fill="#47636a"
            stroke="#a7b5b2"
            strokeOpacity=".16"
            opacity=".7"
          />
        );
      })}
    </g>
  );
}

function RoofUnit({ x, y, w, h, seed }: { x: number; y: number; w: number; h: number; seed: number }) {
  const fan = seed % 2 === 0;

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="2" y="3" width={w} height={h} rx="2" fill="#11191a" opacity=".34" />
      <rect width={w} height={h} rx="2" fill="#596264" stroke="#9aa19c" strokeOpacity=".32" />
      {fan ? (
        <>
          <circle cx={w * .5} cy={h * .5} r={Math.min(w, h) * .28} fill="#2c3638" />
          <circle cx={w * .5} cy={h * .5} r={Math.min(w, h) * .12} fill="#778083" opacity=".7" />
        </>
      ) : (
        <path d={`M3 ${h * .45}H${w - 3}M3 ${h * .67}H${w - 3}`} stroke="#30393a" strokeWidth="1.2" opacity=".8" />
      )}
    </g>
  );
}

function Tree({ x, y, r, foliageId, foreground = false }: { x: number; y: number; r: number; foliageId: string; foreground?: boolean }) {
  const opacity = foreground ? .97 : 1;

  return (
    <g opacity={opacity}>
      <ellipse cx={x + r * .38} cy={y + r * .72} rx={r * .95} ry={r * .46} fill="#071012" opacity={foreground ? '.42' : '.26'} />
      <path d={`M${x} ${y + r * .1}L${x + 2} ${y + r * .85}`} stroke="#554734" strokeWidth={Math.max(3, r * .18)} strokeLinecap="round" />
      <circle cx={x} cy={y} r={r * .78} fill={`url(#${foliageId})`} />
      <circle cx={x - r * .42} cy={y + r * .02} r={r * .55} fill="#52734e" />
      <circle cx={x + r * .42} cy={y - r * .08} r={r * .58} fill="#38573d" />
      <circle cx={x - r * .06} cy={y - r * .48} r={r * .55} fill="#6d8761" />
      <circle cx={x + r * .12} cy={y + r * .28} r={r * .48} fill="#456645" opacity=".88" />
      <path d={`M${x-r*.45} ${y-r*.18}Q${x} ${y-r*.48} ${x+r*.45} ${y-r*.18}`} stroke="#a0b38d" strokeWidth="1.2" opacity=".13" fill="none" />
    </g>
  );
}

function StreetProp({ kind, x, y }: StreetGeometryScene['props'][number]) {
  if (kind === 'lamp') {
    return (
      <g>
        <ellipse cx={x + 4} cy={y + 10} rx="6" ry="2.4" fill="#071012" opacity=".24" />
        <path d={`M${x} ${y + 8}V${y - 18}`} stroke="#344044" strokeWidth="3" />
        <path d={`M${x} ${y - 18}l7 -2`} stroke="#344044" strokeWidth="2.4" strokeLinecap="round" />
        <ellipse cx={x + 8} cy={y - 20} rx="4" ry="2.4" fill="#687375" />
        <ellipse cx={x + 8} cy={y - 19.4} rx="2.5" ry="1.2" fill="#ded2a5" opacity=".62" />
      </g>
    );
  }

  if (kind === 'hydrant') {
    return (
      <g>
        <ellipse cx={x + 2} cy={y + 5} rx="5" ry="2" fill="#071012" opacity=".25" />
        <rect x={x - 3.5} y={y - 8} width="7" height="13" rx="2.4" fill="#9a4a3c" />
        <rect x={x - 5} y={y - 5} width="10" height="3" rx="1.5" fill="#b55b49" />
        <circle cx={x} cy={y - 9} r="3.6" fill="#a84f3f" />
      </g>
    );
  }

  if (kind === 'drain') {
    return (
      <g transform={`translate(${x} ${y})`}>
        <rect x="-7" y="-2.5" width="14" height="5.5" rx=".7" fill="#1e2728" stroke="#111718" />
        <path d="M-4-1.7V2M0-1.7V2M4-1.7V2" stroke="#667071" strokeWidth=".8" />
      </g>
    );
  }

  if (kind === 'dumpster') {
    return (
      <g transform={`translate(${x} ${y})`}>
        <ellipse cx="6" cy="7" rx="12" ry="4" fill="#071012" opacity=".26" />
        <rect x="-9" y="-7" width="20" height="14" rx="1.6" fill="#3d594a" stroke="#24352d" strokeWidth="1.5" />
        <path d="M-8-4H10M-5-9H7" stroke="#718275" strokeWidth="1.4" />
      </g>
    );
  }

  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="2" cy="4" rx="3.5" ry="1.7" fill="#071012" opacity=".26" />
      <rect x="-1.7" y="-6" width="3.4" height="10" rx=".8" fill="#424d4f" />
      <circle cy="-7" r="2.6" fill="#606c6e" />
    </g>
  );
}

function RoadSurfaceDetails({ seed, width, height, maskId }: { seed: number; width: number; height: number; maskId: string }) {
  const random = mulberry32(seed * 13 + 17);
  const repairs = Array.from({ length: 28 }, (_, index) => {
    const x = random() * width;
    const y = random() * height;
    const w = 18 + random() * 52;
    const h = 5 + random() * 15;
    const angle = random() * 170;
    return (
      <rect
        key={`repair:${index}`}
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={2 + random() * 3}
        transform={`rotate(${angle} ${x} ${y})`}
        fill={index % 3 ? '#11191a' : '#7e8079'}
        opacity={.025 + random() * .055}
      />
    );
  });

  const cracks = Array.from({ length: 44 }, (_, index) => {
    const x = random() * width;
    const y = random() * height;
    const length = 8 + random() * 28;
    const kink = -5 + random() * 10;
    const angle = random() * 180;
    return (
      <path
        key={`crack:${index}`}
        d={`M${x - length / 2} ${y}l${length * .42} ${kink}l${length * .28} ${-kink * .55}l${length * .3} ${kink * .25}`}
        transform={`rotate(${angle} ${x} ${y})`}
        fill="none"
        stroke="#101719"
        strokeWidth=".8"
        opacity={.09 + random() * .08}
      />
    );
  });

  return <g mask={`url(#${maskId})`}>{repairs}{cracks}</g>;
}

function roofSeams(definition: BuildingDefinition, bounds: ReturnType<typeof polygonBounds>) {
  const random = mulberry32(definition.seed * 5 + 41);
  const count = Math.max(2, Math.floor(bounds.width / 78));

  return (
    <g opacity=".08">
      {Array.from({ length: count }, (_, index) => {
        const x = bounds.minX + 14 + (index + 1) * (bounds.width - 28) / (count + 1);
        const lean = -4 + random() * 8;
        return <path key={index} d={`M${x} ${bounds.minY + 10}L${x + lean} ${bounds.maxY - 10}`} stroke="#eef0eb" strokeWidth=".8" />;
      })}
    </g>
  );
}

function roofWeather(seed: number, bounds: ReturnType<typeof polygonBounds>) {
  const random = mulberry32(seed * 31 + 7);

  return Array.from({ length: 12 }, (_, index) => {
    const x = bounds.minX + 12 + random() * Math.max(1, bounds.width - 24);
    const y = bounds.minY + 12 + random() * Math.max(1, bounds.height - 24);
    const rx = 3 + random() * 12;
    const ry = 2 + random() * 6;

    return (
      <ellipse
        key={index}
        cx={x}
        cy={y}
        rx={rx}
        ry={ry}
        fill={index % 4 ? '#0d1516' : '#c1b79f'}
        opacity={.018 + random() * .028}
      />
    );
  });
}

function deterministicUnits(definition: BuildingDefinition, bounds: ReturnType<typeof polygonBounds>) {
  const random = mulberry32(definition.seed);
  const units: Array<{ x: number; y: number; w: number; h: number }> = [];

  for (let index = 0; index < definition.roofUnits; index += 1) {
    const w = 11 + random() * 17;
    const h = 8 + random() * 11;

    units.push({
      x: bounds.minX + 18 + random() * Math.max(1, bounds.width - w - 36),
      y: bounds.minY + 18 + random() * Math.max(1, bounds.height - h - 36),
      w,
      h
    });
  }

  return units;
}

function visibleFacadeEdges(input: Point[]) {
  const scores = input.map((point, index) => {
    const next = input[(index + 1) % input.length]!;
    return { index, y: (point[1] + next[1]) / 2, x: (point[0] + next[0]) / 2 };
  });
  const maxY = Math.max(...scores.map(edgeScore => edgeScore.y));
  const maxX = Math.max(...scores.map(edgeScore => edgeScore.x));
  return new Set(scores.filter(edgeScore => edgeScore.y >= maxY - 24 || edgeScore.x >= maxX - 20).map(edgeScore => edgeScore.index));
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

function mixColor(color: string, target: string, amount: number) {
  const parse = (value: string) => {
    const normalized = value.replace('#', '');
    const full = normalized.length === 3 ? normalized.split('').map(part => part + part).join('') : normalized;
    return [
      Number.parseInt(full.slice(0, 2), 16),
      Number.parseInt(full.slice(2, 4), 16),
      Number.parseInt(full.slice(4, 6), 16)
    ];
  };

  const from = parse(color);
  const to = parse(target);
  const channel = (index: number) => Math.round(from[index]! + (to[index]! - from[index]!) * amount);
  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
}

function points(input: Point[]) {
  return input.map(([x, y]) => `${x},${y}`).join(' ');
}

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
