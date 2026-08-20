import { useEffect, useRef, useState } from 'react';
import type { CharacterAppearanceRecipe } from './characterRecipe';

const THREE_MODULE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const COMMIT = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482';
const ROOT = 'makehuman/data';
const ROUTES = [
  (path: string) => `https://cdn.jsdelivr.net/gh/makehumancommunity/makehuman@${COMMIT}/${ROOT}/${path}`,
  (path: string) => `https://raw.githubusercontent.com/makehumancommunity/makehuman/${COMMIT}/${ROOT}/${path}`
];

const SKIN: Record<string, string> = {
  'light-neutral': '#c9967d', 'light-warm': '#bd856d', 'warm-medium': '#aa715b',
  'medium-neutral': '#97614e', 'medium-deep': '#7d4d3d', 'deep-warm': '#633b2f',
  'deep-neutral': '#4c2f29', dark: '#38231f'
};

type TargetDirection = { dec: string[]; inc: string[]; gain?: number };
const BODY_TARGETS: Record<string, TargetDirection> = {
  shoulders: measure('measure-shoulder-dist-decr.target', 'measure-shoulder-dist-incr.target'),
  chest: measure('measure-bust-circ-decr.target', 'measure-bust-circ-incr.target'),
  waist: measure('measure-waist-circ-decr.target', 'measure-waist-circ-incr.target'),
  hips: measure('measure-hips-circ-decr.target', 'measure-hips-circ-incr.target'),
  upperArms: measure('measure-upperarm-circ-decr.target', 'measure-upperarm-circ-incr.target'),
  thighs: measure('measure-thigh-circ-decr.target', 'measure-thigh-circ-incr.target'),
  calves: measure('measure-calf-circ-decr.target', 'measure-calf-circ-incr.target'),
  armLength: {
    dec: ['targets/measure/measure-upperarm-length-decr.target', 'targets/measure/measure-lowerarm-length-decr.target'],
    inc: ['targets/measure/measure-upperarm-length-incr.target', 'targets/measure/measure-lowerarm-length-incr.target']
  },
  legLength: {
    dec: ['targets/measure/measure-upperleg-height-decr.target', 'targets/measure/measure-lowerleg-height-decr.target'],
    inc: ['targets/measure/measure-upperleg-height-incr.target', 'targets/measure/measure-lowerleg-height-incr.target']
  }
};

const FACE_TARGETS: Record<string, TargetDirection> = {
  cheekbones: face(['cheek/l-cheek-bones-decr.target', 'cheek/r-cheek-bones-decr.target'], ['cheek/l-cheek-bones-incr.target', 'cheek/r-cheek-bones-incr.target'], .82),
  cheekVolume: face(['cheek/l-cheek-volume-decr.target', 'cheek/r-cheek-volume-decr.target'], ['cheek/l-cheek-volume-incr.target', 'cheek/r-cheek-volume-incr.target'], .78),
  chinWidth: face(['chin/chin-width-decr.target'], ['chin/chin-width-incr.target'], .82),
  chinHeight: face(['chin/chin-height-decr.target'], ['chin/chin-height-incr.target'], .78),
  eyeSize: face(['eyes/l-eye-scale-decr.target', 'eyes/r-eye-scale-decr.target'], ['eyes/l-eye-scale-incr.target', 'eyes/r-eye-scale-incr.target'], .72),
  eyeSpacing: face(['eyes/l-eye-trans-in.target', 'eyes/r-eye-trans-in.target'], ['eyes/l-eye-trans-out.target', 'eyes/r-eye-trans-out.target'], .70),
  noseWidth: face(['nose/nose-scale-horiz-decr.target'], ['nose/nose-scale-horiz-incr.target'], .78),
  noseLength: face(['nose/nose-scale-vert-decr.target'], ['nose/nose-scale-vert-incr.target'], .72),
  mouthWidth: face(['mouth/mouth-scale-horiz-decr.target'], ['mouth/mouth-scale-horiz-incr.target'], .72),
  upperLip: face(['mouth/mouth-upperlip-volume-decr.target'], ['mouth/mouth-upperlip-volume-incr.target'], .72),
  lowerLip: face(['mouth/mouth-lowerlip-volume-decr.target'], ['mouth/mouth-lowerlip-volume-incr.target'], .72)
};

function measure(dec: string, inc: string): TargetDirection {
  return { dec: [`targets/measure/${dec}`], inc: [`targets/measure/${inc}`] };
}
function face(dec: string[], inc: string[], gain: number): TargetDirection {
  return { dec: dec.map(path => `targets/${path}`), inc: inc.map(path => `targets/${path}`), gain };
}

type BaseMesh = { verts: number[][]; uvs: number[][]; tris: Array<Array<[number, number]>> };
type Target = Array<[number, number, number, number]>;
let basePromise: Promise<BaseMesh> | null = null;
const targetCache = new Map<string, Promise<Target>>();

export function MakeHumanViewer({ recipe, focus = 'full' }: { recipe: CharacterAppearanceRecipe; focus?: 'full' | 'face' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<ViewerRuntime | null>(null);
  const [status, setStatus] = useState('Loading HM08…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    void (async () => {
      try {
        const threeUrl = THREE_MODULE_URL;
        const THREE = await import(/* @vite-ignore */ threeUrl);
        if (cancelled) return;
        const runtime = new ViewerRuntime(THREE, canvas);
        runtimeRef.current = runtime;
        setStatus('Loading MakeHuman topology…');
        await runtime.init(recipe);
        if (cancelled) return runtime.dispose();
        setStatus('HM08 live');
      } catch (error) {
        console.error('[character] viewer init failed', error);
        if (!cancelled) { setFailed(true); setStatus(error instanceof Error ? error.message : 'Viewer failed'); }
      }
    })();
    return () => { cancelled = true; runtimeRef.current?.dispose(); runtimeRef.current = null; };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    setStatus('Applying appearance…');
    void runtime.rebuild(recipe).then(() => setStatus('HM08 live')).catch(error => {
      console.error('[character] rebuild failed', error);
      setFailed(true); setStatus(error instanceof Error ? error.message : 'Rebuild failed');
    });
  }, [recipe]);

  useEffect(() => { runtimeRef.current?.setFocus(focus); }, [focus]);

  return (
    <div className="relative h-full min-h-[440px] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_18%,#29373d,#111a1f_55%,#0a1014)]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label="Live MakeHuman character preview" />
      <div className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-[10px] font-bold tracking-[.14em] backdrop-blur ${failed ? 'border-red-400/30 bg-red-950/60 text-red-200' : 'border-emerald-300/20 bg-black/45 text-emerald-200'}`}>{status}</div>
      <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/35 px-2 py-1 text-[9px] uppercase tracking-[.14em] text-slate-400 backdrop-blur">Drag to rotate · Wheel/pinch to zoom</div>
    </div>
  );
}

class ViewerRuntime {
  private renderer: any;
  private scene: any;
  private camera: any;
  private root: any;
  private mesh: any = null;
  private frame = 0;
  private observer: ResizeObserver;
  private rebuildId = 0;
  private yaw = 0;
  private distance = 4.25;
  private pointer: { id: number; x: number; y: number } | null = null;
  private cleanup: Array<() => void> = [];

  constructor(private THREE: any, private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, .01, 50);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.scene.add(new THREE.HemisphereLight(0xe3edf0, 0x253039, 1.55));
    const key = new THREE.DirectionalLight(0xffdcc5, 3.2); key.position.set(3.5, 5.4, 4.8); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xb8d8ea, 1.35); fill.position.set(-4, 3, 2.5); this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffc6ad, 1.0); rim.position.set(-2, 4, -4); this.scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshStandardMaterial({ color: 0x222d32, roughness: .95 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.01; this.scene.add(floor);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas.parentElement!); this.resize();
    this.bindControls(); this.animate(); this.updateCamera(1.05);
  }

  async init(recipe: CharacterAppearanceRecipe) { await this.rebuild(recipe); }

  async rebuild(recipe: CharacterAppearanceRecipe) {
    const id = ++this.rebuildId;
    const base = await getBase();
    const targets = await weightedTargets(recipe);
    if (id !== this.rebuildId) return;
    const geometry = buildGeometry(this.THREE, base, targets);
    if (id !== this.rebuildId) { geometry.dispose(); return; }
    if (this.mesh) { this.root.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
    const skin = SKIN[recipe.appearance.skinTone] ?? SKIN['warm-medium'];
    const material = new this.THREE.MeshPhysicalMaterial({ color: skin, roughness: .66, metalness: 0, sheen: .08, sheenColor: 0xffd9c5 });
    this.mesh = new this.THREE.Mesh(geometry, material);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const size = new this.THREE.Vector3(); box.getSize(size);
    const center = new this.THREE.Vector3(); box.getCenter(center);
    const heightScale = 1 + (recipe.appearance.height / 100) * .085;
    const scale = (2.02 * heightScale) / Math.max(size.y, .001);
    this.mesh.scale.setScalar(scale);
    this.mesh.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    this.root.add(this.mesh);
  }

  setFocus(focus: 'full' | 'face') { this.updateCamera(focus === 'face' ? 1.72 : 1.05, focus === 'face' ? 1.35 : 4.25); }

  private bindControls() {
    const down = (event: PointerEvent) => { this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; this.canvas.setPointerCapture?.(event.pointerId); };
    const move = (event: PointerEvent) => {
      if (!this.pointer || this.pointer.id !== event.pointerId) return;
      const dx = event.clientX - this.pointer.x; this.pointer.x = event.clientX; this.pointer.y = event.clientY;
      this.yaw += dx * .008; this.root.rotation.y = this.yaw;
    };
    const up = (event: PointerEvent) => { if (this.pointer?.id === event.pointerId) this.pointer = null; };
    const wheel = (event: WheelEvent) => { event.preventDefault(); this.distance = Math.max(.85, Math.min(6, this.distance * Math.exp(event.deltaY * .001))); this.updateCamera(); };
    this.canvas.addEventListener('pointerdown', down); this.canvas.addEventListener('pointermove', move); this.canvas.addEventListener('pointerup', up); this.canvas.addEventListener('pointercancel', up); this.canvas.addEventListener('wheel', wheel, { passive: false });
    this.cleanup.push(() => this.canvas.removeEventListener('pointerdown', down), () => this.canvas.removeEventListener('pointermove', move), () => this.canvas.removeEventListener('pointerup', up), () => this.canvas.removeEventListener('pointercancel', up), () => this.canvas.removeEventListener('wheel', wheel));
  }

  private updateCamera(targetY = Number(this.camera.userData.targetY ?? 1.05), distance = this.distance) {
    this.camera.userData.targetY = targetY; this.distance = distance;
    this.camera.position.set(0, targetY, this.distance); this.camera.lookAt(0, targetY, 0);
  }
  private resize() { const parent = this.canvas.parentElement; if (!parent) return; const w = Math.max(1, parent.clientWidth), h = Math.max(1, parent.clientHeight); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  private animate = () => { this.frame = requestAnimationFrame(this.animate); this.renderer.render(this.scene, this.camera); };
  dispose() { cancelAnimationFrame(this.frame); this.observer.disconnect(); this.cleanup.forEach(fn => fn()); if (this.mesh) { this.mesh.geometry.dispose(); this.mesh.material.dispose(); } this.renderer.dispose(); }
}

async function getBase(): Promise<BaseMesh> {
  if (!basePromise) basePromise = fetchText('3dobjs/base.obj').then(parseBaseObj);
  return basePromise;
}

async function getTarget(path: string): Promise<Target> {
  let value = targetCache.get(path);
  if (!value) { value = fetchText(path).then(parseTarget); targetCache.set(path, value); }
  return value;
}

async function fetchText(path: string) {
  let last: unknown;
  for (const route of ROUTES) {
    try { const response = await fetch(route(path), { cache: 'force-cache' }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return await response.text(); }
    catch (error) { last = error; }
  }
  throw last instanceof Error ? last : new Error(`Could not fetch ${path}`);
}

function parseBaseObj(text: string): BaseMesh {
  const verts: number[][] = [], uvs: number[][] = [], tris: Array<Array<[number, number]>> = []; let group = '';
  for (const raw of text.split(/\r?\n/)) {
    if (raw.startsWith('v ')) { const a = raw.trim().split(/\s+/); verts.push([+a[1], +a[2], +a[3]]); }
    else if (raw.startsWith('vt ')) { const a = raw.trim().split(/\s+/); uvs.push([+a[1], +a[2]]); }
    else if (raw.startsWith('g ')) group = raw.slice(2).trim();
    else if (raw.startsWith('f ') && group === 'body') {
      const items = raw.trim().split(/\s+/).slice(1).map(part => { const [v, t] = part.split('/'); return [(+v) - 1, t ? (+t) - 1 : -1] as [number, number]; });
      for (let i = 1; i < items.length - 1; i++) tris.push([items[0], items[i], items[i + 1]]);
    }
  }
  if (verts.length < 10_000 || tris.length < 10_000) throw new Error('HM08 topology parse failed');
  return { verts, uvs, tris };
}

function parseTarget(text: string): Target {
  const rows: Target = [];
  for (const raw of text.split(/\r?\n/)) { const line = raw.trim(); if (!line || line.startsWith('#')) continue; const a = line.split(/\s+/); if (a.length >= 4) rows.push([+a[0], +a[1], +a[2], +a[3]]); }
  return rows;
}

async function weightedTargets(recipe: CharacterAppearanceRecipe) {
  const sex = recipe.body;
  const age = recipe.appearance.age;
  const oldWeight = Math.max(0, Math.min(1, (age - 32) / 38));
  const result: Array<{ target: Target; weight: number }> = [];
  result.push({ target: await getTarget(`targets/macrodetails/caucasian-${sex}-young.target`), weight: 1 - oldWeight });
  if (oldWeight > .001) result.push({ target: await getTarget(`targets/macrodetails/caucasian-${sex}-old.target`), weight: oldWeight });
  const bodyWeight = recipe.appearance.weight;
  if (Math.abs(bodyWeight) > 0) result.push({ target: await getTarget(`targets/macrodetails/universal-${sex}-young-averagemuscle-${bodyWeight > 0 ? 'maxweight' : 'minweight'}.target`), weight: Math.abs(bodyWeight) / 100 * .82 });
  const muscle = recipe.appearance.muscle;
  if (Math.abs(muscle) > 0) result.push({ target: await getTarget(`targets/macrodetails/universal-${sex}-young-${muscle > 0 ? 'maxmuscle' : 'minmuscle'}-averageweight.target`), weight: Math.abs(muscle) / 100 * .78 });
  await appendMorphs(result, recipe.morphs, BODY_TARGETS);
  await appendMorphs(result, recipe.faceMorphs, FACE_TARGETS);
  return result;
}

async function appendMorphs(result: Array<{ target: Target; weight: number }>, values: Record<string, number>, definitions: Record<string, TargetDirection>) {
  for (const [key, raw] of Object.entries(values)) {
    const definition = definitions[key]; if (!definition || Math.abs(raw) < 1) continue;
    const paths = raw > 0 ? definition.inc : definition.dec;
    const weight = Math.abs(raw) / 100 * (definition.gain ?? 1);
    for (const path of paths) result.push({ target: await getTarget(path), weight });
  }
}

function buildGeometry(THREE: any, base: BaseMesh, targets: Array<{ target: Target; weight: number }>) {
  const verts = base.verts.map(point => point.slice());
  for (const entry of targets) for (const [index, x, y, z] of entry.target) { const point = verts[index]; if (point) { point[0] += x * entry.weight; point[1] += y * entry.weight; point[2] += z * entry.weight; } }
  const positions: number[] = [], uvs: number[] = [], indices: number[] = []; const map = new Map<string, number>();
  for (const tri of base.tris) for (const [vi, ti] of tri) {
    const key = `${vi}/${ti}`; let output = map.get(key);
    if (output === undefined) { output = map.size; map.set(key, output); positions.push(...verts[vi]); const uv = base.uvs[ti] ?? [0, 0]; uvs.push(uv[0], uv[1]); }
    indices.push(output);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
