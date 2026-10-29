/* =========================================================
   camera-beta · entrega 1
   Cámara por zonas (horizontal y vertical), toque ampliado y avisos fuera de plano.
   Compatible con iPhone 14 / 14 Plus. No cambia la economía ni las reglas del juego.
   ========================================================= */
import { H, W } from './config.js?v=28.16.0-vfx3d';
import { Game } from './state.js?v=28.16.0-vfx3d';
import { view } from './canvas.js?v=28.16.0-vfx3d';

const CAM = {
  mode: 'auto',
  zones: {
    todo: { x: W / 2, y: H / 2, span: W },
    barra: { x: 290, y: 560, span: 640 },
    mesas: { x: 930, y: 528, span: 640 },
  },
  current: 'todo',
  target: 'todo',
  lastSwitch: 0,
  autoDelay: 2.5,
};

function zoneOf(mode) { return CAM.zones[mode] || CAM.zones.todo; }
function urgency() {
  const angry = (Game.customers || []).filter(c => c.anger >= 2).length;
  const dirty = (Game.tables || []).filter(t => t.state === 'dirty').length;
  if (angry >= 2) return 'barra';
  if (dirty >= 2) return 'mesas';
  return null;
}
export function setCam(mode) {
  if (!CAM.zones[mode]) return;
  CAM.mode = mode;
  CAM.target = mode;
  try { sessionStorage.setItem('lali-oli.3d.cam-beta', mode); } catch (e) { }
  document.querySelectorAll('#cam-bar button').forEach(b => b.classList.toggle('on', b.dataset.cam === mode));
}
export function camTick(dt) {
  if (CAM.mode !== 'auto') return;
  const urgent = urgency();
  if (!urgent) { CAM.target = 'todo'; return; }
  if (CAM.target === urgent) return;
  if (performance.now() - CAM.lastSwitch < CAM.autoDelay * 1000) return;
  CAM.target = urgent;
  CAM.lastSwitch = performance.now();
}
export function applyCamBeta() {
  const portrait = document.body.classList.contains('portrait');
  const vp = window.visualViewport || { width: innerWidth, height: innerHeight };
  const dpr = view.dpr || 1;
  const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-ui')) || 0;
  const bottom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bottom-ui')) || 0;
  const aw = Math.max(1, vp.width), ah = Math.max(1, vp.height - top - bottom);
  const z = zoneOf(CAM.target);
  const span = portrait ? Math.min(z.span, 760) : z.span;
  const s = Math.min(aw / span, ah / H) * dpr;
  view.s = s;
  view.ox = aw * dpr / 2 - z.x * s;
  view.oy = top * dpr + (ah * dpr - H * s) / 2;
}
export function camBadge() {
  const dirty = (Game.tables || []).filter(t => t.state === 'dirty').length;
  const angry = (Game.customers || []).filter(c => c.anger >= 2).length;
  return { mesas: dirty, barra: angry };
}
export function initCamBeta() {
  const bar = document.createElement('div');
  bar.id = 'cam-bar';
  bar.className = 'cam-bar';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Vista del chiringuito');
  for (const [k, t] of [['todo', 'Todo'], ['barra', 'Barra'], ['mesas', 'Mesas']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.cam = k;
    b.textContent = t;
    if (k === 'mesas') { const s = document.createElement('span'); s.className = 'cam-badge'; b.append(s); }
    bar.append(b);
  }
  document.body.append(bar);
  bar.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setCam(b.dataset.cam); });
  let saved = 'auto';
  try { saved = sessionStorage.getItem('lali-oli.3d.cam-beta') || 'auto'; } catch (e) { }
  setCam(saved);
}
