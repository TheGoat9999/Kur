export type WorldVehicleType = 'sedan' | 'hatchback' | 'coupe' | 'suv' | 'pickup' | 'van' | 'truck';
export type WorldVehicleHeading = 'east' | 'west';
export type WorldVehicleService = 'civilian' | 'taxi' | 'police' | 'ems' | 'delivery';

export function WorldVehicle({ type, color, heading = 'east', service = 'civilian', serviceLabel, className = '' }: {
  type: WorldVehicleType;
  color: string;
  heading?: WorldVehicleHeading;
  service?: WorldVehicleService;
  serviceLabel?: string | undefined;
  className?: string;
}) {
  return (
    <span className={`world-vehicle world-vehicle-${type} world-vehicle-${heading} world-vehicle-service-${service} ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 148 66" role="presentation">
        <WorldVehicleGlyph type={type} color={color} heading={heading} service={service} serviceLabel={serviceLabel} />
      </svg>
    </span>
  );
}

export function WorldVehicleGlyph({ type, color, heading = 'east', service = 'civilian', serviceLabel }: {
  type: WorldVehicleType;
  color: string;
  heading?: WorldVehicleHeading;
  service?: WorldVehicleService;
  serviceLabel?: string | undefined;
}) {
  const flip = heading === 'west' ? 'translate(148 66) rotate(180)' : undefined;
  const d = vehicleDimensions(type);
  const frontX = 10;
  const rearX = 137;

  return (
    <g transform={flip}>
      <ellipse cx="74" cy="58" rx={type === 'truck' ? 66 : 61} ry="6" fill="#02090c" opacity=".42" />

      <g className="world-vehicle-wheels">
        <Wheel x={d.frontWheelX} y={5} /><Wheel x={d.frontWheelX} y={51} />
        <Wheel x={d.rearWheelX} y={5} /><Wheel x={d.rearWheelX} y={51} />
      </g>

      <path d={d.bodyPath} fill={color} stroke="#0b171b" strokeWidth="2.2" />
      <path d={d.lowerBodyPath} fill="#071216" opacity=".25" />
      <path d={d.highlightPath} fill="#fff" opacity=".08" />
      <path d={d.bodyContourPath} fill="none" stroke="#d8e3e4" strokeOpacity=".14" strokeWidth="1" />

      <g className="world-vehicle-mirrors" fill="#15262c" stroke="#718a90" strokeOpacity=".24" strokeWidth=".8">
        <path d={`M${d.cabinX + 4} 10l-8-3-2 4 9 4Z`} />
        <path d={`M${d.cabinX + 4} 56l-8 3-2-4 9-4Z`} />
      </g>

      <rect x={d.cabinX} y="12" width={d.cabinWidth} height="42" rx={d.cabinRadius} fill="#17313a" stroke="#9db3b8" strokeOpacity=".2" strokeWidth="1.1" />
      <path d={d.windshieldPath} fill="#335762" stroke="#a9c3c8" strokeOpacity=".2" strokeWidth="1" />
      <path d={d.rearGlassPath} fill="#27464f" stroke="#91aeb4" strokeOpacity=".16" strokeWidth="1" />
      <path d={`M${d.cabinX + d.cabinWidth * .48} 13v40`} stroke="#0c1f25" strokeWidth="2" opacity=".8" />
      <path d={`M${d.cabinX + 9} 14v38M${d.cabinX + d.cabinWidth - 9} 14v38`} stroke="#9fb6bb" strokeWidth=".8" opacity=".17" />
      <path d={`M${d.cabinX + 4} 33h${d.cabinWidth - 8}`} stroke="#0a2026" strokeWidth="1" opacity=".55" />

      <path d={`M${frontX + 7} 16h${Math.max(10, d.cabinX - frontX - 14)}M${frontX + 7} 50h${Math.max(10, d.cabinX - frontX - 14)}`} stroke="#07161b" strokeWidth="1.2" opacity=".55" />
      <path d={`M${d.cabinX + d.cabinWidth + 6} 16H${rearX - 6}M${d.cabinX + d.cabinWidth + 6} 50H${rearX - 6}`} stroke="#07161b" strokeWidth="1.2" opacity=".5" />

      <g className="world-vehicle-lights">
        <rect x="7" y="18" width="8" height="10" rx="3" fill="#f7dfa0" stroke="#fff" strokeOpacity=".18" />
        <rect x="7" y="38" width="8" height="10" rx="3" fill="#f7dfa0" stroke="#fff" strokeOpacity=".18" />
        <rect x="133" y="18" width="8" height="10" rx="3" fill="#c8544d" stroke="#ffb0a8" strokeOpacity=".18" />
        <rect x="133" y="38" width="8" height="10" rx="3" fill="#c8544d" stroke="#ffb0a8" strokeOpacity=".18" />
      </g>

      <path d="M14 31h6M128 31h7" stroke="#17272c" strokeWidth="3" strokeLinecap="round" />
      <path d="M17 11h111M17 55h111" stroke="#07161a" strokeWidth="1.4" opacity=".64" />
      <path d="M18 14h18M18 52h18" stroke="#d4e1e2" strokeOpacity=".1" strokeWidth="1" />

      {type === 'pickup' && <PickupBed />}
      {type === 'van' && <VanRoof label={serviceLabel} />}
      {type === 'truck' && <TruckBox label={serviceLabel} />}
      {type !== 'van' && type !== 'truck' && serviceLabel && <DoorLabel label={serviceLabel} />}
      {service === 'taxi' && <TaxiSign />}
      {service === 'police' && <EmergencyBar left="#4a91d0" right="#d55b5b" />}
      {service === 'ems' && <EmergencyBar left="#e9f0ef" right="#d45757" cross />}
    </g>
  );
}

function Wheel({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <rect width="18" height="10" rx="4" fill="#080e11" />
    <rect x="3" y="2" width="12" height="6" rx="2.5" fill="#1a262a" />
    <path d="M6 2v6M12 2v6" stroke="#506167" strokeWidth=".7" opacity=".5" />
  </g>;
}

function PickupBed() {
  return <g>
    <rect x="93" y="14" width="33" height="38" rx="5" fill="#13252b" stroke="#73868a" strokeOpacity=".16" />
    <rect x="98" y="18" width="23" height="30" rx="3" fill="#0a171b" opacity=".72" />
    <path d="M101 22h17M101 44h17" stroke="#87999d" strokeOpacity=".15" />
  </g>;
}

function VanRoof({ label }: { label?: string }) {
  return <g>
    <rect x="70" y="16" width="51" height="34" rx="5" fill="#d9e2df" opacity=".07" />
    <path d="M76 20h39M76 46h39" stroke="#dbe6e3" strokeOpacity=".13" />
    {label && <DoorLabel label={label} />}
  </g>;
}

function TruckBox({ label }: { label?: string }) {
  return <g>
    <rect x="67" y="10" width="60" height="46" rx="4" fill="#12242a" stroke="#71858a" strokeOpacity=".22" />
    <path d="M73 17h48M73 24h48M73 31h48M73 38h48M73 45h48" stroke="#90a2a6" strokeOpacity=".12" />
    {label && <DoorLabel label={label} />}
  </g>;
}

function DoorLabel({ label }: { label: string }) {
  return <g>
    <rect x="54" y="25" width="49" height="16" rx="4" fill="#061419" opacity=".72" />
    <text x="78.5" y="36" textAnchor="middle" fill="#ecd79f" fontSize="7" fontWeight="800" letterSpacing=".9">{label}</text>
  </g>;
}

function TaxiSign() {
  return <g>
    <rect x="63" y="7" width="22" height="8" rx="2.5" fill="#e7bd57" stroke="#17272c" strokeWidth="1" />
    <text x="74" y="13" textAnchor="middle" fill="#17272c" fontSize="5" fontWeight="900">TAXI</text>
  </g>;
}

function EmergencyBar({ left, right, cross = false }: { left: string; right: string; cross?: boolean }) {
  return <g>
    <rect x="60" y="7" width="28" height="7" rx="2" fill="#152329" stroke="#71868c" strokeOpacity=".24" />
    <rect x="62" y="8.5" width="10" height="4" rx="1" fill={left} />
    <rect x="76" y="8.5" width="10" height="4" rx="1" fill={right} />
    {cross && <path d="M74 8.5v4M72 10.5h4" stroke="#b74848" strokeWidth="1" />}
  </g>;
}

function vehicleDimensions(type: WorldVehicleType) {
  if (type === 'hatchback') return dims(
    'M6 20Q8 10 24 7H108Q132 9 142 24V43Q132 56 109 58H24Q9 55 6 45Z',
    'M11 42Q31 55 67 56H111Q130 54 137 45V52Q129 59 108 61H24Q10 58 6 48Z',
    'M16 16Q33 10 58 10H104Q121 11 132 21L122 24Q113 18 96 18H35Q23 19 15 26Z',
    'M18 14Q54 8 108 10Q127 11 136 24',
    35, 64, 10, 19, 108,
    'M37 14Q51 10 62 10L59 53Q47 53 37 49Z',
    'M82 11Q99 11 108 16L104 49Q94 53 83 53Z'
  );
  if (type === 'coupe') return dims(
    'M6 23Q13 13 32 8H105Q128 11 142 25V42Q128 53 106 58H31Q13 54 6 43Z',
    'M10 43Q31 54 69 56H108Q128 53 137 44V51Q127 58 106 61H30Q13 58 6 47Z',
    'M17 18Q37 11 60 11H97Q115 13 131 22L120 25Q109 19 94 19H40Q26 20 16 28Z',
    'M18 16Q52 9 99 12Q123 15 134 24',
    42, 56, 11, 21, 110,
    'M44 15Q55 11 66 11L63 53Q52 53 44 49Z',
    'M78 12Q92 12 99 17L96 49Q88 52 79 52Z'
  );
  if (type === 'suv') return dims(
    'M5 18Q8 8 24 6H114Q135 8 143 22V45Q135 57 115 59H23Q8 57 5 46Z',
    'M8 44Q28 57 69 58H116Q133 56 140 47V54Q132 61 114 62H23Q8 60 5 49Z',
    'M15 14Q32 9 57 9H109Q124 10 135 20L125 23Q115 17 99 17H31Q20 18 14 25Z',
    'M17 13Q61 7 113 10Q130 12 138 22',
    30, 76, 9, 18, 112,
    'M32 13Q48 9 59 9L57 54Q45 54 32 49Z',
    'M88 10Q102 10 111 15L108 51Q99 55 89 54Z'
  );
  if (type === 'pickup') return dims(
    'M6 19Q9 9 25 7H113Q133 9 142 23V44Q133 56 113 58H24Q9 55 6 46Z',
    'M10 43Q30 55 69 56H115Q132 54 138 46V52Q130 59 112 61H24Q9 58 6 49Z',
    'M16 15Q31 10 49 10H80L86 19H33Q21 19 15 26Z',
    'M18 14Q40 9 78 11L87 20',
    31, 49, 8, 19, 112,
    'M33 14Q45 10 55 10L54 53Q43 53 33 49Z',
    'M66 11Q75 12 80 17L78 49Q73 52 67 52Z'
  );
  if (type === 'van') return dims(
    'M5 17Q8 7 22 6H118Q136 8 143 21V46Q136 58 118 60H22Q8 58 5 47Z',
    'M8 45Q29 58 74 59H119Q135 57 140 48V55Q132 61 117 63H22Q8 61 5 50Z',
    'M14 13Q27 9 55 9H113Q127 10 136 19L126 22Q116 16 101 16H29Q19 17 13 24Z',
    'M16 12Q62 7 118 10Q132 12 139 20',
    24, 92, 7, 17, 116,
    'M26 13Q40 9 55 9L53 55Q38 55 26 50Z',
    'M99 10Q110 10 116 15L113 52Q107 55 100 55Z'
  );
  if (type === 'truck') return dims(
    'M4 16Q7 7 19 6H122Q138 8 144 21V47Q138 58 121 60H19Q7 58 4 48Z',
    'M7 46Q27 58 75 59H123Q137 57 141 49V56Q133 62 121 63H19Q7 61 4 51Z',
    'M13 12Q25 9 49 9H118Q131 11 139 19L129 22Q120 16 105 16H27Q18 17 12 24Z',
    'M15 12Q52 8 121 10Q136 12 141 21',
    21, 43, 6, 16, 121,
    'M23 13Q34 9 46 9L44 54Q33 54 23 49Z',
    'M49 10Q57 11 63 16L61 51Q56 54 50 54Z'
  );
  return dims(
    'M6 21Q11 11 29 7H108Q130 10 142 24V43Q130 54 109 58H28Q11 54 6 44Z',
    'M10 43Q29 55 70 56H111Q130 53 137 45V52Q129 58 108 61H28Q11 58 6 48Z',
    'M17 16Q34 10 59 10H102Q119 12 132 21L121 24Q112 18 96 18H35Q23 19 16 27Z',
    'M18 14Q57 8 107 11Q127 13 135 23',
    35, 66, 10, 19, 109,
    'M37 14Q50 10 62 10L60 53Q48 53 37 49Z',
    'M84 11Q98 11 107 16L104 50Q96 53 85 53Z'
  );
}

function dims(bodyPath: string, lowerBodyPath: string, highlightPath: string, bodyContourPath: string, cabinX: number, cabinWidth: number, cabinRadius: number, frontWheelX: number, rearWheelX: number, windshieldPath: string, rearGlassPath: string) {
  return { bodyPath, lowerBodyPath, highlightPath, bodyContourPath, cabinX, cabinWidth, cabinRadius, frontWheelX, rearWheelX, windshieldPath, rearGlassPath };
}
