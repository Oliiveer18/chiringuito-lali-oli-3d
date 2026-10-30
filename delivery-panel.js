import {Game,Net,itemUnlocked} from './state.js?v=28.17.1-online-web';
import {ITEMS} from './config.js?v=28.17.1-online-web';
import {ICON_URL} from './icons.js?v=28.17.1-online-web';
import {escapeHtml,eur2} from './util.js?v=28.17.1-online-web';
import {guestSend} from './coopbridge.js?v=28.17.1-online-web';
let root=null,send=null,waiting=false,until=0,last='';
function delBtn(id,p,q){
  const base=p.cost*q, bill=base*2;
  const price='<span class="del-price"><s>'+eur2(base)+'</s> <b>'+eur2(bill)+'</b></span>';
  return '<button class="btn sm" data-del-id="'+id+'" data-del-q="'+q+'" '+(Game.money<bill?'disabled':'')+'>'+q+' · '+price+'</button>';
}
function paint(){if(!root)return;if(Game.mode!=='service'){root.remove();root=null;return;}if(Game.upgrades.deliveryItem)waiting=false;if(waiting&&Date.now()>until)waiting=false;
const intro='<p class="del-note"><strong>En jornada:</strong> precio doble del almacén.</p>';
const h='<h3>Reparto</h3><p>El servicio continúa. El tiempo depende del producto y de las unidades.</p>'+intro+'<button class="btn sm" data-del-close="1">Cerrar</button>'+(Game.upgrades.deliveryItem?'<p>Pedido en camino. Esperad a que llegue el stock.</p>':waiting?'<p>Solicitud enviada al anfitrión. Esperando confirmación…</p>':Object.entries(ITEMS).filter(([id])=>itemUnlocked(id)).map(([id,p])=>'<article><div><img width="32" height="32" alt="" src="'+(ICON_URL[id]||'')+'"> '+escapeHtml(p.name)+' · Almacén '+eur2(p.cost)+' · quedan '+(Game.stock[id]||0)+'</div><div>'+[5,10,20].map(q=>delBtn(id,p,q)).join('')+'</div></article>').join(''));
if(h!==last){last=h;root.innerHTML=h;}}
export function openDelivery(callback){send=callback;waiting=false;if(!root){root=document.createElement('section');root.id='delivery-panel';root.setAttribute('role','region');root.setAttribute('aria-label','Pedido al repartidor');root.style.cssText='position:fixed;z-index:80;right:12px;bottom:80px;width:min(380px,calc(100vw - 24px));max-height:65vh;overflow:auto;padding:16px;background:#fffdf8;color:#2a2118;border:2px solid #0f8b8d;border-radius:16px;box-shadow:0 8px 30px #0006;touch-action:pan-y';root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.delClose){root.remove();root=null;return;}const id=b.dataset.delId,q=Number(b.dataset.delQ);if(!id||![5,10,20].includes(q)||Game.mode!=='service'||Game.upgrades.deliveryItem)return;if(Net.role==='guest'){waiting=true;until=Date.now()+5000;guestSend('delivery',{id,qty:q});}else send(id,q);paint();});document.body.append(root);}last='';paint();}
setInterval(paint,250);
