import {tieVector} from './professional-model.mjs?v=28.17.0-online-web';
import {weeklyPoints} from './management-model.mjs?v=28.17.0-online-web';
// v23: tres ligas simultáneas. Simulación económica resumida y determinista por cierre.
export const AREAS=['Pueblo','Isla','Nación'],TIERS=['Bronce','Plata','Oro'];
const names=['La Brisa','El Muelle','La Gaviota','Salitre','La Toalla','El Faro','La Duna','La Sombrilla','El Ancla','La Ola','El Coral','La Caleta','El Alisio','La Arena','El Mirador','Las Palmeras','La Orilla','El Timón','La Espuma','El Velero','El Cangrejo','El Pez Azul','La Costa','El Horizonte','Las Conchas','El Puerto','La Marea','El Refugio','El Islote'];
const styles=['Clásico','Familiar','Turístico','Gourmet','Económico','De moda'];
const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
export function hash(s){let h=2166136261;for(const c of String(s)){h=Math.imul(h^c.charCodeAt(0),16777619);}return h>>>0;}
const random=(s,k)=>hash(s+':'+k)/4294967296;
export function points(h,day=Math.max(1,...h.map(r=>r.day||0))){return weeklyPoints(h,day).total;}
export function migrate(seed,oldLeague=0,day=0){
 const npcs=AREAS.flatMap((area,a)=>names.map((name,i)=>({id:`npc-${a}-${i}`,name:name+' · '+area,area:a,style:styles[hash(seed+a+':'+i)%6],cash:1200+a*1000+i*20,capacity:30+a*18+i,staff:1,quality:3.1+i*.025,price:1,followers:40+a*100+i*10,history:[],lastAction:'Apertura',actions:[],reserve:300})));
 const groups=AREAS.map((_,a)=>[['player',...npcs.filter(n=>n.area===a).slice(0,9).map(n=>n.id)],npcs.filter(n=>n.area===a).slice(9,19).map(n=>n.id),npcs.filter(n=>n.area===a).slice(19).map(n=>n.id)]);
 // Conserva la categoría alcanzada en el antiguo ámbito sin bloquear los otros.
 const area=Math.floor(Math.max(0,Math.min(8,oldLeague))/3),tier=oldLeague%3;
 if(tier){const id=groups[area][tier].pop();groups[area][0][0]=id;groups[area][tier].push('player');}
 return {version:1,seed:String(seed),npcs,groups,tiers:groups.map(g=>g.findIndex(t=>t.includes('player'))),last:day,reviewDay:day,badges:[],previous:{},results:[]};
}
function spend(n,action,cost,apply,day){if(n.cash<cost+n.reserve)return false;n.cash-=cost;apply();n.lastAction=action;n.actions.push({day,action,cost});n.actions=n.actions.slice(-7);return true;}
export function step(state,day,context={}){
 if(day<=state.last)return state;
 const s=JSON.parse(JSON.stringify(state));
 for(const n of s.npcs){
  const prev=n.history.at(-1),candidates=[{key:'reserve',value:n.cash<n.reserve*2?100:5,cost:0}];
  if(n.cash>=500+n.reserve)candidates.push({key:'capacity',value:prev&&prev.lost>5?80:15,cost:500});
  if(n.cash>=250+n.reserve)candidates.push({key:'quality',value:n.quality<4?65:10,cost:250});
  if(n.cash>=80+n.reserve)candidates.push({key:'promotion',value:n.style==='De moda'?75:25,cost:80});
  const pick=candidates.sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key))[0];let promotion=0;
  if(pick.key==='capacity')spend(n,'Amplió capacidad',500,()=>{n.capacity+=8;},day);
  if(pick.key==='quality')spend(n,'Formación del equipo',250,()=>{n.quality=cap(n.quality+.12,1,5);},day);
  if(pick.key==='promotion')spend(n,'Campaña de promoción',80,()=>{promotion=.15;},day);
  if(pick.key==='reserve')n.lastAction='Protege su caja';
  if(prev?.profit<0)n.price=cap(n.price+.02,.8,1.5);else if(prev?.lost>8)n.price=cap(n.price+.01,.8,1.5);
  const weather=n.area===0?context.weather:['sol','panza','viento','calima'][Math.floor(random(s.seed,n.id+':weather:'+day)*4)];
  const demand=(38+n.area*24)*(weather==='panza'?.75:1)*(1+promotion)*(context.event&&n.area===0&&n.style==='Turístico'?1.25:1)*(0.9+random(s.seed,n.id+':demand:'+day)*.2);
  const served=Math.max(0,Math.floor(Math.min(n.capacity,demand/(n.price*n.price))));
  const lost=Math.max(0,Math.round(demand-served)),revenue=served*8*n.price;
  const ingredients=served*2.5,overhead=45+n.staff*35;
  // Solo vende género que puede financiar. Menos caja implica menos pedidos atendidos.
  const affordable=Math.min(served,Math.floor(Math.max(0,n.cash)/2.5));
  const actualRevenue=affordable*8*n.price,cost=affordable*2.5+overhead;
  const profit=actualRevenue-cost;n.cash+=profit;
  const rating=cap(n.quality-Math.min(.8,lost*.025)-Math.max(0,n.price-1)*.3,1,5);
  n.followers=Math.max(0,Math.round(n.followers*(1-.015)+(rating-2)*2+(promotion?8:0)));
  const service=affordable+lost?affordable/(affordable+lost):0;
  const g=Math.round(service*40+rating/5*30+15+cap(profit/Math.max(1,actualRevenue),0,1)*15);
  n.history.push({day,served:affordable,lost:lost+served-affordable,revenue:actualRevenue,profit,rating,followers:n.followers,grade:{score:g}});n.history=n.history.slice(-30);
  if(n.cash < -300){n.lastAction='Reestructuración: reduce actividad';n.capacity=Math.max(15,n.capacity-3);n.staff=0;}
 }
 s.last=day;return s;
}
export function table(s,area,tier,playerHistory=[],name='El Charco Azul',day=s.last||1){
 return s.groups[area][tier].map(id=>{if(id==='player')return {id,name,style:'Vuestro kiosco',score:points(playerHistory,day),tie:tieVector(playerHistory,day)};const n=s.npcs.find(n=>n.id===id);return {id,name:n.name,style:n.style,score:points(n.history,day),tie:tieVector(n.history,day),action:n.lastAction};}).sort((a,b)=>b.score-a.score||b.tie[0]-a.tie[0]||b.tie[1]-a.tie[1]||b.tie[2]-a.tie[2]||a.id.localeCompare(b.id)).map((r,i)=>({...r,rank:i+1,change:s.previous[area+':'+r.id]==null?null:s.previous[area+':'+r.id]-(i+1)}));
}
export function review(state,day,history,name){if(day%7!==0||day<=state.reviewDay)return state;const s=JSON.parse(JSON.stringify(state));s.results=[];
 for(let a=0;a<3;a++){
  const ranked=[0,1,2].map(t=>table(s,a,t,history,name,day));
  const own=ranked[s.tiers[a]].find(r=>r.id==='player');
  s.results.push({area:a,tier:s.tiers[a],rank:own.rank,score:own.score,day});
  for(const rows of ranked)for(const r of rows)s.previous[a+':'+r.id]=r.rank;
  // Ascensos/descensos adyacentes simultáneos: ningún participante se mueve dos veces.
  const b=ranked[0].slice(0,3).map(r=>r.id),pd=ranked[1].slice(-3).map(r=>r.id);
  const pu=ranked[1].slice(0,3).map(r=>r.id),gd=ranked[2].slice(-3).map(r=>r.id);
  s.groups[a]=[ranked[0].map(r=>r.id).filter(id=>!b.includes(id)).concat(pd),ranked[1].map(r=>r.id).filter(id=>!pd.includes(id)&&!pu.includes(id)).concat(b,gd),ranked[2].map(r=>r.id).filter(id=>!gd.includes(id)).concat(pu)];
  const old=s.tiers[a];s.tiers[a]=s.groups[a].findIndex(g=>g.includes('player'));
  if(s.tiers[a]>old)s.badges.push({area:a,tier:s.tiers[a],day});
 }
 s.weeklyHistory=[...(s.weeklyHistory||[]),{day,results:s.results.map(r=>({...r}))}].slice(-104);s.reviewDay=day;return s;
}
export function nameValue(value){return Array.from(String(value||'').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,'').trim()).slice(0,32).join('')||'El Charco Azul';}
