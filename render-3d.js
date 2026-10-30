/* =========================================================
   render-3d.js · Motor 3D Diorama Canario (Three.js WebGL)
   Fase 1: Escena 3D de alta gama, iluminación de estudio y cámara móvil cinemática.
   ========================================================= */
import * as THREE from './lib/three.module.js';
import { Game, Net, weatherToday, lvl } from './state.js?v=28.17.0-online-web';
import { createCharacter3D, animateCharacter } from './render-3d-actors.js?v=28.17.0-online-web';
import { CONTROLS3D, STATIONS_3D, initControls3D, updateContextualProximity, syncControls3DForGameMode, resetControls3DInput } from './controls-3d.js?v=28.17.0-online-web';
import { syncCustomers3D, clearAllCustomers3D, customerInteractionPosition } from './render-3d-customers.js?v=28.17.0-online-web';
import { playerPoses3D } from './movement-3d-model.mjs';
import { setMovementCollision3D, publishLocalPose3D, consumeLocalCorrection3D } from './net-movement-3d.js';
import { setService3DProximityCheck } from './service-3d.js';
import { tablePosTo3D } from './world.js?v=28.17.0-online-web';
import { initUpgrades3D, syncUpgrades3D } from './upgrades-3d.js?v=28.17.0-online-web';
import { initStaff3D, syncStaff3D } from './staff-3d.js?v=28.17.0-online-web';
import { initVFX3D, updateVFX3D, spawnCleanSparkles3D, triggerBeerPourVFX } from './vfx-3d.js?v=28.17.0-online-web';
import {
  attachTrayToCharacter,
  updateTrayAnimation,
  syncStationUI,
  trayAddItem,
  trayClear,
  trayGetItems,
  createItem3D,
  STATIONS_LOGIC
} from './stations-3d.js?v=28.17.0-online-web';
import {
  buildCoastMeshes,
  getCoastGeometryProfile,
  updateCoastMaterials,
  sampleCharacterFootY
} from './coast-materials.js?v=28.17.0-online-web';

const getPlayer = () => (typeof window !== 'undefined' ? window.PLAYER : null);

// ---------- Estado del Motor 3D ----------
let renderer = null;
let scene = null;
let camera = null;
let canvas3d = null;
let isInitialized = false;
let renderedServiceId = null;
let localMeshOwner = 'p1';

// Personajes 3D
let playerMesh = null;
let partnerMesh = null;
let kioskMesh = null;

// Luces
let sunLight = null;
let hemiLight = null;
let ambientLight = null;
let stringLights = [];

// Mallas dinámicas
let waterMesh = null;
let waterMat = null;
let sandMat = null;
let palmLeaves = [];

// Estado de la Cámara Móvil Cinemática
export const CAM3D = {
  // Puntos de anclaje
  target: new THREE.Vector3(0, 1.4, 0),
  targetGoal: new THREE.Vector3(0, 1.4, 0),
  // Posición esférica respecto al target
  dist: 19,
  targetDist: 19,
  minDist: 7,
  maxDist: 34,
  pitch: 0.52,       // ~30º elevación frontal para ver toda la barra
  targetPitch: 0.52,
  yaw: -0.15,        // Ligera rotación isométrica
  targetYaw: -0.15,
  // Paneo manual (desplazamiento del target)
  panOffset: new THREE.Vector2(0, 0),
  targetPanOffset: new THREE.Vector2(0, 0),
  // Interacción
  isInteracting: false,
  lastInteraction: 0,
  followPlayer: true,
  // Zoom presets
  setClose() { CAM3D.targetDist = 9.5; CAM3D.targetPitch = 0.42; },
  setNormal() { CAM3D.targetDist = 19; CAM3D.targetPitch = 0.52; },
  setWide() { CAM3D.targetDist = 30; CAM3D.targetPitch = 0.65; }
};

// ---------- Materiales Compartidos (PBR Stylized) ----------
const MAT = {
  sand: new THREE.MeshStandardMaterial({
    color: 0xedd8a6,
    roughness: 0.92,
    metalness: 0.02,
    flatShading: false
  }),
  woodDark: new THREE.MeshStandardMaterial({
    color: 0x5a3825,
    roughness: 0.65,
    metalness: 0.05
  }),
  woodTeak: new THREE.MeshStandardMaterial({
    color: 0x7a4d2c,
    roughness: 0.45,
    metalness: 0.05
  }),
  woodLight: new THREE.MeshStandardMaterial({
    color: 0xd4a373,
    roughness: 0.6,
    metalness: 0.02
  }),
  wallWhite: new THREE.MeshStandardMaterial({
    color: 0xf8f5ed,
    roughness: 0.85,
    metalness: 0.02
  }),
  teal: new THREE.MeshStandardMaterial({
    color: 0x0f8b8d,
    roughness: 0.35,
    metalness: 0.1
  }),
  coral: new THREE.MeshStandardMaterial({
    color: 0xe8603c,
    roughness: 0.4,
    metalness: 0.05
  }),
  gold: new THREE.MeshStandardMaterial({
    color: 0xf5b82e,
    roughness: 0.25,
    metalness: 0.7
  }),
  chrome: new THREE.MeshStandardMaterial({
    color: 0xd0d5da,
    roughness: 0.12,
    metalness: 0.95
  }),
  palmLeaf: new THREE.MeshStandardMaterial({
    color: 0x2d6a4f,
    roughness: 0.6,
    metalness: 0.05,
    side: THREE.DoubleSide
  }),
  thatch: new THREE.MeshStandardMaterial({
    color: 0xb59a68,
    roughness: 0.95,
    metalness: 0.02,
    flatShading: true
  }),
  bulb: new THREE.MeshStandardMaterial({
    color: 0xffdd88,
    emissive: 0xffaa33,
    emissiveIntensity: 1.2,
    roughness: 0.2
  })
};

// ---------- Construcción del Diorama Canario ----------
function buildBeach(scene) {
  const coast = buildCoastMeshes(scene, getCoastGeometryProfile());
  waterMesh = coast.waterMesh;
  waterMat = coast.waterMat;
  sandMat = coast.sandMat;

  // Silueta del Teide en el horizonte (fondo)
  const teideGeo = new THREE.ConeGeometry(16, 9, 7);
  const teideMat = new THREE.MeshBasicMaterial({ color: 0x6e88a0 });
  const teideMesh = new THREE.Mesh(teideGeo, teideMat);
  teideMesh.position.set(-18, 2.5, -45);
  teideMesh.scale.set(1.4, 0.8, 0.6);
  scene.add(teideMesh);

  // Pico nevado
  const snowGeo = new THREE.ConeGeometry(5, 3, 7);
  const snowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const snowMesh = new THREE.Mesh(snowGeo, snowMat);
  snowMesh.position.set(-18, 5.5, -44.8);
  snowMesh.scale.set(1.4, 0.8, 0.6);
  scene.add(snowMesh);
}

function buildKiosk(scene) {
  const kiosk = new THREE.Group();
  kiosk.position.set(-2, 0, 1.5);

  // 1. Tarima de madera del chiringuito (deck)
  const deckGeo = new THREE.BoxGeometry(15, 0.35, 10.5);
  const deckMesh = new THREE.Mesh(deckGeo, MAT.woodTeak);
  deckMesh.position.set(0, 0.175, 0);
  deckMesh.receiveShadow = true;
  deckMesh.castShadow = true;
  kiosk.add(deckMesh);

  // Bordes del deck con bisel
  const edgeGeo = new THREE.BoxGeometry(15.2, 0.15, 0.2);
  const edgeFront = new THREE.Mesh(edgeGeo, MAT.woodDark);
  edgeFront.position.set(0, 0.3, 5.25);
  kiosk.add(edgeFront);

  // 2. Pilares de madera noble en esquinas y laterales (frente despejado)
  const postGeo = new THREE.CylinderGeometry(0.18, 0.20, 3.8, 10);
  const postCoords = [
    [-4.5, 3.8], [4.5, 3.8],
    [-4.5, -3.8], [4.5, -3.8]
  ];
  postCoords.forEach(([x, z]) => {
    const post = new THREE.Mesh(postGeo, MAT.woodDark);
    post.position.set(x, 1.8 + 0.35, z);
    post.castShadow = true;
    post.receiveShadow = true;
    kiosk.add(post);
  });

  // 3. Paredes traseras y laterales del kiosco
  const backWallGeo = new THREE.BoxGeometry(8.8, 2.9, 0.22);
  const backWall = new THREE.Mesh(backWallGeo, MAT.wallWhite);
  backWall.position.set(0, 1.75, -3.7);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  kiosk.add(backWall);

  const leftWallGeo = new THREE.BoxGeometry(0.22, 2.9, 7.4);
  const leftWall = new THREE.Mesh(leftWallGeo, MAT.wallWhite);
  leftWall.position.set(-4.4, 1.75, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  kiosk.add(leftWall);

  // Zócalo de madera inferior en paredes
  const baseboardGeo = new THREE.BoxGeometry(8.9, 0.45, 0.26);
  const baseboard = new THREE.Mesh(baseboardGeo, MAT.woodDark);
  baseboard.position.set(0, 0.55, -3.7);
  kiosk.add(baseboard);

  // 4. Tejado Estilo Pérgola de Chiringuito de Playa
  // Techo trasero de cañizo/paja (cubre la cocina y estantes traseros)
  const roofBackGeo = new THREE.BoxGeometry(10.8, 0.35, 4.6);
  const roofBack = new THREE.Mesh(roofBackGeo, MAT.thatch);
  roofBack.position.set(0, 4.2, -1.8);
  roofBack.rotation.x = -0.06;
  roofBack.castShadow = true;
  roofBack.receiveShadow = true;
  kiosk.add(roofBack);

  // Remate superior trasero
  const roofRidgeGeo = new THREE.BoxGeometry(11.0, 0.45, 0.6);
  const roofRidge = new THREE.Mesh(roofRidgeGeo, MAT.woodDark);
  roofRidge.position.set(0, 4.4, -3.8);
  kiosk.add(roofRidge);

  // Vigas de Pérgola Abierta al frente (permiten ver la barra desde el ángulo isométrico)
  const rafterGeo = new THREE.BoxGeometry(0.18, 0.28, 5.2);
  [-4.2, -2.1, 0, 2.1, 4.2].forEach(rx => {
    const rafter = new THREE.Mesh(rafterGeo, MAT.woodTeak);
    rafter.position.set(rx, 3.95, 1.4);
    rafter.rotation.x = 0.04;
    rafter.castShadow = true;
    kiosk.add(rafter);
  });

  // Viga maestra frontal que une los postes y sostiene el cartel
  const frontBeamGeo = new THREE.BoxGeometry(9.6, 0.28, 0.24);
  const frontBeam = new THREE.Mesh(frontBeamGeo, MAT.woodDark);
  frontBeam.position.set(0, 3.9, 3.8);
  frontBeam.castShadow = true;
  kiosk.add(frontBeam);

  // Travesaños finos de cañizo rústico (sombra ligera sin tapar la barra)
  const slatGeo = new THREE.BoxGeometry(9.2, 0.08, 0.12);
  for (let sl = 0; sl < 5; sl++) {
    const slat = new THREE.Mesh(slatGeo, MAT.thatch);
    slat.position.set(0, 4.12, -0.2 + sl * 0.9);
    slat.castShadow = true;
    kiosk.add(slat);
  }

  // 5. La Barra de Servicio en "L"
  // Barra frontal
  const barFrontTopGeo = new THREE.BoxGeometry(8.2, 0.18, 0.95);
  const barFrontTop = new THREE.Mesh(barFrontTopGeo, MAT.woodDark);
  barFrontTop.position.set(0, 1.25, 2.2);
  barFrontTop.castShadow = true;
  barFrontTop.receiveShadow = true;
  kiosk.add(barFrontTop);

  const barFrontBaseGeo = new THREE.BoxGeometry(8.0, 0.9, 0.8);
  const barFrontBase = new THREE.Mesh(barFrontBaseGeo, MAT.teal);
  barFrontBase.position.set(0, 0.75, 2.2);
  barFrontBase.castShadow = true;
  barFrontBase.receiveShadow = true;
  kiosk.add(barFrontBase);

  // Barra lateral derecha
  const barSideTopGeo = new THREE.BoxGeometry(0.95, 0.18, 3.8);
  const barSideTop = new THREE.Mesh(barSideTopGeo, MAT.woodDark);
  barSideTop.position.set(3.6, 1.25, 0.4);
  barSideTop.castShadow = true;
  kiosk.add(barSideTop);

  const barSideBaseGeo = new THREE.BoxGeometry(0.8, 0.9, 3.8);
  const barSideBase = new THREE.Mesh(barSideBaseGeo, MAT.teal);
  barSideBase.position.set(3.6, 0.75, 0.4);
  barSideBase.castShadow = true;
  kiosk.add(barSideBase);

  // 6. Rótulo "EL CHARCO AZUL" (Montado sobre la viga frontal)
  const signBoardGeo = new THREE.BoxGeometry(5.2, 0.95, 0.18);
  const signBoard = new THREE.Mesh(signBoardGeo, MAT.woodDark);
  signBoard.position.set(0, 4.35, 3.82);
  signBoard.castShadow = true;
  kiosk.add(signBoard);

  let signMat = MAT.wallWhite;
  if (typeof document !== 'undefined') {
    const sCv = document.createElement('canvas');
    sCv.width = 512; sCv.height = 128;
    const sCx = sCv.getContext('2d');
    sCx.fillStyle = '#fbf3e2';
    sCx.fillRect(0, 0, 512, 128);
    sCx.fillStyle = '#0f8b8d';
    sCx.fillRect(10, 10, 492, 108);
    sCx.fillStyle = '#ffffff';
    sCx.font = 'bold 46px sans-serif';
    sCx.textAlign = 'center';
    sCx.textBaseline = 'middle';
    sCx.fillText('EL CHARCO AZUL', 256, 64);
    const signTex = new THREE.CanvasTexture(sCv);
    signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.35 });
  }

  const signInnerGeo = new THREE.BoxGeometry(4.9, 0.78, 0.22);
  const signInner = new THREE.Mesh(signInnerGeo, signMat);
  signInner.position.set(0, 4.35, 3.86);
  kiosk.add(signInner);

  // 7. Estaciones de Trabajo Detalladas
  // Estación 1: Grifo de Cerveza y Bebidas (Barra)
  const tapBaseGeo = new THREE.BoxGeometry(0.55, 0.3, 0.4);
  const tapBase = new THREE.Mesh(tapBaseGeo, MAT.chrome);
  tapBase.position.set(-1.8, 1.48, 2.2);
  kiosk.add(tapBase);

  const tapPipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 10);
  const tapPipe = new THREE.Mesh(tapPipeGeo, MAT.chrome);
  tapPipe.position.set(-1.8, 1.7, 2.2);
  kiosk.add(tapPipe);

  const tapHandleGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.18, 8);
  const tapHandle = new THREE.Mesh(tapHandleGeo, MAT.gold);
  tapHandle.position.set(-1.8, 1.95, 2.2);
  tapHandle.rotation.x = -0.3;
  kiosk.add(tapHandle);

  // Nevera trasera de bebidas con luz
  const fridgeGeo = new THREE.BoxGeometry(1.6, 2.2, 0.7);
  const fridge = new THREE.Mesh(fridgeGeo, MAT.chrome);
  fridge.position.set(-3.2, 1.45, -3.2);
  fridge.castShadow = true;
  kiosk.add(fridge);

  const fridgeGlassGeo = new THREE.BoxGeometry(1.4, 1.8, 0.05);
  const fridgeGlass = new THREE.Mesh(fridgeGlassGeo, new THREE.MeshStandardMaterial({
    color: 0x88d5e8,
    roughness: 0.1,
    transparent: true,
    opacity: 0.65
  }));
  fridgeGlass.position.set(-3.2, 1.5, -2.82);
  kiosk.add(fridgeGlass);

  // Estación 2: Cafetera Espresso Italiana
  const coffeeBodyGeo = new THREE.BoxGeometry(0.75, 0.55, 0.5);
  const coffeeBody = new THREE.Mesh(coffeeBodyGeo, MAT.coral);
  coffeeBody.position.set(0.6, 1.6, 2.2);
  kiosk.add(coffeeBody);

  const coffeeTopGeo = new THREE.BoxGeometry(0.7, 0.08, 0.46);
  const coffeeTop = new THREE.Mesh(coffeeTopGeo, MAT.chrome);
  coffeeTop.position.set(0.6, 1.9, 2.2);
  kiosk.add(coffeeTop);

  // Estación 3: Plancha de Cocina (Griddle)
  const griddleGeo = new THREE.BoxGeometry(1.4, 0.22, 0.7);
  const griddle = new THREE.Mesh(griddleGeo, MAT.chrome);
  griddle.position.set(1.9, 1.45, 2.2);
  kiosk.add(griddle);

  const hoodGeo = new THREE.BoxGeometry(1.6, 0.35, 0.8);
  const hood = new THREE.Mesh(hoodGeo, MAT.chrome);
  hood.position.set(1.9, 3.55, 2.2);
  kiosk.add(hood);

  // Estantes traseros con botellas
  const shelfGeo = new THREE.BoxGeometry(3.6, 0.08, 0.35);
  for (let s = 0; s < 3; s++) {
    const shelf = new THREE.Mesh(shelfGeo, MAT.woodDark);
    shelf.position.set(0.6, 1.4 + s * 0.6, -3.4);
    kiosk.add(shelf);

    // Botellitas de colores en los estantes
    for (let b = 0; b < 7; b++) {
      const bottleGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.32, 8);
      const bottleMat = new THREE.MeshStandardMaterial({
        color: [0x2a9d8f, 0xe76f51, 0xe9c46a, 0x264653, 0xf4a261][(s * 7 + b) % 5],
        roughness: 0.15,
        transparent: true,
        opacity: 0.85
      });
      const bottle = new THREE.Mesh(bottleGeo, bottleMat);
      bottle.position.set(-0.8 + b * 0.28, 1.6 + s * 0.6, -3.4);
      kiosk.add(bottle);
    }
  }

  // 8. Taburetes de la barra
  const stoolGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.75, 12);
  const seatGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.1, 14);
  [-2.6, -1.3, 0, 1.3, 2.6].forEach(x => {
    const leg = new THREE.Mesh(stoolGeo, MAT.woodDark);
    leg.position.set(x, 0.7, 3.2);
    leg.castShadow = true;
    kiosk.add(leg);

    const seat = new THREE.Mesh(seatGeo, MAT.coral);
    seat.position.set(x, 1.12, 3.2);
    kiosk.add(seat);
  });

  // 9. Guirnalda de Bombillas Cálidas (String Lights)
  for (let i = 0; i < 7; i++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), MAT.bulb);
    const bx = -3.6 + i * 1.2;
    const by = 3.35 - Math.sin((i / 6) * Math.PI) * 0.25;
    bulb.position.set(bx, by, 3.8);
    kiosk.add(bulb);
  }

  // Luz puntual cálida que ilumina el mostrador
  const barLight = new THREE.PointLight(0xffb74d, 1.4, 9, 1.2);
  barLight.position.set(0, 2.8, 2.5);
  barLight.castShadow = false;
  kiosk.add(barLight);
  stringLights.push(barLight);

  kioskMesh = kiosk;
  scene.add(kiosk);
}

let terraceGroup = null;
const table3DMeshes = new Map(); // table index -> Group

function setTableUmbrella3D(tGroup, tableIndex, showUmbrella) {
  if (!tGroup) return;
  let umbGroup = tGroup.userData.umbrellaGroup;
  if (showUmbrella) {
    if (!umbGroup) {
      umbGroup = new THREE.Group();
      umbGroup.name = 'umbrellaSet';
      const poleGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.7, 8);
      const pole = new THREE.Mesh(poleGeo, MAT.woodLight);
      pole.position.y = 1.35;
      umbGroup.add(pole);

      const umbrellaGeo = new THREE.ConeGeometry(1.85, 0.8, 14);
      const umbMat = [MAT.coral, MAT.teal, MAT.gold, MAT.leafDark][tableIndex % 4];
      const umbrella = new THREE.Mesh(umbrellaGeo, umbMat);
      umbrella.position.y = 2.65;
      umbrella.castShadow = true;
      umbGroup.add(umbrella);

      tGroup.add(umbGroup);
      tGroup.userData.umbrellaGroup = umbGroup;
    }
    umbGroup.visible = true;
  } else if (umbGroup) {
    tGroup.remove(umbGroup);
    tGroup.userData.umbrellaGroup = null;
  }
}

function syncTerraceTables3D(sceneRef) {
  if (!sceneRef || !Game || !Game.tables) return;
  if (!terraceGroup) {
    terraceGroup = new THREE.Group();
    sceneRef.add(terraceGroup);
  }

  const showUmbrellas = lvl('terraza') > 0;

  // Sincronizar cada mesa dinámica de la partida
  Game.tables.forEach((t, i) => {
    let tGroup = table3DMeshes.get(i);
    const pos = tablePosTo3D(t);

    if (!tGroup) {
      tGroup = new THREE.Group();
      tGroup.position.set(pos.x, 0, pos.z);

      // Tablero de mesa redondo de madera de teca
      const topGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.08, 16);
      const top = new THREE.Mesh(topGeo, MAT.woodTeak);
      top.position.y = 1.05;
      top.castShadow = true;
      top.receiveShadow = true;
      tGroup.add(top);

      // Pata central
      const legGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.0, 10);
      const leg = new THREE.Mesh(legGeo, MAT.woodDark);
      leg.position.y = 0.52;
      tGroup.add(leg);

      // Base de forja
      const baseGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.06, 12);
      const base = new THREE.Mesh(baseGeo, MAT.woodDark);
      base.position.y = 0.05;
      tGroup.add(base);

      // Sillas de terraza (radio ampliado para no amontonar)
      for (let s = 0; s < 2; s++) {
        const chairSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 12), MAT.woodTeak);
        const angle = s * Math.PI + 0.35;
        const chairR = 1.44;
        chairSeat.position.set(Math.cos(angle) * chairR, 0.65, Math.sin(angle) * chairR);
        chairSeat.castShadow = true;
        tGroup.add(chairSeat);

        const chairLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.62, 8), MAT.woodDark);
        chairLeg.position.set(chairSeat.position.x, 0.31, chairSeat.position.z);
        tGroup.add(chairLeg);
      }

      // Pila de platos sucios 3D (visible cuando t.state === 'dirty')
      const dirtyStack = createItem3D('dirty');
      dirtyStack.position.set(0, 1.12, 0);
      dirtyStack.visible = false;
      dirtyStack.name = 'dirtyStack';
      tGroup.add(dirtyStack);

      tGroup.userData = { dirtyStack, tableRef: t, umbrellaGroup: null };
      terraceGroup.add(tGroup);
      table3DMeshes.set(i, tGroup);
    } else {
      tGroup.position.set(pos.x, 0, pos.z);
    }

    setTableUmbrella3D(tGroup, i, showUmbrellas);

    // Actualizar estado de platos sucios en la mesa
    if (tGroup.userData && tGroup.userData.dirtyStack) {
      const isDirty = (t.state === 'dirty');
      tGroup.userData.dirtyStack.visible = isDirty;
      if (isDirty) {
        tGroup.userData.dirtyStack.rotation.y = (Date.now() * 0.0006) % (Math.PI * 2);
      }
    }
  });

  // Limpiar mesas eliminadas si la temporada se reinicia
  for (const [idx, group] of table3DMeshes.entries()) {
    if (idx >= Game.tables.length) {
      terraceGroup.remove(group);
      table3DMeshes.delete(idx);
    }
  }
}

function buildTerrace(scene) {
  syncTerraceTables3D(scene);
}

function buildPalms(scene) {
  const palmCoords = [
    [-11.5, 3.5, 1.25],
    [13.5, 4.2, 1.35],
    [14.5, -2.5, 1.1]
  ];

  palmCoords.forEach(([px, pz, scale]) => {
    const palm = new THREE.Group();
    palm.position.set(px, 0, pz);
    palm.scale.set(scale, scale, scale);

    // Tronco curvado con anillos
    const segments = 7;
    let currY = 0;
    let currX = 0;
    for (let s = 0; s < segments; s++) {
      const segH = 0.75;
      const rTop = 0.28 - s * 0.015;
      const rBot = 0.32 - s * 0.015;
      const segGeo = new THREE.CylinderGeometry(rTop, rBot, segH, 10);
      const seg = new THREE.Mesh(segGeo, MAT.woodDark);
      seg.position.set(currX, currY + segH / 2, 0);
      seg.rotation.z = -0.06 * (s + 1);
      seg.castShadow = true;
      palm.add(seg);

      currY += segH * 0.94;
      currX += (s * 0.045);
    }

    // Corona de hojas frondosas (12 hojas en abanico)
    const crown = new THREE.Group();
    crown.position.set(currX, currY, 0);

    for (let f = 0; f < 12; f++) {
      const frondGeo = new THREE.ConeGeometry(0.55, 3.2, 5);
      frondGeo.translate(0, 1.6, 0);
      const frond = new THREE.Mesh(frondGeo, MAT.palmLeaf);
      const angle = (f / 12) * Math.PI * 2;
      frond.rotation.y = angle;
      frond.rotation.x = 0.85 + Math.sin(f * 2) * 0.15;
      frond.castShadow = true;
      crown.add(frond);
    }
    palm.add(crown);
    palmLeaves.push(crown);

    scene.add(palm);
  });
}

// ---------- Efectos Meteorológicos 3D Dinámicos (Fase 2) ----------
let rainMesh = null;
let rainGeo = null;
let rainPositions = null;
const RAIN_COUNT = 300;

let calimaMesh = null;
let calimaGeo = null;
let calimaPositions = null;
const CALIMA_COUNT = 160;

function buildWeatherEffects(sceneRef) {
  // 1. Partículas de lluvia para 'chubasco'
  rainGeo = new THREE.BufferGeometry();
  rainPositions = new Float32Array(RAIN_COUNT * 3);
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainPositions[i * 3 + 0] = (Math.random() - 0.5) * 32;
    rainPositions[i * 3 + 1] = Math.random() * 14;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.PointsMaterial({
    color: 0x90caf9,
    size: 0.14,
    transparent: true,
    opacity: 0.65
  });
  rainMesh = new THREE.Points(rainGeo, rainMat);
  rainMesh.visible = false;
  sceneRef.add(rainMesh);

  // 2. Partículas de polvo sahariano para 'calima'
  calimaGeo = new THREE.BufferGeometry();
  calimaPositions = new Float32Array(CALIMA_COUNT * 3);
  for (let i = 0; i < CALIMA_COUNT; i++) {
    calimaPositions[i * 3 + 0] = (Math.random() - 0.5) * 30;
    calimaPositions[i * 3 + 1] = 0.5 + Math.random() * 7;
    calimaPositions[i * 3 + 2] = (Math.random() - 0.5) * 18;
  }
  calimaGeo.setAttribute('position', new THREE.BufferAttribute(calimaPositions, 3));
  const calimaMat = new THREE.PointsMaterial({
    color: 0xdeb887,
    size: 0.22,
    transparent: true,
    opacity: 0.4
  });
  calimaMesh = new THREE.Points(calimaGeo, calimaMat);
  calimaMesh.visible = false;
  sceneRef.add(calimaMesh);
}

function updateWeather3D(dt, time, h) {
  const w = (weatherToday ? weatherToday() : 'sol') || 'sol';

  // Configuración de atmósfera base según el clima canario
  let skyHex = 0x8ecae6;
  let fogDensity = 0.014;
  let sunHex = 0xfff0d0;
  let sunInt = 1.4;
  let hemiSkyHex = 0x7acbf0;
  let hemiGroundHex = 0xf0d8a8;

  if (w === 'calima') {
    skyHex = 0xd49b58; // Calima ocre cálida
    fogDensity = 0.024;
    sunHex = 0xff7733; // Sol anaranjado sahariano
    sunInt = 1.1;
    hemiSkyHex = 0xd49b58;
    hemiGroundHex = 0xb37436;
  } else if (w === 'chubasco') {
    skyHex = 0x647684; // Nubes atlánticas gris plomo
    fogDensity = 0.022;
    sunHex = 0x90a4ae;
    sunInt = 0.75;
    hemiSkyHex = 0x607d8b;
    hemiGroundHex = 0x78909c;
  } else if (w === 'viento') {
    skyHex = 0x78bce0;
    fogDensity = 0.012;
    sunHex = 0xfff4db;
    sunInt = 1.45;
  } else if (w === 'nublado') {
    skyHex = 0x9cb6c6; // Panza de burro norteña
    fogDensity = 0.018;
    sunHex = 0xdfe6ed;
    sunInt = 0.95;
  }

  // Interpolar con atardecer (Golden Hour después de las 18:00)
  if (h >= 18.0) {
    const sunsetFactor = Math.min(1.0, (h - 18.0) / 2.5);
    const baseColor = new THREE.Color(skyHex);
    const sunsetColor = (w === 'chubasco') ? new THREE.Color(0x4a455a) : new THREE.Color(0xf29e4c);
    scene.background.lerpColors(baseColor, sunsetColor, sunsetFactor);
    sunLight.color.setHex(0xff8833);
    sunLight.intensity = (sunInt * (1.0 - sunsetFactor * 0.4));
    sunLight.position.set(16 - sunsetFactor * 8, 25 - sunsetFactor * 14, 14);
    stringLights.forEach(sl => { sl.intensity = 1.0 + sunsetFactor * 1.6; });
  } else {
    scene.background.setHex(skyHex);
    sunLight.color.setHex(sunHex);
    sunLight.intensity = sunInt;
    sunLight.position.set(16, 25, 14);
    stringLights.forEach(sl => { sl.intensity = (w === 'chubasco' ? 1.4 : 0.8); });
  }

  if (scene.fog) {
    scene.fog.color.copy(scene.background);
    scene.fog.density = fogDensity;
  }
  if (hemiLight) {
    hemiLight.color.setHex(hemiSkyHex);
    hemiLight.groundColor.setHex(hemiGroundHex);
  }

  // Animación de lluvia en 'chubasco'
  if (rainMesh && rainPositions) {
    rainMesh.visible = (w === 'chubasco');
    if (rainMesh.visible) {
      const posAttr = rainGeo.attributes.position;
      for (let i = 0; i < RAIN_COUNT; i++) {
        rainPositions[i * 3 + 1] -= 22 * dt; // Caída vertical rápida
        rainPositions[i * 3 + 0] -= 4 * dt;  // Viento diagonal
        if (rainPositions[i * 3 + 1] < 0) {
          rainPositions[i * 3 + 1] = 13 + Math.random() * 2;
          rainPositions[i * 3 + 0] = (Math.random() - 0.5) * 32;
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  // Animación de partículas de polvo en 'calima'
  if (calimaMesh && calimaPositions) {
    calimaMesh.visible = (w === 'calima');
    if (calimaMesh.visible) {
      const posAttr = calimaGeo.attributes.position;
      for (let i = 0; i < CALIMA_COUNT; i++) {
        calimaPositions[i * 3 + 0] += 1.8 * dt; // Deriva horizontal lenta
        calimaPositions[i * 3 + 1] += Math.sin(time + i) * 0.003;
        if (calimaPositions[i * 3 + 0] > 16) {
          calimaPositions[i * 3 + 0] = -16;
        }
      }
      posAttr.needsUpdate = true;
    }
  }
}

// ---------- Escenario 3D y Espectáculo en Vivo (Fase 3) ----------
let stageGroup = null;
let artistMesh = null;
let artistArmR = null;
let artistArmL = null;
let artistBody = null;
let musicNotesGroup = null;
const musicNotes = [];

function buildMusicStage(sceneRef) {
  stageGroup = new THREE.Group();
  stageGroup.position.set(13.2, 0, 0.5);

  // Tarima de madera rústica elevada
  const deckGeo = new THREE.BoxGeometry(3.2, 0.4, 2.8);
  const deck = new THREE.Mesh(deckGeo, MAT.woodTeak);
  deck.position.y = 0.2;
  deck.receiveShadow = true;
  deck.castShadow = true;
  stageGroup.add(deck);

  // Postes de madera laterales con banderines
  [-1.4, 1.4].forEach(px => {
    const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.8, 8);
    const post = new THREE.Mesh(postGeo, MAT.woodDark);
    post.position.set(px, 1.4, -1.2);
    post.castShadow = true;
    stageGroup.add(post);
  });

  // Guirnalda de banderines de colores sobre el escenario
  const garlandGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.85, 6);
  const garland = new THREE.Mesh(garlandGeo, MAT.woodLight);
  garland.position.set(0, 2.7, -1.2);
  garland.rotation.z = Math.PI / 2;
  stageGroup.add(garland);

  for (let b = 0; b < 6; b++) {
    const flagGeo = new THREE.ConeGeometry(0.16, 0.28, 3);
    const flagMat = [MAT.coral, MAT.teal, MAT.gold][b % 3];
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(-1.1 + b * 0.44, 2.52, -1.2);
    flag.rotation.z = Math.PI;
    stageGroup.add(flag);
  }

  // Foco cálido para el artista
  const stageSpot = new THREE.PointLight(0xffd54f, 1.5, 7, 1.4);
  stageSpot.position.set(0, 2.6, 0.5);
  stageGroup.add(stageSpot);
  stringLights.push(stageSpot);

  // ---------- Modelo 3D del Artista Canario ----------
  artistMesh = new THREE.Group();
  artistMesh.position.set(0, 0.4, 0);
  artistMesh.rotation.y = -Math.PI * 0.35; // Mirando a la terraza

  // Piernas
  const legMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.7 });
  [-0.14, 0.14].forEach(lx => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.65, 8), legMat);
    leg.position.set(lx, 0.32, 0);
    leg.castShadow = true;
    artistMesh.add(leg);
  });

  // Cuerpo / Torso con camisa bordada canaria
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.5 });
  artistBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.75, 10), shirtMat);
  artistBody.position.y = 0.98;
  artistBody.castShadow = true;
  artistMesh.add(artistBody);

  // Fajín rojo tradicional canario
  const sashMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4 });
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 10), sashMat);
  sash.position.y = 0.7;
  artistMesh.add(sash);

  // Cabeza
  const headMat = new THREE.MeshStandardMaterial({ color: 0xe0a97e, roughness: 0.6 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), headMat);
  head.position.y = 1.52;
  head.castShadow = true;
  artistMesh.add(head);

  // Sombrero tradicional canario negro con ala
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.8 });
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 14), hatMat);
  hatBrim.position.y = 1.64;
  artistMesh.add(hatBrim);
  const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.24, 12), hatMat);
  hatCrown.position.y = 1.76;
  artistMesh.add(hatCrown);

  // Timple Canario (instrumento tradicional de madera)
  const timple = new THREE.Group();
  timple.position.set(0.12, 1.05, 0.25);
  timple.rotation.set(0.3, 0.4, -0.6);

  const timpleBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.14), MAT.woodTeak);
  timpleBody.castShadow = true;
  timple.add(timpleBody);

  const timpleNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), MAT.woodDark);
  timpleNeck.position.y = 0.38;
  timple.add(timpleNeck);
  artistMesh.add(timple);

  // Brazos rasgueando el timple
  artistArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.48, 8), shirtMat);
  artistArmR.position.set(0.32, 1.08, 0.15);
  artistArmR.rotation.set(0.8, -0.4, 0.5);
  artistMesh.add(artistArmR);

  artistArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.48, 8), shirtMat);
  artistArmL.position.set(-0.28, 1.15, 0.22);
  artistArmL.rotation.set(0.9, 0.3, -0.4);
  artistMesh.add(artistArmL);

  stageGroup.add(artistMesh);

  // ---------- Partículas de Notas Musicales Flotantes 3D ----------
  musicNotesGroup = new THREE.Group();
  for (let n = 0; n < 8; n++) {
    const noteGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const noteMat = new THREE.MeshStandardMaterial({
      color: 0xffd54f,
      emissive: 0xffa000,
      emissiveIntensity: 0.8,
      roughness: 0.3
    });
    const noteMesh = new THREE.Mesh(noteGeo, noteMat);
    noteMesh.visible = false;
    musicNotesGroup.add(noteMesh);
    musicNotes.push({
      mesh: noteMesh,
      active: false,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      life: 0
    });
  }
  stageGroup.add(musicNotesGroup);

  sceneRef.add(stageGroup);
}

function updateStageAndShow3D(dt, time) {
  if (!stageGroup || !artistMesh || !Game) return;

  const hasStage = lvl && (lvl('escenario') > 0 || !!Game.upgrades?.showHoy);
  stageGroup.visible = !!hasStage;
  if (!hasStage) return;

  const showHired = !!Game.upgrades?.showHoy;
  artistMesh.visible = showHired;

  if (showHired) {
    // Animación de rasgueo y baile del músico
    const tempo = 5.5;
    if (artistBody) {
      artistBody.rotation.y = Math.sin(time * tempo) * 0.15;
    }
    if (artistArmR) {
      artistArmR.rotation.x = 0.8 + Math.sin(time * (tempo * 2)) * 0.35;
    }
    artistMesh.position.y = 0.4 + Math.abs(Math.sin(time * (tempo * 0.5))) * 0.05;

    // Generar notas musicales flotantes
    if (Math.random() < 0.05) {
      const freeNote = musicNotes.find(n => !n.active);
      if (freeNote) {
        freeNote.active = true;
        freeNote.life = 1.0;
        freeNote.x = 0.2 + (Math.random() - 0.5) * 0.3;
        freeNote.y = 1.4;
        freeNote.z = 0.3 + (Math.random() - 0.5) * 0.3;
        freeNote.vx = (Math.random() - 0.5) * 0.6;
        freeNote.vy = 1.1 + Math.random() * 0.6;
        freeNote.vz = (Math.random() - 0.5) * 0.6;
        freeNote.mesh.position.set(freeNote.x, freeNote.y, freeNote.z);
        freeNote.mesh.visible = true;
        freeNote.mesh.scale.set(1, 1, 1);
      }
    }
  }

  // Actualizar notas musicales activas
  musicNotes.forEach(n => {
    if (n.active) {
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.z += n.vz * dt;
      n.life -= dt * 0.75;
      n.mesh.position.set(n.x, n.y, n.z);
      const s = Math.max(0.01, n.life);
      n.mesh.scale.set(s, s, s);
      if (n.life <= 0) {
        n.active = false;
        n.mesh.visible = false;
      }
    }
  });
}

// ---------- Configuración de Iluminación de Estudio ----------
function setupLighting(scene) {
  // 1. Luz ambiente suave
  ambientLight = new THREE.AmbientLight(0xfff3e0, 0.45);
  scene.add(ambientLight);

  // 2. Luz de hemisferio (cielo celeste canario arriba, rebote dorado de arena abajo)
  hemiLight = new THREE.HemisphereLight(0x7acbf0, 0xf0d8a8, 0.65);
  hemiLight.position.set(0, 30, 0);
  scene.add(hemiLight);

  // 3. Sol Canario (Directional con sombras suaves PCF)
  sunLight = new THREE.DirectionalLight(0xfff0d0, 1.4);
  sunLight.position.set(16, 25, 14);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 70;
  sunLight.shadow.camera.left = -22;
  sunLight.shadow.camera.right = 22;
  sunLight.shadow.camera.top = 20;
  sunLight.shadow.camera.bottom = -20;
  sunLight.shadow.bias = -0.0006;
  scene.add(sunLight);
}

// ---------- Monedas Físicas Voladoras 3D (Dopamina Visual AAA) ----------
const activeCoins = [];
const coinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.03, 10);
const coinMat = new THREE.MeshStandardMaterial({
  color: 0xf5b82e,
  roughness: 0.2,
  metalness: 0.9
});

export function spawnCoinBurst3D(x = -1.8, y = 1.4, z = 2.0, count = 5) {
  if (!scene) return;
  for (let i = 0; i < count; i++) {
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.position.set(x + (Math.random() - 0.5) * 0.3, y + Math.random() * 0.2, z + (Math.random() - 0.5) * 0.3);
    coin.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

    const targetX = -1.8 + (Math.random() - 0.5) * 0.4;
    const targetZ = 2.0 + (Math.random() - 0.5) * 0.4;

    const vx = (targetX - coin.position.x) * 1.8 + (Math.random() - 0.5) * 0.5;
    const vy = 3.6 + Math.random() * 2.2;
    const vz = (targetZ - coin.position.z) * 1.8 + (Math.random() - 0.5) * 0.5;

    coin.userData = {
      vx, vy, vz,
      rotSpeedX: 7.0 + Math.random() * 8.0,
      rotSpeedY: 6.0 + Math.random() * 7.0,
      life: 0,
      maxLife: 1.1
    };

    scene.add(coin);
    activeCoins.push(coin);
  }
}

function updateCoins3D(dt = 0.016) {
  for (let i = activeCoins.length - 1; i >= 0; i--) {
    const coin = activeCoins[i];
    const ud = coin.userData;
    ud.life += dt;

    coin.position.x += ud.vx * dt;
    coin.position.y += ud.vy * dt;
    coin.position.z += ud.vz * dt;
    ud.vy -= 9.8 * dt; // Gravedad

    coin.rotation.x += ud.rotSpeedX * dt;
    coin.rotation.y += ud.rotSpeedY * dt;

    if (coin.position.y <= 0.8 || ud.life >= ud.maxLife) {
      scene.remove(coin);
      activeCoins.splice(i, 1);
    }
  }
}

// ---------- Radar Off-Screen de Mesas Impacientes ----------
let offscreenPill = null;
function initOffscreenRadar() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('radar-offscreen')) {
    const pill = document.createElement('div');
    pill.id = 'radar-offscreen';
    pill.className = 'radar-offscreen hidden';
    pill.innerHTML = `<span class="radar-ico">⚠️</span><span class="radar-lbl" id="radar-lbl">Mesa impaciente</span><span class="radar-arrow">▶</span>`;
    pill.addEventListener('click', () => {
      // Centrar suavemente la cámara en la terraza
      CAM3D.targetPanOffset.set(5.5, 0.5);
      CAM3D.lastInteraction = performance.now();
    });
    document.body.appendChild(pill);
  }
  offscreenPill = document.getElementById('radar-offscreen');
}

function updateOffscreenRadar() {
  if (!offscreenPill || !Game || !Game.customers) return;
  let worstCust = null;
  let minRatio = 1.0;

  for (const c of Game.customers) {
    if (c.state === 'eat' || c.table) {
      const ratio = c.patience / (c.maxPatience || 1);
      if (ratio < 0.40 && c._screenPos && !c._screenPos.visible) {
        if (ratio < minRatio) {
          minRatio = ratio;
          worstCust = c;
        }
      }
    }
  }

  if (worstCust) {
    offscreenPill.classList.remove('hidden');
    const lbl = document.getElementById('radar-lbl');
    const pct = Math.round(minRatio * 100);
    if (lbl) lbl.textContent = `Mesa (${pct}%)`;
  } else {
    offscreenPill.classList.add('hidden');
  }
}

// ---------- Gestos Táctiles Móviles Profesionales ----------
function setupTouchControls(targetElement) {
  let touchStartDist = 0;
  let touchStartMidX = 0;
  let touchStartMidY = 0;
  let touchStartDistVal = 0;
  let touchCount = 0;
  let isDraggingMouse = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  // TOUCH EVENTS (Móvil con 2 dedos)
  targetElement.addEventListener('touchstart', e => {
    touchCount = e.touches.length;
    if (touchCount >= 2) {
      e.preventDefault();
      CAM3D.isInteracting = true;
      CAM3D.lastInteraction = performance.now();

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartDistVal = CAM3D.targetDist;
      touchStartMidX = (t1.clientX + t2.clientX) / 2;
      touchStartMidY = (t1.clientY + t2.clientY) / 2;
    }
  }, { passive: false });

  targetElement.addEventListener('touchmove', e => {
    if (e.touches.length >= 2) {
      e.preventDefault();
      CAM3D.lastInteraction = performance.now();

      const t1 = e.touches[0];
      const t2 = e.touches[1];

      // 1. Pinch-to-zoom continuo con límites
      const curDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (touchStartDist > 0) {
        const factor = touchStartDist / curDist;
        const newDist = touchStartDistVal * factor;
        CAM3D.targetDist = Math.max(CAM3D.minDist, Math.min(CAM3D.maxDist, newDist));
      }

      // 2. Pan con 2 dedos (arrastre de encuadre)
      const curMidX = (t1.clientX + t2.clientX) / 2;
      const curMidY = (t1.clientY + t2.clientY) / 2;
      const dx = (curMidX - touchStartMidX) * 0.035;
      const dy = (curMidY - touchStartMidY) * 0.035;

      CAM3D.targetPanOffset.x -= dx;
      CAM3D.targetPanOffset.y += dy;
      // Clamping de límites suaves para no salirse de la playa
      CAM3D.targetPanOffset.x = Math.max(-14, Math.min(14, CAM3D.targetPanOffset.x));
      CAM3D.targetPanOffset.y = Math.max(-8, Math.min(8, CAM3D.targetPanOffset.y));

      touchStartMidX = curMidX;
      touchStartMidY = curMidY;
    }
  }, { passive: false });

  targetElement.addEventListener('touchend', e => {
    touchCount = e.touches.length;
    if (touchCount < 2) {
      CAM3D.isInteracting = false;
      CAM3D.lastInteraction = performance.now();
    }
  }, { passive: true });

  // RATÓN (Para pruebas en Desktop / Trackpad)
  targetElement.addEventListener('wheel', e => {
    e.preventDefault();
    CAM3D.lastInteraction = performance.now();
    const zoomDelta = e.deltaY * 0.025;
    CAM3D.targetDist = Math.max(CAM3D.minDist, Math.min(CAM3D.maxDist, CAM3D.targetDist + zoomDelta));
  }, { passive: false });

  targetElement.addEventListener('mousedown', e => {
    if (e.button === 1 || e.button === 2 || e.shiftKey) { // Botón central / derecho o Shift
      isDraggingMouse = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      CAM3D.isInteracting = true;
      CAM3D.lastInteraction = performance.now();
    }
  });

  window.addEventListener('mousemove', e => {
    if (isDraggingMouse) {
      CAM3D.lastInteraction = performance.now();
      const dx = (e.clientX - lastMouseX) * 0.035;
      const dy = (e.clientY - lastMouseY) * 0.035;
      CAM3D.targetPanOffset.x -= dx;
      CAM3D.targetPanOffset.y += dy;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingMouse) {
      isDraggingMouse = false;
      CAM3D.isInteracting = false;
      CAM3D.lastInteraction = performance.now();
    }
  });
}

// ---------- Inicialización del Motor 3D ----------
export function init3D() {
  if (isInitialized) return true;
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  canvas3d = document.getElementById('game3d');
  if (!canvas3d) {
    canvas3d = document.createElement('canvas');
    canvas3d.id = 'game3d';
    document.body.prepend(canvas3d);
  }

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas3d,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
  } catch (err) {
    console.warn('WebGL not available for 3D:', err);
    return false;
  }

  const coastProfile = getCoastGeometryProfile();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coastProfile.pixelRatioCap));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ecae6);
  scene.fog = new THREE.FogExp2(0x8ecae6, 0.014);

  // Cámara
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(38, aspect, 0.5, 200);

  if (typeof window !== 'undefined') {
    window.scene3D = scene;
    window.camera3D = camera;
  }

  // Construcción del Mundo
  setupLighting(scene);
  buildBeach(scene);
  buildKiosk(scene);
  buildTerrace(scene);
  buildPalms(scene);
  buildWeatherEffects(scene);
  buildMusicStage(scene);
  initUpgrades3D(scene, kioskMesh);
  initStaff3D(scene);
  initVFX3D(scene);

  // 5. Personajes 3D Estilizados AAA (Lali y Oli) con Bandeja 3D (Fase 3)
  playerMesh = createCharacter3D('lali');
  playerMesh.position.set(-1.8, 0, 1.8);
  attachTrayToCharacter(playerMesh, 'p1');
  scene.add(playerMesh);

  partnerMesh = createCharacter3D('oli');
  // Ubicado dentro de la zona de preparación sin colisionar con la barra lateral
  partnerMesh.position.set(0.5, 0, 1.8);
  attachTrayToCharacter(partnerMesh, 'p2');
  scene.add(partnerMesh);

  // 6. Controles Ergonómicos de Pulgares Móviles (Joystick y Botón Contextual)
  initControls3D(playerMesh);
  initOffscreenRadar();
  setMovementCollision3D(check3DCollision);
  setService3DProximityCheck((command,who)=>{
    const pose=playerPoses3D(Game)[who];
    if(command.type==='deliver'){
      const c=Game.customers.find(c=>c.id===command.customer);
      if(!c)return false;
      const target=customerInteractionPosition(c);
      return Math.hypot(pose.x-target.x,pose.z-target.z)<=3.95;
    }
    const id=command.type==='releaseBeer'?'beer':command.type==='wash'?'sink':command.type;
    const station=STATIONS_3D.find(s=>s.id===id);
    return !station||Math.hypot(pose.x-station.x,pose.z-station.z)<=station.r+.75;
  });

  // Controles de Cámara Táctil (2 dedos)
  const inputTarget = document.getElementById('game') || canvas3d;
  setupTouchControls(inputTarget);

  // Botón táctil flotante de recentrado de cámara
  const resetBtn = document.getElementById('btn-cam-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      CAM3D.setNormal();
      CAM3D.targetPanOffset.set(0, 0);
      CAM3D.panOffset.set(0, 0);
    });
  }

  resize3D();
  window.addEventListener('resize', resize3D);
  isInitialized = true;
  return true;
}

export function resize3D() {
  if (!renderer || !camera || !canvas3d) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

// ---------- Sistema de Colisiones Físicas 3D de Alta Gama ----------
const WORLD_OBSTACLES = {
  // Cajas AABB en coordenadas mundiales (minX, maxX, minZ, maxZ)
  boxes: [
    // Mostrador frontal de la barra (Z de 3.25 a 4.15, X de -6.1 a 2.1)
    { id: 'barFront', minX: -6.1, maxX: 2.1, minZ: 3.25, maxZ: 4.15 },
    // Mostrador lateral derecho (Z de -0.5 a 3.35, X de 1.15 a 2.05) - Deja pasillo abierto detrás (Z < -0.5)
    { id: 'barSide',  minX: 1.15, maxX: 2.05, minZ: -0.5, maxZ: 3.35 },
    // Pared trasera y estanterías de botellas
    { id: 'wallBack', minX: -6.6, maxX: 2.5, minZ: -2.5, maxZ: -1.95 },
    // Pared lateral izquierda
    { id: 'wallLeft', minX: -6.6, maxX: -6.15, minZ: -2.2, maxZ: 4.15 }
  ],
  // Taburetes circulares exteriores de la barra
  stools: [
    { x: -4.6, z: 4.7, r: 0.35 },
    { x: -3.3, z: 4.7, r: 0.35 },
    { x: -2.0, z: 4.7, r: 0.35 },
    { x: -0.7, z: 4.7, r: 0.35 },
    { x:  0.6, z: 4.7, r: 0.35 }
  ],
  // Props en arena (caballete de redes sociales)
  props: [
    { x: -7.0, z: 4.4, r: 0.45 }
  ]
};

export function check3DCollision(px, pz, radius = 0.32) {
  // 1. Paredes y mostradores del kiosco
  for (let i = 0; i < WORLD_OBSTACLES.boxes.length; i++) {
    const b = WORLD_OBSTACLES.boxes[i];
    const closestX = Math.max(b.minX, Math.min(px, b.maxX));
    const closestZ = Math.max(b.minZ, Math.min(pz, b.maxZ));
    const dx = px - closestX;
    const dz = pz - closestZ;
    if ((dx * dx + dz * dz) < (radius * radius)) {
      return true;
    }
  }

  // 2. Taburetes de la barra
  for (let i = 0; i < WORLD_OBSTACLES.stools.length; i++) {
    const s = WORLD_OBSTACLES.stools[i];
    const dx = px - s.x;
    const dz = pz - s.z;
    const minDist = radius + s.r;
    if ((dx * dx + dz * dz) < (minDist * minDist)) {
      return true;
    }
  }

  // 3. Props exteriores
  for (let i = 0; i < WORLD_OBSTACLES.props.length; i++) {
    const p = WORLD_OBSTACLES.props[i];
    const dx = px - p.x;
    const dz = pz - p.z;
    const minDist = radius + p.r;
    if ((dx * dx + dz * dz) < (minDist * minDist)) {
      return true;
    }
  }

  // 4. Mesas de la terraza dinámicas (radio del tablero)
  if (Game && Game.tables) {
    for (let i = 0; i < Game.tables.length; i++) {
      const tp = tablePosTo3D(Game.tables[i]);
      const dx = px - tp.x;
      const dz = pz - tp.z;
      const minDist = radius + 0.88;
      if ((dx * dx + dz * dz) < (minDist * minDist)) {
        return true;
      }
    }
  }

  // 5. Escenario de música (si está visible)
  if (stageGroup && stageGroup.visible) {
    if (px > 11.5 && px < 14.9 && pz > -1.0 && pz < 2.0) {
      return true;
    }
  }

  // 6. Zona de hamacas en la playa (si están desbloqueadas)
  if (lvl && lvl('hamacas') > 0) {
    if (px > 4.4 && px < 11.2 && pz > -4.8 && pz < -2.0) {
      return true;
    }
  }

  return false;
}

// ---------- Render Loop 3D ----------
export function render3D(dt = 0.016, draw = true) {
  if (!isInitialized || !renderer || !scene || !camera) return;
  const serviceDt=Game.mode==='service'&&Number.isFinite(Game.speed)?dt*Math.max(0,Game.speed):0;
  if(localMeshOwner!==Net.me){
    [playerMesh,partnerMesh]=[partnerMesh,playerMesh];
    localMeshOwner=Net.me;
    resetControls3DInput();
  }
  if(Game.mode==='service' && renderedServiceId!==Game.floor?.id){
    renderedServiceId=Game.floor?.id;
    resetControls3DInput();
    const poses=playerPoses3D(Game),other=Net.me==='p2'?'p1':'p2';
    playerMesh?.position.set(poses[Net.me].x,0,poses[Net.me].z);
    partnerMesh?.position.set(poses[other].x,0,poses[other].z);
  }
  const correction=consumeLocalCorrection3D();
  if(correction){playerMesh.position.x=correction.x;playerMesh.position.z=correction.z;}

  const now = performance.now();
  const time = now * 0.001;

  // Brisa marina en las palmeras según el viento canario
  const windFactor = (weatherToday && weatherToday() === 'viento') ? 2.4 : 1.0;
  palmLeaves.forEach((crown, i) => {
    crown.rotation.z = Math.sin(time * 1.5 * windFactor + i * 1.2) * (0.045 * windFactor);
    crown.rotation.x = Math.cos(time * 1.2 * windFactor + i * 0.8) * (0.025 * windFactor);
  });

  // 3. Movimiento y Animación de los Personajes 3D con Deslizamiento de Colisión Físico
  let vx = 0, vz = 0;
  const serviceControls = syncControls3DForGameMode();
  if (playerMesh && serviceControls) {
    const moveSpeed = 6.4;
    vx = CONTROLS3D.inputX * moveSpeed;
    vz = CONTROLS3D.inputZ * moveSpeed;

    const r = 0.32; // Radio físico del personaje
    const curX = playerMesh.position.x;
    const curZ = playerMesh.position.z;

    // Movimiento con resolución independiente en ejes X y Z para permitir deslizamiento suave en paredes
    for(let remaining=serviceDt;remaining>1e-9;){
      const step=Math.min(1/60,remaining);
      const nextX=Math.max(-9.2,Math.min(14.5,playerMesh.position.x+vx*step));
      if(!check3DCollision(nextX,playerMesh.position.z,r)) playerMesh.position.x=nextX;
      const nextZ=Math.max(-4.8,Math.min(5.8,playerMesh.position.z+vz*step));
      if(!check3DCollision(playerMesh.position.x,nextZ,r)) playerMesh.position.z=nextZ;
      remaining-=step;
    }

    playerMesh.position.y = sampleCharacterFootY(playerMesh.position.x, playerMesh.position.z);

    // Animación procedural de paso (Squash & Stretch)
    animateCharacter(playerMesh, vx, vz, serviceDt);

    // Detección inteligente de proximidad para el botón contextual
    updateContextualProximity(playerMesh.position);
  } else if (playerMesh) {
    animateCharacter(playerMesh, 0, 0, dt);
    playerMesh.position.y = sampleCharacterFootY(playerMesh.position.x, playerMesh.position.z);
  }

  if (playerMesh && serviceControls && typeof window !== 'undefined' && window.PLAYER) {
    // Sincronizar coordenadas con PLAYER del juego (2D/3D híbrido)
    window.PLAYER.x = (playerMesh.position.x / 8.5) * 600 + 600;
    window.PLAYER.y = (playerMesh.position.z / 3.5) * 220 + 500;
    window.PLAYER.movingSpd = Math.hypot(vx, vz);
  }

  // Oli (Compañero) animado en cocina con postura viva
  if (partnerMesh) {
    const pose=Game.mode==='service'&&Net.peer?playerPoses3D(Game)[Net.me==='p2'?'p1':'p2']:null;
    const oldX=partnerMesh.position.x,oldZ=partnerMesh.position.z;
    const k=Game.speed>0?Math.min(1,dt*14):0;
    if(pose){
      partnerMesh.position.x+=(pose.x-partnerMesh.position.x)*k;
      partnerMesh.position.z+=(pose.z-partnerMesh.position.z)*k;
    }
    animateCharacter(partnerMesh,dt>0?(partnerMesh.position.x-oldX)/dt:0,dt>0?(partnerMesh.position.z-oldZ)/dt:0,serviceDt);
    if(pose){
      const delta=Math.atan2(Math.sin(pose.heading-partnerMesh.rotation.y),Math.cos(pose.heading-partnerMesh.rotation.y));
      partnerMesh.rotation.y+=delta*k;
    }
    partnerMesh.position.y = sampleCharacterFootY(partnerMesh.position.x, partnerMesh.position.z);
  }
  if(playerMesh)publishLocalPose3D(playerMesh.position,playerMesh.rotation.y);

  // 3.5 Estaciones Interactivas y Bandeja 3D (Fase 3)
  // Rebind local/remote trays when joining as p2 after the title screen.
  if(playerMesh.userData.trayOwner!==Net.me){
    attachTrayToCharacter(playerMesh,Net.me);
    attachTrayToCharacter(partnerMesh,Net.me==='p1'?'p2':'p1');
    playerMesh.userData.trayOwner=Net.me;
  }
  syncStationUI();
  updateTrayAnimation('p1', dt);
  updateTrayAnimation('p2', dt);

  // 3.8 Clientes 3D en la Arena y Terraza + Mesas Dinámicas + Monedas Físicas + Radar (Fase AAA)
  syncTerraceTables3D(scene);
  syncCustomers3D(scene, camera, Game.mode==='service'?serviceDt:dt);
  updateCoins3D(dt);
  updateOffscreenRadar();

  // Clamping de seguridad de cámara
  CAM3D.targetPanOffset.x = Math.max(-10.0, Math.min(10.0, CAM3D.targetPanOffset.x));
  CAM3D.targetPanOffset.y = Math.max(-5.0, Math.min(5.0, CAM3D.targetPanOffset.y));
  CAM3D.targetDist = Math.max(5.5, Math.min(22.0, CAM3D.targetDist));

  // 4. Seguimiento Cinemático de la Cámara hacia Lali
  if (CAM3D.followPlayer && playerMesh) {
    CAM3D.targetGoal.set(playerMesh.position.x + CAM3D.panOffset.x, 1.4, playerMesh.position.z + CAM3D.panOffset.y);
  } else {
    CAM3D.targetGoal.set(CAM3D.panOffset.x, 1.4, CAM3D.panOffset.y);
  }

  // Auto-recentrado suave si el usuario lleva 3s sin tocar la cámara
  if (!CAM3D.isInteracting && (now - CAM3D.lastInteraction > 3000)) {
    CAM3D.targetPanOffset.lerp(new THREE.Vector2(0, 0), 0.035);
  }

  // Interpolación suave (Lerp) de la cámara
  CAM3D.target.lerp(CAM3D.targetGoal, 0.08);
  CAM3D.dist += (CAM3D.targetDist - CAM3D.dist) * 0.1;
  CAM3D.pitch += (CAM3D.targetPitch - CAM3D.pitch) * 0.08;
  CAM3D.yaw += (CAM3D.targetYaw - CAM3D.yaw) * 0.08;
  CAM3D.panOffset.lerp(CAM3D.targetPanOffset, 0.1);

  // Calcular posición de la cámara en coordenadas esféricas
  const camX = CAM3D.target.x + CAM3D.dist * Math.sin(CAM3D.yaw) * Math.cos(CAM3D.pitch);
  const camY = CAM3D.target.y + CAM3D.dist * Math.sin(CAM3D.pitch);
  const camZ = CAM3D.target.z + CAM3D.dist * Math.cos(CAM3D.yaw) * Math.cos(CAM3D.pitch);

  camera.position.set(camX, camY, camZ);
  camera.lookAt(CAM3D.target);

  // Botón de centrado visible si el usuario ha desplazado o hecho zoom a la cámara
  const resetBtn = document.getElementById('btn-cam-reset');
  if (resetBtn) {
    const isMoved = Math.abs(CAM3D.dist - 19) > 3.0 || CAM3D.panOffset.length() > 2.0;
    resetBtn.classList.toggle('hidden', !isMoved);
  }

  // 4. Clima Dinámico y Espectáculo en Vivo 3D (Fases 2 y 3)
  const h = (Game && Game.mode === 'service') ? Game.hour : 14;
  updateWeather3D(dt, time, h);
  updateStageAndShow3D(dt, time);
  syncUpgrades3D();
  syncStaff3D(serviceDt, Game.t);
  updateVFX3D(dt, time);

  updateCoastMaterials(waterMat, sandMat, {
    time,
    h,
    windFactor,
    sunLight
  });

  // Renderizar la escena
  if(draw) renderer.render(scene, camera);
}

export function is3DReady() {
  return isInitialized;
}

export function getPlayerMesh() {
  return playerMesh;
}
export function getPartnerMesh() {
  return partnerMesh;
}

if (typeof window !== 'undefined') {
  window.scene3D = scene;
  window.camera3D = camera;
  window.CAM3D = CAM3D;
  window.is3DReady = is3DReady;
  window.getPlayerMesh = getPlayerMesh;
  window.getPartnerMesh = getPartnerMesh;
  window.trayAddItem = trayAddItem;
  window.trayClear = trayClear;
  window.trayGetItems = trayGetItems;
  window.spawnCoinBurst3D = spawnCoinBurst3D;
  window.check3DCollision = check3DCollision;
  window.spawnCleanSparkles3D = spawnCleanSparkles3D;
  window.triggerBeerPourVFX = triggerBeerPourVFX;
}
