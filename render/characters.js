import { Net } from "../state.js?v=28.17.3-flat-sand";
import { clamp } from "../util.js?v=28.17.3-flat-sand";
/* Mechanical extraction from render.js; declaration bodies are unchanged. */
import { PERSONALITIES, WHO_COLOR } from "../config.js?v=28.17.3-flat-sand";
import { W } from "../config.js?v=28.17.3-flat-sand";
import { rr } from "../icons.js?v=28.17.3-flat-sand";
import { Game } from "../state.js?v=28.17.3-flat-sand";
import { PCOLORS } from "./scene.js?v=28.17.3-flat-sand";
import { drawPictogram } from "./scene.js?v=28.17.3-flat-sand";
import { drawHeldItem } from "./items.js?v=28.17.3-flat-sand";

export function drawPerson(c,x,y,o){
  const look=o.look||{};
  const hair=look.hair||{style:'corto',color:'#d9b35a'};
  const build=look.build||1, height=look.height||1;
  const wk=look.walk||{};
  const s=(o.scale||1)*height;
  const pose=o.pose||((o.walk||0)!==0?'walk':'idle');
  const t=o.t||0, ph=o.ph||o.walk||0;
  const moving=(o.moving!==undefined)?o.moving:(pose==='walk');
  c.save(); c.translate(x+(wk.sway&&moving?Math.sin(ph)*2.5:0), y+(o.bob||0));
  c.scale(s*(o.dir||1),s);
  const swing = moving?Math.sin(ph)*6:0;
  // piernas
  c.strokeStyle=o.skin; c.lineWidth=7; c.lineCap='round';
  c.beginPath(); c.moveTo(-6,-26); c.lineTo(-6+swing,0); c.moveTo(6,-26); c.lineTo(6-swing,0); c.stroke();
  // bañador/shorts
  c.fillStyle=o.shorts||'#2a3f6b'; rr(c,-13*build,-36,26*build,14,4); c.fill();
  // mochila (detrás del torso)
  if((look.acc||[]).includes('mochila')){ c.fillStyle='#8a5a36'; rr(c,-24*build,-64,10,22,4); c.fill(); }
  // torso
  c.fillStyle=o.shirt; rr(c,-15*build,-68,30*build,36,10); c.fill();
  if(o.uniform){
  c.fillStyle=o.uniform==='limpiador'?'#334155':o.uniform==='cocina'?'#263b42':'#0f6268';
  rr(c,-12*build,-54,24*build,27,3); c.fill();
  c.strokeStyle='#f5efe4'; c.lineWidth=2;
  c.beginPath(); c.moveTo(-8,-65); c.lineTo(-6,-54); c.moveTo(8,-65); c.lineTo(6,-54); c.stroke();
  c.fillStyle='#fffdf8'; c.fillRect(-6,-47,12,5);
}
  // brazos según la actividad (mejora 2)
  c.strokeStyle=o.skin; c.lineWidth=6; c.lineCap='round';
  const shL=-14*build, shR=14*build;
  const arm=(x0,y0,x1,y1)=>{ c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.stroke(); };
  switch(pose){
    case 'clean': { // el brazo sigue el mismo punto de contacto que el trapo (misma fase)
      const wp=o.wipePt;
      if(wp){ const lx=(wp.x-x)/(s*(o.dir||1)), ly=(wp.y-y)/s;
        if(lx>=0){arm(shR,-62,lx,ly);arm(shL,-62,-16,-40);}else{arm(shL,-62,lx,ly);arm(shR,-62,16,-40);} }
      else {arm(shL,-62,-8,-48);arm(shR,-62,22+Math.sin(t*12)*8,-45);}
      break; }
    case 'walk': arm(shL,-62,-19,-40+Math.cos(ph)*3); arm(shR,-62,19,-40-Math.cos(ph)*3); break;
    case 'menu': arm(shL,-62,-7,-48); arm(shR,-62,7,-48); break;
    case 'order': arm(shL,-62,-18,-40); arm(shR,-62,22,-84+Math.sin(t*8)*2); break;
    case 'lookAround': arm(shL,-62,-11,-44); arm(shR,-62,11,-44); break;
    case 'watch': arm(shL,-62,-2,-70); arm(shR,-62,19,-40); break;
    case 'protest': arm(shL,-62,-16,-48); arm(shR,-62,20,-90+Math.sin(t*10)*2); break;
    case 'drink': arm(shL,-62,-18,-40); arm(shR,-62,6,-76); break;
    case 'eat': arm(shL,-62,-18,-40); arm(shR,-62,6,-76+Math.sin(t*5)*3); break;
    case 'bye': arm(shL,-62,-18,-40); arm(shR,-62,20,-86+Math.sin(t*7)*3); break;
    case 'angry': arm(shL,-62,4,-52); arm(shR,-62,-4,-52); break;
    case 'shake': arm(shL,-62,-8,-58); arm(shR,-62,8,-58); break;   // barra: agita la cocktelera
    case 'cook':  arm(shL,-62,-14,-46); arm(shR,-62,26,-54); break; // cocina: espátula sobre la plancha
    default: arm(shL,-62,-18,-42+Math.sin(t*1.6)*1); arm(shR,-62,18,-42-Math.sin(t*1.6)*1); // idle / wait
  }
  // cabeza
  const hd = pose==='lookAround'?Math.sin(t*2.2)*3 : pose==='watch'?-3 : pose==='cook'?2.5 : 0;
  c.fillStyle=o.skin; c.beginPath(); c.arc(0,-80,12,0,7); c.fill();
  // pelo (mejora 7): parte trasera antes de la cabeza
  c.fillStyle=hair.color;
  if(hair.style==='coleta'){ c.beginPath(); c.arc(-13,-77,5,0,7); c.fill(); }
  if(hair.style==='rastas'){ c.fillRect(-17,-80,4,15); c.fillRect(-12,-77,4,18); c.fillRect(-19,-74,4,12); }
  if(hair.style==='largo'){ c.fillRect(-17,-84,5,28); c.fillRect(11,-84,4,22); }
  if(hair.style!=='calvo'){ c.beginPath(); c.arc(0,-82,13,Math.PI*0.92,Math.PI*2.08); c.fill(); }
  if(hair.style==='flequillo'){ c.fillRect(-4,-87,15,6); }
  if(hair.style==='moño'){ c.beginPath(); c.arc(0,-95,5,0,7); c.fill(); }
  // ojo + ceja
  c.fillStyle='#2a211c'; c.beginPath(); c.arc(4+hd,-81,1.6,0,7); c.fill();
  if(pose==='protest'||pose==='angry'){ c.strokeStyle='#2a211c'; c.lineWidth=1.4; c.beginPath(); c.moveTo(1+hd,-86); c.lineTo(7+hd,-84); c.stroke(); }
  // sombrero y complementos
  switch(o.hat){
    case 'sombrero': c.fillStyle='#f1d9a8'; c.beginPath(); c.ellipse(0,-88,20,5,0,0,7); c.fill(); rr(c,-10,-100,20,12,5); c.fill(); c.fillStyle='#e8603c'; c.fillRect(-10,-91,20,3); break;
    case 'gafas': c.fillStyle='#3b2a1e'; c.beginPath(); c.arc(0,-84,12,Math.PI,0); c.fill(); c.fillStyle='#111'; rr(c,-2,-84,14,5,2); c.fill(); break;
    case 'gorra': c.fillStyle='#0f8b8d'; c.beginPath(); c.arc(0,-84,12,Math.PI,0); c.fill(); c.fillRect(0,-86,18,4); break;
    case 'pañuelo': c.fillStyle='#f5b82e'; c.beginPath(); c.arc(0,-84,12.5,Math.PI,0); c.fill(); c.fillRect(-14,-86,6,10); break;
    case 'chef': c.fillStyle='#fff'; rr(c,-10,-106,20,18,6); c.fill(); c.beginPath(); c.arc(-6,-104,7,0,7); c.arc(6,-104,7,0,7); c.fill(); break;
  }
  if((look.acc||[]).includes('gafasSol')){ c.fillStyle='#111'; rr(c,-2,-85,15,5,2); c.fill(); }
  if((look.acc||[]).includes('pendiente')){ c.fillStyle='#f4d03f'; c.beginPath(); c.arc(-11,-75,1.5,0,7); c.fill(); }
  if((look.acc||[]).includes('collar')){ c.strokeStyle='#f4d03f'; c.lineWidth=1.4; c.beginPath(); c.arc(0,-66,5,0.15*Math.PI,0.85*Math.PI); c.stroke(); }
  // atrezzo de la actividad
  if(pose==='menu'){ c.fillStyle='#fff6e6'; rr(c,-9,-54,18,15,2); c.fill(); c.strokeStyle='#2a211c'; c.lineWidth=1; c.stroke(); c.strokeStyle='#b8a98f'; c.beginPath(); c.moveTo(-6,-49); c.lineTo(6,-49); c.moveTo(-6,-45); c.lineTo(3,-45); c.stroke(); }
  if(pose==='watch'){ c.fillStyle='#2a211c'; c.beginPath(); c.arc(-2,-70,2.2,0,7); c.fill(); c.strokeStyle='#f4d03f'; c.lineWidth=1.4; c.beginPath(); c.moveTo(-2,-70); c.lineTo(-2,-73); c.moveTo(-2,-70); c.lineTo(0,-69); c.stroke(); }
  if(pose==='drink'){ c.fillStyle='#f2b01e'; rr(c,2,-84,9,10,2); c.fill(); c.strokeStyle='#2a211c'; c.lineWidth=1; c.stroke(); c.fillStyle='#fff'; c.fillRect(3,-86,7,2); }
  if(pose==='eat'){ c.fillStyle='#c9a266'; c.beginPath(); c.ellipse(9,-70+Math.sin(t*5)*3,3,2,0,0,7); c.fill(); }
  if(pose==='shake'){ // cocktelera entre las manos, agitándose
    const sh=Math.sin(t*16)*2.5;
    c.fillStyle='#c0c4c8'; rr(c,-6,-74+sh,12,16,3); c.fill();
    c.fillStyle='#8b9198'; rr(c,-6,-74+sh,12,5,2); c.fill();
    c.fillStyle='#e8edf0'; rr(c,-7,-75+sh,14,3,1); c.fill();
  }
  if(pose==='cook'){ // espátula en la mano derecha
    c.strokeStyle='#565c66'; c.lineWidth=3; c.beginPath(); c.moveTo(22,-54); c.lineTo(34,-63); c.stroke();
    c.fillStyle='#c9cdd2'; rr(c,32,-67,11,7,2); c.fill();
  }
  if(o.type==='surfista' && o.board){ c.fillStyle='#f5b82e'; c.save(); c.rotate(-0.15); rr(c,18,-100,12,90,6); c.fill(); c.fillStyle='#e8603c'; c.fillRect(22,-100,4,90); c.restore(); }
  if(o.type==='turista' && o.camera){ c.fillStyle='#2a211c'; rr(c,-6,-60,12,9,2); c.fill(); }
  c.restore();
}

export function customerPose(cu){
  switch(cu.state){
    case 'arrive': case 'walkby': case 'toTable': return 'walk';
    case 'leave': return cu.act==='bye'?'bye':(cu.mood==='enfado'?'angry':'walk');
    case 'queue': case 'prep': {
      if(cu.patience<=0 || cu.anger===3) return 'protest';
      if(cu.anger===2) return 'watch';
      if(cu.anger===1 && (cu.act==='wait'||cu.act==='lookAround')) return 'lookAround';
      return cu.act||'wait';
    }
    case 'eat': return cu.act==='drink'?'drink':'eat';
    case 'waitTable': return 'watch';
  }
  return 'idle';
}

export function drawCustomer(c,cu,T){
  const pose=customerPose(cu);
  const look=cu.look||{};
  const wk=look.walk||{};
  const moving=(cu.movingSpd||0)>8;
  const sit = cu.state==='eat';
  const bobAmt = moving ? Math.abs(Math.sin(cu.stridePh||cu.bob))*-3*(wk.bob||1) : Math.sin(T*1.5+(cu.id%6))*0.8;
  c.fillStyle='rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(cu.x,cu.y+2,16,5,0,0,7); c.fill();
  drawPerson(c,cu.x,cu.y-(sit?6:0),{shirt:cu.shirt,skin:cu.skin,hat:cu.hat,type:cu.type,look,
    board:cu.type==='surfista'&&!sit, camera:cu.id%2===0,
    pose, t:(cu.actT!=null&&cu.actT<50)?cu.actT:T, ph:cu.stridePh||0, moving, bob:bobAmt, dir:cu.dir||1,
    shorts: cu.type==='surfista'?'#e8603c':'#2a3f6b'});
  // Identidad: etiqueta breve y estable para cada cliente (oculta en mostrador con burbuja de pedido)
  const counterOrder = cu.state==='queue' || cu.state==='arrive' || cu.state==='prep';
  const moodBubble = (cu.mood && cu.moodT>0) || cu.state==='waitTable';
  if(!sit && !counterOrder && !moodBubble){
    const label = cu.revName || (cu.regular && cu.regular.name) || '';
    if(label){
      c.font='600 10px Satoshi, sans-serif';
      const tw=c.measureText(label).width+12;
      const tx=clamp(cu.x,tw/2+4,W-tw/2-4);
      c.fillStyle='rgba(42,33,28,.72)'; rr(c,tx-tw/2,cu.y-124,tw,16,8); c.fill();
      c.fillStyle='#fff6e6'; c.textAlign='center'; c.fillText(label,tx,cu.y-113);
    }
  }
}

export function drawPersonalityBadge(c,cu,bx,by,bw){
  const P=PERSONALITIES[cu.personality]; if(!P) return;
  c.font='700 9px Satoshi, sans-serif';
  // dos líneas para que quepa sin invadir al vecino de la fila
  const parts=P.hint.split('·').map(s=>s.trim());
  const tw=Math.max(c.measureText(parts[0]).width, parts[1]?c.measureText(parts[1]).width:0);
  const w=tw+26;
  // junto a la burbuja, anclado al borde derecho (espacio libre hacia las mesas); a la izquierda si no cabe
  let x=bx+bw/2+6; if(x+w>W-4) x=bx-bw/2+2-w;
  let y=by-30;
  if(Game.mode==='service' && cu.spot>=0){
    for(const o of Game.customers){
      if(o.id===cu.id || !['queue','prep','arrive'].includes(o.state)) continue;
      if(Math.abs(o.x-cu.x)<78 && Math.abs(o.y-cu.y)<24){
        y=by-40;
        if(x+w>W-4) y=by-52;
        break;
      }
    }
  }
  c.fillStyle=PCOLORS[cu.personality]||'#555'; rr(c,x,y,w,28,9); c.fill();
  c.strokeStyle='rgba(42,33,28,.7)'; c.lineWidth=1.2; c.stroke();
  drawPictogram(c,cu.personality,x+11,y+14);
  c.fillStyle='#fff6e6'; c.textAlign='left';
  c.fillText(parts[0],x+20,y+12);
  if(parts[1]) c.fillText(parts[1],x+20,y+22.5);
  c.textAlign='center';
}

export function drawFloorWorker(c,a,T){
  const t=Game.floor.tasks.find(t=>t.id===a.task),slot=Game.slots.find(s=>s.who===a.id),moving=t?.state==='walking'||a.returning;
  const pose=moving?'walk':t?.state==='working'?(t.kind==='clean'?'clean':'menu'):slot?.cust?'cook':'idle';
  // punto de contacto único: brazo y trapo siguen el mismo punto sobre la mesa
  let wipePt=null;
  if(pose==='clean'&&t&&t.kind==='clean'&&t.state==='working'){
    const tb=Game.tables[Number(String(t.target).replace('table',''))];
    if(tb){const side=Math.sign(a.x-tb.x)||1;wipePt={x:tb.x+side*(16+Math.sin(T*5)*12),y:tb.y-20+Math.cos(T*2.5)*3};}
  }
  drawPerson(c,a.x,a.y,{shirt:a.role==='cocinero'?'#ffffff':a.role==='limpiador'?'#f5b82e':a.player?'#e8603c':'#237d85',skin:a.id==='p2'?'#f2c9a5':'#c58a5c',look:{hair:{style:a.id==='p2'?'largo':'corto',color:'#49372d'},walk:{}},type:'staff',uniform:a.player?(Net.roles[a.id]||'barra'):a.role==='cocinero'?'cocina':a.role,hat:(a.role==='cocinero'||a.player&&Net.roles[a.id]==='cocina')?'chef':a.role==='limpiador'?'gorra':'pañuelo',pose,t:T,ph:a.phase,moving,dir:a.dir,wipePt});
  // fregar: trapo sobre la mesa y brillo mientras se limpia
  if(wipePt){
    c.fillStyle='#fff6e6';c.beginPath();c.ellipse(wipePt.x,wipePt.y,11,6,0,0,7);c.fill();
    c.strokeStyle='#d8cdb2';c.lineWidth=1.5;c.stroke();
    for(let i=0;i<3;i++){const ph=(T*1.2+i/3)%1;c.fillStyle='rgba(191,239,255,'+(0.7*(1-ph)).toFixed(2)+')';c.beginPath();c.arc(wipePt.x+Math.sin(T*2+i*2.1)*18,wipePt.y-4-ph*22,2.2+ph*1.5,0,7);c.fill();}
  }
  // Identidad de jugadores: anillo de color propio bajo los pies
  if(a.player){
    const col=WHO_COLOR[a.id]||'#ffd36b';
    c.strokeStyle=col; c.lineWidth=2.5;
    c.beginPath(); c.ellipse(a.x,a.y,14,5,0,0,7); c.stroke();
  }
  // Bandeja con productos reales al llevar un pedido
  if(a.carry){
    c.fillStyle='#e9ddc4'; rr(c,a.x+6,a.y-46,32,5,2); c.fill();
    const items=(a.carryItems&&a.carryItems.length?a.carryItems:['cerveza','papas']).slice(0,2);
    items.forEach((id,i)=>drawHeldItem(c,a.x+14+i*14,a.y-52,id,{scale:.9}));
  }
  c.textAlign='center';c.font='700 10px system-ui';c.fillStyle='#fffdf8';c.strokeStyle='#163b3d';c.lineWidth=3;
  // mientras limpia, la mesa ya muestra "Limpiando · nombre": se evita duplicar y chocar
  const cleaning=t&&t.kind==='clean'&&t.state==='working';
  const text=a.name+' · '+(a.returning?'Volviendo':t?t.kind==='clean'?'Limpieza':'Terraza':slot?.cust?'Preparando':'Disponible');
  if(!cleaning){c.strokeText(text,a.x,a.y-105);c.fillText(text,a.x,a.y-105);}
}