import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  coordsToSquare,
  getBoardPiecesFromFen,
  squareToWorldXZ,
} from '../chess/engine';
import type {
  BoardThemeId,
  CameraPresetId,
  LegalMoveOption,
  MoveRecord,
  PieceColor,
  PieceStyleId,
  PieceType,
} from '../chess/types';
import { createMaterialLibrary, type ChessMaterialLibrary } from './materials';
import { createPieceGeometryCache, type PieceGeometryCache } from './pieceGeometries';
import { createBoardCoordinateTexture, createContactShadowTexture } from './textures';

const BOARD_TOP_Y = 0.07;
const SQUARE_SIZE = 1.0;

// Pre-allocated math helpers (zero GC in render loop)
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(BOARD_TOP_Y + 0.45));
const _planeHit = new THREE.Vector3();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3(0, 0.2, 0);

interface ActivePieceEntry {
  key: string;
  square: string;
  type: PieceType;
  color: PieceColor;
  group: THREE.Group;
  shadow: THREE.Mesh;
  targetX: number;
  targetZ: number;
  anim?: {
    startX: number;
    startZ: number;
    endX: number;
    endZ: number;
    elapsed: number;
    duration: number;
    arcHeight: number;
  };
}

interface CaptureAnimEntry {
  group: THREE.Group;
  elapsed: number;
  duration: number;
  startY: number;
}

export interface SceneStateSnapshot {
  fen: string;
  selectedSquare: string | null;
  legalMoves: LegalMoveOption[];
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  boardTheme: BoardThemeId;
  pieceStyle: PieceStyleId;
  flipped: boolean;
  isTitleScreen: boolean;
  interactive: boolean;
  activeTurn: PieceColor;
  animatedMove: MoveRecord | null;
}

export interface SceneCallbacks {
  onSelectOrMoveSquare: (square: string) => void;
  onBeginDragSquare: (square: string) => LegalMoveOption[];
  onDropMove: (from: string, to: string) => boolean;
}

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class ChessSceneController {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private envMap: THREE.Texture;

  private materials: ChessMaterialLibrary;
  private pieceCache: PieceGeometryCache;
  private contactShadowTex: THREE.CanvasTexture;
  private contactShadowGeo: THREE.PlaneGeometry;
  private contactShadowMat: THREE.MeshBasicMaterial;

  private squareMeshes = new Map<string, THREE.Mesh>();
  private squareHitList: THREE.Mesh[] = [];
  private legalMarkersGroup = new THREE.Group();
  private coordDecals: THREE.Mesh[] = [];
  private coordTextures: THREE.CanvasTexture[] = [];

  private selectedRing: THREE.Mesh;
  private lastMoveFromMesh: THREE.Mesh;
  private lastMoveToMesh: THREE.Mesh;
  private checkRing: THREE.Mesh;
  private hoverTileMesh: THREE.Mesh;

  private activePieces = new Map<string, ActivePieceEntry>();
  private captureAnims: CaptureAnimEntry[] = [];
  private piecesRoot = new THREE.Group();

  private currentState: SceneStateSnapshot | null = null;
  private currentTheme: BoardThemeId = 'walnut';
  private currentStyle: PieceStyleId = 'staunton';
  private currentPreset: CameraPresetId = 'classic';
  private currentFlipped = false;

  private cameraTransitioning = false;
  private isTitleShowcase = true;

  // Pointer & Drag state
  private pointerDownPos = { x: 0, y: 0 };
  private isPointerDown = false;
  private activePointerId: number | null = null;
  private activePointers = new Set<number>();
  private potentialDragSquare: string | null = null;
  private draggingEntry: ActivePieceEntry | null = null;
  private dragLegalDestinations = new Set<string>();
  private hoveredSquare: string | null = null;

  // Render loop & software-GL pacing
  private frameId = 0;
  private renderBusy = false;
  private renderDirty = false;
  private lastTickTime = performance.now();
  private disposed = false;
  private resizeObserver: ResizeObserver;

  private disposableGeos: THREE.BufferGeometry[] = [];
  private disposableMats: THREE.Material[] = [];

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareGl();

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 240);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.setAttribute('data-testid', 'chess-webgl-canvas');
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111216);
    this.scene.fog = new THREE.FogExp2(0x111216, 0.05);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envMap;
    pmrem.dispose();

    const aspect = width / height;
    const initialFov = aspect < 1 ? THREE.MathUtils.clamp(42 / Math.pow(aspect, 0.72), 42, 82) : 42;
    this.camera = new THREE.PerspectiveCamera(initialFov, aspect, 0.1, 120);
    this.camera.position.set(6.8, 6.2, 8.2);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.25, 0);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.07;
    this.controls.enablePan = true;
    this.controls.minDistance = 5.2;
    this.controls.maxDistance = 21;
    this.controls.minPolarAngle = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.55;

    this.controls.addEventListener('start', () => {
      // Cancel any scripted camera transition immediately on user drag
      this.cameraTransitioning = false;
    });
    this.controls.addEventListener('change', () => {
      this.requestRender();
    });

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.materials = createMaterialLibrary(maxAniso);
    this.pieceCache = createPieceGeometryCache(this.materials);
    this.contactShadowTex = createContactShadowTexture();
    this.contactShadowGeo = new THREE.PlaneGeometry(0.76, 0.76);
    this.contactShadowGeo.rotateX(-Math.PI / 2);
    this.contactShadowMat = new THREE.MeshBasicMaterial({
      map: this.contactShadowTex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    this.setupLighting();
    this.buildEnvironmentAndBoard(maxAniso);

    // Highlight meshes
    const ringGeo = new THREE.RingGeometry(0.35, 0.44, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.disposableGeos.push(ringGeo);

    const selectedMat = new THREE.MeshBasicMaterial({
      color: 0xf4c44e,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    this.disposableMats.push(selectedMat);
    this.selectedRing = new THREE.Mesh(ringGeo, selectedMat);
    this.selectedRing.position.y = BOARD_TOP_Y + 0.008;
    this.selectedRing.visible = false;
    this.scene.add(this.selectedRing);

    const checkMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    this.disposableMats.push(checkMat);
    this.checkRing = new THREE.Mesh(ringGeo, checkMat);
    this.checkRing.position.y = BOARD_TOP_Y + 0.009;
    this.checkRing.visible = false;
    this.scene.add(this.checkRing);

    const tileGeo = new THREE.PlaneGeometry(0.94, 0.94);
    tileGeo.rotateX(-Math.PI / 2);
    this.disposableGeos.push(tileGeo);

    const lastMoveMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    this.disposableMats.push(lastMoveMat);

    this.lastMoveFromMesh = new THREE.Mesh(tileGeo, lastMoveMat);
    this.lastMoveFromMesh.position.y = BOARD_TOP_Y + 0.004;
    this.lastMoveFromMesh.visible = false;
    this.scene.add(this.lastMoveFromMesh);

    this.lastMoveToMesh = new THREE.Mesh(tileGeo, lastMoveMat);
    this.lastMoveToMesh.position.y = BOARD_TOP_Y + 0.004;
    this.lastMoveToMesh.visible = false;
    this.scene.add(this.lastMoveToMesh);

    const hoverMat = new THREE.MeshBasicMaterial({
      color: 0x38d399,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    this.disposableMats.push(hoverMat);
    this.hoverTileMesh = new THREE.Mesh(tileGeo, hoverMat);
    this.hoverTileMesh.position.y = BOARD_TOP_Y + 0.007;
    this.hoverTileMesh.visible = false;
    this.scene.add(this.hoverTileMesh);

    this.scene.add(this.legalMarkersGroup);
    this.scene.add(this.piecesRoot);

    this.bindPointerEvents();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.controls.update();
    this.requestRender();
  }

  private setupLighting(): void {
    // Cool sky / warm ground hemisphere fill (never flat white AmbientLight alone)
    const hemi = new THREE.HemisphereLight(0xb8cff5, 0x2c2016, 0.85);
    this.scene.add(hemi);

    // Warm directional studio key light with tight shadow frustum
    const keyLight = new THREE.DirectionalLight(0xfff0d6, 2.15);
    keyLight.position.set(7.5, 12.5, 6.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 32;
    const d = 6.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    // Cool rim backlight for silhouette separation on dark pieces
    const rimLight = new THREE.DirectionalLight(0x9ec4ff, 0.95);
    rimLight.position.set(-7.5, 6.5, -8.0);
    this.scene.add(rimLight);
  }

  private buildEnvironmentAndBoard(maxAniso: number): void {
    // Architectural salon table pedestal beneath the chessboard (wide enough to blend smoothly into horizon fog)
    const salonTableGeo = new THREE.CylinderGeometry(36, 36, 0.4, 64);
    this.disposableGeos.push(salonTableGeo);
    const salonTable = new THREE.Mesh(salonTableGeo, this.materials.tableTop);
    salonTable.position.y = -0.49;
    salonTable.receiveShadow = true;
    this.scene.add(salonTable);

    // Outer beveled chassis frame
    const frameGeo = new THREE.BoxGeometry(9.05, 0.34, 9.05);
    this.disposableGeos.push(frameGeo);
    const frameMesh = new THREE.Mesh(frameGeo, this.materials.boardFrame);
    frameMesh.position.y = -0.11;
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    this.scene.add(frameMesh);

    // Metallic brass inlay border around the 8x8 grid
    const inlayGeo = new THREE.BoxGeometry(8.14, 0.09, 8.14);
    this.disposableGeos.push(inlayGeo);
    const inlayMesh = new THREE.Mesh(inlayGeo, this.materials.boardInlay);
    inlayMesh.position.y = 0.022;
    inlayMesh.receiveShadow = true;
    this.scene.add(inlayMesh);

    // 64 individual square tiles (offset cleanly in Y above inlay)
    const sqGeo = new THREE.BoxGeometry(0.992, 0.075, 0.992);
    this.disposableGeos.push(sqGeo);

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = coordsToSquare(file, rank);
        const isLight = (file + rank) % 2 === 1;
        const mat = isLight ? this.materials.lightSquare : this.materials.darkSquare;
        const mesh = new THREE.Mesh(sqGeo, mat);
        const { x, z } = squareToWorldXZ(square, SQUARE_SIZE);
        mesh.position.set(x, BOARD_TOP_Y - 0.0375, z);
        mesh.receiveShadow = true;
        mesh.userData = { square };
        this.scene.add(mesh);
        this.squareMeshes.set(square, mesh);
        this.squareHitList.push(mesh);
      }
    }

    // Engraved rank (1-8) and file (A-H) coordinate labels along the wooden frame
    const decalGeo = new THREE.PlaneGeometry(0.32, 0.32);
    decalGeo.rotateX(-Math.PI / 2);
    this.disposableGeos.push(decalGeo);

    const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    const addCoordDecal = (label: string, x: number, z: number, rotY = 0) => {
      const tex = createBoardCoordinateTexture(label, '#d6b773', maxAniso);
      this.coordTextures.push(tex);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      this.disposableMats.push(mat);
      const m = new THREE.Mesh(decalGeo, mat);
      m.position.set(x, 0.062, z);
      m.rotation.y = rotY;
      this.scene.add(m);
      this.coordDecals.push(m);
    };

    for (let i = 0; i < 8; i++) {
      const pos = (i - 3.5) * SQUARE_SIZE;
      addCoordDecal(files[i], pos, 4.29, 0);
      addCoordDecal(files[i], pos, -4.29, Math.PI);
      const rankZ = (3.5 - i) * SQUARE_SIZE;
      addCoordDecal(ranks[i], -4.29, rankZ, 0);
      addCoordDecal(ranks[i], 4.29, rankZ, Math.PI);
    }
  }

  public syncState(snapshot: SceneStateSnapshot): void {
    const themeChanged = snapshot.boardTheme !== this.currentTheme;
    const styleChanged = snapshot.pieceStyle !== this.currentStyle;
    const flippedChanged = snapshot.flipped !== this.currentFlipped;
    const titleChanged = snapshot.isTitleScreen !== this.isTitleShowcase;

    if (themeChanged) {
      this.currentTheme = snapshot.boardTheme;
      this.materials.applyTheme(snapshot.boardTheme);
    }

    if (styleChanged) {
      this.currentStyle = snapshot.pieceStyle;
      this.materials.applyPieceStyle(snapshot.pieceStyle);
    }

    this.isTitleShowcase = snapshot.isTitleScreen;
    if (!this.isSoftwareGl) {
      this.controls.autoRotate = this.isTitleShowcase;
    }

    if (titleChanged && !snapshot.isTitleScreen) {
      // Transition smoothly from title showcase to gameplay view
      this.setCameraPreset(this.currentPreset, snapshot.flipped, true);
    } else if (flippedChanged) {
      this.currentFlipped = snapshot.flipped;
      this.setCameraPreset(this.currentPreset, snapshot.flipped, true);
    }

    this.currentFlipped = snapshot.flipped;

    const fenChanged = !this.currentState || this.currentState.fen !== snapshot.fen || styleChanged;
    this.currentState = snapshot;

    if (fenChanged) {
      this.syncPiecesToFen(snapshot.fen, snapshot.animatedMove, styleChanged);
    }

    this.updateHighlights(snapshot);
    this.requestRender();
  }

  private syncPiecesToFen(fen: string, animatedMove: MoveRecord | null, forceRebuild: boolean): void {
    const targetPieces = getBoardPiecesFromFen(fen);

    if (forceRebuild || !animatedMove) {
      this.clearAllPieces();
      for (const p of targetPieces) {
        this.spawnPiece(p.square, p.type, p.color);
      }
      return;
    }

    // Handle capture animation for captured square before rebuilding/moving
    if (animatedMove.capturedSquare) {
      const victim = this.activePieces.get(animatedMove.capturedSquare);
      if (victim) {
        this.activePieces.delete(animatedMove.capturedSquare);
        this.scene.remove(victim.shadow);
        victim.group.traverse((child) => {
          delete child.userData.square;
          delete child.userData.pieceColor;
        });
        this.captureAnims.push({
          group: victim.group,
          elapsed: 0,
          duration: 0.28,
          startY: BOARD_TOP_Y,
        });
      }
    }

    const mover = this.activePieces.get(animatedMove.from);
    if (mover && !animatedMove.promotion) {
      // Reuse existing mesh, update square metadata, and animate smoothly
      this.activePieces.delete(animatedMove.from);
      const { x: endX, z: endZ } = squareToWorldXZ(animatedMove.to, SQUARE_SIZE);
      const startX = mover.group.position.x;
      const startZ = mover.group.position.z;
      this.assignEntrySquare(mover, animatedMove.to, endX, endZ);
      mover.anim = {
        startX,
        startZ,
        endX,
        endZ,
        elapsed: 0,
        duration: 0.28,
        arcHeight: animatedMove.piece === 'n' ? 0.85 : 0.22,
      };
      this.activePieces.set(animatedMove.to, mover);

      // Synchronized castling rook animation
      if (animatedMove.rookMove) {
        const rook = this.activePieces.get(animatedMove.rookMove.from);
        if (rook) {
          this.activePieces.delete(animatedMove.rookMove.from);
          const { x: rx, z: rz } = squareToWorldXZ(animatedMove.rookMove.to, SQUARE_SIZE);
          this.assignEntrySquare(rook, animatedMove.rookMove.to, rx, rz);
          rook.anim = {
            startX: rook.group.position.x,
            startZ: rook.group.position.z,
            endX: rx,
            endZ: rz,
            elapsed: 0,
            duration: 0.30,
            arcHeight: 0.16,
          };
          this.activePieces.set(animatedMove.rookMove.to, rook);
        }
      }
    } else {
      // Fallback / promotion rebuild cleanly with slide-in animation on promoted piece
      this.clearAllPieces();
      for (const p of targetPieces) {
        const entry = this.spawnPiece(p.square, p.type, p.color);
        if (p.square === animatedMove.to) {
          const { x: sx, z: sz } = squareToWorldXZ(animatedMove.from, SQUARE_SIZE);
          entry.group.position.set(sx, BOARD_TOP_Y, sz);
          entry.shadow.position.set(sx, BOARD_TOP_Y + 0.003, sz);
          entry.anim = {
            startX: sx,
            startZ: sz,
            endX: entry.targetX,
            endZ: entry.targetZ,
            elapsed: 0,
            duration: 0.28,
            arcHeight: 0.3,
          };
        }
      }
    }
  }

  private clearAllPieces(): void {
    this.activePieces.forEach((entry) => {
      this.piecesRoot.remove(entry.group);
      this.scene.remove(entry.shadow);
    });
    this.activePieces.clear();
  }

  private spawnPiece(square: string, type: PieceType, color: PieceColor): ActivePieceEntry {
    const group = this.pieceCache.getPieceMesh(type, color, this.currentStyle);
    const { x, z } = squareToWorldXZ(square, SQUARE_SIZE);
    group.position.set(x, BOARD_TOP_Y, z);
    group.userData = { square, type, color };
    group.traverse((child) => {
      child.userData.square = square;
      child.userData.pieceColor = color;
    });
    this.piecesRoot.add(group);

    const shadow = new THREE.Mesh(this.contactShadowGeo, this.contactShadowMat);
    shadow.position.set(x, BOARD_TOP_Y + 0.003, z);
    this.scene.add(shadow);

    const entry: ActivePieceEntry = {
      key: `${color}${type}_${square}`,
      square,
      type,
      color,
      group,
      shadow,
      targetX: x,
      targetZ: z,
    };
    this.activePieces.set(square, entry);
    return entry;
  }

  private assignEntrySquare(entry: ActivePieceEntry, square: string, targetX: number, targetZ: number): void {
    entry.square = square;
    entry.targetX = targetX;
    entry.targetZ = targetZ;
    entry.group.userData.square = square;
    entry.group.traverse((child) => {
      child.userData.square = square;
    });
  }

  private updateHighlights(snapshot: SceneStateSnapshot): void {
    // Selected piece ring & lift
    if (snapshot.selectedSquare) {
      const { x, z } = squareToWorldXZ(snapshot.selectedSquare, SQUARE_SIZE);
      this.selectedRing.position.set(x, BOARD_TOP_Y + 0.008, z);
      this.selectedRing.visible = true;
    } else {
      this.selectedRing.visible = false;
    }

    // Elevate selected piece slightly (when not animating or dragging)
    this.activePieces.forEach((entry) => {
      if (!entry.anim && this.draggingEntry !== entry) {
        const lift = entry.square === snapshot.selectedSquare ? 0.14 : 0;
        entry.group.position.y = BOARD_TOP_Y + lift;
      }
    });

    // Last move highlights
    if (snapshot.lastMove) {
      const f = squareToWorldXZ(snapshot.lastMove.from, SQUARE_SIZE);
      const t = squareToWorldXZ(snapshot.lastMove.to, SQUARE_SIZE);
      this.lastMoveFromMesh.position.set(f.x, BOARD_TOP_Y + 0.004, f.z);
      this.lastMoveToMesh.position.set(t.x, BOARD_TOP_Y + 0.004, t.z);
      this.lastMoveFromMesh.visible = true;
      this.lastMoveToMesh.visible = true;
    } else {
      this.lastMoveFromMesh.visible = false;
      this.lastMoveToMesh.visible = false;
    }

    // Check warning ring
    if (snapshot.checkSquare) {
      const c = squareToWorldXZ(snapshot.checkSquare, SQUARE_SIZE);
      this.checkRing.position.set(c.x, BOARD_TOP_Y + 0.009, c.z);
      this.checkRing.visible = true;
    } else {
      this.checkRing.visible = false;
    }

    // Legal move indicators
    while (this.legalMarkersGroup.children.length > 0) {
      const child = this.legalMarkersGroup.children[0] as THREE.Mesh;
      this.legalMarkersGroup.remove(child);
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }

    if (snapshot.legalMoves.length > 0) {
      const dotGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.014, 24);
      const captureRingGeo = new THREE.RingGeometry(0.32, 0.43, 28);
      captureRingGeo.rotateX(-Math.PI / 2);

      const dotMat = new THREE.MeshBasicMaterial({
        color: 0x38d399,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      });
      const captureMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      });

      const seen = new Set<string>();
      for (const mv of snapshot.legalMoves) {
        if (seen.has(mv.to)) continue;
        seen.add(mv.to);
        const { x, z } = squareToWorldXZ(mv.to, SQUARE_SIZE);
        if (mv.isCapture) {
          const ring = new THREE.Mesh(captureRingGeo.clone(), captureMat.clone());
          ring.position.set(x, BOARD_TOP_Y + 0.01, z);
          this.legalMarkersGroup.add(ring);
        } else {
          const dot = new THREE.Mesh(dotGeo.clone(), dotMat.clone());
          dot.position.set(x, BOARD_TOP_Y + 0.008, z);
          this.legalMarkersGroup.add(dot);
        }
      }

      dotGeo.dispose();
      captureRingGeo.dispose();
      dotMat.dispose();
      captureMat.dispose();
    }
  }

  public setCameraPreset(preset: CameraPresetId, flipped = this.currentFlipped, animate = true): void {
    this.currentPreset = preset;
    this.currentFlipped = flipped;
    const sign = flipped ? -1 : 1;
    const aspect = this.camera.aspect || 1;
    const portraitScale = aspect < 1 ? THREE.MathUtils.clamp(1.06 / Math.pow(aspect, 0.32), 1, 1.45) : 1;

    if (preset === 'classic') {
      _camGoalPos.set(0, 8.8 * portraitScale, 9.2 * sign * portraitScale);
      _camGoalTarget.set(0, 0.15, 0);
    } else if (preset === 'cinematic') {
      _camGoalPos.set(6.4 * sign * portraitScale, 5.2 * portraitScale, 8.4 * sign * portraitScale);
      _camGoalTarget.set(0, 0.35, 0);
    } else {
      // top view (zero roll tilt, > minPolarAngle, clears bottom dock cleanly)
      _camGoalPos.set(0, 15.6 * portraitScale, 1.85 * sign * portraitScale);
      _camGoalTarget.set(0, 0, 0.45 * sign);
    }

    if (!animate || this.isSoftwareGl) {
      this.camera.position.copy(_camGoalPos);
      this.controls.target.copy(_camGoalTarget);
      this.cameraTransitioning = false;
      this.controls.update();
      this.requestRender();
    } else {
      this.cameraTransitioning = true;
      this.requestRender();
    }
  }

  private updateNdcFromPointer(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private raycastSquare(e: PointerEvent): string | null {
    this.updateNdcFromPointer(e);
    _raycaster.setFromCamera(_ndc, this.camera);

    // Check pieces first so clicking the upper half of a tall King/Queen still picks its square
    const pieceHits = _raycaster.intersectObjects(this.piecesRoot.children, true);
    if (pieceHits.length > 0) {
      const sq = pieceHits[0].object.userData.square as string | undefined;
      if (sq) return sq;
    }

    const sqHits = _raycaster.intersectObjects(this.squareHitList, false);
    if (sqHits.length > 0) {
      return (sqHits[0].object.userData.square as string) || null;
    }
    return null;
  }

  private raycastBoardSquareOnly(e: PointerEvent): string | null {
    this.updateNdcFromPointer(e);
    _raycaster.setFromCamera(_ndc, this.camera);
    const sqHits = _raycaster.intersectObjects(this.squareHitList, false);
    if (sqHits.length > 0) {
      return (sqHits[0].object.userData.square as string) || null;
    }
    return null;
  }

  private bindPointerEvents(): void {
    const dom = this.renderer.domElement;

    const resetInteractionState = () => {
      this.controls.enabled = true;
      this.hoverTileMesh.visible = false;
      if (this.draggingEntry) {
        const { x, z } = squareToWorldXZ(this.draggingEntry.square, SQUARE_SIZE);
        this.draggingEntry.group.position.set(x, BOARD_TOP_Y, z);
        this.draggingEntry.shadow.position.set(x, BOARD_TOP_Y + 0.003, z);
      }
      this.draggingEntry = null;
      this.dragLegalDestinations.clear();
      this.potentialDragSquare = null;
      this.isPointerDown = false;
      this.activePointerId = null;
      dom.style.cursor = 'default';
    };

    const onPointerDown = (e: PointerEvent) => {
      this.activePointers.add(e.pointerId);

      // Multi-touch pinch/pan on mobile: immediately release piece drag so OrbitControls can zoom/pan
      if (this.activePointers.size > 1) {
        resetInteractionState();
        this.requestRender();
        return;
      }

      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!e.isPrimary) return;
      if (!this.currentState?.interactive) return;

      this.isPointerDown = true;
      this.activePointerId = e.pointerId;
      this.pointerDownPos = { x: e.clientX, y: e.clientY };

      const hitSquare = this.raycastSquare(e);
      if (hitSquare) {
        const entry = this.activePieces.get(hitSquare);
        if (entry && entry.color === this.currentState.activeTurn) {
          this.potentialDragSquare = hitSquare;
          // Prevent OrbitControls from tilting the camera while clicking/dragging own piece
          this.controls.enabled = false;
        } else {
          this.potentialDragSquare = null;
        }
      } else {
        this.potentialDragSquare = null;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.currentState?.interactive) {
        dom.style.cursor = 'grab';
        return;
      }

      if (this.activePointers.size > 1 || (this.activePointerId !== null && e.pointerId !== this.activePointerId)) {
        return;
      }

      if (this.isPointerDown && this.potentialDragSquare && !this.draggingEntry) {
        const dx = e.clientX - this.pointerDownPos.x;
        const dy = e.clientY - this.pointerDownPos.y;
        const thresholdSq = e.pointerType === 'touch' ? 64 : 36;
        if (dx * dx + dy * dy > thresholdSq) {
          // Enter drag-and-drop mode!
          const entry = this.activePieces.get(this.potentialDragSquare);
          if (entry) {
            this.draggingEntry = entry;
            this.controls.enabled = false;
            const legal = this.callbacks.onBeginDragSquare(this.potentialDragSquare);
            this.dragLegalDestinations = new Set(legal.map((m) => m.to));
            dom.style.cursor = 'grabbing';
          }
        }
      }

      if (this.draggingEntry) {
        this.updateNdcFromPointer(e);
        _raycaster.setFromCamera(_ndc, this.camera);
        if (_raycaster.ray.intersectPlane(_dragPlane, _planeHit)) {
          const clampedX = THREE.MathUtils.clamp(_planeHit.x, -4.1, 4.1);
          const clampedZ = THREE.MathUtils.clamp(_planeHit.z, -4.1, 4.1);
          this.draggingEntry.group.position.set(clampedX, BOARD_TOP_Y + 0.45, clampedZ);
          this.draggingEntry.shadow.position.set(clampedX, BOARD_TOP_Y + 0.003, clampedZ);
        }

        const hoverSq = this.raycastBoardSquareOnly(e);
        this.hoveredSquare = hoverSq;
        if (hoverSq && this.dragLegalDestinations.has(hoverSq)) {
          const { x, z } = squareToWorldXZ(hoverSq, SQUARE_SIZE);
          this.hoverTileMesh.position.set(x, BOARD_TOP_Y + 0.007, z);
          this.hoverTileMesh.visible = true;
        } else {
          this.hoverTileMesh.visible = false;
        }
        this.requestRender();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      this.activePointers.delete(e.pointerId);
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

      if (this.draggingEntry) {
        const fromSquare = this.draggingEntry.square;
        const dropSquare = this.raycastBoardSquareOnly(e);
        const dragEntry = this.draggingEntry;
        const legalDests = new Set(this.dragLegalDestinations);
        this.draggingEntry = null;
        resetInteractionState();

        let moved = false;
        if (dropSquare && dropSquare !== fromSquare && legalDests.has(dropSquare)) {
          moved = this.callbacks.onDropMove(fromSquare, dropSquare);
        }

        if (!moved) {
          const { x, z } = squareToWorldXZ(fromSquare, SQUARE_SIZE);
          dragEntry.group.position.set(x, BOARD_TOP_Y + 0.14, z);
          dragEntry.shadow.position.set(x, BOARD_TOP_Y + 0.003, z);
        }

        this.requestRender();
        return;
      }

      const wasPointerDown = this.isPointerDown;
      const startX = this.pointerDownPos.x;
      const startY = this.pointerDownPos.y;
      resetInteractionState();

      if (wasPointerDown && this.currentState?.interactive) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const thresholdSq = e.pointerType === 'touch' ? 64 : 36;
        if (dx * dx + dy * dy <= thresholdSq) {
          const clickedSquare = this.raycastSquare(e);
          if (clickedSquare) {
            this.callbacks.onSelectOrMoveSquare(clickedSquare);
          }
        }
      }
    };

    const onPointerCancelOrBlur = (e?: PointerEvent) => {
      if (e) {
        this.activePointers.delete(e.pointerId);
      } else {
        this.activePointers.clear();
      }
      resetInteractionState();
      this.requestRender();
    };

    const onWindowBlur = () => {
      onPointerCancelOrBlur();
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancelOrBlur);
    window.addEventListener('blur', onWindowBlur);

    this.unbindPointerEvents = () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancelOrBlur);
      window.removeEventListener('blur', onWindowBlur);
    };
  }

  private unbindPointerEvents: () => void = () => {};

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 320);
    const height = Math.max(this.container.clientHeight, 240);
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? THREE.MathUtils.clamp(42 / Math.pow(aspect, 0.72), 42, 82) : 42;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (!this.isTitleShowcase) {
      this.setCameraPreset(this.currentPreset, this.currentFlipped, false);
    } else {
      this.requestRender();
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private requestRender(): void {
    if (this.disposed) return;
    if (this.renderBusy) {
      this.renderDirty = true;
      return;
    }
    this.renderBusy = true;
    this.frameId = window.requestAnimationFrame(() => this.renderFrame());
  }

  private renderFrame(): void {
    if (this.disposed) return;
    this.renderDirty = false;

    const now = performance.now();
    const dt = Math.min((now - this.lastTickTime) / 1000, 0.05);
    this.lastTickTime = now;

    let hasActiveAnimation = false;

    // 1. Piece movement animations
    this.activePieces.forEach((entry) => {
      if (!entry.anim) return;
      hasActiveAnimation = true;
      entry.anim.elapsed += dt;
      const t = Math.min(entry.anim.elapsed / entry.anim.duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      const x = THREE.MathUtils.lerp(entry.anim.startX, entry.anim.endX, ease);
      const z = THREE.MathUtils.lerp(entry.anim.startZ, entry.anim.endZ, ease);
      const arc = Math.sin(t * Math.PI) * entry.anim.arcHeight;

      entry.group.position.set(x, BOARD_TOP_Y + arc, z);
      entry.shadow.position.set(x, BOARD_TOP_Y + 0.003, z);

      if (t >= 1) {
        entry.group.position.set(entry.targetX, BOARD_TOP_Y, entry.targetZ);
        entry.shadow.position.set(entry.targetX, BOARD_TOP_Y + 0.003, entry.targetZ);
        entry.anim = undefined;
      }
    });

    // 2. Capture dissolve animations
    for (let i = this.captureAnims.length - 1; i >= 0; i--) {
      hasActiveAnimation = true;
      const cap = this.captureAnims[i];
      cap.elapsed += dt;
      const t = Math.min(cap.elapsed / cap.duration, 1);
      const inv = 1 - t;
      cap.group.scale.setScalar(Math.max(0.001, inv));
      cap.group.position.y = cap.startY + t * 0.9;
      cap.group.rotation.y += dt * 6;
      if (t >= 1) {
        this.piecesRoot.remove(cap.group);
        this.captureAnims.splice(i, 1);
      }
    }

    // 3. Smooth damped camera preset transitions
    if (this.cameraTransitioning) {
      hasActiveAnimation = true;
      const lambda = 7.5;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camGoalPos.x, lambda, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camGoalPos.y, lambda, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camGoalPos.z, lambda, dt);
      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, _camGoalTarget.x, lambda, dt);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, _camGoalTarget.y, lambda, dt);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, _camGoalTarget.z, lambda, dt);

      if (
        this.camera.position.distanceTo(_camGoalPos) < 0.03 &&
        this.controls.target.distanceTo(_camGoalTarget) < 0.02
      ) {
        this.camera.position.copy(_camGoalPos);
        this.controls.target.copy(_camGoalTarget);
        this.cameraTransitioning = false;
      }
    }

    // 4. Title showcase gentle autoRotate (GPU only)
    if (this.isTitleShowcase && !this.isSoftwareGl) {
      hasActiveAnimation = true;
    }

    const controlsChanged = this.controls.update();
    if (controlsChanged && !this.isSoftwareGl) {
      hasActiveAnimation = true;
    }

    this.renderer.render(this.scene, this.camera);

    const done = () => {
      this.renderBusy = false;
      if (this.disposed) return;
      if (this.renderDirty || hasActiveAnimation) {
        this.requestRender();
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(done);
    } else {
      done();
    }
  }

  public dispose(): void {
    this.disposed = true;
    window.cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    this.unbindPointerEvents();
    this.resizeObserver.disconnect();
    this.controls.dispose();

    this.clearAllPieces();
    this.captureAnims.forEach((c) => this.piecesRoot.remove(c.group));
    this.captureAnims = [];

    this.pieceCache.dispose();
    this.materials.dispose();
    this.contactShadowTex.dispose();
    this.contactShadowGeo.dispose();
    this.contactShadowMat.dispose();
    this.coordTextures.forEach((t) => t.dispose());
    this.disposableGeos.forEach((g) => g.dispose());
    this.disposableMats.forEach((m) => m.dispose());
    this.envMap.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
