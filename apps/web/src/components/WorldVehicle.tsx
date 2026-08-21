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
      <svg viewBox="0 0 140 62" role="presentation">
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
  const flip = heading === 'west' ? 'translate(140 62) rotate(180)' : undefined;
  const dimensions = vehicleDimensions(type);
  return (
    <g transform={flip}>
      <ellipse cx="70" cy="54" rx={type === 'truck' ? 62 : 58} ry="6" fill="#061014" opacity=".38" />
      <g fill="#10191d">
        <rect x="17" y="5" width="20" height="8" rx="3" /><rect x="17" y="49" width="20" height="8" rx="3" />
        <rect x="103" y="5" width="20" height="8" rx="3" /><rect x="103" y="49" width="20" height="8" rx="3" />
      </g>
      <path d={dimensions.bodyPath} fill={color} stroke="#17282e" strokeWidth="2" />
      <path d={dimensions.highlightPath} fill="#fff" opacity=".07" />
      <rect x={dimensions.cabinX} y="12" width={dimensions.cabinWidth} height="38" rx={type === 'truck' ? 5 : 9} fill="#223a43" stroke="#85a1a7" strokeOpacity=".18" />
      <path d={`M${dimensions.cabinX + 10} 13v36M${dimensions.cabinX + dimensions.cabinWidth - 10} 13v36`} stroke="#0d2026" strokeWidth="2" opacity=".75" />
      <path d={`M${dimensions.cabinX + dimensions.cabinWidth / 2} 13v36`} stroke="#8ea9ae" strokeWidth="1" opacity=".18" />
      <rect x="8" y="18" width="7" height="10" rx="3" fill="#e7d28d" /><rect x="8" y="34" width="7" height="10" rx="3" fill="#e7d28d" />
      <rect x="125" y="18" width="7" height="10" rx="3" fill="#b84f46" /><rect x="125" y="34" width="7" height="10" rx="3" fill="#b84f46" />
      <path d="M20 9h95M20 53h95" stroke="#0b191e" strokeWidth="1.5" opacity=".6" />
      {type === 'pickup' && <rect x="82" y="13" width="39" height="36" rx="4" fill="#182a30" opacity=".8" />}
      {type === 'van' && <><rect x="70" y="15" width="45" height="32" rx="4" fill="#e7dbbe" opacity=".12" /><path d="M76 20h33M76 27h33" stroke="#e7dbbe" strokeOpacity=".18" /></>}
      {type === 'truck' && <><rect x="69" y="10" width="50" height="42" rx="3" fill="#182a30" opacity=".76" /><path d="M76 17h36M76 24h36M76 31h36M76 38h36" stroke="#8ea1a4" strokeOpacity=".16" /></>}
      {service === 'taxi' && <><rect x="62" y="7" width="20" height="7" rx="2" fill="#e6bd57" stroke="#17282e" /><text x="72" y="12.2" textAnchor="middle" fill="#17282e" fontSize="4.5" fontWeight="900">TAXI</text></>}
      {service === 'police' && <><rect x="59" y="7" width="26" height="6" rx="2" fill="#26353b" /><rect x="61" y="8" width="10" height="4" rx="1" fill="#508ec5" /><rect x="73" y="8" width="10" height="4" rx="1" fill="#c85454" /></>}
      {service === 'ems' && <><rect x="62" y="7" width="20" height="6" rx="2" fill="#e4e9e7" /><path d="M72 8v4M70 10h4" stroke="#ba4c4c" strokeWidth="1.5" /></>}
      {serviceLabel && <><rect x="48" y="24" width="48" height="14" rx="4" fill="#0b1b20" opacity=".72" /><text x="72" y="34" textAnchor="middle" fill="#e6d19d" fontSize="7" fontWeight="800" letterSpacing="1">{serviceLabel}</text></>}
    </g>
  );
}

function vehicleDimensions(type: WorldVehicleType) {
  if (type === 'hatchback') return {
    bodyPath: 'M7 18Q10 9 24 7H108Q127 9 133 22V42Q127 53 108 55H25Q10 53 7 44Z',
    highlightPath: 'M16 15Q27 10 54 10H103Q119 12 126 20L118 22Q109 17 94 17H31Q20 18 15 23Z',
    cabinX: 36, cabinWidth: 58
  };
  if (type === 'coupe') return {
    bodyPath: 'M7 21Q14 12 33 8H105Q123 11 133 23V40Q124 50 106 54H31Q14 51 7 41Z',
    highlightPath: 'M18 17Q34 11 59 11H96Q111 13 124 21L115 23Q105 18 93 18H38Q25 19 17 25Z',
    cabinX: 43, cabinWidth: 51
  };
  if (type === 'suv') return {
    bodyPath: 'M6 17Q11 7 25 6H113Q130 8 134 20V43Q130 54 114 56H24Q10 54 6 44Z',
    highlightPath: 'M16 13Q29 9 54 9H108Q121 10 128 19L120 21Q111 16 96 16H30Q19 17 14 22Z',
    cabinX: 31, cabinWidth: 70
  };
  if (type === 'pickup') return {
    bodyPath: 'M7 18Q11 8 25 7H111Q128 9 133 21V42Q127 53 112 55H25Q11 53 7 44Z',
    highlightPath: 'M16 14Q29 10 48 10H78L82 18H31Q21 18 15 23Z',
    cabinX: 31, cabinWidth: 48
  };
  if (type === 'van') return {
    bodyPath: 'M6 16Q10 7 22 6H116Q131 8 134 20V43Q130 54 116 56H22Q10 54 6 44Z',
    highlightPath: 'M15 13Q28 9 55 9H111Q123 11 129 19L121 21Q111 16 97 16H29Q19 17 14 22Z',
    cabinX: 25, cabinWidth: 88
  };
  if (type === 'truck') return {
    bodyPath: 'M4 15Q8 7 20 6H121Q134 9 136 20V44Q132 54 120 56H20Q8 54 4 45Z',
    highlightPath: 'M13 12Q25 9 52 9H116Q126 11 131 18L123 20Q113 15 99 15H26Q17 16 12 21Z',
    cabinX: 22, cabinWidth: 42
  };
  return {
    bodyPath: 'M7 20Q13 10 29 7H107Q124 10 133 22V41Q125 51 108 55H29Q13 52 7 42Z',
    highlightPath: 'M18 15Q32 10 57 10H101Q116 12 126 20L117 22Q108 17 95 17H34Q23 18 16 24Z',
    cabinX: 36, cabinWidth: 62
  };
}
