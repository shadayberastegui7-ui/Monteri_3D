import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Landmark, AppSettings } from '../types';
import { calculateItineraryRoute } from '../utils/roadGraph';

interface ThreeCanvasProps {
  landmarks: Landmark[];
  selectedLandmark: Landmark | null;
  onSelectLandmark: (landmark: Landmark) => void;
  settings: AppSettings;
  isTourActive: boolean;
  onExitTour?: () => void;
  itinerary?: Landmark[];
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  landmarks,
  selectedLandmark,
  onSelectLandmark,
  settings,
  isTourActive,
  onExitTour,
  itinerary = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const reqIdRef = useRef<number | null>(null);

  const [hoveredLandmark, setHoveredLandmark] = useState<Landmark | null>(null);
  const [wireframe, setWireframe] = useState(settings.rendererMode === 'wireframe');
  const [isNightMode, setIsNightMode] = useState(settings.rendererMode === 'night');
  const [cameraView, setCameraView] = useState<'orbit' | 'top' | 'close'>('orbit');

  const landmarkPinsRef = useRef<{ mesh: THREE.Mesh; landmark: Landmark }[]>([]);
  const controlsRef = useRef<OrbitControls | null>(null);
  const isAnimatingRef = useRef<boolean>(true);
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 14, 18));
  const pointerStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Separate effect to smoothly transition camera when selected landmark changes
  useEffect(() => {
    if (selectedLandmark && controlsRef.current && cameraRef.current) {
      const targetX = selectedLandmark.position3D.x;
      const targetZ = selectedLandmark.position3D.z;
      const focusFactor = 0.65; // Zoomed diorama perspective
      const ISO_OFFSET = new THREE.Vector3(0, 14, 18);

      targetLookAtRef.current.set(targetX, 0.5, targetZ);
      targetCamPosRef.current.set(
        targetX + ISO_OFFSET.x * focusFactor,
        ISO_OFFSET.y * focusFactor,
        targetZ + ISO_OFFSET.z * focusFactor
      );
      isAnimatingRef.current = true;
    }
  }, [selectedLandmark]);

  // Auto-fit camera effect: Calculate bounding box of itinerary POIs to frame the full route smoothly
  useEffect(() => {
    if (itinerary && itinerary.length > 0 && controlsRef.current && cameraRef.current) {
      const box = new THREE.Box3();
      itinerary.forEach((poi) => {
        box.expandByPoint(new THREE.Vector3(poi.position3D.x, poi.position3D.y || 0, poi.position3D.z));
      });

      const center = new THREE.Vector3();
      box.getCenter(center);
      center.y = 0.5;

      const size = new THREE.Vector3();
      box.getSize(size);

      const maxDim = Math.max(size.x, size.z, 6);
      const ISO_OFFSET = new THREE.Vector3(0, 14, 18);
      const fitFactor = Math.max(0.65, Math.min(1.8, maxDim / 7));

      targetLookAtRef.current.copy(center);
      targetCamPosRef.current.set(
        center.x + ISO_OFFSET.x * fitFactor,
        ISO_OFFSET.y * fitFactor,
        center.z + ISO_OFFSET.z * fitFactor
      );
      isAnimatingRef.current = true;
    }
  }, [itinerary]);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null; // Fully transparent background
    scene.fog = null; // No fog so background image is crystal clear

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    const isNight = settings.rendererMode === 'night' || isNightMode;

    // 2. Camera setup - Fixed Isometric Diorama Perspective
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const ISO_OFFSET = new THREE.Vector3(0, 14, 18);
    
    // Start camera from a wider initial overview for a smooth entry glide
    camera.position.set(0, 22, 28);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer setup - Capped PixelRatio for performance
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0); // 100% transparent clear color
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3.1. OrbitControls - Full 3D exploration: Rotate, Pan & Zoom enabled
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true; // Active manual orbit and rotation
    controls.enablePan = true;    // Active panning and translation
    controls.enableZoom = true;   // Active zoom in and out
    controls.screenSpacePanning = true; // Natural screen space panning
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;
    controls.panSpeed = 1.0;
    controls.zoomSpeed = 1.1;
    controls.minDistance = 10;
    controls.maxDistance = 80;
    controls.minPolarAngle = 0.05; // Prevent flipping overhead
    controls.maxPolarAngle = Math.PI / 2.2; // Soft limit above ground plane

    // Map standard mouse buttons (Left: Rotate, Middle: Zoom, Right: Pan)
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // When the user starts rotating, dragging or zooming, smoothly yield automatic animation
    controls.addEventListener('start', () => {
      isAnimatingRef.current = false;
    });

    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Setup initial automatic focus on the first landmark (default)
    const initialLandmark = selectedLandmark || (landmarks.length > 0 ? landmarks[0] : null);
    if (initialLandmark) {
      const initX = initialLandmark.position3D.x;
      const initZ = initialLandmark.position3D.z;
      const initFactor = 0.75;
      targetLookAtRef.current.set(initX, 0.5, initZ);
      targetCamPosRef.current.set(
        initX + ISO_OFFSET.x * initFactor,
        ISO_OFFSET.y * initFactor,
        initZ + ISO_OFFSET.z * initFactor
      );
      isAnimatingRef.current = true;
    } else {
      targetLookAtRef.current.set(0, 0, 0);
      targetCamPosRef.current.copy(ISO_OFFSET);
      isAnimatingRef.current = true;
    }

    // 4. Lighting - Soft warm diorama setup with optimized shadow map
    const ambientLight = new THREE.AmbientLight(
      isNight ? 0x1e293b : 0xfff8ee,
      isNight ? 0.8 : 1.5
    );
    scene.add(ambientLight);

    // Warm Sun Directional Light with lightweight 1024x1024 shadow map
    const sunLight = new THREE.DirectionalLight(
      isNight ? 0x64748b : 0xfff1dc,
      isNight ? 1.0 : 2.4
    );
    sunLight.position.set(24, 32, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 90;
    sunLight.shadow.camera.left = -26;
    sunLight.shadow.camera.right = 26;
    sunLight.shadow.camera.top = 26;
    sunLight.shadow.camera.bottom = -26;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    // Secondary soft pastel fill light
    const fillLight = new THREE.DirectionalLight(isNight ? 0x0f172a : 0xdbeef5, isNight ? 0.4 : 0.7);
    fillLight.position.set(-20, 16, -18);
    scene.add(fillLight);

    // Warm bounce light from ground
    const groundBounceLight = new THREE.DirectionalLight(0xfff3db, 0.35);
    groundBounceLight.position.set(0, -10, 0);
    scene.add(groundBounceLight);

    // 5. Materials Palette - Toy-Town Claymorphism (Matte, tactile, warm pastel tones)
    const isWire = settings.rendererMode === 'wireframe' || wireframe;

    // Helper: Generate procedural low-poly geometric water flow texture with concentric/gentle ripple bands
    const createLowPolyWaterTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#34a5bb';
        ctx.fillRect(0, 0, 256, 256);

        ctx.fillStyle = '#4cc0d6';
        for (let i = 0; i < 256; i += 32) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.bezierCurveTo(64, i + 10, 192, i - 10, 256, i);
          ctx.lineTo(256, i + 14);
          ctx.bezierCurveTo(192, i + 24, 64, i + 2, 0, i + 14);
          ctx.closePath();
          ctx.fill();
        }

        ctx.strokeStyle = '#82e0ee';
        ctx.lineWidth = 2.5;
        for (let y = 16; y < 256; y += 48) {
          for (let x = 24; x < 256; x += 80) {
            ctx.beginPath();
            ctx.ellipse(x + (y % 48 ? 20 : 0), y, 16, 7, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        ctx.fillStyle = '#bdf4fb';
        for (let j = 0; j < 25; j++) {
          const rx = (j * 73) % 250;
          const ry = (j * 113) % 250;
          ctx.beginPath();
          ctx.arc(rx, ry, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 6);
      return tex;
    };

    const waterTexture = createLowPolyWaterTexture();

    // River Water Material - Matte Toy-Town Pastel Cyan/Cerulean
    const riverMat = new THREE.MeshStandardMaterial({
      color: isNight ? 0x1d4e5b : 0x34a5bb,
      map: waterTexture,
      roughness: 0.85,
      metalness: 0.05,
      wireframe: isWire,
      flatShading: true,
    });

    // Claymorphism Facade Wall Materials (Pastel, Warm, Cream, Celeste)
    const facadeMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xfffdf5, roughness: 0.82, metalness: 0.02, wireframe: isWire }), // Soft Cream White
      new THREE.MeshStandardMaterial({ color: 0xfdecd2, roughness: 0.85, metalness: 0.02, wireframe: isWire }), // Warm Vanilla
      new THREE.MeshStandardMaterial({ color: 0xf7cac9, roughness: 0.82, metalness: 0.02, wireframe: isWire }), // Pastel Rose Peach
      new THREE.MeshStandardMaterial({ color: 0xd7ecf7, roughness: 0.82, metalness: 0.02, wireframe: isWire }), // Soft Celeste Blue
      new THREE.MeshStandardMaterial({ color: 0xd8efe6, roughness: 0.82, metalness: 0.02, wireframe: isWire }), // Minty Sage Pastel
      new THREE.MeshStandardMaterial({ color: 0xfae392, roughness: 0.85, metalness: 0.02, wireframe: isWire }), // Caribbean Sun Pastel Yellow
      new THREE.MeshStandardMaterial({ color: 0xf5d0b5, roughness: 0.84, metalness: 0.02, wireframe: isWire }), // Soft Peach Clay
    ];

    // Claymorphism Roof Materials (Warm Coral, Terracotta, Mint, Ochre)
    const roofMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xe06b5b, roughness: 0.82, metalness: 0.02, wireframe: isWire }), // Coral Terracotta Tile
      new THREE.MeshStandardMaterial({ color: 0xf08068, roughness: 0.82, metalness: 0.02, wireframe: isWire }), // Warm Peach Rose Tile
      new THREE.MeshStandardMaterial({ color: 0xcc543a, roughness: 0.84, metalness: 0.02, wireframe: isWire }), // Deep Terracotta
      new THREE.MeshStandardMaterial({ color: 0x3b9b94, roughness: 0.82, metalness: 0.02, wireframe: isWire }), // Mint Teal Tile
      new THREE.MeshStandardMaterial({ color: 0xe6774e, roughness: 0.82, metalness: 0.02, wireframe: isWire }), // Warm Brick Orange
      new THREE.MeshStandardMaterial({ color: 0xdca842, roughness: 0.84, metalness: 0.02, wireframe: isWire }), // Warm Mustard Ochre
    ];

    // Detail Accent Materials
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0.05, wireframe: isWire });
    const windowGlassMat = new THREE.MeshStandardMaterial({ color: 0x3d5066, roughness: 0.3, metalness: 0.1, wireframe: isWire });
    const doorWoodMat = new THREE.MeshStandardMaterial({ color: 0x8a5236, roughness: 0.8, metalness: 0.05, wireframe: isWire });
    const awningMatRed = new THREE.MeshStandardMaterial({ color: 0xe05646, roughness: 0.8, metalness: 0.02, wireframe: isWire });
    const chimneyCapMat = new THREE.MeshStandardMaterial({ color: 0xfffcf5, roughness: 0.8, metalness: 0.05, wireframe: isWire });

    // Road & Pavement Materials
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x474d56, roughness: 0.88, metalness: 0.05, wireframe: isWire }); // Clean slate-grey road
    const roadLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: isWire }); // BasicMaterial for zero lighting overhead
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xede4d3, roughness: 0.88, metalness: 0.02, wireframe: isWire }); // Light warm clay sidewalk
    const roadCurbMat = new THREE.MeshStandardMaterial({ color: 0xd9cebc, roughness: 0.9, metalness: 0.02, wireframe: isWire });

    // Stylized Toy Flora Materials (Bright Green, Pastel Lime, Sunny Yellow bloom)
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x784a32, roughness: 0.85, metalness: 0.02, wireframe: isWire });
    const foliageVibrantGreenMat = new THREE.MeshStandardMaterial({ color: 0x48bb78, roughness: 0.8, metalness: 0.02, wireframe: isWire });
    const foliageLimePastelMat = new THREE.MeshStandardMaterial({ color: 0x68d391, roughness: 0.8, metalness: 0.02, wireframe: isWire });
    const foliageGuayacanYellowMat = new THREE.MeshStandardMaterial({ color: 0xf6e05e, roughness: 0.8, metalness: 0.02, wireframe: isWire });

    // Helper: InstancedMesh batch builder
    const createInstancedMesh = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      matrices: THREE.Matrix4[],
      castShadow = false,
      receiveShadow = false
    ): THREE.InstancedMesh | null => {
      if (matrices.length === 0) return null;
      const instanced = new THREE.InstancedMesh(geo, mat, matrices.length);
      for (let i = 0; i < matrices.length; i++) {
        instanced.setMatrixAt(i, matrices[i]);
      }
      instanced.instanceMatrix.needsUpdate = true;
      instanced.castShadow = castShadow;
      instanced.receiveShadow = receiveShadow;
      return instanced;
    };

    // Matrix & Transform Utility Objects for re-use
    const dummy = new THREE.Object3D();
    const matHelper = new THREE.Matrix4();
    const posHelper = new THREE.Vector3();
    const quatHelper = new THREE.Quaternion();
    const scaleHelper = new THREE.Vector3();

    // 6. Base Terrain, Roads & Urban Street Grid
    const groundGroup = new THREE.Group();

    // Valle del Sinú Base Plane with soft matte pastel grass
    const groundGeo = new THREE.PlaneGeometry(64, 64, 1, 1);
    const groundBaseMat = new THREE.MeshStandardMaterial({
      color: isNight ? 0x0f172a : 0x5b8a6a,
      roughness: 0.88,
      metalness: 0.02,
      wireframe: isWire,
    });
    const ground = new THREE.Mesh(groundGeo, groundBaseMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.55;
    ground.receiveShadow = true;
    groundGroup.add(ground);

    // City Blocks Base (Manzanas)
    const blocks: { x: number; z: number; w: number; d: number; isEast: boolean }[] = [];
    
    // East Bank Grid (Centro Histórico & North Zone)
    for (let bx = 1.5; bx <= 12; bx += 3.4) {
      for (let bz = -14; bz <= 14; bz += 3.4) {
        const blockCenterX = bx + 1.2;
        const blockCenterZ = bz;
        if (bx < 2.8 && Math.abs(bz) < 4) continue; // Plaza Simón Bolívar / Catedral clearing
        // Villa Olímpica dedicated double-block clearing (x: 5.0 to 11.5, z: 4.0 to 11.0)
        if (blockCenterX >= 5.0 && blockCenterX <= 11.0 && blockCenterZ >= 4.5 && blockCenterZ <= 11.0) continue;
        blocks.push({ x: blockCenterX, z: blockCenterZ, w: 2.6, d: 2.6, isEast: true });
      }
    }

    // West Bank Grid (Margen Izquierda)
    for (let bx = -14; bx <= -4.5; bx += 3.4) {
      for (let bz = -14; bz <= 14; bz += 3.4) {
        if (Math.abs(bx + 7) < 1.5 && Math.abs(bz) < 2) continue;
        blocks.push({ x: bx - 0.5, z: bz, w: 2.6, d: 2.6, isEast: false });
      }
    }

    // Asphalt Streets Network
    const eastRoadPlaneGeo = new THREE.PlaneGeometry(16, 32);
    const eastRoadPlane = new THREE.Mesh(eastRoadPlaneGeo, asphaltMat);
    eastRoadPlane.rotation.x = -Math.PI / 2;
    eastRoadPlane.position.set(7.5, -0.53, 0);
    eastRoadPlane.receiveShadow = true;
    groundGroup.add(eastRoadPlane);

    const westRoadPlaneGeo = new THREE.PlaneGeometry(14, 32);
    const westRoadPlane = new THREE.Mesh(westRoadPlaneGeo, asphaltMat);
    westRoadPlane.rotation.x = -Math.PI / 2;
    westRoadPlane.position.set(-8.5, -0.53, 0);
    westRoadPlane.receiveShadow = true;
    groundGroup.add(westRoadPlane);

    // Batch Road Lines & Crosswalks with InstancedMesh
    const roadDashMatrices: THREE.Matrix4[] = [];
    const roadLineGeo = new THREE.BoxGeometry(0.08, 0.01, 1.2);

    for (let lz = -15; lz <= 15; lz += 2.0) {
      [4.4, 7.8, 11.2, -6.5, -9.9, -13.3].forEach((lx) => {
        dummy.position.set(lx, -0.52, lz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        roadDashMatrices.push(dummy.matrix.clone());
      });
    }

    // Cross-street painted dividers
    for (let lx = 2.5; lx <= 13; lx += 2.0) {
      [-12.3, -8.9, -5.5, -2.1, 1.3, 4.7, 8.1, 11.5].forEach((lz) => {
        dummy.position.set(lx, -0.52, lz);
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        roadDashMatrices.push(dummy.matrix.clone());
      });
    }

    // Pedestrian Zebra Crosswalks
    const zebraCrosswalkMatrices: THREE.Matrix4[] = [];
    const zebraStripeGeo = new THREE.BoxGeometry(0.12, 0.01, 0.5);
    const crosswalkPositions = [
      { x: 4.4, z: -1.7 }, { x: 7.8, z: -1.7 }, { x: 4.4, z: 1.7 }, { x: 7.8, z: 1.7 },
      { x: 4.4, z: -5.1 }, { x: 7.8, z: -5.1 }, { x: 4.4, z: 5.1 }, { x: 7.8, z: 5.1 },
      { x: -6.5, z: -1.7 }, { x: -6.5, z: 1.7 }, { x: -9.9, z: -1.7 }, { x: -9.9, z: 1.7 }
    ];

    crosswalkPositions.forEach((cp) => {
      for (let s = -0.35; s <= 0.35; s += 0.18) {
        dummy.position.set(cp.x + s, -0.52, cp.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        zebraCrosswalkMatrices.push(dummy.matrix.clone());
      }
    });

    const roadDashesInstanced = createInstancedMesh(roadLineGeo, roadLineMat, roadDashMatrices, false, false);
    if (roadDashesInstanced) groundGroup.add(roadDashesInstanced);

    const crosswalkInstanced = createInstancedMesh(zebraStripeGeo, roadLineMat, zebraCrosswalkMatrices, false, false);
    if (crosswalkInstanced) groundGroup.add(crosswalkInstanced);

    // Batch Sidewalks with InstancedMesh
    const sidewalkMatrices: THREE.Matrix4[] = [];
    const sidewalkGeo = new THREE.BoxGeometry(1, 0.14, 1);
    blocks.forEach((b) => {
      dummy.position.set(b.x, -0.46, b.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(b.w + 0.35, 1, b.d + 0.35);
      dummy.updateMatrix();
      sidewalkMatrices.push(dummy.matrix.clone());
    });

    const sidewalksInstanced = createInstancedMesh(sidewalkGeo, sidewalkMat, sidewalkMatrices, false, true);
    if (sidewalksInstanced) groundGroup.add(sidewalksInstanced);

    scene.add(groundGroup);

    // 7. Río Sinú - Integrated Flat Ribbon Channel with Clean Matte Banks (Simplified Geometry)
    const riverPoints = [
      new THREE.Vector3(-8.5, 0, -22),
      new THREE.Vector3(-5.5, 0, -14),
      new THREE.Vector3(-2.2, 0, -7),
      new THREE.Vector3(-1.2, 0, 0),
      new THREE.Vector3(-3.2, 0, 7.5),
      new THREE.Vector3(-6.2, 0, 15),
      new THREE.Vector3(-9.2, 0, 22),
    ];
    const riverCurve = new THREE.CatmullRomCurve3(riverPoints);
    const riverSegments = 40; // Optimized smooth curve count
    const riverWidth = 3.6;

    const riverVertices: number[] = [];
    const riverUvs: number[] = [];
    const riverIndices: number[] = [];

    const leftBankVertices: number[] = [];
    const rightBankVertices: number[] = [];
    const bankIndices: number[] = [];

    const curvePoints = riverCurve.getPoints(riverSegments);
    for (let i = 0; i <= riverSegments; i++) {
      const pt = curvePoints[i];
      const tangent = riverCurve.getTangent(i / riverSegments).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const halfW = riverWidth / 2;
      const leftX = pt.x - normal.x * halfW;
      const leftZ = pt.z - normal.z * halfW;
      const rightX = pt.x + normal.x * halfW;
      const rightZ = pt.z + normal.z * halfW;

      riverVertices.push(leftX, -0.52, leftZ);
      riverVertices.push(rightX, -0.52, rightZ);

      const v = (i / riverSegments) * 6;
      riverUvs.push(0, v);
      riverUvs.push(1, v);

      if (i < riverSegments) {
        const base = i * 2;
        riverIndices.push(base, base + 1, base + 2);
        riverIndices.push(base + 1, base + 3, base + 2);
      }

      // Bank transitions
      const bankW = 0.4;
      const leftBankOuterX = leftX - normal.x * bankW;
      const leftBankOuterZ = leftZ - normal.z * bankW;
      const rightBankOuterX = rightX + normal.x * bankW;
      const rightBankOuterZ = rightZ + normal.z * bankW;

      leftBankVertices.push(leftBankOuterX, -0.53, leftBankOuterZ);
      leftBankVertices.push(leftX, -0.51, leftZ);

      rightBankVertices.push(rightX, -0.51, rightZ);
      rightBankVertices.push(rightBankOuterX, -0.53, rightBankOuterZ);

      if (i < riverSegments) {
        const bBase = i * 2;
        bankIndices.push(bBase, bBase + 1, bBase + 2);
        bankIndices.push(bBase + 1, bBase + 3, bBase + 2);
      }
    }

    const riverGeo = new THREE.BufferGeometry();
    riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(riverVertices, 3));
    riverGeo.setAttribute('uv', new THREE.Float32BufferAttribute(riverUvs, 2));
    riverGeo.setIndex(riverIndices);
    riverGeo.computeVertexNormals();

    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.receiveShadow = true;
    scene.add(riverMesh);

    const bankMat = new THREE.MeshStandardMaterial({
      color: isNight ? 0x141e17 : 0x768f70,
      roughness: 0.98,
      metalness: 0.02,
      wireframe: isWire,
    });

    const leftBankGeo = new THREE.BufferGeometry();
    leftBankGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftBankVertices, 3));
    leftBankGeo.setIndex(bankIndices);
    leftBankGeo.computeVertexNormals();
    const leftBankMesh = new THREE.Mesh(leftBankGeo, bankMat);
    leftBankMesh.receiveShadow = true;
    scene.add(leftBankMesh);

    const rightBankGeo = new THREE.BufferGeometry();
    rightBankGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightBankVertices, 3));
    rightBankGeo.setIndex(bankIndices);
    rightBankGeo.computeVertexNormals();
    const rightBankMesh = new THREE.Mesh(rightBankGeo, bankMat);
    rightBankMesh.receiveShadow = true;
    scene.add(rightBankMesh);

    // 7.5. Puente Metálico Gustavo Rojas Pinilla (Bridge at Z = -1.7 connecting West Bank & East Bank)
    const bridgeGroup = new THREE.Group();
    
    // Bridge Deck Road (Asphalt)
    const bridgeDeckGeo = new THREE.BoxGeometry(4.2, 0.12, 1.4);
    const bridgeDeck = new THREE.Mesh(bridgeDeckGeo, asphaltMat);
    bridgeDeck.position.set(-0.8, -0.47, -1.7);
    bridgeDeck.receiveShadow = true;
    bridgeGroup.add(bridgeDeck);

    // Bridge Concrete Pillars dipping into Sinú River
    const pillarGeo = new THREE.CylinderGeometry(0.22, 0.28, 1.2, 12);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7, metalness: 0.2 });
    [-2.2, 0.6].forEach((px) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, -0.9, -1.7);
      bridgeGroup.add(pillar);
    });

    // Metallic Truss Railings along both sides of the bridge
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.7 });
    const railingGeo = new THREE.BoxGeometry(4.2, 0.35, 0.08);
    [-2.35, -1.05].forEach((rz) => {
      const railing = new THREE.Mesh(railingGeo, trussMat);
      railing.position.set(-0.8, -0.28, rz);
      railing.castShadow = true;
      bridgeGroup.add(railing);

      // Steel truss vertical posts
      for (let rx = -2.7; rx <= 1.1; rx += 0.8) {
        const postGeo = new THREE.BoxGeometry(0.08, 0.45, 0.08);
        const post = new THREE.Mesh(postGeo, trussMat);
        post.position.set(rx, -0.23, rz);
        bridgeGroup.add(post);
      }
    });

    scene.add(bridgeGroup);

    // 8. Ronda del Sinú - Batched Flora (InstancedMesh)
    const floraGroup = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.16, 1.2, 5); // Low-poly 5 segments
    const sphereGeo = new THREE.IcosahedronGeometry(1, 1); // Low-poly detail level 1
    const palmTrunkGeo = new THREE.CylinderGeometry(0.08, 0.15, 1.8, 5);
    const palmFrondGeo = new THREE.ConeGeometry(0.38, 1.2, 4);

    const trunkMatrices: THREE.Matrix4[] = [];
    const foliageGreenMatrices: THREE.Matrix4[] = [];
    const foliageLimeMatrices: THREE.Matrix4[] = [];
    const foliageYellowMatrices: THREE.Matrix4[] = [];
    const palmTrunkMatrices: THREE.Matrix4[] = [];
    const palmFrondMatrices: THREE.Matrix4[] = [];
    const bushMatrices: THREE.Matrix4[] = [];

    // Helper: Add Flora instances
    const addFluffyToyTree = (x: number, z: number, colorKind: 'green' | 'lime' | 'yellow' | 'palm') => {
      if (colorKind === 'palm') {
        // Palm trunk
        dummy.position.set(x, -0.46 + 0.9, z);
        dummy.rotation.set(0, 0, (Math.random() - 0.5) * 0.15);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        palmTrunkMatrices.push(dummy.matrix.clone());

        // 6 Fronds
        for (let f = 0; f < 6; f++) {
          const frondAngle = (f / 6) * Math.PI * 2;
          dummy.position.set(
            x + Math.cos(frondAngle) * 0.35,
            -0.46 + 1.85,
            z + Math.sin(frondAngle) * 0.35
          );
          dummy.rotation.set(Math.PI / 2.7, frondAngle, 0);
          dummy.scale.set(1, 0.25, 1);
          dummy.updateMatrix();
          palmFrondMatrices.push(dummy.matrix.clone());
        }
      } else {
        // Tree Trunk
        dummy.position.set(x, -0.46 + 0.6, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        trunkMatrices.push(dummy.matrix.clone());

        const targetList =
          colorKind === 'lime'
            ? foliageLimeMatrices
            : colorKind === 'yellow'
            ? foliageYellowMatrices
            : foliageGreenMatrices;

        // Main central sphere
        dummy.position.set(x, -0.46 + 1.6, z);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        dummy.scale.set(0.7, 0.7, 0.7);
        dummy.updateMatrix();
        targetList.push(dummy.matrix.clone());

        // Fluffy puff clusters
        const puffOffsets = [
          { ox: 0.3, oy: 1.45, oz: 0.2, s: 0.45 },
          { ox: -0.28, oy: 1.5, oz: -0.25, s: 0.42 },
          { ox: 0.05, oy: 1.95, oz: -0.1, s: 0.48 },
        ];
        puffOffsets.forEach((po) => {
          dummy.position.set(x + po.ox, -0.46 + po.oy, z + po.oz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(po.s, po.s, po.s);
          dummy.updateMatrix();
          targetList.push(dummy.matrix.clone());
        });
      }
    };

    const addToyBush = (x: number, z: number, s = 0.28) => {
      dummy.position.set(x, -0.46 + s * 0.8, z);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      bushMatrices.push(dummy.matrix.clone());
    };

    // Populate Flora along river
    for (let i = 0; i <= 44; i++) {
      const t = i / 44;
      const pt = riverCurve.getPoint(t);
      // Skip trees near bridge corridor Z = -1.7 to prevent tree collision
      if (Math.abs(pt.z - (-1.7)) < 1.6) continue;

      const eastOffset = 3.2 + (i % 3 === 0 ? 0.6 : -0.3);
      const colorKind: 'green' | 'lime' | 'yellow' | 'palm' =
        i % 4 === 0 ? 'yellow' : i % 3 === 0 ? 'palm' : i % 2 === 0 ? 'lime' : 'green';
      addFluffyToyTree(pt.x + eastOffset, pt.z, colorKind);

      if (i % 2 === 0) {
        addToyBush(pt.x + eastOffset - 0.7, pt.z + 0.3, 0.28);
        addToyBush(pt.x + eastOffset + 0.6, pt.z - 0.4, 0.22);
      }

      if (i % 3 === 0) {
        const westOffset = -3.2 + ((i * 17) % 7 - 3) * 0.1;
        addFluffyToyTree(
          pt.x + westOffset,
          pt.z,
          i % 6 === 0 ? 'yellow' : i % 2 === 0 ? 'green' : 'lime'
        );
      }
    }

    // Create Flora InstancedMeshes
    const trunksInstanced = createInstancedMesh(trunkGeo, treeTrunkMat, trunkMatrices, true, false);
    if (trunksInstanced) floraGroup.add(trunksInstanced);

    const foliageGreenInstanced = createInstancedMesh(sphereGeo, foliageVibrantGreenMat, foliageGreenMatrices, true, false);
    if (foliageGreenInstanced) floraGroup.add(foliageGreenInstanced);

    const foliageLimeInstanced = createInstancedMesh(sphereGeo, foliageLimePastelMat, foliageLimeMatrices, true, false);
    if (foliageLimeInstanced) floraGroup.add(foliageLimePastelMat ? createInstancedMesh(sphereGeo, foliageLimePastelMat, foliageLimeMatrices, true, false)! : foliageLimeInstanced);

    const foliageYellowInstanced = createInstancedMesh(sphereGeo, foliageGuayacanYellowMat, foliageYellowMatrices, true, false);
    if (foliageYellowInstanced) floraGroup.add(foliageYellowInstanced);

    const palmTrunksInstanced = createInstancedMesh(palmTrunkGeo, treeTrunkMat, palmTrunkMatrices, true, false);
    if (palmTrunksInstanced) floraGroup.add(palmTrunksInstanced);

    const palmFrondsInstanced = createInstancedMesh(palmFrondGeo, foliageLimePastelMat, palmFrondMatrices, true, false);
    if (palmFrondsInstanced) floraGroup.add(palmFrondsInstanced);

    const bushesInstanced = createInstancedMesh(sphereGeo, foliageLimePastelMat, bushMatrices, false, false);
    if (bushesInstanced) floraGroup.add(bushesInstanced);

    scene.add(floraGroup);

    // 9. Procedural Isometric Toy-Town Buildings Batched via InstancedMesh
    const cityGroup = new THREE.Group();

    // Reusable Unit Geometries
    const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const unitCone4Geo = new THREE.ConeGeometry(0.78, 1, 4); // 4 sides for clean toy-town roofs
    const windowFrameGeo = new THREE.BoxGeometry(0.26, 0.32, 0.04);
    const windowGlassGeo = new THREE.BoxGeometry(0.20, 0.26, 0.045);
    const doorGeo = new THREE.BoxGeometry(0.24, 0.44, 0.04);
    const dormerBodyGeo = new THREE.BoxGeometry(0.26, 0.28, 0.32);
    const dormerRoofGeo = new THREE.ConeGeometry(0.20, 0.18, 4);
    const chimneyBodyGeo = new THREE.BoxGeometry(0.14, 0.45, 0.14);
    const chimneyCapGeo = new THREE.BoxGeometry(0.19, 0.04, 0.19);
    const awningStripeGeo = new THREE.BoxGeometry(0.09, 0.04, 0.25);

    // Group matrices by material index
    const wallsByMat: { [idx: number]: THREE.Matrix4[] } = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    const roofsByMat: { [idx: number]: THREE.Matrix4[] } = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
    const parapetsByMat: { [idx: number]: THREE.Matrix4[] } = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
    const dormerRoofsByMat: { [idx: number]: THREE.Matrix4[] } = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
    const chimneysByMat: { [idx: number]: THREE.Matrix4[] } = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };

    const plinthMatrices: THREE.Matrix4[] = [];
    const windowFrameMatrices: THREE.Matrix4[] = [];
    const windowGlassMatrices: THREE.Matrix4[] = [];
    const doorMatrices: THREE.Matrix4[] = [];
    const dormerBodyMatrices: THREE.Matrix4[] = [];
    const chimneyCapMatrices: THREE.Matrix4[] = [];
    const awningMatrices: THREE.Matrix4[] = [];

    // Helper: Add framed window matrices
    const addWindowInstance = (wx: number, wy: number, wz: number, rotY = 0, scale = 1) => {
      dummy.position.set(wx, wy, wz);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      windowFrameMatrices.push(dummy.matrix.clone());
      windowGlassMatrices.push(dummy.matrix.clone());
    };

    // Populate building data across all urban blocks
    blocks.forEach((block) => {
      const halfW = block.w / 2;
      const halfD = block.d / 2;

      const subdivisions = [
        { ox: -halfW * 0.5, oz: -halfD * 0.5 },
        { ox: halfW * 0.5, oz: -halfD * 0.5 },
        { ox: -halfW * 0.5, oz: halfD * 0.5 },
        { ox: halfW * 0.5, oz: halfD * 0.5 },
      ];

      subdivisions.forEach((sub, idx) => {
        const bX = block.x + sub.ox;
        const bZ = block.z + sub.oz;
        const lotW = 0.95 + ((idx * 7) % 5) * 0.04;
        const lotD = 0.95 + ((idx * 11) % 5) * 0.04;

        let floors = 1;
        let style: 'gabled' | 'mansard' | 'townhouse' | 'boutique' = 'gabled';

        const distFromCenter = Math.sqrt(bX * bX + bZ * bZ);
        if (block.isEast && distFromCenter < 9 && idx === 0 && (bX + bZ) % 2 === 0) {
          floors = 3;
          style = 'boutique';
        } else if (idx % 2 === 0) {
          floors = 2;
          style = idx === 0 ? 'mansard' : 'townhouse';
        } else {
          floors = 1;
          style = 'gabled';
        }

        const floorHeight = 0.7;
        const totalH = floors * floorHeight;
        const baseY = -0.38;

        const wallMatIdx = Math.abs(Math.floor(bX * 3 + bZ * 7 + idx)) % facadeMaterials.length;
        const roofMatIdx = Math.abs(Math.floor(bX * 5 + bZ * 2 + idx)) % roofMaterials.length;

        // 1. Wall Body
        dummy.position.set(bX, baseY + totalH / 2, bZ);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(lotW, totalH, lotD);
        dummy.updateMatrix();
        wallsByMat[wallMatIdx].push(dummy.matrix.clone());

        // 2. Baseboard Trim
        dummy.position.set(bX, baseY + 0.04, bZ);
        dummy.scale.set(lotW + 0.04, 0.08, lotD + 0.04);
        dummy.updateMatrix();
        plinthMatrices.push(dummy.matrix.clone());

        // 3. Windows and Doors
        const numCols = lotW > 1.05 ? 2 : 1;
        for (let f = 0; f < floors; f++) {
          const floorY = baseY + f * floorHeight + floorHeight / 2;

          for (let col = 0; col < numCols; col++) {
            const colX = numCols === 2 ? (col === 0 ? -lotW * 0.25 : lotW * 0.25) : 0;

            if (f === 0 && col === 0 && lotW > 0.8) {
              // Front Door
              dummy.position.set(bX + colX, baseY + 0.22, bZ + lotD / 2 + 0.02);
              dummy.rotation.set(0, 0, 0);
              dummy.scale.set(1, 1, 1);
              dummy.updateMatrix();
              doorMatrices.push(dummy.matrix.clone());

              // Awning above door
              for (let s = 0; s < 4; s++) {
                dummy.position.set(bX + colX - 0.135 + s * 0.09, baseY + 0.48, bZ + lotD / 2 + 0.1);
                dummy.rotation.set(Math.PI / 8, 0, 0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                awningMatrices.push(dummy.matrix.clone());
              }
            } else {
              // Front Window
              addWindowInstance(bX + colX, floorY, bZ + lotD / 2 + 0.02, 0, 1);
            }

            // Back Window
            addWindowInstance(bX + colX, floorY, bZ - lotD / 2 - 0.02, Math.PI, 1);
          }
        }

        // 4. Roof Style
        if (style === 'gabled' || style === 'mansard') {
          const roofH = 0.55 + lotW * 0.18;
          const maxDim = Math.max(lotW, lotD);

          dummy.position.set(bX, baseY + totalH + roofH / 2 - 0.02, bZ);
          dummy.rotation.set(0, Math.PI / 4, 0);
          dummy.scale.set(
            (lotW + 0.1) * 0.78,
            roofH,
            (lotD + 0.1) * 0.78
          );
          dummy.updateMatrix();
          roofsByMat[roofMatIdx].push(dummy.matrix.clone());

          // Dormer Window
          if (lotW >= 0.95 && (idx % 2 === 0)) {
            const dormerY = baseY + totalH + roofH * 0.35;
            const dormerZ = bZ + lotD * 0.3;

            dummy.position.set(bX, dormerY, dormerZ);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            dormerBodyMatrices.push(dummy.matrix.clone());

            // Dormer Roof
            dummy.position.set(bX, dormerY + 0.14 + 0.09, dormerZ);
            dummy.rotation.set(0, Math.PI / 4, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            dormerRoofsByMat[roofMatIdx].push(dummy.matrix.clone());

            // Dormer Window
            addWindowInstance(bX, dormerY, dormerZ + 0.16 + 0.02, 0, 0.75);
          }

          // Chimney
          if (idx === 1 || idx === 3) {
            const chimX = bX + lotW * 0.28;
            const chimY = baseY + totalH + roofH * 0.6;
            const chimZ = bZ - lotD * 0.15;

            dummy.position.set(chimX, chimY, chimZ);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            chimneysByMat[roofMatIdx].push(dummy.matrix.clone());

            dummy.position.set(chimX, chimY + 0.22 + 0.02, chimZ);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            chimneyCapMatrices.push(dummy.matrix.clone());
          }
        } else if (style === 'townhouse') {
          // Flat Roof Parapet
          dummy.position.set(bX, baseY + totalH + 0.08, bZ);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(lotW + 0.08, 1, lotD + 0.08);
          dummy.updateMatrix();
          parapetsByMat[roofMatIdx].push(dummy.matrix.clone());
        } else {
          // Boutique Stepped Penthouse
          const pentW = lotW * 0.65;
          const pentD = lotD * 0.65;
          const pentH = 0.55;

          dummy.position.set(bX, baseY + totalH + pentH / 2, bZ);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(pentW, pentH, pentD);
          dummy.updateMatrix();
          wallsByMat[0].push(dummy.matrix.clone()); // Soft cream penthouse

          // Penthouse Roof
          dummy.position.set(bX, baseY + totalH + pentH + 0.18, bZ);
          dummy.rotation.set(0, Math.PI / 4, 0);
          dummy.scale.set(pentW * 0.78, 0.38, pentD * 0.78);
          dummy.updateMatrix();
          roofsByMat[roofMatIdx].push(dummy.matrix.clone());

          // Penthouse Window
          addWindowInstance(bX, baseY + totalH + pentH / 2, bZ + pentD / 2 + 0.02, 0, 0.8);
        }
      });
    });

    // Create City InstancedMeshes
    // Wall Meshes (Cast Shadows & Receive Shadows)
    Object.keys(wallsByMat).forEach((key) => {
      const idx = Number(key);
      const wallInst = createInstancedMesh(unitBoxGeo, facadeMaterials[idx], wallsByMat[idx], true, true);
      if (wallInst) cityGroup.add(wallInst);
    });

    // Roof Meshes (Cast Shadows)
    Object.keys(roofsByMat).forEach((key) => {
      const idx = Number(key);
      const roofInst = createInstancedMesh(unitCone4Geo, roofMaterials[idx], roofsByMat[idx], true, true);
      if (roofInst) cityGroup.add(roofInst);
    });

    // Parapets
    Object.keys(parapetsByMat).forEach((key) => {
      const idx = Number(key);
      const parInst = createInstancedMesh(unitBoxGeo, roofMaterials[idx], parapetsByMat[idx], true, false);
      if (parInst) cityGroup.add(parInst);
    });

    // Dormer Roofs
    Object.keys(dormerRoofsByMat).forEach((key) => {
      const idx = Number(key);
      const drInst = createInstancedMesh(dormerRoofGeo, roofMaterials[idx], dormerRoofsByMat[idx], false, false);
      if (drInst) cityGroup.add(drInst);
    });

    // Chimneys
    Object.keys(chimneysByMat).forEach((key) => {
      const idx = Number(key);
      const chInst = createInstancedMesh(chimneyBodyGeo, roofMaterials[idx], chimneysByMat[idx], true, false);
      if (chInst) cityGroup.add(chInst);
    });

    // Plinths & Doors
    const plinthInst = createInstancedMesh(unitBoxGeo, roadCurbMat, plinthMatrices, false, false);
    if (plinthInst) cityGroup.add(plinthInst);

    const doorInst = createInstancedMesh(doorGeo, doorWoodMat, doorMatrices, false, false);
    if (doorInst) cityGroup.add(doorInst);

    const dormerBodyInst = createInstancedMesh(dormerBodyGeo, facadeMaterials[0], dormerBodyMatrices, false, false);
    if (dormerBodyInst) cityGroup.add(dormerBodyInst);

    const chimneyCapInst = createInstancedMesh(chimneyCapGeo, chimneyCapMat, chimneyCapMatrices, false, false);
    if (chimneyCapInst) cityGroup.add(chimneyCapInst);

    const awningInst = createInstancedMesh(awningStripeGeo, awningMatRed, awningMatrices, false, false);
    if (awningInst) cityGroup.add(awningInst);

    // Windows (Frames and Glass - zero shadow overhead)
    const winFrameInst = createInstancedMesh(windowFrameGeo, windowFrameMat, windowFrameMatrices, false, false);
    if (winFrameInst) cityGroup.add(winFrameInst);

    const winGlassInst = createInstancedMesh(windowGlassGeo, windowGlassMat, windowGlassMatrices, false, false);
    if (winGlassInst) cityGroup.add(winGlassInst);

    scene.add(cityGroup);

    // 10. Iconic Montería Landmark Models (Toy-Town Claymorphism Diorama Edition)
    const landmarks3DGroup = new THREE.Group();

    // A. Catedral San Jerónimo (Double Tower Neoclassical Cathedral in Toy Claymorphism)
    const catGroup = new THREE.Group();
    const catWallMat = facadeMaterials[0]; // Pure warm white clay
    const catRoofMat = roofMaterials[0]; // Coral Terracotta clay roof
    const catDomeMat = new THREE.MeshStandardMaterial({ color: 0xf5b722, roughness: 0.4, metalness: 0.4 }); // Golden dome

    // Central Nave Body
    const naveGeo = new THREE.BoxGeometry(2.4, 2.2, 3.8);
    const nave = new THREE.Mesh(naveGeo, catWallMat);
    nave.position.y = 1.1;
    nave.castShadow = true;
    nave.receiveShadow = true;
    catGroup.add(nave);

    // Front Grand Entrance Portal Stairs
    const stairsGeo = new THREE.BoxGeometry(1.6, 0.16, 0.6);
    const stairs = new THREE.Mesh(stairsGeo, sidewalkMat);
    stairs.position.set(0, 0.08, 2.1);
    stairs.castShadow = true;
    catGroup.add(stairs);

    // Grand Double Wooden Entrance Door
    const catDoorGeo = new THREE.BoxGeometry(0.7, 1.1, 0.06);
    const catDoor = new THREE.Mesh(catDoorGeo, doorWoodMat);
    catDoor.position.set(0, 0.65, 1.93);
    catDoor.castShadow = true;
    catGroup.add(catDoor);

    // Ornate Rose Window Relief on Front Facade
    const roseGeo = new THREE.TorusGeometry(0.35, 0.06, 8, 16);
    const rose = new THREE.Mesh(roseGeo, catDomeMat);
    rose.position.set(0, 1.6, 1.93);
    catGroup.add(rose);

    // Nave Gabled Roof
    const naveRoofGeo = new THREE.ConeGeometry(2.2, 1.2, 4);
    const naveRoof = new THREE.Mesh(naveRoofGeo, catRoofMat);
    naveRoof.position.set(0, 2.8, 0);
    naveRoof.rotation.y = Math.PI / 4;
    naveRoof.scale.set(1, 1, 1.6);
    naveRoof.castShadow = true;
    catGroup.add(naveRoof);

    // Twin Bell Towers (Front Facade)
    [-1.0, 1.0].forEach((tx) => {
      const towerBaseGeo = new THREE.BoxGeometry(0.85, 3.8, 0.85);
      const tower = new THREE.Mesh(towerBaseGeo, catWallMat);
      tower.position.set(tx, 1.9, 1.8);
      tower.castShadow = true;
      catGroup.add(tower);

      // Belfry Opening on Tower Tops
      const belfryWinGeo = new THREE.BoxGeometry(0.26, 0.38, 0.05);
      const belfryWin = new THREE.Mesh(belfryWinGeo, windowGlassMat);
      belfryWin.position.set(tx, 3.2, 2.25);
      catGroup.add(belfryWin);

      // Tower Spire Cupola
      const spireGeo = new THREE.ConeGeometry(0.6, 1.2, 6);
      const spire = new THREE.Mesh(spireGeo, catDomeMat);
      spire.position.set(tx, 4.4, 1.8);
      spire.castShadow = true;
      catGroup.add(spire);
    });

    // Central Main Dome
    const domeGeo = new THREE.SphereGeometry(0.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, catDomeMat);
    dome.position.set(0, 3.2, -0.8);
    dome.castShadow = true;
    catGroup.add(dome);

    catGroup.position.set(3.2, -0.4, 2.0);
    landmarks3DGroup.add(catGroup);

    // B. Muelle Turístico & Planchones Tradicionales (Toy Diorama Edition)
    const muelleGroup = new THREE.Group();
    // Wooden Boardwalk Pier
    const pierBoardGeo = new THREE.BoxGeometry(2.4, 0.16, 1.2);
    const pierBoard = new THREE.Mesh(pierBoardGeo, doorWoodMat);
    pierBoard.position.set(0, 0.1, 0);
    pierBoard.castShadow = true;
    muelleGroup.add(pierBoard);

    // Planchón del Sinú (Traditional wooden cable boat with striped canvas roof)
    const planchonBoatGeo = new THREE.BoxGeometry(1.4, 0.25, 0.8);
    const planchonBoat = new THREE.Mesh(planchonBoatGeo, doorWoodMat);
    planchonBoat.position.set(-1.6, -0.05, 0.3);
    planchonBoat.castShadow = true;
    muelleGroup.add(planchonBoat);

    // Striped Canvas Canopy
    const pCanopyGeo = new THREE.BoxGeometry(1.4, 0.04, 0.8);
    const pCanopy = new THREE.Mesh(pCanopyGeo, awningMatRed);
    pCanopy.position.set(-1.6, 0.45, 0.3);
    muelleGroup.add(pCanopy);

    muelleGroup.position.set(-3.8, -0.4, -3.2);
    landmarks3DGroup.add(muelleGroup);

    // C. Monumento al Porro (Roundabout with Musical Low-Poly Brass Sculpture)
    const porroGroup = new THREE.Group();
    const roundaboutGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.2, 16);
    const roundabout = new THREE.Mesh(roundaboutGeo, sidewalkMat);
    roundabout.position.y = 0.1;
    roundabout.receiveShadow = true;
    porroGroup.add(roundabout);

    // Mini decorative topiary bushes around roundabout
    const roundBushGeo = new THREE.IcosahedronGeometry(0.15, 1);
    for (let b = 0; b < 6; b++) {
      const bAngle = (b / 6) * Math.PI * 2;
      const rBush = new THREE.Mesh(roundBushGeo, foliageLimePastelMat);
      rBush.position.set(Math.cos(bAngle) * 0.9, 0.28, Math.sin(bAngle) * 0.9);
      porroGroup.add(rBush);
    }

    // Spiral Brass Horn / Porro notes abstract sculpture
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf5b722, roughness: 0.35, metalness: 0.7 });
    const hornGeo = new THREE.TorusGeometry(0.6, 0.12, 8, 24, Math.PI * 1.5);
    const horn = new THREE.Mesh(hornGeo, brassMat);
    horn.position.set(0, 0.9, 0);
    horn.rotation.x = Math.PI / 3;
    horn.castShadow = true;
    porroGroup.add(horn);

    const baseColumnGeo = new THREE.CylinderGeometry(0.18, 0.25, 0.8, 12);
    const baseColumn = new THREE.Mesh(baseColumnGeo, catWallMat);
    baseColumn.position.y = 0.4;
    porroGroup.add(baseColumn);

    porroGroup.position.set(5.2, -0.4, -4.2);
    landmarks3DGroup.add(porroGroup);

    // D. Villa Olímpica - Complejo Deportivo y Recreativo (Toy-Town Sports Stadium)
    const villaOlimpicaGroup = new THREE.Group();

    // 1. Concrete & Lawn Sports Plaza Base with perimeter clay sidewalk
    const voPlazaWidth = 5.8;
    const voPlazaDepth = 5.8;
    
    // Outer sidewalk perimeter framing the sports block cleanly against the street grid
    const voSidewalkGeo = new THREE.BoxGeometry(voPlazaWidth + 0.35, 0.14, voPlazaDepth + 0.35);
    const voSidewalk = new THREE.Mesh(voSidewalkGeo, sidewalkMat);
    voSidewalk.position.y = -0.06;
    voSidewalk.receiveShadow = true;
    villaOlimpicaGroup.add(voSidewalk);

    // Inner emerald lawn park campus
    const voBaseGeo = new THREE.BoxGeometry(voPlazaWidth, 0.18, voPlazaDepth);
    const voBaseMat = new THREE.MeshStandardMaterial({ color: 0x3d7b4e, roughness: 0.88, metalness: 0.02 });
    const voBase = new THREE.Mesh(voBaseGeo, voBaseMat);
    voBase.position.y = 0.09;
    voBase.receiveShadow = true;
    villaOlimpicaGroup.add(voBase);

    // 2. Athletic Running Track (Terracotta Oval Ring Strip)
    const trackGeo = new THREE.BoxGeometry(3.6, 0.20, 2.3);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0xba4a30, roughness: 0.85, metalness: 0.02 });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.position.set(-0.8, 0.11, 0.2);
    trackMesh.receiveShadow = true;
    villaOlimpicaGroup.add(trackMesh);

    // 3. Soccer Pitch (Infield Emerald Grass)
    const pitchGeo = new THREE.BoxGeometry(3.0, 0.22, 1.7);
    const pitchMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8, metalness: 0.02 });
    const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
    pitchMesh.position.set(-0.8, 0.12, 0.2);
    pitchMesh.receiveShadow = true;
    villaOlimpicaGroup.add(pitchMesh);

    // Soccer pitch center line & circle
    const centerCircleGeo = new THREE.TorusGeometry(0.25, 0.025, 4, 16);
    const soccerLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const centerCircle = new THREE.Mesh(centerCircleGeo, soccerLineMat);
    centerCircle.rotation.x = Math.PI / 2;
    centerCircle.position.set(-0.8, 0.24, 0.2);
    villaOlimpicaGroup.add(centerCircle);

    // Goalposts (2 mini white frames)
    const goalGeo = new THREE.BoxGeometry(0.04, 0.18, 0.45);
    const goalLeft = new THREE.Mesh(goalGeo, soccerLineMat);
    goalLeft.position.set(-2.2, 0.32, 0.2);
    villaOlimpicaGroup.add(goalLeft);

    const goalRight = new THREE.Mesh(goalGeo, soccerLineMat);
    goalRight.position.set(0.6, 0.32, 0.2);
    villaOlimpicaGroup.add(goalRight);

    // 4. Main Stadium Grandstand (Tribuna Techada)
    const grandstandGeo = new THREE.BoxGeometry(3.0, 0.42, 0.5);
    const grandstandMat = new THREE.MeshStandardMaterial({ color: 0xdfdad2, roughness: 0.85, metalness: 0.05 });
    const grandstand = new THREE.Mesh(grandstandGeo, grandstandMat);
    grandstand.position.set(-0.8, 0.32, -1.25);
    grandstand.castShadow = true;
    grandstand.receiveShadow = true;
    villaOlimpicaGroup.add(grandstand);

    // Cantilevered Grandstand Canopy Roof
    const canopyGeo = new THREE.BoxGeometry(3.2, 0.07, 0.8);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x006b6b, roughness: 0.6, metalness: 0.1 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(-0.8, 0.68, -1.2);
    canopy.rotation.x = Math.PI / 16;
    canopy.castShadow = true;
    villaOlimpicaGroup.add(canopy);

    // 5. Olympic Aquatic Pool / Tennis Multicourt
    const courtGeo = new THREE.BoxGeometry(1.6, 0.21, 2.4);
    const courtMat = new THREE.MeshStandardMaterial({ color: 0x2b78a8, roughness: 0.6, metalness: 0.1 });
    const courtMesh = new THREE.Mesh(courtGeo, courtMat);
    courtMesh.position.set(1.8, 0.11, 0.2);
    courtMesh.receiveShadow = true;
    villaOlimpicaGroup.add(courtMesh);

    // Tennis / Sports Net
    const netGeo = new THREE.BoxGeometry(0.04, 0.16, 2.1);
    const netMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(1.8, 0.28, 0.2);
    villaOlimpicaGroup.add(net);

    // 6. Stadium Floodlight Towers (4 Postes de Iluminación en las esquinas del estadio)
    const lightPylonGeo = new THREE.CylinderGeometry(0.03, 0.04, 1.5, 6);
    const lightPylonMat = new THREE.MeshStandardMaterial({ color: 0xc8c3ba, metalness: 0.4, roughness: 0.5 });
    const lampHeadGeo = new THREE.BoxGeometry(0.22, 0.12, 0.08);
    const lampHeadMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffeedd,
      emissiveIntensity: isNight ? 1.0 : 0.4,
    });

    const pylonOffsets = [
      { px: -2.3, pz: -1.0 },
      { px: 0.7, pz: -1.0 },
      { px: -2.3, pz: 1.4 },
      { px: 0.7, pz: 1.4 },
    ];

    pylonOffsets.forEach(({ px, pz }) => {
      const pylon = new THREE.Mesh(lightPylonGeo, lightPylonMat);
      pylon.position.set(px, 0.75, pz);
      pylon.castShadow = true;
      villaOlimpicaGroup.add(pylon);

      const lamp = new THREE.Mesh(lampHeadGeo, lampHeadMat);
      lamp.position.set(px, 1.48, pz);
      lamp.rotation.x = pz < 0 ? Math.PI / 6 : -Math.PI / 6;
      villaOlimpicaGroup.add(lamp);
    });

    // Decorative mini entrance palm trees along pedestrian boulevard
    const voPalmOffsets = [
      { ox: 1.6, oz: 2.1 },
      { ox: 2.4, oz: 2.1 },
      { ox: -1.8, oz: 2.1 },
      { ox: -2.5, oz: 2.1 },
      { ox: 1.6, oz: -1.9 },
      { ox: 2.4, oz: -1.9 },
    ];
    const miniPalmGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.85, 5);
    const miniCrownGeo = new THREE.IcosahedronGeometry(0.35, 1);
    voPalmOffsets.forEach(({ ox, oz }) => {
      const mTrunk = new THREE.Mesh(miniPalmGeo, treeTrunkMat);
      mTrunk.position.set(ox, 0.42, oz);
      mTrunk.castShadow = true;
      villaOlimpicaGroup.add(mTrunk);

      const mCrown = new THREE.Mesh(miniCrownGeo, foliageLimePastelMat);
      mCrown.position.set(ox, 0.95, oz);
      mCrown.castShadow = true;
      villaOlimpicaGroup.add(mCrown);
    });

    villaOlimpicaGroup.position.set(7.8, -0.4, 6.8);
    landmarks3DGroup.add(villaOlimpicaGroup);

    scene.add(landmarks3DGroup);

    // 6. Landmark Pins (Anchored 3D markers with ground base discs and physical tether poles)
    landmarkPinsRef.current = [];
    const pinGeo = new THREE.OctahedronGeometry(0.45, 0);
    const groundDiscGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16);
    const groundRingGeo = new THREE.TorusGeometry(0.55, 0.04, 8, 20);

    landmarks.forEach((landmark) => {
      const isSelected = selectedLandmark?.id === landmark.id;
      const pinY = landmark.position3D.y + 1.4; // Reduced Y height closer to buildings
      const groundY = -0.44;

      // 1. Ground Anchor Base Disc & Ring
      const discMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xffc24b : 0x00a8a8,
        emissive: isSelected ? 0xcc8800 : 0x004444,
        roughness: 0.3,
        metalness: 0.6,
      });
      const discMesh = new THREE.Mesh(groundDiscGeo, discMat);
      discMesh.position.set(landmark.position3D.x, groundY, landmark.position3D.z);
      scene.add(discMesh);

      const ringMat = new THREE.MeshBasicMaterial({ color: isSelected ? 0xffc24b : 0x9ff1f0 });
      const ringMesh = new THREE.Mesh(groundRingGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.set(landmark.position3D.x, groundY + 0.03, landmark.position3D.z);
      scene.add(ringMesh);

      // 2. Vertical Tether Pole Cylinder connecting Ground Base to Pin Head
      const poleHeight = pinY - groundY;
      const poleGeo = new THREE.CylinderGeometry(0.025, 0.025, poleHeight, 8);
      const poleMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xffc24b : 0x00e5e5,
        transparent: true,
        opacity: 0.65,
      });
      const poleMesh = new THREE.Mesh(poleGeo, poleMat);
      poleMesh.position.set(landmark.position3D.x, groundY + poleHeight / 2, landmark.position3D.z);
      scene.add(poleMesh);

      // 3. Floating 3D Octahedron Diamond Pin Head
      const pinMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xffc24b : 0x00a8a8,
        emissive: isSelected ? 0xaa7700 : 0x004444,
        roughness: 0.2,
        metalness: 0.9,
        wireframe: isWire,
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.set(landmark.position3D.x, pinY, landmark.position3D.z);
      scene.add(pinMesh);

      landmarkPinsRef.current.push({ mesh: pinMesh, landmark });
    });

    // 6.5. RouteLine 3D Component - Connect itinerary sequence of stops via Orthogonal Road Graph (#10B981)
    let routeCurvePath: THREE.CurvePath<THREE.Vector3> | null = null;
    let energyPulseMesh: THREE.Mesh | null = null;

    if (itinerary && itinerary.length >= 2) {
      const roadPath2D = calculateItineraryRoute(itinerary);

      if (roadPath2D.length >= 2) {
        const ROUTE_ELEVATION_Y = 0.2; // Fixed elevation Y = 0.2 as specified
        const curvePath = new THREE.CurvePath<THREE.Vector3>();

        for (let i = 0; i < roadPath2D.length - 1; i++) {
          const v1 = new THREE.Vector3(roadPath2D[i].x, ROUTE_ELEVATION_Y, roadPath2D[i].z);
          const v2 = new THREE.Vector3(roadPath2D[i + 1].x, ROUTE_ELEVATION_Y, roadPath2D[i + 1].z);
          
          if (v1.distanceTo(v2) > 0.001) {
            curvePath.add(new THREE.LineCurve3(v1, v2));
          }
        }

        if (curvePath.curves.length > 0) {
          routeCurvePath = curvePath;
          const tubularSegments = Math.max(40, curvePath.curves.length * 10);

          // Tube Geometry for visible 3D neon line (#10B981) following strict street corridors
          const tubeGeo = new THREE.TubeGeometry(curvePath, tubularSegments, 0.12, 8, false);
          const routeMat = new THREE.MeshStandardMaterial({
            color: 0x10b981, // Neon Emerald Green / Turquoise
            emissive: 0x10b981,
            emissiveIntensity: 0.9,
            roughness: 0.2,
            metalness: 0.5,
            wireframe: isWire,
          });

          const routeMesh = new THREE.Mesh(tubeGeo, routeMat);
          scene.add(routeMesh);

          // Energy Pulse Particle traveling along the orthogonal road route
          const pulseGeo = new THREE.SphereGeometry(0.32, 16, 16);
          const pulseMat = new THREE.MeshBasicMaterial({
            color: 0x6ee7b7,
          });
          energyPulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
          scene.add(energyPulseMesh);
        }
      }

      // Waypoint Rings at each stop
      itinerary.forEach((item) => {
        const ringGeo = new THREE.TorusGeometry(0.5, 0.08, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.set(item.position3D.x, 0.08, item.position3D.z);
        scene.add(ringMesh);
      });
    }

    // 7. Animation Loop with Isometric View Tracking & Control Damping
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);

      // Programmatic smooth glide to target landmark when active
      if (isAnimatingRef.current && controlsRef.current && cameraRef.current) {
        controlsRef.current.target.lerp(targetLookAtRef.current, 0.05);
        cameraRef.current.position.lerp(targetCamPosRef.current, 0.05);

        if (
          controlsRef.current.target.distanceTo(targetLookAtRef.current) < 0.03 &&
          cameraRef.current.position.distanceTo(targetCamPosRef.current) < 0.03
        ) {
          isAnimatingRef.current = false;
        }
      }

      // Update controls damping (smooth Pan & Zoom)
      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Pulse pin rotation
      landmarkPinsRef.current.forEach(({ mesh }) => {
        mesh.rotation.y += 0.02;
      });

      // Animated energy pulse traveling along the 3D orthogonal road route
      if (routeCurvePath && energyPulseMesh) {
        const t = (Date.now() * 0.00035) % 1;
        energyPulseMesh.position.copy(routeCurvePath.getPoint(t));
      }

      // Subtle water texture flow movement along Sinú channel
      if (waterTexture) {
        waterTexture.offset.y -= 0.0025;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener('resize', handleResize);
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
      }
    };
  }, [landmarks, settings.rendererMode, wireframe, isNightMode, itinerary]);

  // Pointer event handlers to distinguish pan/drag from genuine pin clicks
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);

    // Only fire raycast if the pointer didn't drag/pan more than 5 pixels
    if (dx < 6 && dy < 6) {
      if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

      const pinMeshes = landmarkPinsRef.current.map((p) => p.mesh);
      const intersects = raycaster.intersectObjects(pinMeshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const found = landmarkPinsRef.current.find((p) => p.mesh === hitMesh);
        if (found) {
          onSelectLandmark(found.landmark);
        }
      }
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none pointer-events-auto">
      {/* Three WebGL Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        style={{ pointerEvents: 'auto' }}
        className="w-full h-full cursor-grab active:cursor-grabbing pointer-events-auto"
      />

      {/* Interactive 3D Viewport HUD Overlays when Tour is Active */}
      {isTourActive && (
        <>
          {/* Top Bar HUD Info */}
          <div className="absolute top-20 left-4 right-4 md:left-8 md:right-8 flex justify-between items-center pointer-events-none z-30">
            <div className="bg-[#0a0806]/80 backdrop-blur-md px-4 py-2 rounded-lg border border-[#9ff1f0]/20 flex items-center gap-3 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-[#9ff1f0] animate-ping" />
              <div className="text-xs font-mono tracking-wider text-[#97e8e8]">
                Navegación 3D en Vivo | Río Sinú
              </div>
            </div>

            {/* Exit 3D HUD / Reset Camera */}
            <div className="flex gap-2 pointer-events-auto">
              <button
                onClick={() => setIsNightMode(!isNightMode)}
                className="bg-[#1e1c0f]/80 hover:bg-[#006b6b] text-[#fff9eb] p-2.5 rounded-lg border border-[#bec9c8]/20 transition-all text-xs flex items-center gap-1.5"
                title="Modo Día / Noche"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isNightMode ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
              <button
                onClick={() => setWireframe(!wireframe)}
                className={`p-2.5 rounded-lg border transition-all text-xs flex items-center gap-1.5 ${
                  wireframe
                    ? 'bg-[#006b6b] text-white border-[#9ff1f0]'
                    : 'bg-[#1e1c0f]/80 hover:bg-[#006b6b] text-[#fff9eb] border-[#bec9c8]/20'
                }`}
                title="Modo Estructura Wireframe"
              >
                <span className="material-symbols-outlined text-[18px]">grid_4x4</span>
              </button>
              {onExitTour && (
                <button
                  id="btn-exit-3d-tour"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    isAnimatingRef.current = false;
                    if (reqIdRef.current) {
                      cancelAnimationFrame(reqIdRef.current);
                      reqIdRef.current = null;
                    }
                    onExitTour();
                  }}
                  className="bg-[#ba2215] hover:bg-[#dc2626] active:scale-95 text-white px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg border border-white/20 transition-all cursor-pointer z-50 pointer-events-auto"
                  title="Salir de la Navegación 3D y Regresar al Inicio"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  <span>Salir</span>
                </button>
              )}
            </div>
          </div>

          {/* Left HUD: Altitude & Coordinates */}
          <div className="absolute bottom-28 left-6 hidden sm:flex flex-col gap-2 pointer-events-none z-30">
            <div className="flex items-center gap-3 bg-[#0a0806]/70 backdrop-blur-md px-3 py-2 rounded border border-[#ffc24b]/30">
              <div className="w-1 h-8 bg-[#ffc24b]" />
              <div>
                <div className="text-[10px] text-[#ffc24b] font-mono tracking-widest uppercase">
                  Altitud
                </div>
                <div className="text-sm font-semibold font-mono text-[#fff9eb]">18M msnm</div>
              </div>
            </div>
            <div className="text-[10px] text-[#e9e2ce]/70 font-mono tracking-widest bg-[#0a0806]/60 backdrop-blur-sm px-2.5 py-1 rounded">
              8.7479° N, 75.8814° W
            </div>
          </div>

          {/* Bottom Selected Landmark Overlay Banner */}
          {selectedLandmark && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-md w-[90%] bg-[#0a0806]/90 backdrop-blur-xl border border-[#006b6b] rounded-xl p-4 text-[#fff9eb] z-40 shadow-2xl animate-fade-in-up">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#97e8e8] bg-[#005151]/50 px-2 py-0.5 rounded">
                    {selectedLandmark.category}
                  </span>
                  <h3 className="font-cormorant text-2xl font-bold text-white mt-1">
                    {selectedLandmark.name}
                  </h3>
                  <p className="text-xs text-[#e9e2ce]">{selectedLandmark.subtitle}</p>
                </div>
                <button
                  onClick={() => onSelectLandmark(selectedLandmark)}
                  className="text-xs text-[#ffc24b] hover:underline"
                >
                  Ver detalles
                </button>
              </div>
              <p className="text-xs text-gray-300 line-clamp-2">{selectedLandmark.description}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
