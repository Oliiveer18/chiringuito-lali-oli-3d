/* =========================================================
   controls-3d.js · Controles Ergonómicos de Pulgares Móviles AAA
   Joystick virtual flotante (pulgar izquierdo) + Botón contextual gigante (pulgar derecho)
   con respuesta háptica y detección inteligente de proximidad.
   ========================================================= */
import { Game, Net } from './state.js?v=28.17.0-online-web';
import { cleanTable, servable, tryServe } from './sim.js?v=28.17.0-online-web';
import { Audio } from './audio.js?v=28.17.0-online-web';
import { tablePosTo3D } from './world.js?v=28.17.0-online-web';
import {
  startBeerPour,
  releaseBeerPour,
  cancelBeerPour,
  collectGrillDish,
  deliverTrayItemToCustomer,
  stationCommand,
  trayGetItems,
  initStationUI,
  STATIONS_LOGIC
} from './stations-3d.js?v=28.17.0-online-web';
import { preparedMatch } from './service-3d-model.mjs';
import { customerInteractionPosition } from './render-3d-customers.js?v=28.17.0-online-web';
import { guestClean, guestServe } from './net-guest.js?v=28.17.0-online-web';

export const CONTROLS3D = {
  // Estado del joystick virtual
  joyActive: false,
  joyTouchId: null,
  joyStartX: 0,
  joyStartY: 0,
  joyCurX: 0,
  joyCurY: 0,
  inputX: 0, // -1 .. +1
  inputZ: 0, // -1 .. +1
  // Estado del teclado (WASD / Flechas)
  keys: { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false },
  // Estado de la acción contextual
  currentAction: null,
  isHoldingAction: false,
  heldAction: null,
  // Callbacks
  onActionTrigger: null
};

// Coordenadas 3D exactas en el espacio mundial de las estaciones de trabajo
export const STATIONS_3D = [
  { id: 'beer',   name: 'TIRAR CAÑA',     ico: '🍺', class: 'act-gold',  x: -3.8, z: 2.8, r: 2.2 },
  { id: 'coffee', name: 'HACER CAFÉ',     ico: '☕', class: 'act-coral', x: -1.4, z: 2.8, r: 2.2 },
  { id: 'grill',  name: 'PLANCHA',        ico: '🍳', class: 'act-fire',  x: -0.1, z: 2.8, r: 2.2 },
  { id: 'cooler', name: 'NEVERA',         ico: '🥤', class: 'act-teal',  x: -4.8, z: -1.4, r: 2.4 },
  { id: 'sink',   name: 'FREGAR PLATOS',  ico: '🧼', class: 'act-teal',  x: -1.4, z: -0.9, r: 2.2 }
];

let joyBaseEl = null;
let joyThumbEl = null;
let actBtnEl = null;
let actIcoEl = null;
let actLblEl = null;
const JOY_MAX_DIST = 44; // Radio máximo en px

function controls3DEnabled() {
  return Game && Game.mode === 'service' && Game.speed > 0;
}

export function resetControls3DInput() {
  if(CONTROLS3D.heldAction?.type==='beer') cancelBeerPour(Net.me);
  CONTROLS3D.isHoldingAction=false;
  CONTROLS3D.heldAction=null;
  actBtnEl?.classList.remove('act-press');
  CONTROLS3D.joyActive = false;
  CONTROLS3D.joyTouchId = null;
  CONTROLS3D.inputX = 0;
  CONTROLS3D.inputZ = 0;
  for (const k of Object.keys(CONTROLS3D.keys)) CONTROLS3D.keys[k] = false;
  if (joyBaseEl) joyBaseEl.classList.add('hidden');
  if (joyThumbEl) joyThumbEl.style.transform = 'translate(0px, 0px)';
}

function hideActionButton() {
  if (actBtnEl) actBtnEl.classList.add('hidden');
  CONTROLS3D.currentAction = null;
}

/** Desactiva joystick/botón contextual fuera de la jornada activa. */
export function syncControls3DForGameMode() {
  const zone = document.getElementById('joystick-zone');
  if (zone) zone.style.pointerEvents = controls3DEnabled() ? 'auto' : 'none';
  if (!controls3DEnabled()) {
    resetControls3DInput();
    hideActionButton();
    return false;
  }
  return true;
}

export function initControls3D(playerMesh) {
  if (typeof document === 'undefined') return;

  joyBaseEl = document.getElementById('joy-base');
  joyThumbEl = document.getElementById('joy-thumb');
  actBtnEl = document.getElementById('btn-action-main');
  actIcoEl = document.getElementById('action-ico');
  actLblEl = document.getElementById('action-lbl');

  const zone = document.getElementById('joystick-zone') || document.body;

  // ---------- GESTOS TÁCTILES DEL JOYSTICK (Pulgar Izquierdo) ----------
  zone.addEventListener('touchstart', e => {
    if (!controls3DEnabled()) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      // Activación en el cuadrante inferior izquierdo
      if (!CONTROLS3D.joyActive && t.clientX < window.innerWidth * 0.48 && t.clientY > window.innerHeight * 0.25) {
        CONTROLS3D.joyActive = true;
        CONTROLS3D.joyTouchId = t.identifier;
        CONTROLS3D.joyStartX = t.clientX;
        CONTROLS3D.joyStartY = t.clientY;
        CONTROLS3D.joyCurX = t.clientX;
        CONTROLS3D.joyCurY = t.clientY;

        if (joyBaseEl && joyThumbEl) {
          joyBaseEl.style.left = `${t.clientX}px`;
          joyBaseEl.style.top = `${t.clientY}px`;
          joyThumbEl.style.transform = `translate(0px, 0px)`;
          joyBaseEl.classList.remove('hidden');
        }
        break;
      }
    }
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (!CONTROLS3D.joyActive || !controls3DEnabled()) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === CONTROLS3D.joyTouchId) {
        let dx = t.clientX - CONTROLS3D.joyStartX;
        let dy = t.clientY - CONTROLS3D.joyStartY;
        const dist = Math.hypot(dx, dy);

        if (dist > JOY_MAX_DIST) {
          dx = (dx / dist) * JOY_MAX_DIST;
          dy = (dy / dist) * JOY_MAX_DIST;
        }

        CONTROLS3D.inputX = dx / JOY_MAX_DIST;
        CONTROLS3D.inputZ = dy / JOY_MAX_DIST; // Y de pantalla = Z del mundo 3D

        if (joyThumbEl) {
          joyThumbEl.style.transform = `translate(${dx}px, ${dy}px)`;
        }
        break;
      }
    }
  }, { passive: true });

  const endJoy = e => {
    if (!CONTROLS3D.joyActive) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === CONTROLS3D.joyTouchId) {
        CONTROLS3D.joyActive = false;
        CONTROLS3D.joyTouchId = null;
        CONTROLS3D.inputX = 0;
        CONTROLS3D.inputZ = 0;
        if (joyBaseEl) joyBaseEl.classList.add('hidden');
        if (joyThumbEl) joyThumbEl.style.transform = `translate(0px, 0px)`;
        break;
      }
    }
  };

  window.addEventListener('touchend', endJoy, { passive: true });
  window.addEventListener('touchcancel', endJoy, { passive: true });

  initStationUI();

  // ---------- TECLADO EN ESCRITORIO (WASD / Flechas) ----------
  window.addEventListener('keydown', e => {
    if (!controls3DEnabled()) return;
    if(e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key in CONTROLS3D.keys) {
      e.preventDefault();
      CONTROLS3D.keys[e.key] = true;
      updateKeyboardInput();
    }
    // Barra espaciadora o Enter ejecuta la acción contextual
    if (e.code === 'Space' && !e.repeat && !CONTROLS3D.isHoldingAction) {
      e.preventDefault();
      CONTROLS3D.isHoldingAction = true;
      CONTROLS3D.heldAction=CONTROLS3D.currentAction;
      if (CONTROLS3D.heldAction?.type === 'beer') {
        startBeerPour(Net.me);
      } else {
        triggerCurrentAction();
      }
    }
  });

  window.addEventListener('keyup', e => {
    if (e.key in CONTROLS3D.keys) {
      CONTROLS3D.keys[e.key] = false;
      updateKeyboardInput();
    }
    if (e.code === 'Space') {
      endActionHold();
    }
  });

  // ---------- BOTÓN CONTEXTUAL GIGANTE (Pulgar Derecho) ----------
  if (actBtnEl) {
    actBtnEl.addEventListener('pointerdown', e => {
      if (!controls3DEnabled() || CONTROLS3D.isHoldingAction) return;
      e.preventDefault();
      actBtnEl.setPointerCapture(e.pointerId);
      CONTROLS3D.isHoldingAction = true;
      CONTROLS3D.heldAction=CONTROLS3D.currentAction;
      // Respuesta háptica suave
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(14);
      }
      actBtnEl.classList.add('act-press');
      if (CONTROLS3D.heldAction?.type === 'beer') {
        startBeerPour(Net.me);
      } else {
        triggerCurrentAction();
      }
    });

    actBtnEl.addEventListener('pointerup', () => endActionHold());
    actBtnEl.addEventListener('pointercancel', () => endActionHold(true));
    actBtnEl.addEventListener('lostpointercapture', () => endActionHold(true));
  }
  window.addEventListener('blur', resetControls3DInput);
  document.addEventListener('visibilitychange', () => { if(document.hidden) resetControls3DInput(); });

  hideActionButton();
  syncControls3DForGameMode();
}

function endActionHold(cancel=false){
  if(!CONTROLS3D.isHoldingAction) return;
  const held=CONTROLS3D.heldAction;
  CONTROLS3D.isHoldingAction=false;
  CONTROLS3D.heldAction=null;
  actBtnEl?.classList.remove('act-press');
  if(held?.type==='beer'){
    if(cancel||!controls3DEnabled()) cancelBeerPour(Net.me);
    else releaseBeerPour(Net.me);
  }
}

function updateKeyboardInput() {
  if (!controls3DEnabled()) {
    resetControls3DInput();
    return;
  }
  const k = CONTROLS3D.keys;
  const kx = (k.d || k.ArrowRight ? 1 : 0) - (k.a || k.ArrowLeft ? 1 : 0);
  const kz = (k.s || k.ArrowDown ? 1 : 0) - (k.w || k.ArrowUp ? 1 : 0);

  if (Math.hypot(kx, kz) > 0) {
    const len = Math.hypot(kx, kz);
    CONTROLS3D.inputX = kx / len;
    CONTROLS3D.inputZ = kz / len;
  } else if (!CONTROLS3D.joyActive) {
    CONTROLS3D.inputX = 0;
    CONTROLS3D.inputZ = 0;
  }
}

// ---------- Detección Inteligente de Proximidad ----------
export function updateContextualProximity(playerPos) {
  if (!controls3DEnabled()) {
    hideActionButton();
    return;
  }
  if (!playerPos || !actBtnEl) return;

  let best = null;
  let minDist = 1e9;
  const trayItems = trayGetItems(Net.me);
  const hasDirtyDishes = trayItems.includes('dirty');

  // 1. Si lleva platos sucios en la bandeja y está cerca del fregadero
  if (hasDirtyDishes) {
    const sink = STATIONS_3D.find(s => s.id === 'sink');
    if (sink) {
      const d = Math.hypot(playerPos.x - sink.x, playerPos.z - sink.z);
      if (d < sink.r) {
        best = { type: 'sink', name: sink.name, ico: sink.ico, class: sink.class };
        minDist = d;
      }
    }
  }

  // 2. Comprobar si hay una mesa sucia cerca (y no lleva ya el tope de platos)
  if (!best && Game && Game.tables) {
    Game.tables.forEach((t, i) => {
      if (t.state === 'dirty') {
        const p = tablePosTo3D(t);
        const d = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
        if (d < 2.6 && d < minDist) {
          minDist = d;
          best = { type: 'clean', table: t, tableIdx: i, name: 'LIMPIAR MESA', ico: '🧽', class: 'act-teal' };
        }
      }
    });
  }

  // 3. Comprobar clientes esperando (entrega directa si tenemos su producto en la bandeja)
  if (!best && Game && Game.customers) {
    for (const c of Game.customers) {
      if (!servable(c)) continue;
      const cp = customerInteractionPosition(c);
      const cx = cp.x;
      const cz = cp.z;
      const d = Math.hypot(playerPos.x - cx, playerPos.z - cz);
      if (d < 3.2 && d < minDist) {
        minDist = d;
        // ¿Llevamos en la bandeja algún producto que pide este cliente?
        const match = preparedMatch(Game,c,Net.me);
        if (match) {
          best = { type: 'deliver', customer: c, item: match.unit.id, name: 'ENTREGAR', ico: '🍽️', class: 'act-green' };
        } else {
          best = { type: 'serve', customer: c, name: 'ATENDER', ico: '🛎️', class: 'act-green' };
        }
      }
    }
  }

  // 4. Comprobar estaciones de trabajo fijas (barra, plancha, cafetera, nevera, fregadero)
  if (!best) {
    for (const s of STATIONS_3D) {
      const d = Math.hypot(playerPos.x - s.x, playerPos.z - s.z);
      if (d < s.r && d < minDist) {
        minDist = d;
        if (s.id === 'grill' && STATIONS_LOGIC.grill.state !== 'idle') {
          const g=STATIONS_LOGIC.grill;
          best = { type: 'grill', name: g.state==='cooking'?'COCINANDO…':g.state==='burnt'?'RECOGER QUEMADO':'RECOGER PLANCHA', ico: '🍳', class: 'act-fire' };
        } else if(s.id==='coffee' && STATIONS_LOGIC.coffee.state!=='idle'){
          best = { type:'coffee',name:'PREPARANDO CAFÉ…',ico:s.ico,class:s.class };
        } else {
          best = { type: s.id, name: s.name, ico: s.ico, class: s.class };
        }
      }
    }
  }

  // 5. Si no hay nada cerca, acción genérica o reposo elegante
  if (!best) {
    best = { type: 'idle', name: 'ATENDER', ico: '👋', class: 'act-idle' };
  }

  // Actualizar UI del botón
  const previous=CONTROLS3D.currentAction;
  CONTROLS3D.currentAction = best;
  if(CONTROLS3D.heldAction?.type==='beer'){
    const beer=STATIONS_3D.find(s=>s.id==='beer');
    if(Math.hypot(playerPos.x-beer.x,playerPos.z-beer.z)>=beer.r) endActionHold(true);
  }
  if (!previous || previous.type !== best.type || previous.name !== best.name) {
    if (actIcoEl) actIcoEl.textContent = best.ico;
    if (actLblEl) actLblEl.textContent = best.name;

    // Actualizar clases de color
    actBtnEl.className = 'btn-action-main ' + best.class;
    actBtnEl.classList.remove('hidden');
  }
}

// ---------- Ejecutar la Acción Contextual ----------
function triggerCurrentAction() {
  if (!controls3DEnabled()) return;
  const act = CONTROLS3D.currentAction;
  if (!act) return;

  if (act.type === 'clean' && act.table) {
    if(Net.role==='guest') guestClean(act.tableIdx);
    else cleanTable(act.table, false, Net.me);
  } else if (act.type === 'sink') {
    const washed=stationCommand({type:'wash'},Net.me);
    if (washed && typeof Audio !== 'undefined' && Audio._raw && Audio._raw.clean) {
      Audio._raw.clean();
    }
    if (washed && Net.role!=='guest' && Game && Game.floaters) {
      Game.floaters.push({ x: 420, y: 460, text: '✨ ¡Vajilla limpia!', t: 0, color: '#e0f7fa' });
    }
  } else if (act.type === 'deliver' && act.customer) {
    deliverTrayItemToCustomer(act.customer, Net.me);
  } else if (act.type === 'serve' && act.customer) {
    if(Net.role==='guest') guestServe(act.customer);
    else tryServe(act.customer, Net.me);
  } else if (act.type === 'grill') {
    collectGrillDish(Net.me);
  } else if (act.type === 'coffee') {
    const started=stationCommand({type:'coffee'},Net.me);
    if (started && typeof Audio !== 'undefined' && Audio._raw && Audio._raw.start) {
      Audio._raw.start();
    }
  } else if (act.type === 'cooler') {
    const started=stationCommand({type:'cooler'},Net.me);
    if (started && typeof Audio !== 'undefined' && Audio._raw && Audio._raw.pop) {
      Audio._raw.pop();
    }
  }

  // Efecto visual de rebote en el botón
  if (actBtnEl) {
    actBtnEl.classList.add('act-bounce');
    setTimeout(() => actBtnEl && actBtnEl.classList.remove('act-bounce'), 220);
  }

  if (CONTROLS3D.onActionTrigger) {
    CONTROLS3D.onActionTrigger(act);
  }
}
