import { useEffect, useRef, useState } from 'react';
import type { CharacterAppearanceRecipe } from './characterRecipe';
import { getSystemAsset, type MakeHumanSystemAsset } from './systemAssets';

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
const EYE: Record<string, string> = {
  'dark-brown': '#38261d', brown: '#5d4938', hazel: '#7a653d', amber: '#8b652d',
  green: '#4f6951', blue: '#4b6f86', gray: '#69767b'
};
const HAIR: Record<string, string> = {
  black: '#151311', 'soft-black': '#27211d', 'dark-brown': '#3c2b22', brown: '#644334',
  auburn: '#754032', copper: '#9a5d3a', blonde: '#b89a65', platinum: '#d0c8b5', gray: '#777b7d'
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

type FaceRef = [number, number];
type Tri = FaceRef[];
type BaseMesh = { verts: number[][]; uvs: number[][]; tris: Tri[]; eyeTris: { left: Tri[]; right: Tri[] } };
type Target = Array<[number, number, number, number]>;
type ViewerSummary = { loadedAssets: number; failedAssets: number };
type MHCLOMapping = { v: [number, number, number]; w: [number, number, number]; o: [number, number, number] };
type MHCLO = {
  objFile: string;
  materialFile: string;
  scales: Array<[number, number, number] | null>;
  mappings: MHCLOMapping[];
  deleteVerts: Set<number>;
};
type AccessoryObj = { verts: number[][]; uvs: number[][]; tris: Array<Array<[number, number]>>; maxFaceVertex: number };
type AccessoryMaterial = { diffuseTexture: string; opacity: number; transparent: boolean; backfaceCull: boolean };
type AccessoryData = { spec: MakeHumanSystemAsset; meta: MHCLO; obj: AccessoryObj; material: AccessoryMaterial };

let basePromise: Promise<BaseMesh> | null = null;
const targetCache = new Map<string, Promise<Target>>();
const accessoryCache = new Map<string, Promise<AccessoryData>>();

export function MakeHumanViewer({ recipe, focus = 'full' }: { recipe: CharacterAppearanceRecipe; focus?: 'full' | 'face' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<ViewerRuntime | null>(null);
  const [status, setStatus] = useState('Зареждане на HM08…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    void (async () => {
      try {
        const THREE = await import(/* @vite-ignore */ THREE_MODULE_URL);
        if (cancelled) return;
        const runtime = new ViewerRuntime(THREE, canvas);
        runtimeRef.current = runtime;
        setStatus('Зареждане на MakeHuman геометрия…');
        const summary = await runtime.init(recipe);
        if (cancelled) return runtime.dispose();
        setFailed(false);
        setStatus(summaryText(summary));
      } catch (error) {
        console.error('[character] viewer init failed', error);
        if (!cancelled) { setFailed(true); setStatus(error instanceof Error ? error.message : 'Грешка при зареждане на модела'); }
      }
    })();
    return () => { cancelled = true; runtimeRef.current?.dispose(); runtimeRef.current = null; };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    setStatus('Прилагане на промените…');
    void runtime.rebuild(recipe).then(summary => {
      setFailed(false);
      setStatus(summaryText(summary));
    }).catch(error => {
      console.error('[character] rebuild failed', error);
      setFailed(true);
      setStatus(error instanceof Error ? error.message : 'Грешка при обновяване на модела');
    });
  }, [recipe]);

  useEffect(() => { runtimeRef.current?.setFocus(focus); }, [focus]);

  return (
    <div className="relative h-full min-h-[440px] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_18%,#29373d,#111a1f_55%,#0a1014)]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label="Триизмерен преглед на героя" />
      <div className={`absolute left-3 top-3 max-w-[78%] rounded-full border px-3 py-1 text-[10px] font-bold tracking-[.08em] backdrop-blur ${failed ? 'border-red-400/30 bg-red-950/60 text-red-200' : 'border-emerald-300/20 bg-black/45 text-emerald-200'}`}>{status}</div>
      <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/35 px-2 py-1 text-[9px] uppercase tracking-[.11em] text-slate-400 backdrop-blur">Плъзни за завъртане · колелце или щипване за мащаб</div>
    </div>
  );
}

function summaryText(summary: ViewerSummary) {
  if (summary.failedAssets) return `HM08 на живо · ${summary.loadedAssets} заредени · ${summary.failedAssets} неуспешни елемента`;
  if (summary.loadedAssets) return `HM08 на живо · ${summary.loadedAssets} заредени елемента`;
  return 'HM08 на живо';
}

class ViewerRuntime {
  private renderer: any;
  private scene: any;
  private camera: any;
  private root: any;
  private mesh: any = null;
  private extras: any[] = [];
  private frame = 0;
  private observer: ResizeObserver;
  private rebuildId = 0;
  private yaw = 0;
  private distance = 4.25;
  private pointerMap = new Map<number, { x: number; y: number }>();
  private pinchBase: { distance: number } | null = null;
  private cleanup: Array<() => void> = [];
  private textureObjects = new Set<any>();
  private textureCache = new Map<string, Promise<any | null>>();

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
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement!);
    this.resize();
    this.bindControls();
    this.animate();
    this.updateCamera(1.05);
  }

  async init(recipe: CharacterAppearanceRecipe) { return await this.rebuild(recipe); }

  async rebuild(recipe: CharacterAppearanceRecipe): Promise<ViewerSummary> {
    const id = ++this.rebuildId;
    const base = await getBase();
    const targets = await weightedTargets(recipe);
    if (id !== this.rebuildId) return { loadedAssets: 0, failedAssets: 0 };

    const requestedSpecs = requestedAssets(recipe);
    const loaded: AccessoryData[] = [];
    let failedAssets = 0;
    const settled = await Promise.allSettled(requestedSpecs.map(spec => getAccessoryData(spec)));
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') loaded.push(result.value);
      else {
        failedAssets += 1;
        console.warn('[character] asset load failed', requestedSpecs[index].id, result.reason);
      }
    });
    if (id !== this.rebuildId) return { loadedAssets: 0, failedAssets };

    const hidden = new Set<number>();
    for (const data of loaded) if (data.spec.kind === 'clothing') for (const vertex of data.meta.deleteVerts) hidden.add(vertex);
    const built = buildBodyGeometry(this.THREE, base, targets, hidden);
    if (id !== this.rebuildId) { built.geometry.dispose(); return { loadedAssets: 0, failedAssets }; }

    this.clearRenderedMeshes();
    const skin = SKIN[recipe.appearance.skinTone] ?? SKIN['warm-medium'];
    const material = new this.THREE.MeshPhysicalMaterial({ color: skin, roughness: .66, metalness: 0, sheen: .08, sheenColor: 0xffd9c5 });
    this.mesh = new this.THREE.Mesh(built.geometry, material);
    const bounds = measureBodyBounds(base, built.deformed);
    const heightScale = 1 + (recipe.appearance.height / 100) * .085;
    const scale = (2.02 * heightScale) / Math.max(bounds.maxY - bounds.minY, .001);
    this.mesh.scale.setScalar(scale);
    this.mesh.position.set(-bounds.centerX * scale, -bounds.minY * scale, -bounds.centerZ * scale);
    this.root.add(this.mesh);

    this.addNativeEyes(base, built.deformed, scale, this.mesh.position, recipe.appearance.eyeColor);

    let renderedAssets = 0;
    for (const data of loaded) {
      if (id !== this.rebuildId) break;
      try {
        await this.addAccessory(data, built.deformed, scale, this.mesh.position, recipe);
        renderedAssets += 1;
      } catch (error) {
        failedAssets += 1;
        console.warn('[character] asset render failed', data.spec.id, error);
      }
    }
    return { loadedAssets: renderedAssets, failedAssets };
  }

  setFocus(focus: 'full' | 'face') {
    this.updateCamera(focus === 'face' ? 1.72 : 1.05, focus === 'face' ? 1.35 : 4.25);
  }

  private addNativeEyes(base: BaseMesh, deformed: number[][], scale: number, position: any, eyeColor: string) {
    const irisColor = EYE[eyeColor] ?? EYE.brown;
    for (const tris of [base.eyeTris.left, base.eyeTris.right]) {
      if (!tris.length) continue;
      const geometry = buildAuxGeometry(this.THREE, deformed, tris);
      const eye = new this.THREE.Mesh(geometry, new this.THREE.MeshPhysicalMaterial({ color: 0xf1eee8, roughness: .38, metalness: 0, clearcoat: .12, clearcoatRoughness: .22 }));
      this.applySourceTransform(eye, scale, position);
      this.addExtra(eye);

      const bounds = geometry.boundingBox;
      const center = new this.THREE.Vector3(); bounds.getCenter(center);
      const size = new this.THREE.Vector3(); bounds.getSize(size);
      const frontZ = bounds.max.z + .0012;
      const radius = Math.max(.025, Math.min(.052, Math.min(size.x, size.y) * .145));
      const ring = new this.THREE.Mesh(new this.THREE.CircleGeometry(radius * 1.08, 42), new this.THREE.MeshStandardMaterial({ color: 0x332a25, roughness: .72, side: this.THREE.DoubleSide }));
      ring.position.set(center.x, center.y, frontZ);
      this.applySourceTransform(ring, scale, position);
      this.addExtra(ring);
      const iris = new this.THREE.Mesh(new this.THREE.CircleGeometry(radius, 42), new this.THREE.MeshPhysicalMaterial({ color: irisColor, roughness: .42, metalness: 0, clearcoat: .08, side: this.THREE.DoubleSide }));
      iris.position.set(center.x, center.y, frontZ + .0008);
      this.applySourceTransform(iris, scale, position);
      this.addExtra(iris);
      const pupil = new this.THREE.Mesh(new this.THREE.CircleGeometry(radius * .39, 36), new this.THREE.MeshStandardMaterial({ color: 0x090909, roughness: .7, side: this.THREE.DoubleSide }));
      pupil.position.set(center.x, center.y, frontZ + .0016);
      this.applySourceTransform(pupil, scale, position);
      this.addExtra(pupil);
      const highlight = new this.THREE.Mesh(new this.THREE.CircleGeometry(radius * .13, 20), new this.THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .62, depthWrite: false }));
      highlight.position.set(center.x - radius * .22, center.y + radius * .24, frontZ + .0024);
      this.applySourceTransform(highlight, scale, position);
      this.addExtra(highlight);
    }
  }

  private async addAccessory(data: AccessoryData, deformed: number[][], scale: number, position: any, recipe: CharacterAppearanceRecipe) {
    const fitted = fitMHCLO(data.meta.mappings, deformed, data.meta.scales);
    const geometry = buildAccessoryGeometry(this.THREE, data.obj, fitted);
    let texture: any = null;
    if (data.material.diffuseTexture) texture = await this.getTexture(data.spec, data.material.diffuseTexture).catch(() => null);
    const fallback = data.spec.kind === 'hair' ? (HAIR[recipe.grooming.hairColor] ?? HAIR['dark-brown']) : data.spec.fallbackColor;
    const color = texture && data.spec.kind === 'clothing' ? '#ffffff' : fallback;
    const material = new this.THREE.MeshStandardMaterial({
      color,
      map: texture,
      roughness: data.spec.kind === 'hair' ? .72 : .68,
      metalness: 0,
      transparent: data.spec.kind === 'hair' || data.material.transparent,
      alphaTest: data.spec.kind === 'hair' ? .12 : .02,
      opacity: Number.isFinite(data.material.opacity) ? data.material.opacity : 1,
      side: data.material.backfaceCull ? this.THREE.FrontSide : this.THREE.DoubleSide,
      depthWrite: true
    });
    const mesh = new this.THREE.Mesh(geometry, material);
    this.applySourceTransform(mesh, scale, position);
    this.addExtra(mesh);
  }

  private getTexture(spec: MakeHumanSystemAsset, file: string): Promise<any | null> {
    const key = `${spec.id}/${file}`;
    const cached = this.textureCache.get(key);
    if (cached) return cached;
    const promise = new Promise<any | null>(resolve => {
      const urls = assetUrls(spec, file);
      const loader = new this.THREE.TextureLoader();
      loader.setCrossOrigin?.('anonymous');
      let index = 0;
      const next = () => {
        if (index >= urls.length) return resolve(null);
        loader.load(urls[index++], (texture: any) => {
          texture.colorSpace = this.THREE.SRGBColorSpace;
          texture.wrapS = texture.wrapT = this.THREE.ClampToEdgeWrapping;
          this.textureObjects.add(texture);
          resolve(texture);
        }, undefined, next);
      };
      next();
    });
    this.textureCache.set(key, promise);
    return promise;
  }

  private applySourceTransform(object: any, scale: number, position: any) {
    object.scale.setScalar(scale);
    object.position.set(
      object.position.x * scale + position.x,
      object.position.y * scale + position.y,
      object.position.z * scale + position.z
    );
  }

  private addExtra(object: any) {
    this.root.add(object);
    this.extras.push(object);
  }

  private clearRenderedMeshes() {
    if (this.mesh) {
      this.root.remove(this.mesh);
      this.mesh.geometry?.dispose?.();
      disposeMaterial(this.mesh.material);
      this.mesh = null;
    }
    for (const object of this.extras) {
      this.root.remove(object);
      object.geometry?.dispose?.();
      disposeMaterial(object.material);
    }
    this.extras = [];
  }

  private bindControls() {
    const point = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY });
    const recalcPinch = () => {
      if (this.pointerMap.size !== 2) { this.pinchBase = null; return; }
      const points = [...this.pointerMap.values()];
      this.pinchBase = { distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) };
    };
    const down = (event: PointerEvent) => {
      this.pointerMap.set(event.pointerId, point(event));
      this.canvas.setPointerCapture?.(event.pointerId);
      recalcPinch();
    };
    const move = (event: PointerEvent) => {
      const previous = this.pointerMap.get(event.pointerId);
      if (!previous) return;
      const before = this.pinchBase;
      this.pointerMap.set(event.pointerId, point(event));
      if (this.pointerMap.size === 1) {
        const dx = event.clientX - previous.x;
        this.yaw += dx * .008;
        this.root.rotation.y = this.yaw;
      } else if (this.pointerMap.size === 2) {
        const points = [...this.pointerMap.values()];
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) || 1;
        if (before && before.distance > 2) {
          this.distance = Math.max(.85, Math.min(6, this.distance * before.distance / distance));
          this.updateCamera();
        }
        this.pinchBase = { distance };
      }
    };
    const up = (event: PointerEvent) => { this.pointerMap.delete(event.pointerId); recalcPinch(); };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      this.distance = Math.max(.85, Math.min(6, this.distance * Math.exp(event.deltaY * .001)));
      this.updateCamera();
    };
    this.canvas.addEventListener('pointerdown', down);
    this.canvas.addEventListener('pointermove', move);
    this.canvas.addEventListener('pointerup', up);
    this.canvas.addEventListener('pointercancel', up);
    this.canvas.addEventListener('wheel', wheel, { passive: false });
    this.cleanup.push(
      () => this.canvas.removeEventListener('pointerdown', down),
      () => this.canvas.removeEventListener('pointermove', move),
      () => this.canvas.removeEventListener('pointerup', up),
      () => this.canvas.removeEventListener('pointercancel', up),
      () => this.canvas.removeEventListener('wheel', wheel)
    );
  }

  private updateCamera(targetY = Number(this.camera.userData.targetY ?? 1.05), distance = this.distance) {
    this.camera.userData.targetY = targetY;
    this.distance = distance;
    this.camera.position.set(0, targetY, this.distance);
    this.camera.lookAt(0, targetY, 0);
  }

  private resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const width = Math.max(1, parent.clientWidth), height = Math.max(1, parent.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    this.frame = requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.cleanup.forEach(fn => fn());
    this.clearRenderedMeshes();
    this.textureObjects.forEach(texture => texture.dispose?.());
    this.textureObjects.clear();
    this.renderer.dispose();
  }
}

function requestedAssets(recipe: CharacterAppearanceRecipe) {
  const ids = new Set<string>();
  if (recipe.grooming.hairStyle && recipe.grooming.hairStyle !== 'bald') ids.add(recipe.grooming.hairStyle);
  Object.values(recipe.grooming.equipped).forEach(id => { if (id) ids.add(id); });
  return [...ids].map(id => getSystemAsset(id)).filter((asset): asset is MakeHumanSystemAsset => !!asset && asset.compatibleSexes.includes(recipe.body));
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
    try {
      const response = await fetch(route(path), { cache: 'force-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (text.length < 20) throw new Error('Празен отговор от източника');
      return text;
    } catch (error) { last = error; }
  }
  throw last instanceof Error ? last : new Error(`Неуспешно зареждане: ${path}`);
}

function parseBaseObj(text: string): BaseMesh {
  const verts: number[][] = [], uvs: number[][] = [], tris: Tri[] = [];
  const eyeTris = { left: [] as Tri[], right: [] as Tri[] };
  let group = '';
  for (const raw of text.split(/\r?\n/)) {
    if (raw.startsWith('v ')) {
      const a = raw.trim().split(/\s+/); verts.push([+a[1], +a[2], +a[3]]);
    } else if (raw.startsWith('vt ')) {
      const a = raw.trim().split(/\s+/); uvs.push([+a[1], +a[2]]);
    } else if (raw.startsWith('g ')) group = raw.slice(2).trim();
    else if (raw.startsWith('f ')) {
      const items = raw.trim().split(/\s+/).slice(1).map(part => {
        const [v, t] = part.split('/');
        return [(+v) - 1, t ? (+t) - 1 : -1] as FaceRef;
      });
      const output = group === 'body' ? tris : group === 'helper-l-eye' ? eyeTris.left : group === 'helper-r-eye' ? eyeTris.right : null;
      if (output) for (let i = 1; i < items.length - 1; i++) output.push([items[0], items[i], items[i + 1]]);
    }
  }
  if (verts.length < 10_000 || tris.length < 10_000) throw new Error('Неуспешно прочитане на HM08 геометрията');
  if (eyeTris.left.length < 40 || eyeTris.right.length < 40) throw new Error('HM08 помощната геометрия за очите липсва');
  return { verts, uvs, tris, eyeTris };
}

function parseTarget(text: string): Target {
  const rows: Target = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const a = line.split(/\s+/);
    if (a.length >= 4) {
      const row: [number, number, number, number] = [+a[0], +a[1], +a[2], +a[3]];
      if (row.every(Number.isFinite)) rows.push(row);
    }
  }
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
    const definition = definitions[key];
    if (!definition || Math.abs(raw) < 1) continue;
    const paths = raw > 0 ? definition.inc : definition.dec;
    const weight = Math.abs(raw) / 100 * (definition.gain ?? 1);
    for (const path of paths) result.push({ target: await getTarget(path), weight });
  }
}

function applyTargets(base: BaseMesh, targets: Array<{ target: Target; weight: number }>) {
  const verts = base.verts.map(point => point.slice());
  for (const entry of targets) for (const [index, x, y, z] of entry.target) {
    const point = verts[index];
    if (point) { point[0] += x * entry.weight; point[1] += y * entry.weight; point[2] += z * entry.weight; }
  }
  return verts;
}

function buildBodyGeometry(THREE: any, base: BaseMesh, targets: Array<{ target: Target; weight: number }>, hidden: Set<number>) {
  const verts = applyTargets(base, targets);
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const map = new Map<string, number>();
  for (const tri of base.tris) {
    if (hidden.size && tri.filter(([vi]) => hidden.has(vi)).length >= 2) continue;
    for (const [vi, ti] of tri) {
      const key = `${vi}/${ti}`;
      let output = map.get(key);
      if (output === undefined) {
        output = map.size; map.set(key, output);
        positions.push(...verts[vi]);
        const uv = base.uvs[ti] ?? [0, 0]; uvs.push(uv[0], uv[1]);
      }
      indices.push(output);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return { geometry, deformed: verts };
}

function measureBodyBounds(base: BaseMesh, deformed: number[][]) {
  const used = new Set<number>();
  for (const tri of base.tris) for (const [vi] of tri) used.add(vi);
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const index of used) {
    const point = deformed[index];
    if (!point) continue;
    minX = Math.min(minX, point[0]); maxX = Math.max(maxX, point[0]);
    minY = Math.min(minY, point[1]); maxY = Math.max(maxY, point[1]);
    minZ = Math.min(minZ, point[2]); maxZ = Math.max(maxZ, point[2]);
  }
  return { minY, maxY, centerX: (minX + maxX) / 2, centerZ: (minZ + maxZ) / 2 };
}

function buildAuxGeometry(THREE: any, deformed: number[][], tris: Tri[]) {
  const positions: number[] = [], indices: number[] = [];
  const map = new Map<number, number>();
  for (const tri of tris) for (const [vi] of tri) {
    let output = map.get(vi);
    if (output === undefined) {
      output = map.size; map.set(vi, output);
      const point = deformed[vi];
      positions.push(point[0], point[1], point[2]);
    }
    indices.push(output);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

async function getAccessoryData(spec: MakeHumanSystemAsset) {
  let value = accessoryCache.get(spec.id);
  if (!value) {
    value = loadAccessoryData(spec);
    accessoryCache.set(spec.id, value);
  }
  try { return await value; }
  catch (error) { accessoryCache.delete(spec.id); throw error; }
}

async function loadAccessoryData(spec: MakeHumanSystemAsset): Promise<AccessoryData> {
  const base = spec.fileBase ?? spec.id;
  const mhcloText = await fetchAssetText(spec, `${base}.mhclo`);
  const meta = parseMHCLO(mhcloText);
  const objText = await fetchAssetText(spec, meta.objFile || `${base}.obj`);
  const obj = parseAccessoryOBJ(objText);
  if (obj.maxFaceVertex >= meta.mappings.length) throw new Error(`${spec.id}: несъвместими MHCLO и OBJ данни`);
  let material: AccessoryMaterial = { diffuseTexture: '', opacity: 1, transparent: true, backfaceCull: false };
  if (meta.materialFile) {
    try { material = parseMHMAT(await fetchAssetText(spec, meta.materialFile)); }
    catch (error) { console.warn('[character] material fallback', spec.id, error); }
  }
  return { spec, meta, obj, material };
}

function assetUrls(spec: MakeHumanSystemAsset, file: string) {
  const path = `${spec.directory}/${spec.id}/${file}`;
  return [
    `https://free.downloads.tuxfamily.net/makehuman/assets/1.1/${path}`,
    `https://raw.githubusercontent.com/makehumancommunity/makehuman-assets/master/${path}`,
    `https://cdn.jsdelivr.net/gh/makehumancommunity/makehuman-assets@master/${path}`
  ];
}

async function fetchAssetText(spec: MakeHumanSystemAsset, file: string) {
  const errors: string[] = [];
  for (const url of assetUrls(spec, file)) {
    try {
      const response = await fetch(url, { cache: 'force-cache', credentials: 'omit' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const head = text.slice(0, 180).toLowerCase();
      if (text.length < 20) throw new Error('празен файл');
      if (head.includes('<html') || head.includes('<!doctype html')) throw new Error('получен е HTML вместо елемент');
      if (head.includes('version https://git-lfs.github.com/spec/v1')) throw new Error('получен е Git LFS указател вместо елемент');
      return text;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`${spec.displayNameBg} не може да се зареди (${errors.join(' · ')})`);
}

function parseMHCLO(text: string): MHCLO {
  const output: MHCLO = { objFile: '', materialFile: '', scales: [null, null, null], mappings: [], deleteVerts: new Set<number>() };
  let mode = '';
  let rangeStart: number | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/), key = parts[0];
    if (key === 'obj_file') { output.objFile = parts[1]; mode = ''; }
    else if (key === 'material') { output.materialFile = parts[1]; mode = ''; }
    else if (key === 'x_scale' || key === 'y_scale' || key === 'z_scale') {
      const dimension = key[0] === 'x' ? 0 : key[0] === 'y' ? 1 : 2;
      output.scales[dimension] = [+parts[1], +parts[2], +parts[3]];
      mode = '';
    } else if (key === 'verts') mode = 'verts';
    else if (key === 'delete_verts') { mode = 'delete'; rangeStart = null; }
    else if (key === 'weights') mode = 'weights';
    else if (mode === 'verts' && /^\d+$/.test(key)) {
      if (parts.length === 1) output.mappings.push({ v: [+parts[0], 0, 0], w: [1, 0, 0], o: [0, 0, 0] });
      else if (parts.length >= 6) output.mappings.push({
        v: [+parts[0], +parts[1], +parts[2]],
        w: [+parts[3], +parts[4], +parts[5]],
        o: [+(parts[6] || 0), +(parts[7] || 0), +(parts[8] || 0)]
      });
    } else if (mode === 'delete') {
      let range = false;
      for (const token of parts) {
        if (token === '-') { range = true; continue; }
        const current = Number(token);
        if (!Number.isInteger(current)) continue;
        if (range && rangeStart !== null) {
          for (let index = rangeStart; index <= current; index++) output.deleteVerts.add(index);
          range = false;
        } else output.deleteVerts.add(current);
        rangeStart = current;
      }
    }
  }
  if (!output.objFile || output.mappings.length < 20) throw new Error(`Неуспешно прочитане на MHCLO (${output.mappings.length} съпоставяния)`);
  return output;
}

function parseAccessoryOBJ(text: string): AccessoryObj {
  const verts: number[][] = [], uvs: number[][] = [], tris: Array<Array<[number, number]>> = [];
  let maxFaceVertex = -1;
  for (const raw of text.split(/\r?\n/)) {
    if (raw.startsWith('v ')) {
      const a = raw.trim().split(/\s+/); verts.push([+a[1], +a[2], +a[3]]);
    } else if (raw.startsWith('vt ')) {
      const a = raw.trim().split(/\s+/); uvs.push([+a[1], +a[2]]);
    } else if (raw.startsWith('f ')) {
      const parts = raw.trim().split(/\s+/).slice(1).map(value => {
        const bits = value.split('/');
        let vi = +bits[0], ti = bits[1] ? +bits[1] : 0;
        vi = vi < 0 ? verts.length + vi : vi - 1;
        ti = ti < 0 ? uvs.length + ti : ti - 1;
        maxFaceVertex = Math.max(maxFaceVertex, vi);
        return [vi, ti] as [number, number];
      });
      for (let i = 1; i < parts.length - 1; i++) tris.push([parts[0], parts[i], parts[i + 1]]);
    }
  }
  if (verts.length < 20 || tris.length < 20) throw new Error(`Неуспешно прочитане на OBJ (${verts.length} върха, ${tris.length} триъгълника)`);
  return { verts, uvs, tris, maxFaceVertex };
}

function parseMHMAT(text: string): AccessoryMaterial {
  const output: AccessoryMaterial = { diffuseTexture: '', opacity: 1, transparent: true, backfaceCull: false };
  for (const raw of text.split(/\r?\n/)) {
    const parts = raw.trim().split(/\s+/), key = parts[0];
    if (key === 'diffuseTexture') output.diffuseTexture = parts.slice(1).join(' ');
    else if (key === 'opacity') output.opacity = +parts[1];
    else if (key === 'transparent') output.transparent = (parts[1] || '').toLowerCase() === 'true';
    else if (key === 'backfaceCull') output.backfaceCull = (parts[1] || '').toLowerCase() === 'true';
  }
  return output;
}

function fitMHCLO(mappings: MHCLOMapping[], deformed: number[][], scales: Array<[number, number, number] | null>) {
  const scale = [1, 1, 1];
  for (let dimension = 0; dimension < 3; dimension++) {
    const data = scales[dimension];
    if (data && deformed[data[0]] && deformed[data[1]] && Math.abs(data[2]) > .000001) {
      scale[dimension] = Math.abs(deformed[data[0]][dimension] - deformed[data[1]][dimension]) / Math.abs(data[2]);
    }
  }
  return mappings.map(mapping => {
    const point = [0, 0, 0];
    for (let index = 0; index < 3; index++) {
      const base = deformed[mapping.v[index]];
      if (!base) continue;
      point[0] += base[0] * mapping.w[index];
      point[1] += base[1] * mapping.w[index];
      point[2] += base[2] * mapping.w[index];
    }
    point[0] += mapping.o[0] * scale[0];
    point[1] += mapping.o[1] * scale[1];
    point[2] += mapping.o[2] * scale[2];
    return point;
  });
}

function buildAccessoryGeometry(THREE: any, obj: AccessoryObj, fitted: number[][]) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const map = new Map<string, number>();
  for (const tri of obj.tris) {
    if (tri.some(([vi]) => !fitted[vi])) continue;
    for (const [vi, ti] of tri) {
      const key = `${vi}/${ti}`;
      let output = map.get(key);
      if (output === undefined) {
        output = map.size; map.set(key, output);
        const point = fitted[vi], uv = obj.uvs[ti] ?? [0, 0];
        positions.push(point[0], point[1], point[2]);
        uvs.push(uv[0], uv[1]);
      }
      indices.push(output);
    }
  }
  if (positions.length < 60) throw new Error('MHCLO съпоставянето създаде твърде малко геометрия');
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function disposeMaterial(material: any) {
  if (Array.isArray(material)) material.forEach(item => item?.dispose?.());
  else material?.dispose?.();
}
