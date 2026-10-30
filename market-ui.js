import {leaguePanel} from './management-ui.js?v=28.17.3-flat-sand';
// v23: nombre por carrera y panel de las tres ligas simultáneas.
import {Game,Net,simProgressDay} from './state.js?v=28.17.3-flat-sand';
import {Plan} from './ui.js?v=28.17.3-flat-sand';
import {netDirty} from './net.js?v=28.17.3-flat-sand';
import {escapeHtml as E,eur} from './util.js?v=28.17.3-flat-sand';
import {ctx,view} from './canvas.js?v=28.17.3-flat-sand';
import * as R from './market-model.mjs?v=28.17.3-flat-sand';
let draft=null,area=0,tier=0,detail=null;
const day=()=>simProgressDay();
const name=()=>R.nameValue(Game.upgrades.kioskName);
function setName(){if(Net.role==='guest'||!['plan','report'].includes(Game.mode))return;if(!Game.upgrades.kioskName){Game.upgrades.kioskName=R.nameValue(draft);draft=null;netDirty();document.dispatchEvent(new Event('kiosk-name-changed'));}}
function form(parent){if(!parent||parent.querySelector('[data-kiosk-name]'))return;const label=document.createElement('label');label.textContent='Nombre para la nueva carrera';const input=document.createElement('input');input.type='text';input.dataset.kioskName='1';input.placeholder='El Charco Azul';input.value=name();input.setAttribute('aria-label','Nombre del kiosco para la nueva carrera');label.append(input);parent.prepend(label);}
function library(){const sheet=document.querySelector('.save-browser:not([hidden]) .save-sheet');if(!sheet)return;form(sheet);try{const kind=sheet.querySelector('h2')?.textContent==='Vuestras partidas'?'coop':'solo';const saves=JSON.parse(localStorage.getItem('lali-oli.3d.library.v2')||'[]').filter(s=>s.kind===kind).sort((a,b)=>String(b.date).localeCompare(String(a.date)));sheet.querySelectorAll('.save-row strong').forEach((el,i)=>{const s=saves[i];if(!s)return;const value=R.nameValue(s.data.upgrades.kioskName)+(kind==='coop'?' · '+(s.names?.p1||'Jugador 1')+' y '+(s.names?.p2||'Jugador 2'):'');if(el.textContent!==value)el.textContent=value;});}catch(e){console.warn('No se pudieron mostrar los nombres de las partidas',e);}}
window.addEventListener('click',e=>{const b=e.target.closest?.('button');if(!b)return;if(b.classList.contains('save-action')&&b.textContent==='Nueva partida')draft=R.nameValue(b.closest('.save-sheet')?.querySelector('[data-kiosk-name]')?.value);if(b.dataset.cr==='new')draft=R.nameValue(document.querySelector('#final-card [data-kiosk-name]')?.value);},true);
const originalText=new WeakMap();
function patchNames(){const value=name();for(const root of document.querySelectorAll('.rd,#rep-body,#final-card')){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){if(node.parentElement?.closest('script,style,input'))continue;let rec=originalText.get(node);if(!rec||node.textContent!==rec.last)rec={source:node.textContent,last:node.textContent};const text=rec.source.replaceAll('El Charco Azul',value);if(text!==node.textContent)node.textContent=text;rec.last=text;originalText.set(node,rec);}}if(document.querySelector('#final-card [data-cr="new"]'))form(document.getElementById('final-card'));}

function state(){const p=Game.upgrades.progression;if(!p)return null;if(!p.rivals&&Net.role!=='guest'){p.rivals=R.migrate(p.seed,p.league||0,p.last||0);p.league=p.rivals.tiers[0];netDirty();}return p;}
function html(p){const s=p.rivals;if(!s)return '<p>Esperando la clasificación del anfitrión…</p>';
 const rows=R.table(s,area,tier,p.history,name(),day());
 const playerTier=s.tiers[area];
 const ownPlayer=R.table(s,area,playerTier,p.history,name(),day()).find(r=>r.id==='player');
 const own=tier===playerTier?ownPlayer:null,t=s.tiers[area];
 const week=Math.floor((day()-1)/7)+1,jor=(day()-1)%7+1,season=Game.upgrades.career?.season||1;
 const areas=R.AREAS.map((label,a)=>{const r=R.table(s,a,s.tiers[a],p.history,name(),day()).find(x=>x.id==='player');const on=a===area;
  return `<button class="lg-area${on?' on':''}" data-mkarea="${a}" aria-pressed="${on}"><span class="lg-a-name">${label}</span><span class="lg-chip t${s.tiers[a]}">${R.TIERS[s.tiers[a]]}</span><span class="lg-a-rank"><b>${r.rank}</b><small>/10</small></span></button>`;}).join('');
 let ctx='';
 if(tier!==playerTier&&ownPlayer)ctx+=`<div class="lg-ctx ok"><span class="lg-ctx-k">Vuestra categoría · ${R.TIERS[playerTier]}</span><span class="lg-ctx-v">Puesto ${ownPlayer.rank}º · ${ownPlayer.score} pts (tabla de ${R.TIERS[tier]} solo informativa)</span></div>`;
 if(own&&t<2){const inTop=own.rank<=3,gap=Math.max(0,rows[2].score-own.score),lead=own.score-rows[3].score;
  ctx+=`<div class="lg-ctx ${inTop?'ok':'no'}"><span class="lg-ctx-k">Ascenso · puestos 1.º–3.º</span><span class="lg-ctx-v">${inTop?'Dentro · ventaja '+lead+' pts':'Fuera · te faltan '+gap+' pts para el 3.º'}</span><span class="lg-ctx-bar"><i style="width:${Math.min(100,Math.round(own.score*100/Math.max(1,rows[2].score)))}%"></i></span></div>`;}
 if(own&&t>0){const danger=own.rank>7,gap=Math.max(0,rows[6].score-own.score),lead=own.score-rows[6].score;
  ctx+=`<div class="lg-ctx ${danger?'no':'ok'}"><span class="lg-ctx-k">Permanencia · del 8.º para abajo</span><span class="lg-ctx-v">${danger?'En descenso · a '+gap+' pts del 7.º':'Seguro · +'+lead+' pts sobre el 7.º'}</span><span class="lg-ctx-bar"><i style="width:${Math.min(100,Math.round(own.score*100/Math.max(1,rows[6].score)))}%"></i></span></div>`;}
 const table=rows.map(r=>{
  const zone=r.rank<=3&&t<2?' z-up':r.rank>=8&&t>0?' z-down':'';
  const mv=r.change===null?'<i class="mv eq">—</i>':r.change>0?`<i class="mv up">▲ ${r.change}</i>`:r.change<0?`<i class="mv down">▼ ${-r.change}</i>`:'<i class="mv eq">—</i>';
  const pos=r.rank<=3?`<span class="lg-medal m${r.rank}">${r.rank}</span>`:`<span class="lg-pos-n">${r.rank}</span>`;
  return `<tr class="${r.id==='player'?'lg-own':''}${detail===r.id?' sel':''}${zone}" data-mkid="${r.id}"><td class="lg-pos">${pos}</td><td class="lg-name">${r.id==='player'?'<span class="lg-you">VOSOTROS</span>':''}<b>${E(r.name)}</b><small>${E(r.style)}</small></td><td class="lg-pts">${r.score}</td><td class="lg-mv">${mv}</td></tr>`;}).join('');
 let h=`<div class="lg-hero"><div><p class="eyebrow">Temporada ${season} · semana ${week} · jornada ${jor} de 7</p><h3>Ligas</h3></div><p class="lg-hero-note">Competís a la vez en los tres ámbitos · 29 kioscos rivales por ámbito · los puntos de hoy se suman al cerrar</p></div>`;
 h+=`<div class="lg-areas">${areas}</div>`+ctx;
 h+=`<div class="lg-tiers">${R.TIERS.map((tt,i)=>`<button class="lg-tier${i===tier?' on':''}" data-mktier="${i}">${tt}</button>`).join('')}</div>`;
 h+=`<table class="lg-table"><thead><tr><th>#</th><th>Kiosco</th><th>Puntos</th><th>Cambio*</th></tr></thead><tbody>${table}</tbody></table>`;
 h+=`<p class="lg-legend">${t<2?'<span class="lg-sw up"></span>Zona de ascenso':''}${t>0?'<span class="lg-sw down"></span>Zona de descenso':''}<span class="lg-sw own"></span>Vuestro kiosco<span class="lg-note-mv">*Respecto al último cierre semanal</span></p>`;
 h+=`<details class="lg-details"><summary>Cómo se calculan los puntos</summary><p>Misma fórmula para todos: cada jornada suma hasta 100 puntos (servicio 40, valoración 25, margen 20 y comunidad 15). El total semanal empieza en cero; se suman las siete jornadas antes de resolver ascensos y descensos. Los rivales realizan inversiones con caja propia y su demanda no depende de vuestra posición. Revisión cada séptimo día: ascienden los tres primeros de Bronce y Plata e intercambian plaza con los tres últimos de la categoría superior.</p></details>`;
 const n=s.npcs.find(n=>n.id===detail);
 if(n){const r=n.history.at(-1);
  h+=`<section class="lg-rival"><header><div><h4>${E(n.name)}</h4><p class="lg-rival-sub">${E(n.style)} · ${R.AREAS[n.area]}</p></div><button class="btn sm text" data-mkclose="1">✕ Cerrar</button></header><div class="lg-rival-grid"><div><span>Caja</span><b>${eur(n.cash)}</b></div><div><span>Capacidad</span><b>${n.capacity}</b></div><div><span>Calidad</span><b>${n.quality.toFixed(1)} / 5</b></div><div><span>Seguidores</span><b>${n.followers}</b></div></div><p class="lg-rival-action">Última decisión: <b>${E(n.lastAction)}</b></p>${r?`<p>Último día: ventas ${eur(r.revenue)} · beneficio ${eur(r.profit)} · valoración ${r.rating.toFixed(1)} · clientes ${r.served}.</p>`:'<p>Su primera jornada se simulará en el próximo cierre.</p>'}<h5>Decisiones recientes</h5><ul class="lg-rival-log">${n.actions.map(a=>`<li><span>Día ${a.day}</span>${E(a.action)} · ${eur(a.cost)}</li>`).join('')||'<li>Todavía no hay inversiones.</li>'}</ul></section>`;}
 h+=`<section class="lg-week"><h4>Cierres semanales recientes</h4>${(s.weeklyHistory||[]).slice(-8).reverse().map(w=>`<div class="lg-week-row"><span class="lg-week-d">Jornada ${w.day}</span><span class="lg-week-r">${w.results.map(r=>`<span class="lg-chip t${r.tier}">${R.AREAS[r.area]} ${R.TIERS[r.tier]} · ${r.rank}º · ${r.score} pts</span>`).join('')}</span></div>`).join('')||'<p class="muted">El primer cierre semanal llegará al séptimo día.</p>'}</section>`;
 h+=`<section class="lg-badges"><h4>Fajines conseguidos</h4><div class="lg-badge-list">${s.badges.map(b=>`<span class="lg-badge"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.5 5 5.5.8-4 3.9.9 5.4-4.9-2.6-4.9 2.6.9-5.4-4-3.9 5.5-.8z"/></svg>${R.AREAS[b.area]} · ${R.TIERS[b.tier]} · día ${b.day}</span>`).join('')||'<p class="muted">Aún ninguno. El primero llega al ascender de categoría.</p>'}</div></section>`;
 return '<div class="mk">'+h+leaguePanel(p,area,tier,day())+'</div>';}
function paint(){const p=state();if(!p||Plan.tab!=='mercado'||Game.mode!=='plan')return;const b=document.getElementById('tab-body'),h=html(p);if(b&&(b.__owner!=='mercado'||b.__last!==h||!b.__mkNode||!b.contains(b.__mkNode))){b.__owner='mercado';b.__last=h;b.innerHTML=h;b.__mkNode=b.firstElementChild;}}
/* F3: tab 'mercado' (Ligas) now in HTML sidebar — no injection needed
const old=document.querySelector('#plan .tabs [data-tab="ligas"]');if(old)old.remove();const bar=document.querySelector('#plan .tabs');if(bar){const b=document.createElement('button');b.className='tab';b.dataset.tab='mercado';b.setAttribute('role','tab');b.textContent='Ligas';bar.append(b);}
*/
document.addEventListener('plan-tab-repaint',paint);
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-mkarea],[data-mktier],[data-mkid],[data-mkclose]');if(!b)return;if(b.dataset.mkclose!==undefined)detail=null;else if(b.dataset.mkarea!==undefined){area=Number(b.dataset.mkarea);tier=state()?.rivals?.tiers[area]||0;}else if(b.dataset.mktier!==undefined)tier=Number(b.dataset.mktier);else if(b.dataset.mkid)detail=b.dataset.mkid;paint();});
function update(){setName();const p=state();if(p&&Net.role!=='guest'&&p.kioskName!==name()){p.kioskName=name();netDirty();}library();patchNames();paint();}
setInterval(update,300);new MutationObserver(()=>{library();setName();}).observe(document.body,{childList:true,subtree:true});
// El rótulo se dibuja después del render principal, sin alterar la geometría ni el estado del canvas.
function sign(){if(['service','plan','report'].includes(Game.mode)){ctx.save();ctx.setTransform(view.s,0,0,view.s,view.ox,view.oy);ctx.fillStyle='#f1d9a8';ctx.fillRect(158,194,224,32);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#2a211c';let fs=24;ctx.font=`700 ${fs}px system-ui`;const label=name();if(ctx.measureText(label).width>198){fs=Math.max(8,24*198/ctx.measureText(label).width);ctx.font=`700 ${fs}px system-ui`;}ctx.fillText(label,270,210,198);ctx.restore();}requestAnimationFrame(sign);}requestAnimationFrame(sign);
