/* =========================================================
   stations-3d.js · Estaciones Interactivas & Sistema de Bandeja 3D AAA
   Fase 3: Mecánicas de servicio activo, minijuego de tirador de cañas
   (Perfect Pour), plancha de cocción al punto, cafetera espresso,
   transporte físico en bandeja 3D y entrega directa a clientes.
   ========================================================= */
import * as THREE from './lib/three.module.js';
import { Game, Net } from './state.js?v=28.17.1-online-web';
import { Audio } from './audio.js?v=28.17.1-online-web';
import { ITEMS, ITEM_IDS } from './config.js?v=28.17.1-online-web';
import { triggerCustomerHappyEmote } from './render-3d-customers.js?v=28.17.1-online-web';
import { service3D, trayUnits, addDirtyUnit, preparedMatch } from './service-3d-model.mjs';
import { requestService3DCommand } from './service-3d.js';
import { updateStockbar } from './ui-service.js?v=28.17.1-online-web';

// ---------- Paleta de Materiales PBR para Productos y Vajilla ----------
const ITEM_MAT = {
  glass: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.6 }),
  beerLiquid: new THREE.MeshStandardMaterial({ color: 0xf2b01e, roughness: 0.2, metalness: 0.1 }),
  beerFoam: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0 }),
  condensedMilk: new THREE.MeshStandardMaterial({ color: 0xfff8ea, roughness: 0.5 }),
  licor43: new THREE.MeshStandardMaterial({ color: 0xf5b82e, roughness: 0.2, transparent: true, opacity: 0.85 }),
  espresso: new THREE.MeshStandardMaterial({ color: 0x361b0c, roughness: 0.4 }),
  milkFoam: new THREE.MeshStandardMaterial({ color: 0xfffdf7, roughness: 0.85 }),
  smoothieYellow: new THREE.MeshStandardMaterial({ color: 0xf6e27a, roughness: 0.35 }),
  strawRed: new THREE.MeshStandardMaterial({ color: 0xd6342a, roughness: 0.4 }),
  clayBowl: new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.7 }),
  potato: new THREE.MeshStandardMaterial({ color: 0xc9a266, roughness: 0.85 }),
  mojoRed: new THREE.MeshStandardMaterial({ color: 0xb8321f, roughness: 0.3 }),
  mojoGreen: new THREE.MeshStandardMaterial({ color: 0x5f8a2b, roughness: 0.3 }),
  cheeseBoard: new THREE.MeshStandardMaterial({ color: 0xa2692f, roughness: 0.65 }),
  grilledCheese: new THREE.MeshStandardMaterial({ color: 0xf6e7b8, roughness: 0.5 }),
  grillMark: new THREE.MeshBasicMaterial({ color: 0x5a2d0c }),
  whitePlate: new THREE.MeshStandardMaterial({ color: 0xfbfbf8, roughness: 0.2 }),
  fishSeared: new THREE.MeshStandardMaterial({ color: 0xd9633f, roughness: 0.5 }),
  lemon: new THREE.MeshStandardMaterial({ color: 0xf4e23a, roughness: 0.3 }),
  canSoda: new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.25, metalness: 0.75 }),
  bottleGlass: new THREE.MeshStandardMaterial({ color: 0x64b5f6, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.7 }),
  trayWood: new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.6, metalness: 0.05 }),
  trayBrass: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 }),
  dirtyDish: new THREE.MeshStandardMaterial({ color: 0xdcd6cd, roughness: 0.4 })
};

// ---------- Constructor 3D de Productos y Comida Canaria ----------
export function createItem3D(itemId) {
  const itemGroup = new THREE.Group();
  itemGroup.name = 'item_' + itemId;

  switch (itemId) {
    case 'cerveza': {
      // Jarra de cerveza canaria con espuma rebosante
      const glassGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.32, 12);
      const glass = new THREE.Mesh(glassGeo, ITEM_MAT.glass);
      itemGroup.add(glass);

      const liquidGeo = new THREE.CylinderGeometry(0.095, 0.08, 0.26, 12);
      const liquid = new THREE.Mesh(liquidGeo, ITEM_MAT.beerLiquid);
      liquid.position.y = -0.01;
      itemGroup.add(liquid);

      // Corona de espuma esponjosa
      const foamGeo = new THREE.SphereGeometry(0.12, 10, 8);
      foamGeo.scale(1.0, 0.45, 1.0);
      const foam = new THREE.Mesh(foamGeo, ITEM_MAT.beerFoam);
      foam.position.y = 0.16;
      itemGroup.add(foam);

      // Asa de la jarra
      const handleGeo = new THREE.TorusGeometry(0.09, 0.02, 6, 10, Math.PI);
      const handle = new THREE.Mesh(handleGeo, ITEM_MAT.glass);
      handle.rotation.z = Math.PI / 2;
      handle.position.set(0.12, 0.0, 0);
      itemGroup.add(handle);
      break;
    }

    case 'barraquito': {
      // Vaso de cristal con 4 capas visibles (leche condensada, licor 43, espresso, espuma)
      const cupGeo = new THREE.CylinderGeometry(0.09, 0.075, 0.30, 12);
      const cup = new THREE.Mesh(cupGeo, ITEM_MAT.glass);
      itemGroup.add(cup);

      // 1. Leche condensada (fondo blanco)
      const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.07, 0.06, 10), ITEM_MAT.condensedMilk);
      c1.position.y = -0.10;
      itemGroup.add(c1);

      // 2. Licor 43 (dorado traslúcido)
      const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.081, 0.076, 0.06, 10), ITEM_MAT.licor43);
      c2.position.y = -0.04;
      itemGroup.add(c2);

      // 3. Café espresso (marrón oscuro tostado)
      const c3 = new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.081, 0.07, 10), ITEM_MAT.espresso);
      c3.position.y = 0.025;
      itemGroup.add(c3);

      // 4. Espuma de leche con canela
      const c4 = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.086, 0.07, 10), ITEM_MAT.milkFoam);
      c4.position.y = 0.095;
      itemGroup.add(c4);

      // Rodaja de limón decorativa en el borde
      const lemonGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.015, 8);
      lemonGeo.rotateZ(Math.PI / 3);
      const lemonMesh = new THREE.Mesh(lemonGeo, ITEM_MAT.lemon);
      lemonMesh.position.set(0.08, 0.14, 0);
      itemGroup.add(lemonMesh);
      break;
    }

    case 'batido': {
      // Vaso alto cónico de batido de plátano con pajita roja
      const glassGeo = new THREE.CylinderGeometry(0.10, 0.06, 0.36, 12);
      const glass = new THREE.Mesh(glassGeo, ITEM_MAT.glass);
      itemGroup.add(glass);

      const smoothGeo = new THREE.CylinderGeometry(0.09, 0.055, 0.32, 10);
      const smooth = new THREE.Mesh(smoothGeo, ITEM_MAT.smoothieYellow);
      smooth.position.y = -0.01;
      itemGroup.add(smooth);

      // Pajita roja inclinada
      const strawGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.38, 6);
      strawGeo.rotateZ(0.24);
      const straw = new THREE.Mesh(strawGeo, ITEM_MAT.strawRed);
      straw.position.set(0.02, 0.12, 0);
      itemGroup.add(straw);
      break;
    }

    case 'papas': {
      // Cazuela de barro canaria con papas arrugadas y mojos
      const bowlGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.08, 12);
      const bowl = new THREE.Mesh(bowlGeo, ITEM_MAT.clayBowl);
      itemGroup.add(bowl);

      // Papas arrugadas individuales
      [[-0.06, 0.04, -0.04], [0.06, 0.04, -0.02], [0, 0.06, 0.05], [-0.02, 0.07, 0]].forEach(([px, py, pz]) => {
        const potatoGeo = new THREE.SphereGeometry(0.045, 8, 6);
        potatoGeo.scale(1.1, 0.85, 1.0);
        const pot = new THREE.Mesh(potatoGeo, ITEM_MAT.potato);
        pot.position.set(px, py, pz);
        itemGroup.add(pot);
      });

      // Bol rojo (mojo picón) y bol verde (mojo cilantro)
      const mojoR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), ITEM_MAT.mojoRed);
      mojoR.position.set(0.10, 0.04, 0.08);
      itemGroup.add(mojoR);

      const mojoG = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), ITEM_MAT.mojoGreen);
      mojoG.position.set(-0.10, 0.04, 0.08);
      itemGroup.add(mojoG);
      break;
    }

    case 'queso': {
      // Tabla de madera con lonchas de queso asado
      const boardGeo = new THREE.BoxGeometry(0.28, 0.025, 0.22);
      const board = new THREE.Mesh(boardGeo, ITEM_MAT.cheeseBoard);
      itemGroup.add(board);

      // Lonchas de queso asado
      [-0.05, 0.05].forEach((x, i) => {
        const cheeseGeo = new THREE.BoxGeometry(0.09, 0.03, 0.14);
        const cheese = new THREE.Mesh(cheeseGeo, ITEM_MAT.grilledCheese);
        cheese.position.set(x, 0.03, 0);
        itemGroup.add(cheese);

        // Rayas de parrilla
        const markGeo = new THREE.BoxGeometry(0.085, 0.005, 0.015);
        for (let m = -0.04; m <= 0.04; m += 0.03) {
          const mark = new THREE.Mesh(markGeo, ITEM_MAT.grillMark);
          mark.position.set(x, 0.048, m);
          itemGroup.add(mark);
        }
      });
      break;
    }

    case 'pescado': {
      // Fuente blanca alargada con pescado a la plancha
      const plateGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.03, 14);
      plateGeo.scale(1.4, 1.0, 0.85);
      const plate = new THREE.Mesh(plateGeo, ITEM_MAT.whitePlate);
      itemGroup.add(plate);

      // Filete de pescado dorado
      const fishGeo = new THREE.BoxGeometry(0.26, 0.04, 0.12);
      const fish = new THREE.Mesh(fishGeo, ITEM_MAT.fishSeared);
      fish.position.set(-0.02, 0.03, 0);
      itemGroup.add(fish);

      // Cuña de limón
      const lemGeo = new THREE.ConeGeometry(0.04, 0.08, 6);
      lemGeo.rotateZ(Math.PI / 2);
      const lem = new THREE.Mesh(lemGeo, ITEM_MAT.lemon);
      lem.position.set(0.14, 0.04, 0);
      itemGroup.add(lem);
      break;
    }

    case 'agua':
    case 'refresco': {
      // Botella o lata metálica
      const canGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.22, 10);
      const can = new THREE.Mesh(canGeo, itemId === 'agua' ? ITEM_MAT.bottleGlass : ITEM_MAT.canSoda);
      itemGroup.add(can);

      const capGeo = new THREE.CylinderGeometry(0.065, 0.07, 0.02, 8);
      const cap = new THREE.Mesh(capGeo, ITEM_MAT.whitePlate);
      cap.position.y = 0.12;
      itemGroup.add(cap);
      break;
    }

    case 'dirty':
    default: {
      // Pila de platos sucios para recoger mesas
      for (let p = 0; p < 3; p++) {
        const dishGeo = new THREE.CylinderGeometry(0.16 - p * 0.015, 0.14 - p * 0.015, 0.025, 10);
        const dish = new THREE.Mesh(dishGeo, ITEM_MAT.dirtyDish);
        dish.position.y = p * 0.03;
        dish.rotation.y = p * 0.35;
        itemGroup.add(dish);
      }
      break;
    }
  }

  // Micro-escala para que encaje perfectamente en la bandeja y las mesas
  itemGroup.scale.set(1.0, 1.0, 1.0);
  itemGroup.userData = { itemId, createdAt: performance.now() };
  return itemGroup;
}

// ---------- Bandeja Física 3D (Carry System) ----------
export function createTray3D() {
  const trayGroup = new THREE.Group();
  trayGroup.name = 'carry_tray';

  // 1. Tablero principal de la bandeja
  const boardGeo = new THREE.BoxGeometry(0.64, 0.025, 0.44);
  const board = new THREE.Mesh(boardGeo, ITEM_MAT.trayWood);
  board.castShadow = true;
  board.receiveShadow = true;
  trayGroup.add(board);

  // 2. Reborde perimetral para que no se caiga nada
  const rimMat = ITEM_MAT.trayWood;
  // Borde frontal y trasero
  [-0.21, 0.21].forEach(z => {
    const rGeo = new THREE.BoxGeometry(0.64, 0.04, 0.02);
    const r = new THREE.Mesh(rGeo, rimMat);
    r.position.set(0, 0.02, z);
    trayGroup.add(r);
  });
  // Borde izquierdo y derecho
  [-0.31, 0.31].forEach(x => {
    const rGeo = new THREE.BoxGeometry(0.02, 0.04, 0.44);
    const r = new THREE.Mesh(rGeo, rimMat);
    r.position.set(x, 0.02, 0);
    trayGroup.add(r);
  });

  // 3. Asas de latón en los extremos
  [-0.34, 0.34].forEach(x => {
    const handleGeo = new THREE.TorusGeometry(0.04, 0.012, 6, 10, Math.PI);
    handleGeo.rotateZ(x > 0 ? -Math.PI / 2 : Math.PI / 2);
    const handle = new THREE.Mesh(handleGeo, ITEM_MAT.trayBrass);
    handle.position.set(x, 0.015, 0);
    trayGroup.add(handle);
  });

  // 4. Posiciones de las 4 ranuras de la bandeja
  const slotAnchors = [
    new THREE.Vector3(-0.16, 0.02, -0.10),
    new THREE.Vector3( 0.16, 0.02, -0.10),
    new THREE.Vector3(-0.16, 0.02,  0.10),
    new THREE.Vector3( 0.16, 0.02,  0.10)
  ];

  trayGroup.userData = {
    anchors: slotAnchors,
    items: [],       // Lista de itemIds
    itemMeshes: [],  // Lista de THREE.Groups
    capacity: 4
  };

  return trayGroup;
}

// ---------- Gestor Global de Bandejas ----------
export const TRAY_MANAGER = {
  p1: { trayGroup: null, items: [] },
  p2: { trayGroup: null, items: [] }
};

export function attachTrayToCharacter(charMesh, who = 'p1') {
  if (!charMesh || !charMesh.userData || !charMesh.userData.bodyRoot) return null;
  const bodyRoot = charMesh.userData.bodyRoot;

  // Si ya tiene bandeja, no duplicar
  let tray = bodyRoot.getObjectByName('carry_tray');
  if (!tray) {
    tray = createTray3D();
    tray.position.set(0, 0.28, 0.42);
    bodyRoot.add(tray);
  }

  TRAY_MANAGER[who].trayGroup = tray;
  tray.visible = false; // Solo visible si lleva algo
  return tray;
}

function syncTrayVisual(who) {
  const data = TRAY_MANAGER[who], units = trayUnits(Game, who);
  if (!data?.trayGroup) return;
  const tray = data.trayGroup, ud = tray.userData;
  const key = units.map(unit => unit.uid + ':' + unit.id).join(',');
  if (ud.unitsKey !== key) {
    for (const mesh of ud.itemMeshes) {
      tray.remove(mesh);
      mesh.traverse(child => child.geometry?.dispose());
    }
    ud.itemMeshes = units.map((unit, i) => {
      const mesh = createItem3D(unit.id);
      mesh.position.copy(ud.anchors[i]);
      mesh.scale.setScalar(.1);
      tray.add(mesh);
      return mesh;
    });
    ud.unitsKey = key;
  }
  ud.items = units.map(unit => unit.id);
  data.items = [...ud.items];
  tray.visible = units.length > 0;
}

// Food must originate in a stock-backed station, never a visual tray operation.
export function trayAddItem(who = 'p1', itemId = 'dirty') {
  if (Net.role === 'guest' || itemId !== 'dirty') return false;
  const result = addDirtyUnit(Game, who);
  syncTrayVisual(who);
  return result;
}

export function trayRemoveItem(who = 'p1', itemId = null) {
  if (Net.role === 'guest') return null;
  const units = trayUnits(Game, who);
  const index = itemId ? units.findIndex(unit => unit.id === itemId) : units.length - 1;
  if (index < 0) return null;
  const unit = units.splice(index, 1)[0];
  syncTrayVisual(who);
  return unit.id;
}

export function trayGetItems(who = 'p1') {
  return trayUnits(Game, who).map(unit => unit.id);
}

export function trayClear(who = 'p1') {
  if (Net.role === 'guest' || !service3D(Game).trays[who]) return;
  service3D(Game).trays[who] = [];
  syncTrayVisual(who);
}

// Actualiza animación de los items en la bandeja (rebote y escala inicial POP)
export function updateTrayAnimation(who = 'p1', dt = 0.016) {
  syncTrayVisual(who);
  const tData = TRAY_MANAGER[who];
  if (!tData || !tData.trayGroup || !tData.trayGroup.visible) return;

  const ud = tData.trayGroup.userData;
  ud.itemMeshes.forEach(mesh => {
    if (mesh.scale.x < 1.0) {
      mesh.scale.x = Math.min(1.0, mesh.scale.x + dt * 5.0);
      mesh.scale.y = Math.min(1.0, mesh.scale.y + dt * 5.0);
      mesh.scale.z = Math.min(1.0, mesh.scale.z + dt * 5.0);
    }
  });
}

// ---------- ESTACIONES INTERACTIVAS & MINIJUEGOS 3D ----------

export const STATIONS_LOGIC = Object.fromEntries(
  ['beer', 'grill', 'coffee', 'cooler'].map(id => [id, null])
);
for (const id of Object.keys(STATIONS_LOGIC)) {
  Object.defineProperty(STATIONS_LOGIC, id, { enumerable: true, get: () => service3D(Game).stations[id] });
}

// UI Elements de Minijuegos
let pourGaugeEl = null;
let pourGaugeValEl = null;

export function initStationUI() {
  if (typeof document === 'undefined') return;

  // Inyectar el HUD circular de minijuegos si no existe
  if (!document.getElementById('minigame-hud')) {
    const wrap = document.createElement('div');
    wrap.id = 'minigame-hud';
    wrap.className = 'minigame-hud hidden';
    wrap.innerHTML = `
      <div class="mg-card" id="mg-card">
        <div class="mg-gauge-wrap">
          <svg class="mg-gauge-svg" viewBox="0 0 100 100">
            <circle class="mg-bg" cx="50" cy="50" r="42" />
            <circle class="mg-sweet" cx="50" cy="50" r="42" />
            <circle class="mg-fill" id="mg-fill" cx="50" cy="50" r="42" />
          </svg>
          <div class="mg-center">
            <span class="mg-ico" id="mg-ico">🍺</span>
            <span class="mg-val" id="mg-val">0%</span>
          </div>
        </div>
        <p class="mg-tip" id="mg-tip">¡Mantén pulsado para tirar!</p>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  pourGaugeEl = document.getElementById('minigame-hud');
  pourGaugeValEl = document.getElementById('mg-val');
}

// Iniciar tirado de caña
export function startBeerPour(who = 'p1') {
  return stationCommand({ type: 'beer' }, who);
}

// Presentation only. Timed preparation advances exclusively in sim/day.js.
export function syncStationUI() {
  const b = STATIONS_LOGIC.beer;
  const visible = Game.mode === 'service' && b.state === 'pouring' && b.owner === Net.me;
  pourGaugeEl?.classList.toggle('hidden', !visible);
  if (typeof window !== 'undefined') window.triggerBeerPourVFX?.(Game.mode === 'service' && b.state === 'pouring');
  if (!visible) return;
  if (pourGaugeValEl) pourGaugeValEl.textContent = Math.min(100, Math.round(b.progress * 100)) + '%';
  const ico = document.getElementById('mg-ico'), tip = document.getElementById('mg-tip');
  if (ico) ico.textContent = '🍺';
  if (tip) tip.textContent = 'Suelta en la zona dorada. La propina se cobra al entregar.';
  const fill = document.getElementById('mg-fill');
  if (!fill) return;
  const circ = 2 * Math.PI * 42;
  fill.style.strokeDasharray = String(circ);
  fill.style.strokeDashoffset = String(circ * (1 - Math.min(1, b.progress)));
  fill.style.stroke = b.progress >= b.sweetSpotMin && b.progress <= b.sweetSpotMax ? '#f5b82e'
    : b.progress > b.sweetSpotMax ? '#e8603c' : '#0f8b8d';
}

export function releaseBeerPour(who = 'p1') {
  const result = stationCommand({ type: 'releaseBeer' }, who, false);
  if (!result && Net.role !== 'guest' && STATIONS_LOGIC.beer.owner === who) cancelBeerPour(who);
  if(result && Net.role!=='guest'){
    const unit=trayUnits(Game,who).at(-1);
    Game.floaters.push({x:260,y:480,text:unit?.quality==='perfect'?'Caña perfecta · propina al entregar':'Caña lista en bandeja',t:0,color:'#ffd36b'});
  }
  return result;
}

export function cancelBeerPour(who = Net.me || 'p1') {
  return stationCommand({ type: 'cancelBeer' }, who, false);
}

export function startGrillCook(who = 'p1') {
  if (STATIONS_LOGIC.grill.state !== 'idle') return false;
  return stationCommand({ type: 'grill' }, who);
}

export function collectGrillDish(who = 'p1') {
  return stationCommand({ type: 'grill' }, who);
}

export function stationCommand(command, who = Net.me || 'p1', feedback = true) {
  const ok = requestService3DCommand(command, who);
  if (Net.role !== 'guest') updateStockbar();
  syncStationUI();
  syncTrayVisual(who);
  if (!ok && feedback && Game.mode === 'service') {
    Game.floaters.push({ x: 420, y: 460, text: 'Revisa stock, espacio o preparación', t: 0, color: '#ffb199' });
  }
  return ok;
}

// Servir un producto de la bandeja directamente al cliente
export function deliverTrayItemToCustomer(customer, who = 'p1') {
  if (!preparedMatch(Game, customer, who)) return false;
  const ok = stationCommand({ type: 'deliver', customer: customer.id }, who);
  if (ok && Net.role !== 'guest') {
    triggerCustomerHappyEmote(customer, customer.patience / customer.maxPatience > .45);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([25, 40, 25]);
    }

    if (Game && Game.floaters) {
      Game.floaters.push({
        x: customer.x,
        y: customer.y - 140,
        text: '🛎️ ¡Entregado!',
        t: 0,
        color: '#69f0ae'
      });
    }

    if (typeof Audio !== 'undefined' && Audio._raw && Audio._raw.bell) {
      Audio._raw.bell();
    }
    if (typeof Audio !== 'undefined' && Audio.voiceThanks) {
      const pan = Math.max(-1, Math.min(1, ((customer.x || 650) - 650) / 450));
      Audio.voiceThanks(pan);
    }
    if (customer.charged && typeof window !== 'undefined' && window.spawnCoinBurst3D) {
      window.spawnCoinBurst3D(0, 1.4, 2.0, 5);
    }
  }
  return ok;
}
