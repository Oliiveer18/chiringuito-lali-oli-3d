/* Mensajes, snapshot y estado del invitado. Lo importa net.js. */
import { floorCommand } from './floor-service.js?v=28.17.0-online-web';
import { $, clamp, escapeHtml } from './util.js?v=28.17.0-online-web';
import { Audio } from './audio.js?v=28.17.0-online-web';
import { Game, Net, guestCust, hostLive, isGuest } from './state.js?v=28.17.0-online-web';
import { TABLE_POS } from './world.js?v=28.17.0-online-web';
import { cleanFx, cleanTable, hud, newSeason, servable, slotOf, tryServe } from './sim.js?v=28.17.0-online-web';
import { applyRevResp, refreshReportUI, revSigOf, showReportUI } from './report.js?v=28.17.0-online-web';
import { Plan, applyPlanAction, applyUrgent, refreshPlanMoney, renderForecast, renderTab, renderUrgent, setSpeed, showFinalUI, showPlan, showPlanUI, showServiceUI, toastLocal, toggleReady, updateHud, updateReadyUI, updateStockbar } from './ui.js?v=28.17.0-online-web';
import { REJECT_MSG, guestPendTick } from './net-guest.js?v=28.17.0-online-web';
import { netDirty, netSend } from './net-link.js?v=28.17.0-online-web';
import { hideNetMsg, lobbyError, netLost, renderLobby, showPing } from './net-lobby.js?v=28.17.0-online-web';
import { applyService3DCommand } from './service-3d.js';
import { service3D, createService3D } from './service-3d-model.mjs';
import { acceptGuestPose3D } from './net-movement-3d.js';
export function onNet(m){
  switch(m.t){
    case 'created': Net.role='host'; Net.me='p1'; Net.code=m.code; renderLobby(); break;
    case 'joined': Net.role='guest'; Net.me='p2'; Net.code=m.code; netSend({t:'hello', name:Net.names.p2}); renderLobby(); break;
    case 'error': lobbyError(m.msg); break;
    case 'peer':
      Net.peer=m.on;
      if(m.on){ toastLocal('Conectado', 'Tu pareja ya está en la partida.', 'good'); hideNetMsg(); if(Game.mode==='service' && Net.pausedByDrop){ Net.pausedByDrop=false; setSpeed(1); } }
      else { if(Game.mode==='service' && Game.speed){ setSpeed(0); Net.pausedByDrop=true; } netLost(`${escapeHtml(Net.names[Net.me==='p2'?'p1':'p2'])} se ha desconectado. Puede volver a entrar con el código <b>${Net.code}</b>.`, true); }
      renderLobby(); netDirty(); break;
    case 'closed': netLost('Tu pareja ha cerrado la partida.'); break;
    case 'hello': if(Net.role==='host'){ Net.names.p2 = String(m.name||'Jugador 2').slice(0,14); renderLobby(); netDirty(); } break;
    case 'act': if(Net.role==='host') applyAct(m); break;
    case 'state': if(Net.role==='guest') applyState(m); break;
  }
}
export function applyAct(m){
  const who='p2';
  switch(m.a){case 'floor':floorCommand(m.command,who);break;
    case 'move3d': acceptGuestPose3D(m); break;
    case 'service3d': {
      if(Game.mode!=='service'||m.serviceId!==Game.floor?.id||!Number.isSafeInteger(m.q)||m.q<1){
        pushAck(m.q,false,'service3d'); break;
      }
      const commands=service3D(Game).commands, previous=commands[who];
      if(previous && m.q<=previous.q){
        pushAck(m.q,m.q===previous.q&&previous.ok,'service3d'); break;
      }
      const ok=applyService3DCommand(m.command,who);
      commands[who]={q:m.q,ok};
      pushAck(m.q,ok,'service3d');
      break;
    }
    case 'serve': {
      const c=Game.customers.find(o=>o.id===m.id);
      const slot=slotOf(who);
      let ok=false, why='gone';
      if(Game.mode==='service' && Game.speed&&m.serviceId===Game.floor?.id){
        if(c && servable(c)){
          if(slot&&(slot.cust||slot.floorBusy)&&!['floorWaitEscort','floorMenu','floorReady'].includes(c.state)) why='busy';
          else { ok=tryServe(c,who); if(!ok) why=(slot&&slot.cust)?'busy':'gone'; }
        }
      }
      pushAck(m.q, ok, why);
      break;
    }
    case 'clean': {
      let ok=false, why='gone';
      if(Game.mode==='service'&&m.serviceId===Game.floor?.id){
        const t=Game.tables[m.i];
        if(t && t.state==='dirty'){ ok=!!cleanTable(t,false,who); }
        else why='clean';
      }
      pushAck(m.q, ok, why);
      break;
    }
    case 'plan': applyPlanAction(who, m.d||{}); break;
    case 'ready': toggleReady(who); break;
    case 'speed': if(Game.mode==='service'){ setSpeed(clamp(m.v|0,0,3)); if(m.v===0) toastLocal('Pausa', `${escapeHtml(Net.names.p2)} ha pausado el juego.`, ''); } break;
    case 'urgent': applyUrgent(m.id, who); break;
    case 'revresp': applyRevResp(m.vid|0, m.kind, who, m.day|0); break;
    case 'ping': showPing(who, m.k); break;
    case 'again': if(Game.mode==='final'){ newSeason(); Plan.tab='compras'; showPlan(); } break;
    case 'name': Net.names.p2=String(m.name||'').slice(0,14)||'Jugador 2'; renderLobby(); break;
  }
  netDirty();
}
export function pushAck(q, ok, why){ if(q==null) return; Net.acks.push({q, ok:!!ok, why:why||''}); }
export function snapshot(){
  const o = { t:'state', mode:Game.mode, day:Game.day, money:Game.money, rep:Game.rep, hour:Game.hour, speed:Game.speed, closing:Game.closing,
    stock:Game.stock, prices:Game.prices, enabled:Game.enabled, upgrades:Game.upgrades, staff:Game.staff, forecast:Game.forecast, season:Game.season, buzz:Game.buzz,
    names:Net.names, roles:Net.roles, ready:Net.ready, ev:Net.events.splice(0), acks:Net.acks.splice(0) };
  if(Game.mode==='service'){
    o.service3D=service3D(Game); o.time=Game.t;
    o.floor=Game.floor?{...Game.floor,events:[],tasks:Game.floor.tasks.map(t=>({...t,path:[]})),actors:Game.floor.actors.map(a=>({...a,returnPath:[]}))}:null;
    o.cu = Game.customers.map(c=>({i:c.id,x:Math.round(c.x),y:Math.round(c.y),s:c.state,o:c.order,st:c.itemSt,p:+(c.patience/(c.maxPatience||1)).toFixed(3),sp:c.spot,
      m:c.mood,mt:+(c.moodT||0).toFixed(2),mx:c.moodTxt,sh:c.shirt,sk:c.skin,h:c.hat,ty:c.type,d:c.dir||1,sv:c.served,ip:c.inPrep,
      pn:c.personality,lk:c.look,rg:c.regular?c.regular.id:null,nm:c.regular?c.regular.name:null,ly:c.regLoyalty,
      an:c.act,at:+(c.actT||0).toFixed(2),ag:c.anger,sb:Object.keys(c.subs||{}).length?c.subs:null,wt:c.waitT,sat:c.sat,ft:c.floorTableId,fp:c.floorPaid,fr:c.fromRight}));
    o.tb = Game.tables.map(t=>({s:t.state, e: t.cust && t.cust.state==='eat' ? t.cust.served : null}));
    o.sl = Game.slots.map(s=>({w:s.who, c:s.cust?s.cust.id:null, p:s.cust? +(s.t/s.total).toFixed(3):0, cv:!!s.cover, it:s.items||[]}));
    o.fl = Game.floaters.map(f=>({x:Math.round(f.x),y:Math.round(f.y),text:f.text,t:+f.t.toFixed(2),color:f.color}));
  }
  if(Game.mode==='report'||Game.mode==='final') o.ui=Net.ui;
  if(Game.mode==='report'){
    o.revSig=revSigOf(Game.revModel);
    if(Net.revDirty){ o.rev=Game.revModel; o.log=Game.starsLog; Net.revDirty=false; }
  }
  if(Game.mode==='lobby') o.lobby=true;
  return o;
}
export function netTick(dt){
  if(isGuest()) guestPendTick();
  if(!hostLive()) { Net.events.length=0; return; }
  Net.sendT += dt;
  const every = Game.mode==='service' ? 0.16 : 0.6;
  if(Net.sendT>=every){ Net.sendT=0; netSend(snapshot()); }
}
export function applyState(m){
  const prevMode = Net.lastMode;
  Object.assign(Game,{day:m.day, money:m.money, rep:m.rep, hour:m.hour, speed:m.speed, closing:m.closing, stock:m.stock, prices:m.prices, enabled:m.enabled,
    upgrades:m.upgrades, staff:m.staff, forecast:m.forecast, season:m.season, buzz:m.buzz});
  Net.names=m.names; Net.roles=m.roles; Net.ready=m.ready;
  for(const a of (m.acks||[])){
    const p=Net.pend.get(a.q);
    if(!p) continue;
    Net.pend.delete(a.q);
    const ms=performance.now()-p.t0;
    Net.confMs = Net.confMs==null? ms : Net.confMs*0.7+ms*0.3;
    Net.ackLog.push({q:a.q, ok:!!a.ok, at:performance.now()});
    if(Net.ackLog.length>20) Net.ackLog.shift();
    if(!a.ok) toastLocal('Acción no aceptada', REJECT_MSG[a.why]||'El anfitrión no ha podido aplicarla.', 'bad');
  }
  if(m.ready && m.ready[Net.me]) Net.readySent=false;
  Game.mode = m.mode;
  if(m.mode==='service'){Game.floor=m.floor||null;
    Game.service3D=m.service3D||createService3D();
    const lastServiceSequence=Game.service3D.commands?.[Net.me]?.q;
    if(Number.isSafeInteger(lastServiceSequence)) Net.seq=Math.max(Net.seq,lastServiceSequence);
    if(Number.isFinite(m.time)) Game.t=m.time;
    const seen=new Set();
    for(const sc of m.cu){ seen.add(sc.i); let c=guestCust.get(sc.i);
      if(!c){ c={id:sc.i,x:sc.x,y:sc.y,bob:Math.random()*6}; guestCust.set(sc.i,c); }
      Object.assign(c,{gx:sc.x,gy:sc.y,state:sc.s,order:sc.o,itemSt:sc.st,patience:sc.p,maxPatience:1,spot:sc.sp,mood:sc.m,moodT:sc.mt,moodTxt:sc.mx,shirt:sc.sh,skin:sc.sk,hat:sc.h,type:sc.ty,dir:sc.d,served:sc.sv,inPrep:sc.ip,
        personality:sc.pn,look:sc.lk,regular:sc.rg?{id:sc.rg,name:sc.nm}:null,regLoyalty:sc.ly,act:sc.an,actT:sc.at,anger:sc.ag,subs:sc.sb||{},waitT:sc.wt,sat:sc.sat,floorTableId:sc.ft,floorPaid:sc.fp,fromRight:sc.fr});
    }
    for(const k of [...guestCust.keys()]) if(!seen.has(k)) guestCust.delete(k);
    Game.customers=[...guestCust.values()];
    const n=m.tb.length;
    if(Game.tables.length!==n){ Game.tables=[]; for(let i=0;i<n;i++){ const p=TABLE_POS[i]; Game.tables.push({x:p.x,y:p.y,state:'free',cust:null,color:['#e8603c','#f5b82e','#0f8b8d','#3f8a3a'][i%4]}); } }
    m.tb.forEach((t,i)=>{ Game.tables[i].state=t.s; Game.tables[i].cust = t.e? {state:'eat',served:t.e} : null; });
    Game.slots = m.sl.map(s=>({who:s.w, cust:s.c!=null? guestCust.get(s.c)||null : null, t:s.p, total:1, cover:s.cv, items:s.it||[]}));
    Game.floaters = m.fl;
  }
  for(const e of (m.ev||[])){
    if(e.e==='sfx' && Audio._raw[e.n]) Audio._raw[e.n]();
    else if(e.e==='toast') toastLocal(e.title,e.text,e.kind);
    else if(e.e==='clean'){ const t=Game.tables[e.i]; if(t) cleanFx(t); if(e.snd) Audio._raw.clean(); }
    else if(e.e==='ping') showPing(e.from, e.k);
  }
  if(m.ui) Net.ui=m.ui;
  if(m.rev) Game.revModel=m.rev;
  if(m.log) Game.starsLog=m.log;
  if(m.mode!==prevMode){
    Net.lastMode=m.mode; Net.planSig='';
    Net.pend.clear(); Net.readySent=false;
    if(m.mode==='plan'){ Plan.tab=Plan.tab||'compras'; showPlanUI(); }
    else if(m.mode==='service'){ Game.customers=[]; guestCust.clear(); applyState({...m, mode:'service', ev:[]}); showServiceUI(); setSpeed(m.speed); }
    else if(m.mode==='report') showReportUI();
    else if(m.mode==='final') showFinalUI();
    else if(m.mode==='lobby') { renderLobby(); }
  }
  if(m.mode==='plan'){
    const sig = JSON.stringify([m.money,m.stock,m.prices,m.enabled,m.upgrades,m.staff,m.ready,Game.buzz]);
    if(sig!==Net.planSig){ Net.planSig=sig; renderTab(); refreshPlanMoney(); renderForecast(); updateReadyUI(); }
  }
  if(m.mode==='report'){
    if(m.ui && (m.ui.body!==Net.lastBody || (m.revSig||'')!==Net.lastRevSig)) refreshReportUI();
    else updateReadyUI();
  }
  if(m.mode==='service'){ document.querySelectorAll('.speed button').forEach(b=>b.classList.toggle('on', +b.dataset.speed===m.speed)); updateStockbar(); if($('#urgent').classList.contains('show')) renderUrgent(); }
}
export function guestTick(dt){
  Game.t += dt;
  const k = Math.min(1, dt*12);
  for(const c of Game.customers){
    if(c.gx==null) continue;
    const dx=c.gx-c.x, dy=c.gy-c.y; const moving = Math.abs(dx)+Math.abs(dy) > 1.5;
    c.x += dx*k; c.y += dy*k;
    if(moving){ c.bob += dt*8; c.stridePh=(c.stridePh||0)+dt*10*(c.look&&c.look.walk?c.look.walk.stride||1:1); }
    c.actT=(c.actT||0)+dt*(Game.speed||0);
    if(c.moodT>0) c.moodT-=dt;
  }
  for(const f of Game.floaters) f.t+=dt;
  for(const p of Game.particles){ p.t+=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=200*dt; } Game.particles=Game.particles.filter(p=>p.t<p.life);
  hud.tick+=dt; if(Game.mode==='service' && hud.tick>0.25){ hud.tick=0; updateHud(); }
}
