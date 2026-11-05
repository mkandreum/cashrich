/* Tablero 3D: edificios en cada casilla, ciudad de activos en la plaza, dado y fichas físicas. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { board as BOARD, ratoneraPos as BOARD_POS, via as VIA, viaPos as VIA_POS } from '../../data.json';
import MODELS from '../../shared/models3d.json';
import type { Asset, Snapshot } from './api';
import type { Motion } from './hooks';
import { avatarShapes, paintShapes } from './art';

type Part = { s: string; p: number[]; z: number[]; c: string; r?: number[]; spin?: number; spinZ?: number };
const parts = (name: string) => (MODELS as unknown as Record<string, Part[]>)[name] ?? [];

const CELL = 1.12;
const COLS = 10; // rejilla 10x8: anillo de 32 casillas y vía rápida de 16
const ROWS = 8;
const LANE_COLS = COLS - 2;
const TOP = -CELL * (ROWS - 2) / 2; // borde superior del interior
const LANE_BOTTOM = TOP + 2 * CELL * 0.96 + 0.04;
const PLAZA_BOTTOM = CELL * (ROWS - 2) / 2;
const PLAZA_Z = (LANE_BOTTOM + PLAZA_BOTTOM) / 2;
const PLAZA_D = PLAZA_BOTTOM - LANE_BOTTOM - 0.1;
const LANE_Y = 0.32;
const LANE_SCALE = 0.86;
const TILES: Record<string, { color: string; model: string; label: string; ink: string }> = {
  cobrar: { color: '#FFC83D', model: 'coins', label: 'COBRA', ink: '#1D1A33' },
  peq: { color: '#2FB5F5', model: 'house', label: 'PEQUEÑA', ink: '#10143A' },
  grande: { color: '#FF5A4E', model: 'tower', label: 'GRANDE', ink: '#FFFFFF' },
  mercado: { color: '#8B5CF6', model: 'market', label: 'MERCADO', ink: '#FFFFFF' },
  gusto: { color: '#FF6FB5', model: 'shop', label: 'GUSTO', ink: '#1D1A33' },
  banco: { color: '#7C8BD6', model: 'bank', label: 'BANCO', ink: '#10143A' },
  sueno: { color: '#FFF0A8', model: 'castle', label: 'SUEÑO', ink: '#1D1A33' },
  salida: { color: '#3DDC97', model: 'arch', label: 'SALIDA', ink: '#10143A' },
  auditoria: { color: '#7C8BD6', model: 'dome', label: 'AUDITORÍA', ink: '#10143A' },
  oportunidad: { color: '#FF5A4E', model: 'rocket', label: 'OPORTUNIDAD', ink: '#FFFFFF' },
  impuesto: { color: '#9AA3B5', model: 'hacienda', label: 'HACIENDA', ink: '#10143A' },
  formacion: { color: '#4FD1C5', model: 'school', label: 'FORMACIÓN', ink: '#10143A' },
  imprevisto: { color: '#FF9F43', model: 'storm', label: 'IMPREVISTO', ink: '#1D1A33' },
};
const ASSET_MODEL: Record<string, string> = {
  VIVIENDA: 'house', COMERCIAL: 'tower', INDUSTRIAL: 'factory', TURISMO: 'hotel', TERRENO: 'land', ENERGÍA: 'turbine', AGRO: 'farm',
  BOLSA: 'chart', 'RENTA FIJA': 'bank', COLECTIVO: 'chart', PROTECCIÓN: 'bank', VOLÁTIL: 'chart', REGALÍAS: 'coins', CRIPTO: 'chart', RIESGO: 'rocket', DUDOSA: 'rocket',
  NEGOCIO: 'shop', FRANQUICIA: 'shop', SOCIEDAD: 'tower', SERVICIO: 'shop', DIGITAL: 'tower',
};

function tileLook(track: 'board' | 'via', index: number) {
  const kind = (track === 'board' ? BOARD : VIA)[index].kind;
  if (track === 'board' && index === 0) return TILES.salida;
  if (track === 'via' && kind === 'banco') return TILES.auditoria;
  if (track === 'via' && kind === 'peq') return TILES.oportunidad;
  return TILES[kind];
}

/* Centro de una casilla en el mundo */
function tileSpot(track: 'board' | 'via', index: number) {
  const [col, row] = track === 'board' ? BOARD_POS[index] : VIA_POS[index];
  if (track === 'board') return new THREE.Vector3((col - (COLS + 1) / 2) * CELL, 0.1, (row - (ROWS + 1) / 2) * CELL);
  const width = LANE_COLS * CELL;
  const cell = (width - 0.16) / LANE_COLS;
  return new THREE.Vector3(-width / 2 + 0.08 + cell * (col - 1.5), LANE_Y + 0.1, TOP + 0.56 + (row - 2) * CELL * 0.96 + 0.02);
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const label = (text: string, ink: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const g = canvas.getContext('2d')!;
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `${text.length > 8 ? 40 : 50}px "Lilita One", sans-serif`;
  g.fillText(text, 128, 34, 240);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

class Pawn {
  group = new THREE.Group();
  from = new THREE.Vector3();
  to = new THREE.Vector3();
  t = 1;
  key = '';
  constructor(color: string, emoji: string) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.15 });
    const add = (geo: THREE.BufferGeometry, y: number) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = y;
      mesh.castShadow = true;
      this.group.add(mesh);
    };
    add(new THREE.CylinderGeometry(0.21, 0.27, 0.1, 28), 0.05);
    add(new THREE.CylinderGeometry(0.09, 0.19, 0.34, 24), 0.27);
    add(new THREE.SphereGeometry(0.15, 24, 18), 0.52);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const g = canvas.getContext('2d')!;
    g.fillStyle = color;
    g.beginPath();
    g.arc(64, 64, 58, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 8;
    g.strokeStyle = '#ffffff';
    g.stroke();
    const shapes = avatarShapes(emoji);
    if (shapes) {
      paintShapes(g, shapes, 24, 22, 80);
    } else {
      g.font = '70px serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(emoji, 64, 70);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
    sprite.scale.setScalar(0.5);
    sprite.position.y = 0.98;
    sprite.renderOrder = 10;
    this.group.add(sprite);
  }
}

export class BoardScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 4 / 3, 0.1, 100);
  private clock = new THREE.Clock();
  private frame = 0;
  private observer: ResizeObserver;
  private geoCache = new Map<string, THREE.BufferGeometry>();
  private matCache = new Map<string, THREE.Material>();
  private spinners: THREE.Object3D[] = [];
  private spinnersZ: THREE.Object3D[] = [];
  private cars: { mesh: THREE.Object3D; at: number; speed: number }[] = [];
  private clouds: THREE.Object3D[] = [];
  private pawns = new Map<string, Pawn>();
  private tilesByKey = new Map<string, THREE.Mesh>();
  private city = new Map<string, { object: THREE.Object3D; born: number }>();
  private cityRoot = new THREE.Group();
  private laneGate!: THREE.MeshStandardMaterial;
  private die!: THREE.Mesh;
  private dieFrom = new THREE.Quaternion();
  private dieTo = new THREE.Quaternion();
  private dieT = 1;
  private diePlaced = 0;
  private focus = new THREE.Vector3(0, 0, 0);
  private focusTarget = new THREE.Vector3(0, 0, 0);
  private zoom = 1;
  private zoomTarget = 1;
  private calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private activeKey = '';
  private sun!: THREE.DirectionalLight;
  private sunTarget = 2.6;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    // Reflejos suaves en cristales, metales y monedas
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.12;
    pmrem.dispose();
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    this.buildWorld();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      this.tick(Math.min(this.clock.getDelta(), 0.05));
    };
    loop();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose?.();
    });
    this.matCache.forEach((m) => m.dispose());
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.host;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ materiales y piezas

  private material(color: string, opts: { windows?: boolean; rough?: number; metal?: number } = {}) {
    const key = `${color}:${opts.windows ? 'w' : ''}:${opts.rough ?? ''}:${opts.metal ?? ''}`;
    let mat = this.matCache.get(key);
    if (!mat) {
      const base: THREE.MeshStandardMaterialParameters = { color, roughness: opts.rough ?? 0.6, metalness: opts.metal ?? 0 };
      if (opts.windows) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;
        const g = canvas.getContext('2d')!;
        g.fillStyle = color;
        g.fillRect(0, 0, 128, 128);
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 6; x++) {
            g.fillStyle = Math.random() > 0.3 ? '#FFE9A8' : '#1B2A4A';
            g.fillRect(6 + x * 20, 6 + y * 15, 13, 9);
          }
        }
        const map = new THREE.CanvasTexture(canvas);
        map.colorSpace = THREE.SRGBColorSpace;
        base.color = '#ffffff';
        base.map = map;
        base.roughness = 0.35;
      }
      mat = new THREE.MeshStandardMaterial(base);
      this.matCache.set(key, mat);
    }
    return mat;
  }

  private geometry(shape: string) {
    let geo = this.geoCache.get(shape);
    if (geo) return geo;
    if (shape === 'cyl') geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 22);
    else if (shape === 'cone') geo = new THREE.ConeGeometry(0.5, 1, 22);
    else if (shape === 'sphere') geo = new THREE.SphereGeometry(0.5, 20, 14);
    else if (shape === 'gem') geo = new THREE.OctahedronGeometry(0.5);
    else if (shape === 'roof') {
      const s = new THREE.Shape();
      s.moveTo(-0.5, -0.5);
      s.lineTo(0.5, -0.5);
      s.lineTo(0, 0.5);
      s.closePath();
      geo = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
      geo.translate(0, 0, -0.5);
    } else geo = new THREE.BoxGeometry(1, 1, 1);
    this.geoCache.set(shape, geo);
    return geo;
  }

  private buildModel(name: string) {
    const group = new THREE.Group();
    parts(name).forEach((part) => {
      const metal = part.c === '#FFC83D' || part.c === '#F2B21E' || part.c === '#FFD65C';
      const mesh = new THREE.Mesh(
        this.geometry(part.s === 'win' ? 'box' : part.s),
        this.material(part.c, { windows: part.s === 'win', metal: metal ? 0.65 : 0, rough: metal ? 0.3 : undefined }),
      );
      mesh.position.set(part.p[0], part.p[1], part.p[2]);
      mesh.scale.set(part.z[0], part.z[1], part.z[2]);
      if (part.r) mesh.rotation.set(THREE.MathUtils.degToRad(part.r[0]), THREE.MathUtils.degToRad(part.r[1]), THREE.MathUtils.degToRad(part.r[2]));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      if (part.spin) this.spinners.push(mesh);
      if (part.spinZ) this.spinnersZ.push(mesh);
    });
    return group;
  }

  private tileGeometry() {
    let geo = this.geoCache.get('tile');
    if (geo) return geo;
    const size = 1.04;
    const r = 0.12;
    const h = size / 2;
    const s = new THREE.Shape();
    s.moveTo(-h + r, -h);
    s.lineTo(h - r, -h);
    s.quadraticCurveTo(h, -h, h, -h + r);
    s.lineTo(h, h - r);
    s.quadraticCurveTo(h, h, h - r, h);
    s.lineTo(-h + r, h);
    s.quadraticCurveTo(-h, h, -h, h - r);
    s.lineTo(-h, -h + r);
    s.quadraticCurveTo(-h, -h, -h + r, -h);
    geo = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 });
    geo.rotateX(-Math.PI / 2);
    this.geoCache.set('tile', geo);
    return geo;
  }

  private addTile(track: 'board' | 'via', index: number) {
    const look = tileLook(track, index);
    const spot = tileSpot(track, index);
    const scale = track === 'via' ? LANE_SCALE : 1;
    const group = new THREE.Group();
    group.position.set(spot.x, spot.y - 0.1, spot.z);
    group.scale.setScalar(scale);
    const tile = new THREE.Mesh(this.tileGeometry(), new THREE.MeshStandardMaterial({ color: look.color, roughness: 0.45 }));
    tile.receiveShadow = true;
    tile.castShadow = true;
    group.add(tile);
    const model = this.buildModel(look.model);
    model.position.set(0, 0.1, -0.1);
    model.scale.setScalar(track === 'via' ? 0.68 : 0.78);
    group.add(model);
    const text = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.24),
      new THREE.MeshBasicMaterial({ map: label(look.label, look.ink), transparent: true }),
    );
    text.rotation.x = -Math.PI / 2;
    text.position.set(0, 0.121, 0.37);
    group.add(text);
    this.scene.add(group);
    this.tilesByKey.set(`${track}:${index}`, tile);
  }

  private buildWorld() {
    const sky = new THREE.HemisphereLight('#FFF3D6', '#27624F', 1.5);
    this.scene.add(sky);
    const sun = new THREE.DirectionalLight('#FFF1D0', 2.6);
    this.sun = sun;
    sun.position.set(-5, 11, 6);
    sun.castShadow = true;
    const small = window.innerWidth < 800;
    sun.shadow.mapSize.setScalar(small ? 1024 : 2048);
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 9;
    sun.shadow.camera.bottom = -9;
    sun.shadow.camera.far = 34;
    sun.shadow.bias = -0.0006;
    this.scene.add(sun);

    // Mesa de madera y carretera alrededor
    const wood = new THREE.Mesh(new THREE.BoxGeometry(CELL * COLS + 1.25, 0.34, CELL * ROWS + 1.25), new THREE.MeshStandardMaterial({ color: '#6D4326', roughness: 0.72 }));
    wood.position.y = -0.2;
    wood.receiveShadow = true;
    wood.castShadow = true;
    this.scene.add(wood);
    const road = new THREE.Mesh(new THREE.BoxGeometry(CELL * COLS + 0.95, 0.02, CELL * ROWS + 0.95), new THREE.MeshStandardMaterial({ color: '#39404F', roughness: 0.9 }));
    road.position.y = -0.02;
    road.receiveShadow = true;
    this.scene.add(road);
    const base = new THREE.Mesh(new THREE.BoxGeometry(CELL * COLS + 0.02, 0.04, CELL * ROWS + 0.02), new THREE.MeshStandardMaterial({ color: '#2B6B55', roughness: 0.95 }));
    base.position.y = -0.005;
    base.receiveShadow = true;
    this.scene.add(base);
    this.buildCars();

    BOARD.forEach((_, i) => this.addTile('board', i));

    // Plataforma elevada de la vía rápida, con borde de oro
    const laneW = LANE_COLS * CELL;
    const laneD = 2 * CELL * 0.96;
    const lane = new THREE.Mesh(new THREE.BoxGeometry(laneW, LANE_Y, laneD), new THREE.MeshStandardMaterial({ color: '#1C2350', roughness: 0.4 }));
    lane.position.set(0, LANE_Y / 2 - 0.02, TOP + CELL + 0.02);
    lane.castShadow = true;
    lane.receiveShadow = true;
    this.scene.add(lane);
    this.laneGate = new THREE.MeshStandardMaterial({ color: '#FFC83D', roughness: 0.25, metalness: 0.7, emissive: '#FFC83D', emissiveIntensity: 0.15 });
    const rim = new THREE.Mesh(new THREE.BoxGeometry(laneW + 0.05, 0.06, laneD + 0.05), this.laneGate);
    rim.position.set(0, LANE_Y - 0.03, TOP + CELL + 0.02);
    this.scene.add(rim);
    VIA.forEach((_, i) => this.addTile('via', i));

    // Plaza central: aquí se levanta la ciudad de cada jugador
    const plazaD = PLAZA_D;
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(laneW, 0.06, plazaD), new THREE.MeshStandardMaterial({ color: '#D9C9A0', roughness: 0.85 }));
    plaza.position.set(0, 0.03, PLAZA_Z + 0.02);
    plaza.receiveShadow = true;
    this.scene.add(plaza);
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.8, 0.12, 40), new THREE.MeshStandardMaterial({ color: '#0D5F4E', roughness: 0.95 }));
    tray.position.set(0, 0.1, PLAZA_Z + 0.02);
    tray.receiveShadow = true;
    this.scene.add(tray);
    this.scene.add(this.cityRoot);
    this.buildDie();

    // Bosque y nubes alrededor de la mesa
    const edgeX = CELL * COLS / 2 + 0.95;
    const edgeZ = CELL * ROWS / 2 + 0.9;
    for (let i = 0; i < 34; i++) {
      const tree = this.buildModel('tree');
      const side = i % 4;
      const along = Math.random() * 2 - 1;
      const out = 0.15 + Math.random() * 0.8;
      const x = side < 2 ? along * edgeX : (side === 2 ? -1 : 1) * (edgeX + out);
      const z = side < 2 ? (side === 0 ? -1 : 1) * (edgeZ + out) : along * edgeZ;
      tree.position.set(x, -0.4, z);
      tree.scale.setScalar(1 + Math.random() * 0.9);
      this.scene.add(tree);
    }
    const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 4; i++) {
      const cloud = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const puff = new THREE.Mesh(this.geometry('sphere'), cloudMat);
        puff.position.set(j * 0.4 - 0.6, Math.random() * 0.14, Math.random() * 0.3);
        puff.scale.set(0.7 + Math.random() * 0.4, 0.42, 0.6);
        cloud.add(puff);
      }
      cloud.position.set(-8.5 + i * 5.6, 1.6 + (i % 2) * 0.5, -6.2 - (i % 2) * 0.8);
      this.clouds.push(cloud);
      this.scene.add(cloud);
    }
  }

  private buildCars() {
    const colors = ['#FF5A4E', '#2FB5F5', '#FFC83D', '#FFFFFF', '#3DDC97'];
    colors.forEach((color, i) => {
      const car = new THREE.Group();
      const body = new THREE.Mesh(this.geometry('box'), this.material(color, { rough: 0.25 }));
      body.scale.set(0.3, 0.08, 0.15);
      body.position.y = 0.06;
      body.castShadow = true;
      const top = new THREE.Mesh(this.geometry('box'), this.material('#26304A', { rough: 0.2 }));
      top.scale.set(0.15, 0.065, 0.125);
      top.position.set(-0.02, 0.13, 0);
      car.add(body, top);
      this.scene.add(car);
      this.cars.push({ mesh: car, at: i / colors.length, speed: 0.022 + (i % 3) * 0.006 });
    });
  }

  private buildDie() {
    const pips: Record<number, number[][]> = {
      1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]],
      5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
    };
    const face = (value: number) => {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d')!;
      g.fillStyle = '#FFFDF6';
      g.fillRect(0, 0, 128, 128);
      g.lineWidth = 8;
      g.strokeStyle = '#E9D8AE';
      g.strokeRect(0, 0, 128, 128);
      g.fillStyle = '#FF5A4E';
      pips[value].forEach(([x, y]) => {
        g.beginPath();
        g.arc(30 + x * 34, 30 + y * 34, 13, 0, Math.PI * 2);
        g.fill();
      });
      const map = new THREE.CanvasTexture(c);
      map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.3 });
    };
    this.die = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), [3, 4, 1, 6, 2, 5].map(face));
    this.die.castShadow = true;
    this.die.position.set(0, 0.47, PLAZA_Z + 0.02);
    this.die.rotation.y = 0.5;
    this.scene.add(this.die);
  }

  // ------------------------------------------------------------ estado de la partida

  update(room: Snapshot, motion: Motion | null) {
    const alive = room.players.filter((p) => !p.bankrupt);
    const pieces = alive.map((p) => {
      const moving = motion?.playerId === p.id;
      const track: 'board' | 'via' = moving ? motion!.lane : p.escaped ? 'via' : 'board';
      const size = track === 'via' ? 12 : 24;
      const at = moving ? (motion!.from + motion!.step) % size : track === 'via' ? p.vpos : p.pos;
      return { player: p, track, at };
    });

    [...this.pawns.keys()].filter((id) => !alive.some((p) => p.id === id)).forEach((id) => {
      this.scene.remove(this.pawns.get(id)!.group);
      this.pawns.delete(id);
    });
    pieces.forEach((piece) => {
      let pawn = this.pawns.get(piece.player.id);
      if (!pawn) {
        pawn = new Pawn(piece.player.color, piece.player.avatar);
        this.pawns.set(piece.player.id, pawn);
        this.scene.add(pawn.group);
        pawn.group.position.copy(tileSpot(piece.track, piece.at));
        pawn.from.copy(pawn.group.position);
        pawn.to.copy(pawn.group.position);
      }
      const group = pieces.filter((o) => o.track === piece.track && o.at === piece.at);
      const angle = (group.indexOf(piece) / Math.max(1, group.length)) * Math.PI * 2;
      const spread = group.length > 1 ? 0.24 : 0;
      const target = tileSpot(piece.track, piece.at).add(new THREE.Vector3(Math.cos(angle) * spread, 0, Math.sin(angle) * spread));
      const key = `${target.x.toFixed(2)}:${target.z.toFixed(2)}`;
      if (key !== pawn.key) {
        pawn.key = key;
        pawn.from.copy(pawn.group.position);
        pawn.to.copy(target);
        pawn.t = 0;
      }
    });

    // Resalta la casilla activa y encuadra a quien se mueve
    const focusId = motion?.playerId ?? room.players[room.turn]?.id;
    const focus = pieces.find((p) => p.player.id === focusId);
    const nextKey = focus ? `${focus.track}:${focus.at}` : '';
    if (nextKey !== this.activeKey) {
      const glow = (key: string, on: boolean) => {
        const material = this.tilesByKey.get(key)?.material as THREE.MeshStandardMaterial | undefined;
        if (material) {
          material.emissive.set(on ? '#ffffff' : '#000000');
          material.emissiveIntensity = on ? 0.32 : 0;
        }
      };
      glow(this.activeKey, false);
      glow(nextKey, true);
      this.activeKey = nextKey;
    }
    const moving = !!motion && !motion.rolling;
    this.zoomTarget = moving ? 0.74 : motion?.rolling ? 0.86 : 1;
    if (moving && focus) this.focusTarget.copy(tileSpot(focus.track, focus.at)).multiplyScalar(0.7);
    else if (motion?.rolling) this.focusTarget.set(0, 0, PLAZA_Z * 0.8);
    else this.focusTarget.set(0, 0, 0);

    this.laneGate.emissiveIntensity = room.players.some((p) => p.escaped) ? 0.8 : 0.15;

    // Dado
    if (motion?.rolling && this.dieT >= 1 && this.diePlaced !== -motion.value) {
      this.diePlaced = -motion.value;
      this.dieFrom.copy(this.die.quaternion);
      this.dieTo.copy(this.faceUp(motion.value));
      this.dieT = 0;
    } else if (!motion && room.dice && this.diePlaced !== room.dice) {
      this.diePlaced = room.dice;
      this.die.quaternion.copy(this.faceUp(room.dice));
    } else if (!motion && !room.dice) {
      this.diePlaced = 0;
    }

    this.sunTarget = { recesion: 1.5, boom: 3.2, recuperacion: 2.3, expansion: 2.6 }[room.economy.phase];
    this.sun.color.set(room.economy.phase === 'recesion' ? '#BFD0E8' : '#FFF1D0');
    this.syncCity(room);
  }

  private faceUp(value: number) {
    const e = new THREE.Euler();
    if (value === 6) e.set(Math.PI, 0, 0);
    else if (value === 2) e.set(-Math.PI / 2, 0, 0);
    else if (value === 5) e.set(Math.PI / 2, 0, 0);
    else if (value === 3) e.set(0, 0, Math.PI / 2);
    else if (value === 4) e.set(0, 0, -Math.PI / 2);
    const q = new THREE.Quaternion().setFromEuler(e);
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.5).multiply(q);
  }

  /* Cada activo comprado se construye en la plaza, sobre una baldosa del color de su dueño */
  private syncCity(room: Snapshot) {
    const all: { asset: Asset; color: string }[] = room.players.flatMap((p) => p.assets.map((asset) => ({ asset, color: p.color })));
    const wanted = new Set(all.map((a) => a.asset.id));
    [...this.city.entries()].filter(([id]) => !wanted.has(id)).forEach(([id, item]) => {
      this.cityRoot.remove(item.object);
      this.city.delete(id);
    });
    const cols = 16;
    const rows = 7;
    const stepX = (LANE_COLS * CELL - 0.2) / cols;
    const stepZ = (PLAZA_D - 0.2) / rows;
    const slots: [number, number][] = [];
    for (let r = rows - 1; r >= 0; r--) {
      for (let c = 0; c < cols; c++) {
        const inTray = c >= 6 && c <= 9 && r >= 2 && r <= 4;
        if (!inTray) slots.push([c, r]);
      }
    }
    all.slice(-slots.length).forEach(({ asset, color }, i) => {
      const [c, r] = slots[i];
      const x = -LANE_COLS * CELL / 2 + 0.1 + stepX * (c + 0.5);
      const z = LANE_BOTTOM + 0.1 + stepZ * (r + 0.5) + 0.06;
      let item = this.city.get(asset.id);
      if (!item) {
        const object = new THREE.Group();
        const plate = new THREE.Mesh(this.geometry('box'), this.material(color, { rough: 0.5 }));
        plate.scale.set(stepX * 0.92, 0.03, stepZ * 0.86);
        plate.position.y = 0.075;
        plate.receiveShadow = true;
        object.add(plate);
        const model = this.buildModel(ASSET_MODEL[asset.tag] ?? 'shop');
        model.scale.setScalar(Math.min(stepX, stepZ) * 0.92);
        model.position.y = 0.09;
        object.add(model);
        this.cityRoot.add(object);
        item = { object, born: performance.now() };
        object.scale.setScalar(0.001);
        this.city.set(asset.id, item);
      }
      item.object.position.set(x, 0, z);
    });
  }

  // ------------------------------------------------------------ animación

  private tick(dt: number) {
    const now = performance.now() / 1000;
    this.spinners.forEach((o) => { o.rotation.y += dt * 1.3; });
    this.spinnersZ.forEach((o) => { o.rotation.z += dt * 2.2; });

    const path = this.perimeter();
    this.cars.forEach((car) => {
      car.at = (car.at + car.speed * dt) % 1;
      const [x, z, angle] = path(car.at);
      car.mesh.position.set(x, -0.01, z);
      car.mesh.rotation.y = angle;
    });
    this.clouds.forEach((cloud) => {
      cloud.position.x += dt * 0.12;
      if (cloud.position.x > 9) cloud.position.x = -9;
    });

    this.pawns.forEach((pawn) => {
      if (pawn.t < 1) {
        const distance = pawn.from.distanceTo(pawn.to);
        pawn.t = Math.min(1, pawn.t + dt / (distance > 2 ? 0.7 : 0.26));
        pawn.group.position.lerpVectors(pawn.from, pawn.to, easeOut(pawn.t));
        pawn.group.position.y += Math.sin(pawn.t * Math.PI) * Math.min(1.6, 0.55 + distance * 0.2);
        const squash = pawn.t > 0.85 ? 1 - Math.sin(((pawn.t - 0.85) / 0.15) * Math.PI) * 0.16 : 1;
        pawn.group.scale.set(2 - squash, squash, 2 - squash);
      }
    });

    this.city.forEach((item) => {
      const age = (performance.now() - item.born) / 700;
      if (age <= 1.2) {
        const t = Math.min(1, age);
        const overshoot = 1 + Math.sin(t * Math.PI) * 0.35;
        item.object.scale.set(1, Math.max(0.001, easeOut(t) * overshoot), 1);
      }
    });

    if (this.dieT < 1) {
      this.dieT = Math.min(1, this.dieT + dt / 1.0);
      const t = this.dieT;
      const tumble = new THREE.Quaternion().setFromEuler(new THREE.Euler((1 - easeOut(t)) * 16, (1 - easeOut(t)) * 9, (1 - easeOut(t)) * 12));
      this.die.quaternion.copy(this.dieTo).premultiply(tumble);
      this.die.position.y = 0.47 + Math.abs(Math.sin(t * Math.PI * 3)) * (1 - t) * 2.1;
    } else {
      this.die.position.y += (0.47 - this.die.position.y) * Math.min(1, dt * 10);
    }

    this.sun.intensity += (this.sunTarget - this.sun.intensity) * Math.min(1, dt);
    this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, dt * 2.4);
    this.focus.lerp(this.focusTarget, Math.min(1, dt * 2.6));
    const swayX = this.calm ? 0 : Math.sin(now * 0.22) * 0.75;
    const swayZ = this.calm ? 0 : Math.cos(now * 0.17) * 0.3;
    const aspectFit = Math.max(1, 1.34 / this.camera.aspect);
    const d = this.zoom * aspectFit;
    this.camera.position.set(this.focus.x + swayX, 15.2 * d, this.focus.z + 11.2 * d + swayZ);
    this.camera.lookAt(this.focus.x, 0, this.focus.z + 0.32);
    this.renderer.render(this.scene, this.camera);
  }

  private perimeter() {
    const w = CELL * COLS + 0.72;
    const d = CELL * ROWS + 0.72;
    const total = 2 * (w + d);
    return (at: number): [number, number, number] => {
      let run = at * total;
      if (run < w) return [-w / 2 + run, -d / 2, 0];
      run -= w;
      if (run < d) return [w / 2, -d / 2 + run, -Math.PI / 2];
      run -= d;
      if (run < w) return [w / 2 - run, d / 2, Math.PI];
      run -= w;
      return [-w / 2, d / 2 - run, Math.PI / 2];
    };
  }
}

