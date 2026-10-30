/* =========================================================
   upgrades-3d.js · Representación Visual 3D de Mejoras del Chiringuito
   Sincroniza en tiempo real las 17 mejoras del juego con modelos 3D:
   Hamacas, sombrillas de playa, altavoz retro, guirnaldas extras,
   nevera industrial, freidora, dispensador de refrescos, heladera,
   gofrera, coctelera, churrera, algodonera y pizarra de Instagram.
   ========================================================= */
import * as THREE from './lib/three.module.js';
import { Game, lvl } from './state.js?v=28.17.2-flat-sand';
import { sampleSandHeight, sampleWalkableHeight, KIOSK_DECK } from './coast-materials.js?v=28.17.2-flat-sand';

let upgradesGroup = null;
const upgradeMeshes = new Map();

// Materiales compartidos para las mejoras
const UMAT = {
  chrome: new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.15, metalness: 0.95 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: 0x33383d, roughness: 0.35, metalness: 0.8 }),
  woodTeak: new THREE.MeshStandardMaterial({ color: 0x7a4d2c, roughness: 0.5, metalness: 0.05 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x3e2312, roughness: 0.65 }),
  teal: new THREE.MeshStandardMaterial({ color: 0x0f8b8d, roughness: 0.35 }),
  coral: new THREE.MeshStandardMaterial({ color: 0xe8603c, roughness: 0.4 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xf5b82e, roughness: 0.25, metalness: 0.8 }),
  pinkCotton: new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.9 }),
  acrylicGlass: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.45 }),
  canvasStripe: new THREE.MeshStandardMaterial({ color: 0xfffdf5, roughness: 0.7, side: THREE.DoubleSide }),
  bulbOn: new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffa000, emissiveIntensity: 1.4, roughness: 0.2 }),
  oilFryer: new THREE.MeshStandardMaterial({ color: 0xe6a119, roughness: 0.1, transparent: true, opacity: 0.85 }),
  gelatoColors: [
    new THREE.MeshStandardMaterial({ color: 0xf06292, roughness: 0.5 }), // Fresa
    new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.5 }), // Mango
    new THREE.MeshStandardMaterial({ color: 0x81c784, roughness: 0.5 }), // Pistacho
    new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.5 })  // Chocolate
  ]
};

export function initUpgrades3D(scene, kiosk) {
  if (!scene) return;
  upgradesGroup = new THREE.Group();
  upgradesGroup.name = 'chiringuito_upgrades_3d';
  scene.add(upgradesGroup);

  buildHamacas(upgradesGroup);
  buildBeachUmbrellas(upgradesGroup);
  buildAltavoz(kiosk);
  buildExtraLights(upgradesGroup);
  buildRedesSign(upgradesGroup);
  buildFryer(kiosk);
  buildSodaFountain(kiosk);
  buildHeladera(kiosk);
  buildGofrera(kiosk);
  buildCoctelera(kiosk);
  buildChurrera(kiosk);
  buildAlgodonera(kiosk);

  syncUpgrades3D();
}

// 1. Hamacas de Playa (Nivel 1: 4 hamacas, Nivel 2: 8 hamacas)
function buildHamacas(parent) {
  const g = new THREE.Group();
  g.name = 'up_hamacas';

  for (let i = 0; i < 8; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const hGroup = new THREE.Group();
    hGroup.name = 'hamaca_' + i;
    const x = 4.8 + col * 1.9, z = -2.6 - row * 1.6;
    hGroup.position.set(x, sampleSandHeight(x, z), z);
    hGroup.rotation.y = -0.15 + (col * 0.05);

    // Armazón de madera plegable
    const legGeo = new THREE.BoxGeometry(0.08, 0.06, 1.4);
    const legL = new THREE.Mesh(legGeo, UMAT.woodTeak);
    legL.position.set(-0.35, 0.18, 0);
    legL.rotation.x = 0.12;
    legL.castShadow = true;
    hGroup.add(legL);

    const legR = new THREE.Mesh(legGeo, UMAT.woodTeak);
    legR.position.set(0.35, 0.18, 0);
    legR.rotation.x = 0.12;
    legR.castShadow = true;
    hGroup.add(legR);

    // Cuatro apoyos reales entre el armazón inclinado y la arena plana.
    for (const fx of [-0.35, 0.35]) for (const fz of [-0.52, 0.52]) {
      const height = 0.18 - Math.sin(0.12) * fz - 0.03 * Math.cos(0.12);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, height, 8), UMAT.woodTeak);
      foot.name = 'hamaca-foot';
      foot.position.set(fx, height / 2, fz);
      foot.castShadow = true;
      hGroup.add(foot);
    }

    // Respaldo inclinado
    const backGeo = new THREE.BoxGeometry(0.72, 0.05, 0.55);
    const back = new THREE.Mesh(backGeo, UMAT.woodTeak);
    back.position.set(0, 0.38, -0.42);
    back.rotation.x = -0.55;
    hGroup.add(back);

    // Lona a rayas veraniegas
    const canvasGeo = new THREE.BoxGeometry(0.66, 0.02, 1.25);
    const canvasMat = (i % 2 === 0) ? UMAT.coral : UMAT.teal;
    const canvas = new THREE.Mesh(canvasGeo, canvasMat);
    canvas.position.set(0, 0.26, 0.02);
    canvas.rotation.x = 0.12;
    hGroup.add(canvas);

    g.add(hGroup);
  }

  parent.add(g);
  upgradeMeshes.set('hamacas', g);
}

// 2. Sombrillas de playa adicionales junto a las hamacas
function buildBeachUmbrellas(parent) {
  const g = new THREE.Group();
  g.name = 'up_sombrillas';

  const pos = [
    [5.7, -3.2], [9.5, -3.2], [7.6, -4.6]
  ];

  pos.forEach(([px, pz], idx) => {
    const umb = new THREE.Group();
    umb.position.set(px, 0, pz);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.5, 8), UMAT.woodTeak);
    pole.position.y = 1.25;
    pole.rotation.z = (idx % 2 === 0 ? 0.08 : -0.08);
    umb.add(pole);

    const top = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.75, 12), idx % 2 === 0 ? UMAT.gold : UMAT.coral);
    top.position.set(pole.rotation.z * 1.2, 2.4, 0);
    top.castShadow = true;
    umb.add(top);

    g.add(umb);
  });

  parent.add(g);
  upgradeMeshes.set('sombrillas', g);
}

// 3. Altavoz retro con música colgado en el poste frontal
function buildAltavoz(kiosk) {
  const g = new THREE.Group();
  g.name = 'up_altavoz';
  g.position.set(-4.5, 3.2, 3.8);

  // Caja acústica de madera
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.4), UMAT.woodDark);
  box.castShadow = true;
  g.add(box);

  // Rejilla de altavoz
  const grill = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.04), UMAT.darkSteel);
  grill.position.z = 0.21;
  g.add(grill);

  // Cono de graves central
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.08, 0.06, 12), UMAT.coral);
  cone.position.set(0, -0.08, 0.23);
  cone.rotation.x = Math.PI / 2;
  g.add(cone);

  // Twister de agudos
  const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.04, 10), UMAT.gold);
  tw.position.set(0, 0.18, 0.23);
  tw.rotation.x = Math.PI / 2;
  g.add(tw);

  kiosk.add(g);
  upgradeMeshes.set('altavoz', g);
}

// 4. Guirnaldas de luces festivas extras sobre la terraza
function buildExtraLights(parent) {
  const g = new THREE.Group();
  g.name = 'up_luces';

  // Tira de bombillas cálidas cruzando de poste a terraza
  for (let i = 0; i < 9; i++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), UMAT.bulbOn);
    const t = i / 8;
    const bx = 3.5 + t * 7.5;
    const bz = 2.5 - Math.sin(t * Math.PI) * 1.5;
    const by = 3.2 - Math.sin(t * Math.PI) * 0.45;
    bulb.position.set(bx, by, bz);
    g.add(bulb);
  }

  parent.add(g);
  upgradeMeshes.set('luces', g);
}

// 5. Pizarra de Redes Sociales (Instagram)
function buildRedesSign(parent) {
  const g = new THREE.Group();
  g.name = 'up_redes';
  // Ubicada en la entrada de arena del chiringuito sin solapar taburetes ni clientes
  g.position.set(-7.0, sampleWalkableHeight(-7.0, 4.4), 4.4);
  g.rotation.y = 0.35;

  // Caballete rústico
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), UMAT.woodTeak);
  postL.position.set(-0.35, 0.7, 0);
  g.add(postL);

  const postR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), UMAT.woodTeak);
  postR.position.set(0.35, 0.7, 0);
  g.add(postR);

  // Pizarra negra
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.95, 0.04), UMAT.darkSteel);
  board.position.set(0, 0.85, 0);
  g.add(board);

  // Cámara / Logo Instagram estilizado en coral y oro
  const cam = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.06), UMAT.coral);
  cam.position.set(0, 1.05, 0.02);
  g.add(cam);

  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.07, 10), UMAT.gold);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 1.05, 0.04);
  g.add(lens);

  parent.add(g);
  upgradeMeshes.set('redes', g);
}

// 6. Freidora profesional (Cocina) al lado de la plancha (sin solapar barra lateral ni plancha)
function buildFryer(kiosk) {
  const g = new THREE.Group();
  g.name = 'up_cocina';
  g.position.set(2.78, 1.45, 2.2);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 0.65), UMAT.chrome);
  body.castShadow = true;
  g.add(body);

  // Cubetas de aceite dorado
  const vat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.52), UMAT.oilFryer);
  vat.position.y = 0.18;
  g.add(vat);

  // Dos cestas de freír metálicas
  [-0.14, 0.14].forEach(bx => {
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.38), UMAT.darkSteel);
    basket.position.set(bx, 0.28, 0);
    g.add(basket);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6), UMAT.coral);
    handle.position.set(bx, 0.38, 0.22);
    handle.rotation.x = 0.5;
    g.add(handle);
  });

  kiosk.add(g);
  upgradeMeshes.set('cocina', g);
}

// 7. Dispensador / Grifo de Refrescos y Agua
function buildSodaFountain(kiosk) {
  const g = new THREE.Group();
  g.name = 'up_refrescos';
  g.position.set(-2.8, 1.45, 2.2);

  // Torre de dispensación
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.35), UMAT.chrome);
  tower.castShadow = true;
  g.add(tower);

  // Tiradores de bebidas de colores
  [-0.2, 0, 0.2].forEach((tx, idx) => {
    const leverMat = [UMAT.coral, UMAT.teal, UMAT.gold][idx];
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), leverMat);
    lever.position.set(tx, 0.22, 0.18);
    lever.rotation.x = -0.3;
    g.add(lever);
  });

  kiosk.add(g);
  upgradeMeshes.set('refrescos', g);
}

// 8. Heladera vitrina de helados en barra
function buildHeladera(kiosk) {
  const g = new THREE.Group();
  g.name = 'up_heladera';
  g.position.set(3.6, 1.45, -0.9);

  // Mostrador blanco
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.95), UMAT.teal);
  base.castShadow = true;
  g.add(base);

  // Cúpula de cristal transparente
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.35, 0.85), UMAT.acrylicGlass);
  glass.position.y = 0.42;
  g.add(glass);

  // Cubetas con helados de colores
  [-0.18, 0.18].forEach((gx, ix) => {
    [-0.2, 0.2].forEach((gz, iz) => {
      const mat = UMAT.gelatoColors[(ix * 2 + iz) % 4];
      const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 10), mat);
      tub.position.set(gx, 0.32, gz);
      g.add(tub);
    });
  });

  kiosk.add(g);
  upgradeMeshes.set('heladera', g);
}

// 9. Gofrera de hierro fundido
function buildGofrera(kiosk) {
  const g = new THREE.Group();
  g.name = 'up_gofrera';
  g.position.set(3.6, 1.45, 0.9);

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.55), UMAT.darkSteel);
  g.add(base);

  // Tapa abierta a 45 grados
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), UMAT.chrome);
  lid.position.set(0, 0.24, -0.15);
  lid.rotation.x = -0.7;
  g.add(lid);

  kiosk.add(g);
  upgradeMeshes.set('gofrera', g);
}

// 10. Coctelera y set tropical
function buildCoctelera(kiosk) {
  const g = new THREE.Group();
  g.name = 'up_coctelera';
  g.position.set(-0.25, 1.45, 2.2);

  // Shaker metálico Boston
  const shaker = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.32, 10), UMAT.chrome);
  shaker.position.y = 0.16;
  g.add(shaker);

  // Cubitera dorada
  const iceBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.22, 10), UMAT.gold);
  iceBucket.position.set(0.24, 0.11, 0);
  g.add(iceBucket);

  kiosk.add(g);
  upgradeMeshes.set('coctelera', g);
}

// 11. Churrera tradicional
function buildChurrera(kiosk) {
  const g = new THREE.Group();
  g.name = 'up_churrera';
  g.position.set(3.6, 1.45, 0.05);

  // Cilindro vertical extrusor
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.48, 10), UMAT.chrome);
  cylinder.position.y = 0.32;
  g.add(cylinder);

  // Rueda de manivela superior
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 14), UMAT.darkSteel);
  wheel.position.set(0, 0.6, 0);
  wheel.rotation.x = Math.PI / 2;
  g.add(wheel);

  kiosk.add(g);
  upgradeMeshes.set('churrera', g);
}

// 12. Algodonera automática vintage rosa
function buildAlgodonera(kiosk) {
  const g = new THREE.Group();
  g.name = 'up_algodonera';
  // El borde exterior de la rueda está 3 cm por debajo del origen del carro.
  g.position.set(-4.0, KIOSK_DECK.height + 0.03, -0.8);
  g.rotation.y = Math.PI / 2;

  // Carrito rosa
  const cart = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.65, 0.7), new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.4 }));
  cart.position.y = 0.55;
  cart.castShadow = true;
  g.add(cart);

  // Ruedas doradas
  [-0.38, 0.38].forEach(wx => {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 16), UMAT.gold);
    wheel.position.set(wx, 0.22, 0);
    wheel.rotation.y = Math.PI / 2;
    g.add(wheel);
  });

  // Tazón circular de algodón
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.22, 14), UMAT.chrome);
  bowl.position.y = 0.98;
  g.add(bowl);

  // Nube de azúcar rosa algodón
  const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), UMAT.pinkCotton);
  cloud.position.y = 1.15;
  g.add(cloud);

  kiosk.add(g);
  upgradeMeshes.set('algodonera', g);
}

/** Sincroniza la visibilidad de cada mejora con el estado Game.upgrades */
export function syncUpgrades3D() {
  if (!Game || !Game.upgrades) return;

  // 1. Hamacas (según niveles: nivel 1 = 4 hamacas, nivel 2 = 8 hamacas)
  const lHamacas = lvl('hamacas');
  const mHamacas = upgradeMeshes.get('hamacas');
  if (mHamacas) {
    mHamacas.visible = (lHamacas > 0);
    if (lHamacas > 0) {
      const count = lHamacas >= 2 ? 8 : 4;
      mHamacas.children.forEach((child, i) => {
        child.visible = (i < count);
      });
    }
  }

  // 2. Sombrillas de playa
  const mSombrillas = upgradeMeshes.get('sombrillas');
  if (mSombrillas) mSombrillas.visible = (lvl('sombrillas') > 0);

  // 3. Altavoz
  const mAltavoz = upgradeMeshes.get('altavoz');
  if (mAltavoz) mAltavoz.visible = (lvl('altavoz') > 0);

  // 4. Luces festivas extras
  const mLuces = upgradeMeshes.get('luces');
  if (mLuces) mLuces.visible = (lvl('luces') > 0);

  // 5. Redes sociales
  const mRedes = upgradeMeshes.get('redes');
  if (mRedes) mRedes.visible = (lvl('redes') > 0);

  // 6. Cocina / Freidora
  const mCocina = upgradeMeshes.get('cocina');
  if (mCocina) mCocina.visible = (lvl('cocina') > 0);

  // 7. Barra de refrescos
  const mRefrescos = upgradeMeshes.get('refrescos');
  if (mRefrescos) mRefrescos.visible = (lvl('refrescos') > 0);

  // 8. Heladera
  const mHeladera = upgradeMeshes.get('heladera');
  if (mHeladera) mHeladera.visible = (lvl('heladera') > 0);

  // 9. Gofrera
  const mGofrera = upgradeMeshes.get('gofrera');
  if (mGofrera) mGofrera.visible = (lvl('gofrera') > 0);

  // 10. Coctelera
  const mCoctelera = upgradeMeshes.get('coctelera');
  if (mCoctelera) mCoctelera.visible = (lvl('coctelera') > 0);

  // 11. Churrera
  const mChurrera = upgradeMeshes.get('churrera');
  if (mChurrera) mChurrera.visible = (lvl('churrera') > 0);

  // 12. Algodonera
  const mAlgodonera = upgradeMeshes.get('algodonera');
  if (mAlgodonera) mAlgodonera.visible = (lvl('algodonera') > 0);
}
