/* Mechanical extraction from sim.js; declaration bodies are unchanged. */
import { ITEMS } from "../config.js?v=28.17.0-online-web";
import { TYPES } from "../config.js?v=28.17.0-online-web";
import { stationOf } from "../config.js?v=28.17.0-online-web";
import { pickW } from "../util.js?v=28.17.0-online-web";
import { Game } from "../state.js?v=28.17.0-online-web";
import { activeItems } from "../state.js?v=28.17.0-online-web";

export function pendingIdx(c){ const out=[]; if(!c.itemSt) return out; c.itemSt.forEach((st,i)=>{ if(st===0) out.push(i); }); return out; }

export function chooseSubstitute(c, missingId){
  const cands = activeItems().filter(id=>Game.stock[id]>0 && !c.order.includes(id));
  if(!cands.length) return null;
  const sameStation = cands.filter(id=>stationOf(id)===stationOf(missingId));
  const pool = sameStation.length ? sameStation : cands;
  const w={}; pool.forEach(id=>w[id]=TYPES[c.type].pref[id]||1);
  return pickW(w);
}

export function announceSub(c, newId){
  c.mood='cambio'; c.moodT=4.5;
  c.moodTxt=`Pues ${ITEMS[newId].name.toLowerCase()}, ¡gracias!`;
  Game.floaters.push({x:c.x,y:c.y-120,text:'Cambia a '+ITEMS[newId].name.toLowerCase(),t:0,color:'#fff2c9'});
}
