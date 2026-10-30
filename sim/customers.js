/* Mechanical extraction from sim.js; declaration bodies are unchanged. */
import { releaseFloorCustomer } from "../floor-service.js?v=28.17.3-flat-sand";
import { ITEMS } from "../config.js?v=28.17.3-flat-sand";
import { PKEYS } from "../config.js?v=28.17.3-flat-sand";
import { QUEUE_SPOTS } from "../config.js?v=28.17.3-flat-sand";
import { REGULARS } from "../config.js?v=28.17.3-flat-sand";
import { SEC_PER_HOUR } from "../config.js?v=28.17.3-flat-sand";
import { TYPES } from "../config.js?v=28.17.3-flat-sand";
import { W } from "../config.js?v=28.17.3-flat-sand";
import { WEATHER } from "../config.js?v=28.17.3-flat-sand";
import { stationOf } from "../config.js?v=28.17.3-flat-sand";
import { who } from "../config.js?v=28.17.3-flat-sand";
import { clamp } from "../util.js?v=28.17.3-flat-sand";
import { pickW } from "../util.js?v=28.17.3-flat-sand";
import { rand } from "../util.js?v=28.17.3-flat-sand";
import { rnd } from "../util.js?v=28.17.3-flat-sand";
import { Game } from "../state.js?v=28.17.3-flat-sand";
import { activeItems } from "../state.js?v=28.17.3-flat-sand";
import { closeHour } from "../state.js?v=28.17.3-flat-sand";
import { isCoop } from "../state.js?v=28.17.3-flat-sand";
import { isWeekend } from "../state.js?v=28.17.3-flat-sand";
import { itemUnlocked } from "../state.js?v=28.17.3-flat-sand";
import { lvl } from "../state.js?v=28.17.3-flat-sand";
import { simProgressDay } from "../state.js?v=28.17.3-flat-sand";
import { setTimeoutGame } from "../state.js?v=28.17.3-flat-sand";
import { weatherToday } from "../state.js?v=28.17.3-flat-sand";
import { QUEUE_POS } from "../world.js?v=28.17.3-flat-sand";
import { custSeq } from "../world.js?v=28.17.3-flat-sand";
import { genLook } from "../world.js?v=28.17.3-flat-sand";
import { navSetTarget } from "../nav.js?v=28.17.3-flat-sand";
import { recordVisit } from "../report.js?v=28.17.3-flat-sand";
import { difficultyProfile } from "./season.js?v=28.17.3-flat-sand";

export function spawnCustomer(forceType, opts){
  const difficulty=difficultyProfile();
  const w = WEATHER[weatherToday()] || WEATHER.sol;
  let mix = {turista:0.45, local:0.35, surfista:0.2};
  for(const k in w.mix) mix[k]*=w.mix[k];
  if(isWeekend(simProgressDay())) mix.local*=1.6;
  if(Game.dayEvent && Game.dayEvent.mix) for(const k in Game.dayEvent.mix) mix[k]*=Game.dayEvent.mix[k];
  if(Game.mods.mix) for(const k in Game.mods.mix) mix[k]*=Game.mods.mix[k];
  const type = (opts && opts.regular) ? opts.regular.type : (forceType || pickW(mix));
  const T = TYPES[type];
  const fromRight = rnd()<0.75;
  const regular = opts && opts.regular ? opts.regular : null;
  const personality = regular ? regular.personality : PKEYS[Math.floor(rnd()*PKEYS.length)];
  const look = regular ? regular.look : genLook(type);
  const c = {id:++custSeq.id, type, x: fromRight? W+40 : -40, y: rand(684,702), state:'arrive', speed:rand(95,125), fromRight,
    shirt:look.shirt, skin:look.skin, look, personality, regular,
    order:[], patience:0, maxPatience:0, spot:-1, bob:rnd()*6, mood:null, moodT:0, moodTxt:null, tx:0, ty:0, table:null, eatT:0, waited:0, tag:null,
    act:'walk', actT:0, anger:0, angerT:0, graceT:null, subs:{}, walkPhase:0, stridePh:0,
    hat: look.hat || null};
  if(Game.dayStats){
    let nm=who(type), tries=0;
    while(Game.dayStats.usedNames.has(nm) && tries++<4) nm=who(type);
    Game.dayStats.usedNames.add(nm);
    c.revName=nm;
  }
  c.speed *= (0.9 + look.walk.stride*0.15);
  if(regular){
    c.regLoyalty=Game.regulars[regular.id].loyalty;
    Game.regVisited[regular.id]='spawned';
    Game.floaters.push({x:clamp(c.x,60,W-60),y:c.y-90,text:(Game.regulars[regular.id].loyalty>1?'¡Hola otra vez, ':'¡Hola, ')+regular.name+'!',t:0,color:'#ffe9a8'});
  }
  const items = activeItems().filter(id=>Game.stock[id]>0 || rnd()<0.5);
  const drinks = ['cerveza','barraquito','batido'];
  const weights = {};
  for(const id of activeItems()){
    const ratio = Game.prices[id]/ITEMS[id].ref;
    if(ratio > T.maxRatio) continue;
    let wv = T.pref[id] * Math.pow(1/ratio, T.elas*2);
    if(drinks.includes(id)) wv *= w.drinks;
    if(id==='cerveza' && lvl('nevera')) wv*=1.25;
    if(Game.mods.beer && id==='cerveza') wv*=2;
    if(isCoop() && stationOf(id)==='cocina') wv*=1.7;
    weights[id]=wv;
  }
  if(regular && itemUnlocked(regular.fav)){
    weights[regular.fav]=(weights[regular.fav]||1)+8;
  }
  const keys = Object.keys(weights);
  const avgRatio = activeItems().reduce((s,id)=>s+Game.prices[id]/ITEMS[id].ref,0)/Math.max(1,activeItems().length);
  const priceDeter = clamp((avgRatio-1)*T.elas*0.55,0,0.9);
  if(keys.length===0 || rnd()<priceDeter){
    c.state='walkby'; c.mood='caro'; c.moodT=3; navSetTarget(c, fromRight? -60 : W+60, 690); c.y=rand(684,700);
    Game.dayStats.lostPrice++; Game.dayStats.lost++; recordVisit(c,{lost:'caro'}); if(regular) regularOutcome(c,0);
    Game.customers.push(c); return;
  }
  const n = rnd()<clamp(T.two+difficulty.doubleBonus,0.2,0.85)?2:1;
  const pool = {...weights};
  if(regular && itemUnlocked(regular.fav)){ c.order.push(regular.fav); delete pool[regular.fav]; }
  for(let i=c.order.length;i<n && Object.keys(pool).length;i++){ const k=pickW(pool); c.order.push(k); delete pool[k]; }
  if(isCoop() && c.order.length===1 && rnd()<difficulty.mixedChance){
    const other = Object.keys(weights).filter(k=>stationOf(k)!==stationOf(c.order[0]));
    if(other.length){ const sub={}; other.forEach(k=>sub[k]=weights[k]); c.order.push(pickW(sub)); }
  }
  if(c.order.length===2 && rnd()<difficulty.tripleChance){
    const remaining={};
    for(const id of Object.keys(weights)) if(!c.order.includes(id)) remaining[id]=weights[id];
    if(Object.keys(remaining).length) c.order.push(pickW(remaining));
  }
  c.itemSt = c.order.map(()=>0); c.served=[]; c.missing=0; c.inPrep=0; c.partT={}; c.menuDur=rand(1.4,2.4); c.asked=c.order.slice();
  const taken = new Set(Game.customers.filter(o=>o.spot>=0).map(o=>o.spot));
  let spot=-1; for(let i=0;i<QUEUE_SPOTS;i++) if(!taken.has(i)){ spot=i; break; }
  if(spot<0){
    c.state='walkby'; c.mood='lleno'; c.moodT=3; navSetTarget(c, fromRight? -60 : W+60, 690); c.y=rand(684,700);
    Game.dayStats.lostQueue++; Game.dayStats.lost++; recordVisit(c,{lost:'lleno'}); if(regular) regularOutcome(c,0);
    Game.customers.push(c); return;
  }
  c.spot=spot; navSetTarget(c, QUEUE_POS[spot].x, QUEUE_POS[spot].y, {x:QUEUE_POS[spot].x, y:QUEUE_POS[spot].y+46});
  const dirty = Game.tables.filter(t=>t.state==='dirty').length;
  c.maxPatience = T.patience * difficulty.patience * (c.order.length>2?1.12:1) * (lvl('altavoz')?1.25:1) * (1 - Math.min(0.3,dirty*0.06)) * rand(0.85,1.15);
  c.patience = c.maxPatience;
  Game.customers.push(c);
}

export function regularOutcome(c, sat){
  if(!c.regular || c.regDone) return;
  c.regDone=true;
  const rec=Game.regulars[c.regular.id]; if(!rec) return;
  if(Game.dayStats) Game.dayStats.regVisits=(Game.dayStats.regVisits||0)+1;
  const d = sat>=0.7?1 : sat<=0.35?-1 : 0;
  rec.loyalty=clamp(rec.loyalty+d,0,5); rec.visits++;
  rec.next=Game.day+clamp(6-rec.loyalty,2,6)+Math.floor(rnd()*2);
  if(d>0) Game.floaters.push({x:c.x,y:c.y-165,text:'★ '+c.regular.name+' más fiel',t:0,color:'#ffd36b'});
  else if(d<0) Game.floaters.push({x:c.x,y:c.y-165,text:c.regular.name+' defraudado',t:0,color:'#ffb0a0'});
}

export function scheduleRegulars(){
  if(simProgressDay()<=2) return;
  Game.regVisited={};
  for(const r of REGULARS){
    const rec=Game.regulars[r.id]; if(!rec) continue;
    if(rec.next<=Game.day && !Game.regVisited[r.id]){
      if(!itemUnlocked(r.fav)){ rec.next=Game.day+2; continue; }
      Game.regVisited[r.id]='scheduled';
      const delay = rand(0.2, Math.max(0.5, closeHour()-10.5)) * SEC_PER_HOUR;
      setTimeoutGame(()=>{ if(Game.mode==='service' && Game.regVisited[r.id]==='scheduled') spawnCustomer(null,{regular:r}); }, delay);
    }
  }
}

export function leaveQueue(c){if(c.floorTableId!=null)releaseFloorCustomer(c); c.spot=-1; navSetTarget(c, c.x<W/2 && rnd()<0.3 ? -60 : W+60, rand(660,700)); }
