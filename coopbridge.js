/* Cooperativo: canal para que la invitada ejecute acciones de los módulos v11-v14.
   La invitada envía la acción (guestSend); el anfitrión la recibe aquí y la ejecuta con la misma
   función y las mismas comprobaciones que si la hubiera pulsado él. El estado vuelve a ambos por la instantánea. */
import { Net } from './state.js?v=28.17.0-online-web';
import { netAct } from './net.js?v=28.17.0-online-web';

const handlers = {};
export function onGuestAction(kind, fn){ handlers[kind] = fn; }
export function guestSend(kind, payload){ netAct({ a:'mod', k:kind, p:payload }); }

function receive(d){
  let m = d;
  if(typeof m === 'string'){ try{ m = JSON.parse(m); }catch(e){ return; } }
  if(Net.role !== 'host' || !m || m.t !== 'act' || m.a !== 'mod') return;
  const fn = handlers[m.k];
  if(!fn) return;
  try{ fn(m.p); }catch(e){ console.error('Acción de la invitada fallida:', m.k, e); }
}

// El anfitrión escucha el enlace con la invitada (ReliablePeer ya lo envuelve en un Link reutilizable)
const Base = window.Peer;
if(Base){
  window.Peer = class BridgePeer extends Base {
    emit(name, ...args){
      const r = super.emit(name, ...args);
      if(name === 'connection' && this.slot && !this.slot.__bridge){
        this.slot.__bridge = true;
        this.slot.on('data', receive);
      }
      return r;
    }
  };
}
