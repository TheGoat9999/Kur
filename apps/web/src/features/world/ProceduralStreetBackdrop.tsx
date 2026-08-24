import { useEffect, useRef } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import sceneSource from './procedural-street-v2.json';

type Point = [number, number];
type RoadClass = 'arterial' | 'avenue' | 'collector' | 'local';
type MarkingKind = 'double-yellow' | 'dash-white';
type BuildingStyle = 'terracotta' | 'concrete' | 'brick' | 'stucco' | 'industrial';
type RoofType = 'flat' | 'mechanical';
type PropKind = 'lamp' | 'hydrant' | 'drain' | 'dumpster' | 'bench' | 'bollard' | 'utility' | 'planter' | 'meter' | 'trash';

interface RoadDefinition {
  id: string;
  class: RoadClass;
  width: number;
  sidewalk: number;
  lanes: number;
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
  windowColumns: number;
  balconyEvery: number;
  fireEscape: boolean;
  roofType: RoofType;
}
interface ParkingDefinition { id: string; points: Point[]; spaces: number; orientation: 'vertical' | 'horizontal'; }
interface TreeDefinition { x: number; y: number; radius: number; occludes: boolean; }
interface PropDefinition { kind: PropKind; x: number; y: number; }
interface SceneDefinition {
  id: string;
  seed: number;
  sun: { direction: Point; shadowStrength: number };
  palette: Record<string, string>;
  roads: RoadDefinition[];
  junctionHints: Point[];
  crosswalks: Array<{ center: Point; length: number; span: number; angle: number; stripes: number }>;
  lots: LotDefinition[];
  buildings: BuildingDefinition[];
  parking: ParkingDefinition[];
  trees: TreeDefinition[];
  props: PropDefinition[];
}

const source = sceneSource as unknown as {
  version: number;
  canvas: { width: number; height: number };
  scene: SceneDefinition;
};

type PixiLayer = 'background' | 'foreground';

export function ProceduralStreetBackdrop({ alerted }: { alerted: boolean }) {
  const hostRef = useStreetPixiLayer('background', alerted);
  return <div ref={hostRef} className="street-backdrop street-backdrop-pixi" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true" />;
}

export function ProceduralStreetForeground() {
  const hostRef = useStreetPixiLayer('foreground', false);
  return <div ref={hostRef} className="street-backdrop street-backdrop-pixi-foreground" style={{ position: 'absolute', inset: 0, zIndex: 18, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true" />;
}

function useStreetPixiLayer(layer: PixiLayer, alerted: boolean) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let initialized = false;
    const app = new Application();

    async function start() {
      try {
        await app.init({
          width: source.canvas.width,
          height: source.canvas.height,
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          background: layer === 'foreground' ? '#000000' : '#202522',
          backgroundAlpha: layer === 'foreground' ? 0 : 1
        });
        initialized = true;
        if (disposed) { app.destroy(true); return; }
        const canvas = app.canvas as HTMLCanvasElement;
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.objectFit = 'cover';
        canvas.setAttribute('aria-hidden', 'true');
        host.replaceChildren(canvas);
        if (layer === 'background') renderBackground(app.stage, source.scene, alerted, source.canvas.width, source.canvas.height);
        else renderForeground(app.stage, source.scene);
      } catch (error) {
        console.error(`[street-v3] failed to initialize ${layer} renderer`, error);
        if (!disposed) host.dataset.streetRendererError = 'true';
      }
    }

    void start();
    return () => {
      disposed = true;
      host.replaceChildren();
      if (initialized) app.destroy(true);
    };
  }, [layer, alerted]);

  return hostRef;
}

function renderBackground(stage: Container, scene: SceneDefinition, alerted: boolean, width: number, height: number) {
  stage.removeChildren();
  const palette = paletteNumbers(scene.palette);
  const random = mulberry32(scene.seed);
  const junctions = collectJunctions(scene);

  drawGround(stage, scene, palette, width, height, random);
  drawLots(stage, scene.lots, palette, random);
  drawSidewalkNetwork(stage, scene, palette, junctions);
  drawParking(stage, scene, palette);
  drawRoadNetwork(stage, scene, palette, width, height, random, junctions);
  drawBuildings(stage, scene, palette, alerted);
  drawStreetLife(stage, scene, palette, false);
  drawAtmosphere(stage, width, height);
}

function renderForeground(stage: Container, scene: SceneDefinition) {
  stage.removeChildren();
  const palette = paletteNumbers(scene.palette);
  drawForegroundAwnings(stage, scene, palette);
  drawStreetLife(stage, scene, palette, true);
}

function drawGround(stage: Container, scene: SceneDefinition, palette: Record<string, number>, width: number, height: number, random: () => number) {
  const base = new Graphics();
  base.rect(0, 0, width, height).fill({ color: palette.concrete });
  stage.addChild(base);

  const material = new Graphics();
  for (let index = 0; index < 1500; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const light = random() > .58;
    material.circle(x, y, .22 + random() * .68).fill({ color: light ? palette.concreteLight : palette.concreteDark, alpha: .025 + random() * .05 });
  }
  for (let x = 24; x < width; x += 92) material.moveTo(x, 0).lineTo(x - 13, height).stroke({ width: .75, color: palette.concreteDark, alpha: .055 });
  stage.addChild(material);
}

function drawLots(stage: Container, lots: LotDefinition[], palette: Record<string, number>, random: () => number) {
  const tones = { warm: 0x5d5b54, cool: 0x555f5e, neutral: 0x595a54 } as const;
  for (const lot of lots) {
    const g = new Graphics();
    polygon(g, lot.points).fill({ color: tones[lot.tone], alpha: .68 }).stroke({ width: 1, color: palette.concreteLight, alpha: .14 });
    const bounds = polygonBounds(lot.points);
    for (let y = bounds.minY + 22; y < bounds.maxY; y += 42) {
      g.moveTo(bounds.minX + 8, y).lineTo(bounds.maxX - 8, y - 3).stroke({ width: .7, color: palette.concreteDark, alpha: .09 });
    }
    for (let index = 0; index < 18; index += 1) {
      const point = samplePointInside(bounds, lot.points, random);
      if (!point) continue;
      g.ellipse(point[0], point[1], 5 + random() * 18, 1.5 + random() * 5).fill({ color: palette.concreteDark, alpha: .018 + random() * .035 });
    }
    stage.addChild(g);
  }
}

function drawSidewalkNetwork(stage: Container, scene: SceneDefinition, palette: Record<string, number>, junctions: Point[]) {
  const sidewalk = new Graphics();
  for (const road of scene.roads) drawPolyline(sidewalk, road.centerline, road.width + road.sidewalk * 2 + 10, palette.sidewalk, 1);
  for (const point of junctions) {
    const nearby = roadsAtPoint(point, scene.roads);
    const radius = Math.max(30, ...nearby.map(road => road.width * .37 + road.sidewalk));
    sidewalk.circle(point[0], point[1], radius).fill({ color: palette.sidewalk });
  }
  stage.addChild(sidewalk);

  const joints = new Graphics();
  for (const road of scene.roads) {
    forEachRoadSegment(road, (a, b) => {
      const length = distance(a, b);
      const direction = unitVector(a, b);
      const normal: Point = [-direction[1], direction[0]];
      for (let cursor = 18; cursor < length - 10; cursor += 34) {
        const center = addScaled(a, direction, cursor);
        for (const side of [-1, 1]) {
          const inner = addScaled(center, normal, side * (road.width / 2 + 5));
          const outer = addScaled(center, normal, side * (road.width / 2 + road.sidewalk + 3));
          drawLine(joints, inner, outer, .75, palette.sidewalkDark, .18);
        }
      }
    });
  }
  stage.addChild(joints);
}

function drawParking(stage: Container, scene: SceneDefinition, palette: Record<string, number>) {
  for (const parking of scene.parking) {
    if (!polygonClearOfRoads(parking.points, scene.roads, 5) || scene.buildings.some(building => polygonIntersectsPolygon(parking.points, building.footprint))) {
      console.warn(`[street-v3] skipped parking ${parking.id}: invalid overlap`);
      continue;
    }
    const g = new Graphics();
    polygon(g, parking.points).fill({ color: palette.asphaltLight, alpha: .92 }).stroke({ width: 2, color: palette.curbDark, alpha: .62 });
    const bounds = polygonBounds(parking.points);
    const gap = (parking.orientation === 'vertical' ? bounds.width : bounds.height) / parking.spaces;
    for (let index = 1; index < parking.spaces; index += 1) {
      if (parking.orientation === 'vertical') {
        const x = bounds.minX + gap * index;
        drawLine(g, [x, bounds.minY + 7], [x, bounds.maxY - 7], 1.2, palette.laneWhite, .34);
      } else {
        const y = bounds.minY + gap * index;
        drawLine(g, [bounds.minX + 7, y], [bounds.maxX - 7, y], 1.2, palette.laneWhite, .34);
      }
    }
    for (let index = 0; index < parking.spaces; index += 1) {
      const t = (index + .5) / parking.spaces;
      const x = bounds.minX + bounds.width * t;
      g.ellipse(x, bounds.maxY - 15, 9, 2.4).fill({ color: palette.asphaltDark, alpha: .14 });
      g.rect(x - 5, bounds.maxY - 10, 10, 2.5).fill({ color: palette.curbDark, alpha: .8 });
    }
    stage.addChild(g);
  }
}

function drawRoadNetwork(stage: Container, scene: SceneDefinition, palette: Record<string, number>, width: number, height: number, random: () => number, junctions: Point[]) {
  const curbShadow = new Graphics();
  for (const road of scene.roads) drawPolyline(curbShadow, road.centerline, road.width + 9, palette.curbDark, .92);
  stage.addChild(curbShadow);

  const curb = new Graphics();
  for (const road of scene.roads) drawPolyline(curb, road.centerline, road.width + 5, palette.curb, .82);
  stage.addChild(curb);

  const asphalt = new Graphics();
  for (const road of scene.roads) {
    drawPolyline(asphalt, road.centerline, road.width, palette.asphalt, 1);
    drawPolyline(asphalt, road.centerline, Math.max(8, road.width - 10), palette.asphaltLight, .045);
  }
  for (const point of junctions) {
    const nearby = roadsAtPoint(point, scene.roads);
    const radius = Math.max(26, ...nearby.map(road => road.width * .4));
    asphalt.circle(point[0], point[1], radius).fill({ color: palette.asphalt });
  }
  stage.addChild(asphalt);

  drawAsphaltMaterial(stage, scene, palette, width, height, random, junctions);

  const markings = new Graphics();
  for (const road of scene.roads) for (const marking of road.markings) drawRoadMarking(markings, marking, palette);
  for (const crosswalk of scene.crosswalks) drawCrosswalk(markings, crosswalk, palette.laneWhite);
  stage.addChild(markings);
}

function drawAsphaltMaterial(stage: Container, scene: SceneDefinition, palette: Record<string, number>, width: number, height: number, random: () => number, junctions: Point[]) {
  const material = new Graphics();
  for (let index = 0; index < 1900; index += 1) {
    const point: Point = [random() * width, random() * height];
    if (!isPointOnRoad(point, scene.roads, junctions)) continue;
    material.circle(point[0], point[1], .18 + random() * .65).fill({ color: random() > .67 ? palette.asphaltLight : palette.asphaltDark, alpha: .035 + random() * .055 });
  }

  for (const road of scene.roads) {
    forEachRoadSegment(road, (a, b) => {
      const direction = unitVector(a, b);
      const normal: Point = [-direction[1], direction[0]];
      const length = distance(a, b);
      for (let index = 0; index < Math.max(6, Math.floor(length / 130)); index += 1) {
        const cursor = random() * length;
        const ribbonLength = 28 + random() * Math.min(120, length * .28);
        const offset = (random() - .5) * road.width * .68;
        const center = addScaled(addScaled(a, direction, cursor), normal, offset);
        const from = addScaled(center, direction, -ribbonLength / 2);
        const to = addScaled(center, direction, ribbonLength / 2);
        drawLine(material, from, to, 1 + random() * 3.5, random() > .5 ? palette.asphaltDark : palette.asphaltLight, .025 + random() * .055);
      }

      for (const side of [-1, 1]) {
        const edgeA = addScaled(a, normal, side * (road.width / 2 - 2));
        const edgeB = addScaled(b, normal, side * (road.width / 2 - 2));
        drawLine(material, edgeA, edgeB, 2.2, palette.asphaltDark, .22);
      }

      const patchCount = Math.max(1, Math.floor(length / 260));
      for (let index = 0; index < patchCount; index += 1) {
        const center = addScaled(addScaled(a, direction, (.18 + random() * .64) * length), normal, (random() - .5) * road.width * .45);
        const patchLength = 18 + random() * 42;
        const patchWidth = 6 + random() * 14;
        const p1 = addScaled(addScaled(center, direction, -patchLength / 2), normal, -patchWidth / 2);
        const p2 = addScaled(addScaled(center, direction, patchLength / 2), normal, -patchWidth / 2);
        const p3 = addScaled(addScaled(center, direction, patchLength / 2), normal, patchWidth / 2);
        const p4 = addScaled(addScaled(center, direction, -patchLength / 2), normal, patchWidth / 2);
        polygon(material, [p1, p2, p3, p4]).fill({ color: palette.patch, alpha: .16 }).stroke({ width: .7, color: palette.asphaltDark, alpha: .22 });
      }
    });
  }

  for (let index = 0; index < 54; index += 1) {
    const point: Point = [random() * width, random() * height];
    if (!isPointOnRoad(point, scene.roads, junctions)) continue;
    const angle = random() * Math.PI * 2;
    const first: Point = [point[0] + Math.cos(angle) * (5 + random() * 10), point[1] + Math.sin(angle) * (5 + random() * 10)];
    const second: Point = [first[0] + Math.cos(angle + (random() - .5) * .7) * (4 + random() * 10), first[1] + Math.sin(angle + (random() - .5) * .7) * (4 + random() * 10)];
    material.moveTo(point[0], point[1]).lineTo(first[0], first[1]).lineTo(second[0], second[1]).stroke({ width: .55 + random() * .45, color: palette.asphaltDark, alpha: .18 + random() * .12 });
  }

  for (let index = 0; index < 14; index += 1) {
    const point: Point = [random() * width, random() * height];
    if (!isPointOnRoad(point, scene.roads, junctions)) continue;
    material.ellipse(point[0], point[1], 5 + random() * 15, 2 + random() * 5).fill({ color: palette.asphaltDark, alpha: .04 + random() * .06 });
  }

  stage.addChild(material);
  drawRoadHardware(stage, scene, palette);
}

function drawRoadHardware(stage: Container, scene: SceneDefinition, palette: Record<string, number>) {
  const g = new Graphics();
  scene.roads.forEach((road, roadIndex) => {
    if (road.centerline.length < 2) return;
    const a = road.centerline[0]!;
    const b = road.centerline[road.centerline.length - 1]!;
    const direction = unitVector(a, b);
    const normal: Point = [-direction[1], direction[0]];
    for (const t of [0.24, 0.71]) {
      const center = addScaled(addScaled(a, direction, distance(a, b) * t), normal, (roadIndex % 2 ? 1 : -1) * road.width * .22);
      g.circle(center[0], center[1], 5.5).fill({ color: palette.asphaltDark, alpha: .84 }).stroke({ width: 1.1, color: palette.metal, alpha: .72 });
      g.circle(center[0], center[1], 3.1).stroke({ width: .7, color: palette.metal, alpha: .42 });
      drawLine(g, [center[0] - 3.5, center[1]], [center[0] + 3.5, center[1]], .55, palette.metal, .5);
    }
  });
  stage.addChild(g);
}

function drawRoadMarking(g: Graphics, marking: RoadDefinition['markings'][number], palette: Record<string, number>) {
  if (marking.kind === 'double-yellow') {
    const normal = perpendicularUnit(marking.from, marking.to);
    drawLine(g, offsetPoint(marking.from, normal, -2.1), offsetPoint(marking.to, normal, -2.1), 1.25, palette.laneYellow, .62);
    drawLine(g, offsetPoint(marking.from, normal, 2.1), offsetPoint(marking.to, normal, 2.1), 1.25, palette.laneYellow, .62);
    return;
  }
  drawDashedLine(g, marking.from, marking.to, 13, 14, 1.45, palette.laneWhite, .42);
}

function drawCrosswalk(g: Graphics, definition: SceneDefinition['crosswalks'][number], colorValue: number) {
  const [cx, cy] = definition.center;
  const angle = definition.angle * Math.PI / 180;
  const along: Point = [Math.cos(angle), Math.sin(angle)];
  const across: Point = [-along[1], along[0]];
  const stripeWidth = definition.length / Math.max(1, definition.stripes * 2);
  const step = definition.length / definition.stripes;
  for (let index = 0; index < definition.stripes; index += 1) {
    const offset = -definition.length / 2 + step * (index + .5);
    const center: Point = [cx + along[0] * offset, cy + along[1] * offset];
    const p1 = addScaled(addScaled(center, along, -stripeWidth / 2), across, -definition.span / 2);
    const p2 = addScaled(addScaled(center, along, stripeWidth / 2), across, -definition.span / 2);
    const p3 = addScaled(addScaled(center, along, stripeWidth / 2), across, definition.span / 2);
    const p4 = addScaled(addScaled(center, along, -stripeWidth / 2), across, definition.span / 2);
    polygon(g, [p1, p2, p3, p4]).fill({ color: colorValue, alpha: index % 3 === 1 ? .48 : .58 });
  }
}

function drawBuildings(stage: Container, scene: SceneDefinition, palette: Record<string, number>, alerted: boolean) {
  const lotById = new Map(scene.lots.map(lot => [lot.id, lot]));
  const accepted: BuildingDefinition[] = [];
  for (const building of scene.buildings) {
    const lot = lotById.get(building.lot);
    if (!lot || !building.footprint.every(point => pointInPolygon(point, lot.points))) {
      console.warn(`[street-v3] skipped building ${building.id}: outside lot ${building.lot}`);
      continue;
    }
    if (!polygonClearOfRoads(building.footprint, scene.roads, 5) || accepted.some(other => polygonIntersectsPolygon(building.footprint, other.footprint))) {
      console.warn(`[street-v3] skipped building ${building.id}: invalid overlap`);
      continue;
    }
    accepted.push(building);
    drawBuilding(stage, building, palette, alerted && building.id === 'corner_store', scene);
  }
}

function drawBuilding(stage: Container, building: BuildingDefinition, palette: Record<string, number>, alerted: boolean, scene: SceneDefinition) {
  const style = buildingStyle(building.style, alerted);
  const height = 8 + building.floors * 5.8;
  const roofShift: Point = [-height * .38, -height];
  const roofFootprint = building.footprint.map(point => addPoint(point, roofShift));

  drawBuildingShadow(stage, building.footprint, height, scene, palette);

  const walls = new Graphics();
  const centroid = polygonCentroid(building.footprint);
  for (let edgeIndex = 0; edgeIndex < building.footprint.length; edgeIndex += 1) {
    const baseA = building.footprint[edgeIndex]!;
    const baseB = building.footprint[(edgeIndex + 1) % building.footprint.length]!;
    const roofA = roofFootprint[edgeIndex]!;
    const roofB = roofFootprint[(edgeIndex + 1) % roofFootprint.length]!;
    const midpoint: Point = [(baseA[0] + baseB[0]) / 2, (baseA[1] + baseB[1]) / 2];
    if (midpoint[1] < centroid[1] - 2 && midpoint[0] < centroid[0] - 2) continue;
    const faceColor = midpoint[1] >= centroid[1] ? style.wallFront : style.wallSide;
    polygon(walls, [roofA, roofB, baseB, baseA]).fill({ color: faceColor });
    drawWallGrammar(walls, building, edgeIndex, roofA, roofB, baseA, baseB, style, palette);
  }
  stage.addChild(walls);

  const roof = new Graphics();
  polygon(roof, roofFootprint).fill({ color: style.roof }).stroke({ width: 1.5, color: style.trim, alpha: .54 });
  const parapet = insetPolygon(roofFootprint, 5.5);
  polygon(roof, parapet).stroke({ width: 2.2, color: style.trim, alpha: .22 });
  drawRoofMaterial(roof, building, roofFootprint, parapet, style, palette, scene.seed);
  stage.addChild(roof);
}

function drawBuildingShadow(stage: Container, footprint: Point[], height: number, scene: SceneDefinition, palette: Record<string, number>) {
  const shadow = new Graphics();
  const direction = scene.sun.direction;
  for (let layer = 3; layer >= 1; layer -= 1) {
    const multiplier = height * (1 + layer * .18);
    const shifted = footprint.map(point => [point[0] + direction[0] * multiplier, point[1] + direction[1] * multiplier] as Point);
    polygon(shadow, shifted).fill({ color: palette.shadow, alpha: scene.sun.shadowStrength * (.1 + layer * .055) });
  }
  stage.addChild(shadow);
}

function drawWallGrammar(g: Graphics, building: BuildingDefinition, edgeIndex: number, roofA: Point, roofB: Point, baseA: Point, baseB: Point, style: ReturnType<typeof buildingStyle>, palette: Record<string, number>) {
  const length = distance(baseA, baseB);
  if (length < 24) return;
  const isFrontage = edgeIndex === Math.min(building.frontageEdge, building.footprint.length - 1);
  const columns = Math.max(2, Math.min(building.windowColumns, Math.floor(length / 22)));

  for (let floor = 1; floor < building.floors; floor += 1) {
    const t = floor / building.floors;
    const a = lerpPoint(roofA, baseA, t);
    const b = lerpPoint(roofB, baseB, t);
    drawLine(g, a, b, .8, style.trim, .18);
  }

  for (let floor = 0; floor < building.floors; floor += 1) {
    const floorTop = (floor + .18) / building.floors;
    const floorBottom = (floor + .76) / building.floors;
    const groundFloor = floor === building.floors - 1;
    const modules = groundFloor && isFrontage && building.storefronts > 0 ? building.storefronts : columns;
    for (let column = 0; column < modules; column += 1) {
      const left = (column + .16) / modules;
      const right = (column + .84) / modules;
      const topLeft = lerpPoint(lerpPoint(roofA, baseA, floorTop), lerpPoint(roofB, baseB, floorTop), left);
      const topRight = lerpPoint(lerpPoint(roofA, baseA, floorTop), lerpPoint(roofB, baseB, floorTop), right);
      const bottomRight = lerpPoint(lerpPoint(roofA, baseA, floorBottom), lerpPoint(roofB, baseB, floorBottom), right);
      const bottomLeft = lerpPoint(lerpPoint(roofA, baseA, floorBottom), lerpPoint(roofB, baseB, floorBottom), left);
      const storefront = groundFloor && isFrontage && building.storefronts > 0;
      polygon(g, [topLeft, topRight, bottomRight, bottomLeft]).fill({ color: storefront ? palette.glass : style.window, alpha: storefront ? .88 : .68 }).stroke({ width: .65, color: storefront ? palette.glassLight : style.trim, alpha: .36 });
      if (storefront) {
        const mullionTop = lerpPoint(topLeft, topRight, .5);
        const mullionBottom = lerpPoint(bottomLeft, bottomRight, .5);
        drawLine(g, mullionTop, mullionBottom, .6, style.trim, .45);
      }
      if (!groundFloor && building.balconyEvery > 0 && (column + 1) % building.balconyEvery === 0) {
        const balconyA = addScaled(bottomLeft, unitVector(bottomLeft, bottomRight), -.03 * length);
        const balconyB = addScaled(bottomRight, unitVector(bottomLeft, bottomRight), .03 * length);
        drawLine(g, balconyA, balconyB, 2.1, palette.metal, .72);
        drawLine(g, [balconyA[0], balconyA[1] + 2], [balconyB[0], balconyB[1] + 2], .7, style.trim, .46);
      }
    }
  }

  if (isFrontage) {
    const doorTop = lerpPoint(lerpPoint(roofA, baseA, .78), lerpPoint(roofB, baseB, .78), .5);
    const doorBottom = lerpPoint(baseA, baseB, .5);
    drawLine(g, doorTop, doorBottom, 6.5, palette.asphaltDark, .78);
    drawLine(g, doorTop, doorBottom, 4.6, style.window, .78);
  }

  if (building.fireEscape && !isFrontage) {
    const ladderTop = lerpPoint(roofA, roofB, .78);
    const ladderBottom = lerpPoint(baseA, baseB, .78);
    drawLine(g, ladderTop, ladderBottom, 1.4, palette.metal, .72);
    for (let t = .15; t < .9; t += .12) {
      const center = lerpPoint(ladderTop, ladderBottom, t);
      const direction = perpendicularUnit(ladderTop, ladderBottom);
      drawLine(g, addScaled(center, direction, -4), addScaled(center, direction, 4), .7, palette.metal, .62);
    }
  }

  if (building.style === 'brick') {
    for (let t = .12; t < .9; t += .09) {
      drawLine(g, lerpPoint(roofA, baseA, t), lerpPoint(roofB, baseB, t), .45, style.weatherDark, .12);
    }
  }
}

function drawRoofMaterial(g: Graphics, building: BuildingDefinition, roof: Point[], inset: Point[], style: ReturnType<typeof buildingStyle>, palette: Record<string, number>, seed: number) {
  const random = mulberry32(seed + hash(building.id));
  const bounds = polygonBounds(roof);
  for (let index = 0; index < 28; index += 1) {
    const point = samplePointInside(bounds, roof, random);
    if (!point) continue;
    g.ellipse(point[0], point[1], 2 + random() * 10, 1 + random() * 3).fill({ color: random() > .55 ? style.weatherDark : style.weatherLight, alpha: .025 + random() * .055 });
  }

  for (let index = 0; index < building.roofUnits + (building.roofType === 'mechanical' ? 2 : 0); index += 1) {
    const point = samplePointInside(bounds, inset, random);
    if (!point) continue;
    const unitWidth = 11 + random() * 17;
    const unitHeight = 7 + random() * 11;
    g.rect(point[0] - unitWidth / 2 + 2.5, point[1] - unitHeight / 2 + 3, unitWidth, unitHeight).fill({ color: palette.shadow, alpha: .22 });
    g.rect(point[0] - unitWidth / 2, point[1] - unitHeight / 2, unitWidth, unitHeight).fill({ color: palette.metal }).stroke({ width: .7, color: style.trim, alpha: .42 });
    g.circle(point[0], point[1], Math.min(unitWidth, unitHeight) * .23).stroke({ width: .9, color: palette.asphaltDark, alpha: .72 });
  }

  for (let index = 0; index < Math.max(2, Math.floor(building.floors / 2)); index += 1) {
    const point = samplePointInside(bounds, inset, random);
    if (!point) continue;
    g.circle(point[0], point[1], 1.8 + random() * 2.2).fill({ color: palette.metal }).stroke({ width: .5, color: palette.asphaltDark, alpha: .5 });
  }

  if (building.roofType === 'mechanical') {
    const a = samplePointInside(bounds, inset, random);
    const b = samplePointInside(bounds, inset, random);
    if (a && b) {
      g.moveTo(a[0], a[1]).lineTo(b[0], b[1]).stroke({ width: 1.4, color: palette.metal, alpha: .58 });
      g.circle(a[0], a[1], 2.1).fill({ color: palette.metal });
      g.circle(b[0], b[1], 2.1).fill({ color: palette.metal });
    }
  }
}

function drawForegroundAwnings(stage: Container, scene: SceneDefinition, palette: Record<string, number>) {
  const g = new Graphics();
  for (const building of scene.buildings) {
    if (!building.awning) continue;
    const height = 8 + building.floors * 5.8;
    const roofShift: Point = [-height * .38, -height];
    const edgeIndex = Math.min(building.frontageEdge, building.footprint.length - 1);
    const baseA = building.footprint[edgeIndex]!;
    const baseB = building.footprint[(edgeIndex + 1) % building.footprint.length]!;
    const roofA = addPoint(baseA, roofShift);
    const roofB = addPoint(baseB, roofShift);
    const a = lerpPoint(roofA, baseA, .76);
    const b = lerpPoint(roofB, baseB, .76);
    const style = buildingStyle(building.style, false);
    drawLine(g, [a[0] + 2, a[1] + 4], [b[0] + 2, b[1] + 4], 6.5, palette.shadow, .18);
    drawLine(g, a, b, 5.3, style.awning, .96);
    drawLine(g, [a[0], a[1] - 1.5], [b[0], b[1] - 1.5], 1, style.trim, .48);
  }
  stage.addChild(g);
}

function drawStreetLife(stage: Container, scene: SceneDefinition, palette: Record<string, number>, foregroundOnly: boolean) {
  for (const tree of scene.trees) {
    if (foregroundOnly !== tree.occludes) continue;
    if (roadClearance([tree.x, tree.y], scene.roads) < tree.radius + 3 || scene.buildings.some(building => pointInPolygon([tree.x, tree.y], building.footprint))) {
      console.warn(`[street-v3] skipped tree at ${tree.x},${tree.y}: invalid placement`);
      continue;
    }
    if (foregroundOnly) drawTreeCrown(stage, tree, palette, scene.seed);
    else drawTree(stage, tree, palette, scene.seed);
  }

  if (foregroundOnly) return;
  for (const prop of scene.props) {
    if (scene.buildings.some(building => pointInPolygon([prop.x, prop.y], building.footprint))) continue;
    const clearance = roadClearance([prop.x, prop.y], scene.roads);
    if (prop.kind !== 'drain' && clearance < 1) continue;
    drawProp(stage, prop, palette);
  }
}

function drawTree(stage: Container, tree: TreeDefinition, palette: Record<string, number>, seed: number) {
  const g = new Graphics();
  g.ellipse(tree.x + 9, tree.y + 10, tree.radius * 1.15, tree.radius * .43).fill({ color: palette.shadow, alpha: .27 });
  g.rect(tree.x - 1.7, tree.y - 1, 3.4, tree.radius * .92).fill({ color: 0x584533, alpha: .96 });
  stage.addChild(g);
  if (!tree.occludes) drawTreeCrown(stage, tree, palette, seed);
  else {
    const low = new Graphics();
    low.circle(tree.x, tree.y - tree.radius * .15, tree.radius * .55).fill({ color: palette.foliageDark, alpha: .78 });
    stage.addChild(low);
  }
}

function drawTreeCrown(stage: Container, tree: TreeDefinition, palette: Record<string, number>, seed: number) {
  const g = new Graphics();
  const random = mulberry32(seed + Math.round(tree.x * 17 + tree.y * 29));
  const clusters = 8;
  for (let index = 0; index < clusters; index += 1) {
    const angle = (index / clusters) * Math.PI * 2 + random() * .35;
    const distanceFromCenter = tree.radius * (.18 + random() * .4);
    const radius = tree.radius * (.38 + random() * .25);
    const x = tree.x + Math.cos(angle) * distanceFromCenter;
    const y = tree.y - tree.radius * .38 + Math.sin(angle) * distanceFromCenter * .65;
    const tone = index % 3 === 0 ? palette.foliageLight : index % 2 === 0 ? palette.foliageDark : palette.foliage;
    g.circle(x, y, radius).fill({ color: tone, alpha: .88 + random() * .1 });
  }
  g.circle(tree.x - tree.radius * .2, tree.y - tree.radius * .7, tree.radius * .24).fill({ color: palette.foliageLight, alpha: .6 });
  stage.addChild(g);
}

function drawProp(stage: Container, prop: PropDefinition, palette: Record<string, number>) {
  const g = new Graphics();
  if (prop.kind === 'lamp') {
    g.ellipse(prop.x + 4, prop.y + 8, 7, 2.4).fill({ color: palette.shadow, alpha: .24 });
    g.moveTo(prop.x, prop.y + 8).lineTo(prop.x, prop.y - 19).stroke({ width: 2.6, color: palette.metal, alpha: .95 });
    g.moveTo(prop.x, prop.y - 18).lineTo(prop.x + 6, prop.y - 21).stroke({ width: 2, color: palette.metal, alpha: .92 });
    g.circle(prop.x + 7, prop.y - 22, 3.4).fill({ color: 0x6b7475 }).circle(prop.x + 6.5, prop.y - 22.5, 1.2).fill({ color: 0xd7c894, alpha: .75 });
  } else if (prop.kind === 'hydrant') {
    g.ellipse(prop.x + 2, prop.y + 4, 5, 2).fill({ color: palette.shadow, alpha: .24 });
    g.rect(prop.x - 3.5, prop.y - 7, 7, 11).fill({ color: 0x9b4b3e });
    g.rect(prop.x - 5, prop.y - 4, 10, 3).fill({ color: 0xb55d4c });
    g.circle(prop.x, prop.y - 7, 3.5).fill({ color: 0xa95243 });
  } else if (prop.kind === 'drain') {
    g.rect(prop.x - 7, prop.y - 2.5, 14, 5).fill({ color: palette.asphaltDark }).stroke({ width: .7, color: palette.metal, alpha: .7 });
    for (let i = -4; i <= 4; i += 4) drawLine(g, [prop.x + i, prop.y - 2], [prop.x + i, prop.y + 2], .6, palette.metal, .8);
  } else if (prop.kind === 'dumpster') {
    g.ellipse(prop.x + 5, prop.y + 8, 12, 4).fill({ color: palette.shadow, alpha: .25 });
    g.rect(prop.x - 10, prop.y - 8, 21, 15).fill({ color: 0x3b5548 }).stroke({ width: 1, color: 0x263a31, alpha: .85 });
    g.moveTo(prop.x - 9, prop.y - 5).lineTo(prop.x + 10, prop.y - 5).stroke({ width: 1.4, color: 0x718174, alpha: .62 });
  } else if (prop.kind === 'bench') {
    g.ellipse(prop.x + 4, prop.y + 5, 12, 3).fill({ color: palette.shadow, alpha: .2 });
    g.rect(prop.x - 10, prop.y - 3, 20, 4).fill({ color: 0x6c5841 });
    g.rect(prop.x - 10, prop.y - 9, 20, 3).fill({ color: 0x766047 });
    drawLine(g, [prop.x - 7, prop.y], [prop.x - 7, prop.y + 6], 1.6, palette.metal, .8);
    drawLine(g, [prop.x + 7, prop.y], [prop.x + 7, prop.y + 6], 1.6, palette.metal, .8);
  } else if (prop.kind === 'bollard') {
    g.ellipse(prop.x + 1, prop.y + 4, 3, 1.2).fill({ color: palette.shadow, alpha: .22 });
    g.rect(prop.x - 1.7, prop.y - 6, 3.4, 10).fill({ color: palette.metal }).stroke({ width: .5, color: palette.asphaltDark, alpha: .5 });
  } else if (prop.kind === 'utility') {
    g.ellipse(prop.x + 4, prop.y + 8, 9, 3).fill({ color: palette.shadow, alpha: .2 });
    g.rect(prop.x - 7, prop.y - 11, 14, 20).fill({ color: 0x4e5b55 }).stroke({ width: .8, color: palette.metal, alpha: .7 });
    g.rect(prop.x - 4, prop.y - 7, 8, 2).fill({ color: 0x758079, alpha: .5 });
  } else if (prop.kind === 'planter') {
    g.ellipse(prop.x + 3, prop.y + 6, 10, 3).fill({ color: palette.shadow, alpha: .18 });
    g.rect(prop.x - 8, prop.y - 1, 16, 8).fill({ color: 0x63564a }).stroke({ width: .7, color: 0x8c7967, alpha: .55 });
    g.circle(prop.x - 4, prop.y - 5, 5).fill({ color: palette.foliage });
    g.circle(prop.x + 3, prop.y - 6, 6).fill({ color: palette.foliageLight, alpha: .88 });
  } else if (prop.kind === 'meter') {
    g.moveTo(prop.x, prop.y + 5).lineTo(prop.x, prop.y - 7).stroke({ width: 1.5, color: palette.metal, alpha: .85 });
    g.roundRect(prop.x - 2.5, prop.y - 10, 5, 5, 1).fill({ color: 0x647074 }).stroke({ width: .5, color: palette.asphaltDark, alpha: .6 });
  } else {
    g.ellipse(prop.x + 2, prop.y + 5, 5, 2).fill({ color: palette.shadow, alpha: .18 });
    g.rect(prop.x - 4, prop.y - 5, 8, 10).fill({ color: 0x3f5550 }).stroke({ width: .7, color: 0x283a37, alpha: .8 });
  }
  stage.addChild(g);
}

function drawAtmosphere(stage: Container, width: number, height: number) {
  const g = new Graphics();
  g.rect(0, 0, width, height * .17).fill({ color: 0xf0d3a4, alpha: .027 });
  g.rect(0, height * .76, width, height * .24).fill({ color: 0x071012, alpha: .075 });
  stage.addChild(g);
}

function buildingStyle(style: BuildingStyle, alerted: boolean) {
  if (alerted) return { roof: 0x705149, wallFront: 0x5a3e36, wallSide: 0x3f312d, trim: 0xba8e79, window: 0x31545b, awning: 0x71473d, weatherLight: 0xb89578, weatherDark: 0x30251f };
  const styles = {
    terracotta: { roof: 0x776252, wallFront: 0x655044, wallSide: 0x493b35, trim: 0xb6a083, window: 0x31535b, awning: 0x74533f, weatherLight: 0xb9a48c, weatherDark: 0x382d27 },
    concrete: { roof: 0x596567, wallFront: 0x4a5a5b, wallSide: 0x344447, trim: 0x929f9a, window: 0x315961, awning: 0x465d61, weatherLight: 0xa0aaa4, weatherDark: 0x2d393b },
    brick: { roof: 0x77564b, wallFront: 0x68473d, wallSide: 0x4b3732, trim: 0xa98873, window: 0x32555d, awning: 0x67483c, weatherLight: 0xb3917d, weatherDark: 0x342720 },
    stucco: { roof: 0x786c5d, wallFront: 0x6d6255, wallSide: 0x524a41, trim: 0xb8a990, window: 0x34585e, awning: 0x7d5e45, weatherLight: 0xc0b49c, weatherDark: 0x3d362f },
    industrial: { roof: 0x555b58, wallFront: 0x454d49, wallSide: 0x303936, trim: 0x8a9088, window: 0x324c50, awning: 0x4f5753, weatherLight: 0x989d93, weatherDark: 0x2b302e }
  } as const;
  return styles[style];
}

function collectJunctions(scene: SceneDefinition) {
  const points: Point[] = scene.junctionHints.map(point => [...point] as Point);
  for (let roadIndex = 0; roadIndex < scene.roads.length; roadIndex += 1) {
    const road = scene.roads[roadIndex]!;
    for (let otherIndex = roadIndex + 1; otherIndex < scene.roads.length; otherIndex += 1) {
      const other = scene.roads[otherIndex]!;
      forEachSegmentPair(road.centerline, other.centerline, (a, b, c, d) => {
        const point = segmentIntersectionPoint(a, b, c, d);
        if (point) points.push(point);
      });
    }
  }
  return dedupePoints(points, 10);
}

function roadsAtPoint(point: Point, roads: RoadDefinition[]) {
  return roads.filter(road => distancePointToPolyline(point, road.centerline) <= road.width / 2 + road.sidewalk + 14);
}

function isPointOnRoad(point: Point, roads: RoadDefinition[], junctions: Point[]) {
  if (roads.some(road => distancePointToPolyline(point, road.centerline) <= road.width / 2)) return true;
  return junctions.some(junction => {
    const nearby = roadsAtPoint(junction, roads);
    const radius = Math.max(26, ...nearby.map(road => road.width * .4));
    return distance(point, junction) <= radius;
  });
}

function polygonClearOfRoads(points: Point[], roads: RoadDefinition[], clearance: number) {
  for (const road of roads) {
    const required = road.width / 2 + clearance;
    for (const point of points) if (distancePointToPolyline(point, road.centerline) < required) return false;
    for (let edgeIndex = 0; edgeIndex < points.length; edgeIndex += 1) {
      const a = points[edgeIndex]!;
      const b = points[(edgeIndex + 1) % points.length]!;
      forEachRoadSegment(road, (r1, r2) => { if (segmentsIntersect(a, b, r1, r2)) throw overlapSignal; });
    }
  }
  return true;
}

const overlapSignal = new Error('overlap');

function roadClearance(point: Point, roads: RoadDefinition[]) {
  let best = Number.POSITIVE_INFINITY;
  for (const road of roads) best = Math.min(best, distancePointToPolyline(point, road.centerline) - road.width / 2);
  return best;
}

function polygonIntersectsPolygon(a: Point[], b: Point[]) {
  if (a.some(point => pointInPolygon(point, b)) || b.some(point => pointInPolygon(point, a))) return true;
  for (let ai = 0; ai < a.length; ai += 1) {
    const a1 = a[ai]!;
    const a2 = a[(ai + 1) % a.length]!;
    for (let bi = 0; bi < b.length; bi += 1) {
      if (segmentsIntersect(a1, a2, b[bi]!, b[(bi + 1) % b.length]!)) return true;
    }
  }
  return false;
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
  const length = distance(from, to);
  const direction = unitVector(from, to);
  for (let cursor = 0; cursor < length; cursor += dash + gap) {
    const end = Math.min(length, cursor + dash);
    drawLine(g, addScaled(from, direction, cursor), addScaled(from, direction, end), width, colorValue, alpha);
  }
}

function polygon(g: Graphics, points: Point[]) {
  if (!points.length) return g;
  g.moveTo(points[0]![0], points[0]![1]);
  for (let index = 1; index < points.length; index += 1) g.lineTo(points[index]![0], points[index]![1]);
  g.closePath();
  return g;
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
  for (let attempt = 0; attempt < 28; attempt += 1) {
    const candidate: Point = [bounds.minX + 8 + random() * Math.max(1, bounds.width - 16), bounds.minY + 8 + random() * Math.max(1, bounds.height - 16)];
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
    const currentDistance = Math.max(1, Math.hypot(x - center[0], y - center[1]));
    const ratio = Math.max(0, (currentDistance - amount) / currentDistance);
    return [center[0] + (x - center[0]) * ratio, center[1] + (y - center[1]) * ratio] as Point;
  });
}

function forEachRoadSegment(road: RoadDefinition, callback: (a: Point, b: Point) => void) {
  for (let index = 0; index < road.centerline.length - 1; index += 1) callback(road.centerline[index]!, road.centerline[index + 1]!);
}

function forEachSegmentPair(a: Point[], b: Point[], callback: (a1: Point, a2: Point, b1: Point, b2: Point) => void) {
  for (let ai = 0; ai < a.length - 1; ai += 1) for (let bi = 0; bi < b.length - 1; bi += 1) callback(a[ai]!, a[ai + 1]!, b[bi]!, b[bi + 1]!);
}

function segmentIntersectionPoint(a: Point, b: Point, c: Point, d: Point): Point | null {
  const denominator = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]);
  if (Math.abs(denominator) < .0001) return null;
  const first = a[0] * b[1] - a[1] * b[0];
  const second = c[0] * d[1] - c[1] * d[0];
  const x = (first * (c[0] - d[0]) - (a[0] - b[0]) * second) / denominator;
  const y = (first * (c[1] - d[1]) - (a[1] - b[1]) * second) / denominator;
  const point: Point = [x, y];
  return pointOnSegment(point, a, b) && pointOnSegment(point, c, d) ? point : null;
}

function pointOnSegment(point: Point, a: Point, b: Point) {
  return point[0] >= Math.min(a[0], b[0]) - .01 && point[0] <= Math.max(a[0], b[0]) + .01 && point[1] >= Math.min(a[1], b[1]) - .01 && point[1] <= Math.max(a[1], b[1]) + .01;
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  return segmentIntersectionPoint(a, b, c, d) !== null;
}

function dedupePoints(points: Point[], threshold: number) {
  const output: Point[] = [];
  for (const point of points) if (!output.some(existing => distance(existing, point) < threshold)) output.push(point);
  return output;
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
  if (lengthSq === 0) return distance(point, a);
  const t = clamp(((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSq, 0, 1);
  return Math.hypot(point[0] - (a[0] + dx * t), point[1] - (a[1] + dy * t));
}

function perpendicularUnit(a: Point, b: Point): Point {
  const direction = unitVector(a, b);
  return [-direction[1], direction[0]];
}

function unitVector(a: Point, b: Point): Point {
  const length = Math.max(.001, distance(a, b));
  return [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
}

function distance(a: Point, b: Point) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }
function offsetPoint(point: Point, normal: Point, amount: number): Point { return [point[0] + normal[0] * amount, point[1] + normal[1] * amount]; }
function addScaled(point: Point, vector: Point, amount: number): Point { return [point[0] + vector[0] * amount, point[1] + vector[1] * amount]; }
function addPoint(a: Point, b: Point): Point { return [a[0] + b[0], a[1] + b[1]]; }
function lerpPoint(a: Point, b: Point, t: number): Point { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function paletteNumbers(values: Record<string, string>) { return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number.parseInt(value.replace('#', ''), 16)])) as Record<string, number>; }
function hash(input: string) { let value = 0; for (let index = 0; index < input.length; index += 1) value = Math.imul(31, value) + input.charCodeAt(index) | 0; return Math.abs(value); }
function mulberry32(seed: number) { let value = seed >>> 0; return () => { value += 0x6D2B79F5; let result = value; result = Math.imul(result ^ result >>> 15, result | 1); result ^= result + Math.imul(result ^ result >>> 7, result | 61); return ((result ^ result >>> 14) >>> 0) / 4294967296; }; }
