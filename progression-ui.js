import {trackCost,operatingResult} from './bookkeeping.js?v=28.17.0-online-web';
import {closeSocialDay} from './v12.js?v=28.17.0-online-web';
// Integración v22: el anfitrión calcula; los invitados reciben upgrades.progression.
import {Game,Net,simProgressDay} from './state.js?v=28.17.0-online-web';
import {ITEMS,WEATHER,SPECIAL_DAYS,RENT} from './config.js?v=28.17.0-online-web';
import {Plan,toast} from './ui.js?v=28.17.0-online-web';
import {refreshReportUI} from './report.js?v=28.17.0-online-web';
import {netDirty} from './net.js?v=28.17.0-online-web';
import {guestSend,onGuestAction} from './coopbridge.js?v=28.17.0-online-web';
import {escapeHtml as E,eur} from './util.js?v=28.17.0-online-web';
import * as M from './progression-model.mjs?v=28.17.0-online-web';
import { iconFor } from './ui-polish.js?v=28.17.0-online-web';
import { tabHtml as careerTabHtml } from './career-ui.js?v=28.17.0-online-web';
const day=()=>simProgressDay();
const pget=()=>Game.upgrades.progression;
let metric='cash',windowSize=30;
function ensure(){if(!pget())Game.upgrades.progression=M.initial(Game.upgrades.career?.id||'charco');return pget();}
function prepare(){if(Net.role==='guest')return;const p=ensure(),d=day();if(!p.goal||p.goal.day!==d){p.goal=M.goalFor(p,d);p.poster=false;netDirty();}}
function buyPoster(expected){if(Net.role==='guest'||Game.mode!=='plan'||expected!==day())return;const p=ensure();if(!SPECIAL_DAYS[Game.day]||p.poster||Game.money<30)return;Game.money-=30;trackCost(30,'posters');p.poster=true;toast('Cartel instalado','30 € · preparación del evento mejorada.','good');netDirty();}
onGuestAction('progressPoster',d=>buyPoster(d));
function service(){if(Net.role==='guest')return;const p=ensure(),d=day();if(p.start?.day===d)return;
 const event=SPECIAL_DAYS[Game.day],product=Game.day===27?'batido':'cerveza';
 const checks=event?M.readiness(Game.stock,Game.staff,p.poster,product):[];
 const prep=checks.length?checks.filter(x=>x.ok).length/checks.length:0;
 const rows=M.table(p,Math.floor(p.league/3),p.league%3,d),rank=rows.find(x=>x.id==='player')?.rank??10;
 const scored=p.history.some(r=>r.day>=Math.floor((d-1)/7)*7+1&&r.day<d);const rival=scored&&rank>=8?-.03:0,bonus=event?prep*.06:0;
 Game.mods.arr*=1+rival+bonus;
 p.start={day:d,cash:Game.money,prep:Math.round(prep*100),rival,bonus};
 if(rival)toast('Competencia local','−3 % de afluencia: estáis entre los últimos tres de la liga.','');
 if(bonus)toast('Evento preparado','+'+Math.round(bonus*100)+' % de afluencia por vuestra preparación.','good');
 netDirty();}
function figs(s,a,p){const sales=M.num(s.revenue)+M.num(s.hamacas),profit=operatingResult(s,a);return {served:s.served,lost:s.lost,rating:Game.rep,waste:a.spoilVal,revenue:s.revenue,sales,profit,cash:Game.money,cashDelta:Game.money-M.num(p.start&&p.start.cash!=null?p.start.cash:Game.money),followers:Game.upgrades.socialFollowers||0};}
function close(){if(Net.role==='guest'||!Game.dayStats)return;closeSocialDay();const p=ensure(),d=day();const s=Game.dayStats,a=Game.revModel?.acc;if(p.last>=d){if(a&&p.last===d){const am=M.amend(p,{day:d,...figs(s,a,p)});if(am.changed){Game.upgrades.progression=am.p;netDirty();}}return;}
 if(!a)return;
 const profit=operatingResult(s,a);
 const out=M.settle(p,{day:d,...figs(s,a,p)});
 if(!out.applied)return;
 Game.upgrades.progression=M.review(out.p,d,Game.forecast[Game.day-1],!!SPECIAL_DAYS[Game.day]);
 Game.money+=out.reward;
 if(out.reward)toast('Meta diaria cumplida','+'+out.reward+' € · recompensa independiente del resultado operativo.','good');
 if(out.awards.length)toast('Logros desbloqueados',out.awards.join(' · '),'good');
 if(out.reward)refreshReportUI();
 netDirty();}
function gradeHtml(p){const r=p.history.at(-1);if(!r)return '';return `<section class="pg-card pg-grade"><header class="pg-section-head"><h3>Jornada ${r.day} · Nota ${r.grade.letter}</h3></header><p class="pg-lead">${r.grade.score}/100 · Meta ${r.goalOk?'cumplida (+20 €)':'no cumplida'}</p><ul class="pg-grade-list">${r.grade.components.map(([label,v,w])=>`<li>${label}: ${Math.round(v*100)}/100 · peso ${w}%</li>`).join('')}</ul><p>Ventas ${eur(r.sales!==undefined?r.sales:r.revenue)} · resultado operativo ${eur(r.profit)} · variación de caja ${eur(r.cashDelta||0)}. La recompensa no está incluida en el resultado operativo.</p></section>`;}
function chart(p){const h=p.history.slice(-windowSize),vals=h.map(r=>M.num(r[metric]));if(!vals.length)return '<p>El historial comienza en el próximo cierre; no se inventan jornadas anteriores.</p>';
 const lo=Math.min(...vals),hi=Math.max(...vals),range=hi-lo||1;
 const points=vals.map((v,i)=>`${50+i*620/Math.max(1,vals.length-1)},${175-(v-lo)*140/range}`).join(' ');
 return `<svg viewBox="0 0 700 220" role="img" aria-label="Historial de ${E(metric)}"><line x1="50" y1="175" x2="670" y2="175" stroke="#c8c8c8"/><polyline points="${points}" fill="none" stroke="#087f83" stroke-width="3"/><text x="5" y="30">${hi.toFixed(1)}</text><text x="5" y="175">${lo.toFixed(1)}</text><text x="50" y="205">Día ${h[0].day}</text><text x="570" y="205">Día ${h.at(-1).day}</text></svg><details><summary>Ver datos accesibles</summary><table><thead><tr><th>Día</th><th>${E(metric)}</th></tr></thead><tbody>${h.map(r=>`<tr><td>${r.day}</td><td>${M.num(r[metric]).toFixed(2)}</td></tr>`).join('')}</tbody></table></details>`;}
function progressHtml(p){const chips=[['Ventas',eur(p.records.revenue||0)],['Clientes',String(p.records.served||0)],['Resultado',eur(p.records.profit||0)]].map(([k,v])=>`<span class="pg-chip"><span class="k">${k}</span><b>${v}</b></span>`).join('');const ach=Object.entries(p.achievements).map(([k,d])=>`<p class="pg-achievement">🏅 ${E(k)} · día ${d}</p>`).join('')||'<p>Todavía no hay logros.</p>';return `<section class="pg-card pg-goal"><header class="pg-section-head"><h3>Meta del día</h3></header><p class="pg-lead">Atended ${p.goal?.target||0} clientes · premio 20 €.</p></section>${gradeHtml(p)}<section class="pg-card pg-history"><header class="pg-section-head"><h3>Historial</h3></header><div class="pg-controls pg-controls-bar" role="toolbar" aria-label="Métrica y ventana temporal">${[['cash','Caja'],['revenue','Ventas'],['profit','Resultado operativo'],['cashDelta','Variación de caja'],['served','Clientes'],['rating','Valoración'],['followers','Seguidores'],['waste','Merma']].map(([k,l])=>`<button data-pgmetric="${k}" class="btn sm pg-ctrl">${l}</button>`).join('')}${[7,30,120].map(n=>`<button class="btn sm pg-ctrl" data-pgwindow="${n}">${n} días</button>`).join('')}</div>${chart(p)}</section><section class="pg-card pg-records"><header class="pg-section-head"><h3>Récords y rachas</h3></header><div class="pg-chips">${chips}</div><p>Sin pérdidas: ${p.streaks.clean} días (mejor ${p.best.clean}) · Nota A/S: ${p.streaks.quality} (mejor ${p.best.quality}).</p><header class="pg-section-head pg-subhead"><h3>Logros · ${Object.keys(p.achievements).length}/10</h3></header>${ach}</section>`;}
function agendaHtml(p){let h='';h+='<section class="pg-card pg-agenda-intro"><p class="pg-lead">Previsión de siete días. Las compras y el refuerzo son decisiones vuestras; no se contratan automáticamente.</p></section>';
 for(let i=0;i<7;i++){const d=Game.day+i;if(d>30){h+='<section class="pg-card">La próxima temporada generará su propio pronóstico; todavía no está confirmado.</section>';break;}
 const w=Game.forecast[d-1],ev=SPECIAL_DAYS[d],product=d===27?'batido':'cerveza';
 h+=`<section class="pg-card pg-day"><header class="pg-section-head"><h3>${i?'Día '+d:'Hoy'} · ${iconFor(w)}${E(WEATHER[w]?.label||'Sin pronóstico')}</h3></header><p>${E(WEATHER[w]?.desc||'')}</p>${ev?`<h4 class="pg-event-title">${E(ev.title)}</h4><p>${E(ev.desc)}</p><p>Preparación: 20 unidades de ${E(ITEMS[product]?.name||product)}, camarero y cartel. Hasta +6 % de afluencia adicional; sin preparación no hay penalización extra.</p>`:''}`;
 if(ev&&i===0){const checks=M.readiness(Game.stock,Game.staff,p.poster,product);h+='<div class="pg-checklist">'+checks.map(c=>`<p>${c.ok?'✅':'○'} ${E(c.label)}</p>`).join('')+'</div>';h+=`<button class="btn sm" data-pgposter="1" ${p.poster||Game.money<30?'disabled':''}>${p.poster?'Cartel preparado':'Preparar cartel · 30 €'}</button>`;}
 h+='</section>';}
 return h;}
function paint(){const p=pget();if(!p)return;const b=document.getElementById('tab-body');if(Game.mode==='plan'&&b&&['progreso','agenda'].includes(Plan.tab)){const c=Game.upgrades.career;const h='<div class="pg">'+(Plan.tab==='progreso'?((c&&c.obj?careerTabHtml(c):'')+progressHtml(p)):agendaHtml(p))+'</div>';if(b.__owner!=='progression'||b.__last!==h||!b.__pgNode||!b.contains(b.__pgNode)){b.__owner='progression';b.__last=h;b.innerHTML=h;b.__pgNode=b.firstElementChild;}}
 if(Game.mode==='report'){const body=document.getElementById('rep-body');if(body){let el=body.querySelector('#pg-report');if(!el){el=document.createElement('div');el.id='pg-report';body.append(el);}const gh=gradeHtml(p);if(el.__h!==gh){el.__h=gh;el.innerHTML=gh;}}}}
function tickProgress(){if(Game.mode==='title'||Game.mode==='lobby')return;if(Game.mode==='plan')prepare();if(Game.mode==='service')service();if(Game.mode==='report')close();paint();}
/* F3: tabs progreso/agenda now in HTML sidebar
for(const [key,label]of [['progreso','Progreso'],['agenda','Agenda']]){const tabs=document.querySelector('#plan .tabs');if(!tabs)continue;if(tabs.querySelector('[data-tab="'+key+'"]'))continue;const b=document.createElement('button');b.className='tab';b.dataset.tab=key;b.setAttribute('role','tab');b.textContent=label;tabs.append(b);}
*/
document.addEventListener('plan-tab-repaint',paint); // repintar Progreso/Agenda (con Carrera) al vuelo, sin esperar al intervalo
document.addEventListener('click',e=>{const t=e.target.closest?.('[data-pgmetric],[data-pgwindow],[data-pgposter]');if(!t||t.disabled)return;if(t.dataset.pgmetric)metric=t.dataset.pgmetric;if(t.dataset.pgwindow)windowSize=Number(t.dataset.pgwindow);if(t.dataset.pgposter){if(Net.role==='guest')guestSend('progressPoster',day());else buyPoster(day());}paint();});
setInterval(tickProgress,300);
const report=document.getElementById('report');if(report)new MutationObserver(tickProgress).observe(report,{attributes:true,attributeFilter:['class']});
