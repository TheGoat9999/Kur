import { useMemo, useState } from 'react';
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

type MapLevel = 'region' | 'settlement' | 'zone' | 'district' | 'street';

export function WorldMapView({ map, onClose }: { map: WorldMapState; onClose: () => void }) {
  const { locale } = useI18n();
  const copy = worldMapCopy(locale);
  const [level, setLevel] = useState<MapLevel>('region');
  const [settlementId, setSettlementId] = useState(map.current.settlementId);
  const [zoneId, setZoneId] = useState(map.current.zoneId);
  const [districtId, setDistrictId] = useState(map.current.districtId);
  const [streetId, setStreetId] = useState(map.current.streetId);
  const [selectedSegmentId, setSelectedSegmentId] = useState(map.current.segmentId);

  const region = map.regions.find(item => item.id === map.current.regionId) ?? map.regions[0];
  const settlement = map.settlements.find(item => item.id === settlementId);
  const zone = map.zones.find(item => item.id === zoneId);
  const district = map.districts.find(item => item.id === districtId);
  const street = map.streets.find(item => item.id === streetId);
  const selectedSegment = map.segments.find(item => item.id === selectedSegmentId);

  const levelName = level === 'region' ? copy.region : level === 'settlement' ? copy.settlement : level === 'zone' ? copy.zone : level === 'district' ? copy.district : copy.street;
  const subtitle = level === 'region' ? region?.name : level === 'settlement' ? settlement?.name : level === 'zone' ? zone?.name : level === 'district' ? district?.name : street?.name;

  function enterSettlement(item: WorldSettlement) {
    setSettlementId(item.id);
    const nextZone = map.zones.find(candidate => candidate.settlementId === item.id);
    if (nextZone) {
      setZoneId(nextZone.id);
      const nextDistrict = map.districts.find(candidate => candidate.zoneId === nextZone.id);
      if (nextDistrict) setDistrictId(nextDistrict.id);
    }
    setLevel('settlement');
  }

  function enterZone(item: WorldZone) {
    setZoneId(item.id);
    const nextDistrict = map.districts.find(candidate => candidate.zoneId === item.id);
    if (nextDistrict) setDistrictId(nextDistrict.id);
    setLevel('zone');
  }

  function enterDistrict(item: WorldDistrict) {
    setDistrictId(item.id);
    const nextStreet = map.streets.find(candidate => candidate.districtId === item.id);
    if (nextStreet) setStreetId(nextStreet.id);
    setLevel('district');
  }

  function enterStreet(item: WorldStreet) {
    setStreetId(item.id);
    const nextSegment = map.segments.find(candidate => candidate.streetId === item.id);
    if (nextSegment) setSelectedSegmentId(nextSegment.id);
    setLevel('street');
  }

  const layer = useMemo(() => {
    if (level === 'region') return <SettlementLayer map={map} regionId={region?.id ?? ''} currentId={map.current.settlementId} onEnter={enterSettlement} />;
    if (level === 'settlement') return <ZoneLayer map={map} settlementId={settlementId} currentId={map.current.zoneId} onEnter={enterZone} />;
    if (level === 'zone') return <DistrictLayer map={map} zoneId={zoneId} currentId={map.current.districtId} onEnter={enterDistrict} />;
    if (level === 'district') return <StreetLayer map={map} districtId={districtId} currentId={map.current.streetId} onEnter={enterStreet} emptyLabel={copy.noStreets} />;
    return <SegmentLayer map={map} streetId={streetId} currentId={map.current.segmentId} selectedId={selectedSegmentId} onSelect={setSelectedSegmentId} />;
  }, [copy.noStreets, districtId, level, map, region?.id, selectedSegmentId, settlementId, streetId, zoneId]);

  return (
    <div className="world-map-shell">
      <div className="world-map-toolbar">
        <div className="world-map-heading">
          <span>{levelName}</span>
          <b>{subtitle ?? copy.map}</b>
          <small>{copy.hierarchyHint}</small>
        </div>
        <div className="world-map-actions">
          <button type="button" className="world-map-current-button" onClick={() => {
            setSettlementId(map.current.settlementId); setZoneId(map.current.zoneId); setDistrictId(map.current.districtId); setStreetId(map.current.streetId); setSelectedSegmentId(map.current.segmentId); setLevel('street');
          }}><GameIcon name="map-pin" size={14} />{copy.current}</button>
          <button type="button" className="world-map-close" onClick={onClose}><GameIcon name="x" size={16} />{copy.backToStreet}</button>
        </div>
      </div>

      <div className="world-map-breadcrumb" aria-label={copy.map}>
        <button onClick={() => setLevel('region')}>{region?.name ?? 'SOL DORADO'}</button>
        {level !== 'region' && settlement && <><i>›</i><button onClick={() => setLevel('settlement')}>{settlement.name}</button></>}
        {['zone','district','street'].includes(level) && zone && <><i>›</i><button onClick={() => setLevel('zone')}>{zone.name}</button></>}
        {['district','street'].includes(level) && district && <><i>›</i><button onClick={() => setLevel('district')}>{district.name}</button></>}
        {level === 'street' && street && <><i>›</i><button>{street.name}</button></>}
      </div>

      <div className={`world-map-canvas world-map-level-${level}`}>
        <svg viewBox="0 0 100 100" role="img" aria-label={`${copy.map}: ${subtitle ?? ''}`}>
          <defs>
            <pattern id="map-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="currentColor" strokeWidth=".08" /></pattern>
            <filter id="map-shadow"><feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity=".35" /></filter>
          </defs>
          <rect width="100" height="100" className="world-map-water" />
          <rect width="100" height="100" className="world-map-grid" fill="url(#map-grid)" />
          {level === 'region' && region?.geometry.polygon.length ? <polygon points={points(region.geometry)} className="world-map-region-land" /> : null}
          {layer}
        </svg>
        <div className="world-map-legend">
          <span><i className="legend-current" />{copy.current}</span>
          <span><i className="legend-live" />{copy.playable}</span>
          <span><i className="legend-planned" />{copy.planned}</span>
        </div>
      </div>

      {level === 'street' && selectedSegment && (
        <div className={`world-map-selection ${selectedSegment.id === map.current.segmentId ? 'world-map-selection-current' : ''}`}>
          <div><span>{selectedSegment.playable ? copy.playable : copy.planned}</span><b>{selectedSegment.displayName}</b><small>{selectedSegment.id === map.current.segmentId ? copy.currentStreet : copy.routeLater}</small></div>
          {selectedSegment.id === map.current.segmentId && <button onClick={onClose}>{copy.backToStreet}</button>}
        </div>
      )}
    </div>
  );
}

function SettlementLayer({ map, regionId, currentId, onEnter }: { map: WorldMapState; regionId: string; currentId: string; onEnter: (item: WorldSettlement) => void }) {
  return <>{map.settlements.filter(item => item.regionId === regionId).map(item => <Area key={item.id} geometry={item.geometry} name={item.name} current={item.id === currentId} onClick={() => onEnter(item)} />)}</>;
}
function ZoneLayer({ map, settlementId, currentId, onEnter }: { map: WorldMapState; settlementId: string; currentId: string; onEnter: (item: WorldZone) => void }) {
  return <>{map.zones.filter(item => item.settlementId === settlementId).map(item => <Area key={item.id} geometry={item.geometry} name={item.name} current={item.id === currentId} onClick={() => onEnter(item)} />)}</>;
}
function DistrictLayer({ map, zoneId, currentId, onEnter }: { map: WorldMapState; zoneId: string; currentId: string; onEnter: (item: WorldDistrict) => void }) {
  return <>{map.districts.filter(item => item.zoneId === zoneId).map(item => <Area key={item.id} geometry={item.geometry} name={item.name} current={item.id === currentId} onClick={() => onEnter(item)} />)}</>;
}
function StreetLayer({ map, districtId, currentId, onEnter, emptyLabel }: { map: WorldMapState; districtId: string; currentId: string; onEnter: (item: WorldStreet) => void; emptyLabel: string }) {
  const streets = map.streets.filter(item => item.districtId === districtId);
  if (!streets.length) return <text x="50" y="50" textAnchor="middle" className="world-map-empty">{emptyLabel}</text>;
  return <>{streets.map(item => <Road key={item.id} geometry={item.geometry} name={item.name} current={item.id === currentId} onClick={() => onEnter(item)} />)}</>;
}
function SegmentLayer({ map, streetId, currentId, selectedId, onSelect }: { map: WorldMapState; streetId: string; currentId: string; selectedId: string; onSelect: (id: string) => void }) {
  const segments = map.segments.filter(item => item.streetId === streetId);
  const segmentIds = new Set(segments.map(item => item.id));
  const parcels = map.parcels.filter(item => segmentIds.has(item.segmentId));
  return <>
    {segments.map(item => <Segment key={item.id} item={item} current={item.id === currentId} selected={item.id === selectedId} onClick={() => onSelect(item.id)} />)}
    {parcels.map(parcel => <ParcelMarker key={parcel.id} parcel={parcel} />)}
  </>;
}

function Area({ geometry, name, current, onClick }: { geometry: WorldMapGeometry; name: string; current: boolean; onClick: () => void }) {
  return <g className={`world-map-area ${current ? 'world-map-current' : ''}`} onClick={onClick}>
    <polygon points={points(geometry)} />
    <circle cx={geometry.center.x} cy={geometry.center.y} r="1.1" />
    <text x={geometry.center.x} y={geometry.center.y - 2.3} textAnchor="middle">{name}</text>
  </g>;
}
function Road({ geometry, name, current, onClick }: { geometry: WorldMapGeometry; name: string; current: boolean; onClick: () => void }) {
  return <g className={`world-map-road ${current ? 'world-map-current' : ''}`} onClick={onClick}>
    <path d={path(geometry)} className="world-map-road-hit" />
    <path d={path(geometry)} className="world-map-road-line" />
    <circle cx={geometry.center.x} cy={geometry.center.y} r="1.2" />
    <text x={geometry.center.x} y={geometry.center.y - 2.2} textAnchor="middle">{name}</text>
  </g>;
}
function Segment({ item, current, selected, onClick }: { item: WorldStreetSegment; current: boolean; selected: boolean; onClick: () => void }) {
  return <g className={`world-map-segment ${item.playable ? 'world-map-segment-live' : 'world-map-segment-planned'} ${current ? 'world-map-current' : ''} ${selected ? 'world-map-selected' : ''}`} onClick={onClick}>
    <path d={path(item.geometry)} className="world-map-segment-hit" />
    <path d={path(item.geometry)} className="world-map-segment-line" />
    <circle cx={item.geometry.center.x} cy={item.geometry.center.y} r={current ? 1.8 : 1.1} />
    <text x={item.geometry.center.x} y={item.geometry.center.y - 2.4} textAnchor="middle">{item.displayName}</text>
  </g>;
}
function ParcelMarker({ parcel }: { parcel: WorldParcel }) {
  const service = parcel.serviceKey !== null;
  return <g className={`world-map-parcel ${service ? 'world-map-parcel-service' : ''} ${parcel.playerOwnable ? 'world-map-parcel-ownable' : ''}`}>
    <circle cx={parcel.geometry.center.x} cy={parcel.geometry.center.y} r="1.15" />
    <title>{parcel.name}</title>
  </g>;
}

function points(geometry: WorldMapGeometry) { return geometry.polygon.map(point => `${point.x},${point.y}`).join(' '); }
function path(geometry: WorldMapGeometry) {
  const first = geometry.path[0];
  if (!first) return '';
  return `M ${first.x} ${first.y} ${geometry.path.slice(1).map(point => `L ${point.x} ${point.y}`).join(' ')}`;
}
