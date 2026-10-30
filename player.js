/* =========================================================
   camera-beta · entrega 3
   Personaje del jugador en solitario: tocar para ir, interacción por cercanía y estaciones separadas.
   ========================================================= */
import { H, W } from './config.js?v=28.17.0-online-web';
import { Game } from './state.js?v=28.17.0-online-web';
import { navFind, navStep } from './nav.js?v=28.17.0-online-web';
import { drawPerson } from './render.js?v=28.17.0-online-web';

export const PLAYER = { x: 260, y: 620, tx: 260, ty: 620, path: [], navIdx: 0, speed: 150, dir: 1, stridePh: 0, movingSpd: 0, look: { shirt: '#0f8b8d', skin: '#e0a97e', hair: { style: 'corto', color: '#2a211c' }, acc: [], build: 1, height: 1, walk: { stride: 1, bob: 1, sway: false } }, hat: null, type: 'staff' };
if (typeof window !== 'undefined') window.PLAYER = PLAYER;
export const STATIONS = [
  { id: 'barra', x: 260, y: 560, r: 70 },
  { id: 'plancha', x: 420, y: 560, r: 70 },
  { id: 'nevera', x: 180, y: 560, r: 70 },
  { id: 'mesas', x: 930, y: 528, r: 90 },
];
export function playerGo(x, y) {
  PLAYER.tx = x; PLAYER.ty = y;
  PLAYER.path = navFind(PLAYER.x, PLAYER.y, x, y);
  PLAYER.navIdx = 0;
}
export function playerTick(dt) {
  if (Game.mode !== 'service') return;
  const done = navStep(PLAYER, dt, 1.2);
  if (done) { PLAYER.movingSpd = 0; }
}
export function playerDraw(ctx) {
  if (Game.mode !== 'service') return;
  drawPerson(ctx, PLAYER.x, PLAYER.y + 40, { ...PLAYER, scale: 1.2 });
}
export function nearestStation() {
  let best = null, bd = 1e9;
  for (const s of STATIONS) { const d = Math.hypot(s.x - PLAYER.x, s.y - PLAYER.y); if (d < s.r && d < bd) { bd = d; best = s; } }
  return best;
}
export function playerInteract() {
  const s = nearestStation();
  if (!s) return null;
  return s.id;
}
