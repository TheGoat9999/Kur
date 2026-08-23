import { useEffect, useState, type CSSProperties } from 'react';
import type { StreetPosition } from '@sol-dorado/contracts/world-position';
import type {
  StreetRuntimeActorDirection,
  StreetRuntimePath,
  StreetSceneVNextDefinition
} from './street-scene-vnext';

const PEDESTRIAN_ASSET = '/assets/world/vnext/generated-pedestrians.svg';
const TRAFFIC_ASSET = '/assets/world/vnext/generated-traffic.svg';

export function StreetEnvironmentLayer({ scene }: { scene: StreetSceneVNextDefinition }) {
  return <img className="street-vnext-environment" src={scene.backgroundImage} alt="" draggable={false} decoding="async" />;
}

export function StreetForegroundLayer({ scene }: { scene: StreetSceneVNextDefinition }) {
  if (!scene.foregroundImage) return null;
  return <img className="street-vnext-foreground" src={scene.foregroundImage} alt="" draggable={false} decoding="async" />;
}

export function StreetRuntimePopulation({ scene }: { scene: StreetSceneVNextDefinition }) {
  const now = useRuntimeClock();
  const paths = new Map(scene.pedestrianPaths.map(item => [item.id, item]));
  const lanes = new Map(scene.vehicleLanes.map(item => [item.id, item]));

  return <div className="street-vnext-runtime-layer" aria-hidden="true">
    {scene.vehicles.map(vehicle => {
      const lane = lanes.get(vehicle.laneId);
      if (!lane) return null;
      const motion = positionForRuntimePath(lane, now, vehicle.durationSeconds, vehicle.delaySeconds, vehicle.reverse ?? false, false);
      const heading = motion.direction === 'west' ? 'west' : 'east';
      const style = { '--vnext-x': `${motion.position.x}%`, '--vnext-y': `${motion.position.y}%` } as CSSProperties;
      return <span key={vehicle.id} className={`street-vnext-traffic street-vnext-traffic-${vehicle.type}`} style={style}>
        <svg viewBox="0 0 180 90" preserveAspectRatio="xMidYMid meet"><use href={`${TRAFFIC_ASSET}#${vehicle.type}-${heading}`} /></svg>
      </span>;
    })}

    {scene.pedestrians.map(pedestrian => {
      const route = paths.get(pedestrian.pathId);
      if (!route) return null;
      const motion = positionForRuntimePath(route, now, pedestrian.durationSeconds, pedestrian.delaySeconds, pedestrian.reverse ?? false, route.loop !== false);
      const style = { '--vnext-x': `${motion.position.x}%`, '--vnext-y': `${motion.position.y}%` } as CSSProperties;
      return <span key={pedestrian.id} className="street-vnext-pedestrian" style={style}>
        <svg viewBox="0 0 64 96" preserveAspectRatio="xMidYMid meet"><use href={`${PEDESTRIAN_ASSET}#p${pedestrian.spriteVariant}-${motion.direction}`} /></svg>
      </span>;
    })}
  </div>;
}

function useRuntimeClock() {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const tick = (time: number) => {
      if (time - last >= 33) {
        last = time;
        setNow(time);
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return now;
}

function positionForRuntimePath(path: StreetRuntimePath, now: number, durationSeconds: number, delaySeconds: number, reverse: boolean, pingPong: boolean) {
  const durationMs = Math.max(1000, durationSeconds * 1000);
  let phase = ((now + delaySeconds * 1000) % durationMs + durationMs) % durationMs;
  let progress = phase / durationMs;
  if (pingPong) {
    const doubled = ((now + delaySeconds * 1000) % (durationMs * 2) + durationMs * 2) % (durationMs * 2);
    progress = doubled <= durationMs ? doubled / durationMs : 2 - doubled / durationMs;
  }
  if (reverse) progress = 1 - progress;
  return samplePath(path.points, progress);
}

function samplePath(points: StreetPosition[], progress: number): { position: StreetPosition; direction: StreetRuntimeActorDirection } {
  if (points.length === 0) return { position: { x: 50, y: 50 }, direction: 'south' };
  if (points.length === 1) return { position: points[0]!, direction: 'south' };

  const lengths: number[] = [];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    lengths.push(length);
    total += length;
  }
  if (total <= 0.001) return { position: points[0]!, direction: 'south' };

  let remaining = Math.max(0, Math.min(1, progress)) * total;
  for (let index = 1; index < points.length; index += 1) {
    const length = lengths[index - 1]!;
    const from = points[index - 1]!;
    const to = points[index]!;
    if (remaining <= length || index === points.length - 1) {
      const t = length <= 0.001 ? 0 : Math.max(0, Math.min(1, remaining / length));
      return {
        position: { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
        direction: directionFromVector(to.x - from.x, to.y - from.y)
      };
    }
    remaining -= length;
  }
  return { position: points[points.length - 1]!, direction: 'south' };
}

function directionFromVector(dx: number, dy: number): StreetRuntimeActorDirection {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'east' : 'west';
  return dy >= 0 ? 'south' : 'north';
}
