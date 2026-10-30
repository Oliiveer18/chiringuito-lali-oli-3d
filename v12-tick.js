/* Reloj de la jornada social. Lo importa v12.js. */
import { Game, Net, lvl } from './state.js?v=28.17.2-flat-sand';
import { ITEMS } from './config.js?v=28.17.2-flat-sand';
import { clamp } from './util.js?v=28.17.2-flat-sand';
import { toast, updateStockbar } from './ui.js?v=28.17.2-flat-sand';
import { netDirty } from './net.js?v=28.17.2-flat-sand';
import { POSTS, INFLU } from './v12-posts.js?v=28.17.2-flat-sand';
import { migrate, newDay } from './v12-day.js?v=28.17.2-flat-sand';
import { runIncident } from './v12-actions.js?v=28.17.2-flat-sand';
import { rt } from './v12-state.js?v=28.17.2-flat-sand';
function tick(){
 migrate();
 if(Game.mode==='title'){rt.lastDay=Game.day;rt.lastT=null;return;}
 if(Game.mode==='plan'&&Game.day!==rt.lastDay)newDay();
 if(Game.mode!=='service'){rt.lastT=null;return;}
 if(rt.lastT==null)rt.lastT=Game.t;const gdt=Math.max(0,Game.t-rt.lastT);rt.lastT=Game.t;
 if(Game.upgrades.showHoy){Game.upgrades.showDia=Game.day;if(Game.upgrades.showFlojo)Game.upgrades.showFlojoDia=Game.day;}
 if(Net.role!=='guest'&&lvl('terraza')&&Game.upgrades.terrazaDia!==Game.day){Game.mods.arr*=1.1;Game.upgrades.terrazaDia=Game.day;}
 const it=Game.upgrades.incidentTipo;
 if(it&&Game.upgrades.incidentHora&&Game.hour>=Game.upgrades.incidentHora)runIncident();
 if(rt.puntaEnd&&Game.t>=rt.puntaEnd){Game.mods.arr/=1.45;rt.puntaEnd=0;toast('Fin de la hora punta','La marea baja un poco.','');}
 if(Game.upgrades.batidoraReparaT!=null){Game.upgrades.batidoraReparaT-=gdt;if(Game.upgrades.batidoraReparaT<=0){delete Game.upgrades.batidoraReparaT;Game.enabled.batido=true;toast('Batidora reparada','Vuelven los batidos.','good');updateStockbar();netDirty();}}
 if(Game.upgrades.deliveryItem){Game.upgrades.deliveryT-=gdt;if(Game.upgrades.deliveryT<=0){const id=Game.upgrades.deliveryItem,q=Game.upgrades.deliveryQty;Game.stock[id]=(Game.stock[id]||0)+q;delete Game.upgrades.deliveryItem;delete Game.upgrades.deliveryQty;delete Game.upgrades.deliveryT;toast('Repartidor en el chiringuito','+'+q+' × '+ITEMS[id].name,'good');updateStockbar();netDirty();}}
 if(rt.vipIds.length&&!rt.vipDone){const alive=rt.vipIds.filter(id=>Game.customers.some(c=>c.id===id));if(!alive.length){rt.vipDone=true;const served=Game.dayStats?Game.dayStats.served-rt.vipBase:0;if(served>=2){Game.money+=60;Game.rep=clamp(Game.rep+0.2,0,5);toast('VIP atendido','Gran servicio: +60 € y +0,2 de valoración.','good');}else{Game.rep=clamp(Game.rep-0.15,0,5);toast('VIP decepcionado','No le atendisteis como merecía.','bad');}rt.vipIds=[];netDirty();}}
 if(!Game.upgrades.socialAplicado){const posted=Game.upgrades.socialPostDia===Game.day,P=posted?POSTS[Game.upgrades.socialPost]:null;let arr=P?(Game.upgrades.socialArr!=null?Game.upgrades.socialArr:P.arr):0;const inf=Game.upgrades.socialInfluContratado?INFLU[Game.upgrades.socialInflu]:null;if(inf)arr+=(Game.upgrades.socialInfluArr!=null?Game.upgrades.socialInfluArr:inf.arr);const pres=Game.upgrades.chiringoRivalPres;if(pres&&pres>0&&pres<1)arr*=pres;if(arr>0){Game.mods.arr*=1+arr;toast('Chiringo','Chiringo trae más visitas hoy; la competencia también mueve ficha.','good');}if(posted||inf)Game.upgrades.socialAplicado=1;}
 updateChip();
}
function updateChip(){let chip=document.getElementById('v12-delivery');if(Game.upgrades.deliveryItem){if(!chip){chip=document.createElement('div');chip.id='v12-delivery';chip.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:86px;z-index:60;background:#0b4f54;color:#fff;padding:8px 14px;border-radius:999px;font:600 13px Satoshi,system-ui;box-shadow:0 6px 18px rgba(0,0,0,.35)';document.body.append(chip);}chip.textContent='Esperando reparto · '+Math.max(0,Math.ceil(Game.upgrades.deliveryT))+' s';}else if(chip)chip.remove();}
setInterval(tick,250);
setInterval(updateChip,500);
