/* =========================================================
   config.js
   Constantes del juego: dimensiones, calendario, economía, productos,
clientes habituales, clima, mejoras y personal.
   ========================================================= */
import { rnd } from './util.js?v=28.17.3-flat-sand';

// ---------- Constantes ----------
export const W = 1280, H = 720;
export const SEC_PER_HOUR = 16;          // segundos reales por hora de juego a 1x
export const SEASON_DAYS = 30;
export const GOAL = 10000;
export const START_MONEY = 400;
export const RENT = 45;
export const DAY_NAMES = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
export const QUEUE_SPOTS = 6;

export const ITEMS = {
  cerveza:   {name:'Cerveza Dorada',     cost:0.7, ref:2.8,  prep:0.7, spoil:0,    spoilF:0,    unlock:null},
  barraquito:{name:'Barraquito',         cost:0.6, ref:2.5,  prep:1.3, spoil:0,    spoilF:0,    unlock:null},
  batido:    {name:'Batido de plátano',  cost:0.9, ref:4.5,  prep:1.3, spoil:0.5,  spoilF:0.1,  unlock:null},
  papas:     {name:'Papas con mojo',     cost:1.3, ref:6.5,  prep:2.1, spoil:0.15, spoilF:0.05, unlock:null},
  queso:     {name:'Queso asado con mojo',cost:2.2,ref:8.5,  prep:2.3, spoil:0.25, spoilF:0.05, unlock:'plancha'},
  pescado:   {name:'Pescado fresco',     cost:6.5, ref:14,   prep:3.2, spoil:0.75, spoilF:0.25,  unlock:'cocina'},
};
export const ITEM_IDS = Object.keys(ITEMS);
export const DRINKS = ['cerveza','barraquito','batido'];
export const stationOf = id => DRINKS.includes(id) ? 'barra' : 'cocina';
export const STATION_LABEL = {barra:'Barra', cocina:'Cocina', all:'Todo'};
export const STATION_COLOR = {barra:'#0f8b8d', cocina:'#e8603c'};
export const WHO_COLOR = {p1:'#ffd36b', p2:'#ff9f7a', yeray:'#5fd4d6'};

export const TYPES = {
  turista:{label:'Turista',  pref:{cerveza:1.2,barraquito:0.6,batido:1.0,papas:1.5,queso:0.9,pescado:1.4}, elas:0.9, maxRatio:2.1, patience:20, two:0.65},
  local:  {label:'Local',    pref:{cerveza:1.3,barraquito:1.7,batido:0.4,papas:1.0,queso:1.3,pescado:0.9}, elas:2.0, maxRatio:1.45,patience:30, two:0.5},
  surfista:{label:'Surfista',pref:{cerveza:1.0,barraquito:0.5,batido:1.9,papas:1.1,queso:0.5,pescado:0.4}, elas:1.5, maxRatio:1.6, patience:24, two:0.55},
};


// ---------- Personalidades (señales visibles, nada oculto) ----------
export const PERSONALITIES = {
  tranquilo: {label:'Tranquilo',  hint:'Sin prisa · acepta cambios', patMul:0.75, stages:[0.45,0.28,0.12], flex:true,  takeaway:'ok',      grace:5.5, tipP:0},
  impaciente:{label:'Impaciente', hint:'Con prisa · se lo lleva',    patMul:1.45, stages:[0.75,0.55,0.35], flex:true,  takeaway:'prefiere', grace:3.5, tipP:0},
  exigente:  {label:'Exigente',   hint:'Pedido exacto · quiere mesa',patMul:1.0, stages:[0.60,0.40,0.22], flex:false, takeaway:'mesa',    grace:4.5, tipP:0.25},
  generoso:  {label:'Generoso',   hint:'Buena propina · si todo va bien',patMul:0.9, stages:[0.55,0.35,0.18], flex:true,  takeaway:'ok',      grace:4.5, tipP:0.10},
};
export const PKEYS = Object.keys(PERSONALITIES);
export const ANGER_MIN_STAGE = 1.6;
export const WAIT_TABLE_MAX = 7;

// ---------- Clientes habituales ----------
export const REGULARS = [
  {id:'chano',  name:'Chano',       type:'local',    personality:'tranquilo', fav:'barraquito',
   look:{shirt:'#0f8b8d', skin:'#c58a5c', hair:{style:'calvo',  color:'#9a9a9a'}, acc:[],           build:1.12, height:1.00, walk:{stride:0.85, bob:0.7, sway:false}}},
  {id:'mari',   name:'Mari Carmen', type:'local',    personality:'exigente',  fav:'pescado',
   look:{shirt:'#d94f8a', skin:'#e0a97e', hair:{style:'moño',   color:'#2a211c'}, acc:['pendiente'], build:1.00, height:0.96, walk:{stride:1.00, bob:0.8, sway:true}}},
  {id:'fefo',   name:'Fefo',        type:'local',    personality:'generoso',  fav:'papas',
   look:{shirt:'#f5b82e', skin:'#8d5a3b', hair:{style:'gorra',   color:'#0f8b8d'}, acc:[],           build:1.00, height:1.06, walk:{stride:0.95, bob:1.0, sway:false}}},
  {id:'dacil',  name:'Dácil',       type:'surfista', personality:'impaciente', fav:'batido',
   look:{shirt:'#5b6ee1', skin:'#f2c9a5', hair:{style:'coleta',  color:'#b8321f'}, acc:[],           build:0.88, height:1.00, walk:{stride:1.25, bob:1.2, sway:false}}},
  {id:'kike',   name:'Kike',        type:'surfista', personality:'tranquilo', fav:'cerveza',
   look:{shirt:'#3f8a3a', skin:'#e0a97e', hair:{style:'rastas',  color:'#2a211c'}, acc:['collar'],    build:1.00, height:1.02, walk:{stride:0.80, bob:0.9, sway:true}}},
  {id:'hannah', name:'Hannah',     type:'turista',  personality:'generoso',  fav:'queso',
   look:{shirt:'#e8603c', skin:'#f7d6bd', hair:{style:'largo',  color:'#d9b35a'}, acc:['gafasSol'],  build:1.00, height:1.04, walk:{stride:1.00, bob:1.0, sway:false}}},
];

export const WEATHER = {
  sol:    {label:'Sol',            desc:'Día de playa perfecto. Mucha gente.', arr:1.0, drinks:1.1, mix:{}},
  panza:  {label:'Panza de burro', desc:'Nubes bajas del alisio. Viene menos gente.', arr:0.7, drinks:0.9, mix:{local:1.3}},
  calima: {label:'Calima',         desc:'Polvo del Sáhara y calor. Se bebe mucho.', arr:0.75, drinks:1.5, mix:{}},
  viento: {label:'Viento',         desc:'Olas grandes: llegan los surfistas.', arr:0.8, drinks:1.0, mix:{surfista:2.4}},
};

export const SPECIAL_DAYS = {
  12:{title:'Crucero en el puerto', desc:'Miles de turistas bajan a la costa.', mix:{turista:1.9}, arr:1.35},
  20:{title:'Fiestas del Carmen',   desc:'Procesión marinera y medio pueblo en la playa.', mix:{local:2.0}, arr:1.35},
  27:{title:'Campeonato de surf',   desc:'Surfistas de todas las islas.', mix:{surfista:3.0}, arr:1.3, forceWeather:'viento'},
  30:{title:'Último día de temporada', desc:'Todo el mundo quiere despedir el verano.', mix:{}, arr:1.25},
};

export const UPGRADES = [
  {id:'mesas',     name:'Más mesas',            desc:'+2 mesas por nivel. Más clientes sentados, más contentos.', levels:[250,450,700]},
  {id:'sombrillas',name:'Sombrillas',           desc:'+15% de clientela los días de sol o calima.', levels:[300]},
  {id:'altavoz',   name:'Altavoz con música',   desc:'Los clientes aguantan un 25% más en la cola y salen más contentos.', levels:[350]},
  {id:'nevera',    name:'Nevera industrial',    desc:'Casi no se estropea el género y la cerveza bien fría se vende más.', levels:[600]},
  {id:'plancha',   name:'Plancha profesional',  desc:'Desbloquea el queso asado con mojo y cocina un 20% más rápido.', levels:[500]},
  {id:'hamacas',   name:'Hamacas',              desc:'+4 hamacas de alquiler por nivel. Ingresos pasivos con buen tiempo.', levels:[400,650]},
  {id:'redes',     name:'Redes sociales',       desc:'Una cuenta de Instagram con buenas fotos: +15% de clientes.', levels:[450]},
  {id:'cocina',    name:'Cocina con freidora',  desc:'Desbloquea el pescado fresco del día, el plato más rentable.', levels:[1100], req:'plancha'},
  {id:'luces',     name:'Guirnaldas y luces',   desc:'Abre hasta las 22:00 y aprovecha la puesta de sol.', levels:[800]},
];

export const STAFF = [
  {id:'camarero', name:'Yeray, camarero',          desc:'Atiende la cola él solo, en paralelo contigo.', wage:55},
  {id:'cocinero', name:'Carmela, cocinera',        desc:'Todo se prepara un 40% más rápido.', wage:65},
  {id:'limpiador',name:'Acaymo, ayudante',         desc:'Recoge las mesas sucias sin que se lo pidan.', wage:30},
];

export const HOUR_CURVE = {10:0.55,11:0.75,12:0.95,13:1.15,14:1.2,15:1.0,16:0.85,17:0.8,18:0.85,19:0.75,20:0.95,21:0.65};

export const NAMES = {
  turista:['Hannah, Hamburgo','Liam, Mánchester','Sofie, Copenhague','Giulia, Milán','Ana, Madrid','Pierre, Lyon','Olga, Helsinki','Marta, Barcelona','Jon, Dublín','Ingrid, Oslo','Marco, Roma','Nils, Estocolmo'],
  local:['Chano, Arona','Mari Carmen, Adeje','Fefo, Los Cristianos','Candelaria, Granadilla','Juanito, San Isidro','Rosario, Guía de Isora','Tomás, Igueste','Pino, Valle de San Lorenzo','Eusebio, La Laguna'],
  surfista:['Dácil, El Médano','Kike, Las Américas','Nauzet, Playa Paraíso','Iker, Mundaka','Sara, Corralejo','Toni, Pozo Izquierdo','Vera, Sotavento'],
};
export const REG_TOWN = {chano:'Arona', mari:'Adeje', fefo:'Los Cristianos', dacil:'El Médano', kike:'Las Américas', hannah:'Hamburgo'};
export function who(type){ const a=NAMES[type]||NAMES.turista; return a[Math.floor(rnd()*a.length)]; }

STAFF.push({id:'terraza',name:'Camarero de terraza',desc:'Acompaña, toma pedidos, recoge y entrega las comandas. Puede ayudar a limpiar.',wage:60});
