/* Publicaciones e influencers de Chiringo. Lo importa v12.js. */
import { Game, lvl } from './state.js?v=28.17.0-online-web';
import { influCost } from './influencer-model.mjs?v=28.17.0-online-web';
export const FOL='socialFollowers', RAT='socialRating';
export const POSTS={
 atardecer:{name:'Atardecer en el chiringuito',cost:0,arr:0.05,followers:2,desc:'Foto del atardecer. Gratis y siempre funciona.'},
 papas:{name:'Papas con mojo',cost:20,arr:0.08,followers:3,req:()=>Game.stock.papas>0,reqTxt:'Necesitáis papas en stock.',desc:'Atrae locales con hambre.'},
 barraquito:{name:'Barraquito',cost:25,arr:0.08,followers:3,req:()=>Game.stock.barraquito>0,reqTxt:'Necesitáis barraquitos en stock.',desc:'Atrae clientes de barra.'},
 algodon:{name:'Algodón de azúcar',cost:30,arr:0.15,followers:5,req:()=>lvl('algodonera')>0,reqTxt:'Necesitáis la algodonera.',desc:'Atrae familias. Riesgo si no queda algodón.'},
 show:{name:'Show esta tarde',cost:40,arr:0.20,followers:5,req:()=>!!Game.upgrades.showHoy,reqTxt:'Contrata primero un show.',desc:'Promociona el show de hoy.'},
 viral:{name:'Vídeo viral',cost:80,arr:0.25,followers:8,req:()=>Game.upgrades[RAT]>=3.5&&(Game.upgrades[FOL]||0)>=250,reqTxt:'Necesitáis 3,5 de valoración pública y 250 seguidores.',desc:'Gran alcance si la valoración acompaña.'},
 encuesta:{name:'Encuesta: ¿papas o pescado?',cost:0,arr:0.06,followers:3,desc:'La gente vota y llega más gente. Si vendes 3 del elegido, bonus de seguidores.'},
 concurso:{name:'Sorteo de un barraquito',cost:35,arr:0.12,followers:6,req:()=>Game.stock.barraquito>0,reqTxt:'Necesitáis barraquitos en stock.',desc:'Comentario + sorteo: buena afluencia.'}
};
function influCostNow(k){const h=((Game.upgrades.progression&&Game.upgrades.progression.history)||[]).slice(-7).map(r=>r.sales!==undefined?r.sales:r.revenue).filter(x=>x>0);return influCost(k,h.length?h.reduce((a,b)=>a+b,0)/h.length:0);}
export const INFLU={micro:{name:'Microinfluencer',get cost(){return influCostNow('micro');},arr:0.15,followers:20,req:()=>true,reqTxt:''},medio:{name:'Influencer mediano',get cost(){return influCostNow('medio');},arr:0.26,followers:50,req:()=>Game.upgrades[RAT]>=3&&(Game.upgrades[FOL]||0)>=100,reqTxt:'Necesitáis 3,0 de valoración pública y 100 seguidores.'},grande:{name:'Influencer grande',get cost(){return influCostNow('grande');},arr:0.42,followers:120,req:()=>Game.upgrades[RAT]>=3.5&&(Game.upgrades[FOL]||0)>=500,reqTxt:'Necesitáis 3,5 de valoración pública y 500 seguidores.'}};
export const TRENDS=['papas','batido','cerveza','algodon','pescado'];
