import { useState } from 'react';
import type { VehicleState } from '@sol-dorado/contracts/vehicles';
import { resolveWorldRoute } from '@sol-dorado/contracts/world-map';
import type {
  WorldDistrict,
  WorldMapGeometry,
  WorldMapState,
  WorldParcel,
  WorldSettlement,
  WorldStreet,
  WorldStreetSegment,
  WorldZone
} from '@sol-dorado/contracts/world-map';
import { GameIcon } from '../../components/GameIcon';
import { useI18n } from '../../i18n';
import { worldMapCopy } from './world-map-copy';
import './world-map.css';
import './vehicle-world.css';

type MapLevel = 'region' | 'settlement' | 'zone' | 'district';

type Props = {
  map: WorldMapState;
  vehicles: VehicleState | null;
  travelBusy: boolean;
  onClose: () => void;
  onTravel: (segmentId: string) => void;
  onDrive: (vehicleId: string, segmentId: string) => void;
};

export function WorldMapView({ map, vehicles, travelBusy, onClose, onTravel, onDrive }: Props) {
  const { locale } = useI18n();
  const copy = worldMapCopy(locale);
  const serviceCopy = locale === 'bg'
    ? { service: 'УСЛУГА В СВЕТА', visit: 'Посети', travel: 'Отиди до', locatedAt: 'Намира се на тази улица', drive: 'Карай дотук', vehicle: 'ТВОЯТ АВТОМОБИЛ', carRoute: 'с кола' }
    : { service: 'WORLD SERVICE', visit: 'Visit', travel: 'Travel to', locatedAt: 'Located on this street', drive: 'Drive here', vehicle: 'YOUR VEHICLE', carRoute: 'by car' };
  const [level, setLevel] = useState<MapLevel>('region');
  const [settlementId, setSettlementId] = useState(map.current.settlementId);
  const [zoneId, setZoneId] = useState(map.current.zoneId);
  const [districtId, setDistrictId] = useState(map.current.districtId);
  const [selectedSegmentId, setSelectedSegmentId] = useState(map.current.segmentId);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);

  const region = map.regions.find(item => item.id === map.current.regionId) ?? map.regions[0];
  const settlement = map.settlements.find(item => item.id === settlementId);
  const zone = map.zones.find(item => item.id === zoneId);
  const district = map.districts.find(item => item.id === districtId);
  const selectedSegment = map.segments.find(item => item.id === selectedSegmentId);
  const selectedStreet = selectedSegment ? map.streets.find(item => item.id === selectedSegment.streetId) : undefined;
  const selectedParcel = selectedParcelId ? map.parcels.find(item => item.id === selectedParcelId) : undefined;
  const walkRoute = selectedSegment ? resolveWorldRoute(map, map.current.segmentId, selectedSegment.id, 'walk') : null;
  const drivingVehicle = vehicles?.ownedVehicles.find(vehicle => vehicle.active && vehicle.occupied && vehicle.parkedSegmentId === map.current.segmentId) ?? null;
  const driveRoute = drivingVehicle && selectedSegment ? resolveWorldRoute(map, map.current.segmentId, selectedSegment.id, 'car') : null;
  const isCurrent = selectedSegment?.id === map.current.segmentId;
  const canTravel = Boolean(selectedSegment?.playable && !isCurrent && walkRoute);
  const canDrive = Boolean(drivingVehicle && selectedSegment?.playable && !isCurrent && driveRoute);

  function selectSegment(id: string) {
    setSelectedSegmentId(id);
    setSelectedParcelId(null);
  }

  function selectParcel(parcel: WorldParcel) {
    setSelectedSegmentId(parcel.segmentId);
    setSelectedParcelId(parcel.id);
  }

  function enterSettlement(item: WorldSettlement) {
    setSettlementId(item.id);
    const child = map.zones.find(zoneItem => zoneItem.settlementId === item.id);
    if (child) setZoneId(child.id);
    setSelectedParcelId(null);
    setLevel('settlement');
  }

  function enterZone(item: WorldZone) {
    setZoneId(item.id);
    const child = map.districts.find(districtItem => districtItem.zoneId === item.id);
    if (child) setDistrictId(child.id);
    setSelectedParcelId(null);
    setLevel('zone');
  }

  function enterDistrict(item: WorldDistrict) {
    setDistrictId(item.id);
    const streetIds = new Set(map.streets.filter(street => street.districtId === item.id).map(street => street.id));
    const current = map.segments.find(segment => segment.id === map.current.segmentId && streetIds.has(segment.streetId));
    const first = map.segments.find(segment => streetIds.has(segment.streetId));
    if (current ?? first) setSelectedSegmentId((current ?? first)!.id);
    setSelectedParcelId(null);
    setLevel('district');
  }

  function focusCurrent() {
    setSettlementId(map.current.settlementId);
    setZoneId(map.current.zoneId);
    setDistrictId(map.current.districtId);
    setSelectedSegmentId(map.current.segmentId);
    setSelectedParcelId(null);
    setLevel('district');
  }

  const title = level === 'region' ? region?.name : level === 'settlement' ? settlement?.name : level === 'zone' ? zone?.name : district?.name;

  return <div className="world-map-shell">
    <header className="world-map-toolbar">
      <div className="world-map-heading">
        <span>{level === 'region' ? copy.region : level === 'settlement' ? copy.settlement : level === 'zone' ? copy.zone : copy.district}</span>
        <b>{title ?? copy.map}</b>
        <small>{level === 'district' ? copy.streetHint : copy.hierarchyHint}</small>
      </div>
      <div className="world-map-actions">
        {drivingVehicle && <div className="world-map-driving-chip"><GameIcon name="car" size={14} /><span>{serviceCopy.vehicle}</span><b>{drivingVehicle.model.model}</b></div>}
        <button type="button" className="world-map-current-button" onClick={focusCurrent}><GameIcon name="map-pin" size={14} />{copy.current}</button>
        <button type="button" className="world-map-close" onClick={onClose}><GameIcon name="x" size={16} />{copy.backToStreet}</button>
      </div>
    </header>

    <nav className="world-map-breadcrumb" aria-label={copy.map}>
      <button onClick={() => setLevel('region')}>{region?.name ?? 'SOL DORADO'}</button>
      {level !== 'region' && settlement && <><i>›</i><button onClick={() => setLevel('settlement')}>{settlement.name}</button></>}
      {(level === 'zone' || level === 'district') && zone && <><i>›</i><button onClick={() => setLevel('zone')}>{zone.name}</button></>}
      {level === 'district' && district && <><i>›</i><button aria-current="page">{district.name}</button></>}
    </nav>

    <div className={`world-map-canvas world-map-level-${level}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${copy.map}: ${title ?? ''}`}>
        <AtlasDefs />
        {level === 'region' && region && <RegionBackdrop geometry={region.geometry} />}
        {level === 'settlement' && settlement && <SettlementBackdrop settlement={settlement} />}
        {level === 'zone' && zone && <ZoneBackdrop zone={zone} />}
        {level === 'district' && district && <DistrictBackdrop />}

        {level === 'region' && region && map.settlements.filter(item => item.regionId === region.id).map(item =>
          <Area key={item.id} geometry={item.geometry} name={item.name} current={item.id === map.current.settlementId} kind={item.kind} variant="settlement" onClick={() => enterSettlement(item)} />
        )}
        {level === 'settlement' && settlement && map.zones.filter(item => item.settlementId === settlement.id).map(item =>
          <Area key={item.id} geometry={item.geometry} name={item.name} current={item.id === map.current.zoneId} kind={item.kind} variant="zone" onClick={() => enterZone(item)} />
        )}
        {level === 'zone' && zone && map.districts.filter(item => item.zoneId === zone.id).map(item =>
          <Area key={item.id} geometry={item.geometry} name={item.name} current={item.id === map.current.districtId} kind={item.kind} variant="district" onClick={() => enterDistrict(item)} />
        )}
        {level === 'district' && district && <DistrictNetwork map={map} vehicles={vehicles} districtId={district.id} selectedSegmentId={selectedSegmentId} selectedParcelId={selectedParcelId} routeSegmentIds={walkRoute?.segmentIds ?? []} onSelectSegment={selectSegment} onSelectParcel={selectParcel} emptyLabel={copy.noStreets} />}
      </svg>
      <div className="world-map-compass" aria-hidden="true"><span>N</span><i /></div>
      <div className="world-map-scale" aria-hidden="true"><i /><span>{level === 'region' ? '25 km' : level === 'settlement' ? '5 km' : level === 'zone' ? '1 km' : '250 m'}</span></div>
    </div>

    {level === 'district' && selectedSegment && <footer className={`world-map-selection ${isCurrent ? 'world-map-selection-current' : ''} ${selectedParcel?.serviceKey ? 'world-map-selection-service' : ''}`}>
      <div className="world-map-selection-main">
        <span>{selectedParcel?.serviceKey ? serviceCopy.service : selectedSegment.playable ? copy.playable : copy.planned}</span>
        <b>{selectedParcel?.name ?? selectedSegment.displayName}</b>
        <small>{selectedParcel?.serviceKey
          ? `${serviceCopy.locatedAt} · ${selectedSegment.displayName}`
          : isCurrent ? copy.currentStreet : canTravel ? copy.travelDetail.replace('{distance}', String(walkRoute?.distanceMeters ?? 0)) : selectedSegment.playable ? copy.noDirectRoute : copy.notAccessible}</small>
      </div>
      <div className="world-map-selection-meta">
        {selectedStreet && <span>{selectedStreet.name}</span>}
        {walkRoute && !isCurrent && <span>{walkRoute.distanceMeters} m · {copy.walk}</span>}
        {driveRoute && !isCurrent && <span>{driveRoute.distanceMeters} m · {serviceCopy.carRoute}</span>}
        {vehicles?.ownedVehicles.some(vehicle => vehicle.parkedSegmentId === selectedSegment.id) && <span><GameIcon name="car" size={12} /> {serviceCopy.vehicle}</span>}
      </div>
      <div className="world-map-travel-actions">
        {selectedParcel?.serviceKey && isCurrent
          ? <button className="world-map-primary-action world-map-service-action" onClick={() => openWorldService(selectedParcel.serviceKey!)}><GameIcon name="store" size={14} />{serviceCopy.visit} {selectedParcel.name}</button>
          : isCurrent
            ? <button className="world-map-primary-action" onClick={onClose}><GameIcon name="map-pin" size={14} />{copy.openStreet}</button>
            : <>
              {canDrive && drivingVehicle && <button className="world-map-primary-action world-map-drive-action" disabled={travelBusy} onClick={() => onDrive(drivingVehicle.id, selectedSegment.id)}><GameIcon name="car" size={14} />{travelBusy ? copy.travelling : serviceCopy.drive}</button>}
              <button className="world-map-primary-action" disabled={!canTravel || travelBusy} onClick={() => onTravel(selectedSegment.id)}><GameIcon name="footprints" size={14} />{travelBusy ? copy.travelling : canTravel ? selectedParcel?.serviceKey ? `${serviceCopy.travel} ${selectedParcel.name}` : copy.travelHere : copy.unavailable}</button>
            </>}
      </div>
    </footer>}
  </div>;
}

function AtlasDefs() {
  return <defs>
    <linearGradient id="atlas-ocean" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#082832" /><stop offset="1" stopColor="#04181f" /></linearGradient>
    <linearGradient id="atlas-land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#36594f" /><stop offset=".55" stopColor="#294940" /><stop offset="1" stopColor="#203c37" /></linearGradient>
    <linearGradient id="atlas-desert" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8b7650" /><stop offset="1" stopColor="#65583e" /></linearGradient>
    <pattern id="atlas-fields" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><rect width="5" height="5" fill="#667d49" /><path d="M0 1.1H5M0 3.6H5" stroke="#9a9b61" strokeWidth=".45" opacity=".42" /></pattern>
    <filter id="atlas-shadow"><feDropShadow dx="0" dy=".7" stdDeviation=".8" floodColor="#02080a" floodOpacity=".45" /></filter>
    <filter id="atlas-soft"><feGaussianBlur stdDeviation="1.8" /></filter>
  </defs>;
}

function RegionBackdrop({ geometry }: { geometry: WorldMapGeometry }) {
  return <>
    <rect width="100" height="100" fill="url(#atlas-ocean)" />
    <g className="atlas-wave-lines"><path d="M1 18C18 14 26 20 39 16S68 12 99 18" /><path d="M2 88C20 82 35 91 52 86S79 82 98 87" /></g>
    <clipPath id="atlas-region-clip"><polygon points={points(geometry)} /></clipPath>
    <polygon points={points(geometry)} fill="url(#atlas-land)" className="atlas-main-land" />
    <g clipPath="url(#atlas-region-clip)">
      <path className="atlas-terrain atlas-forest" d="M7 6C20 3 36 8 42 18L36 34 17 35 6 24Z" />
      <path className="atlas-terrain atlas-desert" d="M59 46C72 39 91 44 98 57L94 84 72 90 58 75Z" />
      <path className="atlas-terrain atlas-fields" d="M36 38L57 34 65 48 54 64 35 58Z" />
      <path className="atlas-terrain atlas-city-glow" d="M11 38L54 31 65 61 53 86 17 88 8 68Z" />
      <path className="atlas-river" d="M56 12C52 25 59 31 53 42S42 58 46 74" />
      <g className="atlas-contours"><path d="M45 8C51 14 57 14 63 10"/><path d="M43 11C51 19 61 19 68 12"/><path d="M42 15C52 24 65 24 72 15"/><path d="M68 47C76 51 83 51 91 48"/><path d="M66 51C77 57 87 57 95 52"/></g>
      <g className="atlas-mountains"><Mountain x={48} y={12}/><Mountain x={55} y={16}/><Mountain x={62} y={13}/><Mountain x={67} y={19}/><Mountain x={73} y={16}/></g>
      <g className="atlas-highways"><path d="M28 22C39 34 47 48 75 67"/><path d="M38 63C56 55 66 39 75 23"/><path d="M29 59C46 65 62 68 76 67"/></g>
    </g>
    <polygon points={points(geometry)} className="atlas-coastline" />
  </>;
}

function SettlementBackdrop({ settlement }: { settlement: WorldSettlement }) {
  if (settlement.id === 'sol_dorado_city') return <>
    <rect width="100" height="100" className="atlas-local-land" />
    <path className="atlas-city-ocean" d="M0 0H12C10 18 15 31 10 46S12 78 18 100H0Z" />
    <path className="atlas-harbor-water" d="M68 72C78 65 91 63 100 67V100H72C77 89 75 82 68 72Z" />
    <path className="atlas-hills" d="M38 0H88L91 22 76 31 57 25 45 15Z" />
    <path className="atlas-city-park" d="M19 52L35 47 41 61 32 71 17 66Z" />
    <g className="atlas-city-arterials"><path d="M13 39C35 42 60 41 95 33"/><path d="M22 80C43 69 63 64 94 62"/><path d="M48 8C49 29 56 51 61 92"/></g>
  </>;
  if (settlement.id === 'mesa_roja') return <>
    <rect width="100" height="100" className="atlas-desert-base" />
    <path className="atlas-mesa" d="M8 35L27 20 46 25 53 42 37 54 16 51Z"/><path className="atlas-mesa atlas-mesa-two" d="M58 16L84 11 94 32 82 45 61 38Z"/>
    <path className="atlas-dry-river" d="M4 78C28 66 35 71 52 61S76 52 99 57" />
  </>;
  if (settlement.id === 'puerto_cielo') return <>
    <rect width="100" height="100" className="atlas-local-land atlas-coastal-land" />
    <path className="atlas-city-ocean atlas-ocean-right" d="M82 0H100V100H70C78 82 80 63 76 45S80 15 82 0Z" />
    <path className="atlas-forest-patch" d="M4 8L52 4 60 30 37 47 8 38Z" />
    <g className="atlas-contours local"><path d="M15 17C29 9 43 12 56 20"/><path d="M11 23C29 14 47 18 62 27"/></g>
  </>;
  return <>
    <rect width="100" height="100" fill="url(#atlas-fields)" />
    <path className="atlas-village-green" d="M34 29L68 25 77 49 62 70 31 66 22 45Z" />
    <g className="atlas-rural-roads"><path d="M2 57C27 52 50 51 98 43"/><path d="M48 2C47 25 51 55 58 98"/></g>
  </>;
}

function ZoneBackdrop({ zone }: { zone: WorldZone }) {
  return <>
    <rect width="100" height="100" className={`atlas-zone-base atlas-zone-${zone.kind}`} />
    {zone.kind === 'coastal' && <path className="atlas-city-ocean atlas-ocean-left-local" d="M0 0H17C13 22 18 43 12 61S14 84 21 100H0Z" />}
    {zone.kind === 'suburban' && <><path className="atlas-hills" d="M0 0H100V29C77 20 59 32 41 24S15 19 0 31Z"/><g className="atlas-contours local"><path d="M9 14C30 5 58 9 86 17"/><path d="M5 21C31 12 62 17 94 24"/></g></>}
    {zone.kind === 'desert' && <path className="atlas-mesa" d="M9 24L37 13 55 28 49 48 21 55 6 41Z" />}
    {zone.kind === 'rural' && <rect x="3" y="3" width="94" height="94" fill="url(#atlas-fields)" opacity=".52" />}
    <g className="atlas-zone-roads"><path d="M4 34C28 38 61 33 97 27"/><path d="M9 74C34 62 65 64 95 75"/><path d="M53 3C48 30 52 57 58 97"/></g>
  </>;
}

function DistrictBackdrop() {
  return <>
    <rect width="100" height="100" className="atlas-district-base" />
    <g className="atlas-building-blocks"><path d="M8 12H35V31H8Z"/><path d="M48 10H71V31H48Z"/><path d="M76 10H94V31H76Z"/><path d="M7 62H34V88H7Z"/><path d="M49 62H68V88H49Z"/><path d="M75 75H94V91H75Z"/></g>
    <path className="atlas-district-park" d="M74 36H94V63L84 69 73 60Z" />
    <path className="atlas-service-ground" d="M47 35H66V49H47Z" />
    <g className="atlas-minor-roads"><path d="M5 35H96"/><path d="M5 72H96"/><path d="M36 5V95"/></g>
  </>;
}

function Area({ geometry, name, current, kind, variant, onClick }: { geometry: WorldMapGeometry; name: string; current: boolean; kind: string; variant: 'settlement' | 'zone' | 'district'; onClick: () => void }) {
  return <g className={`world-map-area world-map-area-${variant} world-map-kind-${kind} ${current ? 'world-map-current' : ''}`} onClick={onClick}>
    <polygon points={points(geometry)} />
    <circle cx={geometry.center.x} cy={geometry.center.y} r={variant === 'settlement' ? 1.15 : .78} />
    <text x={geometry.center.x} y={geometry.center.y - (variant === 'settlement' ? 2.1 : 1.7)} textAnchor="middle">{name}</text>
  </g>;
}

function DistrictNetwork({ map, vehicles, districtId, selectedSegmentId, selectedParcelId, routeSegmentIds, onSelectSegment, onSelectParcel, emptyLabel }: {
  map: WorldMapState;
  vehicles: VehicleState | null;
  districtId: string;
  selectedSegmentId: string;
  selectedParcelId: string | null;
  routeSegmentIds: string[];
  onSelectSegment: (id: string) => void;
  onSelectParcel: (parcel: WorldParcel) => void;
  emptyLabel: string;
}) {
  const streets = map.streets.filter(item => item.districtId === districtId);
  if (!streets.length) return <text x="50" y="50" textAnchor="middle" className="world-map-empty">{emptyLabel}</text>;
  const streetIds = new Set(streets.map(item => item.id));
  const segments = map.segments.filter(item => streetIds.has(item.streetId));
  const segmentIds = new Set(segments.map(item => item.id));
  const parcels = map.parcels.filter(item => segmentIds.has(item.segmentId));
  const districtVehicles = vehicles?.ownedVehicles.filter(vehicle => segmentIds.has(vehicle.parkedSegmentId)) ?? [];
  const routeIds = new Set(routeSegmentIds);
  return <>
    {streets.map(item => <StreetRoad key={item.id} street={item} current={item.id === map.current.streetId} />)}
    {segments.map(item => <SegmentRoad key={item.id} item={item} current={item.id === map.current.segmentId} selected={item.id === selectedSegmentId} routed={routeIds.has(item.id)} onClick={() => onSelectSegment(item.id)} />)}
    {parcels.map(parcel => <ParcelMarker key={parcel.id} parcel={parcel} selected={parcel.id === selectedParcelId} onClick={() => onSelectParcel(parcel)} />)}
    {districtVehicles.map((vehicle, index) => {
      const segment = segments.find(item => item.id === vehicle.parkedSegmentId);
      if (!segment) return null;
      const sameSegmentIndex = districtVehicles.filter(item => item.parkedSegmentId === vehicle.parkedSegmentId).findIndex(item => item.id === vehicle.id);
      const x = segment.geometry.center.x + sameSegmentIndex * 2.2;
      const y = segment.geometry.center.y + 3.3 + (index % 2) * .4;
      return <g key={vehicle.id} className={`world-map-player-vehicle ${vehicle.active ? 'active' : ''}`} onClick={() => onSelectSegment(vehicle.parkedSegmentId)} role="button" aria-label={vehicle.model.displayName}>
        <circle cx={x} cy={y} r="2.2" />
        <text x={x} y={y + .55} textAnchor="middle">V</text>
        <title>{vehicle.model.displayName} · {vehicle.parkedDisplayName}</title>
      </g>;
    })}
  </>;
}

function StreetRoad({ street, current }: { street: WorldStreet; current: boolean }) {
  return <g className={`world-map-street ${current ? 'world-map-street-current' : ''}`}>
    <path d={path(street.geometry)} className="world-map-street-casing" />
    <path d={path(street.geometry)} className="world-map-street-surface" />
    <text x={street.geometry.center.x} y={street.geometry.center.y - 1.7} textAnchor="middle">{street.name}</text>
  </g>;
}

function SegmentRoad({ item, current, selected, routed, onClick }: { item: WorldStreetSegment; current: boolean; selected: boolean; routed: boolean; onClick: () => void }) {
  return <g className={`world-map-segment ${item.playable ? 'world-map-segment-live' : 'world-map-segment-planned'} ${current ? 'world-map-current' : ''} ${selected ? 'world-map-selected' : ''} ${routed ? 'world-map-segment-route' : ''}`} onClick={onClick}>
    <path d={path(item.geometry)} className="world-map-segment-hit" />
    <path d={path(item.geometry)} className="world-map-segment-focus" />
    <circle cx={item.geometry.center.x} cy={item.geometry.center.y} r={current ? 1.35 : .9} />
  </g>;
}

function ParcelMarker({ parcel, selected, onClick }: { parcel: WorldParcel; selected: boolean; onClick: () => void }) {
  const dealership = parcel.serviceKey === 'vehicle_dealership';
  const classes = `world-map-parcel world-map-parcel-${parcel.kind} ${parcel.serviceKey ? 'world-map-parcel-service' : ''} ${parcel.playerOwnable ? 'world-map-parcel-ownable' : ''} ${dealership ? 'world-map-parcel-dealership' : ''} ${selected ? 'world-map-parcel-selected' : ''}`;
  return <g className={classes} onClick={onClick} role="button" aria-label={parcel.name}>
    {parcel.geometry.polygon.length > 2 ? <polygon points={points(parcel.geometry)} /> : <circle cx={parcel.geometry.center.x} cy={parcel.geometry.center.y} r=".9" />}
    {dealership && <><circle className="world-map-dealer-pin" cx={parcel.geometry.center.x} cy={parcel.geometry.center.y} r="2.1" /><text className="world-map-dealer-label" x={parcel.geometry.center.x} y={parcel.geometry.center.y + .65} textAnchor="middle">D</text></>}
    <title>{parcel.name}</title>
  </g>;
}

function Mountain({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}><path d="M-3 3L0-3 3 3Z"/><path d="M-1.15-.7L0-3 1.1-.8 .35-.35 0-.7-.45-.25Z" className="snow"/></g>;
}

function openWorldService(serviceKey: string) {
  window.dispatchEvent(new CustomEvent('sd:open-world-service', { detail: { serviceKey } }));
}

function points(geometry: WorldMapGeometry) { return geometry.polygon.map(point => `${point.x},${point.y}`).join(' '); }
function path(geometry: WorldMapGeometry) {
  const first = geometry.path[0];
  if (!first) return '';
  return `M ${first.x} ${first.y} ${geometry.path.slice(1).map(point => `L ${point.x} ${point.y}`).join(' ')}`;
}
