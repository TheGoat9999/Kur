import { useEffect, useRef, useState, type ReactNode } from 'react';
import './world-vehicle-3d.css';

const THREE_MODULE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const MODEL_URL = '/assets/vehicles/meshy/fast-74-world-lod.glb?v=20260822-meshy-spike-1';
const MAX_PIXEL_RATIO = 1.5;

type VehicleHeading = 'east' | 'west';
type ThreeRuntime = Record<string, any>;
type GlbJson = {
  accessors: Array<Record<string, any>>;
  bufferViews: Array<Record<string, any>>;
  images?: Array<Record<string, any>>;
  materials?: Array<Record<string, any>>;
  textures?: Array<Record<string, any>>;
  meshes: Array<{ primitives: Array<Record<string, any>> }>;
};

type LoadedModel = {
  root: any;
  material: any;
  texture: any;
  geometries: any[];
  objectUrl: string | null;
};

export function WorldVehicle3D({
  heading = 'east',
  compact = false,
  className = '',
  fallback
}: {
  heading?: VehicleHeading;
  compact?: boolean;
  className?: string;
  fallback: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headingRef = useRef(heading);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  headingRef.current = heading;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let renderer: any = null;
    let model: LoadedModel | null = null;

    void (async () => {
      try {
        const THREE = await import(/* @vite-ignore */ THREE_MODULE_URL) as ThreeRuntime;
        if (disposed) return;

        const response = await fetch(MODEL_URL, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`3D vehicle HTTP ${response.status}`);
        const parsed = parseGlb(await response.arrayBuffer());
        if (disposed) return;

        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance'
        });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
        if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
        camera.position.set(0, 0.15, 3);
        camera.lookAt(0, 0, 0);

        model = await buildModel(THREE, parsed.json, parsed.binary);
        fitVehicleModel(THREE, model.root);
        scene.add(model.root);

        const resize = () => {
          const width = Math.max(1, canvas.clientWidth);
          const height = Math.max(1, canvas.clientHeight);
          renderer.setSize(width, height, false);
          const aspect = width / height;
          const halfHeight = compact ? 0.58 : 0.43;
          camera.left = -halfHeight * aspect;
          camera.right = halfHeight * aspect;
          camera.top = halfHeight;
          camera.bottom = -halfHeight;
          camera.updateProjectionMatrix();
        };
        resize();
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);

        const tick = () => {
          if (disposed) return;
          model!.root.rotation.y = compact
            ? (headingRef.current === 'east' ? Math.PI / 2 : -Math.PI / 2)
            : Math.PI / 2 - 0.26;
          renderer.render(scene, camera);
          frame = window.requestAnimationFrame(tick);
        };

        setStatus('ready');
        frame = window.requestAnimationFrame(tick);
      } catch (error) {
        console.warn('[WorldVehicle3D] Falling back to vehicle artwork.', error);
        if (!disposed) setStatus('failed');
      }
    })();

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      model?.geometries.forEach(geometry => geometry.dispose?.());
      model?.material?.dispose?.();
      model?.texture?.dispose?.();
      if (model?.objectUrl) URL.revokeObjectURL(model.objectUrl);
      renderer?.dispose?.();
    };
  }, [compact]);

  return (
    <span
      className={`world-vehicle-3d world-vehicle-3d-${status} ${compact ? 'world-vehicle-3d-compact' : 'world-vehicle-3d-showroom'} ${className}`.trim()}
      aria-hidden="true"
      data-renderer="meshy-glb-spike"
    >
      <span className="world-vehicle-3d-fallback">{fallback}</span>
      <canvas ref={canvasRef} className="world-vehicle-3d-canvas" />
    </span>
  );
}

function parseGlb(buffer: ArrayBuffer): { json: GlbJson; binary: ArrayBuffer } {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('Invalid GLB magic');
  if (view.getUint32(4, true) !== 2) throw new Error('Unsupported GLB version');

  let offset = 12;
  let json: GlbJson | null = null;
  let binary: ArrayBuffer | null = null;
  while (offset + 8 <= buffer.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const end = start + length;
    if (end > buffer.byteLength) throw new Error('Invalid GLB chunk length');
    if (type === 0x4e4f534a) {
      const text = new TextDecoder().decode(new Uint8Array(buffer, start, length)).trim();
      json = JSON.parse(text) as GlbJson;
    } else if (type === 0x004e4942) {
      binary = buffer.slice(start, end);
    }
    offset = end;
  }

  if (!json || !binary) throw new Error('GLB is missing JSON or BIN chunk');
  return { json, binary };
}

async function buildModel(THREE: ThreeRuntime, gltf: GlbJson, binary: ArrayBuffer): Promise<LoadedModel> {
  const textureInfo = gltf.materials?.[0]?.pbrMetallicRoughness?.baseColorTexture;
  const textureDef = textureInfo ? gltf.textures?.[textureInfo.index] : null;
  const imageDef = textureDef ? gltf.images?.[textureDef.source] : null;
  let texture: any = null;
  let objectUrl: string | null = null;

  if (imageDef?.bufferView !== undefined) {
    const view = gltf.bufferViews[imageDef.bufferView];
    const bytes = new Uint8Array(binary, view.byteOffset ?? 0, view.byteLength);
    objectUrl = URL.createObjectURL(new Blob([bytes], { type: imageDef.mimeType ?? 'image/png' }));
    texture = await new THREE.TextureLoader().loadAsync(objectUrl);
    texture.flipY = false;
    if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }

  const root = new THREE.Group();
  const geometries: any[] = [];
  const sourceMesh = gltf.meshes[0];
  if (!sourceMesh) throw new Error('GLB has no mesh');
  const hasVertexColors = sourceMesh.primitives.some(primitive => primitive.attributes.COLOR_0 !== undefined);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    vertexColors: hasVertexColors,
    color: 0xffffff,
    side: THREE.DoubleSide,
    toneMapped: false
  });

  for (const primitive of sourceMesh.primitives) {
    const geometry = new THREE.BufferGeometry();
    const position = typedAccessor(gltf, binary, primitive.attributes.POSITION);
    geometry.setAttribute('position', new THREE.BufferAttribute(position.array, position.itemSize, position.normalized));
    if (primitive.attributes.TEXCOORD_0 !== undefined) {
      const uv = typedAccessor(gltf, binary, primitive.attributes.TEXCOORD_0);
      geometry.setAttribute('uv', new THREE.BufferAttribute(uv.array, uv.itemSize, uv.normalized));
    }
    if (primitive.attributes.COLOR_0 !== undefined) {
      const color = typedAccessor(gltf, binary, primitive.attributes.COLOR_0);
      geometry.setAttribute('color', new THREE.BufferAttribute(color.array, color.itemSize, color.normalized));
    }
    if (primitive.indices !== undefined) {
      const indices = typedAccessor(gltf, binary, primitive.indices);
      geometry.setIndex(new THREE.BufferAttribute(indices.array, 1, false));
    }
    geometry.computeBoundingBox();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    root.add(mesh);
    geometries.push(geometry);
  }

  return { root, material, texture, geometries, objectUrl };
}

function typedAccessor(gltf: GlbJson, binary: ArrayBuffer, accessorIndex: number) {
  const accessor = gltf.accessors[accessorIndex];
  const view = gltf.bufferViews[accessor.bufferView];
  const itemSize = accessorSize(accessor.type);
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const count = accessor.count * itemSize;
  const array = createTypedArray(accessor.componentType, binary, offset, count);
  return { array, itemSize, normalized: Boolean(accessor.normalized) };
}

function createTypedArray(componentType: number, buffer: ArrayBuffer, offset: number, count: number) {
  switch (componentType) {
    case 5120: return new Int8Array(buffer, offset, count);
    case 5121: return new Uint8Array(buffer, offset, count);
    case 5122: return new Int16Array(buffer, offset, count);
    case 5123: return new Uint16Array(buffer, offset, count);
    case 5125: return new Uint32Array(buffer, offset, count);
    case 5126: return new Float32Array(buffer, offset, count);
    default: throw new Error(`Unsupported GLB component type ${componentType}`);
  }
}

function accessorSize(type: string) {
  switch (type) {
    case 'SCALAR': return 1;
    case 'VEC2': return 2;
    case 'VEC3': return 3;
    case 'VEC4': return 4;
    default: throw new Error(`Unsupported GLB accessor ${type}`);
  }
}

function fitVehicleModel(THREE: ThreeRuntime, root: any) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const longest = Math.max(size.x, size.z, 0.001);
  const scale = 1.58 / longest;
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -center.y * scale + 0.02, -center.z * scale);
}
