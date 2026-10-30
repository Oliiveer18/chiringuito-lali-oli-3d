/* Acciones pendientes del invitado. Lo importa net.js. */
import { Game, Net } from './state.js?v=28.17.1-online-web';
import { netAct } from './net-link.js?v=28.17.1-online-web';
export const REJECT_MSG = {
  service3d:'No se pudo completar: revisa stock, bandeja, preparación y cliente.',
  busy:'Tu puesto ya estaba ocupado con otro pedido.',
  gone:'Ese cliente ya no esperaba el pedido.',
  clean:'Esa mesa ya estaba limpia.',
};
export function pendHas(kind,key){ for(const p of Net.pend.values()) if(p.kind===kind && p.key===key) return true; return false; }
export function guestServe(cu){
  if(!cu || pendHas('serve', cu.id)) return;
  const q=++Net.seq;
  netAct({a:'serve', id:cu.id, q,serviceId:Game.floor?.id});
  Net.pend.set(q, {kind:'serve', key:cu.id, t0:performance.now(), expired:false});
}
export function guestClean(i){
  if(i==null || i<0 || pendHas('clean', i)) return;
  const q=++Net.seq;
  netAct({a:'clean', i, q,serviceId:Game.floor?.id});
  Net.pend.set(q, {kind:'clean', key:i, t0:performance.now(), expired:false});
}
export function guestPendTick(){
  const now=performance.now();
  for(const [q,p] of Net.pend){
    const age=now-p.t0;
    if(!p.expired && age>Net.pendTimeout) p.expired=true;
    if(age>Net.pendDrop) Net.pend.delete(q);
  }
}
