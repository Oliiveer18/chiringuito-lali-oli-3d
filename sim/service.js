/* Mechanical extraction from sim.js; declaration bodies are unchanged. */
import { requestFloorClean } from "../floor-service.js?v=28.17.2-flat-sand";
import { requestFloorCustomer } from "../floor-service.js?v=28.17.2-flat-sand";
import { floorAway } from "../floor-service.js?v=28.17.2-flat-sand";
import { releaseFloorCustomer } from "../floor-service.js?v=28.17.2-flat-sand";
import { factor } from "../professional-model.mjs?v=28.17.2-flat-sand";
import { ITEMS } from "../config.js?v=28.17.2-flat-sand";
import { PERSONALITIES } from "../config.js?v=28.17.2-flat-sand";
import { TYPES } from "../config.js?v=28.17.2-flat-sand";
import { stationOf } from "../config.js?v=28.17.2-flat-sand";
import { clamp } from "../util.js?v=28.17.2-flat-sand";
import { eur2 } from "../util.js?v=28.17.2-flat-sand";
import { rand } from "../util.js?v=28.17.2-flat-sand";
import { rnd } from "../util.js?v=28.17.2-flat-sand";
import { Audio } from "../audio.js?v=28.17.2-flat-sand";
import { satisfaction } from "../ratings-model.mjs?v=28.17.2-flat-sand";
import { Game } from "../state.js?v=28.17.2-flat-sand";
import { Net } from "../state.js?v=28.17.2-flat-sand";
import { hostLive } from "../state.js?v=28.17.2-flat-sand";
import { isCoop } from "../state.js?v=28.17.2-flat-sand";
import { lvl } from "../state.js?v=28.17.2-flat-sand";
import { navSetTarget } from "../nav.js?v=28.17.2-flat-sand";
import { recordVisit } from "../report.js?v=28.17.2-flat-sand";
import { updateStockbar } from "../ui.js?v=28.17.2-flat-sand";
import { addSat } from "./economy.js?v=28.17.2-flat-sand";
import { announceSub } from "./orders.js?v=28.17.2-flat-sand";
import { charge } from "./economy.js?v=28.17.2-flat-sand";
import { chooseSubstitute } from "./orders.js?v=28.17.2-flat-sand";
import { leaveQueue } from "./customers.js?v=28.17.2-flat-sand";
import { pendingIdx } from "./orders.js?v=28.17.2-flat-sand";
import { regularOutcome } from "./customers.js?v=28.17.2-flat-sand";
import { servable } from "./day.js?v=28.17.2-flat-sand";
import { commitPreparedDelivery, addDirtyUnit } from "../service-3d-model.mjs";

export function deliverPreparedItem(c, who='p1'){
  if(Net.role==='guest' || !commitPreparedDelivery(Game,c,who)) return false;
  checkComplete(c);
  if(c.state==='floorReady') completeFloorOrder(c);
  return true;
}

export function prepTime(order){
  let t = order.reduce((s,id)=>s+ITEMS[id].prep,0);
  if(lvl('plancha')) t*=0.8; if(Game.staff.cocinero&&!floorAway('carmela')) t*=0.6*factor(Game.upgrades.workforce?.team?.cocinero,order.map(id=>({station:stationOf(id),complex:ITEMS[id].prep>=2})));
  return t;
}

export function slotOf(who){ return Game.slots.find(s=>s.who===who); }

export function startPart(c, slot){if(!slot||floorAway(slot.who))return false;
  if(!servable(c) || !slot || slot.cust) return false;
  const pend = pendingIdx(c);
  let take = slot.station==='all' ? pend : pend.filter(i=>stationOf(c.order[i])===slot.station);
  let penalty = 1;
  if(!take.length){ take = pend; penalty = 1.6; }
  const P = PERSONALITIES[c.personality] || PERSONALITIES.tranquilo;
  for(const i of take){
    if(Game.stock[c.order[i]]>0) continue;
    if(P.flex && c.subs[i]===undefined){
      const sub = chooseSubstitute(c, c.order[i]);
      c.subs[i]=sub;
      if(sub){ c.order[i]=sub; announceSub(c, sub); }
    }
  }
  const avail = take.filter(i=>Game.stock[c.order[i]]>0);
  for(const i of take){ if(Game.stock[c.order[i]]<=0){ c.itemSt[i]=3; c.missing++; const id=c.order[i]; Game.dayStats.stockOuts[id]=(Game.dayStats.stockOuts[id]||0)+1; } }
  if(!avail.length){ Game.floaters.push({x:c.x,y:c.y-120,text:c.subs&&Object.values(c.subs).includes(null)?'No queda nada parecido':'No queda',t:0,color:'#ffd9cf'}); checkComplete(c); updateStockbar(); return true; }
  for(const i of avail){ Game.stock[c.order[i]]--; c.itemSt[i]=1; }
  if(c.patience<=0 || c.anger===3){ c.patience=Math.max(c.patience, c.maxPatience*0.3); c.anger=Math.min(c.anger,1); c.angerT=0; c.graceT=null; }
  c.inPrep++; c.state='prep';
  if(c.tServe==null) c.tServe=Game.t;
  slot.cust=c; slot.items=avail; slot.t=0;
  slot.total = prepTime(avail.map(i=>c.order[i])) * penalty * (slot.who==='yeray'?1.15*factor(Game.upgrades.workforce?.team?.camarero,avail.map(i=>({station:stationOf(c.order[i]),complex:ITEMS[c.order[i]].prep>=2}))):1);
  slot.chefHelp=!!Game.staff.cocinero&&!floorAway('carmela');slot.cover = penalty>1;
  if(avail.some(i=>stationOf(c.order[i])==='cocina')) Audio.sizzle(); else Audio.start();
  updateStockbar();
  return true;
}

export function finishSlot(slot){
  const c=slot.cust; slot.cust=null; if(!c) return;
  if(slot.chefHelp)Game.dayStats.staffPrepared=(Game.dayStats.staffPrepared||0)+slot.items.length; c.inPrep--; c.partT[slot.who]=Game.t;
  const by = Game.dayStats.by[slot.who] || (Game.dayStats.by[slot.who]={items:0,rev:0,clean:0});
  for(const i of slot.items){ c.itemSt[i]=2; const id=c.order[i]; c.served.push(id); by.items++; by.rev+=Game.prices[id]; }
  slot.items=[];
  if(pendingIdx(c).length && c.state==='prep') Audio.start();
  checkComplete(c);
}

export function checkComplete(c){
  if(c.inPrep>0 || pendingIdx(c).length) return;
  if(c.served.length===0){
    c.state='leave'; c.mood='nohay'; c.moodT=3; leaveQueue(c);
    Game.dayStats.lostStock++; Game.dayStats.lost++;
    recordVisit(c,{lost:'sinStock'});
    regularOutcome(c,0);
    addSat(0.1); Audio.angry(); return;
  }
  if(c.floorTableId!=null){c.state='floorReady';return;}if(c.missing) Game.dayStats.partial++;
  completeOrder(c);
}

export function payAndSeat(c, total, s, t){
  c.sat=clamp(s,0,1); addSat(c.sat);
  charge(c,total, c.syncTip);
  c.tResolve=Game.t; recordVisit(c,{table:true,total});
  t.state='busy'; t.cust=c; c.table=t; c.state='toTable'; c.act='walk'; c.actT=0;
  const side = rnd()<0.5?-1:1;
  c.exemptTable=t;
  navSetTarget(c, t.x+side*38, t.y+8, {x:t.x+side*38, y:t.y+46});
  c.eatT=rand(9,15);
  if(c.sat>0.8){ c.mood='feliz'; c.moodT=2; c.moodTxt=null; }
  else if(c.sat<0.45){ c.mood='meh'; c.moodT=2.5; c.moodTxt=null; }
  if(Audio && Audio.voiceThanks){
    const pan = Math.max(-1, Math.min(1, ((c.x || 650) - 650) / 450));
    Audio.voiceThanks(pan);
  }
}

export function payAndGo(c, total, s, upset){
  c.sat=clamp(s,0,1); addSat(c.sat);
  charge(c,total,false);
  c.tResolve=Game.t; recordVisit(c,{table:false, takeaway:true, upset:!!upset, total});
  Game.dayStats.noTable++;
  c.state='leave'; c.act = c.sat>0.6?'bye':'walk'; c.actT=0;
  c.mood='llevar'; c.moodT=3.5;
  const P=PERSONALITIES[c.personality]||PERSONALITIES.tranquilo;
  c.moodTxt = P.takeaway==='prefiere' ? '¡Para llevar, genial!' : upset ? '¡Ni mesa! Para llevar…' : 'Para llevar, gracias';
  leaveQueue(c);
  const pan = Math.max(-1, Math.min(1, ((c.x || 650) - 650) / 450));
  if(c.sat > 0.45 && Audio && Audio.voiceThanks) Audio.voiceThanks(pan);
  else if(Audio && Audio.voiceGrumble) Audio.voiceGrumble(pan);
}

export function completeOrder(c){
  if(c.orderCompleted) return;
  c.orderCompleted=true;
  let total=0; for(const id of c.served){ total+=(c.floorPrices?.[id]??Game.prices[id]); Game.dayStats.sold[id]=(Game.dayStats.sold[id]||0)+1; }
  const qualityTip=Math.max(0,c.preparedBonus||0);
  total+=qualityTip;
  c.qualityTip=qualityTip;
  c.tDone=Game.t;
  let sync=false, syncTip=0;
  if(isCoop() && c.partT.p1!=null && c.partT.p2!=null && Math.abs(c.partT.p1-c.partT.p2)<=2.5){
    sync=true; syncTip=total*0.15; total+=syncTip; Game.dayStats.tips+=syncTip; Game.dayStats.combos++;
  }
  const T=TYPES[c.type];
  const waitFrac = 1 - clamp(c.patience/c.maxPatience,0,1);
  let priceF=0; for(const id of c.served) priceF += Math.max(0, Game.prices[id]/ITEMS[id].ref - 1)/T.maxRatio; priceF/=c.served.length;
  const cheap = c.served.reduce((a,id)=>a+Math.max(0,1-Game.prices[id]/ITEMS[id].ref),0)/c.served.length;
  const dirty = Game.tables.filter(t=>t.state==='dirty').length;
  let s=satisfaction({wait:waitFrac,price:priceF,missing:!!c.missing,dirty,cheap,music:!!lvl('altavoz'),sync});
  c.dirtySeen=dirty;
  c.priceF=priceF;
  const P=PERSONALITIES[c.personality]||PERSONALITIES.tranquilo;
  let pTip=0;
  if(c.personality==='generoso') pTip=total*P.tipP;
  if(c.personality==='exigente' && s>0.85) pTip=total*P.tipP;
  if(pTip>0.01){ total+=pTip; Game.dayStats.tipsP=(Game.dayStats.tipsP||0)+pTip; Game.floaters.push({x:c.x,y:c.y-190,text:'Propina +'+eur2(pTip),t:0,color:'#ffd36b'}); }
  c.syncTip=sync; c.tipped = sync || pTip>0.01 || qualityTip>0; c.tipAmt = syncTip + Math.max(0,pTip) + qualityTip;
  const freeTables = Game.tables.filter(t=>t.state==='free');
  const free = c.floorTableId!=null?Game.tables[c.floorTableId]:(freeTables.length ? freeTables[Math.floor(rnd()*freeTables.length)] : null);
  if(free){payAndSeat(c,total,s,free);if(c.floorTableId!=null){c.state='eat';c.path=null;c.x=free.x+(free.x>1150?-38:38);c.y=free.y+8;c.tx=c.x;c.ty=c.y;}return;}
  if(P.takeaway==='mesa'){
    c.totalDue=total; c.sat=clamp(s,0,1); c.state='waitTable'; c.waitT=0;
    c.mood='mesa'; c.moodT=2.5;
    c.moodTxt='¿Mesa libre, por favor?';
    return;
  }
  s -= (P.takeaway==='prefiere'?0:0.05);
  payAndGo(c,total,s,false);
}

export function giveUpPending(c){ pendingIdx(c).forEach(i=>{ c.itemSt[i]=3; c.missing++; }); checkComplete(c); }

export function cleanTable(t,auto,who){return requestFloorClean(t,who||'p1',!!auto); }

export function commitClean(t,auto,who){
  if(!t || t.state!=='dirty') return;
  t.state='free'; t.dirtyT=0; Game.dayStats.cleaned++;
  const key=who||'p1';const b=Game.dayStats.by[key]||(Game.dayStats.by[key]={items:0,rev:0,clean:0});b.clean++;
  if(Game.service3D && !auto) addDirtyUnit(Game,key);
  cleanFx(t);
  if(hostLive()) Net.events.push({e:'clean',i:Game.tables.indexOf(t),snd:!auto});
  if(!auto) Audio._raw.clean();
}

export function cleanFx(t){ for(let i=0;i<10;i++) Game.particles.push({x:t.x+rand(-18,18),y:t.y-6,vx:rand(-28,28),vy:rand(-45,-12),t:0,life:0.7,color:'#bfefff'}); }

export function tryServe(c, who='p1'){if(c&&['floorWaitEscort','floorMenu','floorReady'].includes(c.state))return requestFloorCustomer(c,who);
  const slot=slotOf(who); if(!slot || !servable(c)) return false;
  if(slot.cust){ Game.floaters.push({x:c.x,y:c.y-120,text:'Un momento…',t:0,color:'#fff6e6'}); return false; }
  return startPart(c, slot);
}

export function completeFloorOrder(c){if(!c||c.floorPaid||c.state!=='floorReady')return;c.floorPaid=true;if(c.missing)Game.dayStats.partial++;completeOrder(c);}

export function abandonFloor(c){if(c.floorAbandoned||c.floorPaid)return;c.floorAbandoned=true;releaseFloorCustomer(c);c.state='leave';leaveQueue(c);Game.dayStats.lost++;Game.dayStats.lostPatience++;recordVisit(c,{lost:'espera'});addSat(0);}
