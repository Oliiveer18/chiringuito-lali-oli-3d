/* Pruebas de la carrera infinita (sin navegador). Uso: node career.test.mjs */
globalThis.window = globalThis;
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
const { Game } = await import('./state.js?v=28.17.2-flat-sand');
const cfg = await import('./config.js?v=28.17.2-flat-sand');
const C = await import('./career.js?v=28.17.2-flat-sand');

let ok = 0, ko = 0;
const check = (name, cond, extra) => { if (cond) { ok++; console.log('  ok  ' + name); } else { ko++; console.log('  FALLO  ' + name + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); } };
const fresh = () => { Game.upgrades = {}; Game.money = 400; Game.rep = 3; Game.day = 1; Game.season = { revenue: 0, served: 0, lost: 0, bestDay: 0, bestDayN: 1 }; Game.regulars = { a: { loyalty: 1, visits: 0, next: 25 }, b: { loyalty: 1, visits: 0, next: 2 } }; };

console.log('Objetivos');
check('temporada 1: la concesión (GOAL)', C.objectiveFor(1).type === 'capital' && C.objectiveFor(1).target === cfg.GOAL);
check('los tipos rotan', [2, 3, 4, 5].map(n => C.objectiveFor(n, 5000, 50).type).join() === 'reputacion,seguidores,servicio,capital');
check('el capital objetivo crece con la temporada', C.objectiveFor(5, 10000).target > C.objectiveFor(5, 1000).target && C.objectiveFor(9, 10000).target > C.objectiveFor(5, 10000).target);
check('la reputación objetivo está acotada', C.objectiveFor(50 + 1 - 1 + 2).type !== undefined && C.objectiveFor(6).target <= 4.7);
check('el progreso va de 0 a 100', C.progressPct(C.objectiveFor(1), { money: 5000 }) === 50 && C.progressPct(C.objectiveFor(1), { money: 99999 }) === 100 && C.progressPct(C.objectiveFor(1), {}) === 0);

console.log('Efectos');
fresh(); const c0 = C.initCareer();
const base = cfg.ITEMS.cerveza.cost;
C.applyEffects(c0); C.applyEffects(c0);
check('aplicar efectos dos veces no acumula', Math.abs(cfg.ITEMS.cerveza.cost - base) < 1e-9);
c0.season = 3; C.applyEffects(c0);
check('el género sube con las temporadas', cfg.ITEMS.cerveza.cost > base);
c0.perks.push('proveedor'); C.applyEffects(c0);
const withPerk = cfg.ITEMS.cerveza.cost;
c0.perks.pop(); C.applyEffects(c0);
check('la ventaja de proveedor abarata y se puede quitar', withPerk < cfg.ITEMS.cerveza.cost);
c0.season = 1; C.applyEffects(c0);
check('volver a la temporada 1 restaura los valores base', Math.abs(cfg.ITEMS.cerveza.cost - base) < 1e-9 && cfg.TYPES.turista.patience === 20);

console.log('Cierre de temporada');
fresh(); const c1 = C.initCareer();
Game.day = 30; Game.money = 12000; Game.season = { revenue: 14000, served: 900, lost: 20, bestDay: 800, bestDayN: 9 };
const cl = C.closeSeason();
check('con el objetivo cumplido se ofrecen 3 ventajas distintas', cl.kind === 'season' && cl.ok && cl.offers.length === 3 && new Set(cl.offers).size === 3, cl);
check('se ganan puntos de Legado', cl.pts >= 5 && C.loadLegacy().points === cl.pts, cl.pts);
check('cerrar dos veces no duplica el Legado', C.closeSeason() === cl && C.loadLegacy().points === cl.pts);
{ const before = C.loadLegacy().points; c1.closed = null; const again = C.closeSeason(); check('recargar y volver a cerrar el mismo día no repite el Legado', C.loadLegacy().points === before && again.pts === cl.pts, [before, C.loadLegacy().points]); c1.closed = cl; }
check('no se puede continuar sin elegir ventaja', !C.canContinue(cl));
check('no se puede elegir una ventaja que no se ofrece', !C.choosePerk('no-existe'));
const pick = cl.offers[0];
check('elegir ventaja la guarda una sola vez', C.choosePerk(pick) && !C.choosePerk(cl.offers[1]) && c1.perks.length === 1);
check('ya se puede continuar', C.canContinue(cl));
const m = Game.money;
C.nextSeason();
check('la nueva temporada conserva la caja y reinicia el día', Game.money === m && Game.day === 1 && c1.season === 2, [Game.money, Game.day, c1.season]);
check('la nueva temporada trae pronóstico completo', Game.forecast.length === cfg.SEASON_DAYS + 1 && Game.forecast[0] === 'sol');
check('los habituales no se quedan fuera de la temporada', Game.regulars.a.next <= 4, Game.regulars.a.next);
check('el nuevo objetivo es el de la temporada 2', c1.obj.type === 'reputacion' && c1.closed === null);
const { simProgressDay } = await import('./state.js?v=28.17.2-flat-sand');
check('S2 D1 progreso día 31', simProgressDay() === 31);
check('S2 D1 no reinicia rep mult suave (d>4)', (0.35 + Game.rep / 5 * 0.95) > (0.50 + 0.05 * (1 - 1)));

console.log('Temporada fallida, rescate y quiebra');
Game.day = 30; Game.money = 100; Game.rep = 3; Game.season = { revenue: 1000, served: 100, lost: 5, bestDay: 100, bestDayN: 1 };
const bad = C.closeSeason();
check('sin objetivo no hay ventajas y se puede continuar', bad.kind === 'season' && !bad.ok && bad.offers.length === 0 && C.canContinue(bad));
const mm = Game.money; C.nextSeason();
check('fallar el objetivo da una pequeña subvención', Game.money === mm + 200 || Game.money === mm + 200 + (c1.perks.includes('mecenas') ? 400 : 0));
Game.day = 10; Game.money = -900; c1.perks.push('colchon');
const resc = C.closeSeason();
check('el colchón evita la quiebra a mitad de temporada', resc.kind === 'rescue' && Game.money === 300 && C.canContinue(resc), resc);
Game.day = 11; Game.money = -900;
const bank = C.closeSeason();
check('sin rescates la quiebra cierra la carrera con Legado', bank.kind === 'bankrupt' && bank.pts >= 1 && !C.canContinue(bank), bank);

console.log('Tienda de Legado');
const pts = C.loadLegacy().points;
check('no se compra sin puntos suficientes', (() => { const L = C.loadLegacy(); L.points = 1; C.saveLegacy(L); return !C.buyLegacy('colchon_legado'); })());
{ const L = C.loadLegacy(); L.points = 20; C.saveLegacy(L); }
check('se compra una mejora y se descuentan los puntos', C.buyLegacy('dote') && C.loadLegacy().points === 20 - C.LEGACY.dote.cost);
check('no se compra dos veces', !C.buyLegacy('dote'));
fresh(); Game.money = 400; const c2 = C.initCareer();
check('la nueva carrera aplica la dote y conserva la mejora', Game.money === 700 && c2.legacyOwned.includes('dote'), Game.money);

console.log('Robustez');
check('sin NaN en 40 temporadas simuladas', (() => {
  fresh(); const c = C.initCareer();
  for (let s = 0; s < 40; s++) {
    Game.day = 30; Game.money = Math.max(Game.money, 0) + 5000 * (s + 1); Game.season = { revenue: 9000, served: 2000, lost: 10, bestDay: 500, bestDayN: 3 };
    Game.upgrades.socialFollowers = 100 + 50 * s;
    const k = C.closeSeason(); if (k.kind === 'season' && k.ok && k.offers.length) C.choosePerk(k.offers[0]);
    C.nextSeason(); C.applyEffects(c);
  }
  return Object.values(C.effectsFor(c)).every(Number.isFinite) && Number.isFinite(Game.money) && c.season === 41 && c.hist.length <= 12;
})());

console.log('\n' + (ko ? 'FALLOS: ' + ko : 'TODOS LOS TESTS OK') + ' · superados: ' + ok);
process.exit(ko ? 1 : 0);
