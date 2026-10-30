/* =========================================================
   state.js
   Estado global: objetos Game y Net, derivados de progreso y temporizadores del día.
   ========================================================= */
import { DAY_NAMES, ITEMS, ITEM_IDS, SEASON_DAYS, STAFF, START_MONEY } from './config.js?v=28.17.2-flat-sand';

// ---------- Estado del juego ----------
export const Game = {
  mode:'title', speed:1, day:1, money:START_MONEY, rep:3.0, hour:10,
  stock:{}, prices:{}, enabled:{}, upgrades:{}, staff:{}, forecast:[],
  customers:[], tables:[], floaters:[], particles:[], slots:[],
  dayStats:null, season:{revenue:0,served:0,lost:0,bestDay:0},
  starsLog:[], revUsed:{}, revPrev:{},
  t:0, spawnAcc:0, dayEvent:null, eventDone:false, eventHour:0, closing:false, closeT:0, mods:{arr:1},
  lastDebt:false,
};
window.Game = Game;

// ---------- Red (modo 2 jugadores) ----------
export const Net = { role:'solo', me:'p1', ws:null, code:null, peer:false, signalingReady:false, names:{p1:'Jugador 1',p2:'Jugador 2'}, roles:{p1:'barra',p2:'cocina'},
  ready:{p1:false,p2:false}, events:[], sendT:0, ui:null, planSig:'', lastMode:null, status:'', revDirty:false, lastRevSig:'', lastBody:'',
  // latencia percibida: acciones enviadas que esperan confirmación del anfitrión
  seq:0, pend:new Map(), acks:[], ackLog:[], confMs:null, readySent:false, pendTimeout:2500, pendDrop:10000 };
window.Net = Net;
export const isCoop = ()=> Net.role!=='solo';
export const isGuest = ()=> Net.role==='guest';
export const hostLive = ()=> Net.role==='host' && Net.peer;
export function whoName(w){ return w==='yeray'?(Game.upgrades.workforce?.team?.camarero?.name||'Yeray') : isCoop()? Net.names[w] : 'Preparando'; }
export function partner(){ return Net.me==='p1'?'p2':'p1'; }

export function lvl(id){ return Game.upgrades[id]||0; }
export function closeHour(){ return lvl('luces')?22:20; }
export function itemUnlocked(id){ const u=ITEMS[id].unlock; return !u || lvl(u)>0; }
export function activeItems(){ return ITEM_IDS.filter(id=>itemUnlocked(id) && Game.enabled[id]); }
// Máximo 10 mesas: es el número de posiciones definidas en world.js (TABLE_POS)
export function tableCount(){ return Math.min(10, 3 + 2*lvl('mesas') + 2*lvl('terraza')); }
export function hamacaCount(){ return 4*lvl('hamacas'); }
export function wages(){ return STAFF.reduce((s,st)=> s + (Game.staff[st.id]?(Game.upgrades.workforce?.team?.[st.id]?.wage??st.wage):0), 0); }

export function weatherToday(){ return (Game.forecast && Game.forecast[Game.day-1]) || 'sol'; }
export function dayName(d){ return DAY_NAMES[(d-1)%7]; }
export function isWeekend(d){ return (d-1)%7>=5; }

/** Absolute timeline for spawn/difficulty only. UI calendar stays on Game.day 1..SEASON_DAYS per season. */
export function simProgressDay(){
  const c=Game.upgrades?.career;
  if(c) return ((c.season||1)-1)*SEASON_DAYS+Game.day;
  return Game.day;
}

export const gameTimers=[];
export function setTimeoutGame(fn,sec){ gameTimers.push({fn,t:sec}); }

// --- Latencia simulada (para pruebas): retrasa el envío y la recepción como una red real ---
// FIFO estricto por dirección: cada mensaje se entrega al menos 1 ms después del anterior,
// igual que un WebSocket real (los setTimeout independientes con jitter podrían reordenar).
export const NET_SIM = { on:false, up:0, down:0, jitter:0, _upAt:0, _dnAt:0 };
// --- El invitado aplica la instantánea ---
export const guestCust = new Map();
