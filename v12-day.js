/* Cierre y balance diario de Chiringo. Lo importa v12.js. */
import { socialIdle, markSocial, closePhoto } from './management-ui.js?v=28.17.0-online-web';
import { Game, Net, isCoop } from './state.js?v=28.17.0-online-web';
import { ITEMS } from './config.js?v=28.17.0-online-web';
import { rnd, clamp } from './util.js?v=28.17.0-online-web';
import { toast } from './ui.js?v=28.17.0-online-web';
import { netDirty } from './net.js?v=28.17.0-online-web';
import { settle, postMetrics, reachFactor, engagement, chiringoRivalLine } from './social-model.js?v=28.17.0-online-web';
import { FOL, RAT, INFLU, TRENDS } from './v12-posts.js?v=28.17.0-online-web';
import { rt } from './v12-state.js?v=28.17.0-online-web';
const absSocial=()=>((Game.upgrades.career?.season||1)-1)*30+Game.day;
export function migrate(){if(Game.upgrades[FOL]==null)Game.upgrades[FOL]=0;if(Game.upgrades[RAT]==null)Game.upgrades[RAT]=3;if(!Array.isArray(Game.upgrades.socialComments))Game.upgrades.socialComments=[];if(!Array.isArray(Game.upgrades.socialPend))Game.upgrades.socialPend=[];}
export function addPend(k,n,o){const U=Game.upgrades;if(!Array.isArray(U.socialPend))U.socialPend=[];U.socialPend.push({k,n,...(o||{})});}
export function newDay(){
 rt.lastDay=Game.day;rt.puntaEnd=0;rt.vipIds=[];rt.vipDone=false;
 const U=Game.upgrades,ayer=Game.day-1,s=Game.day>1?Game.dayStats:null,sold=(s&&s.sold)||{},outs=(s&&s.stockOuts)||{};
 const sinResp=U.socialNegativo===1&&!U.socialRespondido;
 delete U.incidentTipo;delete U.incidentHora;delete U.socialAplicado;delete U.batidoraQuitada;delete U.socialRespondido;delete U.socialInfluContratado;delete U.socialArr;delete U.socialInfluArr;
 const rep=Game.rep,f=U[FOL]||0;const extra=[];let postOk=true;const neg=[],pos=[];
 const p=(U.socialPostDia===ayer)?U.socialPost:null;
 // publicación de ayer: ¿se cumplió lo prometido?
 if(s&&p==='algodon'&&(outs.algodon||0)>0){postOk=false;neg.push('Pusisteis algodón en la red y no quedaba ninguno…');}
 if(s&&p==='show'){if(U.showDia!==ayer){postOk=false;neg.push('Anunciasteis show y no vimos nada.');}else if(U.showFlojoDia===ayer){postOk=false;neg.push('El show anunciado fue un chasco: casi no había ambiente.');}}
 if(s&&p==='encuesta'){const t=U.socialPoll;if(t&&ITEMS[t]&&(sold[t]||0)>=3){extra.push({k:'Encuesta acertada',n:4});pos.push('La encuesta acertó: había ganas de '+ITEMS[t].name.toLowerCase()+'.');}}
 delete U.socialPoll;
 // tendencia de ayer
 if(s&&U.socialTrendDia===ayer&&U.socialTrend&&ITEMS[U.socialTrend]){const t=U.socialTrend;if((sold[t]||0)>=3){extra.push({k:'Tendencia acertada',n:6});Game.rep=clamp(Game.rep+0.1,0,5);pos.push('Justo lo que buscaba hoy: '+ITEMS[t].name.toLowerCase()+'.');}}
 let tier;
 if(rep>=4){extra.push({k:'Boca a boca',n:1+Math.floor(rnd()*3)});tier=['¡El mejor chiringuito de la zona!','Todo buenísimo, volvemos seguro.','Mesas limpias y trato de diez.'];}
 else if(rep>=3){const b=Math.floor(rnd()*2);if(b>0)extra.push({k:'Boca a boca',n:b});tier=['Correcto, aunque estuvo bastante lleno.','Sitio agradable junto a la playa.','Buen sitio, aunque esperé un poco.'];}
 else{tier=['Tardaron muchísimo en servirnos.','Faltaba medio menú… decepción.','Caro para lo que es.'];}
 const picks=tier.slice().sort(()=>rnd()-0.5).slice(0,2);
 // balance de seguidores: ganados menos perdidos (social-model.js)
 const already=ayer>0&&U.socialReport?.dia===ayer&&(U.socialSettledAbs===absSocial()-1||U.socialSettledDay===ayer);
 const done=absSocial()<=1||already;
 let S=U.socialReport;
 if(!done){
 const idle=socialIdle(absSocial()-1,!!p);
 S=settle({f,rep,pend:U.socialPend||[],postOk,extra,sinResp,idle,prestados:U.socialPrestados});
 U[FOL]=S.total;U.socialIdle=idle;markSocial(absSocial()-1,idle);
 U.socialReport={dia:ayer,before:f,total:S.total,gains:S.gains,losses:S.losses,gainSum:S.gainSum,lossSum:S.lossSum,net:S.net};
 let pr=U.socialPrestados;if(pr){pr.dias-=1;if(pr.dias<=0)pr=null;}
 const add=(U.socialPend||[]).filter(e=>e.prest).reduce((a,e)=>a+(e.n||0),0);if(add>0)pr={n:(pr?pr.n:0)+add,dias:7};
 if(pr)U.socialPrestados=pr;else delete U.socialPrestados;
 U.socialPend=[];
 }
 if(Game.day>1&&S)toast('Chiringo · balance de ayer',(S.net>=0?'+':'')+S.net+' seguidores ('+S.gainSum+' ganados, '+S.lossSum+' perdidos).',S.net>=0?'good':'bad');
 U.socialComments=[...neg,...pos,...picks,...(U.socialComments||[])].slice(0,6);
 U.socialNegativo=(neg.length||(!pos.length&&rep<3))?1:0;
 // valoración pública
 let r=U[RAT]||3;r+=(rep-r)*0.15;if(p)r+=postOk?0.05:-0.2;U[RAT]=clamp(r,1,5);
 // tendencia e influencer
 delete U.socialTrend;delete U.socialTrendDia;delete U.socialInflu;delete U.socialInfluDia;
 if(rnd()<0.45){const t=TRENDS[Math.floor(rnd()*TRENDS.length)];U.socialTrend=t;U.socialTrendDia=Game.day;}
 if(rnd()<0.25){const ks=Object.keys(INFLU);U.socialInflu=ks[Math.floor(rnd()*ks.length)];U.socialInfluDia=Game.day;}
 // incidente
 if(isCoop()){const pr2=0.25+(Game.day/30)*0.45;if(rnd()<pr2){const tipos=['batidora','vip','punta','inspeccion','grupo'];U.incidentTipo=tipos[Math.floor(rnd()*tipos.length)];U.incidentHora=Math.round((11.5+rnd()*7)*10)/10;}}
 if(!U.batidoraRota)Game.enabled.batido=true;
 const prog=U.progression;
 if(Net.role!=='guest'&&prog?.rivals){
  const rv=chiringoRivalLine(prog.rivals,Game.day,prog.seed||U.kioskName||'charco');
  U.chiringoRivalLine=rv?.text||null;
  U.chiringoRivalPres=rv?.pressure??1;
 }
 netDirty();
}
// v25: resuelve ganados y perdidos al cerrar la jornada, una sola vez. newDay() no vuelve a aplicarlo.
export function closeSocialDay(){
 const U=Game.upgrades;
 if(Net.role==='guest'||Game.mode!=='report'||!Game.dayStats||U[FOL]==null)return U.socialReport||null;
 if(U.socialSettledAbs===absSocial()||(U.socialSettledAbs==null&&(U.career?.season||1)===1&&U.socialSettledDay===Game.day&&U.socialReport?.dia===Game.day))return U.socialReport;
 const s=Game.dayStats,sold=s.sold||{},outs=s.stockOuts||{},day=Game.day,p=(U.socialPostDia===day)?U.socialPost:null;
 const f=U[FOL]||0,rep=Game.rep,extra=[];let postOk=true;
 if(p==='algodon'&&(outs.algodon||0)>0)postOk=false;
 if(p==='show'&&(U.showDia!==day||U.showFlojoDia===day))postOk=false;
 if(p==='encuesta'&&U.socialPoll&&ITEMS[U.socialPoll]&&(sold[U.socialPoll]||0)>=3)extra.push({k:'Encuesta acertada',n:4});
 if(U.socialTrendDia===day&&U.socialTrend&&ITEMS[U.socialTrend]&&(sold[U.socialTrend]||0)>=3)extra.push({k:'Tendencia acertada',n:6});
 if(rep>=4)extra.push({k:'Boca a boca',n:1+(day*7)%3});else if(rep>=3&&(day*5)%4>0)extra.push({k:'Boca a boca',n:(day*5)%3});
 const hist=((U.progression&&U.progression.history)||[]).slice(-7),base=hist.length?hist.reduce((a,r)=>a+(r.served||0),0)/hist.length:20;
 const resp=clamp(0.5+0.5*(s.served||0)/Math.max(10,base),0.4,1.5);
 const pend=(U.socialPend||[]).map(e=>e.post?{...e,n:Math.max(0,Math.round(e.n*resp))}:e);
 const quiet=socialIdle(absSocial(),!!p),sinResp=U.socialNegativo===1&&!U.socialRespondido;
 const S=settle({f,rep,pend,postOk,extra,sinResp,idle:quiet,prestados:U.socialPrestados});
 U[FOL]=S.total;U.socialIdle=quiet;markSocial(absSocial(),quiet);
 let pr=U.socialPrestados;if(pr){pr.dias-=1;if(pr.dias<=0)pr=null;}
 const add=(U.socialPend||[]).filter(e=>e.prest).reduce((a,e)=>a+(e.n||0),0);if(add>0)pr={n:(pr?pr.n:0)+add,dias:7};
 if(pr)U.socialPrestados=pr;else delete U.socialPrestados;
 if(p){const mx=postMetrics({fx:{reach:reachFactor(f),eng:engagement({rating:U[RAT]||3})},f});U.socialStats={dia:day,reach:mx.reach,interactions:Math.round(mx.interactions*resp),likes:Math.round(mx.likes*resp),comments:Math.round(mx.comments*resp),followers:S.net};}else delete U.socialStats;
 U.socialReport={dia:day,before:f,total:S.total,gains:S.gains,losses:S.losses,gainSum:S.gainSum,lossSum:S.lossSum,net:S.net,resp:+resp.toFixed(2)};
 U.socialPend=[];U.socialSettledDay=day;U.socialSettledAbs=absSocial();closePhoto();
 netDirty();return U.socialReport;
}
