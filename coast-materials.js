/* coast-materials.js · Agua y arena estilizadas (GPU) · KLO-49 + mejora olas */
import * as THREE from './lib/three.module.js';
import { SHORE_WORLD_Z, coastPalette } from './coast-palette.js?v=28.17.1-online-web';

export { SHORE_WORLD_Z };

export function getCoastGeometryProfile() {
  const coarse =
    typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) ||
      ((navigator.maxTouchPoints || 0) > 1 && typeof window !== 'undefined' && window.innerWidth < 920));
  return {
    coarse,
    sandSegments: coarse ? [24, 16] : [48, 32],
    waterSegments: coarse ? [26, 13] : [52, 26],
    pixelRatioCap: coarse ? 1.5 : 2
  };
}

const WATER_VERT = /* glsl */ `
uniform float uTime;
uniform float uWind;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec2 vUv;

// Gerstner-like simple (2 capas)
vec3 gerstner(vec2 pos, float t, float w) {
  float a1 = 0.18 * w;
  float f1 = 0.32;
  float s1 = 1.6 * w;
  vec2 d1 = normalize(vec2(0.85, 0.35));
  float phase1 = dot(pos, d1) * f1 + t * s1;
  float h1 = a1 * sin(phase1);

  float a2 = 0.11 * w;
  float f2 = 0.55;
  float s2 = 2.1 * w;
  vec2 d2 = normalize(vec2(-0.4, 0.9));
  float phase2 = dot(pos, d2) * f2 + t * s2;
  float h2 = a2 * sin(phase2);

  float a3 = 0.06 * w;
  float f3 = 0.18;
  float s3 = 1.15 * w;
  vec2 d3 = normalize(vec2(0.2, -0.7));
  float phase3 = dot(pos, d3) * f3 + t * s3;
  float h3 = a3 * sin(phase3);

  return vec3(0.0, h1 + h2 + h3, 0.0);
}

void main() {
  vUv = uv;
  vec3 pos = position;
  float t = uTime;
  float w = uWind;

  vec3 disp = gerstner(pos.xz, t, w);
  pos += disp;

  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vWorldPos = wp.xyz;

  // Normal aproximada por derivadas
  float eps = 0.15;
  float hL = gerstner(pos.xz - vec2(eps, 0.0), t, w).y;
  float hR = gerstner(pos.xz + vec2(eps, 0.0), t, w).y;
  float hD = gerstner(pos.xz - vec2(0.0, eps), t, w).y;
  float hU = gerstner(pos.xz + vec2(0.0, eps), t, w).y;
  vec3 n = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
  vNormalW = normalize(mat3(modelMatrix) * n);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const WATER_FRAG = /* glsl */ `
uniform float uTime;
uniform float uWind;
uniform float uNightness;
uniform float uSunSpec;
uniform float uShoreZ;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uSunDir;

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 n = normalize(vNormalW);

  // Pequeña perturbación de normal para micro-detalle
  float nDetail = noise(vWorldPos.xz * 0.42 + uTime * 0.18 * uWind) - 0.5;
  n = normalize(n + vec3(nDetail * 0.06, 0.0, nDetail * 0.04));

  float depthT = smoothstep(-38.0, -4.0, vWorldPos.z);
  vec3 waterCol = mix(uDeep, uShallow, depthT);

  // Fresnel más suave
  float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.4);
  vec3 skyTint = mix(vec3(0.62, 0.85, 0.95), vec3(0.35, 0.55, 0.75), uNightness);
  waterCol = mix(waterCol, skyTint, fresnel * 0.42);

  // Espuma de orilla más orgánica
  float shoreDist = abs(vWorldPos.z - uShoreZ);
  float foamBase = 1.0 - smoothstep(0.4, 3.6, shoreDist);
  float foamNoise = noise(vec2(vWorldPos.x * 0.11 + uTime * 0.75 * uWind, vWorldPos.z * 0.25 + uTime * 0.45));
  float foamPulse = 0.7 + 0.3 * sin(uTime * 1.4 * uWind + vWorldPos.x * 0.18);
  float foam = foamBase * (0.45 + 0.55 * foamNoise) * foamPulse * (1.0 - uNightness * 0.4);
  foam = smoothstep(0.25, 0.75, foam);

  // Specular solar
  if (uSunSpec > 0.01) {
    vec3 halfV = normalize(viewDir + uSunDir);
    float spec = pow(max(dot(n, halfV), 0.0), 64.0) * uSunSpec;
    waterCol += vec3(1.0, 0.82, 0.5) * spec * 1.1;

    // Brillo alargado suave
    float streak = exp(-abs(vWorldPos.x) * 0.035) * uSunSpec * 0.22;
    waterCol += vec3(1.0, 0.85, 0.6) * streak * smoothstep(-12.0, -1.5, vWorldPos.z);
  }

  waterCol = mix(waterCol, vec3(0.98, 0.99, 1.0), foam * 0.92);
  float alpha = 0.78 + fresnel * 0.16;
  gl_FragColor = vec4(waterCol, alpha);
}
`;

export function createWaterMaterial() {
  const shallow = new THREE.Color(0x2ec2c4);
  const deep = new THREE.Color(0x1f8fb0);
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: 1 },
      uNightness: { value: 0 },
      uSunSpec: { value: 0 },
      uShoreZ: { value: SHORE_WORLD_Z },
      uShallow: { value: shallow },
      uDeep: { value: deep },
      uSunDir: { value: new THREE.Vector3(0.4, 0.65, 0.55).normalize() }
    },
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    transparent: true,
    depthWrite: true
  });
}

export function createSandMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xedd8a6,
    roughness: 0.92,
    metalness: 0.02
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uShoreDistScale = { value: 1 };
    shader.uniforms.uSandDry = { value: new THREE.Color(0xedd8a6) };
    shader.uniforms.uSandWet = { value: new THREE.Color(0x0f8b8d) };
    shader.uniforms.uNightness = { value: 0 };

    shader.vertexShader = `\nattribute float shoreDist;\nvarying float vShoreDist;\nvarying vec2 vSandXZ;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\nvShoreDist = shoreDist;\nvSandXZ = (modelMatrix * vec4(transformed, 1.0)).xz;`
    );

    shader.fragmentShader = `\nuniform float uTime;\nuniform float uShoreDistScale;\nuniform vec3 uSandDry;\nuniform vec3 uSandWet;\nuniform float uNightness;\nvarying float vShoreDist;\nvarying vec2 vSandXZ;\n\nfloat sandHash(vec2 p) {\n  return fract(sin(dot(p, vec2(41.7, 289.1))) * 45758.5453);\n}\n\n${shader.fragmentShader}`.replace(
      '#include <color_fragment>',
      `#include <color_fragment>\nfloat wet = 1.0 - smoothstep(-7.0, 2.5, vShoreDist);\nwet *= 1.0 - uNightness * 0.25;\nvec3 grain = vec3(sandHash(vSandXZ * 120.0) * 0.04 - 0.02);\nvec3 dryCol = uSandDry + grain;\nvec3 wetCol = uSandWet + grain * 0.5;\nfloat caust = wet * (0.08 + 0.06 * sin(vSandXZ.x * 6.0 + uTime * 1.3) * sin(vSandXZ.y * 5.0 - uTime * 1.1));\nwetCol += vec3(0.15, 0.35, 0.32) * caust;\ndiffuseColor.rgb = mix(dryCol, wetCol, wet);`
    );

    mat.userData.coastUniforms = {
      uTime: shader.uniforms.uTime,
      uNightness: shader.uniforms.uNightness,
      uSandDry: shader.uniforms.uSandDry,
      uSandWet: shader.uniforms.uSandWet
    };
  };

  mat.customProgramCacheKey = () => 'coastSand_v1';
  return mat;
}

/** Misma fórmula que buildCoastMeshes (coords locales del plano de arena, mesh en y=-0.2). */
export const SAND_MESH_WORLD_Y = -0.2;
export const CHARACTER_FOOT_OFFSET = 0.035;
const KIOSK_ORIGIN = { x: -2, z: 1.5 };
const KIOSK_DECK_HALF = { x: 7.35, z: 5.05 };
const KIOSK_DECK_FOOT_Y = 0.35;

export function sampleSandDisplacement(localX, localZ) {
  let y = (localZ + 10) * 0.045;
  y += Math.sin(localX * 0.12) * Math.cos(localZ * 0.1) * 0.35;
  return y;
}

export function sampleSandHeight(worldX, worldZ) {
  return SAND_MESH_WORLD_Y + sampleSandDisplacement(worldX, worldZ);
}

/** Altura de pies: dunas en playa o tarima del quiosco (la que sea mayor en el deck). */
export function sampleCharacterFootY(worldX, worldZ, footOffset = CHARACTER_FOOT_OFFSET) {
  const lx = worldX - KIOSK_ORIGIN.x;
  const lz = worldZ - KIOSK_ORIGIN.z;
  const onDeck =
    Math.abs(lx) <= KIOSK_DECK_HALF.x &&
    Math.abs(lz) <= KIOSK_DECK_HALF.z &&
    lz > -2.85;
  const sandY = sampleSandHeight(worldX, worldZ);
  const base = onDeck ? Math.max(sandY, KIOSK_DECK_FOOT_Y) : sandY;
  return base + footOffset;
}

/** Escribe atributo shoreDist (worldZ - SHORE_WORLD_Z) tras desplazar arena */
export function applySandShoreAttribute(sandGeo, meshWorldZ = 0) {
  const pos = sandGeo.attributes.position;
  const shoreDist = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const worldZ = meshWorldZ + pos.getZ(i);
    shoreDist[i] = worldZ - SHORE_WORLD_Z;
  }
  sandGeo.setAttribute('shoreDist', new THREE.BufferAttribute(shoreDist, 1));
}

export function buildCoastMeshes(scene, profile = getCoastGeometryProfile()) {
  const [sw, sh] = profile.sandSegments;
  const [ww, wh] = profile.waterSegments;

  const sandGeo = new THREE.PlaneGeometry(80, 50, sw, sh);
  sandGeo.rotateX(-Math.PI / 2);
  const pos = sandGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, sampleSandDisplacement(x, z));
  }
  sandGeo.computeVertexNormals();
  applySandShoreAttribute(sandGeo, 0);

  const sandMat = createSandMaterial();
  const sandMesh = new THREE.Mesh(sandGeo, sandMat);
  sandMesh.receiveShadow = true;
  sandMesh.position.set(0, -0.2, 0);
  scene.add(sandMesh);

  const waterGeo = new THREE.PlaneGeometry(80, 36, ww, wh);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = createWaterMaterial();
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(0, -0.05, -16);
  waterMesh.receiveShadow = false;
  scene.add(waterMesh);

  return { sandMesh, waterMesh, sandMat, waterMat, profile };
}

export function updateCoastMaterials(waterMat, sandMat, { time, h, windFactor, sunLight }) {
  if (!waterMat || !sandMat) return;
  const nt = Math.max(0, Math.min(0.75, (h - 19.8) / 2));
  const pal = coastPalette(h, nt, windFactor);

  waterMat.uniforms.uTime.value = time;
  waterMat.uniforms.uWind.value = pal.wind;
  waterMat.uniforms.uNightness.value = nt;
  waterMat.uniforms.uSunSpec.value = pal.sunSpec;
  waterMat.uniforms.uShallow.value.setRGB(pal.shallow.r, pal.shallow.g, pal.shallow.b);
  waterMat.uniforms.uDeep.value.setRGB(pal.deep.r, pal.deep.g, pal.deep.b);

  if (sunLight) {
    const sd = sunLight.position.clone().normalize();
    waterMat.uniforms.uSunDir.value.copy(sd);
  }

  const su = sandMat.userData.coastUniforms;
  if (su) {
    su.uTime.value = time;
    su.uNightness.value = nt;
    su.uSandDry.value.setRGB(pal.sandDry.r, pal.sandDry.g, pal.sandDry.b);
    su.uSandWet.value.setRGB(pal.sandWet.r, pal.sandWet.g, pal.sandWet.b);
  }
}
