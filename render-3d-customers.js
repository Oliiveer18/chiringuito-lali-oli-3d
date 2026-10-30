/* =========================================================
   render-3d-customers.js · Clientes y Bañistas 3D Estilizados AAA
   Modelos 3D de clientes (Turistas, Locales, Surfistas) con animación
   de caminata en la arena, postura de sentado en terraza y proyección
   de coordenadas 3D → Pantalla 2D para burbujas de comandas.
   ========================================================= */
import * as THREE from './lib/three.module.js';
import { Game } from './state.js?v=28.17.3-flat-sand';
import { tablePosTo3D } from './world.js?v=28.17.3-flat-sand';
import { sampleCharacterFootY } from './coast-materials.js?v=28.17.3-flat-sand';

// Cache de materiales PBR para bañistas y clientes
const CUST_MATS = {
  skinTones: [
    new THREE.MeshStandardMaterial({ color: 0xf5c39e, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0xdeb08a, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0xc68a5c, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6 })
  ],
  shirtColors: [
    new THREE.MeshStandardMaterial({ color: 0x0f8b8d, roughness: 0.5 }), // Teal
    new THREE.MeshStandardMaterial({ color: 0xe8603c, roughness: 0.5 }), // Coral
    new THREE.MeshStandardMaterial({ color: 0xf5b82e, roughness: 0.5 }), // Amarillo
    new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.5 }), // Verde mar
    new THREE.MeshStandardMaterial({ color: 0xe76f51, roughness: 0.5 }), // Terracota
    new THREE.MeshStandardMaterial({ color: 0x264653, roughness: 0.5 }), // Azul marino
    new THREE.MeshStandardMaterial({ color: 0xf4a261, roughness: 0.5 }), // Melocotón
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })  // Blanco lino
  ],
  shortsColors: [
    new THREE.MeshStandardMaterial({ color: 0x3d4a5d, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0xc4b28c, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ color: 0x1d3557, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x457b9d, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.6 })
  ],
  hairColors: [
    new THREE.MeshStandardMaterial({ color: 0x221814, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x4a2c1d, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0xb58a4c, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x7c4b24, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.6 })
  ],
  eyes: new THREE.MeshBasicMaterial({ color: 0x111111 }),
  glint: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  sunglasses: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.1, metalness: 0.8 }),
  strawHat: new THREE.MeshStandardMaterial({ color: 0xe9d8a6, roughness: 0.85 }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x081f21, transparent: true, opacity: 0.28 })
};

// Materiales PBR y texturas para variedad y atrezo AAA (Zero-allocation)
const ATREZO_MATS = {
  // Tablas de surf
  surfTeal: new THREE.MeshStandardMaterial({ color: 0x0f8b8d, roughness: 0.35 }),
  surfCoral: new THREE.MeshStandardMaterial({ color: 0xe8603c, roughness: 0.35 }),
  surfYellow: new THREE.MeshStandardMaterial({ color: 0xf5b82e, roughness: 0.35 }),
  surfWood: new THREE.MeshStandardMaterial({ color: 0x965a30, roughness: 0.55 }),
  surfStripeWhite: new THREE.MeshStandardMaterial({ color: 0xfdfdfd, roughness: 0.3 }),
  surfStripeBlue: new THREE.MeshStandardMaterial({ color: 0x1d3557, roughness: 0.3 }),
  surfFin: new THREE.MeshStandardMaterial({ color: 0x222f3e, roughness: 0.5 }),

  // Cámara vintage
  cameraBody: new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.7 }),
  cameraMetal: new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.85, roughness: 0.2 }),
  cameraLensRim: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 }),
  cameraStrap: new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.8 }),

  // Mochila / Bolsas
  backpackKhaki: new THREE.MeshStandardMaterial({ color: 0x9c8262, roughness: 0.7 }),
  backpackTeal: new THREE.MeshStandardMaterial({ color: 0x165b5e, roughness: 0.7 }),
  backpackCoral: new THREE.MeshStandardMaterial({ color: 0xab472b, roughness: 0.7 }),

  // Flotadores hinchables
  flamingoPink: new THREE.MeshStandardMaterial({ color: 0xff6584, roughness: 0.28 }),
  flamingoBeakYellow: new THREE.MeshStandardMaterial({ color: 0xf5b82e, roughness: 0.3 }),
  flamingoBeakTip: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 }),
  donutPastry: new THREE.MeshStandardMaterial({ color: 0xdca468, roughness: 0.65 }),
  donutGlazePink: new THREE.MeshStandardMaterial({ color: 0xff7096, roughness: 0.25 }),
  donutGlazeChoc: new THREE.MeshStandardMaterial({ color: 0x54321b, roughness: 0.3 }),

  // Toallas de playa
  towelCyan: new THREE.MeshStandardMaterial({ color: 0x00b4d8, roughness: 0.8 }),
  towelCoral: new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.8 }),
  towelYellow: new THREE.MeshStandardMaterial({ color: 0xf9c74f, roughness: 0.8 }),

  // Gafas variadas
  sunglassesGold: new THREE.MeshStandardMaterial({ color: 0xf5b82e, metalness: 0.88, roughness: 0.15 }),
  sunglassesTeal: new THREE.MeshStandardMaterial({ color: 0x0f8b8d, roughness: 0.2, metalness: 0.4 }),
  sunglassesDark: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.8 }),

  // Sombreros y cintas
  ribbonTeal: new THREE.MeshStandardMaterial({ color: 0x0f8b8d, roughness: 0.5 }),
  ribbonCoral: new THREE.MeshStandardMaterial({ color: 0xe8603c, roughness: 0.5 }),
  ribbonDark: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 }),
  bucketHatNavy: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 }),
  bucketHatSand: new THREE.MeshStandardMaterial({ color: 0xe2d6c1, roughness: 0.8 }),

  // Pelo surfero
  surferBlonde: new THREE.MeshStandardMaterial({ color: 0xf3d267, roughness: 0.55 }),
  surferBleach: new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 })
};

// Geometrías compartidas para atrezo (Cero allocation en runtime)
const ATREZO_GEOS = {
  // Tabla de surf
  surfboardBody: new THREE.BoxGeometry(0.24, 1.18, 0.048),
  surfboardStripe: new THREE.BoxGeometry(0.04, 1.182, 0.052),
  surfFin: new THREE.ConeGeometry(0.035, 0.08, 4),

  // Cámara vintage
  cameraBody: new THREE.BoxGeometry(0.14, 0.09, 0.06),
  cameraTop: new THREE.BoxGeometry(0.142, 0.03, 0.062),
  cameraLens: new THREE.CylinderGeometry(0.038, 0.038, 0.045, 10),
  cameraLensRim: new THREE.CylinderGeometry(0.042, 0.042, 0.015, 10),
  cameraStrap: new THREE.TorusGeometry(0.18, 0.008, 4, 14),

  // Mochila safari
  backpackBody: new THREE.BoxGeometry(0.26, 0.32, 0.13),
  backpackPocket: new THREE.BoxGeometry(0.20, 0.13, 0.05),

  // Flotador hinchable
  floatRing: new THREE.TorusGeometry(0.33, 0.088, 8, 16),
  flamingoNeck: new THREE.CylinderGeometry(0.036, 0.042, 0.28, 8),
  flamingoHead: new THREE.SphereGeometry(0.062, 8, 6),
  flamingoBeak: new THREE.ConeGeometry(0.030, 0.08, 6),
  flamingoTail: new THREE.ConeGeometry(0.04, 0.10, 4),
  donutGlaze: new THREE.TorusGeometry(0.332, 0.089, 8, 16),

  // Toalla enrollada
  towel: new THREE.CylinderGeometry(0.075, 0.075, 0.36, 8),

  // Sombrero bucket (pescador)
  bucketCrown: new THREE.CylinderGeometry(0.28, 0.30, 0.14, 10),
  bucketBrim: new THREE.CylinderGeometry(0.42, 0.33, 0.07, 12),

  // Cinta de sombrero de paja
  hatRibbon: new THREE.CylinderGeometry(0.305, 0.305, 0.05, 14)
};

// Anclas de entrada alineadas con playa / paseo marítimo (llegada lógica 2D → 3D)
const CUST_ENTRY_ANCHORS = {
  beachEast: { x: 9.4, z: 6.55 },
  beachWest: { x: -9.4, z: 6.55 },
  boardwalkRight: { x: 8.0, z: 5.35 },
  boardwalkLeft: { x: -8.0, z: 5.35 }
};
const TERRACE_CORRIDOR = { x: 0.4, z: 5.25 };
const KIOSK_QUEUE_FACE = 0;
const TERRACE_CHAIR_R = 1.44;
const TERRACE_CHAIR_ANGLE = 0.35;
const SIM_TO_3D_X = 8.5 / 600;
const SIM_TO_3D_Z = 0.8 / 40;

function mapCustomerSimXZ(c) {
  return {
    x: ((c.x - 600) / 600) * 8.5,
    z: 5.8 + ((c.y - 684) / 40) * 0.8
  };
}

function simSpeedTo3D(movingSpd) {
  const s = movingSpd || 0;
  return Math.hypot(s * SIM_TO_3D_X, s * SIM_TO_3D_Z);
}

function customerEntryAnchor(c) {
  const fromEast = c.fromRight === true || (c.fromRight !== false && c.x > 620);
  if (c.type === 'surfista') {
    return fromEast ? CUST_ENTRY_ANCHORS.boardwalkRight : CUST_ENTRY_ANCHORS.boardwalkLeft;
  }
  return fromEast ? CUST_ENTRY_ANCHORS.beachEast : CUST_ENTRY_ANCHORS.beachWest;
}

function customerMoveTarget(mesh, finalX, finalZ, needsCorridor) {
  if (!needsCorridor) return { x: finalX, z: finalZ };
  const cx = TERRACE_CORRIDOR.x;
  const cz = TERRACE_CORRIDOR.z;
  const toFinal = Math.hypot(finalX - mesh.position.x, finalZ - mesh.position.z);
  const toCorridor = Math.hypot(cx - mesh.position.x, cz - mesh.position.z);
  if (toFinal > 1.35 && toCorridor > 0.35 && mesh.position.z > cz - 0.2) {
    const corridorWeight = THREE.MathUtils.clamp((toCorridor - 0.3) / 1.25, 0.32, 0.92);
    return {
      x: THREE.MathUtils.lerp(finalX, cx, corridorWeight),
      z: THREE.MathUtils.lerp(finalZ, cz, corridorWeight)
    };
  }
  return { x: finalX, z: finalZ };
}

const CUST_SHOE_MAT = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.4, metalness: 0.04 });

// Mapa de clientes activos: custId -> THREE.Group
const activeCustomerMeshes = new Map();

// Crear modelo 3D de un cliente
export function createCustomer3D(customer) {
  const char = new THREE.Group();
  char.name = 'cust_' + customer.id;

  const hash = Math.abs(customer.id * 1664525 + 1013904223);
  const custType = customer.type || 'turista';

  const skinMat = CUST_MATS.skinTones[hash % CUST_MATS.skinTones.length];
  const shirtMat = CUST_MATS.shirtColors[(hash >> 3) % CUST_MATS.shirtColors.length];
  const shortsMat = CUST_MATS.shortsColors[(hash >> 6) % CUST_MATS.shortsColors.length];
  let hairMat = CUST_MATS.hairColors[(hash >> 9) % CUST_MATS.hairColors.length];

  // Surfistas tienen tonos de cabello decolorados o rubios playeros
  if (custType === 'surfista') {
    hairMat = (hash % 2 === 0) ? ATREZO_MATS.surferBlonde : ATREZO_MATS.surferBleach;
  }

  // Sombra suave en suelo
  const shadowGeo = new THREE.PlaneGeometry(0.85, 0.85);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, CUST_MATS.shadow);
  shadow.position.y = 0.02;
  char.add(shadow);

  // Caderas + torso (piernas visibles desde la cadera)
  const hips = new THREE.Group();
  hips.position.y = 0.56;
  char.add(hips);

  const BODY_BASE_Y = 0.10;
  const bodyRoot = new THREE.Group();
  bodyRoot.position.y = BODY_BASE_Y;
  hips.add(bodyRoot);

  // Torso
  const torsoGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.50, 10);
  const torso = new THREE.Mesh(torsoGeo, shirtMat);
  torso.castShadow = true;
  torso.position.y = 0.25;
  bodyRoot.add(torso);

  // Cuello
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.10, 8), skinMat);
  neck.position.y = 0.52;
  bodyRoot.add(neck);

  // Cabeza
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.84, 0);
  bodyRoot.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.32, 14, 12);
  headGeo.scale(1.0, 1.05, 0.95);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Gafas de sol de diseño o Ojos expresivos
  const hasSunglasses = (custType === 'turista') || (hash % 3 === 0);
  if (hasSunglasses) {
    const glassStyle = hash % 3;
    if (glassStyle === 0) {
      // Wayfarer negro clásico
      const glassesGeo = new THREE.BoxGeometry(0.38, 0.12, 0.06);
      const glasses = new THREE.Mesh(glassesGeo, ATREZO_MATS.sunglassesDark);
      glasses.position.set(0, 0.04, 0.32);
      headGroup.add(glasses);
    } else if (glassStyle === 1) {
      // Redondas doradas retro con puente metálico
      const glassesGroup = new THREE.Group();
      [-0.11, 0.11].forEach(x => {
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 10), ATREZO_MATS.sunglassesGold);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(x, 0.04, 0.31);
        glassesGroup.add(rim);
      });
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.015), ATREZO_MATS.sunglassesGold);
      bridge.position.set(0, 0.04, 0.32);
      glassesGroup.add(bridge);
      headGroup.add(glassesGroup);
    } else {
      // Montura azul turquesa playera
      const glassesGeo = new THREE.BoxGeometry(0.38, 0.12, 0.06);
      const glasses = new THREE.Mesh(glassesGeo, ATREZO_MATS.sunglassesTeal);
      glasses.position.set(0, 0.04, 0.32);
      headGroup.add(glasses);
    }
  } else {
    [-0.12, 0.12].forEach(x => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), CUST_MATS.eyes);
      eye.position.set(x, 0.03, 0.30);
      headGroup.add(eye);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), CUST_MATS.glint);
      glint.position.set(x + 0.015, 0.05, 0.32);
      headGroup.add(glint);
    });
  }

  // Sombreros y peinados con identidad
  const hasHat = (custType === 'turista' && (hash % 3 !== 0)) || (hash % 4 === 1);
  if (hasHat) {
    if (custType === 'local' && (hash % 2 === 1)) {
      // Gorra marinera / Bucket Hat de pescador
      const bucketMat = (hash % 2 === 0) ? ATREZO_MATS.bucketHatNavy : ATREZO_MATS.bucketHatSand;
      const bucketGroup = new THREE.Group();
      const crown = new THREE.Mesh(ATREZO_GEOS.bucketCrown, bucketMat);
      crown.position.y = 0.24;
      bucketGroup.add(crown);
      const brim = new THREE.Mesh(ATREZO_GEOS.bucketBrim, bucketMat);
      brim.position.y = 0.18;
      bucketGroup.add(brim);
      headGroup.add(bucketGroup);
    } else {
      // Sombrero de paja playero con cinta de color
      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.03, 14), CUST_MATS.strawHat);
      hatBrim.position.set(0, 0.18, 0);
      headGroup.add(hatBrim);

      const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.30, 0.22, 12), CUST_MATS.strawHat);
      hatCrown.position.set(0, 0.28, 0);
      headGroup.add(hatCrown);

      const ribbonMat = (hash % 3 === 0) ? ATREZO_MATS.ribbonTeal
                      : (hash % 3 === 1) ? ATREZO_MATS.ribbonCoral
                      : ATREZO_MATS.ribbonDark;
      const ribbon = new THREE.Mesh(ATREZO_GEOS.hatRibbon, ribbonMat);
      ribbon.position.set(0, 0.21, 0);
      headGroup.add(ribbon);
    }
  } else {
    // Pelo estilizado (con volumen extra para surfistas)
    const hairGeo = new THREE.SphereGeometry(custType === 'surfista' ? 0.36 : 0.34, 12, 10);
    hairGeo.scale(1.04, 1.06, 1.05);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.08, -0.02);
    hair.castShadow = true;
    headGroup.add(hair);
  }

  // Brazos
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.28, 0.42, 0);
  bodyRoot.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.28, 0.42, 0);
  bodyRoot.add(rightArm);

  [leftArm, rightArm].forEach(pivot => {
    const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.38, 8), skinMat);
    armMesh.position.y = -0.20;
    pivot.add(armMesh);
  });

  // Piernas
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.14, 0, 0);
  hips.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.14, 0, 0);
  hips.add(rightLeg);

  [leftLeg, rightLeg].forEach(pivot => {
    const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.22, 8), shortsMat);
    shorts.position.y = -0.11;
    pivot.add(shorts);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.30, 8), skinMat);
    leg.position.y = -0.28;
    pivot.add(leg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.24), CUST_SHOE_MAT);
    shoe.position.set(0, -0.46, 0.04);
    shoe.castShadow = true;
    pivot.add(shoe);
  });

  // ── ATREZO Y COMPLEMENTOS SEGÚN ARQUETIPO ──
  let surfboard = null;
  let cameraMesh = null;
  let backpack = null;
  let floatRing = null;
  let towel = null;

  if (custType === 'surfista') {
    // 1. SURFISTAS: TABLA DE SURF AERODINÁMICA CON QUILLA Y RAYA DE COLOR
    const surfGroup = new THREE.Group();
    surfGroup.name = 'surfboard';

    const livery = hash % 4;
    let boardMat = ATREZO_MATS.surfTeal;
    let stripeMat = ATREZO_MATS.surfStripeWhite;
    if (livery === 1) {
      boardMat = ATREZO_MATS.surfCoral;
      stripeMat = ATREZO_MATS.surfYellow;
    } else if (livery === 2) {
      boardMat = ATREZO_MATS.surfWood;
      stripeMat = ATREZO_MATS.surfStripeWhite;
    } else if (livery === 3) {
      boardMat = ATREZO_MATS.surfYellow;
      stripeMat = ATREZO_MATS.surfStripeBlue;
    }

    const boardMesh = new THREE.Mesh(ATREZO_GEOS.surfboardBody, boardMat);
    boardMesh.castShadow = true;
    surfGroup.add(boardMesh);

    const stripeMesh = new THREE.Mesh(ATREZO_GEOS.surfboardStripe, stripeMat);
    surfGroup.add(stripeMesh);

    // 3 Quillas aerodinámicas traseras
    [-0.06, 0, 0.06].forEach((x, idx) => {
      const fin = new THREE.Mesh(ATREZO_GEOS.surfFin, ATREZO_MATS.surfFin);
      fin.rotation.x = Math.PI / 2;
      fin.position.set(x, -0.48, idx === 1 ? -0.035 : -0.025);
      surfGroup.add(fin);
    });

    // Llevada con estilo bajo el brazo izquierdo
    surfGroup.position.set(-0.34, 0.16, 0.05);
    surfGroup.rotation.set(0.20, 0.04, 0.10);
    bodyRoot.add(surfGroup);
    surfboard = surfGroup;

  } else if (custType === 'turista') {
    // 2. TURISTAS: CÁMARA VINTAGE EN EL PECHO Y MOCHILA DE EXPLORADOR
    if (hash % 4 !== 3) {
      const camGroup = new THREE.Group();
      camGroup.name = 'camera';

      const bodyMesh = new THREE.Mesh(ATREZO_GEOS.cameraBody, ATREZO_MATS.cameraBody);
      camGroup.add(bodyMesh);

      const topMesh = new THREE.Mesh(ATREZO_GEOS.cameraTop, ATREZO_MATS.cameraMetal);
      topMesh.position.y = 0.045;
      camGroup.add(topMesh);

      const lens = new THREE.Mesh(ATREZO_GEOS.cameraLens, ATREZO_MATS.cameraMetal);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, 0, 0.045);
      camGroup.add(lens);

      const lensRim = new THREE.Mesh(ATREZO_GEOS.cameraLensRim, ATREZO_MATS.cameraLensRim);
      lensRim.rotation.x = Math.PI / 2;
      lensRim.position.set(0, 0, 0.068);
      camGroup.add(lensRim);

      const strap = new THREE.Mesh(ATREZO_GEOS.cameraStrap, ATREZO_MATS.cameraStrap);
      strap.rotation.x = 0.45;
      strap.position.set(0, 0.14, -0.04);
      camGroup.add(strap);

      camGroup.position.set(0, 0.20, 0.26);
      camGroup.rotation.x = 0.12;
      bodyRoot.add(camGroup);
      cameraMesh = camGroup;
    }

    if (hash % 2 === 0) {
      const packGroup = new THREE.Group();
      packGroup.name = 'backpack';

      const packMat = (hash % 3 === 0) ? ATREZO_MATS.backpackKhaki
                    : (hash % 3 === 1) ? ATREZO_MATS.backpackTeal
                    : ATREZO_MATS.backpackCoral;

      const packMesh = new THREE.Mesh(ATREZO_GEOS.backpackBody, packMat);
      packMesh.castShadow = true;
      packGroup.add(packMesh);

      const pocketMesh = new THREE.Mesh(ATREZO_GEOS.backpackPocket, packMat);
      pocketMesh.position.set(0, -0.06, -0.08);
      packGroup.add(pocketMesh);

      packGroup.position.set(0, 0.26, -0.22);
      bodyRoot.add(packGroup);
      backpack = packGroup;
    }

  } else if (custType === 'local') {
    // 3. LOCALES / BAÑISTAS: FLOTADOR HINCHABLE (FLAMENCO O DONUT) O TOALLA DE PLAYA
    if (hash % 2 === 0) {
      const floatGroup = new THREE.Group();
      floatGroup.name = 'floatRing';

      const isFlamingo = (hash % 4 === 0 || hash % 4 === 2);
      if (isFlamingo) {
        // Flotador Flamenco Rosa
        const ring = new THREE.Mesh(ATREZO_GEOS.floatRing, ATREZO_MATS.flamingoPink);
        ring.rotation.x = Math.PI / 2;
        floatGroup.add(ring);

        const neck = new THREE.Mesh(ATREZO_GEOS.flamingoNeck, ATREZO_MATS.flamingoPink);
        neck.position.set(0, 0.15, 0.36);
        neck.rotation.x = -0.35;
        floatGroup.add(neck);

        const head = new THREE.Mesh(ATREZO_GEOS.flamingoHead, ATREZO_MATS.flamingoPink);
        head.position.set(0, 0.28, 0.44);
        floatGroup.add(head);

        const beak = new THREE.Mesh(ATREZO_GEOS.flamingoBeak, ATREZO_MATS.flamingoBeakYellow);
        beak.rotation.x = Math.PI / 2 + 0.3;
        beak.position.set(0, 0.27, 0.50);
        floatGroup.add(beak);

        const beakTip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 6), ATREZO_MATS.flamingoBeakTip);
        beakTip.rotation.x = Math.PI / 2 + 0.3;
        beakTip.position.set(0, 0.258, 0.535);
        floatGroup.add(beakTip);

        const tail = new THREE.Mesh(ATREZO_GEOS.flamingoTail, ATREZO_MATS.flamingoPink);
        tail.rotation.x = -Math.PI / 3;
        tail.position.set(0, 0.05, -0.38);
        floatGroup.add(tail);
      } else {
        // Flotador Donut Glaseado
        const pastry = new THREE.Mesh(ATREZO_GEOS.floatRing, ATREZO_MATS.donutPastry);
        pastry.rotation.x = Math.PI / 2;
        floatGroup.add(pastry);

        const glazeMat = (hash % 4 === 1) ? ATREZO_MATS.donutGlazePink : ATREZO_MATS.donutGlazeChoc;
        const glaze = new THREE.Mesh(ATREZO_GEOS.donutGlaze, glazeMat);
        glaze.rotation.x = Math.PI / 2;
        glaze.position.y = 0.015;
        floatGroup.add(glaze);
      }

      floatGroup.position.set(0, -0.06, 0);
      bodyRoot.add(floatGroup);
      floatRing = floatGroup;
    } else if (hash % 3 === 1) {
      // Toalla de playa enrollada
      const towelGroup = new THREE.Group();
      towelGroup.name = 'towel';

      const towelMat = (hash % 3 === 0) ? ATREZO_MATS.towelCyan
                     : (hash % 3 === 1) ? ATREZO_MATS.towelCoral
                     : ATREZO_MATS.towelYellow;

      const towelMesh = new THREE.Mesh(ATREZO_GEOS.towel, towelMat);
      towelMesh.rotation.x = Math.PI / 2;
      towelGroup.add(towelMesh);

      towelGroup.position.set(-0.28, 0.22, 0);
      towelGroup.rotation.set(0.1, 0, 0.1);
      bodyRoot.add(towelGroup);
      towel = towelGroup;
    }
  }

  char.userData = {
    customer,
    bodyRoot,
    bodyBaseY: BODY_BASE_Y,
    hips,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    shadow,
    surfboard,
    camera: cameraMesh,
    backpack,
    floatRing,
    towel,
    walkPhase: Math.random() * Math.PI * 2,
    currentAngle: 0,
    targetAngle: 0,
    isSitting: false,
    speed: 0,
    prevX: 0,
    prevZ: 0
  };

  return char;
}

// Sincronizar clientes 2D con la escena 3D y proyectar coordenadas a pantalla
export function customerInteractionPosition(customer){
  const mesh=activeCustomerMeshes.get(customer.id);
  if(mesh) return {x:mesh.position.x,z:mesh.position.z};
  if(customer.table) return tablePosTo3D(customer.table);
  if(customer.state==='queue') return {x:-2.2-(customer.spot||0)*1.1,z:4.85};
  return mapCustomerSimXZ(customer);
}

export function syncCustomers3D(scene, camera, dt = 0.016) {
  if (!Game || !Game.customers || !scene || !camera) return;

  const currentIds = new Set();
  const screenVec = new THREE.Vector3();

  for (const c of Game.customers) {
    if (c.state === 'gone') continue;
    currentIds.add(c.id);

    let charMesh = activeCustomerMeshes.get(c.id);
    if (!charMesh) {
      charMesh = createCustomer3D(c);
      const entry = customerEntryAnchor(c);
      charMesh.position.set(entry.x, 0, entry.z);
      charMesh.userData.entrySide = c.fromRight !== false && c.x > 620 ? 'east' : 'west';
      charMesh.userData.spawnedAtEntry = true;
      scene.add(charMesh);
      activeCustomerMeshes.set(c.id, charMesh);
    }

    const ud = charMesh.userData;
    const bodyY = ud.bodyBaseY ?? 0.10;
    const walkScale = c.look?.walk?.bob ?? 1;

    // Calcular posición objetivo en el mundo 3D
    let targetX = 0, targetZ = 0;

    if (c.state === 'toTable' || c.state === 'eat') {
      // Sentado en silla de la terraza (alineado con la silla sin solapar la mesa)
      if (c.table) {
        const tp = tablePosTo3D(c.table);
        targetX = tp.x + Math.cos(TERRACE_CHAIR_ANGLE) * TERRACE_CHAIR_R;
        targetZ = tp.z + Math.sin(TERRACE_CHAIR_ANGLE) * TERRACE_CHAIR_R;
        ud.isSitting = (c.state === 'eat');
      } else {
        targetX = ((c.x - 600) / 600) * 8.5;
        targetZ = 5.2;
        ud.isSitting = false;
      }
    } else if (c.state === 'queue') {
      // Formando cola frente al mostrador de la barra sin atravesar la barra ni los taburetes
      const spot = c.spot || 0;
      targetX = -2.2 - spot * 1.1;
      targetZ = 4.85;
      ud.isSitting = false;
    } else {
      const simPos = mapCustomerSimXZ(c);
      targetX = simPos.x;
      targetZ = simPos.z;
      ud.isSitting = false;
    }

    const needsCorridor = c.state === 'queue' || c.state === 'toTable' || c.state === 'arrive';
    const moveGoal = customerMoveTarget(charMesh, targetX, targetZ, needsCorridor);

    const followSim =
      !ud.isSitting &&
      (c.state === 'arrive' || c.state === 'leave' || c.state === 'walkby' ||
        (c.movingSpd > 2 && c.state !== 'queue'));
    const goalX = followSim ? mapCustomerSimXZ(c).x : moveGoal.x;
    const goalZ = followSim ? mapCustomerSimXZ(c).z : moveGoal.z;

    const dx = goalX - charMesh.position.x;
    const dz = goalZ - charMesh.position.z;
    const dist = Math.hypot(dx, dz);

    const simCap = simSpeedTo3D(c.movingSpd) * dt * 1.12;
    const cruiseCap = Math.max(simCap, ud.speed * dt * 0.85, 0.35 * dt);
    const moveCap = dt>0?Math.min(dist, cruiseCap + 0.018):0;

    if (dist > 0.03 && !ud.isSitting) {
      const step = moveCap;
      charMesh.position.x += (dx / dist) * step;
      charMesh.position.z += (dz / dist) * step;
      const distMoved = step;
      const strideMul = c.look?.walk?.stride ?? 1;
      ud.walkPhase += distMoved * (5.1 * strideMul);
      const instSpeed = distMoved / Math.max(dt, 0.0001);
      ud.speed = THREE.MathUtils.lerp(ud.speed, instSpeed, 0.28);
      if (distMoved > 0.002) ud.targetAngle = Math.atan2(dx, dz);
    } else if (!ud.isSitting) {
      ud.speed = THREE.MathUtils.lerp(ud.speed, simSpeedTo3D(c.movingSpd), 0.15);
      if (ud.speed < 0.06) ud.speed = 0;
      if (c.state === 'queue') {
        ud.targetAngle = KIOSK_QUEUE_FACE;
      } else if (c.state === 'eat' && c.table) {
        const tp = tablePosTo3D(c.table);
        ud.targetAngle = Math.atan2(tp.x - charMesh.position.x, tp.z - charMesh.position.z);
      }
    } else {
      ud.speed = 0;
      if (c.state === 'eat' && c.table) {
        const tp = tablePosTo3D(c.table);
        ud.targetAngle = Math.atan2(tp.x - charMesh.position.x, tp.z - charMesh.position.z);
      }
    }

    charMesh.position.y = sampleCharacterFootY(charMesh.position.x, charMesh.position.z);

    // Rotación suave
    let diff = ud.targetAngle - ud.currentAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    const turnRate = ud.speed > 0.5 ? 0.14 : 0.1;
    ud.currentAngle += diff * turnRate;
    charMesh.rotation.y = ud.currentAngle;

    // Control de visibilidad de atrezo (evitar solapamiento con mesas/sillas al comer)
    if (ud.floatRing) ud.floatRing.visible = !ud.isSitting;
    if (ud.surfboard) ud.surfboard.visible = !ud.isSitting;
    if (ud.towel) ud.towel.visible = !ud.isSitting;

    // Emotes emocionales según paciencia
    if (c.patience !== undefined && c.state !== 'gone' && c.state !== 'eat') {
      if (c.patience < 0.22 && !c._patienceAlertShown) {
        c._patienceAlertShown = true;
        c._emote = { type: 'angry', text: '😤 ¡Tarda mucho!', timer: 2.2 };
      }
    }

    // Animación de caminata, sentado o salto de alegría
    if (ud.jumpT > 0) {
      // Salto de satisfacción y alegría al recibir comanda
      const jumpProgress = (0.45 - ud.jumpT) / 0.45;
      const jumpY = Math.sin(jumpProgress * Math.PI) * 0.28;
      ud.bodyRoot.position.y = 0.42 + jumpY;
      ud.jumpT -= dt;
    } else if (ud.isSitting) {
      // POSTURA SENTADO EN SILLA 3D
      ud.bodyRoot.position.y = 0.38;
      ud.leftLeg.rotation.x = -Math.PI / 2.2;
      ud.rightLeg.rotation.x = -Math.PI / 2.2;
      ud.leftArm.rotation.x = -0.4;
      ud.rightArm.rotation.x = -0.4;
    } else if (ud.speed > 0.08) {
      // CAMINANDO POR LA ARENA
      ud.walkPhase += dt * 5.5;
      const sinBob = Math.sin(ud.walkPhase);
      const bob = sinBob * sinBob * 0.035 * walkScale;
      ud.bodyRoot.position.y = bodyY + bob;

      const legSwing = Math.sin(ud.walkPhase) * 0.42;
      ud.leftLeg.rotation.x = -legSwing;
      ud.rightLeg.rotation.x = legSwing;

      const armSwing = Math.sin(ud.walkPhase) * 0.32;
      ud.leftArm.rotation.x = armSwing;
      ud.rightArm.rotation.x = -armSwing;

      // Postura natural al sujetar tabla de surf o toalla bajo el brazo
      if (ud.surfboard) {
        ud.leftArm.rotation.x = -0.15;
        ud.leftArm.rotation.z = -0.12;
      } else if (ud.towel) {
        ud.leftArm.rotation.x = -0.10;
        ud.leftArm.rotation.z = -0.08;
      }
    } else {
      // REPOSO (Esperando en cola)
      const t = performance.now() * 0.002;
      ud.bodyRoot.position.y = bodyY + Math.sin(t * 2.0) * 0.012;
      ud.leftLeg.rotation.x = 0;
      ud.rightLeg.rotation.x = 0;
      ud.leftArm.rotation.x = ud.surfboard ? -0.12 : 0.05;
      ud.leftArm.rotation.z = ud.surfboard ? -0.10 : 0;
      ud.rightArm.rotation.x = 0.05;
    }

    // PROYECCIÓN 3D → COORDENADAS DE PANTALLA 2D
    // Permite que las burbujas de pedido y emojis se dibujen exactamente sobre la cabeza 3D
    screenVec.set(charMesh.position.x, charMesh.position.y + 1.45, charMesh.position.z);
    screenVec.project(camera);

    const isVisible = screenVec.z < 1.0 && screenVec.x >= -1.2 && screenVec.x <= 1.2 && screenVec.y >= -1.2 && screenVec.y <= 1.2;
    const screenX = (screenVec.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-screenVec.y * 0.5 + 0.5) * window.innerHeight;

    c._screenPos = {
      x: screenX,
      y: screenY,
      visible: isVisible,
      scale: Math.max(0.6, Math.min(1.4, 18.0 / Math.max(1, camera.position.distanceTo(charMesh.position))))
    };
  }

  // Eliminar mallas de clientes que se han ido
  for (const [id, mesh] of activeCustomerMeshes.entries()) {
    if (!currentIds.has(id)) {
      scene.remove(mesh);
      activeCustomerMeshes.delete(id);
    }
  }
}

export function clearAllCustomers3D(scene) {
  for (const mesh of activeCustomerMeshes.values()) {
    if (scene) scene.remove(mesh);
  }
  activeCustomerMeshes.clear();
}

/** Dispara reacción emocional positiva y salto de alegría en el cliente 3D */
export function triggerCustomerHappyEmote(c, hasTip = false) {
  if (!c) return;
  c._emote = {
    type: 'happy',
    text: hasTip ? '❤️ +€' : '😊 ¡Rico!',
    timer: 2.2
  };
  const charMesh = activeCustomerMeshes.get(c.id);
  if (charMesh && charMesh.userData) {
    charMesh.userData.jumpT = 0.45;
  }
}
