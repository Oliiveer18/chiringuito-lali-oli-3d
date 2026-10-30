/* Carrera infinita del chiringuito: temporadas encadenadas con objetivo, ventajas, Legado y traspaso.
   Lógica sin DOM: Game.day sigue siendo el día DE LA TEMPORADA (1..SEASON_DAYS), así que el resto del juego no cambia.
   Los datos de la carrera viven en Game.upgrades.career (se guardan y se sincronizan en cooperativo). */
import { Game, simProgressDay } from './state.js?v=28.17.3-flat-sand';
import { GOAL, ITEMS, SEASON_DAYS, TYPES } from './config.js?v=28.17.3-flat-sand';
import { clamp, rnd } from './util.js?v=28.17.3-flat-sand';
import { buildSeasonForecast } from './sim/forecast.js?v=28.17.3-flat-sand';

export const OBJ_TYPES = ['capital', 'reputacion', 'seguidores', 'servicio'];
export const PERKS = {
  proveedor: { name: 'Proveedor de confianza', desc: 'El género cuesta un 8 % menos.' },
  prisa: { name: 'Terraza de moda', desc: 'Llega un 10 % más de gente.' },
  paciencia: { name: 'Buen ambiente', desc: 'Los clientes aguantan un 10 % más en la cola.' },
  cocina: { name: 'Cocina engrasada', desc: 'Todo se prepara un 8 % más rápido.' },
  colchon: { name: 'Colchón de emergencia', desc: 'Evita una quiebra: te devuelve a 300 € una vez.' },
  mecenas: { name: 'Patrocinador local', desc: '+400 € al empezar cada temporada.' }
};
export const LEGACY = {
  dote: { name: 'Dote familiar', desc: '+300 € al empezar cada carrera.', cost: 4 },
  proveedor_pro: { name: 'Contactos mayoristas', desc: 'El género cuesta un 5 % menos siempre.', cost: 6 },
  fidelidad: { name: 'Clientela de siempre', desc: 'Los habituales empiezan con fidelidad 2.', cost: 5 },
  fama: { name: 'Nombre en la costa', desc: '+70 seguidores al empezar.', cost: 4 },
  colchon_legado: { name: 'Fondo de familia', desc: 'Un rescate de 300 € por carrera.', cost: 8 }
};
// banderas por día que no deben cruzar el límite entre temporadas (el día vuelve a 1)
const DAY_FLAGS = ['socialPost', 'socialPostDia', 'socialTrend', 'socialTrendDia', 'socialInflu', 'socialInfluDia', 'socialInfluContratado',
  'socialRespondido', 'socialAplicado', 'socialArr', 'socialInfluArr', 'showHoy', 'showHora', 'showTipo', 'showDia', 'showFlojo',
  'showFlojoDia', 'grupoDia', 'seguidoresDia', 'terrazaDia', 'incidentTipo', 'incidentHora', 'weatherHora', 'reservaHora'];

const num = v => (Number.isFinite(v) ? v : 0);
const fmtN = n => Math.round(n).toLocaleString('es-ES');

// ---------- Legado (persistente entre carreras; vive en el móvil del anfitrión) ----------
const LKEY = 'lali-oli.3d.legacy.v1';
export function loadLegacy() {
  try {
    if (typeof localStorage === 'undefined') return { points: 0, owned: [], keys: [] };
    const o = JSON.parse(localStorage.getItem(LKEY) || 'null');
    if (o && Number.isFinite(o.points) && Array.isArray(o.owned)) return { points: Math.max(0, Math.floor(o.points)), owned: o.owned.filter(k => LEGACY[k]), keys: Array.isArray(o.keys) ? o.keys.slice(-30) : [] };
  } catch (e) { }
  return { points: 0, owned: [], keys: [] };
}
export function saveLegacy(L) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(LKEY, JSON.stringify(L)); } catch (e) { } }

// ---------- Objetivos ----------
export function objectiveFor(n, startMoney = 0, startFol = 50) {
  n = Math.max(1, Math.floor(num(n)) || 1);
  const type = n === 1 ? 'capital' : OBJ_TYPES[(n - 1) % 4];
  if (type === 'capital') {
    const target = n === 1 ? GOAL : Math.round((num(startMoney) + 8000 + 2500 * (n - 1)) / 100) * 100;
    return { type, target, title: n === 1 ? 'La concesión' : 'Capital', short: 'Caja ' + fmtN(target) + ' €',
      text: (n === 1 ? 'Ahorra ' + fmtN(target) + ' € en caja para comprar la concesión' : 'Llega a ' + fmtN(target) + ' € en caja') };
  }
  if (type === 'reputacion') {
    const target = Math.round(Math.min(4.7, 3.9 + 0.1 * n) * 10) / 10;
    return { type, target, title: 'Reputación', short: 'Valoración ' + String(target).replace('.', ','), text: 'Cierra la temporada con ' + String(target).replace('.', ',') + ' de valoración o más' };
  }
  if (type === 'seguidores') {
    const target = Math.round(num(startFol) + 60 + 40 * n);
    return { type, target, title: 'Seguidores', short: fmtN(target) + ' seguidores', text: 'Alcanza ' + fmtN(target) + ' seguidores en Chiringo' };
  }
  const target = 600 + 100 * n;
  return { type: 'servicio', target, title: 'Servicio', short: fmtN(target) + ' clientes', text: 'Atiende a ' + fmtN(target) + ' clientes en la temporada' };
}
export function valueOf(obj, ctx) {
  if (!obj) return 0;
  if (obj.type === 'capital') return num(ctx.money);
  if (obj.type === 'reputacion') return num(ctx.rep);
  if (obj.type === 'seguidores') return num(ctx.followers);
  return num(ctx.served);
}
export function progressPct(obj, ctx) {
  if (!obj || !obj.target) return 0;
  return Math.round(clamp(valueOf(obj, ctx) / obj.target, 0, 1) * 100);
}
export function valueText(obj, v) { return obj.type === 'reputacion' ? v.toFixed(1).replace('.', ',') : fmtN(v) + (obj.type === 'capital' ? ' €' : ''); }

// ---------- Legado: puntos ----------
export function legacyPoints(kind, o = {}) {
  if (kind === 'bankrupt') return Math.max(1, Math.floor(num(o.careerRevenue) / 5000) + 2 * Math.max(0, Math.floor(num(o.seasons))) + 1);
  return 2 + (o.ok ? 3 : 0) + (o.selloOk ? 1 : 0) + Math.floor(num(o.seasonRevenue) / 4000);
}
export function offersFor(owned = [], rand = rnd) {
  const pool = Object.keys(PERKS).filter(k => !owned.includes(k));
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

// ---------- Efectos sobre el juego (idempotentes: siempre parten del valor base) ----------
export function effectsFor(c) {
  const n = Math.max(1, Math.floor(num(c && c.season)) || 1), perks = (c && c.perks) || [], leg = (c && c.legacyOwned) || [];
  return {
    costMul: (1 + 0.04 * (n - 1)) * (perks.includes('proveedor') ? 0.92 : 1) * (leg.includes('proveedor_pro') ? 0.95 : 1),
    prepMul: perks.includes('cocina') ? 0.92 : 1,
    patMul: Math.max(0.8, 1 - 0.02 * (n - 1)) * (perks.includes('paciencia') ? 1.1 : 1),
    arrMul: (1 + 0.04 * (n - 1)) * (perks.includes('prisa') ? 1.1 : 1)
  };
}
const BASE = { cost: {}, prep: {}, pat: {} };
export function applyEffects(c) {
  if (!c) return null;
  const e = effectsFor(c);
  for (const id of Object.keys(ITEMS)) {
    const it = ITEMS[id];
    if (!(id in BASE.cost)) { BASE.cost[id] = it.cost; BASE.prep[id] = it.prep; }
    it.cost = BASE.cost[id] * e.costMul; it.prep = BASE.prep[id] * e.prepMul;
  }
  for (const t of Object.keys(TYPES)) {
    if (!(t in BASE.pat)) BASE.pat[t] = TYPES[t].patience;
    TYPES[t].patience = BASE.pat[t] * e.patMul;
  }
  return e;
}
export function resetEffects() { applyEffects({ season: 1, perks: [], legacyOwned: [] }); }

// ---------- Ciclo de la carrera ----------
export function initCareer() {
  const U = Game.upgrades;
  if (U.career) return U.career;
  const L = loadLegacy();
  const c = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), season: 1, perks: [], legacyOwned: [...L.owned], rescuesUsed: 0, totals: { revenue: 0, served: 0, lost: 0 }, hist: [], red: 0, closed: null, leg: { points: L.points, owned: [...L.owned] } };
  if (L.owned.includes('dote')) Game.money += 300;
  if (L.owned.includes('fama')) U.socialFollowers = (U.socialFollowers == null ? 0 : U.socialFollowers) + 70;
  if (L.owned.includes('fidelidad') && Game.regulars) for (const r of Object.values(Game.regulars)) r.loyalty = Math.max(r.loyalty || 1, 2);
  c.startMoney = Game.money;
  c.startFol = U.socialFollowers == null ? 0 : U.socialFollowers;
  c.obj = objectiveFor(1, c.startMoney, c.startFol);
  U.career = c;
  applyEffects(c);
  return c;
}
export const careerDay = () => simProgressDay();
export function rescuesLeft(c) { return (c.perks.includes('colchon') ? 1 : 0) + (c.legacyOwned.includes('colchon_legado') ? 1 : 0) - (c.rescuesUsed || 0); }

export function closeSeason() {
  const c = Game.upgrades.career; if (!c) return null;
  const key = c.season + ':' + Game.day;
  if (c.closed && c.closed.key === key) return c.closed;
  let bankrupt = Game.money < -300, rescued = false;
  if (bankrupt && rescuesLeft(c) > 0) { c.rescuesUsed = (c.rescuesUsed || 0) + 1; Game.money = 300; bankrupt = false; rescued = true; }
  const S = Game.season || {}, fol = num(Game.upgrades.socialFollowers);
  const ctx = { money: Game.money, rep: Game.rep, followers: fol, served: num(S.served) };
  const base = { key, money: Game.money, rep: Game.rep, followers: fol, revenue: num(S.revenue), served: num(S.served), lost: num(S.lost), bestDay: num(S.bestDay), rescued };
  let closed;
  if (bankrupt) {
    const careerRevenue = num(c.totals.revenue) + num(S.revenue);
    closed = { ...base, kind: 'bankrupt', pts: legacyPoints('bankrupt', { careerRevenue, seasons: c.season - 1 }), careerRevenue, seasons: c.season };
  } else if (rescued && Game.day < SEASON_DAYS) {
    closed = { ...base, kind: 'rescue', pts: 0 };
  } else {
    const value = valueOf(c.obj, ctx), ok = value >= c.obj.target, selloOk = (c.red || 0) === 0;
    closed = { ...base, kind: 'season', ok, selloOk, value, pts: legacyPoints('season', { ok, selloOk, seasonRevenue: num(S.revenue) }), offers: ok ? offersFor(c.perks) : [], chosen: null };
  }
  // el Legado de un cierre se cobra una sola vez aunque se recargue la partida en esa pantalla
  const L = loadLegacy(), lk = (c.id || '') + ':' + key;
  if (!L.keys.includes(lk)) { L.points += closed.pts || 0; L.keys.push(lk); L.keys = L.keys.slice(-30); saveLegacy(L); }
  c.leg = { points: L.points, owned: [...L.owned] };
  c.closed = closed;
  return closed;
}
export function choosePerk(id) {
  const c = Game.upgrades.career, cl = c && c.closed;
  if (!cl || cl.kind !== 'season' || !cl.ok || cl.chosen || !cl.offers.includes(id)) return false;
  cl.chosen = id; c.perks.push(id); applyEffects(c);
  return true;
}
export function canContinue(cl) { return !!cl && (cl.kind === 'rescue' || (cl.kind === 'season' && (!cl.ok || !!cl.chosen))); }
export function buyLegacy(id) {
  const c = Game.upgrades.career, cl = c && c.closed, item = LEGACY[id];
  if (!cl || cl.kind !== 'bankrupt' || !item) return false;
  const L = loadLegacy();
  if (L.owned.includes(id) || L.points < item.cost) return false;
  L.points -= item.cost; L.owned.push(id); saveLegacy(L);
  c.leg = { points: L.points, owned: [...L.owned] };
  return true;
}
// pasa a la siguiente temporada conservando caja, mejoras, personal, valoración, seguidores y habituales
export function nextSeason() {
  const U = Game.upgrades, c = U.career; if (!c) return false;
  const cl = c.closed, S = Game.season || {};
  c.totals.revenue += num(S.revenue); c.totals.served += num(S.served); c.totals.lost += num(S.lost);
  c.hist.push({ season: c.season, ok: !!(cl && cl.ok), selloOk: !!(cl && cl.selloOk), pts: cl ? num(cl.pts) : 0, perk: (cl && cl.chosen) || null });
  if (c.hist.length > 12) c.hist.shift();
  if (cl && cl.kind === 'season' && !cl.ok) Game.money += 200;
  c.season++; c.closed = null; c.red = 0; c.redKey = null; c.arrKey = null;
  if (c.perks.includes('mecenas')) Game.money += 400;
  for (const k of DAY_FLAGS) delete U[k];if(U.socialCalendar)U.socialIdle=Math.max(0,Number(U.socialCalendar.idle)||0);
  Game.day = 1; Game.hour = 10;
  Game.season = { revenue: 0, served: 0, lost: 0, bestDay: 0, bestDayN: 1 };
  Game.forecast = buildSeasonForecast();
  Game.dayStats = null; Game.customers = []; Game.floaters = []; Game.particles = [];
  if (Game.regulars) for (const r of Object.values(Game.regulars)) r.next = Math.min(num(r.next) || 2, 2 + Math.floor(rnd() * 3));
  c.startMoney = Game.money;
  c.startFol = U.socialFollowers == null ? 0 : U.socialFollowers;
  c.obj = objectiveFor(c.season, c.startMoney, c.startFol);
  applyEffects(c);
  return true;
}
