/* Modelo de visitas y reseñas. Lo importa report.js. */
import { ITEMS, SEC_PER_HOUR, who } from './config.js?v=28.17.2-flat-sand';
import { clamp, escapeHtml, eur2 } from './util.js?v=28.17.2-flat-sand';
import { visitStars, experienceSummary } from './ratings-model.mjs?v=28.17.2-flat-sand';
import { decideAll, opinionCounts } from './opinions-model.mjs?v=28.17.2-flat-sand';
import { Game, closeHour, weatherToday } from './state.js?v=28.17.2-flat-sand';

export function recordVisit(c, extra){
  if(!Game.dayStats) return;
  const qEnd = c.tServe!=null? c.tServe : (c.tLeave!=null? c.tLeave : Game.t);
  const queueSec = c.tQueue!=null? Math.max(0, qEnd-c.tQueue) : 0;
  const v = {
    type:c.type, sat:(c.sat!=null)?c.sat:null,
    order:(c.served||[]).slice(), asked:(c.asked||[]).slice(),
    missing:c.missing||0, substituted:Object.values(c.subs||{}).some(x=>x),
    queueSec:+queueSec.toFixed(1),
    waitFrac:(c.maxPatience>0)?clamp(1-c.patience/c.maxPatience,0,1):0,
    priceF:clamp(c.priceF||0,0,1), tipAmt:c.tipAmt||0, total:+((extra&&extra.total)||0).toFixed(2),
    regular:c.regular?c.regular.id:null,
    regVisits:c.regular? (Game.regulars[c.regular.id]?Game.regulars[c.regular.id].visits:1) : 0,
    name:c.revName||null,
    look:(c.look?{shirt:c.shirt,skin:c.skin,hair:c.look.hair,hat:c.hat||null}:null),
    hour:+Game.hour.toFixed(2),
    peak:(Game.hour>12.3&&Game.hour<15)||(closeHour()>20&&Game.hour>19.3&&Game.hour<21.7),
    dirtySeen:c.dirtySeen||0,
    lost:null, table:false, upset:false,
  };
  Object.assign(v, extra||{});
  Game.dayStats.visits.push(v);
}

export function starsOf(v){ return visitStars(v); }
export function ensureOpinions(s){ if(!Array.isArray(s.opinions)) s.opinions=decideAll(s.visits||[],Game.day,visitStars); return s.opinions; }
export function dayStarsSummary(s){ const o=ensureOpinions(s); return experienceSummary((s.visits||[]).filter((v,i)=>o[i]&&o[i].rated)); }
export function opinionLine(s){
  const sat=experienceSummary(s.visits||[]), pub=dayStarsSummary(s), c=opinionCounts(s);
  return 'Satisfacción interna: '+(sat.avg==null?'sin datos':sat.avg.toFixed(2)+' / 5')+' · Valoración pública: '+(pub.count?pub.avg.toFixed(1)+' ★ ('+pub.count+')':'Sin valoraciones nuevas')+' · Reputación acumulada: '+Game.rep.toFixed(2)+'. Visitantes '+c.visitors+' · Atendidos '+c.served+' · Valoraciones '+c.rated+' · Comentarios '+c.comments+'.';
}

export function mulberry32(a){ return function(){ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=Math.imul(t^(t>>>7),61|t); return ((t^(t>>>14))>>>0)/4294967296; }; }
export function pickPhrase(key, bank, rng){
  const used = Game.revUsed || (Game.revUsed={});
  const prev = Game.revPrev || {};
  const tSet = used[key] || (used[key]=new Set());
  const pSet = prev[key];
  let cands=[];
  for(let i=0;i<bank.length;i++) if(!tSet.has(i) && !(pSet && pSet.has(i))) cands.push(i);
  if(!cands.length) for(let i=0;i<bank.length;i++) if(!tSet.has(i)) cands.push(i);
  if(!cands.length) cands=bank.map((_,i)=>i);
  const idx=cands[Math.floor(rng()*cands.length)];
  tSet.add(idx);
  return bank[idx];
}

export const REVIEW_BANK = {
  colaLenta:[
    'La cola avanzaba más lento que un cangrejo.',
    'Esperamos un ratazo de pie, aunque el día acompañaba.',
    'La espera se hizo larga, no lo vamos a negar.',
    'Con lo rico que está todo, fastidia la cola que se forma.',
    'La fila para pedir era del tamaño de la playa.',
    'Tanta gente delante que casi nos da tiempo a broncearnos.',
    'Una cola respetable para un chiringuito de playa.',
  ],
  colaLlena:[
    'Pasamos y la cola llegaba hasta la orilla: dimos media vuelta.',
    'Con la cola que había, ni te molestes.',
    'No nos pusimos ni en la fila, daba cosa verla.',
    'La cola era tan larga que parecía la del carnaval.',
    'Ni cabía un alfiler en la barra, seguimos andando.',
    'Vimos la fila desde la hamaca y ni nos acercamos.',
    'La cola daba la vuelta al chiringuito: otra vez será.',
  ],
  preciosAltos:[
    'Los precios han subido más que la marea.',
    'Está bien el sitio, pero cobran como en el puerto deportivo.',
    'Por lo que cuesta un refresco aquí, en el pueblo comes dos platos.',
    'Caro para lo que es, la verdad.',
    'Nos entró la risa al ver la cuenta, y no de alegría.',
    'Bueno, bonito y caro: dos de tres no está mal.',
    'La cuenta no acompañó tanto como el sol.',
  ],
  sinStock:[
    'Lo que queríamos pedir se había agotado.',
    'No quedaba de lo que más apetecía, una pena.',
    'Parte de la carta estaba agotada.',
    'El género se nos agotó justo a nosotros, qué mala suerte.',
    'Nos quedamos con las ganas de lo que queríamos pedir.',
    'Nos quedamos sin lo nuestro de siempre, qué rabia.',
    'Se nos quedó la carta a medias por agotados.',
  ],
  mesasSucias:[
    'Las mesas de al lado siguieron sucias un buen rato.',
    'Había varias mesas sin recoger mientras esperábamos.',
    'Nos tocó pedir que nos arreglaran la mesa.',
    'Con las mesas que había pendientes, daba apetito en la barra mejor.',
    'Las gaviotas comían mejor servidas que nosotros.',
    'Vimos más de una mesa sin recoger antes de sentarnos.',
    'Las mesas tardaban en recogerse más que la marea en subir.',
  ],
  sinMesa:[
    'Ni una mesa libre en todo el rato que estuvimos.',
    'Nos tocó comer de pie como los cormoranes.',
    'Queríamos sentarnos y nada, no cabía un alfiler.',
    'Nos fuimos con el papel de aluminio a la toalla.',
    'Con lo bien que está el sitio, pena no tener dónde sentarse.',
    'Mesa para dos hubo, para cuatro ni hablar.',
    'Ni sombra ni mesa: a la toalla, que no queda otra.',
  ],
  decepcion:[
    'Esperábamos más, la verdad.',
    'Nos fuimos con la sensación de que podía estar mejor.',
    'Un poco desganado el servicio hoy.',
    'No acabamos de disfrutar la visita.',
    'Nos dejó tibios, siendo sinceros.',
    'Veníamos con expectativas y salimos regulares.',
    'No es malo, pero hoy no acertamos con el día.',
  ],
  habitual:[
    'Ya nos conocen: venimos siempre que bajamos a la playa.',
    'Otra vez por aquí, como cada verano.',
    'Es nuestra parada fija después del baño.',
    'Repetimos visita y seguimos contentos.',
    'Cuando volvemos a la isla, aquí sin falta.',
    'El chiringuito de confianza: no falla.',
  ],
  pedidoPerfecto:[
    'Pedido completo y tal cual lo pedimos, ni un fallo.',
    'Todo exactamente como lo pedimos, perfecto.',
    'Ni un cambio ni una falta: pedido redondo.',
    'Exactamente lo que pedimos, todo y bien servido.',
    'Lo que pedimos, tal cual, sin sustos.',
    'Todo lo que pedimos, completo y sin faltas.',
    'Nos sirvieron el pedido entero, tal cual.',
    'Lo pedido es lo servido: sin cambios ni faltas.',
  ],
  servicioRapido:[
    'Con la barra llena y nos sirvieron en nada.',
    'A la hora punta y volando: ni nos dio tiempo a sudar.',
    'Rapidez de récord incluso con la terraza llena.',
    'Ni tiempo a decidirnos y ya teníamos el pedido en la mano.',
    'A pleno mediodía y todo como un reloj: para aplaudir.',
    'Pedimos, parpadeamos y ya estaba listo.',
    'Pese a la marea de gente, con el pedido rapidísimo.',
  ],
  calima:[
    'Con la calima se sudaba hasta el sombrero, pero se aguantaba bien a la sombra.',
    'Día de polvo del Sáhara, pero el sitio tiene su encanto.',
    'Con este bochorno, menos mal que se está a pie de playa.',
    'La calima no perdonaba, pero el chiringuito sí.',
    'Hacía un calor de calima y la sombrilla se agradecía.',
    'Con la calima, cualquier sombra es oro, y aquí había.',
    'Bochorno de polvo, pero el refresco supo a gloria.',
  ],
  templado:[
    'Correcto y agradable. La playa manda y esto está bien para un refresco.',
    'Ni fu ni fa: cumple para matar la sed.',
    'Un sitio normal, la comida de siempre a precio de temporada.',
    'Está bien para lo que es, aunque no nos volvió locos.',
    'Pasable. El sitio es agradable, el servicio regular.',
    'Ni nochevieja ni un funeral: simplemente correcto.',
    'Cumple sin pretensiones.',
  ],
};
export const PRAISE = {
  cerveza:['La cerveza estaba tan fría que daba dolor de muelas, como manda la tradición.','Dorada bien fría, no se puede pedir más con este calor.','La cervecita a su temperatura perfecta.'],
  barraquito:['El barraquito es otro nivel: con su licor y su canela.','El mejor barraquito del sur, y eso que he probado unos cuantos.','Ese barraquito con su tostado encima… escritura pura.'],
  batido:['El batido de plátano canario, espeso y frío, una maravilla.','Batido de plátanos de la zona, se nota la diferencia.','Ese batido de plátano, para repetir.'],
  papas:['Las papas arrugadas con mojo verde y picante, como las de casa.','El mojo está hecho en el mortero, se nota.','Papas del país con su mojo: para chuparse los dedos.'],
  queso:['El queso asado con mojo es el plato que salvaría la temporada.','Queso del país a la plancha, en su punto justo.','Ese queso asado con mojo verde no lo he probado mejor ni en el norte.'],
  pescado:['El pescado era del día, fresquísimo, se notaba.','Pescado del día a la plancha, ni le faltó ni le sobró limón.','La mitad de la isla debería venir por ese pescado.'],
};
export const DETAIL = {
  order:['Pedimos {items}.','Entre los dos: {items}.','Fuimos a por {items}.','Nuestro pedido: {items}.','A pedir: {items}.','Lo nuestro de siempre: {items}.','Pedimos sin pensarlo: {items}.'],
  orderSub:[
    'Pedimos {asked} y no quedó: acabamos con {items}.',
    'Pedimos {asked}; al final recibimos {items}.',
    'Nuestro pedido era {asked}; lo que recibimos fue {items}.',
    'Pedimos {asked} y hubo que conformarse con {items}.',
    'Lo que pedimos ({asked}) no quedó; nos quedaron {items}.',
    'Elegimos {asked}, pero a la hora de la verdad fueron {items}.',
  ],
  wait:['Esperamos {mins} minutos en la cola.','Con {mins} minutos de cola se hace largo.','Nos tocaron {mins} minutos de espera de pie.','Cola de {mins} minutos, al sol.','La cola nos tuvo {mins} minutos plantados.','Una espera de {mins} minutos, no es lo ideal.','Cola de {mins} minutos que se hizo eterna.'],
  waitFast:['En nada teníamos el pedido en la mano.','Nos atendieron en un momento.','Sin apenas espera, y con la playa llena.','Rápidos incluso con la hora punta encima.','Ni nos dio tiempo a estirar las piernas.','En un visto y no visto teníamos el pedido.'],
  tableYes:['Nos sentamos en la mesa con vistas al mar.','Comimos tranquilos mirando las olas.','Hubo mesa para nosotros sin problema.','Mesa en la arena, qué más se puede pedir.','Mesa en primera línea, con la playa entera delante.','Mesa para nosotros, y con vistas de sobra.'],
  tableNo:['Nos lo llevamos a la toalla.','Comimos de pie, como buenamente se puede.','Para llevar y a la arena.','No hubo mesa y nos lo llevamos.','Sin mesa, pero con las vistas no se sufre tanto.','Sin mesa, tocó toalla.'],
  tip:['Dejamos propina, que se lo ganaron.','Dejé unas monedas de más por el trato.','Propina entregada con gusto.','Hasta propina dejamos, cosa rara en mí.','La propina salió sola, cosa que dice mucho.','Propina bien merecida.'],
  data:[
    'Cuenta de {price} tras {mins} minutos de cola.',
    'Con {mins} minutos de espera, {price} de cuenta.',
    'Por {price}, con {mins} minutos de cola.',
  ],
  dataNW:[
    'Cuenta de {price}, ni más ni menos.',
    'La cuenta salió {price}.',
  ],
  dataPos:[
    '{mins} minutos de cola y {price} bien gastados.',
    '{items}, {mins} minutos y contentos.',
    'En {mins} minutos de cola, {items}, sin queja.',
    '{items} en {mins} minutos de cola para pedir.',
    '{items}, después de {mins} minutos de cola.',
  ],
  dataPosNW:[
    'Cuenta de {price} bien gastados.',
    'Cuenta de {price}, sin queja.',
  ],
  dataTip:[
    '{mins} minutos de cola, {price} de cuenta y {tip} de propina.',
  ],
  dataTipNW:[
    '{price} de cuenta y {tip} de propina, bien invertidos.',
    'Con {price} pagados y {tip} de propina, quedamos tan a gusto.',
    'Cuenta de {price} y propina de {tip}: señal de que repetiremos.',
  ],
  dataLost:[
    'Vinimos a por {asked} y no quedaba.',
    'Queríamos {asked}; sin existencias, no hay playa que valga.',
    'Fuimos a por {asked} y se había agotado.',
  ],
  dataSubW:[
    '{mins} minutos de cola y una cuenta de {price} que no era lo previsto.',
    'A pesar de la cola de {mins} minutos, por lo menos pedimos {asked}.',
  ],
  dataSubNW:[
    'Pedimos {asked} y salió por {price}.',
    'Pedimos {asked} y la cuenta subió a {price}.',
  ],
};

export function itemsStr(v){
  const names=(v.order||[]).map(id=>ITEMS[id].name.toLowerCase());
  if(!names.length) return '';
  if(names.length===1) return names[0];
  return names.slice(0,-1).join(', ')+' y '+names[names.length-1];
}
export function askedStr(v){
  const names=(v.asked||[]).map(id=>ITEMS[id].name.toLowerCase());
  if(!names.length) return '';
  if(names.length===1) return names[0];
  return names.slice(0,-1).join(', ')+' y '+names[names.length-1];
}
export function waitMinsLabel(v){
  if(v.queueSec<2) return 'sin espera';
  return Math.max(5, Math.round(v.queueSec/SEC_PER_HOUR*60/5)*5)+' min';
}
export function fill(t,v){ return t.replace('{items}',itemsStr(v)).replace('{asked}',askedStr(v)||itemsStr(v)).replace('{price}',eur2(v.total||0)).replace('{tip}',eur2(v.tipAmt||0)).replace('{mins}',waitMinsLabel(v).replace(' min','')); }

export function triggerFor(v, rng){
  if(v.lost) return v.lost==='espera'?'colaLenta' : v.lost==='lleno'?'colaLlena' : v.lost==='caro'?'preciosAltos' : 'sinStock';
  if(v.missing>0 || v.substituted) return 'sinStock';
  if(v.waitFrac>0.55) return 'colaLenta';
  if(v.priceF>0.3) return 'preciosAltos';
  if(v.sat<0.45){
    if(v.upset) return 'sinMesa';
    if(v.dirtySeen>=2) return 'mesasSucias';
    return 'decepcion';
  }
  if(v.regular && v.regVisits>=1 && v.sat>0.6 && rng()<0.55) return 'habitual';
  if(v.sat>0.8) return 'pedidoPerfecto';
  if(v.sat>0.6){
    if(v.peak && v.waitFrac<0.25 && rng()<0.6) return 'servicioRapido';
    if(weatherToday()==='calima' && v.type!=='local' && rng()<0.5) return 'calima';
    return 'templado';
  }
  if(weatherToday()==='calima' && v.type!=='local' && rng()<0.35) return 'calima';
  return 'templado';
}

export function reviewText(v, trig, rng){
  const P=[];
  P.push(pickPhrase(trig, REVIEW_BANK[trig], rng));
  const good = v.sat!=null && v.sat>0.6;
  let praised=null;
  if(good && (trig==='pedidoPerfecto'||trig==='habitual'||trig==='templado'||trig==='calima'||trig==='servicioRapido')){
    const it=(v.order||[]).find(id=>PRAISE[id]);
    if(it && rng()<0.7){ praised=it; P.push(pickPhrase('praise:'+it, PRAISE[it], rng)); }
  }
  if(!v.lost){
    const det=[];
    const isSub = v.substituted || v.missing>0;
    if((v.order||[]).length){
      det.push(pickPhrase(isSub?'orderSub':'order', isSub?DETAIL.orderSub:DETAIL.order, rng));
    }
    if(v.queueSec>=2 && v.waitFrac>0.25){ det.push(pickPhrase('wait', DETAIL.wait, rng)); }
    else if(v.queueSec<2 && v.sat!=null && v.sat>0.6){ det.push(pickPhrase('waitFast', DETAIL.waitFast, rng)); }
    if(v.table){ det.push(pickPhrase('tableYes', DETAIL.tableYes, rng)); }
    else if(v.total>0 && !v.lost){ det.push(pickPhrase('tableNo', DETAIL.tableNo, rng)); }
    if(v.tipAmt>0.01){ det.push(pickPhrase('tip', DETAIL.tip, rng)); }
    const hasData = v.total>0;
    if(hasData){
      const bank = v.tipAmt>0.01 ? (v.queueSec>=2?DETAIL.dataTip:DETAIL.dataTipNW)
        : isSub ? (v.queueSec>=2?DETAIL.dataSubW:DETAIL.dataSubNW)
        : (v.queueSec>=2?DETAIL.data:DETAIL.dataNW);
      det.push(pickPhrase('data', bank, rng));
    }
    P.push(...det);
  } else if(v.lost==='sinStock'){
    P.push(pickPhrase('dataLost', DETAIL.dataLost, rng));
  }
  return P.join(' ');
}

export const REV_RESP_MAX = 3;
export const REV_INVITE_COST = 15;
export const REV_INVITE_REP = 0.15;
export const REV_APOLOGY_REP = 0.08;
export const Rev = { expanded:false, shownDay:0 };

const VOICE = {
  turista: [
    'Volveríamos si volvemos a la isla.',
    'Un sitio de playa como los de nuestro país, pero con vistas mejores.',
    'Para venir de vacaciones, cumple de sobra.',
    'Lo recomendamos para un día de playa.',
  ],
  local: [
    'De los de siempre, y eso ya dice mucho.',
    'Nos vemos por la playa.',
    'Para ser del sur, está bien resuelto.',
    'Repetiremos, como buenos canarios.',
  ],
  surfista: [
    'Después de una sesión, cae genial.',
    'Con el viento de la tarde, se agradece un sitio así.',
    'Entre ola y ola, un buen sitio para recargar.',
    'El plan de después del agua, sin duda.',
  ],
};

function intensityNote(stars){
  if(stars<=2) return 'No fue nuestra mejor experiencia.';
  if(stars===3) return 'Estuvo correcto.';
  return 'Merece la pena, sin duda.';
}

function townOf(v){
  const n=v.name||'';
  const parts=n.split(',');
  return parts.length>1 ? parts[parts.length-1].trim() : '';
}

export function buildRevModel(s, dayStars){
  const opinions=ensureOpinions(s);
  const rng=mulberry32(Game.day*7919+13);
  const cards=[];
  (s.visits||[]).forEach((v,i)=>{
    const o=opinions[i];
    if(!o || !o.rated) return;
    const trig=triggerFor(v,rng);
    const text=fill(reviewText(v,trig,rng),v);
    const st=visitStars(v);
    const voice=(VOICE[v.type]||VOICE.local)[Math.floor(rng()*(VOICE[v.type]||VOICE.local).length)];
    const town=townOf(v);
    const rawName=v.name||who(v.type);
    const displayName=rawName.includes(',')?rawName.split(',')[0].trim():rawName;
    cards.push({
      vid:(v.name||('v'+i))+'#'+Game.day+'#'+i,
      stars:st,
      name:displayName,
      town,
      text:`${text} ${intensityNote(st)} ${voice}`,
      resp:null, respGain:0,
    });
  });
  return { day:Game.day, respCount:0, cards };
}
