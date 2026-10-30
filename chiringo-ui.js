import {photoThread} from './management-ui.js?v=28.17.2-flat-sand';
/* v19: Chiringo (cabecera, tarjeta «Hoy», publicaciones en tarjetas, balance de seguidores, feed de reseñas y respuesta inmediata).
   Sustituye la pestaña «Red» de v12.js por «Chiringo». Reutiliza las acciones de v12 (data-post, data-influ, data-resp).
   Planificación sin métricas garantizadas; efectos reales en social-model.js / cierre. */
import { Game, Net, hostLive } from './state.js?v=28.17.2-flat-sand';
import { ITEMS } from './config.js?v=28.17.2-flat-sand';
import { Plan, toast } from './ui.js?v=28.17.2-flat-sand';
import { Audio } from './audio.js?v=28.17.2-flat-sand';
import { netDirty } from './net.js?v=28.17.2-flat-sand';
import { eur } from './util.js?v=28.17.2-flat-sand';
import { postEffect, postBrief, trendFitLabel } from './social-model.js?v=28.17.2-flat-sand';
import { guestSend } from './coopbridge.js?v=28.17.2-flat-sand';
import { respond } from './v12-actions.js?v=28.17.2-flat-sand';
import { POSTS, INFLU } from './v12.js?v=28.17.2-flat-sand';
import { FOL, RAT, TAB, MIL, MIL_PRIZE, milestone, ctxOf, header, todayCard, ledger, postIcon, feed, archiveHtml } from './chiringo-ui-render.js?v=28.17.2-flat-sand';

let sel = null, status = null, flashId = null, flashT = 0, prev = { init: false }, prevDay = null;

function setStatus(msg, kind) { status = { msg, kind: kind || '', t: Date.now() }; }
function flash(id) { flashId = id; flashT = Date.now(); }

function riskTag(level) {
  const cls = level === 'alto' ? 'bad' : level === 'medio' ? 'mid' : 'good';
  return '<span class="rd-risk rd-risk-' + cls + '">' + level + '</span>';
}

function postCard(id, P, posted, money, c) {
  const ok = P.req ? P.req() : true, poor = money < P.cost;
  const fx = postEffect({ id, P, f: c.f, rating: c.rating, trendId: c.trendId, prevId: c.prevId });
  const hasTrend = c.trendId != null;
  const brief = postBrief({ id, P, match: hasTrend ? fx.match : undefined, fat: fx.fat, prevId: c.prevId });
  const cls = ['rd-card', !ok ? 'locked' : '', posted ? 'done' : '', sel === id ? 'sel' : '', flashId === id ? 'flash' : ''].join(' ');
  let meta = '<span>' + (P.cost ? P.cost + ' €' : 'Gratis') + '</span><span>' + (P.cost ? 'Campaña' : 'Orgánica') + '</span><span>' + riskTag(brief.riesgo) + '</span>';
  if (hasTrend) meta += '<span title="Encaje con tendencia">🔥 ' + trendFitLabel(fx.match) + '</span>';
  if (brief.repetida) meta += '<span title="Repetida">😴 repetida</span>';
  return '<div class="' + cls + '" role="button" tabindex="0" data-sel="' + id + '" aria-disabled="' + (!ok || posted) + '">' +
    '<div class="rd-ico">' + postIcon(id) + '</div><div class="rd-pn">' + P.name + '</div>' +
    '<div class="rd-meta">' + meta + '</div>' +
    '<p class="rd-card-prom">' + brief.promesa + '</p>' +
    (!ok ? '<div class="rd-lock">🔒 ' + (P.reqTxt || 'No disponible') + '</div>' : posted ? (flashId === id || Game.upgrades.socialPost === id ? '<div class="rd-ok">✅ Publicado</div>' : '') : poor ? '<div class="rd-warn">Faltan ' + (P.cost - money) + ' €</div>' : '') + '</div>';
}

function previewPanel(u, posted, c) {
  if (!sel || !POSTS[sel] || posted) return '';
  const P = POSTS[sel], money = Game.money, poor = money < P.cost, ok = P.req ? P.req() : true;
  const fx = postEffect({ id: sel, P, f: c.f, rating: c.rating, trendId: c.trendId, prevId: c.prevId });
  const hasTrend = c.trendId != null;
  const brief = postBrief({ id: sel, P, match: hasTrend ? fx.match : undefined, fat: fx.fat, prevId: c.prevId });
  return '<div class="rd-prev"><div class="rd-prev-h"><b>' + P.name + '</b><span class="rd-mut">' + P.desc + '</span></div><ul>' +
    '<li>💶 Coste: <b>' + (P.cost ? P.cost + ' €' : 'gratis') + '</b> · te quedarán <b>' + eur(money - P.cost) + '</b></li>' +
    '<li>📣 Promesa: <b>' + brief.promesa + '</b></li>' +
    '<li>⚖️ Riesgo: <b>' + brief.riesgo + '</b> · tendencia 🔥: <b>' + (hasTrend ? trendFitLabel(fx.match) : 'sin tendencia hoy') + '</b></li>' +
    '<li>⛔ Si fallas: ' + brief.siFallas + '</li>' +
    '<li>🏷️ Tipo: <b>' + (P.cost ? 'campaña pagada' : 'publicación orgánica') + '</b> · el impacto real lo veréis al cerrar la jornada</li></ul>' +
    '<div class="rd-prev-b"><button class="btn sm primary" data-post="' + sel + '" ' + (poor || !ok ? 'disabled' : '') + '>' + (poor ? 'Faltan ' + (P.cost - money) + ' €' : 'Confirmar y publicar') + '</button>' +
    '<button class="btn sm" data-selx="1">Cancelar</button></div></div>';
}

function render(force) {
  const b = document.querySelector('#tab-body');
  if (!b || Plan.tab !== TAB || Game.mode !== 'plan') return;
  const u = Game.upgrades;
  if (u[FOL] == null) return;
  if (prevDay !== Game.day) { prevDay = Game.day; sel = null; }
  const posted = u.socialPostDia === Game.day, influ = !!u.socialInfluContratado, resp = !!u.socialRespondido;
  if (Net.role === 'guest' && prev.init) {
    if (posted && !prev.posted) { setStatus('✅ Publicado hoy: ' + ((POSTS[u.socialPost] || {}).name || ''), 'good'); flash(u.socialPost); sel = null; }
    if (influ && !prev.influ) setStatus('✅ Colaboración cerrada', 'good');
    if (resp && !prev.resp) setStatus('✅ Respuesta publicada', 'good');
  }
  prev = { init: true, posted, influ, resp };
  if (flashId && Date.now() - flashT > 1400) flashId = null;
  if (status && Date.now() - status.t > 6000) status = null;
  const c = ctxOf(u);
  let h = '';
  if (status) h += '<div class="rd-status ' + status.kind + '" role="status" aria-live="polite">' + status.msg + '</div>';
  h += '<div class="cs-cover"><span>CHIRINGO</span><strong>La vida junto al mar</strong><small>Tu comunidad · Tenerife</small></div>' + header(u) + '<p class="cs-rating">Valoración pública: ' + Number(u.socialRating || 3).toFixed(1) + '/5 · Una publicación por jornada</p>' + todayCard(u, posted) + ledger(u);
  h += '<div class="rd-h">Publicar en Chiringo' + (posted ? ' <span class="rd-mut">· ya has publicado hoy, vuelve mañana</span>' : '') + '</div><div class="rd-grid">';
  for (const [id, P] of Object.entries(POSTS)) h += postCard(id, P, posted, Game.money, c);
  h += '</div>' + previewPanel(u, posted, c) + archiveHtml(u) + feed(u);
  h = '<div class="rd">' + h + '</div>';
  if (!force && b.__rd === h && b.firstChild) return;
  b.__rd = h; b.innerHTML = h;
}

function buzz() { try { navigator.vibrate && navigator.vibrate(25); } catch (e) { } }

function afterAction(t) {
  const k = t.dataset.post ? 'post' : t.dataset.influ ? 'influ' : 'resp';
  const v = t.dataset.post || t.dataset.resp || '1';
  if (Net.role === 'guest') {
    Audio.click();
    guestSend(k, k === 'influ' ? undefined : v);
    setStatus('📨 Enviado al anfitrión…', '');
    render(true);
    return;
  }
  if (!(hostLive() || Net.role === 'solo')) return;
  const u = Game.upgrades;
  if (k === 'resp') {
    respond(v);
    if (!u.socialRespondido) { Audio.bad(); buzz(); setStatus('⚠️ No se ha podido responder.', 'bad'); render(true); return; }
    setStatus('✅ Respuesta publicada · evitáis perder seguidores por la queja', 'good');
    setTimeout(() => Audio.good(), 130); buzz(); render(true);
    return;
  }
  const ok = k === 'post' ? u.socialPostDia === Game.day : !!u.socialInfluContratado;
  if (!ok) { Audio.bad(); buzz(); setStatus('⚠️ No se ha podido registrar. Revisa la caja y los requisitos.', 'bad'); render(true); return; }
  if (k === 'post') {
    const P = POSTS[t.dataset.post]; flash(t.dataset.post); sel = null;
    setStatus('✅ Publicado: ' + P.name + '. Cumplid la promesa durante la jornada.', 'good');
    if (P.cost) Audio.coin();
  } else {
    const I = INFLU[u.socialInflu];
    setStatus('✅ Colaboración cerrada con ' + I.name + '.', 'good'); Audio.coin();
  }
  setTimeout(() => Audio.good(), 130); buzz(); render(true);
}

function hito() {
  const u = Game.upgrades, f = u[FOL];
  if (f == null || Game.mode === 'title') return;
  const m = MIL.filter(x => f >= x).pop() || 0;
  if (u.socialHito == null) { u.socialHito = m; return; }
  if (m > u.socialHito) { u.socialHito = m; toast('¡Hito en Chiringo!', 'Ya sois ' + m + ' seguidores.' + (MIL_PRIZE[m] ? ' Desbloqueado: ' + MIL_PRIZE[m] + '.' : ''), 'good'); Audio.good(); netDirty(); }
  else if (m < u.socialHito) u.socialHito = m;
}

document.addEventListener('click', e => {
  const el = e.target; if (!el || !el.closest) return;
  if (el.closest('[data-selx]')) { sel = null; Audio.click(); render(true); return; }
  const s = el.closest('[data-sel]');
  if (s) {
    e.stopPropagation();
    const id = s.dataset.sel, P = POSTS[id], posted = Game.upgrades.socialPostDia === Game.day;
    if (!P) return;
    if (posted) { Audio.bad(); setStatus('ℹ️ Ya has publicado hoy. Podréis publicar de nuevo mañana.', ''); }
    else if (P.req && !P.req()) { Audio.bad(); buzz(); setStatus('🔒 ' + P.name + ': ' + (P.reqTxt || 'no disponible'), 'bad'); }
    else { Audio.click(); sel = sel === id ? null : id; }
    render(true); return;
  }
  const t = el.closest('[data-post],[data-influ],[data-resp]');
  if (t && !t.disabled && t.closest('.rd')) afterAction(t);
}, true);
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('[data-sel]')) { e.preventDefault(); e.target.click(); }
});

/* F3: tab chiringo now in HTML sidebar
const tabs = document.querySelector('#plan .tabs');
if (tabs) {
  const old = tabs.querySelector('[data-tab="red"]'); if (old) old.remove();
  if (!tabs.querySelector('[data-tab="' + TAB + '"]')) {
    const b = document.createElement('button'); b.className = 'tab'; b.dataset.tab = TAB; b.setAttribute('role', 'tab'); b.textContent = 'Chiringo';
    tabs.append(b);
  }
}
*/
document.addEventListener('plan-tab-repaint', () => { if (Plan.tab === TAB && Game.mode === 'plan') render(true); });
const body = document.getElementById('tab-body');
if (body) new MutationObserver(() => render(false)).observe(body, { childList: true });
setInterval(() => render(false), 400);
setInterval(() => { if (Net.role !== 'guest') hito(); }, 1000);

const rdSheet = document.createElement('link');
rdSheet.id = 'rd-style';
rdSheet.rel = 'stylesheet';
rdSheet.href = 'chiringo-ui-css.css?v=28.17.2-flat-sand';
document.head.append(rdSheet);

function captureArchive() {
  if (Net.role === 'guest' || !['plan','service','report'].includes(Game.mode)) return;
  const u = Game.upgrades;
  if (!u || !POSTS[u.socialPost] || u.socialPostDia !== Game.day) return;
  const season = Number(u.career && u.career.season) || 1;
  const id = season + ':' + Game.day;
  const old = Array.isArray(u.chiringoArchive) ? u.chiringoArchive : [];
  const existing = old.find(r => r.id === id);
  const stats = u.socialStats && u.socialStats.dia === Game.day ? u.socialStats : null;
  const metrics = stats ? Object.fromEntries(['reach','interactions','likes','comments'].map(k => [k, Math.max(0, Number(stats[k]) || 0)])) : null;
  const entry = existing ? {...existing} : {id,season,day:Game.day,post:u.socialPost,cost:POSTS[u.socialPost].cost,arr:Number(u.socialArr)||0,metrics:null,comments:[],threadClosed:false};
  if (!Array.isArray(entry.comments)) entry.comments = [];
  if (entry.threadClosed == null) entry.threadClosed = false;
  if (metrics) entry.metrics = metrics;
  if (existing && JSON.stringify(entry) === JSON.stringify(existing)) return;
  u.chiringoArchive = [...old.filter(r => r.id !== id),entry].slice(-60);
  netDirty();
  if (Plan.tab === TAB && Game.mode === 'plan') render(true);
}
setInterval(captureArchive, 500);

const csSheet = document.createElement('link');
csSheet.rel = 'stylesheet';
csSheet.href = 'chiringo-ui-archive.css?v=28.17.2-flat-sand';
document.head.append(csSheet);
