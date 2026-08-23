import type { CSSProperties } from 'react';

const PEDESTRIAN_FRAMES = [
  '/assets/world/streets/market-block-3/pedestrian-east-01.webp?v=20260824-v4',
  '/assets/world/streets/market-block-3/pedestrian-east-02.webp?v=20260824-v4'
] as const;
const VAN = '/assets/world/streets/market-block-3/van-east.webp?v=20260824-v4';

type ActorKind = 'pedestrian' | 'vehicle';
type ActorDirection = 'east' | 'west';

interface ImageActor {
  id: string;
  kind: ActorKind;
  direction: ActorDirection;
  from: { x: number; y: number };
  to?: { x: number; y: number };
  durationSeconds?: number;
  delaySeconds?: number;
  parked?: boolean;
}

const ACTORS: ImageActor[] = [
  { id: 'ped-north-west', kind: 'pedestrian', direction: 'east', from: { x: 11, y: 38 }, to: { x: 34, y: 38 }, durationSeconds: 14, delaySeconds: -4 },
  { id: 'ped-north-east', kind: 'pedestrian', direction: 'west', from: { x: 90, y: 38 }, to: { x: 67, y: 38 }, durationSeconds: 16, delaySeconds: -9 },
  { id: 'ped-south-west', kind: 'pedestrian', direction: 'east', from: { x: 18, y: 69 }, to: { x: 44, y: 69 }, durationSeconds: 18, delaySeconds: -7 },
  { id: 'ped-south-east', kind: 'pedestrian', direction: 'west', from: { x: 84, y: 69 }, to: { x: 58, y: 69 }, durationSeconds: 17, delaySeconds: -13 },
  { id: 'van-traffic-east', kind: 'vehicle', direction: 'east', from: { x: -12, y: 53 }, to: { x: 112, y: 53 }, durationSeconds: 23, delaySeconds: -6 },
  { id: 'van-traffic-west', kind: 'vehicle', direction: 'west', from: { x: 112, y: 59 }, to: { x: -12, y: 59 }, durationSeconds: 29, delaySeconds: -18 },
  { id: 'van-parked', kind: 'vehicle', direction: 'east', from: { x: 67, y: 79 }, parked: true }
];

export function MarketStreetImageActors() {
  return (
    <div className="market-street-image-actors" aria-hidden="true" data-render-mode="image-backed-runtime">
      {ACTORS.map(actor => {
        const moving = Boolean(actor.to);
        const style = {
          '--image-actor-from-x': `${actor.from.x}%`,
          '--image-actor-from-y': `${actor.from.y}%`,
          '--image-actor-to-x': `${actor.to?.x ?? actor.from.x}%`,
          '--image-actor-to-y': `${actor.to?.y ?? actor.from.y}%`,
          '--image-actor-duration': `${actor.durationSeconds ?? 0}s`,
          '--image-actor-delay': `${actor.delaySeconds ?? 0}s`
        } as CSSProperties;
        return (
          <span
            key={actor.id}
            className={`market-image-actor market-image-actor-${actor.kind} market-image-actor-${actor.direction} ${moving ? 'market-image-actor-moving' : ''} ${actor.parked ? 'market-image-actor-parked' : ''}`}
            style={style}
            data-actor-id={actor.id}
            data-actor-kind={actor.kind}
          >
            {actor.kind === 'pedestrian' ? (
              <span className="market-pedestrian-walk-cycle">
                {PEDESTRIAN_FRAMES.map((frame, index) => (
                  <img key={frame} className={`market-pedestrian-frame market-pedestrian-frame-${index + 1}`} src={frame} alt="" draggable={false} decoding="async" />
                ))}
              </span>
            ) : (
              <img src={VAN} alt="" draggable={false} decoding="async" />
            )}
          </span>
        );
      })}
    </div>
  );
}
