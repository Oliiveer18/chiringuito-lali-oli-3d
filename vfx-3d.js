/* =========================================================
   vfx-3d.js · Micro-Partículas y Fauna Marina 3D de Alto Rendimiento (Móvil AAA)
   Diseñado con cero allocations por frame (Zero-GC) para 60 FPS fijos en móviles:
   - 3 Gaviotas Procedurales (Seagulls) con planeo y aleteo sinusoidal orgánico en el cielo.
   - Columnas de vapor y humo translúcido ascendente en la plancha de cocina.
   - Burbujas y espuma efervescente al tirar cañas en el grifo de barra.
   - Estallido de chispas estelares doradas (Clean Sparkles) al abrillantar mesas.
   - Llamada periódica de gaviotas costeras en WebAudio espacial.
   ========================================================= */
import * as THREE from './lib/three.module.js';
import { Game, weatherToday } from './state.js?v=28.17.0-online-web';
import { Audio } from './audio.js?v=28.17.0-online-web';

let vfxGroup = null;

// ---------- 1. GAVIOTAS 3D (SEAGULLS) ----------
const SEAGULLS = [];
const SEAGULL_COUNT = 3;

// Materiales compartidos para gaviotas
const GULL_MATS = {
  body: new THREE.MeshStandardMaterial({ color: 0xfcfcfc, roughness: 0.6 }),
  wing: new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.5 }),
  wingTip: new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.7 }),
  beak: new THREE.MeshStandardMaterial({ color: 0xf5b82e, roughness: 0.4 })
};

function buildSeagull(index) {
  const g = new THREE.Group();
  g.name = 'seagull_' + index;

  // Cuerpo aerodinámico esbelto
  const bodyGeo = new THREE.ConeGeometry(0.14, 0.68, 6);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, GULL_MATS.body);
  body.castShadow = false;
  g.add(body);

  // Pico amarillo canario
  const beakGeo = new THREE.ConeGeometry(0.045, 0.22, 5);
  beakGeo.rotateX(-Math.PI / 2);
  const beak = new THREE.Mesh(beakGeo, GULL_MATS.beak);
  beak.position.set(0, -0.01, 0.42);
  g.add(beak);

  // Ala izquierda con bisagra
  const wingLRoot = new THREE.Group();
  wingLRoot.position.set(-0.11, 0.04, 0.05);
  g.add(wingLRoot);

  const wingLGeo = new THREE.BoxGeometry(0.72, 0.02, 0.24);
  const wingL = new THREE.Mesh(wingLGeo, GULL_MATS.wing);
  wingL.position.set(-0.36, 0, 0);
  wingLRoot.add(wingL);

  const tipLGeo = new THREE.BoxGeometry(0.24, 0.022, 0.18);
  const tipL = new THREE.Mesh(tipLGeo, GULL_MATS.wingTip);
  tipL.position.set(-0.76, 0, -0.03);
  wingLRoot.add(tipL);

  // Ala derecha con bisagra
  const wingRRoot = new THREE.Group();
  wingRRoot.position.set(0.11, 0.04, 0.05);
  g.add(wingRRoot);

  const wingRGeo = new THREE.BoxGeometry(0.72, 0.02, 0.24);
  const wingR = new THREE.Mesh(wingRGeo, GULL_MATS.wing);
  wingR.position.set(0.36, 0, 0);
  wingRRoot.add(wingR);

  const tipRGeo = new THREE.BoxGeometry(0.24, 0.022, 0.18);
  const tipR = new THREE.Mesh(tipRGeo, GULL_MATS.wingTip);
  tipR.position.set(0.76, 0, -0.03);
  wingRRoot.add(tipR);

  return {
    group: g,
    wingL: wingLRoot,
    wingR: wingRRoot,
    orbitRadius: 18 + index * 5,
    altitude: 13.5 + index * 2.2,
    speed: 0.28 + index * 0.06,
    angle: (index * Math.PI * 2) / SEAGULL_COUNT,
    centerX: (index - 1) * 6,
    centerZ: -16 - index * 4,
    glideTimer: index * 1.5
  };
}

// ---------- 2. VAPOR Y HUMO DE PLANCHA (GRILL STEAM) ----------
const STEAM_COUNT = 16;
let steamMesh = null;
let steamPositions = null;
const steamData = [];

// ---------- 3. ESPUMA DE CERVEZA (BEER FOAM PARTICLES) ----------
const FOAM_COUNT = 10;
let foamMesh = null;
let foamPositions = null;
const foamData = [];

// ---------- 4. CHISPAS DE LIMPIEZA DE MESAS (CLEAN SPARKLES) ----------
const SPARKLE_COUNT = 14;
let sparkleMesh = null;
let sparklePositions = null;
const sparkleData = [];
let sparkleActive = false;
let sparkleTime = 0;

// Textura procedural ultra-ligera en memoria para partículas suaves
function createParticleTexture() {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = 32;
  cv.height = 32;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

export function initVFX3D(scene) {
  if (!scene) return;
  vfxGroup = new THREE.Group();
  vfxGroup.name = 'chiringuito_vfx_3d';
  scene.add(vfxGroup);

  const particleTex = createParticleTexture();

  // 1. Inicializar Gaviotas
  SEAGULLS.length = 0;
  for (let i = 0; i < SEAGULL_COUNT; i++) {
    const gull = buildSeagull(i);
    vfxGroup.add(gull.group);
    SEAGULLS.push(gull);
  }

  // 2. Inicializar Vapor de Plancha
  const steamGeo = new THREE.BufferGeometry();
  steamPositions = new Float32Array(STEAM_COUNT * 3);
  steamData.length = 0;

  for (let i = 0; i < STEAM_COUNT; i++) {
    const p = {
      x: -0.1 + (Math.random() - 0.5) * 0.8,
      y: 1.55 + Math.random() * 0.9,
      z: 3.65 + (Math.random() - 0.5) * 0.4,
      vy: 0.8 + Math.random() * 0.9,
      vx: (Math.random() - 0.5) * 0.2,
      vz: (Math.random() - 0.5) * 0.15,
      life: Math.random(),
      maxLife: 1.2 + Math.random() * 0.8
    };
    steamData.push(p);
    steamPositions[i * 3 + 0] = p.x;
    steamPositions[i * 3 + 1] = p.y;
    steamPositions[i * 3 + 2] = p.z;
  }
  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3));

  const steamMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.42,
    map: particleTex,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  steamMesh = new THREE.Points(steamGeo, steamMat);
  vfxGroup.add(steamMesh);

  // 3. Inicializar Espuma de Cerveza
  const foamGeo = new THREE.BufferGeometry();
  foamPositions = new Float32Array(FOAM_COUNT * 3);
  foamData.length = 0;

  for (let i = 0; i < FOAM_COUNT; i++) {
    const p = {
      x: -3.8 + (Math.random() - 0.5) * 0.25,
      y: 1.45 + (Math.random() - 0.5) * 0.15,
      z: 3.65 + (Math.random() - 0.5) * 0.2,
      vy: 0.3 + Math.random() * 0.4,
      life: Math.random(),
      active: false
    };
    foamData.push(p);
    foamPositions[i * 3 + 0] = p.x;
    foamPositions[i * 3 + 1] = p.y;
    foamPositions[i * 3 + 2] = p.z;
  }
  foamGeo.setAttribute('position', new THREE.BufferAttribute(foamPositions, 3));

  const foamMat = new THREE.PointsMaterial({
    color: 0xffe6a7,
    size: 0.24,
    map: particleTex,
    transparent: true,
    opacity: 0.75,
    depthWrite: false
  });
  foamMesh = new THREE.Points(foamGeo, foamMat);
  vfxGroup.add(foamMesh);

  // 4. Inicializar Chispas de Limpieza
  const sparkleGeo = new THREE.BufferGeometry();
  sparklePositions = new Float32Array(SPARKLE_COUNT * 3);
  sparkleData.length = 0;

  for (let i = 0; i < SPARKLE_COUNT; i++) {
    sparkleData.push({
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      life: 0, maxLife: 0.6
    });
    sparklePositions[i * 3 + 0] = 0;
    sparklePositions[i * 3 + 1] = -50;
    sparklePositions[i * 3 + 2] = 0;
  }
  sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));

  const sparkleMat = new THREE.PointsMaterial({
    color: 0xffd54f,
    size: 0.48,
    map: particleTex,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  sparkleMesh = new THREE.Points(sparkleGeo, sparkleMat);
  vfxGroup.add(sparkleMesh);
}

// Disparar estallido de chispas doradas al limpiar una mesa
export function spawnCleanSparkles3D(x, y, z) {
  if (!sparkleMesh || !sparklePositions) return;
  sparkleActive = true;
  sparkleTime = 0;

  const posAttr = sparkleMesh.geometry.attributes.position;
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const p = sparkleData[i];
    p.x = x;
    p.y = y + 0.95; // Justo sobre el tablero
    p.z = z;
    const angle = (i / SPARKLE_COUNT) * Math.PI * 2;
    const spd = 1.4 + Math.random() * 1.6;
    p.vx = Math.cos(angle) * spd;
    p.vy = 1.2 + Math.random() * 1.4;
    p.vz = Math.sin(angle) * spd;
    p.life = 0;
    p.maxLife = 0.55 + Math.random() * 0.25;

    sparklePositions[i * 3 + 0] = p.x;
    sparklePositions[i * 3 + 1] = p.y;
    sparklePositions[i * 3 + 2] = p.z;
  }
  posAttr.needsUpdate = true;
}

// Activar o intensificar espuma de caña al tirar del grifo
export function triggerBeerPourVFX(active = true) {
  if (foamData) {
    foamData.forEach(p => { p.active = active; });
  }
}

// Control de sonido periódico de gaviota costera
let nextSeagullSoundT = 15;

export function updateVFX3D(dt = 0.016, time = 0) {
  if (!vfxGroup) return;

  const windFactor = (weatherToday && weatherToday() === 'viento') ? 1.8 : 1.0;

  // ---------- A. VUELO Y ALETEO DE GAVIOTAS ----------
  for (let i = 0; i < SEAGULLS.length; i++) {
    const g = SEAGULLS[i];
    g.angle += g.speed * dt * windFactor;

    // Posición circular suave con ondulación vertical
    const gx = g.centerX + Math.cos(g.angle) * g.orbitRadius;
    const gz = g.centerZ + Math.sin(g.angle) * (g.orbitRadius * 0.7);
    const gy = g.altitude + Math.sin(time * 0.8 + i * 2) * 0.75;

    g.group.position.set(gx, gy, gz);

    // Orientación hacia la dirección del vuelo + ladeo (banking)
    const nextAngle = g.angle + 0.05;
    const nx = g.centerX + Math.cos(nextAngle) * g.orbitRadius;
    const nz = g.centerZ + Math.sin(nextAngle) * (g.orbitRadius * 0.7);
    g.group.rotation.y = Math.atan2(nx - gx, nz - gz);
    g.group.rotation.z = -Math.sin(g.angle) * 0.22; // Ladeo en curva

    // Aleteo rítmico: planeo majestuoso intercalado con series de aleteos
    g.glideTimer += dt;
    const isFlapping = (Math.sin(g.glideTimer * 0.8) > 0.15);
    let flap = 0;
    if (isFlapping) {
      flap = Math.sin(time * 7.5 + i) * 0.42;
    } else {
      flap = Math.sin(time * 1.5 + i) * 0.08; // Suave brisa en planeo
    }
    g.wingL.rotation.z = flap;
    g.wingR.rotation.z = -flap;
  }

  // Sonido costero de gaviota periódico con paneo
  nextSeagullSoundT -= dt;
  if (nextSeagullSoundT <= 0) {
    nextSeagullSoundT = 24 + Math.random() * 20;
    if (Audio && Audio.seagullCall) {
      const activeGull = SEAGULLS[Math.floor(Math.random() * SEAGULLS.length)];
      const pan = activeGull ? Math.max(-0.9, Math.min(0.9, activeGull.group.position.x / 20)) : 0;
      Audio.seagullCall(pan);
    }
  }

  // ---------- B. VAPOR Y HUMO EN LA PLANCHA ----------
  if (steamMesh && steamPositions) {
    const posAttr = steamMesh.geometry.attributes.position;
    for (let i = 0; i < STEAM_COUNT; i++) {
      const p = steamData[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        // Reciclar en la superficie de la plancha
        p.life = 0;
        p.x = -0.1 + (Math.random() - 0.5) * 0.8;
        p.y = 1.55;
        p.z = 3.65 + (Math.random() - 0.5) * 0.4;
      } else {
        // Ascenso y suave deriva con el viento
        p.y += p.vy * dt;
        p.x += (p.vx - 0.15 * windFactor) * dt;
        p.z += p.vz * dt;
      }
      steamPositions[i * 3 + 0] = p.x;
      steamPositions[i * 3 + 1] = p.y;
      steamPositions[i * 3 + 2] = p.z;
    }
    posAttr.needsUpdate = true;
  }

  // ---------- C. ESPUMA DE CERVEZA ----------
  if (foamMesh && foamPositions) {
    const posAttr = foamMesh.geometry.attributes.position;
    for (let i = 0; i < FOAM_COUNT; i++) {
      const p = foamData[i];
      if (p.active) {
        p.life += dt * 2.5;
        if (p.life > 1.0) {
          p.life = 0;
          p.x = -3.8 + (Math.random() - 0.5) * 0.18;
          p.y = 1.42;
          p.z = 3.65 + (Math.random() - 0.5) * 0.18;
        } else {
          p.y += p.vy * dt * 0.5;
        }
      } else {
        p.y = -20; // Ocultar fuera de escena si no está activo
      }
      foamPositions[i * 3 + 0] = p.x;
      foamPositions[i * 3 + 1] = p.y;
      foamPositions[i * 3 + 2] = p.z;
    }
    posAttr.needsUpdate = true;
  }

  // ---------- D. ESTALLIDO DE CHISPAS DE LIMPIEZA ----------
  if (sparkleActive && sparkleMesh && sparklePositions) {
    sparkleTime += dt;
    const posAttr = sparkleMesh.geometry.attributes.position;
    let anyAlive = false;

    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const p = sparkleData[i];
      p.life += dt;
      if (p.life < p.maxLife) {
        anyAlive = true;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= 4.2 * dt; // Gravedad
        p.z += p.vz * dt;
        sparklePositions[i * 3 + 0] = p.x;
        sparklePositions[i * 3 + 1] = p.y;
        sparklePositions[i * 3 + 2] = p.z;
      } else {
        sparklePositions[i * 3 + 1] = -50;
      }
    }
    posAttr.needsUpdate = true;

    if (!anyAlive && sparkleTime > 0.8) {
      sparkleActive = false;
    }
  }
}

if (typeof window !== 'undefined') {
  window.spawnCleanSparkles3D = spawnCleanSparkles3D;
  window.triggerBeerPourVFX = triggerBeerPourVFX;
}
