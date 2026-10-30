import {Game,Net,simProgressDay} from './state.js?v=28.17.1-online-web';
import {escapeHtml,eur} from './util.js?v=28.17.1-online-web';
const allowed=new Set(['delivery','social','influencers','compensations','repairs','shows','production','interest','staffExtras','posters','upgrades','training']);
const labels={delivery:'Compras al repartidor',social:'Publicaciones de Chiringo',influencers:'Colaboraciones',compensations:'Compensaciones de Chiringo',repairs:'Reparaciones',shows:'Espectaculos (neto de devoluciones)',production:'Produccion de algodon',interest:'Intereses',staffExtras:'Primas de personal',posters:'Promocion de eventos',upgrades:'Mejoras',training:'Formacion'};
const n=v=>Number.isFinite(v)?v:0;
function book(){const u=Game.upgrades,d=simProgressDay();if(u.financeBook?.day!==d)u.financeBook={day:d,operating:{},capital:{}};return u.financeBook;}
function synchronize(){const b=book(),s=Game.dayStats;if(!s)return;if(s.ledgerDay==null)s.ledgerDay=b.day;if(s.ledgerDay===b.day){s.extraCosts={...b.operating};s.investments={...b.capital};}}
function record(amount,category,capital){if(Net.role==='guest')return false;if(!allowed.has(category)||!Number.isFinite(amount))throw Error('Movimiento contable no valido');if(!amount)return true;const b=book(),bucket=capital?b.capital:b.operating;bucket[category]=n(bucket[category])+amount;synchronize();Net.sendT=1e9;return true;}
export function trackCost(amount,category,capital=false){if(amount<0)throw Error('Coste negativo');return record(amount,category,capital);}
export function trackRefund(amount,category){if(amount<0)throw Error('Devolucion negativa');return record(-amount,category,false);}
export function beginLedgerDay(){const b=book();Game.dayStats.ledgerDay=b.day;Game.dayStats.extraCosts={...b.operating};Game.dayStats.investments={...b.capital};}
export function totalExtras(s){return Object.values(s.extraCosts||{}).reduce((a,b)=>a+n(b),0);}
export function operatingResult(s,a){return n(s.revenue)+n(s.hamacas)-n(a.wage)-n(a.rent)-n(s.fines)-n(s.urgent)-n(s.purchases)-n(s.courtesies)-totalExtras(s);}
export function ledgerHtml(s){return Object.entries(s.extraCosts||{}).filter(([,v])=>n(v)!==0).map(([k,v])=>'<span>'+escapeHtml(labels[k]||k)+'</span><span class="'+(v>=0?'neg':'pos')+'">'+(v>=0?'−':'+')+eur(Math.abs(v))+'</span>').join('');}
export function capitalNote(s){const rows=Object.entries(s.investments||{}).filter(([,v])=>n(v)>0);return (rows.length?'<p class="muted" style="margin:0 24px 12px">Inversiones registradas, fuera del resultado operativo: '+rows.map(([k,v])=>escapeHtml(labels[k]||k)+' '+eur(v)).join(' · ')+'.</p>':'')+(Game.upgrades.accountingLegacyUnknown?'<p class="muted">Esta partida antigua no guardaba el coste pendiente de compras. No se han inventado ni vuelto a cobrar importes anteriores a la actualizacion.</p>':'');}
