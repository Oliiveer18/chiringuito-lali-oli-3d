/* =========================================================
   camera-beta · entrega 2
   Sensación de juego: respuesta inmediata en servir, cobrar, limpiar y avisos.
   ========================================================= */
import { Game } from './state.js?v=28.17.3-flat-sand';
import { Audio } from './audio.js?v=28.17.3-flat-sand';

const FX = [];
function push(x, y, kind) { FX.push({ x, y, kind, t: 0, life: 0.45 }); }
export function fxServe(c) { if (c) { push(c.x, c.y - 60, 'serve'); Audio._raw.start(); } }
export function fxCharge(c, total) { if (c) { push(c.x, c.y - 90, 'charge'); if (navigator.vibrate) try { navigator.vibrate(18); } catch (e) { } } }
export function fxClean(t) { if (t) { push(t.x, t.y - 40, 'clean'); if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) { } } }
export function fxUrgent() { if (navigator.vibrate) try { navigator.vibrate([40, 60, 40]); } catch (e) { } }
export function fxTick(dt) { for (const f of FX) f.t += dt; while (FX.length && FX[0].t > FX[0].life) FX.shift(); }
export function fxDraw(ctx) {
  for (const f of FX) {
    const p = f.t / f.life;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = f.kind === 'charge' ? '#ffe066' : f.kind === 'clean' ? '#bfefff' : '#9ff0d0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 18 + p * 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
