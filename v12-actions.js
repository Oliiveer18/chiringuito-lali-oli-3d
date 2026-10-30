/* Incidentes, publicaciones y pedidos. Lo importa v12.js. */
import { trackCost } from './bookkeeping.js?v=28.17.0-online-web';
import { capturePhoto } from './management-ui.js?v=28.17.0-online-web';
import { Game, Net, itemUnlocked, setTimeoutGame } from './state.js?v=28.17.0-online-web';
import { ITEMS } from './config.js?v=28.17.0-online-web';
import { rnd, clamp } from './util.js?v=28.17.0-online-web';
import { toast } from './ui.js?v=28.17.0-online-web';
import { netDirty } from './net.js?v=28.17.0-online-web';
import { spawnCustomer } from './sim.js?v=28.17.0-online-web';
import { onGuestAction } from './coopbridge.js?v=28.17.0-online-web';
import { postEffect, influEffect } from './social-model.js?v=28.17.0-online-web';
import { POSTS, INFLU, FOL, RAT } from './v12-posts.js?v=28.17.0-online-web';
import { addPend } from './v12-day.js?v=28.17.0-online-web';
import { rt } from './v12-state.js?v=28.17.0-online-web';
export function runIncident(){
 const t=Game.upgrades.incidentTipo;delete Game.upgrades.incidentHora;if(!t)return;
 if(t==='batidora'){Game.upgrades.batidoraRota=1;Game.enabled.batido=false;toast('Se rompe la batidora','Los batidos quedan bloqueados. Reparadla (120 €) o quitadlos hoy.','bad');}
 else if(t==='vip'){rt.vipBase=Game.dayStats?Game.dayStats.served:0;rt.vipDone=false;rt.vipIds=[];for(let i=0;i<2;i++)setTimeoutGame(()=>{if(Game.mode!=='service')return;spawnCustomer('turista');const c=Game.customers[Game.customers.length-1];if(c){c.vip=true;rt.vipIds.push(c.id);}},i*0.8);toast('Cliente VIP','Ha llegado un cliente importante con acompañante. Atendedlo rápido: gran propina y reputación.','good');}
 else if(t==='punta'){rt.puntaEnd=Game.t+120;Game.mods.arr*=1.45;toast('Hora punta doble','Llegan turistas y locales a la vez. ¡Repartíos las colas!','bad');}
 else if(t==='inspeccion'){const dirty=Game.tables.filter(x=>x.state==='dirty').length;if(dirty>=1){const fine=100*Math.min(4,dirty);Game.money-=fine;Game.dayStats.fines=(Game.dayStats.fines||0)+fine;Game.rep=clamp(Game.rep-0.15,0,5);toast('Inspección de Sanidad',dirty+' mesa(s) sucia(s). Multa: '+fine+' €.','bad');}else{Game.rep=clamp(Game.rep+0.15,0,5);toast('Inspección de Sanidad','Todo limpio. +0,15 de valoración.','good');}}
 else if(t==='grupo'){const n=3+Math.floor(rnd()*4);for(let i=0;i<n;i++)setTimeoutGame(()=>{if(Game.mode==='service')spawnCustomer(rnd()<0.6?'turista':'local');},i*1.2);toast('Grupo en el kiosco','Ha llegado un grupo de '+n+' personas. Muchos pedidos y pocas mesas.','bad');}
 netDirty();
}
export function repairBatidora(){if(!Game.upgrades.batidoraRota)return;if(Game.money<120){toast('Sin caja','La reparación cuesta 120 €.','bad');return;}Game.money-=120;trackCost(120,'repairs');Game.upgrades.batidoraReparaT=20;delete Game.upgrades.batidoraRota;toast('Reparando batidora','El técnico llega en 20 segundos.','');netDirty();}
export function quitBatidos(){if(!Game.upgrades.batidoraRota)return;Game.upgrades.batidoraQuitada=1;delete Game.upgrades.batidoraRota;toast('Batidos fuera del menú','Hoy no habrá batidos.','');netDirty();}
export function publish(id){const P=POSTS[id],U=Game.upgrades;if(!P||U.socialPostDia===Game.day)return;if(Game.money<P.cost){toast('Sin caja','No llega para publicar.','bad');return;}if(P.req&&!P.req()){toast('No disponible',P.reqTxt||'No cumples el requisito.','bad');return;}
 const trendId=(U.socialTrendDia===Game.day)?U.socialTrend:null,prevId=(U.socialPostDia===Game.day-1)?U.socialPost:null;
 const fx=postEffect({id,P,f:U[FOL]||0,rating:U[RAT]||3,trendId,prevId});
 Game.money-=P.cost;trackCost(P.cost,'social');U.socialPost=id;U.socialPostDia=Game.day;delete U.socialAplicado;U.socialArr=fx.arr;U.socialIdle=0;if(U.socialCalendar)U.socialCalendar.idle=0;capturePhoto(id,P.cost,fx.arr);addPend(P.name,fx.followers,{post:true});
 toast('Publicado en Chiringo',P.name+'. Cumplid lo prometido durante la jornada; el impacto real lo veréis al cerrar.'+(fx.fat<1?' Publicación repetida: menos margen.':''),'good');
 if(id==='encuesta'){const w=rnd()<0.5?'papas':'pescado';U.socialPoll=w;toast('Encuesta cerrada','La gente ha votado: '+ITEMS[w].name+'. Vended 3 o más hoy.','');}netDirty();}
export function hireInflu(){const U=Game.upgrades,k=U.socialInflu;if(!k||U.socialInfluContratado)return;const I=INFLU[k];if(Game.money<I.cost){toast('Sin caja','No llega para el influencer.','bad');return;}if(!I.req()){toast('No disponible',I.reqTxt,'bad');return;}const ie=influEffect({I,f:U[FOL]||0,rating:U[RAT]||3});Game.money-=I.cost;trackCost(I.cost,'influencers');addPend(I.name,ie.followers,{prest:true});U.socialInfluArr=ie.arr;U.socialInfluContratado=1;toast('Colaboración cerrada',I.name+' visitará el chiringuito hoy. Muchos seguidores son prestados: conviene una buena jornada.','good');netDirty();}
export function respond(kind){if(Game.upgrades.socialRespondido)return;const last=(Game.upgrades.socialComments||[])[0];if(!last)return;if(kind==='disculpa'){addPend('Respuesta',1);Game.upgrades[RAT]=clamp(Game.upgrades[RAT]+0.05,1,5);}else{if(Game.money<50){toast('Sin caja','El descuento cuesta 50 €.','bad');return;}Game.money-=50;trackCost(50,'compensations');addPend('Respuesta',3);Game.upgrades[RAT]=clamp(Game.upgrades[RAT]+0.15,1,5);}Game.upgrades.socialRespondido=1;toast('Respuesta publicada',kind==='disculpa'?'Habéis respondido con una disculpa.':'Habéis ofrecido un descuento.', 'good');netDirty();}
export function deliveryWait(id,qty){const it=ITEMS[id]||{prep:1,cost:1};const prep=Number(it.prep)||1;const bulk=Math.ceil(qty/5);return 6+prep*2.5+bulk*2.5+qty*0.15+rnd()*4;}
export function orderDelivery(id,qty){if(Game.mode!=='service'||!Number.isInteger(qty)||qty<1||qty>20)return;const it=ITEMS[id];if(!it||Game.upgrades.deliveryItem)return;if(!itemUnlocked(id)){toast('No disponible','Ese producto aún no está desbloqueado.','bad');return;}const bill=it.cost*qty*2;if(Game.money<bill){toast('Sin caja','No llega para ese pedido (precio doble en jornada).','bad');return;}Game.money-=bill;trackCost(bill,'delivery');Game.upgrades.deliveryItem=id;Game.upgrades.deliveryQty=qty;Game.upgrades.deliveryT=deliveryWait(id,qty);toast('Pedido en camino',qty+' × '+it.name+' · '+bill.toFixed(2).replace('.',',')+' € (2× almacén) · llegada en unos '+Math.round(Game.upgrades.deliveryT)+' s de juego.','');netDirty();}
// acciones que la invitada envía al anfitrión (se validan igual que si las pulsara él)
onGuestAction('post',v=>{if(typeof v==='string')publish(v);});
onGuestAction('influ',()=>hireInflu());
onGuestAction('resp',v=>{if(v==='disculpa'||v==='descuento')respond(v);});
onGuestAction('fix',()=>repairBatidora());
onGuestAction('quit',()=>quitBatidos());
onGuestAction('delivery',v=>{if(v&&typeof v.id==='string')orderDelivery(v.id,Math.min(20,Math.max(1,Math.floor(Number(v.qty))||1)));});
