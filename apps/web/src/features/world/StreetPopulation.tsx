import type { CSSProperties } from 'react';
import type { StreetObjectId, StreetSegmentId } from '@sol-dorado/contracts';
import { WorldCharacter, visualFromSeed } from '../../components/WorldCharacter';
import { WorldVehicle } from '../../components/WorldVehicle';
import { STREET_POPULATION } from './street-population';

export function StreetPopulation({ segmentId, visibleObjectIds }: {
  segmentId: StreetSegmentId;
  visibleObjectIds: StreetObjectId[];
}) {
  const definition = STREET_POPULATION[segmentId];

  return (
    <div className="street-population-layer" aria-hidden="true">
      {definition.vehicles.map(vehicle => {
        const moving = vehicle.toX !== undefined;
        const style = {
          '--vehicle-x': `${vehicle.x}%`,
          '--vehicle-y': `${vehicle.y}%`,
          '--vehicle-to-x': `${vehicle.toX ?? vehicle.x}%`,
          '--vehicle-duration': `${vehicle.durationSeconds ?? 0}s`,
          '--vehicle-delay': `${vehicle.delaySeconds ?? 0}s`,
          '--vehicle-width': `${vehicle.widthPercent ?? 9.6}%`
        } as CSSProperties;
        return (
          <span key={vehicle.id} className={`street-vehicle-actor ${moving ? 'street-vehicle-actor-moving' : ''}`} style={style}>
            <WorldVehicle type={vehicle.type} color={vehicle.color} heading={vehicle.heading} serviceLabel={vehicle.serviceLabel} />
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
            <span key={npc.id} className={`street-npc-actor ${moving ? 'street-npc-actor-moving' : ''} ${npc.namedObjectId ? 'street-npc-actor-named' : ''}`} style={style}>
              <WorldCharacter visual={npc.visual ?? visualFromSeed(`${segmentId}:${npc.id}`)} direction={npc.direction ?? 'south'} moving={moving} />
            </span>
          );
        })}
    </div>
  );
}
