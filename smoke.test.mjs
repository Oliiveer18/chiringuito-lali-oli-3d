/* Prueba de humo de las ampliaciones v11-v14 y del canal cooperativo (sin navegador).
   Carga los módulos reales (config, util, state, coopbridge, features, v12, v14) y sustituye solo lo que
   depende del DOM (ui, net, sim, icons). Simula 15 días y comprueba las reglas principales.
   Uso: node smoke.test.mjs   (Node 18.19 o superior) */
import { register } from 'node:module';

const STUBS = {
  './ui.js': "export const Plan={tab:'compras'};export const toasts=[];export const toast=(t,x,k)=>{toasts.push([t,x,k]);};export const toastLocal=toast;export const updateStockbar=()=>{};export const refreshPlanMoney=()=>{};export const staffAvatar=()=>'data:x';export function renderTab(){};export function showPlan(){};export function hideAll(){};export function showFinal(){};export function updateReadyUI(){};",
  './net.js': "export const sent=[];export const netDirty=()=>{};export const netAct=o=>{sent.push(o);};",
  './sim.js': "export const spawned=[];let n=0;export const spawnCustomer=t=>{spawned.push(t);globalThis.Game.customers.push({id:++n,type:t});};export function buyStock(){};export function difficultyProfile(){return{arrivals:1,patience:1,peak:0,label:''};};export function difficultyRush(){return 1;};export function repArrivalMult(){return 1;};export function newSeason(){};export function startDay(){};",
  './icons.js': "export const ICON_URL={};export const EXTRA={};export function rr(){};",
};
const hook = 'const S=' + JSON.stringify(STUBS) + ';export async function resolve(s,c,n){const base=s.split("?")[0];const stub=S[s]||S[base];if(stub)return{url:"data:text/javascript,"+encodeURIComponent(stub),shortCircuit:true};return n(s,c);}';
register('data:text/javascript,' + encodeURIComponent(hook), import.meta.url);

// ---------- DOM mínimo ----------
const intervals = [], clicks = [], errors = [];
globalThis.window = globalThis;
globalThis.setInterval = fn => { intervals.push(fn); return 1; };
const canvas = () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }), toDataURL: () => 'data:x', addEventListener() {}, style: {}, classList: { add() {}, remove() {}, toggle() {} } });
const el = () => ({ dataset: {}, style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {} }, append() {}, appendChild() {}, remove() {}, querySelector: () => null, setAttribute() {}, addEventListener() {}, innerHTML: '', textContent: '', childElementCount: 0, children: [], getClientRects: () => [], getBoundingClientRect: () => ({ height: 0, top: 0, left: 0, width: 0 }) });
const byId = {}, tabs = el();
globalThis.document = {
  querySelector: s => (s === '#plan .tabs' ? tabs : s === '#game' ? canvas() : el()),
  getElementById: id => byId[id] || (byId[id] = (id === 'game' ? canvas() : el())),
  createElement: t => (t === 'canvas' ? canvas() : el()),
  documentElement: el(),
  body: el(),
  head: el(),
  querySelectorAll: () => [],
  addEventListener: (t, fn) => { if (t === 'click') clicks.push(fn); },
};
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.getComputedStyle = globalThis.getComputedStyle || (() => ({ getPropertyValue: () => '0' }));
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (() => 0);
globalThis.addEventListener = globalThis.addEventListener || (() => {});
globalThis.MutationObserver = class { observe() {} };
globalThis.prompt = (m, d) => d;
globalThis.Peer = class { emit() { return true; } };

// ---------- carga de módulos reales ----------
const { Game, Net, gameTimers, tableCount } = await import('./state.js?v=28.17.2-flat-sand');
await import('./coopbridge.js?v=28.17.2-flat-sand');
const ui = await import('./ui.js?v=28.17.2-flat-sand'), net = await import('./net.js?v=28.17.2-flat-sand'), sim = await import('./sim.js?v=28.17.2-flat-sand');
await import('./features.js?v=28.17.2-flat-sand'); await import('./v12.js?v=28.17.2-flat-sand'); await import('./v14.js?v=28.17.2-flat-sand');
const cfg = await import('./config.js?v=28.17.2-flat-sand');

const peer = new globalThis.Peer();
peer.slot = { on(n, f) { this.h = f; } };
peer.emit('connection', {});
const guest = (k, p) => peer.slot.h({ t: 'act', a: 'mod', k, p });
const tick = () => { for (const f of intervals) { try { f(); } catch (e) { errors.push(String(e.stack || e).split('\n').slice(0, 3).join(' | ')); } } };
const click = (role, data) => { Net.role = role; for (const h of clicks) { try { h({ target: { id: data.id, closest: sel => (data.btn && Object.keys(data.btn).some(k => sel.includes('[data-' + k + ']')) ? { disabled: false, dataset: data.btn } : null) } }); } catch (e) { errors.push('click ' + e); } } Net.role = 'host'; };
const day = (n, stats) => { Game.day = n; Game.mode = 'plan'; Game.mods = { arr: 1 }; Game.dayStats = stats === undefined ? null : stats; tick(); };
const stats = (o = {}) => ({ revenue: 1600, served: 45, lost: 2, tips: 5, tipsP: 2, fines: 0, hamacas: 10, sold: { papas: 6, pescado: 4, agua: 3 }, stockOuts: {}, visits: [], ...o });

let ok = 0, ko = 0;
const check = (name, cond, extra) => { if (cond) { ok++; console.log('  ok  ' + name); } else { ko++; console.log('  FALLO  ' + name + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); } };

function mirrorDifficultyArrivals(day, seasonDays = cfg.SEASON_DAYS) {
  const d = Math.max(1, Number(day) || 1);
  const t = Math.max(0, Math.min(1, (d - 1) / (seasonDays - 1)));
  const smooth = t * t * (3 - 2 * t);
  let arrivals;
  if (d <= 2) arrivals = 0.55 + 0.06 * (d - 1);
  else if (d <= 7) {
    const u = (d - 3) / 4;
    const ramp = u * u * (3 - 2 * u);
    arrivals = 0.50 + ramp * (0.72 - 0.50);
  } else {
    const endArrivals = 0.85 + 0.65 * smooth;
    const u = Math.max(0, Math.min(1, (d - 7) / (seasonDays - 7)));
    const blend = u * u * (3 - 2 * u);
    arrivals = 0.72 + blend * (endArrivals - 0.72);
  }
  if (d > seasonDays) {
    const cap = 1.72;
    arrivals += (cap - arrivals) * (1 - Math.exp(-(d - seasonDays) / 75));
  }
  return arrivals;
}
function mirrorDifficultyPeak(day, seasonDays = cfg.SEASON_DAYS) {
  const d = Math.max(1, Number(day) || 1);
  let peak = d <= 2 ? 0 : 0.22 * Math.max(0, Math.min(1, (d - 4) / (seasonDays - 4)));
  if (d > seasonDays) peak += (0.30 - peak) * (1 - Math.exp(-(d - seasonDays) / 60));
  return peak;
}

// ---------- estado inicial ----------
Game.money = 8000; Game.rep = 3.6; Game.hour = 10;
Game.upgrades = { escenario: 1, algodonera: 1, terraza: 1, refrescos: 1, coctelera: 1, plancha: 1, cocina: 1 };
for (const id of cfg.ITEM_IDS) { Game.stock[id] = 15; Game.prices[id] = cfg.ITEMS[id].ref; Game.enabled[id] = true; }
Game.forecast = Array.from({ length: 40 }, (_, i) => ['sol', 'panza', 'calima', 'viento'][i % 4]);
Game.tables = [{ state: 'free' }, { state: 'dirty' }, { state: 'free' }];
Net.role = 'host'; Net.peer = true;

console.log('Carga y datos');
check('productos nuevos registrados', ['algodon', 'agua', 'refresco', 'helado', 'gofre', 'cocktail', 'churros'].every(i => cfg.ITEM_IDS.includes(i) && cfg.ITEMS[i]));
check('bebidas nuevas cuentan como barra', ['agua', 'refresco', 'cocktail'].every(i => cfg.DRINKS.includes(i)));
check('preferencias de clientes finitas', Object.values(cfg.TYPES).every(t => Object.values(t.pref).every(Number.isFinite)));
check('terraza suma mesas con tope de 10', tableCount() === 5 && (Game.upgrades.mesas = 3, tableCount() === 10) && (Game.upgrades.mesas = 0, true));
check('curva afluencia día1 < día10', mirrorDifficultyArrivals(1) < mirrorDifficultyArrivals(10), [mirrorDifficultyArrivals(1), mirrorDifficultyArrivals(10)]);
check('días 1–2 sin pico mediodía', mirrorDifficultyPeak(1) === 0 && mirrorDifficultyPeak(2) === 0);

console.log('Curva carrera continua (v28.13)');
const { simProgressDay } = await import('./state.js?v=28.17.2-flat-sand');
function mirrorRepMult(d, rep = 3.6) {
  const day = Math.max(1, Number(d) || 1);
  if (day <= 2) return 0.50 + 0.05 * (day - 1);
  const full = 0.35 + rep / 5 * 0.95;
  if (day <= 4) {
    const t = (day - 3) / (4 - 3);
    return 0.40 + t * (full - 0.40);
  }
  return full;
}
Game.upgrades = { career: { season: 2 } };
Game.day = 1;
Game.rep = 3.6;
check('simProgressDay S2 D1 = 31', simProgressDay() === 31);
check('temporada 2 día 1 no reinicia rep mult', mirrorRepMult(simProgressDay()) > mirrorRepMult(1));
check('día 31 más afluencia que día 1', mirrorDifficultyArrivals(31) > mirrorDifficultyArrivals(1));
check('día 60 ≥ día 31 en afluencia', mirrorDifficultyArrivals(60) >= mirrorDifficultyArrivals(31));
Game.upgrades = {};
Game.day = 1;

console.log('Simulación de 15 días');
for (let d = 1; d <= 15; d++) {
  day(d, d > 1 ? stats({ stockOuts: { algodon: d % 2 } }) : null);
  guest('show', 'mago'); guest('post', ['atardecer', 'encuesta', 'algodon', 'show', 'papas', 'viral', 'concurso'][d % 7]);
  guest('influ'); guest('resp', 'disculpa'); guest('post', { x: 1 }); guest('desconocida', 1);
  click('guest', { btn: { post: 'papas' } }); click('guest', { btn: { show: 'baile' } }); click('guest', { btn: { repair: '1' } });
  Game.mode = 'service';
  for (let h = 10; h <= 21; h += 0.25) {
    Game.hour = h; Game.t += 4;
    if (d % 3 === 0 && h === 12) Game.upgrades.batidoraRota = 1;
    tick(); tick();
    for (let i = gameTimers.length - 1; i >= 0; i--) { gameTimers[i].t -= 1; if (gameTimers[i].t <= 0) { const f = gameTimers[i].fn; gameTimers.splice(i, 1); f(); } }
    if (h === 13) { guest('fix'); guest('quit'); guest('delivery', { id: 'cerveza', qty: 5 }); guest('delivery', { id: 'zzz', qty: 1 }); }
    if (h === 15) { click('guest', { id: 'btn-delivery' }); click('guest', { id: 'v12-fix' }); }
    if (h === 18) guest('repairMachine');
  }
}
check('15 días sin excepciones', errors.length === 0, [...new Set(errors)].slice(0, 3));
check('sin NaN en caja, valoración ni mejoras', [Game.money, Game.rep, Game.hour, ...Object.values(Game.upgrades).filter(v => typeof v === 'number')].every(Number.isFinite));
check('hubo clientes extra de shows, reservas y grupos', sim.spawned.length > 0);
check('la invitada envió acciones por el canal', net.sent.some(o => o.a === 'mod'));

console.log('Reglas de Chiringo (v13)');
Game.upgrades = { escenario: 1, socialFollowers: 50, socialRating: 3.2 }; Game.rep = 3.5; Game.money = 5000;
day(20, stats());
Game.upgrades.socialTrend = 'papas'; Game.upgrades.socialTrendDia = 20; const f0 = Game.upgrades.socialFollowers;
day(21, stats({ sold: { papas: 5 } }));
check('la tendencia de ayer da seguidores y comentario', Game.upgrades.socialReport.gains.some(g => /Tendencia/.test(g.k)) && Game.upgrades.socialFollowers === f0 + Game.upgrades.socialReport.net && Game.upgrades.socialComments.some(c => /Justo lo que buscaba/.test(c)), [Game.upgrades.socialReport, Game.upgrades.socialComments]);
check('el cierre deja un balance de seguidores con ganados y perdidos', Array.isArray(Game.upgrades.socialReport.gains) && Array.isArray(Game.upgrades.socialReport.losses) && Game.upgrades.socialReport.net === Game.upgrades.socialReport.gainSum - Game.upgrades.socialReport.lossSum, Game.upgrades.socialReport);
Game.upgrades.socialPost = 'algodon'; Game.upgrades.socialPostDia = 21;
day(22, stats({ stockOuts: { algodon: 2 } }));
check('promocionar algodón sin stock genera queja y se puede responder', /algodón/.test(Game.upgrades.socialComments[0]) && Game.upgrades.socialNegativo === 1, Game.upgrades.socialComments);
const respN = () => (Game.upgrades.socialPend || []).filter(e => e.k === 'Respuesta').length;
const r0 = respN(); guest('resp', 'disculpa'); guest('resp', 'disculpa');
check('responder cuenta una sola vez al día', respN() === r0 + 1);
Game.upgrades.socialPost = 'show'; Game.upgrades.socialPostDia = 22;
day(23, stats());
check('anunciar un show que no se contrató da queja', /show/i.test(Game.upgrades.socialComments[0]));
const infCost = (await import('./influencer-model.mjs')).influCost('micro', 0);
Game.upgrades.socialInflu = 'micro'; Game.upgrades.socialInfluDia = 23; Game.mode = 'plan'; const m0 = Game.money;
guest('influ'); Game.mode = 'service'; Game.hour = 12; Game.mods = { arr: 1 }; tick();
check('influencer contratado sube la afluencia aunque no haya publicación', Game.money === m0 - infCost && Game.mods.arr > 1.05, Game.mods.arr);
day(24, stats()); Game.upgrades.socialInflu = 'micro'; Game.upgrades.socialInfluDia = 24; const m1 = Game.money; guest('influ');
check('al día siguiente se puede volver a contratar influencer', Game.money === m1 - infCost);
day(25, stats()); const w0 = Game.upgrades.socialPoll; guest('post', 'encuesta');
check('la encuesta tiene resultado (papas o pescado)', ['papas', 'pescado'].includes(Game.upgrades.socialPoll) && w0 === undefined);

console.log('Cooperativo (la invitada actúa como el anfitrión)');
day(26, stats()); const m2 = Game.money; guest('show', 'musica');
check('la invitada contrata un show y se cobra', Game.upgrades.showTipo === 'musica' && Game.money === m2 - 450);
guest('show', 'baile');
check('no se puede contratar un segundo show el mismo día', Game.upgrades.showTipo === 'musica');
Game.upgrades.algodoneraRoto = 1; const m3 = Game.money; guest('repairMachine');
check('la invitada repara la algodonera', !Game.upgrades.algodoneraRoto && Game.money === m3 - 150);
Game.upgrades.batidoraRota = 1; const m4 = Game.money; guest('fix');
check('la invitada repara la batidora', !Game.upgrades.batidoraRota && Game.money === m4 - 120);
delete Game.upgrades.deliveryItem; const planMoney = Game.money; guest('delivery', { id: 'cerveza', qty: 5 });
check('el reparto se rechaza durante la preparación sin cobrar', !Game.upgrades.deliveryItem && Game.money === planMoney);
Game.mode = 'service'; const m5 = Game.money; guest('delivery', { id: 'cerveza', qty: 9999 });
check('el reparto de la invitada se limita a 20 unidades', Game.upgrades.deliveryQty === 20 && Math.abs(Game.money - (m5 - 0.7 * 20 * 2)) < 1e-6, Game.upgrades.deliveryQty);
delete Game.upgrades.deliveryItem; const m6 = Game.money; guest('delivery', { id: 'pescado', qty: 5 });
check('no se puede pedir reparto de un producto bloqueado', !Game.upgrades.deliveryItem && Game.money === m6);
Net.role = 'guest'; const sent0 = net.sent.length; click('guest', { btn: { show: 'mago' } });
check('el clic de la invitada se envía al anfitrión en vez de ejecutarse', net.sent.length === sent0 + 1 && net.sent.at(-1).k === 'show');
Net.role = 'host';

console.log('Clima y misiones (v14)');
Game.mode = 'service'; Game.day = 28; Game.forecast[27] = 'calima'; tick(); const calima = cfg.TYPES.turista.pref.agua;
Game.forecast[27] = 'panza'; tick(); const panza = cfg.TYPES.turista.pref.agua;
check('las bebidas nuevas piden más con calima que con panza de burro', calima > panza * 1.5, [calima, panza]);
check('las bebidas nuevas ya no se ven afectadas en comida', cfg.TYPES.turista.pref.gofre === 0.9);
Game.upgrades.mision = undefined; ui.toasts.length = 0; day(30, stats());
check('la misión se anuncia al empezar el día', ui.toasts.some(t => t[0] === 'Misión activa'));
Game.upgrades.mision = 'served40'; Game.upgrades.misionHecha = 0; Game.upgrades.misionTxt = 'x'; Game.upgrades.misionReward = 200; const m7 = Game.money;
day(31, stats({ served: 50 }));
check('cumplir la misión da la recompensa una vez', Game.money === m7 + 200 && ui.toasts.some(t => t[0] === 'Misión cumplida'));
check('el informe del día queda guardado', JSON.parse(Game.upgrades.lastReport).served === 50);

console.log('\n' + (ko ? 'FALLOS: ' + ko : 'TODOS LOS TESTS OK') + ' · superados: ' + ok);
process.exit(ko ? 1 : 0);
