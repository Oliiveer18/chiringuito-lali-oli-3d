import './version.js?v=28.17.0-online-web';
import { VERSION } from './version.js?v=28.17.0-online-web';
import './tabguard.js?v=28.17.0-online-web';
import { EXTRA } from './icons.js?v=28.17.0-online-web';
import './main.js?v=28.17.0-online-web';
import './saves.js?v=28.17.0-online-web';
import './layout.js?v=28.17.0-online-web';
import './reliability.js?v=28.17.0-online-web';
import './coopbridge.js?v=28.17.0-online-web';
Object.assign(EXTRA,{algodon:['#ffb7d5','#fff0f6'],agua:['#7fd4f2','#bfefff'],refresco:['#e8603c','#ffd0a8'],helado:['#f7a8c4','#ffe1ef'],gofre:['#d9a24a','#f6e2b8'],cocktail:['#5fd4d6','#d6fff4'],churros:['#b8792f','#f0c98a']});
const loaded=[],failed=[],nativeInterval=window.setInterval;
window.setInterval=(fn,ms,...args)=>nativeInterval(typeof fn==='function'&&fn.name==='tick'?function(){if(window.Net&&window.Net.role==='guest')return;fn();}:fn,ms,...args);
try{
  for(const [name,url] of [['v11','./features.js?v=28.17.0-online-web'],['v12','./v12.js?v=28.17.0-online-web'],['v14','./v14.js?v=28.17.0-online-web'],['v19','./chiringo-ui.js?v=28.17.0-online-web'],['cierre','./cierre-ui.js?v=28.17.0-online-web'],['carrera','./career-ui.js?v=28.17.0-online-web'],['progreso','./progression-ui.js?v=28.17.0-online-web'],['mercado','./market-ui.js?v=28.17.0-online-web']]){
    try{await import(url);loaded.push(name);}
    catch(e){failed.push(name);console.error('Módulo '+name+' no cargó',e);
      const b=document.getElementById('errbox');if(b&&window.DEBUG){b.style.display='block';b.textContent+='['+name+'] '+(e&&e.message||e)+'\n';}}
  }
}finally{window.setInterval=nativeInterval;}
const title=document.getElementById('ver-title');
if(title)title.textContent=window.DEBUG?VERSION+' · activas: '+(loaded.join(', ')||'ninguna')+(failed.length?' · con error: '+failed.join(', '):''):VERSION;
