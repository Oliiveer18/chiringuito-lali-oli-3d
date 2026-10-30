/* Mechanical extraction from sim.js; declaration bodies are unchanged. */
import { ITEMS } from "../config.js?v=28.17.2-flat-sand";
import { eur2 } from "../util.js?v=28.17.2-flat-sand";
import { Audio } from "../audio.js?v=28.17.2-flat-sand";
import { Game } from "../state.js?v=28.17.2-flat-sand";
import { itemUnlocked } from "../state.js?v=28.17.2-flat-sand";
import { flashMoney } from "../ui.js?v=28.17.2-flat-sand";
import { regularOutcome } from "./customers.js?v=28.17.2-flat-sand";

export function charge(c, total, sync){
  if(c.charged || !Number.isFinite(total) || total<0) return false;
  c.charged=true;
  const qualityTip=Math.max(0,c.qualityTip||0);
  Game.dayStats.tips+=qualityTip;
  Game.dayStats.tipsQuality=(Game.dayStats.tipsQuality||0)+qualityTip;
  Game.money+=total; Game.dayStats.revenue+=total; Game.dayStats.served++; if(c.partT?.yeray!=null)Game.dayStats.staffClients=(Game.dayStats.staffClients||0)+1;
  Game.floaters.push({x:c.x,y:c.y-110,text:'+'+eur2(total),t:0,color:'#ffe066'});
  if(sync) Game.floaters.push({x:c.x,y:c.y-150,text:'¡Sincronizados!',t:0,color:'#9ff0d0'});
  Audio.coin();
  c.spot=-1;
  regularOutcome(c, c.sat!=null?c.sat:0.8);
  return true;
}

export function addSat(s){
  Game.dayStats.satSum+=s; Game.dayStats.satN++;
}

export function buyStock(id,n,mult=1){if(!ITEMS[id]||!itemUnlocked(id)||!Number.isInteger(n)||n<1||n>500||![1,2].includes(mult)||!Number.isFinite(Game.money)||!Number.isFinite(ITEMS[id].cost)||ITEMS[id].cost<=0)return false;
  const cost = ITEMS[id].cost*n*mult;
  if(Game.money < cost) { Audio.bad(); flashMoney(); return false; }
  Game.money -= cost;
  // Contabilidad: la compra se imputa al día que está planificándose
  Game.stock[id] = (Game.stock[id]||0) + n;
  if(Game.mode==='plan') Game.pendingPurchases = (Game.pendingPurchases||0) + cost;
  Audio.click(); return cost;
}
