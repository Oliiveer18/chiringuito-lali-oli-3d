/* =========================================================
   assets-3d.js · Carga de modelos GLB (activos generados con Tripo)
   Carga asíncrona con respaldo: si un GLB falla o no existe,
   la escena conserva su geometría procedural sin romperse.
   ========================================================= */
import * as THREE from './lib/three.module.js';
import { GLTFLoader } from './lib/GLTFLoader.js';

const gltfLoader = new GLTFLoader();
const loadCache = new Map();

/**
 * Carga un GLB una sola vez (cacheado por URL).
 * Devuelve una promesa que resuelve al THREE.Group del modelo
 * (con sombras activadas) o a null si la carga falla.
 */
export function loadGLB(url) {
  if (!loadCache.has(url)) {
    const p = gltfLoader.loadAsync(url)
      .then((gltf) => {
        const model = gltf.scene;
        model.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            if (obj.material && 'envMapIntensity' in obj.material) {
              obj.material.envMapIntensity = 0.9;
            }
          }
        });
        return model;
      })
      .catch((err) => {
        console.warn('[assets-3d] Modelo no disponible, se usa el respaldo procedural:', url, err && err.message);
        return null;
      });
    loadCache.set(url, p);
  }
  return loadCache.get(url);
}

/**
 * Ajusta un modelo GLB dentro de una caja objetivo (ancho, alto, fondo)
 * manteniendo su proporción original: centrado en X/Z y apoyado en y=0
 * (la base del modelo queda en el origen del grupo devuelto).
 */
export function fitModelToBox(model, targetW, targetH, targetD) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const safe = (v) => (Number.isFinite(v) && v > 1e-6 ? v : 1e-6);
  const scale = Math.min(
    targetW / safe(size.x),
    targetH / safe(size.y),
    targetD / safe(size.z)
  );
  const wrapper = new THREE.Group();
  model.position.set(-center.x, -box.min.y, -center.z);
  wrapper.add(model);
  wrapper.scale.setScalar(scale);
  return wrapper;
}
