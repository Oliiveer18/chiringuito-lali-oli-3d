/* Command boundary: guests send intentions; only the host mutates service state. */
import { Game, Net } from './state.js?v=28.17.0-online-web';
import { netAct } from './net-link.js?v=28.17.0-online-web';
import { deliverPreparedItem } from './sim/service.js?v=28.17.0-online-web';
import { flushLocalPose3D } from './net-movement-3d.js';
import {
  service3D, serviceRunning, beginPreparation, finishBeer, cancelPreparation,
  collectGrill, takeColdDrink, washDirtyUnits
} from './service-3d-model.mjs';
let proximityCheck=()=>true;
export function setService3DProximityCheck(check){proximityCheck=check;}

export function applyService3DCommand(command, who = 'p1') {
  if (Net.role === 'guest' || !['p1', 'p2'].includes(who) || !command) return false;
  if (command.type === 'cancelBeer') return cancelPreparation(Game, 'beer', who);
  if (!serviceRunning(Game)) return false;
  if(Net.role==='host'&&who==='p2'&&!proximityCheck(command,who))return false;
  let result = false;
  switch (command.type) {
    case 'beer': result = beginPreparation(Game, 'beer', who); break;
    case 'releaseBeer': result = finishBeer(Game, who); break;
    case 'coffee': result = beginPreparation(Game, 'coffee', who); break;
    case 'cooler': result = takeColdDrink(Game, who, 'refresco'); break;
    case 'grill': {
      const g = service3D(Game).stations.grill;
      result = g.state === 'idle' ? beginPreparation(Game, 'grill', who, 'papas') : collectGrill(Game, who);
      break;
    }
    case 'wash': result = washDirtyUnits(Game, who); break;
    case 'deliver': result = deliverPreparedItem(Game.customers.find(c => c.id === command.customer), who); break;
  }
  if (result) Net.sendT = 1e9;
  return !!result;
}

export function requestService3DCommand(command, who = Net.me || 'p1') {
  if (Net.role !== 'guest') return applyService3DCommand(command, who);
  if (!Game.floor?.id || !Net.peer) return false;
  flushLocalPose3D();
  const q = ++Net.seq;
  netAct({ a: 'service3d', command, serviceId: Game.floor.id, q });
  Net.pend.set(q, { kind: 'service3d', key: command.type, t0: performance.now(), expired: false });
  return true; // submitted, not optimistically applied
}
