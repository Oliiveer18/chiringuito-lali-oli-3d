/* =========================================================
   ui.js
   Pantallas y HUD: plan de apertura, servicio, urgente, avisos (toasts) y acciones del jugador.
   ========================================================= */
import { GOAL, HOUR_CURVE, ITEMS, ITEM_IDS, RENT, SEASON_DAYS, SPECIAL_DAYS, STAFF, STATION_COLOR, STATION_LABEL, UPGRADES, WEATHER, who } from './config.js?v=28.17.2-flat-sand';
import { $, clamp, escapeHtml, eur, eur2, hhmm, stars } from './util.js?v=28.17.2-flat-sand';
import { ICON_URL } from './icons.js?v=28.17.2-flat-sand';
import { Audio } from './audio.js?v=28.17.2-flat-sand';
import { Game, Net, activeItems, closeHour, dayName, hostLive, isCoop, isGuest, isWeekend, itemUnlocked, lvl, partner, simProgressDay, wages, weatherToday } from './state.js?v=28.17.2-flat-sand';
import { buyStock, cleanTable, difficultyProfile, difficultyRush, newSeason, repArrivalMult, servable, startDay, tryServe } from './sim.js?v=28.17.2-flat-sand';
import { Rev, advanceFromReport, refreshReportUI, respondReview } from './report.js?v=28.17.2-flat-sand';
import { canvas, toWorld } from './canvas.js?v=28.17.2-flat-sand';
import { guestClean, guestServe, netAct, netDirty } from './net.js?v=28.17.2-flat-sand';
import { drawPerson } from './render.js?v=28.17.2-flat-sand';
import {
  hideAll, Plan, showPlan, showPlanUI, renderForecast, refreshPlanMoney, updateReadyUI,
  flashMoney, demandHint, avatarCache, staffAvatar,
  applyPlanAction, pressReady, toggleReady,
} from './ui-plan.js?v=28.17.2-flat-sand';
import {
  showServiceUI, showFinal, showFinalUI, renderUrgent, applyUrgent,
  updateHud, updateStockbar, setSpeed, toastsEl, toast, toastLocal,
} from './ui-service.js?v=28.17.2-flat-sand';
import { renderMejorasTab } from './ui-mejoras.js?v=28.17.2-flat-sand';
export {
  hideAll, Plan, showPlan, showPlanUI, renderForecast, refreshPlanMoney, updateReadyUI,
  flashMoney, demandHint, avatarCache, staffAvatar,
  applyPlanAction, pressReady, toggleReady,
};
export {
  showServiceUI, showFinal, showFinalUI, renderUrgent, applyUrgent,
  updateHud, updateStockbar, setSpeed, toastsEl, toast, toastLocal,
};
function planComprasCartaHtml(){
  let h = `<section class="plan-panel plan-unified"><p class="plan-panel-k">Compras y carta</p><p class="muted plan-panel-d">Compra stock para la jornada y fija el <b>precio de venta</b> de cada producto. Referencia = lo que espera la gente del pueblo. Unas ${Math.round(estimateCustomers())} visitas previstas hoy.</p>`;
  for(const id of ITEM_IDS){
    const it=ITEMS[id], un=itemUnlocked(id);
    const sp = lvl('nevera')?it.spoilF:it.spoil;
    if(!un){
      h += `<div class="row locked plan-product"><img src="${ICON_URL[id]}" alt=""><div><div class="name">${it.name}</div><div class="sub">Desbloquea: ${UPGRADES.find(u=>u.id===it.unlock).name}</div></div></div>`;
      continue;
    }
    const margin = Game.prices[id]-it.cost;
    h += `<div class="row plan-product"><img src="${ICON_URL[id]}" alt=""><div class="plan-product-main"><div class="name">${it.name}</div><div class="sub">Compra ${eur2(it.cost)} · almacén <b>${Game.stock[id]}</b> · referencia ${eur2(it.ref)} · margen ${eur2(margin)} ${demandHint(id)}</div></div>
    <div class="ctrl plan-product-ctrl">
      <div class="plan-ctrl-block"><span class="plan-ctrl-label">Stock</span><div class="plan-buy-btns">${[10,25,50].map(n=>`<button class="btn sm primary stock-buy" data-buy="${id}" data-n="${n}" ${Game.money<it.cost*n?'disabled':''}><span class="stock-buy-qty plan-buy-qty">+${n}</span><span class="stock-buy-total plan-buy-amt">${eur(it.cost*n)}</span></button>`).join('')}</div></div>
      <div class="plan-ctrl-block"><span class="plan-ctrl-label">Precio venta</span><div class="price"><button type="button" data-price="${id}" data-d="-0.1" aria-label="Bajar precio">−</button><span class="val">${eur2(Game.prices[id])}</span><button type="button" data-price="${id}" data-d="0.1" aria-label="Subir precio">+</button></div></div>
      <div class="plan-ctrl-block plan-ctrl-carta"><button type="button" class="btn sm ${Game.enabled[id]?'teal':''}" data-toggle="${id}">${Game.enabled[id]?'En carta':'Fuera de carta'}</button></div>
    </div></div>`;
  }
  return h + '</section>';
}
function planCartaSectionHtml(){
  let h = `<section class="plan-panel plan-prices"><p class="plan-panel-k">Fijar precios y carta</p><p class="muted plan-panel-d">Los turistas pagan casi cualquier cosa; la gente del pueblo conoce los precios. Fíjate en el precio de referencia.</p>`;
  for(const id of ITEM_IDS){
    const it=ITEMS[id], un=itemUnlocked(id);
    if(!un){ h+=`<div class="row locked"><img src="${ICON_URL[id]}" alt=""><div><div class="name">${it.name}</div><div class="sub">Bloqueado</div></div></div>`; continue; }
    const margin = Game.prices[id]-it.cost;
    h += `<div class="row plan-price-row"><img src="${ICON_URL[id]}" alt=""><div><div class="name">${it.name}</div><div class="sub">Referencia ${eur2(it.ref)} · margen ${eur2(margin)} ${demandHint(id)}</div></div>
    <div class="ctrl"><div class="price"><button data-price="${id}" data-d="-0.1" aria-label="Bajar precio">−</button><span class="val">${eur2(Game.prices[id])}</span><button data-price="${id}" data-d="0.1" aria-label="Subir precio">+</button></div>
    <button class="btn sm ${Game.enabled[id]?'teal':''}" data-toggle="${id}">${Game.enabled[id]?'En carta':'Fuera'}</button></div></div>`;
  }
  return h + '</section>';
}
export function renderTab(){
  if(Plan.tab==='carta')Plan.tab='compras';
  document.querySelectorAll('#plan .plan-tab').forEach(t=>t.classList.toggle('on',t.dataset.tab===Plan.tab));
  const b=$('#tab-body'); let h=''; if(Plan.tab==='personal'){document.dispatchEvent(new Event('workforce-paint'));return;}
  // Pestanas de otros modulos (p. ej. Carrera) pintan su propio contenido: no se borra en cada actualizacion de dinero o cooperativo.
  if(!['compras','carta','mejoras','personal'].includes(Plan.tab)){ document.dispatchEvent(new Event('plan-tab-repaint')); return; }
  if(Plan.tab==='compras'){
    h += planComprasCartaHtml();
  } else if(Plan.tab==='carta'){
    h += planCartaSectionHtml();
  } else if(Plan.tab==='mejoras'){
    h += renderMejorasTab();
  } else if(Plan.tab==='personal'){
    h += `<p class="muted" style="margin:0 0 6px">El sueldo se paga cada día al cerrar. Puedes contratar o despedir cada mañana.</p>`;
    for(const st of STAFF){
      const hired=!!Game.staff[st.id];
      h += `<div class="row"><img src="${staffAvatar(st.id)}" alt=""><div><div class="name">${st.name}</div><div class="sub">${st.desc} · ${eur(st.wage)}/día</div></div>
      <div class="ctrl"><button class="btn sm ${hired?'':'primary'}" data-staff="${st.id}">${hired?'Despedir':'Contratar'}</button></div></div>`;
    }
  }
  b.innerHTML=h;
  if(['compras','carta','mejoras','personal'].includes(Plan.tab)){ delete b.__owner; delete b.__last; delete b.__rd; delete b.__pgNode; }
}
const PLAN_CORE_TABS=['compras','carta','mejoras','personal'];
export function routePlanTab(){
  if(Plan.tab==='carta')Plan.tab='compras';
  document.querySelectorAll('#plan .plan-tab').forEach(t=>t.classList.toggle('on',t.dataset.tab===Plan.tab));
  if(PLAN_CORE_TABS.includes(Plan.tab)){ renderForecast(); renderTab(); return; }
  const b=$('#tab-body');
  if(b){ delete b.__owner; delete b.__last; delete b.__rd; delete b.__pgNode; delete b.__mkNode; }
  renderForecast();
  if(Plan.tab==='show') import('./features.js?v=28.17.2-flat-sand').then(m=>{ if(Plan.tab==='show') m.renderShow?.(); });
  else if(Plan.tab==='chiringo') import('./chiringo-ui.js?v=28.17.2-flat-sand').then(m=>{ if(Plan.tab==='chiringo') m.renderChiringo?.(); });
  document.dispatchEvent(new Event('plan-tab-repaint'));
}
export function estimateCustomers(){
  const w=WEATHER[weatherToday()]; let tot=0;
  for(let h=10;h<closeHour();h++) tot+=8*(HOUR_CURVE[h]||0.6)*((difficultyRush(h+0.25)+difficultyRush(h+0.75))/2);
  tot*= w.arr*repArrivalMult()*(lvl('redes')?1.15:1)*(isWeekend(simProgressDay())?1.25:1)*(SPECIAL_DAYS[Game.day]?SPECIAL_DAYS[Game.day].arr:1)*difficultyProfile().arrivals;
  if(lvl('sombrillas') && (weatherToday()==='sol'||weatherToday()==='calima')) tot*=1.15;
  if(isCoop()) tot*=1.4;
  return tot;
}
// respuestas del propietario y "Ver más reseñas": delegación en el informe
$('#rep-body').addEventListener('click',e=>{
  const b=(e.target && e.target.closest)? e.target.closest('button') : null;
  if(!b || b.disabled) return;
  if(b.dataset.revmore!=null){ Rev.expanded=true; refreshReportUI(); return; } // local: no afecta a la pareja
  if(b.dataset.vid!=null){ respondReview(+b.dataset.vid, b.dataset.kind); return; }
});
$('#tab-body').addEventListener('click',e=>{
  const t=e.target.closest('button'); if(!t || t.disabled) return;
  const d={...t.dataset}; Audio.click();
  if(isGuest()) netAct({a:'plan', d}); else applyPlanAction('p1', d);
});
document.querySelector('#plan .plan-sidebar')?.addEventListener('click',e=>{
  const t=e.target.closest('.plan-tab'); if(!t||!t.dataset.tab) return;
  Plan.tab=t.dataset.tab;
  Audio.click();
  routePlanTab();
});
$('#btn-open').addEventListener('click',()=>{ Audio.init(); Audio.click();
  if(!isCoop()){ startDay(); return; }
  pressReady(); });
$('#btn-next').addEventListener('click',()=>{ Audio.click();
  if(!isCoop()){ advanceFromReport(); return; }
  pressReady(); });
$('#btn-start').addEventListener('click',()=>{ Audio.init(); Audio.good(); Net.role='solo'; Net.me='p1'; newSeason(); Plan.tab='compras'; showPlan(); });

// Pedido urgente sigue disponible vía overlay #urgent si se reabre por código; botón retirado del HUD.
const btnUrgent=document.getElementById('btn-urgent');
if(btnUrgent) btnUrgent.addEventListener('click',()=>{ if(Game.mode!=='service') return; Audio.click();
  if(!isCoop()){ prevSpeed=Game.speed; setSpeed(0); }
  $('#urg-note').textContent = isCoop() ? 'A mitad de jornada todo cuesta el doble. Ojo: el servicio sigue mientras pides.' : 'A mitad de jornada todo cuesta el doble. Llega al momento.';
  renderUrgent(); $('#urgent').classList.add('show'); });
export let prevSpeed=1;
$('#urg-body').addEventListener('click',e=>{ const t=e.target.closest('button'); if(!t||t.disabled) return; if(isGuest()){ Audio.click(); netAct({a:'urgent', id:t.dataset.ub}); } else applyUrgent(t.dataset.ub,'p1'); });
$('#btn-urg-close').addEventListener('click',()=>{ Audio.click(); $('#urgent').classList.remove('show'); if(!isCoop()) setSpeed(prevSpeed||1); });

document.querySelectorAll('.speed button').forEach(b=>b.addEventListener('click',()=>{ Audio.click(); b.blur();
  if(isGuest()) netAct({a:'speed', v:+b.dataset.speed}); else { setSpeed(+b.dataset.speed); netDirty(); } }));
const sndBtn=$('#btn-sound');
function setSoundLabel(on){const lbl=sndBtn.querySelector('.snd-lbl');if(lbl)lbl.textContent='Sonido: '+(on?'sí':'no');sndBtn.dataset.sound=on?'on':'off';sndBtn.setAttribute('aria-label',on?'Sonido activado':'Sonido desactivado');}
sndBtn.addEventListener('click',()=>{ Audio.init(); setSoundLabel(Audio.toggle()); });

canvas.addEventListener('pointerdown',e=>{
  if(Game.mode!=='service' || Game.speed===0) return;
  if(window.is3DReady?.()) return; // 2D hit testing is not valid through a perspective camera.
  const p=toWorld(e.clientX,e.clientY);
  // clientes en cola
  let best=null, bd=1e9;
  for(const c of Game.customers){ if(!servable(c)) continue; const dx=p.x-c.x, dy=p.y-(c.y-45); const d=Math.hypot(dx*1.2,dy*0.8); if(d<75 && d<bd){bd=d;best=c;} }
  if(best){ if(isGuest()) guestServe(best); else tryServe(best,'p1'); return; }
  Game.tables.forEach((t,i)=>{ if(best) return; if(t.state==='dirty' && Math.hypot(p.x-t.x,p.y-t.y+10)<62){ best=t; if(isGuest()) guestClean(i); else cleanTable(t,false,'p1'); } });
});
addEventListener('keydown',e=>{
  if(Game.mode!=='service') return;
  if(e.code==='KeyP'){ const v=Game.speed?0:1; if(isGuest()) netAct({a:'speed',v}); else { setSpeed(v); netDirty(); } return; }
  if(Game.speed===0) return;
  if(window.is3DReady?.()) return; // The 3D contextual controller owns service shortcuts.
  const act=c=>{ if(!c) return; if(isGuest()) guestServe(c); else tryServe(c,'p1'); };
  if(e.code==='Space'||e.code==='Enter'){ e.preventDefault(); const q=Game.customers.filter(servable).sort((a,b)=>a.spot-b.spot); act(q[0]); }
  const n=parseInt(e.key); if(n>=1&&n<=6){ act(Game.customers.find(c=>servable(c)&&c.spot===n-1)); }
  if(e.code==='KeyL'){ const i=Game.tables.findIndex(t=>t.state==='dirty'); if(i>=0){ if(isGuest()) guestClean(i); else cleanTable(Game.tables[i],false,'p1'); } }
});
