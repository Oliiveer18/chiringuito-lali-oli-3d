/* Plan de apertura: compras, carta, mejoras y listo. Lo importa ui.js. */
import { trackCost } from './bookkeeping.js?v=28.17.1-online-web';
import { GOAL, HOUR_CURVE, ITEMS, ITEM_IDS, RENT, SEASON_DAYS, SPECIAL_DAYS, STAFF, UPGRADES, WEATHER } from './config.js?v=28.17.1-online-web';
import { $, clamp, escapeHtml, eur, eur2 } from './util.js?v=28.17.1-online-web';
import { ICON_URL } from './icons.js?v=28.17.1-online-web';
import { Audio } from './audio.js?v=28.17.1-online-web';
import { Game, Net, activeItems, closeHour, dayName, isCoop, isGuest, isWeekend, itemUnlocked, lvl, partner, simProgressDay, wages, weatherToday } from './state.js?v=28.17.1-online-web';
import { buyStock, difficultyProfile, difficultyRush, newSeason, startDay } from './sim.js?v=28.17.1-online-web';
import { advanceFromReport } from './report.js?v=28.17.1-online-web';
import { netAct, netDirty } from './net.js?v=28.17.1-online-web';
import { drawPerson } from './render.js?v=28.17.1-online-web';
import { iconFor } from './ui-polish.js?v=28.17.1-online-web';
import { renderTab } from './ui.js?v=28.17.1-online-web';
// ---------- Pantallas ----------
export function hideAll(){ document.querySelectorAll('.overlay').forEach(o=>o.classList.remove('show')); }
export const Plan={tab:'compras'};
export function showPlan(){
  Game.mode='plan'; Net.ready={p1:false,p2:false};
  showPlanUI(); netDirty();
}
export function showPlanUI(){
  hideAll(); $('#hud').classList.add('hidden'); $('#stockbar').classList.add('hidden'); $('#hint').classList.add('hidden');
  $('#plan').classList.add('show');
  $('#plan-eyebrow').textContent = `Día ${Game.day} de ${SEASON_DAYS} · ${dayName(Game.day)} · 8:30`;
  const greet = ['Buenos días','Arriba, que hay playa','A por otro día','Huele a salitre','Otra mañana en la costa'];
  $('#plan-title').textContent = simProgressDay()===1 ? 'Tu primer día' : greet[Game.day%greet.length]; // title: only true career day 1; eyebrow stays season-local
  renderForecast(); renderTab(); refreshPlanMoney(); updateReadyUI();
}
export function renderForecast(){
  const w=weatherToday(), tw=Game.forecast[Game.day];
  const ev=SPECIAL_DAYS[Game.day];
  let html = `<div class="fc today"><div class="k">Hoy</div><div class="v">${iconFor(w)}<span>${WEATHER[w].label}</span></div><div class="d">${WEATHER[w].desc}${isWeekend(simProgressDay())?' Fin de semana: más gente del pueblo.':''}</div></div>`;
  if(ev) html += `<div class="fc event"><div class="k">Evento</div><div class="v">${ev.title}</div><div class="d">${ev.desc}</div></div>`;
  if(Game.day<SEASON_DAYS) html += `<div class="fc"><div class="k">Mañana</div><div class="v">${WEATHER[tw].label}</div><div class="d">${SPECIAL_DAYS[Game.day+1]?SPECIAL_DAYS[Game.day+1].title:dayName(Game.day+1)}</div></div>`;
  html += `<div class="fc"><div class="k">Objetivo</div><div class="v">${eur(GOAL)}</div><div class="d">Quedan ${SEASON_DAYS-Game.day+1} días · valoración ${Game.rep.toFixed(1)}/5</div></div>`;
  const difficulty=difficultyProfile();
  const prog=simProgressDay();
  const softOpen=prog<=2?' Días 1–2 de carrera: apertura suave (~55–60% de afluencia, sin picos de mediodía ni eventos sorpresa).':'';
  html += `<div class="fc"><div class="k">Dificultad progresiva</div><div class="v">${difficulty.label}</div><div class="d">Afluencia ${Math.round(difficulty.arrivals*100)}% · paciencia ${Math.round(difficulty.patience*100)}%. ${difficulty.peak>0?'Pico gradual de 12:00 a 15:00'+(closeHour()>20?' y de 19:30 a 21:30':'')+'.':'Inicio suave para organizaros.'}${softOpen}${prog>=9?' Pueden llegar pedidos de tres productos.':''}</div></div>`;
  if(Game.buzz>0.03) html += `<div class="fc"><div class="k">Boca a boca</div><div class="v">+${Math.round(Game.buzz*12)}%</div><div class="d">Recomendaciones de habituales contentos: más afluencia hoy.</div></div>`;
  $('#forecast').innerHTML=html;
}
export function refreshPlanMoney(){
  $('#plan-money').textContent = eur(Game.money);
  let h = `Al cierre pagarás <b>${eur(RENT+wages())}</b> (licencia${wages()?' y sueldos':''}).`;
  if(isCoop()){ const pn=partner(); h += `<br><span class="mate-status ${Net.ready[pn]?'ok':''}">${escapeHtml(Net.names[pn])}: ${Net.ready[pn]?'todo listo':'preparando el día…'}</span>`; }
  $('#plan-costs').innerHTML = h;
}
export function updateReadyUI(){
  const pn=partner(), me=Net.me;
  if(Game.mode==='plan'){
    refreshPlanMoney();
    const waiting = isCoop() && (Net.ready[me] || Net.readySent);
    $('#btn-open').textContent = !isCoop() ? 'Abrir el chiringuito' : waiting ? 'Esperando…' : 'Estoy listo';
    $('#btn-open').classList.toggle('waiting', waiting);
  }
  if(Game.mode==='report' && Net.ui){
    const waiting = isCoop() && (Net.ready[me] || Net.readySent);
    $('#btn-next').textContent = !isCoop() ? Net.ui.btn : waiting ? 'Esperando…' : Net.ui.btn;
    $('#btn-next').classList.toggle('waiting', waiting);
    $('#rep-status').innerHTML = isCoop() ? `<span class="mate-status ${Net.ready[pn]?'ok':''}">${escapeHtml(Net.names[pn])}: ${Net.ready[pn]?'ha terminado':'leyendo el balance…'}</span>` : '';
  }
}
export function flashMoney(){ const el = Game.mode==='plan'? $('#plan-money') : $('#urg-money'); if(!el) return; el.style.color='#c73e2a'; setTimeout(()=>el.style.color='',400); }
export function demandHint(id){
  const ratio=Game.prices[id]/ITEMS[id].ref;
  if(ratio<0.85) return '<span class="tag good">Barato: vuela</span>';
  if(ratio<=1.12) return '<span class="tag">Precio justo</span>';
  if(ratio<=1.4) return '<span class="tag mid">Caro para los locales</span>';
  if(ratio<=2.0) return '<span class="tag bad">Solo turistas</span>';
  return '<span class="tag bad">Nadie lo pide</span>';
}
export const avatarCache={};
export function staffAvatar(id){
  if(avatarCache[id]) return avatarCache[id];
  const cv=document.createElement('canvas'); cv.width=cv.height=88; const c=cv.getContext('2d');
  c.fillStyle='#f6e8cf'; c.beginPath(); c.arc(44,44,42,0,7); c.fill();
  const shirt={camarero:'#0f8b8d',cocinero:'#ffffff',limpiador:'#f5b82e',terraza:'#237d85'}[id];
  const skin={camarero:'#c58a5c',cocinero:'#e0a97e',limpiador:'#8d5a3b',terraza:'#c58a5c'}[id];
  drawPerson(c,44,140,{shirt,skin,hat:id==='cocinero'?'chef':id==='camarero'?null:'gorra',look:{hair:{style:id==='limpiador'?'flequillo':'corto',color:'#d9b35a'},build:1,height:1,walk:{},acc:[]},type:'staff',scale:1.35});
  avatarCache[id]=cv.toDataURL(); return avatarCache[id];
}

export function applyPlanAction(who, d){
  if(Game.mode!=='plan') return;
  const by = isCoop() ? Net.names[who] : null;
  if(d.buy){ buyStock(d.buy,+d.n); }
  else if(d.price){ const id=d.price; Game.prices[id]=Math.round(clamp(Game.prices[id]+ (+d.d)*(ITEMS[id].ref>8?5:1), 0.5, ITEMS[id].ref*3)*10)/10; }
  else if(d.toggle){ const id=d.toggle; Game.enabled[id]=!Game.enabled[id]; if(!activeItems().length) Game.enabled[id]=true; }
  else if(d.up){ const u=UPGRADES.find(x=>x.id===d.up), l=lvl(u.id), cost=u.levels[l]; const locked=u.req && !lvl(u.req);
    if(cost!=null && !locked && Game.money>=cost){ Game.money-=cost;trackCost(cost,'upgrades',true); Game.upgrades[u.id]=l+1; Audio.good(); toast(u.name,(by?by+' lo ha instalado. ':'Instalado. ')+u.desc,'good'); } }
  else if(d.staff){ const id=d.staff; Game.staff[id]=!Game.staff[id]; if(by) toast(STAFF.find(x=>x.id===id).name, `${by} ${Game.staff[id]?'lo ha contratado':'lo ha despedido'}.`, ''); }
  if(Net.ready.p1||Net.ready.p2){ if(d.up||d.staff||d.buy){ /* cambios: se mantiene el listo */ } }
  renderTab(); refreshPlanMoney(); netDirty();
}

export function pressReady(){ if(isGuest()){ Net.readySent=true; updateReadyUI(); netAct({a:'ready'}); } else toggleReady('p1'); }
export function toggleReady(who){
  if(Game.mode!=='plan' && Game.mode!=='report') return;
  Net.ready[who]=!Net.ready[who];
  if(Net.ready.p1 && Net.ready.p2){
    Net.ready={p1:false,p2:false};
    if(Game.mode==='plan'){ startDay(); }
    else advanceFromReport();
  } else updateReadyUI();
  netDirty();
}
