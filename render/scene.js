import { drawFloorWorker } from "./characters.js?v=28.17.1-online-web";
/* Mechanical extraction from render.js; declaration bodies are unchanged. */
import { floorActive } from "../floor-service.js?v=28.17.1-online-web";
import { STATION_COLOR } from "../config.js?v=28.17.1-online-web";
import { W } from "../config.js?v=28.17.1-online-web";
import { stationOf } from "../config.js?v=28.17.1-online-web";
import { clamp } from "../util.js?v=28.17.1-online-web";
import { lerp } from "../util.js?v=28.17.1-online-web";
import { mixColor } from "../util.js?v=28.17.1-online-web";
import { drawIcon } from "../icons.js?v=28.17.1-online-web";
import { rr } from "../icons.js?v=28.17.1-online-web";
import { Game } from "../state.js?v=28.17.1-online-web";
import { Net } from "../state.js?v=28.17.1-online-web";
import { isCoop } from "../state.js?v=28.17.1-online-web";
import { COUNTER, HUT_BAR_FLOOR_Y } from "../world.js?v=28.17.1-online-web";
import { STATION_ZONE } from "./identity.js?v=28.17.1-online-web";
import { drawPerson } from "./characters.js?v=28.17.1-online-web";
import { drawStationProps } from "./items.js?v=28.17.1-online-web";
import { drawStationWork } from "./items.js?v=28.17.1-online-web";

export const SKY_KEYS=[
  {h:9, top:'#7cc7ea',bot:'#d9f1fb'},
  {h:15,top:'#4fb3e3',bot:'#c9ecfa'},
  {h:18,top:'#6aa6d6',bot:'#ffe2a8'},
  {h:19.6,top:'#e28a6c',bot:'#ffc684'},
  {h:20.6,top:'#5a4f86',bot:'#f19a6e'},
  {h:22.2,top:'#1c2148',bot:'#5a3e63'},
];

export function skyAt(h){
  let a=SKY_KEYS[0], b=SKY_KEYS[SKY_KEYS.length-1];
  for(let i=0;i<SKY_KEYS.length-1;i++){ if(h>=SKY_KEYS[i].h && h<=SKY_KEYS[i+1].h){ a=SKY_KEYS[i]; b=SKY_KEYS[i+1]; break; } }
  if(h<SKY_KEYS[0].h) b=a; if(h>b.h) a=b;
  const t = a===b?0: (h-a.h)/(b.h-a.h);
  return {top:mixColor(a.top,b.top,t), bot:mixColor(a.bot,b.bot,t)};
}

export function nightness(h){ return clamp((h-19.8)/2,0,0.75); }

export function drawTeide(c,h,nt){
  const base = mixColor('#8fa0c0','#3b3560',nt), shade=mixColor('#7486ab','#2d2850',nt);
  c.fillStyle=mixColor('#a7b7d2','#433d6a',nt);
  c.beginPath(); c.moveTo(560,332); c.quadraticCurveTo(700,250,820,220); c.lineTo(900,150); c.lineTo(960,140); c.lineTo(1020,205); c.quadraticCurveTo(1150,250,1320,300); c.lineTo(1320,332); c.fill();
  c.fillStyle=base; c.beginPath(); c.moveTo(640,332); c.quadraticCurveTo(780,270,860,215); c.lineTo(905,152); c.lineTo(955,146); c.lineTo(1000,210); c.quadraticCurveTo(1100,270,1230,332); c.fill();
  c.fillStyle=shade; c.beginPath(); c.moveTo(955,146); c.lineTo(1000,210); c.quadraticCurveTo(1100,270,1230,332); c.lineTo(1040,332); c.quadraticCurveTo(990,250,955,146); c.fill();
  const tint = h>18.3? mixColor('#ffffff','#ffc7a1',clamp((h-18.3)/1.5,0,1)) : '#f3f6fb';
  c.fillStyle=nt>0.4? mixColor(tint,'#6c6590',nt) : tint;
  c.beginPath(); c.moveTo(888,172); c.lineTo(905,152); c.lineTo(955,146); c.lineTo(978,178); c.lineTo(960,170); c.lineTo(945,184); c.lineTo(930,170); c.lineTo(912,182); c.closePath(); c.fill();
  // pueblo costero
  c.fillStyle=mixColor('#f5efe4','#6b5f78',nt);
  for(let i=0;i<22;i++){ const x=600+i*28+(i%3)*5, y=318-(i%4)*4; c.fillRect(x,y,16,12-(i%2)*3); }
  if(nt>0.3){ c.fillStyle=`rgba(255,210,120,${nt})`; for(let i=0;i<22;i+=2) c.fillRect(604+i*28,321-(i%4)*4,3,3); }
}

export function drawClouds(c,T,weather,nt,wind){
  const n = weather==='panza'?9:weather==='calima'?2:4;
  const col = weather==='panza'? mixColor('#c9ced6','#4b4767',nt) : mixColor('#ffffff','#a67b95',nt);
  for(let i=0;i<n;i++){
    const sp = 6*wind+(i%3)*3; const x=((i*260 + T*sp)%(W+400))-200; const y = weather==='panza'? 60+(i%3)*45 : 60+(i%3)*50;
    c.fillStyle=col; c.globalAlpha= weather==='panza'?0.95:0.85;
    c.beginPath(); c.ellipse(x,y,90,24,0,0,7); c.ellipse(x+50,y-16,60,26,0,0,7); c.ellipse(x-50,y-8,50,20,0,0,7); c.fill();
  }
  c.globalAlpha=1;
  if(weather==='panza'){ c.fillStyle=mixColor('#b9bfc9','#3f3b5a',nt); c.fillRect(-400,-200,W+800,240); c.beginPath(); for(let x=-400;x<=W+400;x+=60){ c.ellipse(x,40,50,22,0,0,7);} c.fill(); }
}

export function drawSea(c,T,h,nt,wind,sunX){
  const g=c.createLinearGradient(0,330,0,425);
  g.addColorStop(0,mixColor('#1f8fb0','#2b2f5a',nt)); g.addColorStop(1,mixColor('#2ec2c4','#2b4a6a',nt));
  c.fillStyle=g; c.fillRect(-400,330,W+800,95);
  c.strokeStyle='rgba(255,255,255,.35)'; c.lineWidth=2;
  for(let r=0;r<5;r++){ const y=345+r*17; c.beginPath(); for(let x=-400;x<=W+400;x+=16){ const yy=y+Math.sin(x*0.03+T*(1+r*0.2)*wind+r)*2*(1+r*0.3)*wind; x===-400?c.moveTo(x,yy):c.lineTo(x,yy);} c.stroke(); }
  // reflejo del sol
  if(h>17.5){ const a=clamp((h-17.5)/2,0,0.6)*(1-nt); c.fillStyle=`rgba(255,200,120,${a})`; for(let i=0;i<7;i++){ const w=60-i*6+Math.sin(T*2+i)*8; c.fillRect(sunX-w/2,336+i*12,w,4);} }
  // surfistas en el agua con viento
  if(wind>1){ for(let i=0;i<3;i++){ const x=(700+i*180+Math.sin(T*0.5+i)*60), y=372+i*10+Math.sin(T*2+i)*3; c.fillStyle='#f5b82e'; c.fillRect(x-14,y,28,4); c.fillStyle='#2a211c'; c.fillRect(x-3,y-12,6,12); c.beginPath(); c.arc(x,y-15,4,0,7); c.fill(); } }
}

export function drawPalm(c,x,y,s,T,wind,nt){
  c.save(); c.translate(x,y); c.scale(s,s);
  const sway=Math.sin(T*1.2*wind)*0.05*wind;
  c.strokeStyle=mixColor('#8a6a45','#3d3040',nt); c.lineWidth=12; c.lineCap='round';
  c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(-20,-90,10+sway*100,-190); c.stroke();
  c.strokeStyle='rgba(0,0,0,.15)'; c.lineWidth=2; for(let i=1;i<9;i++){ const t=i/9; const px=lerp(0,10,t)-20*Math.sin(t*Math.PI)*0.8, py=-190*t; c.beginPath(); c.moveTo(px-6,py); c.lineTo(px+6,py-3); c.stroke(); }
  c.translate(10+sway*100,-190);
  c.fillStyle=mixColor('#2f7a3a','#1d3a32',nt);
  for(let i=0;i<7;i++){ const a=-Math.PI+i*(Math.PI/6)+sway*3+Math.sin(T*2*wind+i)*0.04*wind; c.save(); c.rotate(a); c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(50,-22,100,18); c.quadraticCurveTo(50,0,0,6); c.fill(); c.restore(); }
  c.fillStyle='#5a3b1f'; c.beginPath(); c.arc(-4,6,6,0,7); c.arc(6,8,6,0,7); c.fill();
  c.restore();
}

export function drawHut(c,T,h,nt,wind){
  const wood=mixColor('#8a5a36','#3d2a26',nt*0.7), woodD=mixColor('#6b4226','#2d1f1c',nt*0.7);
  // trasera
  c.fillStyle=mixColor('#a77b52','#4b3530',nt*0.7); c.fillRect(60,250,420,200);
  // estanterías con botellas
  c.fillStyle=woodD; c.fillRect(80,300,240,8); c.fillRect(80,350,240,8);
  for(let i=0;i<10;i++){ const bx=90+i*23; c.fillStyle=['#3f8a3a','#7a3b1f','#f5b82e','#e9e1d2','#2a6b8a'][i%5]; rr(c,bx,272,12,28,3); c.fill(); rr(c,bx+3,264,6,10,2); c.fill(); }
  for(let i=0;i<8;i++){ const bx=94+i*28; c.fillStyle=['#f5b82e','#d9633f','#fff6e6'][i%3]; rr(c,bx,326,18,24,4); c.fill(); }
  // ventana con plátanos y cafetera
  c.fillStyle=mixColor('#2a211c','#141012',nt); c.fillRect(340,270,120,80);
  c.fillStyle='#c0c4c8'; rr(c,355,300,40,48,6); c.fill(); c.fillStyle='#2a211c'; c.fillRect(366,318,18,6);
  c.fillStyle='#f4d03f'; for(let i=0;i<4;i++){ c.beginPath(); c.ellipse(420+i*7,320,4,14,0.4,0,7); c.fill(); }
  // postes
  c.fillStyle=wood; c.fillRect(56,220,16,320); c.fillRect(470,220,16,320);
  // tejado de palma
  const sway=Math.sin(T*1.5*wind)*1.5*wind;
  c.fillStyle=mixColor('#c79a55','#5a4535',nt*0.7);
  c.beginPath(); c.moveTo(20,250); c.lineTo(270,150); c.lineTo(520,250); c.closePath(); c.fill();
  c.strokeStyle=mixColor('#a77b3c','#45362c',nt*0.7); c.lineWidth=3;
  for(let i=0;i<34;i++){ const x=24+i*14.5; c.beginPath(); c.moveTo(x,248); c.lineTo(x+sway+(i%2?4:-2),268+(i%3)*4); c.stroke(); }
  c.fillStyle=mixColor('#b2864a','#4b3a2e',nt*0.7); for(let i=0;i<34;i++){ const x=22+i*14.5; c.beginPath(); c.moveTo(x,246); c.lineTo(x+7+sway,266+(i%3)*5); c.lineTo(x+14,246); c.fill(); }
  // cartel: la fuente se ajusta al ancho del tablero con margen interior
  c.fillStyle=woodD; rr(c,150,186,240,48,8); c.fill(); c.fillStyle=mixColor('#f1d9a8','#806a56',nt*0.5); rr(c,156,192,228,36,6); c.fill();
  c.fillStyle='#2a211c'; c.textAlign='center';
  { const txt='EL CHARCO AZUL', maxW=196; // 228 - 2·16 de margen interior
    let fs=26; c.font='700 '+fs+'px Chillax, sans-serif';
    const wTxt=c.measureText(txt).width;
    if(wTxt>maxW){ fs=Math.max(14,Math.floor(fs*maxW/wTxt)); c.font='700 '+fs+'px Chillax, sans-serif'; }
    c.fillText(txt,270,210+fs*0.35); }
  // personal detrás de la barra: cada puesto con su aspecto y su faena
  const sb = w=> Game.mode==='service' && Game.slots.some(s=>s.who===w && s.cust);
  const coop = isCoop();
  const wslot = w => Game.slots.find(s=>s.who===w);
  const cookingNow = s => s && s.cust && (s.items||[]).some(i=>stationOf(s.cust.order[i])==='cocina');
  // una única fuente de verdad para la faena: los artículos que realmente se preparan
  const actOf = s => (s && s.cust) ? (cookingNow(s) ? 'cocina' : 'barra') : null;
  const poseOf = w => { const a=actOf(wslot(w)); return a==='cocina'?'cook': a==='barra'?'shake':'idle'; };
  const p1x = coop ? (Net.roles.p1==='barra'?435:265) : 265;
  const p2x = coop ? (Net.roles.p2==='barra'?435:265) : -1;
  const SKIN = w => w==='p2'?'#f2c9a5':'#e0a97e';
  const HAIR = w => w==='p2'?{style:'largo',color:'#b8321f'}:{style:'corto',color:'#2a211c'};
  const lookOf = (w, st) => coop
    ? {shirt: st==='cocina' ? '#f4efe6' : '#0f8b8d', skin:SKIN(w), hat: st==='cocina'?'chef':'pañuelo', look:{hair:HAIR(w),walk:{},acc:[]}, type:'staff'}
    : {shirt:'#e8603c', skin:'#e0a97e', hat:'pañuelo', look:{hair:{style:'corto',color:'#2a211c'},walk:{},acc:[]}, type:'staff'};
  const px = p1x;
  if(!floorActive('p1'))drawPerson(c,px,HUT_BAR_FLOOR_Y,{...lookOf('p1', coop?Net.roles.p1:'all'), pose:poseOf('p1'), t:T, bob:sb('p1')?Math.sin(T*18)*2:0});
  if(coop&&!floorActive('p2')){ drawPerson(c,p2x,HUT_BAR_FLOOR_Y,{...lookOf('p2',Net.roles.p2), pose:poseOf('p2'), t:T+0.7, bob:sb('p2')?Math.sin(T*18+1)*2:0}); }
  if(coop){ /* etiquetas de puesto: ahora se dibujan al final de render()
               (drawStationLabels) para que clientes y burbujas no las tapen */ }
  if(Game.staff.camarero&&!floorActive('yeray')){ const s=Game.slots.find(s=>s.who==='yeray'); const b=s&&s.cust; drawPerson(c, b?360+Math.sin(T*8)*24:380, HUT_BAR_FLOOR_Y, {shirt:'#0f8b8d',skin:'#c58a5c',look:{hair:{style:'rastas',color:'#2a211c'},walk:{},acc:[]},type:'staff',bob:b?Math.sin(T*16)*2:0}); }
  if(Game.staff.cocinero&&!floorActive('carmela')){ drawPerson(c,95+Math.sin(T*2)*8,HUT_BAR_FLOOR_Y,{shirt:'#ffffff',skin:'#e0a97e',hat:'chef',type:'staff'}); if(Game.mode==='service'&&Game.slots.some(s=>s.cust)){ c.fillStyle='rgba(255,255,255,.4)'; for(let i=0;i<3;i++){ c.beginPath(); c.arc(130+i*10+Math.sin(T*3+i)*6, 380-((T*30+i*20)%50), 6,0,7); c.fill(); } } }
  // Interior workers are drawn before the counter front.
if(Game.mode==='service'&&Game.floor) for(const a of Game.floor.actors){
  if(a.player&&!a.task&&!a.returning&&Math.hypot(a.x-a.home.x,a.y-a.home.y)<5) drawFloorWorker(c,a,T);
}
  // barra
  c.fillStyle=mixColor('#0f8b8d','#123b44',nt*0.7); c.fillRect(COUNTER.x,COUNTER.y,COUNTER.w,COUNTER.h);
  c.fillStyle='rgba(255,255,255,.12)'; for(let i=0;i<11;i++) c.fillRect(COUNTER.x+i*40+4,COUNTER.y+12,30,COUNTER.h-12);
  c.fillStyle=wood; c.fillRect(COUNTER.x-10,COUNTER.y-10,COUNTER.w+20,14);
  // cosas en la barra
  if(Game.stock.papas>0) drawIcon(c,'papas',70,COUNTER.y-6,24);
  if(Game.stock.cerveza>0){ drawIcon(c,'cerveza',102,COUNTER.y-22,28); drawIcon(c,'cerveza',130,COUNTER.y-22,28); }
  // utillaje y faena: la zona es del puesto asignado, el tipo sigue la actividad real
  // (en solitario, ambas zonas comparten la banda M, junto al jugador)
  if(coop){
    const a1=actOf(wslot('p1')), a2=actOf(wslot('p2'));
    const z1=Net.roles.p1==='cocina'?STATION_ZONE.cocina:STATION_ZONE.barra;
    const z2=Net.roles.p2==='cocina'?STATION_ZONE.cocina:STATION_ZONE.barra;
    drawStationProps(c, a1||Net.roles.p1, z1);
    drawStationProps(c, a2||Net.roles.p2, z2);
    if(a1) drawStationWork(c, a1, z1, T, wslot('p1'));
    if(a2) drawStationWork(c, a2, z2, T, wslot('p2'));
  } else {
    const a1=actOf(wslot('p1'));
    if(a1){ drawStationProps(c, a1, 248); drawStationWork(c, a1, 248, T, wslot('p1')); }
  }
  // taburetes
  for(let i=0;i<4;i++){ const x=110+i*100; c.fillStyle=['#e8603c','#f5b82e','#0f8b8d','#e8603c'][i]; rr(c,x-18,520,36,9,4); c.fill(); c.fillRect(x-14,528,5,40); c.fillRect(x+9,528,5,40); }
}

export function drawOrderIcons(c,cu,x,y){
  const coop=isCoop(), mine = Net.roles[Net.me];
  cu.order.forEach((id,i)=>{
    const ix=x+24+i*34, st = cu.itemSt? cu.itemSt[i] : 0;
    c.globalAlpha = st===2||st===3 ? 0.45 : 1;
    drawIcon(c,id,ix,y+20,30); c.globalAlpha=1;
    // aviso visible de sustitución aceptada (mejora 6)
    if(cu.subs && cu.subs[i] && st===0){
      c.fillStyle='#ffd36b'; c.beginPath(); c.arc(ix+10,y+2,7,0,7); c.fill(); c.strokeStyle='#2a211c'; c.lineWidth=1.4; c.stroke();
      c.strokeStyle='#2a211c'; c.lineWidth=1.8; c.beginPath(); c.moveTo(ix+6,y+1); c.lineTo(ix+14,y+1); c.moveTo(ix+6,y+4); c.lineTo(ix+14,y+4); c.stroke();
      c.beginPath(); c.moveTo(ix+6,y+1); c.lineTo(ix+8,y-1); c.moveTo(ix+6,y+1); c.lineTo(ix+8,y+3); c.moveTo(ix+14,y+4); c.lineTo(ix+12,y+2); c.moveTo(ix+14,y+4); c.lineTo(ix+12,y+6); c.stroke();
    }
    if(coop && st===0){ c.fillStyle=STATION_COLOR[stationOf(id)]; rr(c,ix-11,y+33,22,4,2); c.fill(); if(stationOf(id)===mine){ c.strokeStyle=STATION_COLOR[mine]; c.lineWidth=2; rr(c,ix-16,y+3,32,34,8); c.stroke(); } }
    if(st===1){ c.strokeStyle='#2a211c'; c.lineWidth=2; c.beginPath(); c.arc(ix+10,y+8,6,0,7); c.fillStyle='#fff6e6'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(ix+10,y+8); c.lineTo(ix+10,y+4); c.moveTo(ix+10,y+8); c.lineTo(ix+13,y+9); c.stroke(); }
    if(st===2){ c.fillStyle='#3f8a3a'; c.beginPath(); c.arc(ix+10,y+8,7,0,7); c.fill(); c.strokeStyle='#fff'; c.lineWidth=2.4; c.beginPath(); c.moveTo(ix+6.5,y+8); c.lineTo(ix+9,y+10.5); c.lineTo(ix+13.5,y+5.5); c.stroke(); }
    if(st===3 || (st===0 && Game.stock[id]<=0)){ c.strokeStyle='#c73e2a'; c.lineWidth=3; c.beginPath(); c.moveTo(ix-12,y+8); c.lineTo(ix+12,y+32); c.stroke(); }
  });
}

export const PCOLORS = {tranquilo:'#2a7d4f', impaciente:'#c25b2a', exigente:'#6b5bd6', generoso:'#c94f7c'};

export function drawPictogram(c,key,x,y){
  c.save(); c.translate(x,y); c.strokeStyle='#fff6e6'; c.fillStyle='#fff6e6'; c.lineWidth=1.6;
  if(key==='tranquilo'){ // palmera
    c.beginPath(); c.moveTo(0,6); c.lineTo(0,-2); c.stroke();
    for(const a of [-2.4,-1.6,-0.8,0,0.8]){ c.beginPath(); c.moveTo(0,-2); c.lineTo(Math.sin(a)*5,-2-Math.cos(a)*4.5); c.stroke(); }
  } else if(key==='impaciente'){ // reloj
    c.beginPath(); c.arc(0,0,5,0,7); c.stroke(); c.beginPath(); c.moveTo(0,0); c.lineTo(0,-3); c.moveTo(0,0); c.lineTo(2.5,1); c.stroke();
  } else if(key==='exigente'){ // estrella
    c.beginPath(); for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, r=i%2?2.4:5.6; c.lineTo(Math.cos(a)*r,Math.sin(a)*r); } c.closePath(); c.fill();
  } else if(key==='generoso'){ // corazón
    c.beginPath(); c.moveTo(0,5); c.lineTo(-5,0); c.arc(-2.5,-1,2.5,Math.PI,0,false); c.arc(2.5,-1,2.5,Math.PI,0,false); c.lineTo(5,0); c.closePath(); c.fill();
  }
  c.restore();
}

export function drawNameplate(c,cu,bx,by){
  const ly = cu.regLoyalty!=null?cu.regLoyalty:(Game.regulars&&cu.regular&&Game.regulars[cu.regular.id]?Game.regulars[cu.regular.id].loyalty:1);
  c.font='700 10px Satoshi, sans-serif';
  const txt=cu.regular.name+' '+'★'.repeat(ly);
  const tw=c.measureText(txt).width+16;
  // no invade la burbuja triple del vecino de la izquierda
  const x0=Math.max(bx-tw/2,bx-20), cx=x0+tw/2;
  c.fillStyle='rgba(42,33,28,.85)'; rr(c,x0,by-22,tw,15,7); c.fill();
  c.fillStyle='#ffd36b'; c.textAlign='center'; c.fillText(txt,cx,by-11);
}

export function drawAngerCue(c,x,y,stage,T){
  if(stage===1){ c.fillStyle='#e0a000'; for(let i=0;i<3;i++){ c.globalAlpha=0.4+0.6*Math.abs(Math.sin(T*2+i*0.7)); c.beginPath(); c.arc(x+i*6,y,2.2,0,7); c.fill(); } c.globalAlpha=1; }
  else if(stage===2){ c.strokeStyle='#d9633f'; c.lineWidth=1.8; c.beginPath(); c.arc(x+3,y-1,6,0,7); c.stroke(); c.beginPath(); c.moveTo(x+3,y-1); c.lineTo(x+3,y-5.5); c.moveTo(x+3,y-1); c.lineTo(x+6.5,y); c.stroke(); }
  else { c.fillStyle=Math.sin(T*10)>0?'#e8473c':'#a3322a'; c.font='700 13px Satoshi, sans-serif'; c.textAlign='left'; c.fillText('!',x,y+5); c.textAlign='center'; }
}
