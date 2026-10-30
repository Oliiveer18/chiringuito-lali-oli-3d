/* =========================================================
   camera-beta · entrega 5
   Equilibrio: paciencia y afluencia se ajustan a la nueva carga de trabajo.
   ========================================================= */
import { Game } from './state.js?v=28.17.2-flat-sand';

export const BALANCE = {
  patienceMul: 1.15,
  arrivalMul: 0.92,
  staffBonus: 1.1,
};
export function applyBalance() {
  if (Game.mode !== 'service') return;
  Game.mods.arr *= BALANCE.arrivalMul;
}
export function balancePatience(base) { return base * BALANCE.patienceMul; }
