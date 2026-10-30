/* Carrera infinita: interfaz. Pestaña «Carrera», pantalla de cierre de temporada / traspaso, ventajas y Legado.
   Funciona en solitario y en cooperativo: el anfitrión decide y la invitada envía sus clics por el canal de acciones. */
import { Game, Net } from './state.js?v=28.17.0-online-web';
import { SEASON_DAYS } from './config.js?v=28.17.0-online-web';
import { Plan, showPlan, toast } from './ui.js?v=28.17.0-online-web';
import { Audio } from './audio.js?v=28.17.0-online-web';
import { netDirty } from './net.js?v=28.17.0-online-web';
import { newSeason } from './sim.js?v=28.17.0-online-web';
import { guestSend, onGuestAction } from './coopbridge.js?v=28.17.0-online-web';
import { escapeHtml, eur } from './util.js?v=28.17.0-online-web';
import * as C from './career.js?v=28.17.0-online-web';

const TAB = 'carrera';
const $ = id => document.getElementById(id);
const ctxNow = () => { const U = Game.upgrades || {}; return { money: Game.money, rep: Game.rep, followers: U.socialFollowers || 0, served: (Game.season && Game.season.served) || 0 }; };
const keyOf = c => c.season + ':' + Game.day;

// ---------- Acciones (las ejecuta siempre el anfitrión) ----------
function act(a, id) {
  const c = Game.upgrades.career, cl = c && c.closed;
  if (!c || !cl || Game.mode !== 'final') return;
  if (a === 'perk') {
    if (C.choosePerk(id)) { Audio.good(); netDirty(); }
  } else if (a === 'next') {
    if (!C.canContinue(cl)) return;
    if (cl.kind === 'rescue') { c.closed = null; Game.day++; toast('Rescate', 'Seguís adelante con 300 € en caja.', ''); }
    else { C.nextSeason(); toast('Temporada ' + c.season, c.obj.text + '.', 'good'); }
    Plan.tab = 'compras'; Audio.good(); showPlan(); netDirty();
  } else if (a === 'buy') {
    if (C.buyLegacy(id)) { Audio.coin(); netDirty(); } else Audio.bad();
  } else if (a === 'new') {
    if (cl.kind !== 'bankrupt') return;
    newSeason(); Plan.tab = 'compras'; Audio.good(); showPlan(); netDirty();
  }
}
onGuestAction('cr', v => { if (v && typeof v.a === 'string') act(v.a, typeof v.id === 'string' ? v.id : ''); });

document.addEventListener('click', e => {
  const el = e.target; if (!el || !el.closest) return;
  // el botón antiguo «Jugar otra temporada» reiniciaría toda la carrera: se bloquea si hay una en curso
  if (el.closest('#btn-again') && Game.upgrades && Game.upgrades.career) { e.stopPropagation(); e.preventDefault(); return; }
  const b = el.closest('[data-cr]'); if (!b || b.disabled) return;
  e.stopPropagation();
  if (Net.role === 'guest') { Audio.click(); guestSend('cr', { a: b.dataset.cr, id: b.dataset.id || '' }); return; }
  act(b.dataset.cr, b.dataset.id || '');
}, true);

// ---------- Pantallas ----------
const cell = (k, v) => '<div><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
const grid = cl => '<div class="final-stats">' + cell('En caja', eur(cl.money)) + cell('Valoración', cl.rep.toFixed(1).replace('.', ',') + ' / 5') + cell('Clientes atendidos', cl.served) + cell('Mejor día', eur(cl.bestDay)) + '</div>';
const perkBtn = (id, cl) => '<button class="cr-offer ' + (cl.chosen === id ? 'on' : '') + '" data-cr="perk" data-id="' + id + '" ' + (cl.chosen ? 'disabled' : '') + '><b>' + C.PERKS[id].name + '</b><span>' + C.PERKS[id].desc + '</span></button>';

function seasonHtml(c, cl) {
  const o = c.obj, next = C.objectiveFor(c.season + 1, Game.money, Game.upgrades.socialFollowers || 0);
  let h = '<p class="eyebrow">Temporada ' + c.season + ' · cierre</p><h1>' + (cl.ok ? '¡Objetivo cumplido!' : 'Objetivo no cumplido') + '</h1>' +
    '<p class="lead">' + escapeHtml(o.text) + '.<br><b>' + C.valueText(o, cl.value) + '</b> de ' + C.valueText(o, o.target) + '.' + (cl.rescued ? '<br>Os salvó el colchón de emergencia.' : '') + '</p>' + grid(cl) +
    '<p class="muted">Sello «Cierre sin números rojos»: ' + (cl.selloOk ? '✅ conseguido' : '❌ no conseguido') + '</p>' +
    '<p class="muted">Legado: <b>+' + cl.pts + '</b> · total ' + c.leg.points + ' puntos</p>';
  if (cl.ok) h += '<p class="eyebrow small">Elegid una ventaja para toda la carrera</p><div class="cr-offers">' + cl.offers.map(id => perkBtn(id, cl)).join('') + '</div>';
  else h += '<p class="muted">Esta vez sin ventaja. Una subvención de 200 € os ayuda a arrancar la siguiente temporada.</p>';
  h += '<p class="muted">Siguiente objetivo: <b>' + escapeHtml(next.text) + '</b></p>';
  h += '<button class="btn primary big" data-cr="next" ' + (C.canContinue(cl) ? '' : 'disabled') + '>' + (cl.ok && !cl.chosen ? 'Elegid una ventaja' : 'Empezar temporada ' + (c.season + 1)) + '</button>';
  if (Net.role !== 'solo') h += '<p class="muted">Cualquiera de los dos puede elegir y continuar.</p>';
  return h;
}
function rescueHtml(c, cl) {
  return '<p class="eyebrow">Temporada ' + c.season + ' · día ' + Game.day + '</p><h1>¡Os habéis salvado por los pelos!</h1>' +
    '<p class="lead">La caja estaba por debajo de −300 €, pero vuestro rescate os devuelve a 300 €. Se ha gastado uno.</p>' +
    '<button class="btn primary big" data-cr="next">Seguir con la temporada</button>';
}
function bankruptHtml(c, cl) {
  const shop = Object.entries(C.LEGACY).map(([id, it]) => {
    const owned = c.leg.owned.includes(id), afford = c.leg.points >= it.cost;
    return '<button class="cr-offer ' + (owned ? 'on' : '') + '" data-cr="buy" data-id="' + id + '" ' + (owned || !afford ? 'disabled' : '') + '><b>' + it.name + ' · ' + (owned ? 'comprada' : it.cost + ' pts') + '</b><span>' + it.desc + '</span></button>';
  }).join('');
  return '<p class="eyebrow">Fin de la carrera · temporada ' + cl.seasons + '</p><h1>Traspaso del chiringuito</h1>' +
    '<p class="lead">El banco ha dicho basta, pero el nombre del Charco Azul se queda en la costa. Habéis facturado <b>' + eur(cl.careerRevenue) + '</b> en total.</p>' +
    grid(cl) + '<p class="muted">Legado: <b>+' + cl.pts + '</b> · tenéis <b>' + c.leg.points + '</b> puntos para la próxima carrera</p>' +
    '<p class="eyebrow small">Legado de la familia (permanente)</p><div class="cr-offers">' + shop + '</div>' +
    '<button class="btn primary big" data-cr="new">Empezar una nueva carrera</button>';
}
function finalHtml(c) {
  const cl = c.closed; if (!cl) return '';
  return cl.kind === 'bankrupt' ? bankruptHtml(c, cl) : cl.kind === 'rescue' ? rescueHtml(c, cl) : seasonHtml(c, cl);
}
function paintFinal(c) {
  const card = $('final-card'); if (!card || !c.closed) return;
  const h = finalHtml(c);
  if (card.__cr === h && card.querySelector('[data-cr]')) return;
  card.__cr = h; card.innerHTML = h;
}

export function tabHtml(c) {
  const ctx = ctxNow(), o = c.obj, v = C.valueOf(o, ctx), pct = C.progressPct(o, ctx);
  const left = C.rescuesLeft(c);
  let h = '<div class="cr"><div class="cr-head"><div><div class="cr-t">Temporada ' + c.season + '</div><div class="cr-s">Día ' + Game.day + ' de ' + SEASON_DAYS + ' · día ' + C.careerDay(c) + ' de la carrera</div></div>' +
    '<div class="cr-leg">Legado<b>' + (c.leg ? c.leg.points : 0) + '</b></div></div>' +
    '<div class="cr-card"><div class="cr-k">Objetivo · ' + o.title + '</div><div class="cr-o">' + escapeHtml(o.text) + '</div>' +
    '<div class="cr-bar"><i style="width:' + pct + '%"></i></div><div class="cr-p"><span>' + C.valueText(o, v) + ' de ' + C.valueText(o, o.target) + '</span><span>' + pct + ' %</span></div></div>' +
    '<div class="cr-card"><div class="cr-k">Sello · Cierre sin números rojos</div><div class="cr-o">' + ((c.red || 0) === 0 ? '✅ En camino: ningún cierre con la caja en negativo.' : '❌ Perdido esta temporada (' + c.red + ' cierre(s) en rojo).') + '</div></div>';
  h += '<div class="rd-h cr-h">Ventajas de la carrera</div>';
  h += c.perks.length ? '<ul class="cr-list">' + c.perks.map(id => '<li><b>' + C.PERKS[id].name + '</b><span>' + C.PERKS[id].desc + '</span></li>').join('') + '</ul>' : '<p class="cr-m">Aún ninguna. Se eligen al cumplir el objetivo de cada temporada.</p>';
  h += '<div class="rd-h cr-h">Legado de la familia</div>';
  h += c.leg && c.leg.owned.length ? '<ul class="cr-list">' + c.leg.owned.map(id => '<li><b>' + C.LEGACY[id].name + '</b><span>' + C.LEGACY[id].desc + '</span></li>').join('') + '</ul>' : '<p class="cr-m">Se compra con puntos cuando una carrera termina en traspaso.</p>';
  h += '<p class="cr-m">Rescates disponibles: <b>' + Math.max(0, left) + '</b></p>';
  if (c.hist.length) h += '<div class="rd-h cr-h">Historial</div><ul class="cr-list">' + c.hist.slice().reverse().map(x => '<li><b>Temporada ' + x.season + '</b><span>' + (x.ok ? '✅ objetivo' : '❌ objetivo') + (x.selloOk ? ' · ✅ sello' : '') + ' · +' + x.pts + ' Legado' + (x.perk ? ' · ' + C.PERKS[x.perk].name : '') + '</span></li>').join('') + '</ul>';
  const t = c.totals; h += '<p class="cr-m">Total de la carrera (temporadas cerradas): ' + eur(t.revenue) + ' facturados · ' + t.served + ' clientes atendidos.</p></div>';
  return h;
}
function paintTab(c) {
  const b = $('tab-body'); if (!b || Plan.tab !== TAB || Game.mode !== 'plan') return;
  const h = tabHtml(c);
  if (b.__cr === h && b.firstElementChild && b.firstElementChild.classList.contains('cr')) return;
  b.__cr = h; b.innerHTML = h;
}
function patchPlan(c) {
  if (Game.mode !== 'plan') return;
  const eb = $('plan-eyebrow');
  if (eb && eb.textContent && !eb.textContent.startsWith('Temporada')) eb.textContent = 'Temporada ' + c.season + ' · ' + eb.textContent;
  const fc = [...document.querySelectorAll('#forecast .fc')].find(x => { const k = x.querySelector('.k'); return k && k.textContent === 'Objetivo'; });
  if (fc) {
    const ctx = ctxNow(), sig = c.season + '|' + C.progressPct(c.obj, ctx);
    if (fc.dataset.cr !== sig) {
      const v = fc.querySelector('.v'), d = fc.querySelector('.d');
      if (v) v.textContent = c.obj.short;
      if (d) d.textContent = c.obj.text + ' · ' + C.progressPct(c.obj, ctx) + ' % · quedan ' + Math.max(0, SEASON_DAYS - Game.day + 1) + ' días.';
      fc.dataset.cr = sig;
    }
  }
}

// ---------- Bucle ----------
function step() {
  const U = Game.upgrades; if (!U) return;
  const host = Net.role !== 'guest';
  if (host && Game.mode === 'plan' && !U.career) { C.initCareer(); netDirty(); }
  const c = U.career;
  if (!c) { C.resetEffects(); return; }
  C.applyEffects(c);
  if (host) {
    if (Game.mode === 'report' && c.redKey !== keyOf(c)) { c.redKey = keyOf(c); if (Game.money < 0) c.red = (c.red || 0) + 1; }
    if (Game.mode === 'final' && (!c.closed || c.closed.key !== keyOf(c))) { C.closeSeason(); netDirty(); }
    if (Game.mode === 'service' && c.arrKey !== keyOf(c)) { c.arrKey = keyOf(c); Game.mods.arr *= C.effectsFor(c).arrMul; }
  }
  if (Game.mode === 'final') paintFinal(c);
  patchPlan(c);
}
setInterval(step, 300);
for (const id of ['final-card', 'tab-body']) { const el = $(id); if (el) new MutationObserver(step).observe(el, { childList: true }); }

// v27.9: la pestaña Carrera se fusionó con Progreso; progression-ui pinta tabHtml dentro de su pestaña.

