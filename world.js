/* =========================================================
   world.js
   Geometría de la escena (mesas, hamacas, cola, mostrador) y aspecto de los clientes.
   ========================================================= */
import { QUEUE_SPOTS } from './config.js?v=28.17.1-online-web';
import { rand, rnd } from './util.js?v=28.17.1-online-web';
import { Game, tableCount } from './state.js?v=28.17.1-online-web';
import { navRebuild } from './nav.js?v=28.17.1-online-web';

// ---------- Geometría de la escena ----------
export const TABLE_POS = [];
for(let r=0;r<2;r++) for(let c=0;c<5;c++) TABLE_POS.push({x:600+c*198+(r?60:0), y:528+r*156});
export const HAMACA_POS = []; for(let i=0;i<8;i++) HAMACA_POS.push({x:560+i*88, y:452});
export const QUEUE_POS = []; for(let i=0;i<QUEUE_SPOTS;i++) QUEUE_POS.push({x:434-i*80, y:600}); // margen para que el último no se corte con sombreros/mochilas
export const COUNTER = {x:50,y:440,w:440,h:70};
/** Suelo interior del quiosco: fillRect(60,250,420,200) → borde inferior y=450. drawPerson ancla los pies en y. */
export const HUT_BAR_FLOOR_Y = 450;

export function buildTables(){
  const n = tableCount(); const old = Game.tables;
  Game.tables = [];
  for(let i=0;i<n;i++){ const p=TABLE_POS[i]; Game.tables.push(old[i] ? old[i] : {x:p.x,y:p.y,state:'free',cust:null,dirtyT:0,color:['#e8603c','#f5b82e','#0f8b8d','#3f8a3a'][i%4]}); }
  if(typeof navRebuild==='function') navRebuild();
}

/** Convierte coordenadas de mesa 2D a coordenadas mundiales 3D en la terraza */
export function tablePosTo3D(table) {
  if (!table) return { x: 5.2, z: -0.6 };
  const tx = 4.8 + ((table.x - 600) / 720) * 10.4;
  const tz = -1.0 + ((table.y - 528) / 156) * 3.6;
  return { x: tx, z: tz };
}

// ---------- Clientes ----------
export const SHIRTS=['#e8603c','#0f8b8d','#f5b82e','#5b6ee1','#d94f8a','#3f8a3a','#ffffff','#9a5bd6','#ff9f43'];
export const SKINS=['#f2c9a5','#e0a97e','#c58a5c','#8d5a3b','#f7d6bd','#ffd2c2'];
export const custSeq={id:0};

// ---------- Aspecto (mejora 7): se genera una vez por cliente ----------
export const HAIR_STYLES=['corto','flequillo','coleta','moño','rastas','largo','calvo'];
export const HAIR_COLORS=['#d9b35a','#2a211c','#8a5a3b','#b8321f','#e8e8e8','#f4d03f','#6b4a2a'];
export const ACCS=['gafasSol','pendiente','collar','mochila','cámara'];
export function genLook(type){
  const look={
    shirt:SHIRTS[Math.floor(rnd()*SHIRTS.length)],
    skin:SKINS[Math.floor(rnd()*SKINS.length)],
    hair:{style:HAIR_STYLES[Math.floor(rnd()*HAIR_STYLES.length)], color:HAIR_COLORS[Math.floor(rnd()*HAIR_COLORS.length)]},
    acc: rnd()<0.4 ? [ACCS[Math.floor(rnd()*ACCS.length)]] : [],
    build:[0.88,1,1.12][Math.floor(rnd()*3)],
    height:[0.95,1,1.05][Math.floor(rnd()*3)],
    walk:{stride:rand(0.8,1.25), bob:rand(0.7,1.35), sway:rnd()<0.3},
  };
  if(type==='turista' && rnd()<0.55) look.hat = rnd()<0.6?'sombrero':'gafas';
  else if(type==='local' && rnd()<0.3) look.hat = 'gorra';
  return look;
}
