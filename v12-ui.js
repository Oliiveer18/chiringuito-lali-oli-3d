/* Pantalla de Chiringo: banner, pestaña Red y reparto. Lo importa v12.js. */
import { Game, Net, hostLive } from './state.js?v=28.17.1-online-web';
import { ITEMS } from './config.js?v=28.17.1-online-web';
import { Plan } from './ui.js?v=28.17.1-online-web';
import { guestSend } from './coopbridge.js?v=28.17.1-online-web';
import { openDelivery } from './delivery-panel.js?v=28.17.1-online-web';
import { POSTS, INFLU, FOL, RAT } from './v12-posts.js?v=28.17.1-online-web';
import { publish, hireInflu, respond, repairBatidora, quitBatidos, orderDelivery } from './v12-actions.js?v=28.17.1-online-web';
/* UI */
function banner(){let b=document.getElementById('v12-banner');if(Game.upgrades.batidoraRota&&Game.mode==='service'){if(!b){b=document.createElement('div');b.id='v12-banner';b.style.cssText='position:fixed;left:50%;transform:translateX(-50%);top:64px;z-index:70;background:#7a1f1f;color:#fff;padding:10px 14px;border-radius:12px;font:600 13px Satoshi,system-ui;box-shadow:0 6px 18px rgba(0,0,0,.4);display:flex;gap:8px;align-items:center';document.body.append(b);}b.innerHTML='<span>🛑 Batidora rota · sin batidos</span><button id="v12-fix" style="background:#ffd36b;border:0;border-radius:8px;padding:6px 10px;font-weight:700">Reparar 120 €</button><button id="v12-quit" style="background:transparent;border:1px solid #fff;color:#fff;border-radius:8px;padding:6px 10px">Quitar hoy</button>';}else if(b)b.remove();}
setInterval(banner,400);
document.addEventListener('click',e=>{const id=e.target.id;if(id!=='v12-fix'&&id!=='v12-quit')return;if(Net.role==='guest'){guestSend(id==='v12-fix'?'fix':'quit');return;}if(id==='v12-fix')repairBatidora();else quitBatidos();});
/* F3: tab 'red' removed — chiringo-ui handles 'chiringo' tab now */
function stars(r){const n=Math.round(r);return '★'.repeat(n)+'☆'.repeat(5-n);}
export function renderRed(){const b=document.querySelector('#tab-body');if(!b||Plan.tab!=='red')return;const f=Game.upgrades[FOL]||0,r=Game.upgrades[RAT]||3;const posted=Game.upgrades.socialPostDia===Game.day;let h='<p class="muted" style="margin:0 0 6px"><b>Chiringo</b> · '+f+' seguidores · valoración pública '+stars(r)+' ('+r.toFixed(1)+')</p>';
 const tr=Game.upgrades.socialTrend;if(tr&&ITEMS[tr]&&Game.upgrades.socialTrendDia===Game.day)h+='<p class="muted">📈 Tendencia hoy: <b>'+ITEMS[tr].name+'</b>. Vende 3 o más y publicadlo para ganar seguidores.</p>';
 const inf=Game.upgrades.socialInflu;if(inf&&Game.upgrades.socialInfluDia===Game.day&&!Game.upgrades.socialInfluContratado){const I=INFLU[inf];h+='<div class="row"><div><div class="name">Colaboración: '+I.name+'</div><div class="sub">'+I.cost+' € · +'+Math.round(I.arr*100)+'% afluencia · +'+I.followers+' seguidores. '+I.reqTxt+'</div></div><div class="ctrl"><button class="btn sm primary" data-influ="1" '+(Game.money<I.cost||!I.req()?'disabled':'')+'>Contratar</button></div></div>';}
 if(posted)h+='<p class="muted">Publicado hoy: <b>'+(POSTS[Game.upgrades.socialPost]||{}).name+'</b>.</p>';
 if(posted&&Game.upgrades.socialPost==='encuesta'&&ITEMS[Game.upgrades.socialPoll])h+='<p class="muted">🗳️ Ha ganado: <b>'+ITEMS[Game.upgrades.socialPoll].name+'</b>.</p>';
 for(const [id,P] of Object.entries(POSTS)){const ok=P.req?P.req():true;h+='<div class="row"><div><div class="name">'+P.name+'</div><div class="sub">'+P.desc+' Coste: '+P.cost+' € · +'+Math.round(P.arr*100)+'% afluencia · +'+P.followers+' seguidores.</div></div><div class="ctrl"><button class="btn sm primary" data-post="'+id+'" '+(posted||!ok||Game.money<P.cost?'disabled':'')+'>'+(posted?'Publicado':'Publicar')+'</button></div></div>';}
 const cms=Game.upgrades.socialComments||[];if(cms.length){h+='<p class="eyebrow small">Comentarios</p>'+cms.map(c=>'<p class="muted" style="margin:4px 0">“'+c+'”</p>').join('');const last=cms[0];const neg=Game.upgrades.socialNegativo!=null?Game.upgrades.socialNegativo===1:/tard|falt|caro|decep/i.test(last);if(neg&&!Game.upgrades.socialRespondido)h+='<div class="row"><div><div class="name">Responder a “'+last.slice(0,28)+'…”</div><div class="sub">Disculparos (gratis) u ofrecer un descuento (50 €).</div></div><div class="ctrl"><button class="btn sm teal" data-resp="disculpa">Disculpar</button><button class="btn sm primary" data-resp="descuento" '+(Game.money<50?'disabled':'')+'>Descuento</button></div></div>';}
 b.innerHTML=h;}
new MutationObserver(renderRed).observe(document.getElementById('tab-body'),{childList:true,subtree:true});
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-post],[data-influ],[data-resp]');if(!t||t.disabled)return;const k=t.dataset.post?'post':t.dataset.influ?'influ':'resp',v=t.dataset.post||t.dataset.resp||'1';if(Net.role==='guest'){guestSend(k,v);return;}if(!(hostLive()||Net.role==='solo'))return;if(k==='post')publish(v);else if(k==='influ')hireInflu();else respond(v);},true);
setInterval(renderRed,500);
function bindDeliveryHud(){const b=document.getElementById('btn-delivery');if(!b||b.dataset.v12Bound)return;b.dataset.v12Bound='1';b.addEventListener('click',()=>{if(Game.mode!=='service')return;openDelivery(orderDelivery);});}
bindDeliveryHud();
setInterval(bindDeliveryHud,800);
