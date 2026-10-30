/* =========================================================
   staff-3d.js · Personal Contratado con Presencia 3D Real (Staff Activo)
   Representación visual 3D procedural y comportamientos autónomos para:
   - Yeray (Camarero en mostrador)
   - Carmela (Cocinera en plancha con gorro de chef)
   - Acaymo (Ayudante de limpieza con delantal y bayeta en terraza)
   - Camarero de terraza (Servicio exterior con bandeja)
   ========================================================= */
import * as THREE from './lib/three.module.js';
import { Game } from './state.js?v=28.17.2-flat-sand';
import { tablePosTo3D } from './world.js?v=28.17.2-flat-sand';
import { sampleCharacterFootY } from './coast-materials.js?v=28.17.2-flat-sand';

let staffGroup = null;
const staffMeshes = new Map();

// Materiales PBR exclusivos para el personal
const SMAT = {
  skinYeray: new THREE.MeshStandardMaterial({ color: 0xdeb08a, roughness: 0.6 }),
  skinCarmela: new THREE.MeshStandardMaterial({ color: 0xf5c39e, roughness: 0.6 }),
  skinAcaymo: new THREE.MeshStandardMaterial({ color: 0xc68a5c, roughness: 0.6 }),
  skinTerraza: new THREE.MeshStandardMaterial({ color: 0xdeb08a, roughness: 0.6 }),
  poloYeray: new THREE.MeshStandardMaterial({ color: 0x0f4c5c, roughness: 0.5 }), // Azul marino elegante
  chefWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), // Chaquetilla chef
  apronCoral: new THREE.MeshStandardMaterial({ color: 0xe8603c, roughness: 0.5 }),
  apronAcaymo: new THREE.MeshStandardMaterial({ color: 0x0f8b8d, roughness: 0.6 }), // Teal oscuro
  spongeYellow: new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.8 }),
  bandanaYellow: new THREE.MeshStandardMaterial({ color: 0xf5b82e, roughness: 0.5 }),
  pantsDark: new THREE.MeshStandardMaterial({ color: 0x212529, roughness: 0.7 }),
  trayBrass: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.85 }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x081f21, transparent: true, opacity: 0.3 })
};

export function initStaff3D(scene) {
  if (!scene) return;
  staffGroup = new THREE.Group();
  staffGroup.name = 'chiringuito_staff_3d';
  scene.add(staffGroup);

  createYeray(staffGroup);
  createCarmela(staffGroup);
  createAcaymo(staffGroup);
  createTerrazaWorker(staffGroup);

  syncStaff3D(0.016, 0);
}

// 1. Yeray (Camarero oficial en mostrador)
function createYeray(parent) {
  const g = new THREE.Group();
  g.name = 'staff_camarero';
  // Ubicado en la barra sirviendo bebidas sin solapar a Lali
  g.position.set(-2.8, 0.35, 1.8);
  g.rotation.y = 0; // Mirando hacia el mostrador/clientes

  const char = buildBaseStaffMesh(SMAT.skinYeray, SMAT.poloYeray, SMAT.apronCoral, SMAT.pantsDark);
  g.add(char.root);
  g.userData = { ...char, role: 'camarero', basePos: new THREE.Vector3(-2.8, 0.35, 1.8) };

  parent.add(g);
  staffMeshes.set('camarero', g);
}

// 2. Carmela (Cocinera profesional en plancha)
function createCarmela(parent) {
  const g = new THREE.Group();
  g.name = 'staff_cocinero';
  // Frente a la plancha de cocina sin colisionar con la barra lateral
  g.position.set(-0.1, 0.35, 1.8);
  g.rotation.y = 0; // Mirando hacia la plancha

  const char = buildBaseStaffMesh(SMAT.skinCarmela, SMAT.chefWhite, SMAT.apronCoral, SMAT.pantsDark);

  // Gorro alto de chef (Toque de cuisinier)
  const toqueBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.16, 12), SMAT.chefWhite);
  toqueBase.position.y = 1.62;
  char.headGroup.add(toqueBase);

  const toqueTop = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.35, 12), SMAT.chefWhite);
  toqueTop.position.y = 1.84;
  toqueTop.castShadow = true;
  char.headGroup.add(toqueTop);

  // Espátula de cocina en la mano derecha
  const spatHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6), SMAT.pantsDark);
  spatHandle.position.set(0.18, 0.88, 0.28);
  spatHandle.rotation.set(0.8, 0, 0);
  char.armR.add(spatHandle);

  const spatBlade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.015), SMAT.chefWhite);
  spatBlade.position.set(0.18, 1.05, 0.38);
  char.armR.add(spatBlade);

  g.add(char.root);
  g.userData = { ...char, role: 'cocinero', basePos: new THREE.Vector3(-0.1, 0.35, 1.8) };

  parent.add(g);
  staffMeshes.set('cocinero', g);
}

// 3. Acaymo (Ayudante de limpieza y sala)
function createAcaymo(parent) {
  const g = new THREE.Group();
  g.name = 'staff_limpiador';
  // Ubicado en la entrada de la terraza sin obstruir el pasillo ni las mesas
  g.position.set(4.2, 0.15, 1.0);

  const char = buildBaseStaffMesh(SMAT.skinAcaymo, SMAT.apronAcaymo, SMAT.apronAcaymo, SMAT.pantsDark);

  // Bandana canaria en la cabeza
  const bandana = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 12), SMAT.bandanaYellow);
  bandana.position.y = 1.55;
  char.headGroup.add(bandana);

  // Esponja de limpieza amarilla en la mano derecha
  const sponge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.22), SMAT.spongeYellow);
  sponge.position.set(0.24, 0.8, 0.15);
  char.armR.add(sponge);

  g.add(char.root);
  g.userData = {
    ...char,
    role: 'limpiador',
    basePos: new THREE.Vector3(4.2, 0.15, 1.0),
    targetPos: new THREE.Vector3(4.2, 0.15, 1.0),
    cleanTimer: 0,
    currentTable: null
  };

  parent.add(g);
  staffMeshes.set('limpiador', g);
}

// 4. Camarero de Terraza
function createTerrazaWorker(parent) {
  const g = new THREE.Group();
  g.name = 'staff_terraza';
  g.position.set(7.5, 0.15, 0.2);

  const char = buildBaseStaffMesh(SMAT.skinTerraza, SMAT.chefWhite, SMAT.apronCoral, SMAT.pantsDark);

  // Pequeña bandeja dorada de terraza
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 14), SMAT.trayBrass);
  tray.position.set(0.15, 0.95, 0.35);
  char.armL.add(tray);

  g.add(char.root);
  g.userData = {
    ...char,
    role: 'terraza',
    basePos: new THREE.Vector3(7.5, 0.15, 0.2),
    patrolDir: 1
  };

  parent.add(g);
  staffMeshes.set('terraza', g);
}

// Constructor base modular de personaje de staff
function buildBaseStaffMesh(skinMat, shirtMat, apronMat, pantsMat) {
  const root = new THREE.Group();

  // Sombra suave en suelo
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), SMAT.shadow);
  shadow.rotateX(-Math.PI / 2);
  shadow.position.y = 0.02;
  root.add(shadow);

  // Contenedor del cuerpo que rebota al caminar
  const bodyRoot = new THREE.Group();
  bodyRoot.position.y = 0.62;
  root.add(bodyRoot);

  // Piernas
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.62, 8), pantsMat);
  legL.position.set(-0.16, 0.31, 0);
  legL.castShadow = true;
  root.add(legL);

  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.62, 8), pantsMat);
  legR.position.set(0.16, 0.31, 0);
  legR.castShadow = true;
  root.add(legR);

  // Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.52, 10), shirtMat);
  torso.position.y = 0.26;
  torso.castShadow = true;
  bodyRoot.add(torso);

  // Delantal
  const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.44, 10), apronMat);
  apron.position.set(0, 0.22, 0.02);
  bodyRoot.add(apron);

  // Cabeza
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.82, 0);
  bodyRoot.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Brazos
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), shirtMat);
  armL.position.set(-0.32, 0.38, 0);
  bodyRoot.add(armL);

  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), shirtMat);
  armR.position.set(0.32, 0.38, 0);
  bodyRoot.add(armR);

  return { root, bodyRoot, headGroup, armL, armR, legL, legR, walkPhase: 0 };
}

/** Sincroniza y actualiza la animación del personal contratado */
export function syncStaff3D(dt = 0.016, time = 0) {
  if (!Game || !Game.staff) return;

  // 1. Yeray (Camarero)
  const mYeray = staffMeshes.get('camarero');
  if (mYeray) {
    const isHired = !!Game.staff.camarero;
    mYeray.visible = isHired;
    if (isHired) {
      const ud = mYeray.userData;
      ud.bodyRoot.position.y = 0.62 + Math.sin(time * 3.0) * 0.015;
      ud.armR.rotation.x = -0.4 + Math.sin(time * 5.0) * 0.15;
      ud.armL.rotation.x = -0.2 + Math.cos(time * 3.5) * 0.1;
    }
  }

  // 2. Carmela (Cocinera)
  const mCarmela = staffMeshes.get('cocinero');
  if (mCarmela) {
    const isHired = !!Game.staff.cocinero;
    mCarmela.visible = isHired;
    if (isHired) {
      const ud = mCarmela.userData;
      ud.bodyRoot.position.y = 0.62 + Math.sin(time * 4.0) * 0.02;
      ud.armR.rotation.x = -0.7 + Math.sin(time * 7.5) * 0.35; // Salteado y giro de espátula
      ud.armL.rotation.x = -0.3 + Math.cos(time * 3.0) * 0.12;
    }
  }

  // 3. Acaymo (Ayudante limpiando terraza)
  const mAcaymo = staffMeshes.get('limpiador');
  if (mAcaymo) {
    const isHired = !!Game.staff.limpiador;
    mAcaymo.visible = isHired;
    if (isHired) {
      const ud = mAcaymo.userData;
      // Buscar mesa sucia
      const dirtyTable = Game.tables ? Game.tables.find(t => t.state === 'dirty') : null;
      if (dirtyTable) {
        const tp = tablePosTo3D(dirtyTable);
        // Pararse en el borde exterior de la mesa sin colisionar con el tablero
        ud.targetPos.set(tp.x + 1.05, 0.15, tp.z);
      } else {
        ud.targetPos.copy(ud.basePos);
      }

      // Desplazamiento
      const dx = ud.targetPos.x - mAcaymo.position.x;
      const dz = ud.targetPos.z - mAcaymo.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.08) {
        const spd = 3.6 * dt;
        mAcaymo.position.x += (dx / dist) * Math.min(dist, spd);
        mAcaymo.position.z += (dz / dist) * Math.min(dist, spd);
        mAcaymo.rotation.y = Math.atan2(dx, dz);

        ud.walkPhase += dt * 9.0;
        ud.bodyRoot.position.y = 0.62 + Math.abs(Math.sin(ud.walkPhase)) * 0.07;
        ud.legL.rotation.x = -Math.sin(ud.walkPhase) * 0.45;
        ud.legR.rotation.x = Math.sin(ud.walkPhase) * 0.45;
      } else {
        // En la mesa: orientarse hacia el centro de la mesa y frotar con la bayeta
        if (dirtyTable) {
          const tp = tablePosTo3D(dirtyTable);
          mAcaymo.rotation.y = Math.atan2(tp.x - mAcaymo.position.x, tp.z - mAcaymo.position.z);
          ud.cleanTimer = (ud.cleanTimer || 0) + dt;
          // Presentation only: floor-service commits table state and statistics.
          if (ud.cleanTimer >= 1.5) ud.cleanTimer = 0;
        }
        ud.bodyRoot.position.y = 0.62;
        ud.legL.rotation.x = 0;
        ud.legR.rotation.x = 0;
        ud.armR.rotation.x = -0.6 + Math.sin(time * 9.0) * 0.4;
      }
    }
  }

  // 4. Camarero de Terraza
  const mTerraza = staffMeshes.get('terraza');
  if (mTerraza) {
    const isHired = !!Game.staff.terraza;
    mTerraza.visible = isHired;
    if (isHired) {
      const ud = mTerraza.userData;
      // Patrulla suave entre las mesas de la terraza
      mTerraza.position.x += ud.patrolDir * 1.8 * dt;
      if (mTerraza.position.x > 10.5) ud.patrolDir = -1;
      if (mTerraza.position.x < 5.5) ud.patrolDir = 1;

      mTerraza.rotation.y = ud.patrolDir > 0 ? Math.PI / 2 : -Math.PI / 2;
      ud.walkPhase += dt * 6.0;
      ud.bodyRoot.position.y = 0.62 + Math.abs(Math.sin(ud.walkPhase)) * 0.05;
      ud.legL.rotation.x = -Math.sin(ud.walkPhase) * 0.35;
      ud.legR.rotation.x = Math.sin(ud.walkPhase) * 0.35;
      ud.armL.rotation.x = -0.5; // Sosteniendo bandeja
    }
  }
  // También al cruzar entre arena y tarima, sin alturas fijas de 15 cm.
  for (const mesh of staffMeshes.values()) {
    mesh.position.y = sampleCharacterFootY(mesh.position.x, mesh.position.z, 0.015);
  }
}
