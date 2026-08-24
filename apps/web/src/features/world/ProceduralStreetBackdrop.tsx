import { useEffect, useRef } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import sceneSource from './procedural-street-v2.json';

type Point = [number, number];
type RoadClass = 'arterial' | 'avenue' | 'collector' | 'local';
type MarkingKind = 'double-yellow' | 'dash-white';
type BuildingStyle = 'terracotta' | 'concrete' | 'brick' | 'stucco' | 'industrial';
type PropKind = 'lamp' | 'hydrant' | 'drain' | 'dumpster';

interface RoadDefinition {
  id: string;
  class: RoadClass;
  width: number;
  centerline: Point[];
  markings: Array<{ kind: MarkingKind; from: Point; to: Point }>;
}
interface LotDefinition { id: string; points: Point[]; tone: 'warm' | 'cool' | 'neutral'; }
interface BuildingDefinition {
  id: string;
  lot: string;
  footprint: Point[];
  floors: number;
  style: BuildingStyle;
  frontageEdge: number;
  storefronts: number;
  roofUnits: number;
  awning: boolean;
}
interface ParkingDefinition { id: string; points: Point[]; spaces: number; orientation: 'vertical' | 'horizontal'; }
interface SceneDefinition {
  id: string;
  seed: number;
  palette: Record<string, string>;
  roads: RoadDefinition[];
  intersectionPatches: Array<{ x: number; y: number; width: number; height: number; radius: number }>;
  crosswalks: Array<{ center: Point; length: number; span: number; angle: number; stripes: number }>;
  lots: LotDefinition[];
  buildings: BuildingDefinition[];
  parking: ParkingDefinition[];
  trees: Array<{ x: number; y: number; radius: number }>;
  props: Array<{ kind: PropKind; x: number; y: number }>;
}

const source = sceneSource as unknown as {
  version: number;
  canvas: { width: number; height: number };
  scene: SceneDefinition;
};

export function ProceduralStreetBackdrop({ alerted }: { alerted: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const app = new Application();

    void app.init({
      width: source.canvas.width,
      height: source.canvas.height,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      background: '#202522'
    }).then(() => {
      if (disposed) { app.destroy(true); return; }
      const canvas = app.canvas as HTMLCanvasElement;
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.objectFit = 'cover';
      canvas.setAttribute('aria-hidden', 'true');
      host.replaceChildren(canvas);
      renderScene(app.stage, source.scene, alerted, source.canvas.width, source.canvas.height);
    });

    return () => {
      disposed = true;
      host.replaceChildren();
      app.destroy(true);
    };
  }, [alerted]);

  return <div ref={hostRef} className="street-backdrop street-backdrop-pixi" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true" />;
}

function renderScene(stage: Container, scene: SceneDefinition, alerted: boolean, width: number, height: number) {
  stage.removeChildren();
  const palette = Object.fromEntries(Object.entries(scene.palette).map(([key, value]) => [key, color(value)])) as Record<string, number>;
  const random = mulberry32(scene.seed);

  drawConcreteBase(stage, scene, palette, width, height, random);
  drawLots(stage, scene.lots, palette);
  drawParking(stage, scene, palette);
  drawRoadSystem(stage, scene, palette, width, height, random);
  drawBuildings(stage, scene, palette, alerted);
  drawStreetLife(stage, scene, palette);
  drawAtmosphere(stage, width, height);
}

function drawConcreteBase(stage: Container, scene: SceneDefinition, palette: Record<string, number>, width: number, height: number, random: () => number) {
  const base = new Graphics();
  base.rect(0, 0, width, height).fill({ color: palette.concrete });
  for (let x = 18; x < width; x += 86) base.moveTo(x, 0).lineTo(x, height).stroke({ width: 1, color: palette.concreteDark, alpha: .12 });
  for (let y = 20; y < height; y += 72) base.moveTo(0, y).lineTo(width, y).stroke({ width: 1, color: palette.concreteDark, alpha: .1 });
  stage.addChild(base);

  const grain = new Graphics();
  for (let index = 0; index < 1250; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const light = random() > .56;
    grain.circle(x, y, .25 + random() * .8).fill({ color: light ? palette.concreteLight : palette.concreteDark, alpha: .035 + random() * .055 });
  }
  stage.addChild(grain);
}

function drawLots(stage: Container, lots: LotDefinition[], palette: Record<string, number>) {
  const tones = { warm: 0x5d5a50, cool: 0x515b59, neutral: 0x55564f } as const;
  for (const lot of lots) {
    const g = new Graphics();
    polygon(g, lot.points).fill({ color: tones[lot.tone], alpha: .54 }).stroke({ width: 1.2, color: palette.concreteLight, alpha: .16 });
    const bounds = polygonBounds(lot.points);
    for (let y = bounds.minY + 18; y < bounds.maxY; y += 48) {
      g.moveTo(bounds.minX + 8, y).lineTo(bounds.maxX - 8, y - 4).stroke({ width: .8, color: palette.concreteDark, alpha: .12 });
    }
    stage.addChild(g);
  }
}

function drawParking(stage: Container, scene: SceneDefinition, palette: Record<string, number>) {
  for (const parking of scene.parking) {
    if (!polygonClearOfRoads(parking.points, scene.roads, 8)) {
      console.warn(`[street-v2] skipped parking ${parking.id}: overlaps a road`);
      continue;
    }
    const g = new Graphics();
    polygon(g, parking.points).fill({ color: palette.asphaltLight, alpha: .88 }).stroke({ width: 1.5, color: palette.curb, alpha: .45 });
    const bounds = polygonBounds(parking.points);
    const gap = (parking.orientation === 'vertical' ? bounds.width : bounds.height) / parking.spaces;
    for (let index = 1; index < parking.spaces; index += 1) {
      if (parking.orientation === 'vertical') {
        const x = bounds.minX + gap * index;
        g.moveTo(x, bounds.minY + 8).lineTo(x, bounds.maxY - 8).stroke({ width: 1.4, color: palette.laneWhite, alpha: .38 });
      } else {
        const y = bounds.minY + gap * index;
        g.moveTo(bounds.minX + 8, y).lineTo(bounds.maxX - 8, y).stroke({ width: 1.4, color: palette.laneWhite, alpha: .38 });
      }
    }
    stage.addChild(g);
  }
}

function drawRoadSystem(stage: Container, scene: SceneDefinition, palette: Record<string, number>, width: number, height: number, random: () => number) {
  const curbs = new Graphics();
  for (const road of scene.roads) drawPolyline(curbs, road.centerline, road.width + curbExpansion(road.class), palette.curb, .8);
  stage.addChild(curbs);

  const asphalt = new Graphics();
  for (const road of scene.roads) {
    drawPolyline(asphalt, road.centerline, road.width, palette.asphalt, 1);
    drawPolyline(asphalt, road.centerline, Math.max(8, road.width - 12), palette.asphaltLight, .075);
  }
  for (const patch of scene.intersectionPatches) {
    asphalt.roundRect(patch.x, patch.y, patch.width, patch.height, patch.radius).fill({ color: palette.asphalt });
  }
  stage.addChild(asphalt);

  const surface = new Graphics();
  for (let index = 0; index < 1850; index += 1) {
    const x = random() * width;
    const y = random() * height;
    if (!isPointOnAnyRoad([x, y], scene.roads, scene.intersectionPatches)) continue;
    const tone = random() > .72 ? palette.asphaltLight : palette.asphaltDark;
    surface.circle(x, y, .25 + random() * .7).fill({ color: tone, alpha: .045 + random() * .06 });
  }
  for (let index = 0; index < 38; index += 1) {
    const x = random() * width;
    const y = random() * height;
    if (!isPointOnAnyRoad([x, y], scene.roads, scene.intersectionPatches)) continue;
    const length = 8 + random() * 32;
    const angle = random() * Math.PI;
    const dx = Math.cos(angle) * length;
    const dy = Math.sin(angle) * length;
    surface.moveTo(x - dx / 2, y - dy / 2).lineTo(x + dx / 2, y + dy / 2).stroke({ width: .7 + random() * .7, color: palette.asphaltDark, alpha: .16 + random() * .12 });
  }
  for (let index = 0; index < 12; index += 1) {
    const x = 30 + random() * (width - 60);
    const y = 320 + random() * 128;
    if (!isPointOnAnyRoad([x, y], scene.roads, scene.intersectionPatches)) continue;
    surface.rect(x, y, 18 + random() * 42, 5 + random() * 12).fill({ color: palette.asphaltDark, alpha: .09 + random() * .08 });
  }
  stage.addChild(surface);

  const markings = new Graphics();
  for (const road of scene.roads) {
    for (const marking of road.markings) drawRoadMarking(markings, marking, palette);
  }
  for (const crosswalk of scene.crosswalks) drawCrosswalk(markings, crosswalk, palette.laneWhite);
  stage.addChild(markings);
}

function drawRoadMarking(g: Graphics, marking: RoadDefinition['markings'][number], palette: Record<string, number>) {
  if (marking.kind === 'double-yellow') {
    const [a, b] = [marking.from, marking.to];
    const normal = perpendicularUnit(a, b);
    drawLine(g, offsetPoint(a, normal, -2.2), offsetPoint(b, normal, -2.2), 1.35, palette.laneYellow, .68);
    drawLine(g, offsetPoint(a, normal, 2.2), offsetPoint(b, normal, 2.2), 1.35, palette.laneYellow, .68);
    return;
  }
  drawDashedLine(g, marking.from, marking.to, 14, 13, 1.6, palette.laneWhite, .48);
}

function drawCrosswalk(g: Graphics, definition: SceneDefinition['crosswalks'][number], colorValue: number) {
  const [cx, cy] = definition.center;
  const angle = definition.angle * Math.PI / 180;
  const along: Point = [Math.cos(angle), Math.sin(angle)];
  const across: Point = [-along[1], along[0]];
  const stripeWidth = definition.length / Math.max(1, definition.stripes * 1.8);
  const step = definition.length / definition.stripes;
  for (let index = 0; index < definition.stripes; index += 1) {
    const offset = -definition.length / 2 + step * (index + .5);
    const center: Point = [cx + along[0] * offset, cy + along[1] * offset];
    const p1 = addScaled(addScaled(center, along, -stripeWidth / 2), across, -definition.span / 2);
    const p2 = addScaled(addScaled(center, along, stripeWidth / 2), across, -definition.span / 2);
    const p3 = addScaled(addScaled(center, along, stripeWidth / 2), across, definition.span / 2);
    const p4 = addScaled(addScaled(center, along, -stripeWidth / 2), across, definition.span / 2);
    polygon(g, [p1, p2, p3, p4]).fill({ color: colorValue, alpha: .62 });
  }
}

function drawBuildings(stage: Container, scene: SceneDefinition, palette: Record<string, number>, alerted: boolean) {
  for (const building of scene.buildings) {
    if (!polygonClearOfRoads(building.footprint, scene.roads, 10)) {
      console.warn(`[street-v2] skipped building ${building.id}: footprint overlaps a road`);
      continue;
    }
    drawBuilding(stage, building, palette, alerted && building.id === 'corner_store', scene.seed);
  }
}

function drawBuilding(stage: Container, building: BuildingDefinition, palette: Record<string, number>, alerted: boolean, sceneSeed: number) {
  const style = buildingStyle(building.style, alerted);
  const centroid = polygonCentroid(building.footprint);
  const depth = Math.min(20, 8 + building.floors * 2.1);
  const shift: Point = [6 + building.floors * .55, depth];
  const shifted = building.footprint.map(point => [point[0] + shift[0], point[1] + shift[1]] as Point);
  const shadow = new Graphics();
  polygon(shadow, building.footprint.map(([x, y]) => [x + 14, y + 18] as Point)).fill({ color: palette.shadow, alpha: .28 });
  stage.addChild(shadow);

  const walls = new Graphics();
  for (let index = 0; index < building.footprint.length; index += 1) {
    const a = building.footprint[index]!;
    const b = building.footprint[(index + 1) % building.footprint.length]!;
    const sa = shifted[index]!;
    const sb = shifted[(index + 1) % shifted.length]!;
    const midX = (a[0] + b[0]) / 2;
    const midY = (a[1] + b[1]) / 2;
    if (midY < centroid[1] - 3 && midX < centroid[0] - 3) continue;
    polygon(walls, [a, b, sb, sa]).fill({ color: midY >= centroid[1] ? style.wallFront : style.wallSide, alpha: 1 });
    walls.moveTo(a[0], a[1]).lineTo(b[0], b[1]).stroke({ width: 1, color: style.trim, alpha: .32 });
  }
  stage.addChild(walls);

  const roof = new Graphics();
  polygon(roof, building.footprint).fill({ color: style.roof }).stroke({ width: 1.8, color: style.trim, alpha: .5 });
  const inset = insetPolygon(building.footprint, 7);
  polygon(roof, inset).stroke({ width: 1.1, color: style.trim, alpha: .2 });
  stage.addChild(roof);

  const random = mulberry32(sceneSeed + hash(building.id));
  const details = new Graphics();
  const bounds = polygonBounds(building.footprint);
  for (let index = 0; index < 22; index += 1) {
    const point = samplePointInside(bounds, building.footprint, random);
    if (!point) continue;
    details.circle(point[0], point[1], 1.5 + random() * 5).fill({ color: random() > .75 ? style.weatherLight : style.weatherDark, alpha: .025 + random() * .055 });
  }
  for (let index = 0; index < building.roofUnits; index += 1) {
    const point = samplePointInside(bounds, inset, random);
    if (!point) continue;
    const unitWidth = 13 + random() * 12;
    const unitHeight = 8 + random() * 8;
    details.rect(point[0] - unitWidth / 2 + 3, point[1] - unitHeight / 2 + 3, unitWidth, unitHeight).fill({ color: palette.shadow, alpha: .22 });
    details.rect(point[0] - unitWidth / 2, point[1] - unitHeight / 2, unitWidth, unitHeight).fill({ color: palette.metal }).stroke({ width: .8, color: style.trim, alpha: .4 });
    details.circle(point[0], point[1], Math.min(unitWidth, unitHeight) * .24).stroke({ width: 1, color: palette.asphaltDark, alpha: .65 });
  }
  stage.addChild(details);

  drawFacade(stage, building, shifted, style, palette);
}

function drawFacade(stage: Container, building: BuildingDefinition, shifted: Point[], style: ReturnType<typeof buildingStyle>, palette: Record<string, number>) {
  const index = Math.min(building.frontageEdge, building.footprint.length - 1);
  const a = building.footprint[index]!;
  const b = building.footprint[(index + 1) % building.footprint.length]!;
  const sa = shifted[index]!;
  const sb = shifted[(index + 1) % shifted.length]!;
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (length < 34) return;

  const facade = new Graphics();
  const modules = building.storefronts > 0 ? building.storefronts : Math.max(2, Math.floor(length / 55));
  for (let module = 0; module < modules; module += 1) {
    const t0 = (module + .12) / modules;
    const t1 = (module + .88) / modules;
    const top0 = lerpPoint(a, b, t0);
    const top1 = lerpPoint(a, b, t1);
    const bottom0 = lerpPoint(sa, sb, t0);
    const bottom1 = lerpPoint(sa, sb, t1);
    const upper0 = lerpPoint(top0, bottom0, building.storefronts > 0 ? .34 : .42);
    const upper1 = lerpPoint(top1, bottom1, building.storefronts > 0 ? .34 : .42);
    const lower0 = lerpPoint(top0, bottom0, .86);
    const lower1 = lerpPoint(top1, bottom1, .86);
    polygon(facade, [upper0, upper1, lower1, lower0]).fill({ color: building.storefronts > 0 ? palette.glass : style.window, alpha: building.storefronts > 0 ? .86 : .68 }).stroke({ width: .7, color: palette.glassLight, alpha: .38 });
    const mullionTop = lerpPoint(upper0, upper1, .5);
    const mullionBottom = lerpPoint(lower0, lower1, .5);
    facade.moveTo(mullionTop[0], mullionTop[1]).lineTo(mullionBottom[0], mullionBottom[1]).stroke({ width: .7, color: style.trim, alpha: .45 });
  }
  if (building.awning) {
    const awningA = lerpPoint(a, sa, .18);
    const awningB = lerpPoint(b, sb, .18);
    facade.moveTo(awningA[0], awningA[1]).lineTo(awningB[0], awningB[1]).stroke({ width: 4.5, color: style.awning, alpha: .9 });
    facade.moveTo(awningA[0], awningA[1] + 2).lineTo(awningB[0], awningB[1] + 2).stroke({ width: 1, color: style.trim, alpha: .35 });
  }
  stage.addChild(facade);
}

function drawStreetLife(stage: Container, scene: SceneDefinition, palette: Record<string, number>) {
  for (const tree of scene.trees) {
    const clearance = roadClearance([tree.x, tree.y], scene.roads);
    if (clearance < tree.radius + 5) {
      console.warn(`[street-v2] skipped tree at ${tree.x},${tree.y}: overlaps a road`);
      continue;
    }
    const g = new Graphics();
    g.ellipse(tree.x + 7, tree.y + 9, tree.radius * .95, tree.radius * .46).fill({ color: palette.shadow, alpha: .24 });
    g.rect(tree.x - 1.5, tree.y, 3, tree.radius * .75).fill({ color: 0x5a4632, alpha: .9 });
    g.circle(tree.x, tree.y, tree.radius * .72).fill({ color: palette.foliage });
    g.circle(tree.x - tree.radius * .35, tree.y + 1, tree.radius * .48).fill({ color: palette.foliageLight, alpha: .88 });
    g.circle(tree.x + tree.radius * .32, tree.y - tree.radius * .18, tree.radius * .5).fill({ color: palette.foliageDark, alpha: .96 });
    g.circle(tree.x - 1, tree.y - tree.radius * .38, tree.radius * .38).fill({ color: palette.foliageLight, alpha: .55 });
    stage.addChild(g);
  }

  for (const prop of scene.props) {
    const clearance = roadClearance([prop.x, prop.y], scene.roads);
    if (prop.kind !== 'drain' && clearance < 4) {
      console.warn(`[street-v2] skipped ${prop.kind} at ${prop.x},${prop.y}: overlaps a road`);
      continue;
    }
    const g = new Graphics();
    if (prop.kind === 'lamp') {
      g.ellipse(prop.x + 4, prop.y + 8, 6, 2.5).fill({ color: palette.shadow, alpha: .24 });
      g.moveTo(prop.x, prop.y + 8).lineTo(prop.x, prop.y - 18).stroke({ width: 3, color: palette.metal, alpha: .9 });
      g.circle(prop.x, prop.y - 20, 3.5).fill({ color: 0x70797a }).circle(prop.x - 1, prop.y - 21, 1.2).fill({ color: 0xd5c997, alpha: .8 });
    } else if (prop.kind === 'hydrant') {
      g.ellipse(prop.x + 2, prop.y + 4, 5, 2).fill({ color: palette.shadow, alpha: .24 });
      g.rect(prop.x - 3.5, prop.y - 7, 7, 11).fill({ color: 0x9b4b3e });
      g.rect(prop.x - 5, prop.y - 4, 10, 3).fill({ color: 0xb55d4c });
      g.circle(prop.x, prop.y - 7, 3.5).fill({ color: 0xa95243 });
    } else if (prop.kind === 'drain') {
      g.rect(prop.x - 7, prop.y - 2.5, 14, 5).fill({ color: palette.asphaltDark }).stroke({ width: .7, color: palette.metal, alpha: .7 });
      for (let i = -4; i <= 4; i += 4) g.moveTo(prop.x + i, prop.y - 2).lineTo(prop.x + i, prop.y + 2).stroke({ width: .6, color: palette.metal, alpha: .8 });
    } else {
      g.ellipse(prop.x + 5, prop.y + 7, 12, 4).fill({ color: palette.shadow, alpha: .23 });
      g.rect(prop.x - 9, prop.y - 7, 20, 14).fill({ color: 0x3d5849 }).stroke({ width: 1, color: 0x26392f, alpha: .85 });
      g.moveTo(prop.x - 8, prop.y - 4).lineTo(prop.x + 10, prop.y - 4).stroke({ width: 1.2, color: 0x718173, alpha: .65 });
    }
    stage.addChild(g);
  }
}

function drawAtmosphere(stage: Container, width: number, height: number) {
  const g = new Graphics();
  g.rect(0, 0, width, height * .16).fill({ color: 0xf1d7ad, alpha: .035 });
  g.rect(0, height * .72, width, height * .28).fill({ color: 0x091315, alpha: .08 });
  stage.addChild(g);
}

function buildingStyle(style: BuildingStyle, alerted: boolean) {
  if (alerted) return { roof: 0x755047, wallFront: 0x50352f, wallSide: 0x3d302d, trim: 0xb68573, window: 0x35525a, awning: 0x6f453d, weatherLight: 0xb89578, weatherDark: 0x30251f };
  const styles = {
    terracotta: { roof: 0x745847, wallFront: 0x58433a, wallSide: 0x45362f, trim: 0xb29a7c, window: 0x35545b, awning: 0x72513f, weatherLight: 0xb49c82, weatherDark: 0x352922 },
    concrete: { roof: 0x526164, wallFront: 0x3b4d50, wallSide: 0x304044, trim: 0x8e9d99, window: 0x345861, awning: 0x465d61, weatherLight: 0x9ba7a1, weatherDark: 0x283436 },
    brick: { roof: 0x765146, wallFront: 0x5f4037, wallSide: 0x49342f, trim: 0xa1816f, window: 0x36555d, awning: 0x66453a, weatherLight: 0xb18c77, weatherDark: 0x332520 },
    stucco: { roof: 0x75695a, wallFront: 0x665b4f, wallSide: 0x51483f, trim: 0xb6a68e, window: 0x35565d, awning: 0x7b5b42, weatherLight: 0xbeb19a, weatherDark: 0x3a342d },
    industrial: { roof: 0x505653, wallFront: 0x3e4643, wallSide: 0x303735, trim: 0x858b84, window: 0x344b4f, awning: 0x4c5551, weatherLight: 0x969990, weatherDark: 0x292d2b }
  } as const;
  return styles[style];
}

function curbExpansion(roadClass: RoadClass) {
  if (roadClass === 'arterial') return 9;
  if (roadClass === 'avenue') return 8;
  if (roadClass === 'collector') return 7;
  return 6;
}

function drawPolyline(g: Graphics, points: Point[], lineWidth: number, colorValue: number, alpha: number) {
  if (points.length < 2) return;
  g.moveTo(points[0]![0], points[0]![1]);
  for (let index = 1; index < points.length; index += 1) g.lineTo(points[index]![0], points[index]![1]);
  g.stroke({ width: lineWidth, color: colorValue, alpha, cap: 'round', join: 'round' });
}

function drawLine(g: Graphics, from: Point, to: Point, width: number, colorValue: number, alpha: number) {
  g.moveTo(from[0], from[1]).lineTo(to[0], to[1]).stroke({ width, color: colorValue, alpha, cap: 'round' });
}

function drawDashedLine(g: Graphics, from: Point, to: Point, dash: number, gap: number, width: number, colorValue: number, alpha: number) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.max(.001, Math.hypot(dx, dy));
  const ux = dx / length;
  const uy = dy / length;
  for (let cursor = 0; cursor < length; cursor += dash + gap) {
    const end = Math.min(length, cursor + dash);
    drawLine(g, [from[0] + ux * cursor, from[1] + uy * cursor], [from[0] + ux * end, from[1] + uy * end], width, colorValue, alpha);
  }
}

function polygon(g: Graphics, points: Point[]) {
  if (!points.length) return g;
  g.moveTo(points[0]![0], points[0]![1]);
  for (let index = 1; index < points.length; index += 1) g.lineTo(points[index]![0], points[index]![1]);
  g.closePath();
  return g;
}

function polygonClearOfRoads(points: Point[], roads: RoadDefinition[], clearance: number) {
  for (const road of roads) {
    const required = road.width / 2 + clearance;
    for (const point of points) if (distancePointToPolyline(point, road.centerline) < required) return false;
    for (let edgeIndex = 0; edgeIndex < points.length; edgeIndex += 1) {
      const a = points[edgeIndex]!;
      const b = points[(edgeIndex + 1) % points.length]!;
      for (let segmentIndex = 0; segmentIndex < road.centerline.length - 1; segmentIndex += 1) {
        const r1 = road.centerline[segmentIndex]!;
        const r2 = road.centerline[segmentIndex + 1]!;
        if (segmentsIntersect(a, b, r1, r2)) return false;
      }
    }
  }
  return true;
}

function roadClearance(point: Point, roads: RoadDefinition[]) {
  let best = Number.POSITIVE_INFINITY;
  for (const road of roads) best = Math.min(best, distancePointToPolyline(point, road.centerline) - road.width / 2);
  return best;
}

function isPointOnAnyRoad(point: Point, roads: RoadDefinition[], patches: SceneDefinition['intersectionPatches']) {
  if (roads.some(road => distancePointToPolyline(point, road.centerline) <= road.width / 2)) return true;
  return patches.some(patch => point[0] >= patch.x && point[0] <= patch.x + patch.width && point[1] >= patch.y && point[1] <= patch.y + patch.height);
}

function distancePointToPolyline(point: Point, polyline: Point[]) {
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < polyline.length - 1; index += 1) best = Math.min(best, distancePointToSegment(point, polyline[index]!, polyline[index + 1]!));
  return best;
}

function distancePointToSegment(point: Point, a: Point, b: Point) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(point[0] - a[0], point[1] - a[1]);
  const t = clamp(((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSq, 0, 1);
  return Math.hypot(point[0] - (a[0] + dx * t), point[1] - (a[1] + dy * t));
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const cross = (p: Point, q: Point, r: Point) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  return ((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0));
}

function pointInPolygon(point: Point, points: Point[]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]!;
    const [xj, yj] = points[j]!;
    const intersects = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / ((yj - yi) || .0001) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function samplePointInside(bounds: ReturnType<typeof polygonBounds>, points: Point[], random: () => number) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate: Point = [bounds.minX + 12 + random() * Math.max(1, bounds.width - 24), bounds.minY + 12 + random() * Math.max(1, bounds.height - 24)];
    if (pointInPolygon(candidate, points)) return candidate;
  }
  return null;
}

function polygonBounds(points: Point[]) {
  const xs = points.map(point => point[0]);
  const ys = points.map(point => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

function polygonCentroid(points: Point[]): Point {
  const sum = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]] as Point, [0, 0] as Point);
  return [sum[0] / points.length, sum[1] / points.length];
}

function insetPolygon(points: Point[], amount: number) {
  const center = polygonCentroid(points);
  return points.map(([x, y]) => {
    const distance = Math.max(1, Math.hypot(x - center[0], y - center[1]));
    const ratio = Math.max(0, (distance - amount) / distance);
    return [center[0] + (x - center[0]) * ratio, center[1] + (y - center[1]) * ratio] as Point;
  });
}

function perpendicularUnit(a: Point, b: Point): Point {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.max(.001, Math.hypot(dx, dy));
  return [-dy / length, dx / length];
}

function offsetPoint(point: Point, normal: Point, amount: number): Point { return [point[0] + normal[0] * amount, point[1] + normal[1] * amount]; }
function addScaled(point: Point, vector: Point, amount: number): Point { return [point[0] + vector[0] * amount, point[1] + vector[1] * amount]; }
function lerpPoint(a: Point, b: Point, t: number): Point { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function color(value: string) { return Number.parseInt(value.replace('#', ''), 16); }
function hash(input: string) { let value = 0; for (let index = 0; index < input.length; index += 1) value = Math.imul(31, value) + input.charCodeAt(index) | 0; return Math.abs(value); }
function mulberry32(seed: number) { let value = seed >>> 0; return () => { value += 0x6D2B79F5; let result = value; result = Math.imul(result ^ result >>> 15, result | 1); result ^= result + Math.imul(result ^ result >>> 7, result | 61); return ((result ^ result >>> 14) >>> 0) / 4294967296; }; }
