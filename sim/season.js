/* Mechanical extraction from sim.js; declaration bodies are unchanged.
   Balance curve uses simProgressDay() (continuous career track). Calendar events use Game.day 1..SEASON_DAYS. */
import { ITEMS } from "../config.js?v=28.17.3-flat-sand";
import { ITEM_IDS } from "../config.js?v=28.17.3-flat-sand";
import { REGULARS } from "../config.js?v=28.17.3-flat-sand";
import { SEASON_DAYS } from "../config.js?v=28.17.3-flat-sand";
import { START_MONEY } from "../config.js?v=28.17.3-flat-sand";
import { clamp } from "../util.js?v=28.17.3-flat-sand";
import { rnd } from "../util.js?v=28.17.3-flat-sand";
import { Audio } from "../audio.js?v=28.17.3-flat-sand";
import { Game, simProgressDay } from "../state.js?v=28.17.3-flat-sand";
import { closeHour } from "../state.js?v=28.17.3-flat-sand";
import { setTimeoutGame } from "../state.js?v=28.17.3-flat-sand";
import { buildTables } from "../world.js?v=28.17.3-flat-sand";
import { toast } from "../ui.js?v=28.17.3-flat-sand";
import { updateStockbar } from "../ui.js?v=28.17.3-flat-sand";
import { spawnCustomer } from "./customers.js?v=28.17.3-flat-sand";
export { buildSeasonForecast } from "./forecast.js?v=28.17.3-flat-sand";
import { buildSeasonForecast } from "./forecast.js?v=28.17.3-flat-sand";

const ARRIVALS_CAP = 1.72;
const PEAK_CAP = 0.30;

function progressDay(day) {
  return Math.max(1, Number(day ?? simProgressDay()) || 1);
}

/** Arrivals multiplier for macro curve (before weather/rep); extends past day 30 with a soft cap. */
function curveArrivals(d) {
  const ref = SEASON_DAYS;
  const t = clamp((d - 1) / (ref - 1), 0, 1);
  const smooth = t * t * (3 - 2 * t);
  let arrivals;
  if (d <= 2) arrivals = 0.55 + 0.06 * (d - 1);
  else if (d <= 7) {
    const u = (d - 3) / 4;
    const ramp = u * u * (3 - 2 * u);
    arrivals = 0.50 + ramp * (0.72 - 0.50);
  } else {
    const endArrivals = 0.85 + 0.65 * smooth;
    const u = clamp((d - 7) / (ref - 7), 0, 1);
    const blend = u * u * (3 - 2 * u);
    arrivals = 0.72 + blend * (endArrivals - 0.72);
  }
  if (d > ref) {
    const extra = d - ref;
    arrivals += (ARRIVALS_CAP - arrivals) * (1 - Math.exp(-extra / 75));
  }
  return arrivals;
}

function curvePeak(d) {
  const ref = SEASON_DAYS;
  let peak = d <= 2 ? 0 : 0.22 * clamp((d - 4) / (ref - 4), 0, 1);
  if (d > ref) peak += (PEAK_CAP - peak) * (1 - Math.exp(-(d - ref) / 60));
  return peak;
}

function curveSmooth(d) {
  const ref = SEASON_DAYS;
  const t = clamp((d - 1) / (ref - 1), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Season weather table (days 1..SEASON_DAYS plus closing day); shared by classic new game and career nextSeason. */
export function newSeason(){
  Object.assign(Game,{day:1,money:START_MONEY,rep:3.0,hour:10,upgrades:{},staff:{},customers:[],floaters:[],particles:[],season:{revenue:0,served:0,lost:0,bestDay:0,bestDayN:1}, lastDebt:false, starsLog:[], revUsed:{}, revPrev:{}, pendingPurchases:0});
  for(const id of ITEM_IDS){ Game.stock[id]= ITEMS[id].unlock?0:15; Game.prices[id]=ITEMS[id].ref; Game.enabled[id]=true; }
  Game.regulars={}; Game.regVisited={}; Game.buzz=0;
  for(const r of REGULARS) Game.regulars[r.id]={loyalty:1,visits:0,next:2+Math.floor(rnd()*3)};
  Game.forecast=buildSeasonForecast();
  buildTables();
}

/** Reputation influence on spawn mult; soft opening career days 1–2, ramp days 3–4. */
export function repArrivalMult(day, rep=Game.rep){
  const d=progressDay(day);
  if(d<=2) return 0.50+0.05*(d-1);
  const full=0.35+rep/5*0.95;
  if(d<=4){
    const t=(d-3)/(4-3);
    const soft=0.40;
    return soft+t*(full-soft);
  }
  return full;
}

export function difficultyProfile(day){
  const d=progressDay(day);
  const smooth=curveSmooth(d);
  const late=clamp((d-8)/(SEASON_DAYS-8),0,1);
  const arrivals=curveArrivals(d);
  const peak=curvePeak(d);
  let patience=1.15-0.27*smooth;
  if(d>SEASON_DAYS) patience-=0.06*(1-Math.exp(-(d-SEASON_DAYS)/100));
  patience=clamp(patience,0.80,1.15);
  const lateExt=d>SEASON_DAYS?Math.min(1,late+0.15*(1-Math.exp(-(d-SEASON_DAYS)/90))):late;
  return {
    label:d<=2?'Apertura suave':d<=3?'Aprendizaje':d<=9?'Rodaje':d<=17?'Exigente':d<=24?'Hora de demostrar':'Recta final',
    arrivals,
    patience,
    doubleBonus:-0.12+0.27*smooth,
    mixedChance:0.30+0.35*smooth,
    tripleChance:0.18*lateExt*lateExt,
    peak
  };
}

export function difficultyRush(hour,profile=difficultyProfile()){
  const lunch=Math.max(0,1-Math.abs(hour-13.5)/1.5);
  const sunset=closeHour()>20?Math.max(0,1-Math.abs(hour-20.5)/1):0;
  return 1+profile.peak*Math.max(lunch,sunset);
}

export const RANDOM_EVENTS = [
  {id:'influencer', w:3, run(){ Game.rep=clamp(Game.rep+0.35,0,5); Game.mods.arr*=1.3; toast('Un influencer en tu barra','Se ha hecho una foto con un barraquito. Llega más gente el resto del día.','good'); Audio.good(); }},
  {id:'sanidad', w:2, run(){ const dirty=Game.tables.filter(t=>t.state==='dirty').length;
      if(dirty>=2){ Game.money-=200; Game.dayStats.fines+=200; Game.rep=clamp(Game.rep-0.25,0,5); toast('Inspección de sanidad','Había '+dirty+' mesas sucias. Multa de 200 €.','bad'); Audio.bad(); }
      else { Game.rep=clamp(Game.rep+0.1,0,5); toast('Inspección de sanidad','Todo limpio y en orden. Buena nota.','good'); Audio.good(); } }},
  {id:'guagua', w:3, run(){ for(let i=0;i<6;i++) setTimeoutGame(()=>spawnCustomer('turista'), i*0.6); toast('Llega una guagua de turistas','Un grupo baja de excursión con mucha sed.','good'); }},
  {id:'futbol', w:2, run(){ Game.mods.beer=true; Game.mods.mix={local:1.6}; toast('Partido del CD Tenerife','Los vecinos vienen a verlo. Se dispara la cerveza.','good'); }},
  {id:'apagon', w:1, run(){ const lost=Math.floor(Game.stock.batido*0.5); Game.stock.batido-=lost; updateStockbar(); toast('Se va la luz un rato','La batidora se queda parada y se estropean '+lost+' plátanos.','bad'); Audio.bad(); }},
];
