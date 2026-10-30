/* =========================================================
   camera-beta · entrega 4
   Cooperativo: predicción local del movimiento y interpolación del compañero.
   ========================================================= */
import { Game, Net } from './state.js?v=28.17.0-online-web';
import { PLAYER, playerGo } from './player.js?v=28.17.0-online-web';

export const NET_PLAYER = { x: 0, y: 0, tx: 0, ty: 0, dir: 1, stridePh: 0, movingSpd: 0 };
export function netPlayerSend() {
  if (Net.role === 'guest') return;
  return { x: Math.round(PLAYER.x), y: Math.round(PLAYER.y), tx: Math.round(PLAYER.tx), ty: Math.round(PLAYER.ty), dir: PLAYER.dir };
}
export function netPlayerApply(m) {
  if (!m) return;
  NET_PLAYER.gx = m.x; NET_PLAYER.gy = m.y;
  NET_PLAYER.tx = m.tx; NET_PLAYER.ty = m.ty;
  NET_PLAYER.dir = m.dir;
}
export function netPlayerTick(dt) {
  if (NET_PLAYER.gx == null) return;
  const k = Math.min(1, dt * 12);
  NET_PLAYER.x += (NET_PLAYER.gx - NET_PLAYER.x) * k;
  NET_PLAYER.y += (NET_PLAYER.gy - NET_PLAYER.y) * k;
  const moving = Math.abs(NET_PLAYER.gx - NET_PLAYER.x) + Math.abs(NET_PLAYER.gy - NET_PLAYER.y) > 1.5;
  if (moving) NET_PLAYER.stridePh += dt * 10;
}
export function guestMove(x, y) { if (Net.role === 'guest') { playerGo(x, y); return { t: 'move', x, y }; } return null; }
