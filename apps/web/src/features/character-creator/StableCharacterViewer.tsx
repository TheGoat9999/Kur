import { useEffect, useRef, useState } from 'react';
import type { CharacterAppearanceRecipe } from './characterRecipe';
import { getSystemAsset, type MakeHumanSystemAsset } from './systemAssets';

const THREE_MODULE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const MH_COMMIT = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482';
const MH_ROOT = 'makehuman/data';
const MH_ROUTES = [
  (path: string) => `https://cdn.jsdelivr.net/gh/makehumancommunity/makehuman@${MH_COMMIT}/${MH_ROOT}/${path}`,
  (path: string) => `https://raw.githubusercontent.com/makehumancommunity/makehuman/${MH_COMMIT}/${MH_ROOT}/${path}`
];
const ASSET_COMMIT = '8cf9645b975a98eea056b140df11a1d278da0d10';

const SKIN: Record<string, string> = {
  'light-neutral': '#c9967d', 'light-warm': '#bd856d', 'warm-medium': '#aa715b',
  'medium-neutral': '#97614e', 'medium-deep': '#7d4d3d', 'deep-warm': '#633b2f',
  'deep-neutral': '#4c2f29', dark: '#38231f'
};
const HAIR: Record<string, string> = {
  black: '#151311', 'soft-black': '#27211d', 'dark-brown': '#3c2b22', brown: '#644334',
  auburn: '#754032', copper: '#9a5d3a', blonde: '#b89a65', platinum: '#d0c8b5', gray: '#777b7d'
};

type TargetDirection = { dec: string[]; inc: string[]; gain?: number };
const measure = (dec: string, inc: string): TargetDirection => ({ dec: [`targets/measure/${dec}`], inc: [`targets/measure/${inc}`] });
const face = (dec: string[], inc: string[], gain: number): TargetDirection => ({ dec: dec.map(x => `targets/${x}`), inc: inc.map(x => `targets/${x}`), gain });

const BODY_TARGETS: Record<string, TargetDirection> = {
  shoulders: measure('measure-shoulder-dist-decr.target', 'measure-shoulder-dist-incr.target'),
  chest: measure('measure-bust-circ-decr.target', 'measure-bust-circ-incr.target'),
  waist: measure('measure-waist-circ-decr.target', 'measure-waist-circ-incr.target'),
  hips: measure('measure-hips-circ-decr.target', 'measure-hips-circ-incr.target'),
  upperArms: measure('measure-upperarm-circ-decr.target', 'measure-upperarm-circ-incr.target'),
  thighs: measure('measure-thigh-circ-decr.target', 'measure-thigh-circ-incr.target'),
  calves: measure('measure-calf-circ-decr.target', 'measure-calf-circ-incr.target'),
  armLength: { dec: ['targets/measure/measure-upperarm-length-decr.target', 'targets/measure/measure-lowerarm-length-decr.target'], inc: ['targets/measure/measure-upperarm-length-incr.target', 'targets/measure/measure-lowerarm-length-incr.target'] },
  legLength: { dec: ['targets/measure/measure-upperleg-height-decr.target', 'targets/measure/measure-lowerleg-height-decr.target'], inc: ['targets/measure/measure-upperleg-height-incr.target', 'targets/measure/measure-lowerleg-height-incr.target'] }
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

type FaceRef = [number, number];
type Tri = FaceRef[];
type BaseMesh = { verts: number[][]; uvs: number[][]; tris: Tri[]; eyeTris: { left: Tri[]; right: Tri[] } };
type Target = Array<[number, number, number, number]>;
type Mapping = { v: [number, number, number]; w: [number, number, number]; o: [number, number, number] };
type MHCLO = { objFile: string; scales: Array<[number, number, number] | null>; mappings: Mapping[] };
type Obj = { verts: number[][]; uvs: number[][]; tris: Array<Array<[number, number]>>; maxFaceVertex: number };
type EyeData = { meta: MHCLO; obj: Obj };
type HairData = { spec: MakeHumanSystemAsset; meta: MHCLO; obj: Obj };

type Bounds = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number; centerX: number; centerZ: number };
type Measures = {
  height: number;
  torsoHalf: number;
  torsoDepth: number;
  hipHalf: number;
  hipDepth: number;
  thighHalf: number;
  shoulderHalf: number;
  chestY: number;
  waistY: number;
  hipY: number;
  crotchY: number;
  ankleY: number;
  centerZ: number;
};

let basePromise: Promise<BaseMesh> | null = null;
let eyePromise: Promise<EyeData> | null = null;
const targetCache = new Map<string, Promise<Target>>();
const hairCache = new Map<string, Promise<HairData>>();

export function StableCharacterViewer({ recipe, focus = 'full' }: { recipe: CharacterAppearanceRecipe; focus?: 'full' | 'face' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<StableRuntime | null>(null);
  const [status, setStatus] = useState('Зареждане на стабилния модел…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    void (async () => {
      try {
        const THREE = await import(/* @vite-ignore */ THREE_MODULE_URL);
        if (cancelled) return;
        const runtime = new StableRuntime(THREE, canvas);
        runtimeRef.current = runtime;
        const summary = await runtime.rebuild(recipe);
        if (cancelled) return runtime.dispose();
        setFailed(summary.eyeFallback);
        setStatus(summary.eyeFallback ? 'HM08 стабилен · резервни очи · чисти дрехи' : 'HM08 стабилен · оригинални очи · чисти дрехи');
      } catch (error) {
        console.error('[character-stable] init failed', error);
        if (!cancelled) {
          setFailed(true);
          setStatus(error instanceof Error ? error.message : 'Грешка при зареждане на героя');
        }
      }
    })();
    return () => { cancelled = true; runtimeRef.current?.dispose(); runtimeRef.current = null; };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    setStatus('Прилагане на промените…');
    void runtime.rebuild(recipe).then(summary => {
      setFailed(summary.eyeFallback);
      setStatus(summary.eyeFallback ? 'HM08 стабилен · резервни очи · чисти дрехи' : 'HM08 стабилен · оригинални очи · чисти дрехи');
    }).catch(error => {
      console.error('[character-stable] rebuild failed', error);
      setFailed(true);
      setStatus(error instanceof Error ? error.message : 'Грешка при обновяване на героя');
    });
  }, [recipe]);

  useEffect(() => { runtimeRef.current?.setFocus(focus); }, [focus]);

  return <div className="relative h-full min-h-[440px] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_18%,#29373d,#111a1f_55%,#0a1014)]">
    <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label="Триизмерен преглед на героя" />
    <div className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-[10px] font-bold tracking-[.08em] backdrop-blur ${failed ? 'border-amber-300/30 bg-amber-950/60 text-amber-100' : 'border-emerald-300/20 bg-black/45 text-emerald-200'}`}>{status}</div>
    <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/35 px-2 py-1 text-[9px] uppercase tracking-[.11em] text-slate-400 backdrop-blur">Плъзни за завъртане · колелце или щипване за мащаб</div>
  </div>;
}

class StableRuntime {
  private renderer: any;
  private scene: any;
  private camera: any;
  private root: any;
  private body: any = null;
  private extras: any[] = [];
  private textures = new Set<any>();
  private frame = 0;
  private observer: ResizeObserver;
  private rebuildId = 0;
  private yaw = 0;
  private distance = 4.25;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDistance = 0;
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
    this.scene.add(new THREE.HemisphereLight(0xe6f1f4, 0x202b31, 1.45));
    const key = new THREE.DirectionalLight(0xffdcc5, 3.0); key.position.set(3.5, 5.2, 4.7); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xb8d8ea, 1.2); fill.position.set(-4, 3, 2.5); this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffc6ad, .9); rim.position.set(-2, 4, -4); this.scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshStandardMaterial({ color: 0x222d32, roughness: .95 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.01; this.scene.add(floor);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement!);
    this.resize(); this.bindControls(); this.animate(); this.updateCamera(1.05);
  }

  async rebuild(recipe: CharacterAppearanceRecipe) {
    const id = ++this.rebuildId;
    const base = await getBase();
    const targets = await weightedTargets(recipe);
    if (id !== this.rebuildId) return { eyeFallback: false };
    const deformed = applyTargets(base, targets);
    const geometry = buildGeometry(this.THREE, base, deformed);
    const bounds = measureBounds(base, deformed);
    const heightScale = 1 + (recipe.appearance.height / 100) * .085;
    const scale = (2.02 * heightScale) / Math.max(bounds.maxY - bounds.minY, .001);
    const position = new this.THREE.Vector3(-bounds.centerX * scale, -bounds.minY * scale, -bounds.centerZ * scale);

    this.clearMeshes();
    this.body = new this.THREE.Mesh(geometry, new this.THREE.MeshPhysicalMaterial({ color: SKIN[recipe.appearance.skinTone] ?? SKIN['warm-medium'], roughness: .64, metalness: 0, sheen: .08, sheenColor: 0xffd9c5 }));
    this.body.scale.setScalar(scale); this.body.position.copy(position); this.root.add(this.body);

    let eyeFallback = false;
    try { await this.addNativeEyes(deformed, scale, position); }
    catch (error) { console.warn('[character-stable] native eyes failed', error); eyeFallback = true; this.addFallbackEyes(base, deformed, scale, position); }

    const measures = measureBodyRegions(deformed, bounds, scale, position);
    this.addProceduralClothes(recipe, measures);

    if (recipe.grooming.hairStyle && recipe.grooming.hairStyle !== 'bald') {
      try { await this.addHair(recipe, deformed, scale, position); }
      catch (error) { console.warn('[character-stable] hair failed', error); }
    }

    return { eyeFallback };
  }

  setFocus(focus: 'full' | 'face') { this.updateCamera(focus === 'face' ? 1.72 : 1.05, focus === 'face' ? 1.35 : 4.25); }

  private async addNativeEyes(deformed: number[][], scale: number, position: any) {
    const eye = await getEyes();
    const fitted = fitMHCLO(eye.meta.mappings, deformed, eye.meta.scales);
    const geometry = buildAccessoryGeometry(this.THREE, eye.obj, fitted);
    const texture = await this.loadTexture(MH_ROUTES[1]('eyes/materials/brown_eye.png'));
    texture.colorSpace = this.THREE.SRGBColorSpace;
    const material = new this.THREE.MeshPhysicalMaterial({ map: texture, color: 0xffffff, roughness: .28, metalness: 0, clearcoat: .2, clearcoatRoughness: .15, transparent: true, alphaTest: .03, side: this.THREE.DoubleSide });
    const mesh = new this.THREE.Mesh(geometry, material);
    mesh.scale.setScalar(scale); mesh.position.copy(position); this.addExtra(mesh);
  }

  private addFallbackEyes(base: BaseMesh, deformed: number[][], scale: number, position: any) {
    for (const tris of [base.eyeTris.left, base.eyeTris.right]) {
      if (!tris.length) continue;
      const geometry = buildAuxGeometry(this.THREE, deformed, tris);
      const mesh = new this.THREE.Mesh(geometry, new this.THREE.MeshPhysicalMaterial({ color: 0xe9e4dc, roughness: .3, clearcoat: .15 }));
      mesh.scale.setScalar(scale); mesh.position.copy(position); this.addExtra(mesh);
    }
  }

  private addProceduralClothes(recipe: CharacterAppearanceRecipe, m: Measures) {
    const equipped = new Set(Object.values(recipe.grooming.equipped).filter(Boolean));
    const outfit = [...equipped].find(id => id.includes('casualsuit') || id.includes('elegantsuit') || id.includes('worksuit') || id.includes('sportsuit'));
    if (outfit) this.addOutfit(outfit, m, recipe.body);
    const shoes = [...equipped].find(id => id.startsWith('shoes'));
    if (shoes) this.addShoes(shoes, m);
  }

  private addOutfit(id: string, m: Measures, sex: 'male' | 'female') {
    const elegant = id.includes('elegant');
    const work = id.includes('work');
    const sport = id.includes('sport');
    const palette = work ? ['#39464d', '#263137'] : elegant ? ['#20262b', '#171b1f'] : sport ? ['#353b42', '#252a30'] : ['#343c43', '#252c32'];
    const topMat = this.clothMaterial(palette[0], elegant ? 'fine' : 'cotton');
    const bottomMat = this.clothMaterial(palette[1], 'twill');
    const shirtHeight = Math.max(.42, m.chestY - m.waistY + .22);
    const shirtY = (m.chestY + m.waistY) / 2 + .02;
    const upperR = m.torsoHalf * (elegant ? 1.09 : 1.055);
    const lowerR = Math.max(m.hipHalf * .82, m.torsoHalf * .86) * (elegant ? 1.06 : 1.025);
    const torso = new this.THREE.Mesh(new this.THREE.CylinderGeometry(upperR, lowerR, shirtHeight, 48, 6, false), topMat);
    torso.position.set(0, shirtY, m.centerZ); torso.scale.z = Math.max(.52, m.torsoDepth / upperR * 1.12); this.addExtra(torso);

    const sleeveLen = sex === 'female' ? .19 : .22;
    const sleeveR = Math.max(.075, m.torsoHalf * .22);
    for (const side of [-1, 1]) {
      const sleeve = new this.THREE.Mesh(new this.THREE.CylinderGeometry(sleeveR * .92, sleeveR, sleeveLen, 28, 2), topMat);
      sleeve.position.set(side * (m.shoulderHalf + sleeveLen * .27), m.chestY + .06, m.centerZ);
      sleeve.rotation.z = side * -1.08; sleeve.scale.z = .88; this.addExtra(sleeve);
    }

    const hipHeight = .23;
    const hip = new this.THREE.Mesh(new this.THREE.CylinderGeometry(m.hipHalf * 1.025, m.hipHalf * .96, hipHeight, 40, 4), bottomMat);
    hip.position.set(0, m.hipY - .08, m.centerZ); hip.scale.z = Math.max(.55, m.hipDepth / Math.max(m.hipHalf, .01) * 1.1); this.addExtra(hip);

    const legHeight = Math.max(.56, m.crotchY - m.ankleY);
    const legY = (m.crotchY + m.ankleY) / 2;
    const legOffset = Math.max(.09, m.hipHalf * .48);
    for (const side of [-1, 1]) {
      const leg = new this.THREE.Mesh(new this.THREE.CylinderGeometry(Math.max(.075, m.thighHalf * .74), Math.max(.09, m.thighHalf), legHeight, 36, 6), bottomMat);
      leg.position.set(side * legOffset, legY, m.centerZ); leg.scale.z = .78; this.addExtra(leg);
    }

    if (work) {
      const bib = new this.THREE.Mesh(new this.THREE.BoxGeometry(m.torsoHalf * 1.05, .28, .035), this.clothMaterial('#46535a', 'twill'));
      bib.position.set(0, m.waistY + .28, m.centerZ + m.torsoDepth * .53); this.addExtra(bib);
      for (const side of [-1, 1]) {
        const strap = new this.THREE.Mesh(new this.THREE.BoxGeometry(.045, .36, .025), this.clothMaterial('#46535a', 'twill'));
        strap.position.set(side * m.torsoHalf * .48, m.waistY + .48, m.centerZ + m.torsoDepth * .55); strap.rotation.z = side * .10; this.addExtra(strap);
      }
    }

    if (elegant) {
      const lapelMat = this.clothMaterial('#2b3136', 'fine');
      for (const side of [-1, 1]) {
        const lapel = new this.THREE.Mesh(new this.THREE.BoxGeometry(.08, .32, .022), lapelMat);
        lapel.position.set(side * .07, m.chestY - .04, m.centerZ + m.torsoDepth * .57); lapel.rotation.z = side * .38; this.addExtra(lapel);
      }
    }
  }

  private addShoes(id: string, m: Measures) {
    const color = id === 'shoes03' ? '#14171a' : id === 'shoes02' ? '#5b5149' : '#262a2e';
    const mat = new this.THREE.MeshPhysicalMaterial({ color, roughness: .55, metalness: .02, clearcoat: .05 });
    for (const side of [-1, 1]) {
      const shoe = new this.THREE.Mesh(new this.THREE.SphereGeometry(.15, 32, 18), mat);
      shoe.scale.set(1.05, .48, 1.65); shoe.position.set(side * Math.max(.11, m.hipHalf * .46), .075, m.centerZ + .055); this.addExtra(shoe);
    }
  }

  private clothMaterial(color: string, kind: 'cotton' | 'twill' | 'fine') {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(0, 0, 64, 64);
    ctx.globalAlpha = kind === 'fine' ? .06 : .09; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    const step = kind === 'twill' ? 6 : 8;
    for (let i = -64; i < 128; i += step) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - 64, 64); ctx.stroke(); }
    ctx.globalAlpha = .05; ctx.strokeStyle = '#000000';
    for (let y = 0; y < 64; y += 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke(); }
    const texture = new this.THREE.CanvasTexture(canvas); texture.colorSpace = this.THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = this.THREE.RepeatWrapping; texture.repeat.set(3, 3); this.textures.add(texture);
    return new this.THREE.MeshPhysicalMaterial({ map: texture, color: 0xffffff, roughness: kind === 'fine' ? .72 : .86, metalness: 0, sheen: .08, sheenColor: new this.THREE.Color(color) });
  }

  private async addHair(recipe: CharacterAppearanceRecipe, deformed: number[][], scale: number, position: any) {
    const spec = getSystemAsset(recipe.grooming.hairStyle); if (!spec || spec.kind !== 'hair') return;
    const data = await getHair(spec); const fitted = fitMHCLO(data.meta.mappings, deformed, data.meta.scales); const geometry = buildAccessoryGeometry(this.THREE, data.obj, fitted);
    const mesh = new this.THREE.Mesh(geometry, new this.THREE.MeshStandardMaterial({ color: HAIR[recipe.grooming.hairColor] ?? HAIR['dark-brown'], roughness: .78, side: this.THREE.DoubleSide }));
    mesh.scale.setScalar(scale); mesh.position.copy(position); this.addExtra(mesh);
  }

  private loadTexture(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      new this.THREE.TextureLoader().load(url, (texture: any) => { this.textures.add(texture); resolve(texture); }, undefined, reject);
    });
  }

  private addExtra(object: any) { this.root.add(object); this.extras.push(object); }
  private clearMeshes() {
    if (this.body) { this.root.remove(this.body); this.body.geometry?.dispose?.(); disposeMaterial(this.body.material); this.body = null; }
    for (const item of this.extras) { this.root.remove(item); item.geometry?.dispose?.(); disposeMaterial(item.material); }
    this.extras = [];
  }

  private bindControls() {
    const down = (e: PointerEvent) => { this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.canvas.setPointerCapture?.(e.pointerId); if (this.pointers.size === 2) this.pinchDistance = pinch(this.pointers); };
    const move = (e: PointerEvent) => {
      const prev = this.pointers.get(e.pointerId); if (!prev) return; this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) { this.yaw += (e.clientX - prev.x) * .008; this.root.rotation.y = this.yaw; }
      else if (this.pointers.size === 2) { const next = pinch(this.pointers); if (this.pinchDistance > 2 && next > 2) { this.distance = clamp(this.distance * this.pinchDistance / next, .85, 6); this.updateCamera(); } this.pinchDistance = next; }
    };
    const up = (e: PointerEvent) => { this.pointers.delete(e.pointerId); this.pinchDistance = this.pointers.size === 2 ? pinch(this.pointers) : 0; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); this.distance = clamp(this.distance * Math.exp(e.deltaY * .001), .85, 6); this.updateCamera(); };
    this.canvas.addEventListener('pointerdown', down); this.canvas.addEventListener('pointermove', move); this.canvas.addEventListener('pointerup', up); this.canvas.addEventListener('pointercancel', up); this.canvas.addEventListener('wheel', wheel, { passive: false });
    this.cleanup.push(() => this.canvas.removeEventListener('pointerdown', down), () => this.canvas.removeEventListener('pointermove', move), () => this.canvas.removeEventListener('pointerup', up), () => this.canvas.removeEventListener('pointercancel', up), () => this.canvas.removeEventListener('wheel', wheel));
  }

  private updateCamera(targetY = Number(this.camera.userData.targetY ?? 1.05), distance = this.distance) { this.camera.userData.targetY = targetY; this.distance = distance; this.camera.position.set(0, targetY, distance); this.camera.lookAt(0, targetY, 0); }
  private resize() { const parent = this.canvas.parentElement; if (!parent) return; const w = Math.max(1, parent.clientWidth), h = Math.max(1, parent.clientHeight); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  private animate = () => { this.frame = requestAnimationFrame(this.animate); this.renderer.render(this.scene, this.camera); };
  dispose() { cancelAnimationFrame(this.frame); this.observer.disconnect(); this.cleanup.forEach(fn => fn()); this.clearMeshes(); this.textures.forEach(t => t.dispose?.()); this.textures.clear(); this.renderer.dispose(); }
}

function pinch(map: Map<number, { x: number; y: number }>) { const p = [...map.values()]; return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

async function getBase() { if (!basePromise) basePromise = fetchMh('3dobjs/base.obj').then(parseBaseObj); return basePromise; }
async function getEyes() {
  if (!eyePromise) eyePromise = Promise.all([fetchMh('eyes/high-poly/high-poly.mhclo'), fetchMh('eyes/high-poly/high-poly.obj')]).then(([m, o]) => ({ meta: parseMHCLO(m), obj: parseObj(o) }));
  return eyePromise;
}
async function getTarget(path: string) { let p = targetCache.get(path); if (!p) { p = fetchMh(path).then(parseTarget); targetCache.set(path, p); } return p; }
async function fetchMh(path: string) { let last: unknown; for (const route of MH_ROUTES) { try { const r = await fetch(route(path), { cache: 'force-cache' }); if (!r.ok) throw new Error(`HTTP ${r.status}`); const text = await r.text(); if (text.length < 20) throw new Error('Празен MakeHuman файл'); return text; } catch (e) { last = e; } } throw last instanceof Error ? last : new Error(`Неуспешно зареждане: ${path}`); }

function parseBaseObj(text: string): BaseMesh {
  const verts: number[][] = [], uvs: number[][] = [], tris: Tri[] = []; const eyeTris = { left: [] as Tri[], right: [] as Tri[] }; let group = '';
  for (const raw of text.split(/\r?\n/)) {
    if (raw.startsWith('v ')) { const a = raw.trim().split(/\s+/); verts.push([+a[1], +a[2], +a[3]]); }
    else if (raw.startsWith('vt ')) { const a = raw.trim().split(/\s+/); uvs.push([+a[1], +a[2]]); }
    else if (raw.startsWith('g ')) group = raw.slice(2).trim();
    else if (raw.startsWith('f ')) {
      const items = raw.trim().split(/\s+/).slice(1).map(p => { const [v, t] = p.split('/'); return [(+v) - 1, t ? (+t) - 1 : -1] as FaceRef; });
      const out = group === 'body' ? tris : group === 'helper-l-eye' ? eyeTris.left : group === 'helper-r-eye' ? eyeTris.right : null;
      if (out) for (let i = 1; i < items.length - 1; i++) out.push([items[0], items[i], items[i + 1]]);
    }
  }
  if (verts.length < 10000 || tris.length < 10000) throw new Error('HM08 геометрията не може да се прочете');
  return { verts, uvs, tris, eyeTris };
}

function parseTarget(text: string): Target { const out: Target = []; for (const raw of text.split(/\r?\n/)) { const line = raw.trim(); if (!line || line.startsWith('#')) continue; const a = line.split(/\s+/); if (a.length < 4) continue; const row: [number, number, number, number] = [+a[0], +a[1], +a[2], +a[3]]; if (row.every(Number.isFinite)) out.push(row); } return out; }

async function weightedTargets(recipe: CharacterAppearanceRecipe) {
  const sex = recipe.body; const age = recipe.appearance.age; const old = clamp((age - 32) / 38, 0, 1); const out: Array<{ target: Target; weight: number }> = [];
  out.push({ target: await getTarget(`targets/macrodetails/caucasian-${sex}-young.target`), weight: 1 - old });
  if (old > .001) out.push({ target: await getTarget(`targets/macrodetails/caucasian-${sex}-old.target`), weight: old });
  if (Math.abs(recipe.appearance.weight) > 0) out.push({ target: await getTarget(`targets/macrodetails/universal-${sex}-young-averagemuscle-${recipe.appearance.weight > 0 ? 'maxweight' : 'minweight'}.target`), weight: Math.abs(recipe.appearance.weight) / 100 * .82 });
  if (Math.abs(recipe.appearance.muscle) > 0) out.push({ target: await getTarget(`targets/macrodetails/universal-${sex}-young-${recipe.appearance.muscle > 0 ? 'maxmuscle' : 'minmuscle'}-averageweight.target`), weight: Math.abs(recipe.appearance.muscle) / 100 * .78 });
  await appendMorphs(out, recipe.morphs, BODY_TARGETS); await appendMorphs(out, recipe.faceMorphs, FACE_TARGETS); return out;
}
async function appendMorphs(out: Array<{ target: Target; weight: number }>, values: Record<string, number>, defs: Record<string, TargetDirection>) { for (const [key, raw] of Object.entries(values)) { const d = defs[key]; if (!d || Math.abs(raw) < 1) continue; for (const path of raw > 0 ? d.inc : d.dec) out.push({ target: await getTarget(path), weight: Math.abs(raw) / 100 * (d.gain ?? 1) }); } }
function applyTargets(base: BaseMesh, targets: Array<{ target: Target; weight: number }>) { const verts = base.verts.map(v => v.slice()); for (const e of targets) for (const [i, x, y, z] of e.target) { const p = verts[i]; if (p) { p[0] += x * e.weight; p[1] += y * e.weight; p[2] += z * e.weight; } } return verts; }

function buildGeometry(THREE: any, base: BaseMesh, verts: number[][]) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = []; const map = new Map<string, number>();
  for (const tri of base.tris) for (const [vi, ti] of tri) { const key = `${vi}/${ti}`; let n = map.get(key); if (n === undefined) { n = map.size; map.set(key, n); pos.push(...verts[vi]); const t = base.uvs[ti] ?? [0, 0]; uv.push(t[0], t[1]); } idx.push(n); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
function buildAuxGeometry(THREE: any, verts: number[][], tris: Tri[]) { const pos: number[] = [], idx: number[] = []; const map = new Map<number, number>(); for (const tri of tris) for (const [vi] of tri) { let n = map.get(vi); if (n === undefined) { n = map.size; map.set(vi, n); pos.push(...verts[vi]); } idx.push(n); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }

function measureBounds(base: BaseMesh, verts: number[][]): Bounds { const used = new Set<number>(); for (const tri of base.tris) for (const [vi] of tri) used.add(vi); let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity; for (const i of used) { const p = verts[i]; minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); minZ = Math.min(minZ, p[2]); maxZ = Math.max(maxZ, p[2]); } return { minX, maxX, minY, maxY, minZ, maxZ, centerX: (minX + maxX) / 2, centerZ: (minZ + maxZ) / 2 }; }
function measureBodyRegions(verts: number[][], b: Bounds, scale: number, position: any): Measures {
  const h = b.maxY - b.minY; const worldY = (f: number) => (b.minY + h * f) * scale + position.y;
  const region = (a: number, c: number, xLimit = .22) => { let mx = 0, minZ = Infinity, maxZ = -Infinity; for (const p of verts) { const f = (p[1] - b.minY) / h; if (f < a || f > c || Math.abs(p[0] - b.centerX) > h * xLimit) continue; mx = Math.max(mx, Math.abs(p[0] - b.centerX)); minZ = Math.min(minZ, p[2]); maxZ = Math.max(maxZ, p[2]); } return { half: mx * scale, depth: (maxZ - minZ) * scale, centerZ: ((minZ + maxZ) / 2) * scale + position.z }; };
  const torso = region(.56, .75, .20), hip = region(.45, .57, .18), thigh = region(.28, .48, .12), shoulder = region(.69, .78, .27);
  return { height: h * scale, torsoHalf: Math.max(.22, torso.half), torsoDepth: Math.max(.18, torso.depth), hipHalf: Math.max(.20, hip.half), hipDepth: Math.max(.18, hip.depth), thighHalf: Math.max(.10, thigh.half / 2), shoulderHalf: Math.max(.25, shoulder.half), chestY: worldY(.69), waistY: worldY(.55), hipY: worldY(.48), crotchY: worldY(.43), ankleY: worldY(.09), centerZ: Number.isFinite(torso.centerZ) ? torso.centerZ : 0 };
}

function parseMHCLO(text: string): MHCLO { const out: MHCLO = { objFile: '', scales: [null, null, null], mappings: [] }; let mode = ''; for (const raw of text.split(/\r?\n/)) { const line = raw.trim(); if (!line || line.startsWith('#')) continue; const p = line.split(/\s+/); if (p[0] === 'obj_file') { out.objFile = p.slice(1).join(' '); mode = ''; } else if (['x_scale', 'y_scale', 'z_scale'].includes(p[0])) { const d = p[0][0] === 'x' ? 0 : p[0][0] === 'y' ? 1 : 2; out.scales[d] = [+p[1], +p[2], +p[3]]; mode = ''; } else if (p[0] === 'verts') mode = 'verts'; else if (['delete_verts', 'weights'].includes(p[0])) mode = p[0]; else if (mode === 'verts' && /^\d+$/.test(p[0])) { if (p.length === 1) out.mappings.push({ v: [+p[0], 0, 0], w: [1, 0, 0], o: [0, 0, 0] }); else if (p.length >= 6) out.mappings.push({ v: [+p[0], +p[1], +p[2]], w: [+p[3], +p[4], +p[5]], o: [+(p[6] || 0), +(p[7] || 0), +(p[8] || 0)] }); } } if (!out.objFile || out.mappings.length < 20) throw new Error('Невалиден MHCLO'); return out; }
function parseObj(text: string): Obj { const verts: number[][] = [], uvs: number[][] = [], tris: Array<Array<[number, number]>> = []; let maxFaceVertex = -1; for (const raw of text.split(/\r?\n/)) { if (raw.startsWith('v ')) { const a = raw.trim().split(/\s+/); verts.push([+a[1], +a[2], +a[3]]); } else if (raw.startsWith('vt ')) { const a = raw.trim().split(/\s+/); uvs.push([+a[1], +a[2]]); } else if (raw.startsWith('f ')) { const parts = raw.trim().split(/\s+/).slice(1).map(x => { const b = x.split('/'); let vi = +b[0], ti = b[1] ? +b[1] : 0; vi = vi < 0 ? verts.length + vi : vi - 1; ti = ti < 0 ? uvs.length + ti : ti - 1; maxFaceVertex = Math.max(maxFaceVertex, vi); return [vi, ti] as [number, number]; }); for (let i = 1; i < parts.length - 1; i++) tris.push([parts[0], parts[i], parts[i + 1]]); } } return { verts, uvs, tris, maxFaceVertex }; }
function fitMHCLO(mappings: Mapping[], deformed: number[][], scales: Array<[number, number, number] | null>) { const s = [1, 1, 1]; for (let d = 0; d < 3; d++) { const x = scales[d]; if (x && deformed[x[0]] && deformed[x[1]] && Math.abs(x[2]) > 1e-6) s[d] = Math.abs(deformed[x[0]][d] - deformed[x[1]][d]) / Math.abs(x[2]); } return mappings.map(m => { const p = [0, 0, 0]; for (let i = 0; i < 3; i++) { const b = deformed[m.v[i]]; if (!b) continue; p[0] += b[0] * m.w[i]; p[1] += b[1] * m.w[i]; p[2] += b[2] * m.w[i]; } p[0] += m.o[0] * s[0]; p[1] += m.o[1] * s[1]; p[2] += m.o[2] * s[2]; return p; }); }
function buildAccessoryGeometry(THREE: any, obj: Obj, fitted: number[][]) { const pos: number[] = [], uv: number[] = [], idx: number[] = []; const map = new Map<string, number>(); for (const tri of obj.tris) { if (tri.some(([vi]) => !fitted[vi])) continue; for (const [vi, ti] of tri) { const key = `${vi}/${ti}`; let n = map.get(key); if (n === undefined) { n = map.size; map.set(key, n); pos.push(...fitted[vi]); const t = obj.uvs[ti] ?? [0, 0]; uv.push(t[0], t[1]); } idx.push(n); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; }

async function getHair(spec: MakeHumanSystemAsset): Promise<HairData> { let p = hairCache.get(spec.id); if (!p) { p = (async () => { const base = spec.fileBase ?? spec.id; const root = `${spec.directory}/${spec.id}`; const mhclo = await fetchAsset(`${root}/${base}.mhclo`); const meta = parseMHCLO(mhclo); const obj = parseObj(await fetchAsset(`${root}/${meta.objFile || `${base}.obj`}`)); return { spec, meta, obj }; })(); hairCache.set(spec.id, p); } return p; }
async function fetchAsset(path: string) { const urls = [`https://cdn.jsdelivr.net/gh/furqonat/makehuman-assets@${ASSET_COMMIT}/${path}`, `https://raw.githubusercontent.com/furqonat/makehuman-assets/${ASSET_COMMIT}/${path}`]; let last: unknown; for (const url of urls) { try { const r = await fetch(url, { cache: 'force-cache' }); if (!r.ok) throw new Error(`HTTP ${r.status}`); const t = await r.text(); if (t.length < 20) throw new Error('Празен asset'); return t; } catch (e) { last = e; } } throw last instanceof Error ? last : new Error('Asset load failed'); }
function disposeMaterial(material: any) { if (Array.isArray(material)) material.forEach(m => m?.dispose?.()); else material?.dispose?.(); }
