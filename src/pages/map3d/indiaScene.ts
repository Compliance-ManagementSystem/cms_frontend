/**
 * The 3D map of India behind the approvals map page.
 *
 * States are extruded from the same outlines as the 2D dashboard map (@svg-maps/india,
 * CC BY 4.0), so both maps agree on state ids. States with data are raised and coloured
 * (taller = more approved); the rest lie flat. Plain three.js, driven from the page
 * through the small handle returned by createIndiaScene.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import indiaMap from '@svg-maps/india';

interface MapLocation {
  id: string;
  name: string;
  path: string;
}

const map = indiaMap as unknown as { viewBox: string; locations: MapLocation[] };

export interface ActiveState {
  color: number;
  /** 0–100, sets how tall the state stands */
  clearancePct: number;
}

export interface IndiaSceneHandle {
  setActive: (active: Map<string, ActiveState>) => void;
  /** Flies to a state, or back to the whole country with null */
  focus: (id: string | null) => void;
  setAutoRotate: (on: boolean) => void;
  dispose: () => void;
}

interface SceneOptions {
  onHover: (id: string | null, clientX: number, clientY: number) => void;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
}

// SVG units → world units; the map is about 120 wide
const SCALE = 0.2;
const [, , VIEW_W, VIEW_H] = map.viewBox.split(' ').map(Number);

const BACKGROUND = 0x05070e;
const FLAT_COLORS = [0x2a3a52, 0x30425c, 0x283850, 0x2e4058, 0x2b3b54];
const FLAT_HEIGHT = 1.1;
const MIN_ACTIVE_HEIGHT = 2.4;
const MAX_ACTIVE_HEIGHT = 8;

const HOME_CAMERA = new THREE.Vector3(8, 100, 146);
const HOME_TARGET = new THREE.Vector3(0, 0, 4);

export const isWebGLAvailable = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch {
    return false;
  }
};

interface StateGroupData {
  id: string;
  active: boolean;
  flatColor: number;
  /** Colour from the data; faded towards grey while another state is open */
  baseColor: THREE.Color;
  fade: number;
  /** Values the animation eases towards each frame */
  targetHeight: number;
  targetLift: number;
  targetGlow: number;
  targetFade: number;
  centre: THREE.Vector3;
  span: number;
}

// What the other states fade towards while one is open
const FADE_COLOR = new THREE.Color(0x2a3442);
const scratchColor = new THREE.Color();

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const createIndiaScene = (container: HTMLElement, options: SceneOptions): IndiaSceneHandle => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  scene.fog = new THREE.FogExp2(BACKGROUND, 0.0045);

  const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 500);
  camera.position.copy(HOME_CAMERA);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 18;
  controls.maxDistance = 220;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.copy(HOME_TARGET);
  controls.autoRotate = !options.reducedMotion;
  controls.autoRotateSpeed = 0.5;

  // ── Lights, floor and atmosphere ─────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0x9aa8c4, 0.85));
  const key = new THREE.DirectionalLight(0xfff2d2, 1.45);
  key.position.set(40, 80, 30);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4db8ff, 0.65);
  rim.position.set(-50, 30, -40);
  scene.add(rim);
  const fill = new THREE.PointLight(0xf0c75e, 40, 180);
  fill.position.set(0, 30, 10);
  scene.add(fill);

  const grid = new THREE.GridHelper(300, 50, 0x16304c, 0x0c1828);
  grid.position.y = -0.2;
  scene.add(grid);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(150, 72),
    new THREE.MeshStandardMaterial({ color: 0x07101c, metalness: 0.4, roughness: 0.55, transparent: true, opacity: 0.85 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.1;
  scene.add(floor);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(86, 87.2, 96),
    new THREE.MeshBasicMaterial({ color: 0x4da3ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  scene.add(ring);

  const particleCount = 700;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 220;
    particlePositions[i * 3 + 1] = Math.random() * 60;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 220;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({ color: 0x7ec8ff, size: 0.2, transparent: true, opacity: 0.45 })
  );
  scene.add(particles);

  // ── States ───────────────────────────────────────────────────────────────────
  // Each state is built 1 unit tall and stretched to its height with scale.y,
  // so raising and lowering it is a single number to animate.
  const svgText = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${map.viewBox}">${map.locations
    .map((loc) => `<path id="${loc.id}" d="${loc.path}"/>`)
    .join('')}</svg>`;
  const parsed = new SVGLoader().parse(svgText);

  const stateGroup = new THREE.Group();
  scene.add(stateGroup);
  const groups = new Map<string, THREE.Group>();

  parsed.paths.forEach((path, index) => {
    const id = (path.userData?.node as Element | undefined)?.getAttribute('id');
    if (!id) return;

    const geometry = new THREE.ExtrudeGeometry(SVGLoader.createShapes(path), { depth: 1, bevelEnabled: false });
    // SVG x → east, SVG y → south (towards the camera), extrusion → up
    geometry.translate(-VIEW_W / 2, -VIEW_H / 2, 0);
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, 1, 0);
    geometry.scale(SCALE, 1, SCALE);
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();

    const flatColor = FLAT_COLORS[index % FLAT_COLORS.length];
    const material = new THREE.MeshStandardMaterial({
      color: flatColor,
      metalness: 0.08,
      roughness: 0.58,
      emissive: new THREE.Color(flatColor),
      emissiveIntensity: 0.06,
      // SVG's downward y axis flips the face winding, so both sides are drawn
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 28),
      new THREE.LineBasicMaterial({ color: 0x8fb4d8, transparent: true, opacity: 0.14 })
    );

    const box = geometry.boundingBox!;
    const group = new THREE.Group();
    group.add(mesh, edges);
    group.scale.y = FLAT_HEIGHT;
    const data: StateGroupData = {
      id,
      active: false,
      flatColor,
      targetHeight: FLAT_HEIGHT,
      targetLift: 0,
      targetGlow: 0.06,
      baseColor: new THREE.Color(flatColor),
      fade: 0,
      targetFade: 0,
      centre: new THREE.Vector3((box.min.x + box.max.x) / 2, 0, (box.min.z + box.max.z) / 2),
      span: Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 8),
    };
    group.userData = data;
    mesh.userData = { stateId: id };
    stateGroup.add(group);
    groups.set(id, group);
  });

  // ── State of the view ────────────────────────────────────────────────────────
  let activeStates = new Map<string, ActiveState>();
  let focusedId: string | null = null;
  let hoveredId: string | null = null;
  let flight: {
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    start: number;
    duration: number;
  } | null = null;

  const restingHeight = (id: string) => {
    const active = activeStates.get(id);
    return active
      ? MIN_ACTIVE_HEIGHT + ((MAX_ACTIVE_HEIGHT - MIN_ACTIVE_HEIGHT) * Math.min(100, Math.max(0, active.clearancePct))) / 100
      : FLAT_HEIGHT;
  };

  /** Works out every state's height, lift and glow from what is focused and hovered */
  const updateTargets = () => {
    groups.forEach((group, id) => {
      const data = group.userData as StateGroupData;
      const base = restingHeight(id);
      if (focusedId) {
        const isFocused = id === focusedId;
        data.targetHeight = isFocused ? base * 1.4 : base * 0.7;
        data.targetLift = isFocused ? 0 : -0.4;
        data.targetGlow = isFocused ? 0.45 : 0.02;
        data.targetFade = isFocused || !data.active ? 0 : 0.8;
      } else {
        data.targetHeight = id === hoveredId && data.active ? base * 1.18 : base;
        data.targetLift = 0;
        data.targetGlow = data.active ? 0.24 : 0.06;
        data.targetFade = 0;
      }
    });
  };

  const setActive = (active: Map<string, ActiveState>) => {
    activeStates = active;
    groups.forEach((group, id) => {
      const data = group.userData as StateGroupData;
      const state = active.get(id);
      data.active = !!state;
      const [mesh, edges] = group.children as [THREE.Mesh, THREE.LineSegments];
      const material = mesh.material as THREE.MeshStandardMaterial;
      const edgeMaterial = edges.material as THREE.LineBasicMaterial;
      if (state) {
        data.baseColor.setHex(state.color);
        material.metalness = 0.28;
        material.roughness = 0.34;
        edgeMaterial.color.setHex(0xffffff);
        edgeMaterial.opacity = 0.35;
      } else {
        data.baseColor.setHex(data.flatColor);
        material.metalness = 0.08;
        material.roughness = 0.58;
        edgeMaterial.color.setHex(0x8fb4d8);
        edgeMaterial.opacity = 0.14;
      }
    });
    updateTargets();
  };

  const flyTo = (toPos: THREE.Vector3, toTarget: THREE.Vector3) => {
    if (options.reducedMotion) {
      camera.position.copy(toPos);
      controls.target.copy(toTarget);
      controls.update();
      return;
    }
    flight = {
      fromPos: camera.position.clone(),
      toPos,
      fromTarget: controls.target.clone(),
      toTarget,
      start: performance.now(),
      duration: 1250,
    };
  };

  const focus = (id: string | null) => {
    focusedId = id && groups.has(id) ? id : null;
    updateTargets();
    if (!focusedId) {
      flyTo(HOME_CAMERA.clone(), HOME_TARGET.clone());
      return;
    }
    const data = groups.get(focusedId)!.userData as StateGroupData;
    const distance = Math.max(40, data.span * 2.6);
    controls.autoRotate = false;
    flyTo(
      new THREE.Vector3(data.centre.x + distance * 0.35, distance * 0.95, data.centre.z + distance * 0.85),
      new THREE.Vector3(data.centre.x, 2.2, data.centre.z)
    );
  };

  // ── Pointer: hover and click (a drag to orbit is not a click) ────────────────
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pick = (event: PointerEvent): string | null => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(stateGroup.children, true).find((h) => h.object.userData?.stateId);
    return hit ? (hit.object.userData.stateId as string) : null;
  };

  const onPointerMove = (event: PointerEvent) => {
    const id = pick(event);
    if (id !== hoveredId) {
      hoveredId = id;
      updateTargets();
    }
    renderer.domElement.style.cursor = id && activeStates.has(id) ? 'pointer' : 'grab';
    options.onHover(id, event.clientX, event.clientY);
  };
  const onPointerLeave = () => {
    hoveredId = null;
    updateTargets();
    options.onHover(null, 0, 0);
  };
  let downAt: { x: number; y: number } | null = null;
  const onPointerDown = (event: PointerEvent) => {
    downAt = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!downAt) return;
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
    downAt = null;
    if (moved > 5) return;
    const id = pick(event);
    if (id && activeStates.has(id)) options.onSelect(id);
  };
  // A person dragging stops the slow orbit, as does picking a state
  const onControlStart = () => {
    flight = null;
  };

  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  controls.addEventListener('start', onControlStart);

  const resizeObserver = new ResizeObserver(() => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
  resizeObserver.observe(container);

  // ── Frame loop ───────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let frame = 0;
  const animate = () => {
    frame = requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    // Ease every state towards its target; instant with reduced motion
    const ease = options.reducedMotion ? 1 : 1 - Math.exp(-delta * 7);

    groups.forEach((group) => {
      const data = group.userData as StateGroupData;
      group.scale.y += (data.targetHeight - group.scale.y) * ease;
      group.position.y += (data.targetLift - group.position.y) * ease;
      const material = (group.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      material.emissiveIntensity += (data.targetGlow - material.emissiveIntensity) * ease;
      data.fade += (data.targetFade - data.fade) * ease;
      scratchColor.copy(data.baseColor).lerp(FADE_COLOR, data.fade);
      material.color.copy(scratchColor);
      material.emissive.copy(scratchColor);
    });

    if (flight) {
      const t = Math.min(1, (performance.now() - flight.start) / flight.duration);
      const eased = easeInOutCubic(t);
      camera.position.lerpVectors(flight.fromPos, flight.toPos, eased);
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, eased);
      if (t >= 1) flight = null;
    }

    if (!options.reducedMotion) particles.rotation.y += delta * 0.01;
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const dispose = () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointerup', onPointerUp);
    controls.removeEventListener('start', onControlStart);
    controls.dispose();
    scene.traverse((object) => {
      const disposable = object as THREE.Mesh;
      disposable.geometry?.dispose();
      const material = disposable.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
    renderer.dispose();
    canvas.remove();
  };

  return {
    setActive,
    focus,
    setAutoRotate: (on: boolean) => {
      controls.autoRotate = on;
    },
    dispose,
  };
};
