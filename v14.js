/* v14: clima cambiante, nuevos productos, reservas, misiones, Chiringo por stock real, shows con público e informe del día. v20: los cambios de seguidores pasan por el balance. */
import { Game, setTimeoutGame, weatherToday } from './state.js?v=28.17.3-flat-sand';
import { ITEMS, ITEM_IDS, UPGRADES, TYPES, DRINKS, WEATHER } from './config.js?v=28.17.3-flat-sand';
import { rnd, clamp } from './util.js?v=28.17.3-flat-sand';
import { Plan, toast } from './ui.js?v=28.17.3-flat-sand';
import { netDirty } from './net.js?v=28.17.3-flat-sand';
import { spawnCustomer } from './sim.js?v=28.17.3-flat-sand';
import { ICON_URL } from './icons.js?v=28.17.3-flat-sand';

/* --- Productos nuevos --- */
ITEMS.agua={name:'Agua fría',cost:0.3,ref:1.5,prep:0.2,spoil:0,spoilF:0,unlock:'refrescos'};
ITEMS.refresco={name:'Refresco',cost:0.5,ref:2.2,prep:0.3,spoil:0,spoilF:0,unlock:'refrescos'};
ITEMS.helado={name:'Helado',cost:0.8,ref:3,prep:0.5,spoil:0.5,spoilF:0.2,unlock:'heladera'};
ITEMS.gofre={name:'Gofre',cost:1.5,ref:6,prep:2,spoil:0.1,spoilF:0.05,unlock:'gofrera'};
ITEMS.cocktail={name:'Cóctel tropical',cost:2,ref:9,prep:2.5,spoil:0,spoilF:0,unlock:'coctelera'};
ITEMS.churros={name:'Churros con chocolate',cost:1,ref:4.5,prep:1.5,spoil:0.3,spoilF:0.1,unlock:'churrera'};
const NEW_IDS=['agua','refresco','helado','gofre','cocktail','churros'];
const NEW_DRINKS=['agua','refresco','cocktail'];
for(const id of NEW_DRINKS)if(!DRINKS.includes(id))DRINKS.push(id);
for(const id of NEW_IDS)if(!ITEM_IDS.includes(id))ITEM_IDS.push(id);
UPGRADES.push({id:'refrescos',name:'Barra de refrescos',desc:'Desbloquea agua y refrescos: rápidos y baratos.',levels:[300]});
UPGRADES.push({id:'heladera',name:'Heladera',desc:'Desbloquea helados. Se derriten si tardáis.',levels:[700]});
UPGRADES.push({id:'gofrera',name:'Plancha de gofres',desc:'Desbloquea gofres: dulces y rentables.',levels:[900]});
UPGRADES.push({id:'coctelera',name:'Barra de cócteles',desc:'Desbloquea cócteles tropicales: alto margen, preparación larga.',levels:[1200]});
UPGRADES.push({id:'churrera',name:'Churrera',desc:'Desbloquea churros con chocolate para la tarde.',levels:[800]});
/* preferencias por tipo de cliente: [turista, local, surfista] */
const NEWP={agua:[0.8,0.6,0.9],refresco:[0.7,0.5,0.8],helado:[1.4,0.6,0.8],gofre:[0.9,0.7,0.9],cocktail:[1.5,0.4,0.7],churros:[1.1,0.9,0.6]};
const TYPE_IDS=['turista','local','surfista'];
let drinkMul=null;
/* las bebidas nuevas reaccionan al clima igual que cerveza, barraquito y batido (sim.js solo conoce esas tres) */
function applyDrinkMul(m){if(m===drinkMul)return;drinkMul=m;TYPE_IDS.forEach((t,i)=>{const p=TYPES[t].pref;for(const id of NEW_IDS)p[id]=NEWP[id][i]*(NEW_DRINKS.includes(id)?m:1);});}
applyDrinkMul(1);
/* iconos simples */
const ICON_COLORS={agua:['#7fd4f2','#bfefff'],refresco:['#e8603c','#ffd0a8'],helado:['#f7a8c4','#ffe1ef'],gofre:['#d9a24a','#f6e2b8'],cocktail:['#5fd4d6','#d6fff4'],churros:['#b8792f','#f0c98a']};
function mkIcon(id){const cv=document.createElement('canvas');cv.width=cv.height=88;const c=cv.getContext('2d');const [a,b]=ICON_COLORS[id];c.fillStyle=b;c.beginPath();c.arc(44,44,30,0,7);c.fill();c.fillStyle=a;c.beginPath();c.arc(44,40,18,0,7);c.fill();return cv.toDataURL();}
for(const id of Object.keys(ICON_COLORS))ICON_URL[id]=mkIcon(id);

/* --- Estado --- */
const FOL='socialFollowers', RAT='socialRating', NOPROD=['atardecer','viral','encuesta','concurso','show'];
let lastDay=Game.day, reservaSize=0, showLastSpawn=0, lastT=null;
const MISSIONS=[{id:'rep4',txt:'Alcanza 4,0 de valoración hoy',check:s=>(Game.rep>=4),reward:200},{id:'rev1500',txt:'Gana 1.500 € hoy',check:s=>s.revenue>=1500,reward:250},{id:'served40',txt:'Sirve 40 clientes hoy',check:s=>s.served>=40,reward:200}];
/* los seguidores de Chiringo atraen clientes: 1 % por cada 200 seguidores, hasta un 12 % */
function followerBonus(){return Math.min(0.12,(Game.upgrades[FOL]||0)/2000);}
/* cambios de seguidores ajenos al cierre de v12 (misión, publicar sin stock, grupos): se aplican y se anotan en el balance */
function flushAdj(){const U=Game.upgrades,R=U.socialReport,A=U.socialAdj;if(!R||!Array.isArray(A)||!A.length)return;const keep=[];for(const a of A){if(a.dia===R.dia){if(a.n>0){R.gains.push({k:a.k,n:a.n});R.gainSum+=a.n;}else{R.losses.push({k:a.k,n:-a.n});R.lossSum+=-a.n;}R.net+=a.n;}else if(a.dia>R.dia)keep.push(a);}U.socialAdj=keep;}
function bump(k,n){const U=Game.upgrades;U[FOL]=Math.max(0,(U[FOL]||0)+n);if(!Array.isArray(U.socialAdj))U.socialAdj=[];U.socialAdj.push({k,n,dia:Game.day-1});flushAdj();}
function missionToast(){const U=Game.upgrades;if(U.mision&&!U.misionHecha)toast('Misión activa',U.misionTxt+' · +'+(U.misionReward||0)+' € y 10 seguidores.','');}
function setMission(){const idx=Math.floor((Game.day-1)/5)%MISSIONS.length;const m=MISSIONS[idx];Game.upgrades.mision=m.id;Game.upgrades.misionTxt=m.txt;Game.upgrades.misionReward=m.reward;Game.upgrades.misionHecha=0;}
function migrate(){
 if(Game.upgrades.lastReport==null)Game.upgrades.lastReport='';
 if(Game.mode==='title')return;
 for(const id of NEW_IDS){if(Game.stock[id]==null)Game.stock[id]=ITEMS[id].unlock?0:15;if(Game.prices[id]==null)Game.prices[id]=ITEMS[id].ref;if(Game.enabled[id]==null)Game.enabled[id]=true;}
 if(!Game.upgrades.mision){setMission();if(Game.mode==='plan')missionToast();}
}
function topProduct(s){let best='',n=0;for(const k in (s.sold||{})){if(s.sold[k]>n&&ITEMS[k]){n=s.sold[k];best=k;}}return best?ITEMS[best].name+' ×'+n:'—';}
function newDay(){
 lastDay=Game.day;
 const U=Game.upgrades, s=Game.day>1?Game.dayStats:null;
 // misión del día anterior
 if(s&&U.mision&&!U.misionHecha){const m=MISSIONS.find(x=>x.id===U.mision);if(m&&m.check(s)){U.misionHecha=1;Game.money+=m.reward;bump('Misión cumplida',10);toast('Misión cumplida',m.txt+' · +'+m.reward+' € y +10 seguidores.','good');}else if(m){toast('Misión','No cumplisteis: '+U.misionTxt,'');}}
 // informe del día anterior
 if(s){U.lastReport=JSON.stringify({day:Game.day-1,revenue:s.revenue||0,served:s.served||0,lost:s.lost||0,tips:(s.tips||0)+(s.tipsP||0),fines:s.fines||0,hamacas:s.hamacas||0,top:topProduct(s),mission:U.misionTxt||'',missionOk:U.misionHecha===1});}
 if(Game.day%5===1)setMission();
 missionToast();
 // clima cambiante
 delete U.weatherHora;if(rnd()<0.5){U.weatherHora=Math.round((14+rnd()*4)*10)/10;}
 // reserva
 delete U.reservaHora;if(rnd()<0.35){U.reservaHora=Math.round((17+rnd()*2)*10)/10;reservaSize=3+Math.floor(rnd()*3);}
 // fallo de publicación por stock real
 const p=U.socialPost, sold=(s&&s.sold)||{};
 if(s&&p&&U.socialPostDia===Game.day-1&&!NOPROD.includes(p)&&(sold[p]||0)===0){bump('Publicasteis algo que no había',-3);U.socialComments=['Promocionasteis '+(ITEMS[p]?ITEMS[p].name.toLowerCase():'eso')+' y no había…',...(U.socialComments||[])].slice(0,6);U[RAT]=clamp((U[RAT]||3)-0.1,1,5);}
 // reseña de grupo
 if(s&&U.grupoDia===Game.day-1){if((s.served||0)>=10){U.socialComments=['Fuimos en grupo y nos atendieron genial.',...(U.socialComments||[])].slice(0,6);bump('Reseña de grupo',3);}else{U.socialComments=['Vinimos en grupo y tardaron muchisímo.',...(U.socialComments||[])].slice(0,6);bump('Grupo mal atendido',-2);}}
 delete U.grupoDia;
 netDirty();
}
function runWeather(){const cur=Game.forecast[Game.day-1];const opts=['sol','panza','calima','viento'].filter(w=>w!==cur);const w=opts[Math.floor(rnd()*opts.length)];Game.forecast[Game.day-1]=w;toast('Cambia el tiempo','Entra '+w+'. Adaptad compras y carta.','');netDirty();}
function runReserva(){const free=Game.tables.filter(t=>t.state==='free').length;const n=reservaSize;for(let i=0;i<n;i++)setTimeoutGame(()=>{if(Game.mode==='service')spawnCustomer(rnd()<0.6?'turista':'local');},i*1.2);if(free>=1){Game.money+=30;Game.rep=clamp(Game.rep+0.1,0,5);toast('Reserva atendida','Grupo de '+n+' con mesa libre: +30 € de propina.','good');}else{Game.rep=clamp(Game.rep-0.15,0,5);toast('Reserva perdida','No había mesa para el grupo de '+n+'.','bad');}Game.upgrades.grupoDia=Game.day;netDirty();}
function tick(){
 migrate();
 flushAdj();
 if(Game.mode==='title'){lastDay=Game.day;lastT=null;return;}
 if(Game.mode==='plan'&&Game.day!==lastDay)newDay();
 if(Game.mode!=='service'){lastT=null;return;}
 lastT=Game.t;
 const W=WEATHER[weatherToday()];if(W)applyDrinkMul(W.drinks);
 if(Game.upgrades.seguidoresDia!==Game.day){Game.upgrades.seguidoresDia=Game.day;const b=followerBonus();if(b>0.005)Game.mods.arr*=1+b;}
 if(Game.upgrades.weatherHora&&Game.hour>=Game.upgrades.weatherHora){delete Game.upgrades.weatherHora;runWeather();}
 if(Game.upgrades.reservaHora&&Game.hour>=Game.upgrades.reservaHora){delete Game.upgrades.reservaHora;runReserva();}
 // shows atraen público distinto
 const sh=Game.upgrades.showHoy;if(sh&&Game.hour>=Game.upgrades.showHora&&Game.hour<Game.upgrades.showHora+2){if(Game.t-showLastSpawn>15){showLastSpawn=Game.t;const tipo=Game.upgrades.showTipo;const who=tipo==='musica'?'local':'turista';spawnCustomer(who);}}
}
setInterval(tick,250);

/* Informe del día */
// v27.9: la pestaña Informe se retiró del menú; la misión activa se muestra ahora en la pestaña Agenda.
function paint(b,h){if(b.innerHTML===h)return;b.innerHTML=h;b.dataset.v14=h;}
function renderInforme(){const b=document.querySelector('#tab-body');if(!b||Plan.tab!=='informe')return;let rep=null;try{rep=JSON.parse(Game.upgrades.lastReport||'null');}catch(e){}
 const U=Game.upgrades,n=v=>Number(v)||0;
 const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const mision=U.misionTxt?`<div class="info-card"><div class="k">Misión activa</div><div class="v">${esc(U.misionTxt)}</div><div class="d">${n(U.misionReward)} € y 10 seguidores · ${U.misionHecha===1?'Cumplida':'En curso'}</div></div>`:'';
 const chiringo=`<div class="info-card"><div class="k">Chiringo</div><div class="v">${n(U[FOL])} seguidores</div><div class="d">+${Math.round(followerBonus()*100)}% de afluencia</div></div>`;
 const R=U.socialReport,lst=(a,sg)=>(a||[]).map(x=>x.k+' '+sg+x.n).join(', ')||'nada';
 const balance=R?`<div class="info-card"><div class="k">Seguidores del último cierre</div><div class="v">${n(R.net)>=0?'+':''}${n(R.net)}</div><div class="d">Ganados: ${esc(lst(R.gains,'+'))} · Perdidos: ${esc(lst(R.losses,'−'))}</div></div>`:'';
 let dia='';
 if(rep){dia=`<div class="info-section"><p class="eyebrow">Día ${n(rep.day)} · balance</p><div class="info-grid">
  <div class="info-card"><div class="k">Ingresos</div><div class="v">${n(rep.revenue).toFixed(2)} €</div><div class="d">Propinas ${n(rep.tips).toFixed(2)} € · Hamacas ${n(rep.hamacas).toFixed(2)} € · Multas ${n(rep.fines)} €</div></div>
  <div class="info-card"><div class="k">Clientes</div><div class="v">${n(rep.served)} atendidos</div><div class="d">${n(rep.lost)} perdidos</div></div>
  <div class="info-card"><div class="k">Producto estrella</div><div class="v">${esc(rep.top||'—')}</div><div class="d">Más vendido del día</div></div>
  <div class="info-card"><div class="k">Misión anterior</div><div class="v">${esc(rep.mission||'—')}</div><div class="d">${rep.missionOk?'Cumplida':'No cumplida'}</div></div>
 </div></div>`;}else dia='<p class="muted" style="padding:0 24px">Aún no hay un informe del día anterior.</p>';
 paint(b,`<div class="info-grid" style="padding-top:16px">${mision}${chiringo}${balance}</div>${dia}`);
}
new MutationObserver(renderInforme).observe(document.getElementById('tab-body'),{childList:true,subtree:true});
setInterval(renderInforme,500);
