/* ui-polish v27.77: clima de hoy, agenda compacta, reseñas y sistema unificado de estrellas. */
import { Game } from './state.js?v=28.17.2-flat-sand';
import { SPECIAL_DAYS, WEATHER } from './config.js?v=28.17.2-flat-sand';
const svgWrap=inner=>`<svg class="wicon" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
const SUN=svgWrap('<circle cx="12" cy="12" r="5" fill="#f5b82e"/><g stroke="#f5b82e" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></g>');
const CLOUD=svgWrap('<circle cx="9" cy="9" r="4" fill="#f5b82e"/><path d="M7 18h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.5 3.5 0 0 0 7 18z" fill="#cfd8dc"/>');
const HAZE=svgWrap('<circle cx="12" cy="8" r="4" fill="#e8b04a"/><path d="M3 15h18M5 18h14" stroke="#d9a24a" stroke-width="2" stroke-linecap="round"/>');
const WIND=svgWrap('<path d="M3 8h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 18h8" stroke="#7fb7c9" stroke-width="2" fill="none" stroke-linecap="round"/>');
const ICONS={sol:SUN,panza:CLOUD,calima:HAZE,viento:WIND};
const iconFor=w=>ICONS[w]||CLOUD;export { iconFor };
const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
const cap=s=>s?s[0].toUpperCase()+s.slice(1):'';
function weatherAt(d){const w=(Game.forecast&&Game.forecast[d-1])||'sol';return WEATHER[w]?w:'sol';}
function dayCard(d,i){const w=weatherAt(d),W=WEATHER[w]||{label:cap(w),desc:''};const ev=SPECIAL_DAYS[d];return `<div class="fc${i===0?' today':''}${ev?' event':''}"><div class="k">${i===0?'Hoy · Día '+d:'Día '+d}</div><div class="v">${iconFor(w)}<span>${esc(W.label)}</span></div><div class="d">${esc(ev?ev.title:(W.desc||''))}</div></div>`;}
function agenda(){
  // v28.5: no sustituir la tira multi-tarjeta de ui-plan renderForecast; solo marcar «Hoy».
  if(Game.mode!=='plan')return;
  const fc=document.getElementById('forecast');
  if(!fc||!fc.querySelector('.fc'))return;
  fc.querySelectorAll('.fc').forEach((el,i)=>el.classList.toggle('today',i===0));
}
document.addEventListener('plan-tab-repaint',agenda);

function norm(s){return String(s||'').toLowerCase().replace(/\s+/g,' ').trim();}
function starCount(card){const el=card.querySelector('.rev-stars');if(!el)return 0;const m=el.textContent.match(/★|☆/g)||[];return m.filter(c=>c==='★').length;}
function polishReviews(){
 const rep=document.getElementById('rep-body');
 if(!rep||Game.mode!=='report')return;
 const seen=new Set();
 const cards=[...rep.querySelectorAll('.review')];
 cards.forEach(card=>{
  const txt=card.querySelector('.rev-text');
  const starsEl=card.querySelector('.rev-stars');
  if(starsEl&&!starsEl.dataset.polished){const filled=starCount(card);starsEl.dataset.polished='1';starsEl.innerHTML=`<span class="stars"><b>${'★'.repeat(filled)}</b><span>${'☆'.repeat(5-filled)}</span></span>`;}
  card.querySelectorAll('.net-actions .btn').forEach(b=>{const t=b.textContent||'';if(t.includes('Disculparte'))b.classList.add('primary');else if(t.includes('Invitar'))b.classList.add('teal');});
  const nameEl=card.querySelector('.rev-head b');
  const name=norm(nameEl?nameEl.textContent:'');
  if(name&&seen.has(name)){card.classList.add('dup');}else{if(name)seen.add(name);card.classList.remove('dup');}
 });
 const visible=cards.filter(c=>!c.classList.contains('dup'));
 visible.forEach((c,i)=>c.classList.toggle('extra',i>=3&&!rep.classList.contains('show-all')));
 const wrap=rep.querySelector('.reviews');
 if(!wrap)return;
 let summary=wrap.querySelector('.rev-summary');
 if(visible.length){
  const total=visible.reduce((a,c)=>a+starCount(c),0);
  const avg=visible.length?total/visible.length:0;
  const pos=visible.filter(c=>starCount(c)>=4).length;
  const neu=visible.filter(c=>starCount(c)===3).length;
  const neg=visible.filter(c=>starCount(c)<=2).length;
  const html=`<div class="rev-summary"><div><span class="k">Valoración media</span><b>${avg.toFixed(1)} ★</b></div><div><span class="k">Reseñas</span><b>${visible.length}</b></div><div><span class="k">Reparto</span><b>${pos} positivas · ${neu} neutras · ${neg} negativas</b></div></div>`;
  if(!summary){wrap.insertAdjacentHTML('afterbegin',html);summary=wrap.querySelector('.rev-summary');}
  else summary.outerHTML=html;
 } else if(summary)summary.remove();
 let btn=rep.querySelector('#btn-all-reviews');
 if(visible.length>3){
  if(!btn){btn=document.createElement('button');btn.id='btn-all-reviews';btn.className='btn text';btn.type='button';btn.addEventListener('click',()=>rep.classList.toggle('show-all'));wrap.after(btn);}
  btn.textContent=rep.classList.contains('show-all')?'Mostrar menos comentarios':`Ver todos los comentarios (${visible.length})`;
 } else if(btn)btn.remove();
}
setInterval(()=>{agenda();polishReviews();},400);
