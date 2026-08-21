import type { CSSProperties, MouseEvent, PointerEvent } from 'react';
import type { StreetObjectId, StreetSegmentId } from '@sol-dorado/contracts';
import { WorldCharacter, visualFromSeed, type WorldCharacterDirection } from '../../components/WorldCharacter';
import { WorldVehicle } from '../../components/WorldVehicle';
import { STREET_POPULATION, type StreetNpcSlot } from './street-population';

const TRAFFIC_LANE_Y = {
  east: 50.15,
  west: 58.15
} as const;

export function StreetPopulation({ segmentId, visibleObjectIds }: {
  segmentId: StreetSegmentId;
  visibleObjectIds: StreetObjectId[];
}) {
  const definition = STREET_POPULATION[segmentId];

  function stopVehicleEvent(event: MouseEvent<HTMLElement> | PointerEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return (
    <div className="street-population-layer" aria-hidden="true">
      {definition.vehicles.map(vehicle => {
        const moving = vehicle.toX !== undefined;
        const laneY = moving ? TRAFFIC_LANE_Y[vehicle.heading] : vehicle.y;
        const style = {
          '--vehicle-x': `${vehicle.x}%`,
          '--vehicle-y': `${laneY}%`,
          '--vehicle-to-x': `${vehicle.toX ?? vehicle.x}%`,
          '--vehicle-duration': `${vehicle.durationSeconds ?? 0}s`,
          '--vehicle-delay': `${vehicle.delaySeconds ?? 0}s`,
          '--vehicle-width': `${vehicle.widthPercent ?? 9.6}%`
        } as CSSProperties;
        const serviceProps = {
          ...(vehicle.service ? { service: vehicle.service } : {}),
          ...(vehicle.serviceLabel ? { serviceLabel: vehicle.serviceLabel } : {})
        };
        return (
          <span
            key={vehicle.id}
            className={`street-vehicle-actor street-collision-actor ${moving ? 'street-vehicle-actor-moving' : ''} ${vehicle.parked ? 'street-vehicle-actor-parked' : ''}`}
            style={style}
            data-actor-kind="vehicle"
            data-lane={moving ? vehicle.heading : 'parking'}
            onPointerDown={stopVehicleEvent}
            onClick={stopVehicleEvent}
          >
            <WorldVehicle type={vehicle.type} color={vehicle.color} heading={vehicle.heading} assetSeed={vehicle.id} {...serviceProps} />
          </span>
        );
      })}

      {definition.npcs
        .filter(npc => !npc.namedObjectId || visibleObjectIds.includes(npc.namedObjectId))
        .map(npc => {
          const moving = npc.toX !== undefined || npc.toY !== undefined;
          const style = {
            '--npc-x': `${npc.x}%`,
            '--npc-y': `${npc.y}%`,
            '--npc-to-x': `${npc.toX ?? npc.x}%`,
            '--npc-to-y': `${npc.toY ?? npc.y}%`,
            '--npc-duration': `${npc.durationSeconds ?? 0}s`,
            '--npc-delay': `${npc.delaySeconds ?? 0}s`
          } as CSSProperties;
          return (
            <span
              key={npc.id}
              className={`street-npc-actor ${moving ? 'street-npc-actor-moving' : ''} ${npc.namedObjectId ? 'street-npc-actor-named' : ''}`}
              style={style}
              data-actor-kind="npc"
            >
              <WorldCharacter visual={npc.visual ?? visualFromSeed(`${segmentId}:${npc.id}`)} direction={npcDirection(npc)} moving={moving} />
            </span>
          );
        })}
    </div>
  );
}

function npcDirection(npc: StreetNpcSlot): WorldCharacterDirection {
  if (npc.direction) return npc.direction;
  const dx = (npc.toX ?? npc.x) - npc.x;
  const dy = (npc.toY ?? npc.y) - npc.y;
  if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > 0.01) return dx > 0 ? 'east' : 'west';
  if (Math.abs(dy) > 0.01) return dy > 0 ? 'south' : 'north';
  return 'south';
}
