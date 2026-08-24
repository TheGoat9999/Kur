import { useEffect, useRef, useState, type ReactNode } from 'react';
import './world-vehicle-3d.css';

const THREE_MODULE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const MODEL_URL = '/assets/vehicles/meshy/fast-74-world-lod.glb?v=20260824-meshy-visual-fix-2';
const MAX_PIXEL_RATIO = 1.5;

type VehicleHeading = 'east' | 'west';
type ThreeRuntime = Record<string, any>;
type GlbJson = {
  accessors: Array<Record<string, any>>;
  bufferViews: Array<Record<string, any>>;
  meshes: Array<{ primitives: Array<Record<string, any>> }>;
};

type LoadedModel = {
  root: any;
  materials: any[];
  geometries: any[];
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
          premultipliedAlpha: true,
          powerPreference: 'high-performance'
        });
        renderer.setClearColor(0x000000, 0);
        renderer.setClearAlpha(0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
        if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 30);

        // The Meshy car is authored with its long axis on Z. Street rendering is
        // intentionally elevated so the roof line, hood and all four wheels read
        // against the flat 2D road instead of collapsing into a side-on blob.
        if (compact) camera.position.set(5.2, 4.3, 0.0);
        else camera.position.set(4.7, 3.6, 5.4);
        camera.lookAt(0, 0.18, 0);

        scene.add(new THREE.HemisphereLight(0xeaf3f6, 0x20282c, 1.9));
        const key = new THREE.DirectionalLight(0xffffff, 2.45);
        key.position.set(4.5, 7.2, 4.5);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x9dbfca, 0.95);
        rim.position.set(-4, 4, -5);
        scene.add(rim);

        model = buildModel(THREE, parsed.json, parsed.binary);
        fitVehicleModel(THREE, model.root);
        scene.add(model.root);

        const resize = () => {
          const width = Math.max(1, canvas.clientWidth);
          const height = Math.max(1, canvas.clientHeight);
          renderer.setSize(width, height, false);
          const aspect = width / height;
          const halfHeight = compact ? 0.68 : 0.62;
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
          if (compact) {
            model!.root.rotation.y = headingRef.current === 'east' ? 0 : Math.PI;
          } else {
            model!.root.rotation.y = -0.18;
          }
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
      model?.materials.forEach(material => material.dispose?.());
      renderer?.dispose?.();
    };
  }, [compact]);

  return (
    <span
      className={`world-vehicle-3d world-vehicle-3d-${status} ${compact ? 'world-vehicle-3d-compact' : 'world-vehicle-3d-showroom'} ${className}`.trim()}
      aria-hidden="true"
      data-renderer="meshy-glb-spike-v3"
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

function buildModel(THREE: ThreeRuntime, gltf: GlbJson, binary: ArrayBuffer): LoadedModel {
  const root = new THREE.Group();
  const geometries: any[] = [];
  const materials: any[] = [];
  const sourceMesh = gltf.meshes[0];
  if (!sourceMesh) throw new Error('GLB has no mesh');

  // The 499-triangle feasibility LOD is deliberately tiny. Keep its body mesh,
  // but restore the wheel volumes from the known Meshy source coordinates so
  // the vehicle still reads correctly at street scale while the full-detail
  // runtime asset is being validated.
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x7f898e,
    roughness: 0.34,
    metalness: 0.52,
    side: THREE.DoubleSide
  });
  materials.push(bodyMaterial);

  for (const primitive of sourceMesh.primitives) {
    const geometry = new THREE.BufferGeometry();
    const position = typedAccessor(gltf, binary, primitive.attributes.POSITION);
    geometry.setAttribute('position', new THREE.BufferAttribute(position.array, position.itemSize, position.normalized));
    if (primitive.indices !== undefined) {
      const indices = typedAccessor(gltf, binary, primitive.indices);
      geometry.setIndex(new THREE.BufferAttribute(indices.array, 1, false));
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const mesh = new THREE.Mesh(geometry, bodyMaterial);
    mesh.frustumCulled = false;
    root.add(mesh);
    geometries.push(geometry);
  }

  addSourceWheelVolumes(THREE, root, geometries, materials);
  return { root, materials, geometries };
}

function addSourceWheelVolumes(THREE: ThreeRuntime, root: any, geometries: any[], materials: any[]) {
  const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x15191b, roughness: 0.82, metalness: 0.05 });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xadb5b8, roughness: 0.28, metalness: 0.82 });
  materials.push(tireMaterial, rimMaterial);

  const tireGeometry = new THREE.CylinderGeometry(0.40, 0.40, 0.30, 18, 1, false);
  const rimGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.315, 14, 1, false);
  geometries.push(tireGeometry, rimGeometry);

  // Coordinates are taken from the uploaded source GLB's four wheel nodes.
  const wheelPositions = [
    [0.994, 0.193, 1.509],
    [-0.981, 0.193, 1.509],
    [0.994, 0.193, -1.319],
    [-0.981, 0.193, -1.319]
  ] as const;

  for (const [x, y, z] of wheelPositions) {
    const tire = new THREE.Mesh(tireGeometry, tireMaterial);
    tire.position.set(x, y, z);
    tire.rotation.z = Math.PI / 2;
    tire.frustumCulled = false;
    root.add(tire);

    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.position.set(x, y, z);
    rim.rotation.z = Math.PI / 2;
    rim.frustumCulled = false;
    root.add(rim);
  }
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
  const sourceBox = new THREE.Box3().setFromObject(root);
  const sourceSize = sourceBox.getSize(new THREE.Vector3());
  const sourceCenter = sourceBox.getCenter(new THREE.Vector3());
  const longest = Math.max(sourceSize.x, sourceSize.z, 0.001);
  const scale = 1.68 / longest;

  root.scale.setScalar(scale);
  root.position.set(
    -sourceCenter.x * scale,
    -sourceBox.min.y * scale - 0.18,
    -sourceCenter.z * scale
  );
}
