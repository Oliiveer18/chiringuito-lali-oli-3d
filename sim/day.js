/* Mechanical extraction from sim.js; declaration bodies are unchanged. */
import { beginLedgerDay } from "../bookkeeping.js?v=28.17.3-flat-sand";
import { initFloor } from "../floor-service.js?v=28.17.3-flat-sand";
import { updateFloor } from "../floor-service.js?v=28.17.3-flat-sand";
import { updateFloorCustomer } from "../floor-service.js?v=28.17.3-flat-sand";
import { floorHasWork } from "../floor-service.js?v=28.17.3-flat-sand";
import { abortFloor } from "../floor-service.js?v=28.17.3-flat-sand";
import { ANGER_MIN_STAGE } from "../config.js?v=28.17.3-flat-sand";
import { DRINKS } from "../config.js?v=28.17.3-flat-sand";
import { HOUR_CURVE } from "../config.js?v=28.17.3-flat-sand";
import { PERSONALITIES } from "../config.js?v=28.17.3-flat-sand";
import { SEC_PER_HOUR } from "../config.js?v=28.17.3-flat-sand";
import { SPECIAL_DAYS } from "../config.js?v=28.17.3-flat-sand";
import { W } from "../config.js?v=28.17.3-flat-sand";
import { WAIT_TABLE_MAX } from "../config.js?v=28.17.3-flat-sand";
import { WEATHER } from "../config.js?v=28.17.3-flat-sand";
import { rand } from "../util.js?v=28.17.3-flat-sand";
import { rnd } from "../util.js?v=28.17.3-flat-sand";
import { Audio } from "../audio.js?v=28.17.3-flat-sand";
import { startBeach } from "../beach.js?v=28.17.3-flat-sand";
import { updateBeach } from "../beach.js?v=28.17.3-flat-sand";
import { Game } from "../state.js?v=28.17.3-flat-sand";
import { Net } from "../state.js?v=28.17.3-flat-sand";
import { closeHour } from "../state.js?v=28.17.3-flat-sand";
import { gameTimers } from "../state.js?v=28.17.3-flat-sand";
import { isCoop } from "../state.js?v=28.17.3-flat-sand";
import { isWeekend } from "../state.js?v=28.17.3-flat-sand";
import { lvl } from "../state.js?v=28.17.3-flat-sand";
import { simProgressDay } from "../state.js?v=28.17.3-flat-sand";
import { weatherToday } from "../state.js?v=28.17.3-flat-sand";
import { QUEUE_POS } from "../world.js?v=28.17.3-flat-sand";
import { buildTables } from "../world.js?v=28.17.3-flat-sand";
import { navSetTarget } from "../nav.js?v=28.17.3-flat-sand";
import { navStep } from "../nav.js?v=28.17.3-flat-sand";
import { endDay } from "../report.js?v=28.17.3-flat-sand";
import { recordVisit } from "../report.js?v=28.17.3-flat-sand";
import { setSpeed } from "../ui.js?v=28.17.3-flat-sand";
import { showServiceUI } from "../ui.js?v=28.17.3-flat-sand";
import { toast } from "../ui.js?v=28.17.3-flat-sand";
import { updateHud } from "../ui.js?v=28.17.3-flat-sand";
import { RANDOM_EVENTS } from "./season.js?v=28.17.3-flat-sand";
import { abandonFloor } from "./service.js?v=28.17.3-flat-sand";
import { addSat } from "./economy.js?v=28.17.3-flat-sand";
import { commitClean } from "./service.js?v=28.17.3-flat-sand";
import { completeFloorOrder } from "./service.js?v=28.17.3-flat-sand";
import { difficultyProfile } from "./season.js?v=28.17.3-flat-sand";
import { difficultyRush } from "./season.js?v=28.17.3-flat-sand";
import { repArrivalMult } from "./season.js?v=28.17.3-flat-sand";
import { finishSlot } from "./service.js?v=28.17.3-flat-sand";
import { giveUpPending } from "./service.js?v=28.17.3-flat-sand";
import { leaveQueue } from "./customers.js?v=28.17.3-flat-sand";
import { payAndGo } from "./service.js?v=28.17.3-flat-sand";
import { payAndSeat } from "./service.js?v=28.17.3-flat-sand";
import { pendingIdx } from "./orders.js?v=28.17.3-flat-sand";
import { regularOutcome } from "./customers.js?v=28.17.3-flat-sand";
import { scheduleRegulars } from "./customers.js?v=28.17.3-flat-sand";
import { spawnCustomer } from "./customers.js?v=28.17.3-flat-sand";
import { startPart } from "./service.js?v=28.17.3-flat-sand";
import { createService3D, updateService3D } from "../service-3d-model.mjs";

export function servable(c){return c&&(['floorWaitEscort','floorMenu','floorReady'].includes(c.state)||(['queue','prep','floorWaitingPrep'].includes(c.state)&&pendingIdx(c).length>0));}

export function startDay(){
  Game.service3D=createService3D();
  Game.mode='service'; Game.hour=10; Game.closing=false; Game.closeT=0; Game.spawnAcc=0; Game.spawnThrottleUntil=0;
  Game.customers=[]; Game.floaters=[]; Game.mods={arr:1};
  Game.dayEvent = SPECIAL_DAYS[Game.day]||null;
  Game.eventDone = rnd()>0.45; Game.eventHour = rand(11.5,17.5);
  buildTables(); for(const t of Game.tables){ t.state='free'; t.cust=null; }
  const mk=(who,station)=>({who,station,cust:null,items:[],t:0,total:0,think:0});
  Game.slots=[mk('p1', isCoop()?Net.roles.p1:'all')];
  if(isCoop()) Game.slots.push(mk('p2', Net.roles.p2));
  if(Game.staff.camarero) Game.slots.push(mk('yeray','all'));
  Game.dayStats={revenue:0,served:0,lost:0,lostPrice:0,lostQueue:0,lostPatience:0,lostStock:0,partial:0,noTable:0,satSum:0,satN:0,sold:{},stockOuts:{},hamacas:0,fines:0,urgent:0,purchases:0,repStart:Game.rep,cleaned:0,tips:0,combos:0,tipsP:0,regVisits:0,visits:[],usedNames:new Set(),
    by:{p1:{items:0,rev:0,clean:0},p2:{items:0,rev:0,clean:0},yeray:{items:0,rev:0,clean:0}}};
  Game.dayStats.purchases = Game.pendingPurchases||0;
  Game.pendingPurchases = 0;beginLedgerDay();
  initFloor({clean:commitClean,prepare:startPart,deliver:completeFloorOrder,abandon:abandonFloor});
  startBeach();
  scheduleRegulars();
  Net.ready={p1:false,p2:false};
  showServiceUI();
  if(Game.speed===0) Game.speed=1;
  setSpeed(Game.speed||1);
  if(Game.dayEvent) toast(Game.dayEvent.title, Game.dayEvent.desc, 'good');
  Audio.init();
}

export function update(dt){
  if(!Number.isFinite(dt)||dt<=0||(Game.mode==='service'&&Game.speed===0)) return;
  Game.t += dt;
  if(Game.mode!=='service') { updateAmbient(dt); return; }
  updateService3D(Game,dt);
  for(let i=gameTimers.length-1;i>=0;i--){ gameTimers[i].t-=dt; if(gameTimers[i].t<=0){ const f=gameTimers[i].fn; gameTimers.splice(i,1); f(); } }
  updateFloor(dt);
  updateBeach();
  const prevHour=Game.hour;
  if(!Game.closing){
    Game.hour += dt/SEC_PER_HOUR;
    const w = WEATHER[weatherToday()] || WEATHER.sol;
    let mult = w.arr*repArrivalMult()*Game.mods.arr;
    if(lvl('sombrillas')&&(weatherToday()==='sol'||weatherToday()==='calima')) mult*=1.15;
    if(lvl('redes')) mult*=1.15;
    if(isWeekend(simProgressDay())) mult*=1.25;
    if(Game.dayEvent) mult*=Game.dayEvent.arr;
    mult=Math.min(mult,2.2);
    let rate=8*(HOUR_CURVE[Math.floor(Game.hour)]||0.6)*mult;
    rate*=difficultyProfile().arrivals*difficultyRush(Game.hour);
    if(isCoop()) rate*=1.4;
    rate*=1+0.12*(Game.buzz||0);
    if(simProgressDay()<=2) rate=Math.min(rate,20);
    const counterQueue=Game.customers.filter(c=>['arrive','queue','prep'].includes(c.state)).length;
    if(counterQueue>=5) Game.spawnThrottleUntil=Math.max(Game.spawnThrottleUntil||0, Game.t+30);
    if(Game.spawnThrottleUntil && Game.t<Game.spawnThrottleUntil) rate*=0.5;
    rate=Math.min(rate,30);
    Game.spawnAcc += rate*dt/SEC_PER_HOUR;
    while(Game.spawnAcc>=1){ Game.spawnAcc-=1; spawnCustomer(); }
    if(!Game.eventDone && Game.hour>=Game.eventHour && simProgressDay()>2){ Game.eventDone=true; let e=RANDOM_EVENTS[0]; const tot=RANDOM_EVENTS.reduce((s,e)=>s+e.w,0); let r=rnd()*tot; for(const ev of RANDOM_EVENTS){ r-=ev.w; if(r<=0){e=ev;break;} } e.run(); }
    if(Game.hour>=closeHour()){ Game.hour=closeHour(); beginClosing(); }
    if(Math.floor(prevHour)!==Math.floor(Game.hour)) updateHud();
  } else {
    Game.closeT+=dt;
    for(const c of Game.customers) if(c.floorTableId==null&&c.state==='prep' && c.inPrep===0 && pendingIdx(c).length) giveUpPending(c);
    const busy = Game.customers.some(c=>c.state!=='gone')||floorHasWork();
    if(Game.closeT>3.5 && (!busy || Game.closeT>45)){ abortFloor();endDay(); return; }
  }
  Game.slots.forEach(s=>{
    if(s.cust){ s.t+=dt; if(s.t>=s.total) finishSlot(s); }
    else if(s.who==='yeray' && !Game.closing){
      s.think=(s.think||0)+dt;
      if(s.think>0.5){ s.think=0;
        const busy = new Set(Game.slots.filter(o=>o.cust).map(o=>o.cust));
        const q = Game.customers.filter(c=>servable(c) && !busy.has(c)).sort((a,b)=>Game.upgrades.workforce?.priority?.camarero==='arrival'?(a.tQueue??a.id)-(b.tQueue??b.id):a.patience-b.patience);
        if(q.length) startPart(q[0], s);
      }
    }
  });
  const inLine = Game.customers.filter(c=>c.spot>=0).sort((a,b)=>a.spot-b.spot);
  inLine.forEach((c,i)=>{ if(c.spot!==i){ c.spot=i; navSetTarget(c, QUEUE_POS[i].x, QUEUE_POS[i].y, {x:QUEUE_POS[i].x, y:QUEUE_POS[i].y+46}); } });
  function angerUpdate(c, dt, drainMul){
    const P=PERSONALITIES[c.personality]||PERSONALITIES.tranquilo;
    c.patience -= dt*drainMul*P.patMul;
    c.angerT += dt;
    const frac = c.patience/c.maxPatience;
    if(c.anger<3){
      const want = frac<P.stages[2]?3 : frac<P.stages[1]?2 : frac<P.stages[0]?1 : 0;
      if(want>c.anger && c.angerT>=ANGER_MIN_STAGE){
        c.anger=want; c.angerT=0;
        if(want===3 && !c.protested){
          c.protested=true; Audio.protest();
          if(Audio.voiceGrumble) {
            const pan = Math.max(-1, Math.min(1, ((c.x || 650) - 650) / 450));
            Audio.voiceGrumble(pan);
          }
        }
      }
    }
    if(c.patience<=0){
      if(c.anger<3){ c.anger=3; c.angerT=0; if(!c.protested){ c.protested=true; Audio.protest(); } }
      c.graceT = (c.graceT==null? P.grace : c.graceT) - dt;
      return c.graceT<=0;
    }
    return false;
  }
  for(const c of Game.customers){
    c.bob += dt*8;
    if(c.moodT>0){ c.moodT-=dt; if(c.moodT<=0){ c.mood=null; c.moodTxt=null; } }
    if(c.floorTableId!=null&&!['eat','leave','walkby','gone'].includes(c.state)){updateFloorCustomer(c,dt);continue;}
    switch(c.state){
      case 'arrive': {
        const sp=QUEUE_POS[c.spot];
        if(sp && Math.hypot(c.x-sp.x,c.y-sp.y)<16){
          c.x=sp.x; c.y=sp.y; c.path=null; c.movingSpd=0;
          c.state='queue'; c.act='menu'; c.actT=0; c.tQueue=Game.t;
        } else if(navStep(c,dt,1.3)){ c.state='queue'; c.act='menu'; c.actT=0; c.tQueue=Game.t; }
        c.patience-=dt*0.3*(PERSONALITIES[c.personality]||PERSONALITIES.tranquilo).patMul;
        if(c.patience<=0){
          c.state='leave';c.act='walk';c.tLeave=Game.t;
          leaveQueue(c);Game.dayStats.lostPatience++;Game.dayStats.lost++;
          recordVisit(c,{lost:'espera'});regularOutcome(c,0);addSat(0);
        }
        break;
      }
      case 'queue': {
        const sp=QUEUE_POS[c.spot];
        if(sp && Math.hypot(c.x-sp.x,c.y-sp.y)<6){
          c.x=sp.x; c.y=sp.y; c.path=null; c.movingSpd=0;
        } else {
          navStep(c,dt,1);
        }
        c.waited+=dt; c.actT+=dt;
        if(c.act==='menu' && c.actT>c.menuDur){
          c.act='order'; c.actT=0;
          if(c.spot===0 && Audio && Audio.voiceGreet) {
            const pan = Math.max(-1, Math.min(1, ((c.x || 650) - 650) / 450));
            Audio.voiceGreet(pan);
          }
        }
        else if(c.act==='order' && c.actT>0.9){ c.act='wait'; c.actT=0; }
        if(Game.closing){ c.state='leave'; c.act='walk'; leaveQueue(c); break; }
        if(angerUpdate(c,dt,1)){ c.state='leave'; c.act='walk'; c.mood='enfado'; c.moodT=3; c.moodTxt='¡Me largo!'; leaveQueue(c); c.tLeave=Game.t; Game.dayStats.lostPatience++; Game.dayStats.lost++; recordVisit(c,{lost:'espera'}); regularOutcome(c,0); addSat(0); Audio.angry(); }
        break;
      }
      case 'prep':
        navStep(c,dt,1); c.actT+=dt;
        if(c.act!=='wait' && c.act!=='lookAround' && c.act!=='watch' && c.act!=='protest'){ c.act='wait'; c.actT=0; }
        if(c.inPrep===0 && pendingIdx(c).length){
          if(angerUpdate(c,dt,0.6)){ c.mood='enfado'; c.moodT=2.5; c.moodTxt='¡No espero más!'; giveUpPending(c); }
        }
        break;
      case 'toTable': if(navStep(c,dt,1)){ c.state='eat'; c.act = c.served && c.served.some(id=>DRINKS.includes(id)) ? 'drink':'eat'; c.actT=0; } break;
      case 'eat': {
        c.eatT-=dt*(Game.closing?4:1); c.actT+=dt;
        const hasDrink = c.served.some(id=>DRINKS.includes(id));
        const hasFood = c.served.some(id=>!DRINKS.includes(id));
        const dur = c.act==='drink'?2.0:3.0;
        if(c.actT>dur){ c.act = c.act==='drink' ? (hasFood?'eat':'drink') : (hasDrink?'drink':'eat'); c.actT=0; }
        if(c.eatT<=0){ const t=c.table; t.cust=null; t.state= rnd()<0.75?'dirty':'free'; t.dirtyT=0; c.table=null; c.state='leave'; c.act = c.sat>0.6?'bye':'walk'; c.actT=0; navSetTarget(c, rnd()<0.8?W+60:-60, rand(660,700)); }
        break;
      }
      case 'waitTable': {
        c.waitT+=dt; c.actT+=dt;
        const free = Game.tables.find(t=>t.state==='free');
        if(free){ payAndSeat(c, c.totalDue, c.sat, free); }
        else if(c.waitT>WAIT_TABLE_MAX || Game.closing){ payAndGo(c, c.totalDue, c.sat-0.2, true); }
        break;
      }
      case 'leave': case 'walkby': if(navStep(c,dt, c.state==='walkby'?1:1.2)) c.state='gone'; break;
    }
  }
  Game.customers = Game.customers.filter(c=>c.state!=='gone');
  for(const t of Game.tables)if(t.state==='dirty')t.dirtyT+=dt;
  updateAmbient(dt);
  hud.tick+=dt; if(hud.tick>0.25){ hud.tick=0; updateHud(); }
}

export const hud={tick:0};

export function updateAmbient(dt){
  for(const f of Game.floaters) f.t+=dt; Game.floaters=Game.floaters.filter(f=>f.t<1.4);
  for(const p of Game.particles){ p.t+=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=200*dt; } Game.particles=Game.particles.filter(p=>p.t<p.life);
}

export function beginClosing(){
  if(Game.closing) return; Game.closing=true; Game.closeT=0;
  toast('Hora de cerrar','Los últimos clientes terminan y recoges la barra.','');
}
