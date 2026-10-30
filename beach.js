import {Game,Net,hamacaCount,weatherToday,closeHour} from './state.js?v=28.17.2-flat-sand';
import {createBeach,stepBeach} from './beach-model.mjs?v=28.17.2-flat-sand';
import {SEC_PER_HOUR} from './config.js?v=28.17.2-flat-sand';
import {netDirty} from './net.js?v=28.17.2-flat-sand';
export function startBeach(){Game.upgrades.beach=createBeach(hamacaCount());Game.dayStats.beachRentals=0;}
export function updateBeach(){if(Net.role==='guest'||!Game.dayStats)return;if(!Game.upgrades.beach)startBeach();const out=stepBeach(Game.upgrades.beach,Game.hour+(Game.closing?Game.closeT/SEC_PER_HOUR:0),Game.closing,weatherToday(),closeHour());Game.upgrades.beach=out.state;for(const e of out.events){Game.money+=e.amount;Game.dayStats.hamacas+=e.amount;Game.dayStats.beachRentals++;Game.floaters.push({x:560+e.slot*88,y:418,text:'Hamaca +'+e.amount+' €',t:0,color:'#ffe066'});}if(out.events.length)netDirty();}
