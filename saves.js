import { Game, Net, gameTimers, guestCust } from './state.js?v=28.17.1-online-web';
import { newSeason } from './sim.js?v=28.17.1-online-web';
import { showPlan, Plan } from './ui.js?v=28.17.1-online-web';
import { buildTables } from './world.js?v=28.17.1-online-web';
import { netDirty } from './net.js?v=28.17.1-online-web';
import { showReportUI } from './report.js?v=28.17.1-online-web';
import { nameValue } from './market-model.mjs?v=28.17.1-online-web';
const KEY='lali-oli.3d.library.v2', BACK=KEY+'.backup';
const fields=['day','money','rep','stock','prices','enabled','upgrades','staff','forecast','season','lastDebt','starsLog','revUsed','revPrev','regulars','regVisited','buzz','pendingPurchases'];
const encode=x=>JSON.stringify(x,(_,v)=>v instanceof Set?{__laliSet:[...v]}:v);
const decode=s=>JSON.parse(s,(_,v)=>v&&Array.isArray(v.__laliSet)?new Set(v.__laliSet):v);
const copy=x=>decode(encode(x));
const valid=s=>s&&s.data&&Number.isInteger(s.data.day)&&s.data.day>=1&&s.data.day<=30&&Number.isFinite(s.data.money)&&Number.isFinite(s.data.rep)&&['solo','coop'].includes(s.kind)&&Array.isArray(s.data.forecast)&&['stock','prices','enabled','upgrades','staff','season','regulars'].every(k=>s.data[k]&&typeof s.data[k]==='object')&&(s.phase!=='report'||s.ui&&s.data.dayStats&&s.data.revModel);
let library=[],active=null,pending=null,bypass=false,last='',locked=false;
function message(t){
  if(typeof t==='string'&&t.startsWith('✓ Guardado automático'))return;
  if(t)console.warn('[guardado]',t);
}
function parse(raw){const a=decode(raw);if(!Array.isArray(a)||!a.every(valid))throw Error('Guardado incompatible');return a;}
try{const raw=localStorage.getItem(KEY);if(raw!==null)library=parse(raw);else{for(const kind of ['solo','coop']){const rawOld=localStorage.getItem('lali-oli.3d.save.v1.'+kind);if(rawOld){const s=decode(rawOld);if(valid(s))library.push({...s,id:uid()});}}}}catch(e){try{const raw=localStorage.getItem(BACK);if(!raw)throw e;library=parse(raw);message('Recuperada la copia anterior.');}catch(e){locked=true;message('No se pudieron leer las partidas. No se sobrescribirán los datos.');}}
function uid(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);}
const settled=()=>{const p=Game.upgrades&&Game.upgrades.progression;if(!p)return true;const d=((Game.upgrades.career&&Game.upgrades.career.season)||1)-1;return p.last>=d*30+Game.day;};
function save(){if(locked||pending||Net.role==='guest'||!['plan','report'].includes(Game.mode)||Game.mode==='report'&&(!Net.ui||!Game.revModel)||Game.mode==='report'&&!settled())return;
try{const kind=Net.role==='host'?'coop':'solo',data={};for(const k of fields)if(Game[k]!==undefined)data[k]=copy(Game[k]);if(Game.mode==='report'){data.dayStats=copy(Game.dayStats);data.revModel=copy(Game.revModel);}const s={id:active||uid(),kind,phase:Game.mode,data,names:copy(Net.names),roles:copy(Net.roles),ui:Game.mode==='report'?copy(Net.ui):null,date:new Date().toISOString()};if(!valid(s))throw Error();const sig=encode([s.kind,s.phase,s.data,s.ui,s.names,s.roles]);if(sig===last)return;
const next=library.filter(x=>x.id!==s.id).concat(s),raw=encode(next);parse(raw);if(library.length)localStorage.setItem(BACK,encode(library));localStorage.setItem(KEY,raw);library=next;active=s.id;last=sig;message('✓ Guardado automático · Día '+Game.day+(Game.mode==='report'?' completado':' · preparación')+' · '+new Date().toLocaleTimeString('es-ES'));}catch(e){(console.error('[guardado]',e),message('No se pudo guardar ('+(e&&e.name||'error')+'). Conserva la página abierta; comprueba el almacenamiento.'));}}
function restore(s){if(!valid(s))return;newSeason();for(const k of [...fields,'dayStats','revModel'])if(s.data[k]!==undefined)Game[k]=copy(s.data[k]);if(s.phase==='plan'&&s.data.pendingPurchases===undefined)Game.upgrades.accountingLegacyUnknown=true;for(const key of ['revUsed','revPrev']){const obj=Game[key]||{};for(const k of Object.keys(obj))if(!(obj[k] instanceof Set))obj[k]=new Set(Array.isArray(obj[k])?obj[k]:[]);}
Object.assign(Game,{hour:10,speed:1,customers:[],slots:[],floaters:[],particles:[],closing:false,closeT:0,spawnAcc:0,mods:{arr:1},dayEvent:null,eventDone:false});gameTimers.length=0;guestCust.clear();buildTables();Net.ready={p1:false,p2:false};Net.readySent=false;Net.pend.clear();Net.acks.length=0;Net.events.length=0;Net.lastMode=null;Net.revDirty=true;pending=null;active=s.id;last='';Plan.tab='compras';if(s.phase==='report'){Game.mode='report';Net.ui=copy(s.ui);showReportUI();}else{Game.dayStats=null;Net.ui=null;showPlan();}netDirty();save();}
const modal=document.createElement('section');modal.className='save-browser';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Tus partidas');document.body.append(modal);
function button(text,fn,cls){const b=document.createElement('button');b.type='button';b.className='save-action'+(cls?' '+cls:'');b.textContent=text;b.onclick=fn;return b;}
function original(q){bypass=true;try{document.querySelector(q).click();}finally{bypass=false;}}
function resume(s){modal.hidden=true;if(s.kind==='solo'){Net.role='solo';Net.me='p1';restore(s);}else{pending=copy(s);original('#btn-coop');if(s.names?.p1)document.querySelector('#lobby-name').value=s.names.p1;if(s.roles)Object.assign(Net.roles,s.roles);document.querySelector('#lobby-status').textContent='Continuando día '+s.data.day+'. Crea una sala e invita a '+(s.names?.p2||'tu pareja')+'.';}}
function removeSave(s){if(!confirm('¿Eliminar esta partida? Esta acción no se puede deshacer.'))return;library=library.filter(x=>x.id!==s.id);localStorage.setItem(KEY,encode(library));if(active===s.id){active=null;last='';}screen(s.kind);}
function screen(kind){modal.replaceChildren();const box=document.createElement('div');box.className='save-sheet';modal.append(box);const h=document.createElement('h2');h.textContent=kind==='solo'?'Tus partidas en solitario':'Vuestras partidas';box.append(h);const actions=document.createElement('div');actions.className='save-actions';actions.append(button('Nueva partida',()=>{if(locked){alert('Los datos no se pueden leer. Se evita sobrescribirlos.');return;}active=null;pending=null;last='';modal.hidden=true;original(kind==='solo'?'#btn-start':'#btn-coop');}));if(kind==='coop')actions.append(button('Unirme con código',()=>{pending=null;active=null;last='';modal.hidden=true;original('#btn-coop');}));actions.append(button('Volver',()=>modal.hidden=true));box.append(actions);
for(const s of library.filter(s=>s.kind===kind).sort((a,b)=>String(b.date).localeCompare(String(a.date)))){const row=document.createElement('div');row.className='save-row';const title=document.createElement('strong');title.textContent=nameValue(s.data.upgrades?.kioskName)+(kind==='coop'?' · '+(s.names?.p1||'Jugador 1')+' y '+(s.names?.p2||'Jugador 2'):'');const p=document.createElement('p');p.textContent='Día '+s.data.day+(s.phase==='report'?' completado':' · preparación')+' · '+Math.round(s.data.money)+' € · '+new Date(s.date).toLocaleString('es-ES');row.append(title,p,button('Continuar',()=>resume(s)),button('Eliminar',()=>removeSave(s),'danger'));box.append(row);}
const p=document.createElement('p');p.textContent='Guardado local al preparar y al cerrar cada jornada, con respaldo anterior. Durante el servicio se retoma el último punto guardado. En cooperativo guarda el anfitrión.';box.append(p);modal.hidden=false;}
for(const [q,k]of [['#btn-start','solo'],['#btn-coop','coop']])document.querySelector(q).addEventListener('click',e=>{if(bypass)return;e.preventDefault();e.stopImmediatePropagation();screen(k);},true);
document.querySelector('#btn-lobby-go').addEventListener('click',e=>{if(!Net.peer||Net.role!=='host')return;if(pending){e.preventDefault();e.stopImmediatePropagation();restore(pending);}else{active=null;last='';}},true);
document.querySelector('#btn-lobby-back').addEventListener('click',()=>pending=null,true);
document.addEventListener('click',e=>{if(e.target.closest?.('#btn-again')){active=null;last='';}},true);
for(const q of ['#btn-open','#btn-next'])document.querySelector(q).addEventListener('click',save,true);
document.addEventListener('kiosk-name-changed',save);
const observer=new MutationObserver(save);for(const q of ['#plan','#report'])observer.observe(document.querySelector(q),{attributes:true,attributeFilter:['class']});
setInterval(save,500);window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();});
