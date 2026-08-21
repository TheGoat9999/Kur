import { useEffect, useRef, useState } from 'react';
import type { CharacterAppearanceRecipe } from './characterRecipe';

const THREE_MODULE_URLS = [
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://unpkg.com/three@0.160.0/build/three.module.js?module',
  'https://esm.sh/three@0.160.0'
] as const;

const MH_COMMIT = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482';
const MH_ROOT = 'makehuman/data';
const MH_ROUTES = [
  (path: string) => `https://cdn.jsdelivr.net/gh/makehumancommunity/makehuman@${MH_COMMIT}/${MH_ROOT}/${path}`,
  (path: string) => `https://raw.githubusercontent.com/makehumancommunity/makehuman/${MH_COMMIT}/${MH_ROOT}/${path}`
] as const;

const SKIN: Record<string, string> = {
  'light-neutral': '#c9967d',
  'light-warm': '#bd856d',
  'warm-medium': '#aa715b',
  'medium-neutral': '#97614e',
  'medium-deep': '#7d4d3d',
  'deep-warm': '#633b2f',
  'deep-neutral': '#4c2f29',
  dark: '#38231f'
};

const EYES: Record<string, string> = {
  'dark-brown': '#3b251b',
  brown: '#6b4a32',
  hazel: '#806c43',
  amber: '#a16c2b',
  green: '#567052',
  blue: '#4a708d',
  gray: '#748084'
};

type FaceRef = [number, number];
type Tri = FaceRef[];
type BaseMesh = {
  verts: number[][];
  uvs: number[][];
  tris: Tri[];
  eyeTris: { left: Tri[]; right: Tri[] };
};
type Target = Array<[number, number, number, number]>;
type WeightedTarget = { target: Target; weight: number };
type TargetDirection = { dec: string[]; inc: string[]; gain?: number };
type LoadSummary = { route: string; missingTargets: number; nativeEyes: boolean };

const measure = (dec: string, inc: string): TargetDirection => ({
  dec: [`targets/measure/${dec}`],
  inc: [`targets/measure/${inc}`]
});
const face = (dec: string[], inc: string[], gain: number): TargetDirection => ({
  dec: dec.map(path => `targets/${path}`),
  inc: inc.map(path => `targets/${path}`),
  gain
});

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

let threePromise: Promise<any> | null = null;
let basePromise: Promise<{ base: BaseMesh; route: string }> | null = null;
const targetCache = new Map<string, Promise<Target | null>>();

export function ResilientCharacterViewer({ recipe, focus = 'full' }: { recipe: CharacterAppearanceRecipe; focus?: 'full' | 'face' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<ViewerRuntime | null>(null);
  const recipeRef = useRef(recipe);
  recipeRef.current = recipe;
  const [status, setStatus] = useState('Инициализиране на 3D двигателя…');
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    void (async () => {
      try {
        setError(null);
        setStatus('Инициализиране на 3D двигателя…');
        const THREE = await loadThree();
        if (cancelled) return;
        const runtime = new ViewerRuntime(THREE, canvas);
        runtimeRef.current = runtime;
        setStatus('Зареждане на MakeHuman HM08…');
        const summary = await runtime.rebuild(recipeRef.current);
        if (cancelled) {
          runtime.dispose();
          return;
        }
        setStatus(formatSummary(summary));
      } catch (cause) {
        console.error('[character-resilient] init failed', cause);
        if (!cancelled) {
          setError(errorMessage(cause));
          setStatus('Героят не можа да се зареди');
        }
      }
    })();
    return () => {
      cancelled = true;
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, [retryKey]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    let cancelled = false;
    setError(null);
    setStatus('Прилагане на промените…');
    void runtime.rebuild(recipe).then(summary => {
      if (!cancelled) setStatus(formatSummary(summary));
    }).catch(cause => {
      console.error('[character-resilient] rebuild failed', cause);
      if (!cancelled) {
        setError(errorMessage(cause));
        setStatus('Грешка при обновяване на героя');
      }
    });
    return () => { cancelled = true; };
  }, [recipe]);

  useEffect(() => {
    runtimeRef.current?.setFocus(focus);
  }, [focus]);

  return (
    <div className="relative h-full min-h-[440px] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_18%,#29373d,#111a1f_55%,#0a1014)]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label="Триизмерен преглед на героя" />
      <div className={`absolute left-3 top-3 max-w-[calc(100%-24px)] rounded-xl border px-3 py-2 text-[10px] font-bold tracking-[.06em] backdrop-blur ${error ? 'border-red-400/40 bg-red-950/80 text-red-100' : 'border-emerald-300/20 bg-black/50 text-emerald-200'}`}>
        <div>{status}</div>
        {error && <div className="mt-1 max-w-[560px] normal-case tracking-normal text-red-200">{error}</div>}
      </div>
      {error && (
        <button
          type="button"
          onClick={() => {
            threePromise = null;
            basePromise = null;
            targetCache.clear();
            setRetryKey(value => value + 1);
          }}
          className="absolute left-3 top-24 rounded-lg border border-red-300/30 bg-red-950/80 px-3 py-2 text-xs font-bold text-red-100 hover:bg-red-900/80"
        >
          Опитай отново
        </button>
      )}
      <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[9px] uppercase tracking-[.11em] text-slate-400 backdrop-blur">
        Плъзни за завъртане · колелце или щипване за мащаб
      </div>
    </div>
  );
}

function formatSummary(summary: LoadSummary) {
  const targetText = summary.missingTargets ? ` · ${summary.missingTargets} optional target(s) skipped` : '';
  return `HM08 зареден · ${summary.nativeEyes ? 'native eyes' : 'fallback eyes'} · ${summary.route}${targetText}`;
}

async function loadThree() {
  if (!threePromise) {
    threePromise = (async () => {
      const failures: string[] = [];
      for (const url of THREE_MODULE_URLS) {
        try {
          const module = await withTimeout(import(/* @vite-ignore */ url), 12000, `Timeout: ${url}`);
          if (!module?.WebGLRenderer) throw new Error('Invalid Three.js module');
          return module;
        } catch (cause) {
          failures.push(`${host(url)}: ${errorMessage(cause)}`);
        }
      }
      throw new Error(`Three.js не се зареди. ${failures.join(' | ')}`);
    })();
  }
  return threePromise;
}

class ViewerRuntime {
  private renderer: any;
  private scene: any;
  private camera: any;
  private root: any;
  private body: any = null;
  private extras: any[] = [];
  private frame = 0;
  private observer: ResizeObserver;
  private rebuildId = 0;
  private yaw = 0;
  private distance = 4.25;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDistance = 0;
  private cleanup: Array<() => void> = [];

  constructor(private THREE: any, private canvas: HTMLCanvasElement) {
    if (!canUseWebGL(canvas)) throw new Error('WebGL не е достъпен в този браузър/устройство.');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, .01, 50);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.scene.add(new THREE.HemisphereLight(0xe6f1f4, 0x202b31, 1.45));
    const key = new THREE.DirectionalLight(0xffdcc5, 3.0);
    key.position.set(3.5, 5.2, 4.7);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xb8d8ea, 1.2);
    fill.position.set(-4, 3, 2.5);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffc6ad, .9);
    rim.position.set(-2, 4, -4);
    this.scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshStandardMaterial({ color: 0x222d32, roughness: .95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -.01;
    this.scene.add(floor);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement!);
    this.resize();
    this.bindControls();
    this.animate();
    this.updateCamera(1.05, 4.25);
  }

  async rebuild(recipe: CharacterAppearanceRecipe): Promise<LoadSummary> {
    const id = ++this.rebuildId;
    const { base, route } = await getBase();
    const { targets, missing } = await weightedTargets(recipe);
    if (id !== this.rebuildId) return { route, missingTargets: missing, nativeEyes: false };
    const deformed = applyTargets(base, targets);
    const geometry = buildGeometry(this.THREE, base, deformed);
    const bounds = measureBounds(base, deformed);
    const heightScale = 1 + (recipe.appearance.height / 100) * .085;
    const scale = (2.02 * heightScale) / Math.max(bounds.maxY - bounds.minY, .001);
    const position = new this.THREE.Vector3(-bounds.centerX * scale, -bounds.minY * scale, -bounds.centerZ * scale);
    this.clearMeshes();
    this.body = new this.THREE.Mesh(geometry, new this.THREE.MeshPhysicalMaterial({
      color: SKIN[recipe.appearance.skinTone] ?? SKIN['warm-medium'],
      roughness: .62,
      metalness: 0,
      sheen: .08,
      sheenColor: 0xffd9c5
    }));
    this.body.scale.setScalar(scale);
    this.body.position.copy(position);
    this.root.add(this.body);
    const nativeEyes = this.addEyes(base, deformed, recipe, scale, position);
    return { route, missingTargets: missing, nativeEyes };
  }

  setFocus(focus: 'full' | 'face') {
    this.updateCamera(focus === 'face' ? 1.72 : 1.05, focus === 'face' ? 1.35 : 4.25);
  }

  private addEyes(base: BaseMesh, deformed: number[][], recipe: CharacterAppearanceRecipe, scale: number, position: any) {
    const eyeColor = EYES[recipe.appearance.eyeColor] ?? EYES.brown;
    const nativeGroups = [base.eyeTris.left, base.eyeTris.right].filter(tris => tris.length > 20);
    if (nativeGroups.length === 2) {
      for (const tris of nativeGroups) {
        const geometry = buildAuxGeometry(this.THREE, deformed, tris);
        const material = new this.THREE.MeshPhysicalMaterial({ color: 0xf4f0e9, roughness: .25, clearcoat: .2, side: this.THREE.DoubleSide });
        const mesh = new this.THREE.Mesh(geometry, material);
        mesh.scale.setScalar(scale);
        mesh.position.copy(position);
        this.addExtra(mesh);
      }
      return true;
    }
    const bounds = measureBounds(base, deformed);
    const headY = (bounds.maxY - bounds.minY) * scale;
    const centerZ = bounds.centerZ * scale + position.z;
    for (const side of [-1, 1]) {
      const white = new this.THREE.Mesh(new this.THREE.SphereGeometry(.032, 24, 16), new this.THREE.MeshPhysicalMaterial({ color: 0xf3efe8, roughness: .25, clearcoat: .2 }));
      white.scale.set(1.18, .72, .55);
      white.position.set(side * .035, headY * .905, centerZ + .095);
      this.addExtra(white);
      const iris = new this.THREE.Mesh(new this.THREE.SphereGeometry(.011, 20, 12), new this.THREE.MeshPhysicalMaterial({ color: eyeColor, roughness: .35, clearcoat: .25 }));
      iris.position.set(side * .035, headY * .905, centerZ + .113);
      this.addExtra(iris);
    }
    return false;
  }

  private addExtra(object: any) {
    this.root.add(object);
    this.extras.push(object);
  }

  private clearMeshes() {
    if (this.body) {
      this.root.remove(this.body);
      this.body.geometry?.dispose?.();
      disposeMaterial(this.body.material);
      this.body = null;
    }
    for (const item of this.extras) {
      this.root.remove(item);
      item.geometry?.dispose?.();
      disposeMaterial(item.material);
    }
    this.extras = [];
  }

  private bindControls() {
    const down = (event: PointerEvent) => {
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.canvas.setPointerCapture?.(event.pointerId);
      if (this.pointers.size === 2) this.pinchDistance = pinch(this.pointers);
    };
    const move = (event: PointerEvent) => {
      const prev = this.pointers.get(event.pointerId);
      if (!prev) return;
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.pointers.size === 1) {
        this.yaw += (event.clientX - prev.x) * .008;
        this.root.rotation.y = this.yaw;
      } else if (this.pointers.size === 2) {
        const next = pinch(this.pointers);
        if (this.pinchDistance > 2 && next > 2) {
          this.distance = clamp(this.distance * this.pinchDistance / next, .85, 6);
          this.updateCamera(undefined, this.distance);
        }
        this.pinchDistance = next;
      }
    };
    const up = (event: PointerEvent) => {
      this.pointers.delete(event.pointerId);
      this.pinchDistance = this.pointers.size === 2 ? pinch(this.pointers) : 0;
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      this.distance = clamp(this.distance * Math.exp(event.deltaY * .001), .85, 6);
      this.updateCamera(undefined, this.distance);
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

  private updateCamera(targetY = Number(this.camera?.userData?.targetY ?? 1.05), distance = this.distance) {
    this.camera.userData.targetY = targetY;
    this.distance = distance;
    this.camera.position.set(0, targetY, distance);
    this.camera.lookAt(0, targetY, 0);
  }

  private resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
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
    this.clearMeshes();
    this.renderer.dispose();
  }
}

async function getBase() {
  if (!basePromise) basePromise = fetchMh('3dobjs/base.obj').then(({ text, route }) => ({ base: parseBaseObj(text), route }));
  return basePromise;
}

async function fetchMh(path: string): Promise<{ text: string; route: string }> {
  const failures: string[] = [];
  for (const route of MH_ROUTES) {
    const url = route(path);
    try {
      const response = await withTimeout(fetch(url, { mode: 'cors', cache: 'force-cache' }), 15000, `Timeout: ${url}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (text.length < 20) throw new Error('Празен MakeHuman файл');
      return { text, route: host(url) };
    } catch (cause) {
      failures.push(`${host(url)}: ${errorMessage(cause)}`);
    }
  }
  throw new Error(`HM08 ${path} не се зареди. ${failures.join(' | ')}`);
}

async function getOptionalTarget(path: string): Promise<Target | null> {
  let promise = targetCache.get(path);
  if (!promise) {
    promise = fetchMh(path).then(({ text }) => parseTarget(text)).catch(cause => {
      console.warn(`[character-resilient] optional target skipped: ${path}`, cause);
      return null;
    });
    targetCache.set(path, promise);
  }
  return promise;
}

async function weightedTargets(recipe: CharacterAppearanceRecipe) {
  const requests: Array<{ path: string; weight: number }> = [];
  const sex = recipe.body;
  const old = clamp((recipe.appearance.age - 32) / 38, 0, 1);
  requests.push({ path: `targets/macrodetails/caucasian-${sex}-young.target`, weight: 1 - old });
  if (old > .001) requests.push({ path: `targets/macrodetails/caucasian-${sex}-old.target`, weight: old });
  if (Math.abs(recipe.appearance.weight) > 0) {
    requests.push({
      path: `targets/macrodetails/universal-${sex}-young-averagemuscle-${recipe.appearance.weight > 0 ? 'maxweight' : 'minweight'}.target`,
      weight: Math.abs(recipe.appearance.weight) / 100 * .82
    });
  }
  if (Math.abs(recipe.appearance.muscle) > 0) {
    requests.push({
      path: `targets/macrodetails/universal-${sex}-young-${recipe.appearance.muscle > 0 ? 'maxmuscle' : 'minmuscle'}-averageweight.target`,
      weight: Math.abs(recipe.appearance.muscle) / 100 * .78
    });
  }
  appendMorphRequests(requests, recipe.morphs, BODY_TARGETS);
  appendMorphRequests(requests, recipe.faceMorphs, FACE_TARGETS);
  const loaded = await Promise.all(requests.map(async request => ({ ...request, target: await getOptionalTarget(request.path) })));
  const targets: WeightedTarget[] = loaded.filter(entry => Array.isArray(entry.target)).map(entry => ({ target: entry.target as Target, weight: entry.weight }));
  return { targets, missing: loaded.length - targets.length };
}

function appendMorphRequests(out: Array<{ path: string; weight: number }>, values: Record<string, number>, defs: Record<string, TargetDirection>) {
  for (const [key, raw] of Object.entries(values)) {
    const def = defs[key];
    if (!def || Math.abs(raw) < 1) continue;
    for (const path of raw > 0 ? def.inc : def.dec) out.push({ path, weight: Math.abs(raw) / 100 * (def.gain ?? 1) });
  }
}

function parseBaseObj(text: string): BaseMesh {
  const verts: number[][] = [];
  const uvs: number[][] = [];
  const tris: Tri[] = [];
  const eyeTris = { left: [] as Tri[], right: [] as Tri[] };
  let group = '';
  for (const raw of text.split(/\r?\n/)) {
    if (raw.startsWith('v ')) {
      const parts = raw.trim().split(/\s+/);
      verts.push([+parts[1], +parts[2], +parts[3]]);
    } else if (raw.startsWith('vt ')) {
      const parts = raw.trim().split(/\s+/);
      uvs.push([+parts[1], +parts[2]]);
    } else if (raw.startsWith('g ')) {
      group = raw.slice(2).trim();
    } else if (raw.startsWith('f ')) {
      const items = raw.trim().split(/\s+/).slice(1).map(part => {
        const [vertex, texture] = part.split('/');
        return [(+vertex) - 1, texture ? (+texture) - 1 : -1] as FaceRef;
      });
      const output = group === 'body' ? tris : group === 'helper-l-eye' ? eyeTris.left : group === 'helper-r-eye' ? eyeTris.right : null;
      if (output) for (let index = 1; index < items.length - 1; index += 1) output.push([items[0], items[index], items[index + 1]]);
    }
  }
  if (verts.length < 10000 || tris.length < 10000) throw new Error(`HM08 OBJ parse failed (${verts.length} vertices, ${tris.length} body triangles)`);
  return { verts, uvs, tris, eyeTris };
}

function parseTarget(text: string): Target {
  const output: Target = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 4) continue;
    const row: [number, number, number, number] = [+parts[0], +parts[1], +parts[2], +parts[3]];
    if (row.every(Number.isFinite)) output.push(row);
  }
  return output;
}

function applyTargets(base: BaseMesh, targets: WeightedTarget[]) {
  const verts = base.verts.map(vertex => vertex.slice());
  for (const entry of targets) for (const [index, x, y, z] of entry.target) {
    const point = verts[index];
    if (!point) continue;
    point[0] += x * entry.weight;
    point[1] += y * entry.weight;
    point[2] += z * entry.weight;
  }
  return verts;
}

function buildGeometry(THREE: any, base: BaseMesh, verts: number[][]) {
  const positions: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  const map = new Map<string, number>();
  for (const tri of base.tris) for (const [vertexIndex, textureIndex] of tri) {
    const key = `${vertexIndex}/${textureIndex}`;
    let nextIndex = map.get(key);
    if (nextIndex === undefined) {
      nextIndex = map.size;
      map.set(key, nextIndex);
      positions.push(...verts[vertexIndex]);
      const texture = base.uvs[textureIndex] ?? [0, 0];
      uv.push(texture[0], texture[1]);
    }
    indices.push(nextIndex);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function buildAuxGeometry(THREE: any, verts: number[][], tris: Tri[]) {
  const positions: number[] = [];
  const indices: number[] = [];
  const map = new Map<number, number>();
  for (const tri of tris) for (const [vertexIndex] of tri) {
    let nextIndex = map.get(vertexIndex);
    if (nextIndex === undefined) {
      nextIndex = map.size;
      map.set(vertexIndex, nextIndex);
      positions.push(...verts[vertexIndex]);
    }
    indices.push(nextIndex);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function measureBounds(base: BaseMesh, verts: number[][]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const used = new Set<number>();
  for (const tri of base.tris) for (const [index] of tri) used.add(index);
  for (const index of used) {
    const point = verts[index];
    if (!point) continue;
    minX = Math.min(minX, point[0]); maxX = Math.max(maxX, point[0]);
    minY = Math.min(minY, point[1]); maxY = Math.max(maxY, point[1]);
    minZ = Math.min(minZ, point[2]); maxZ = Math.max(maxZ, point[2]);
  }
  return { minX, maxX, minY, maxY, minZ, maxZ, centerX: (minX + maxX) / 2, centerZ: (minZ + maxZ) / 2 };
}

function canUseWebGL(canvas: HTMLCanvasElement) {
  try { return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl')); } catch { return false; }
}
function pinch(map: Map<number, { x: number; y: number }>) {
  const points = [...map.values()];
  return points.length < 2 ? 0 : Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}
function disposeMaterial(material: any) {
  if (Array.isArray(material)) material.forEach(item => item?.dispose?.()); else material?.dispose?.();
}
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function errorMessage(cause: unknown) { return cause instanceof Error ? cause.message : String(cause); }
function host(url: string) { try { return new URL(url).host; } catch { return url; } }
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
