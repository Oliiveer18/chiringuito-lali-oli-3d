import { Game, Net } from "../state.js?v=28.17.1-online-web";
/* Mechanical extraction from render.js; declaration bodies are unchanged. */
import { floorTableLabel } from "../floor-service.js?v=28.17.1-online-web";
import { mixColor } from "../util.js?v=28.17.1-online-web";
import { drawIcon } from "../icons.js?v=28.17.1-online-web";
import { rr } from "../icons.js?v=28.17.1-online-web";
import { drawBeachGuest } from "../scene-extras.js?v=28.17.1-online-web";

export function drawHamaca(c,x,y,i,T,weather,nt){
  // sombrilla
  c.strokeStyle='#e9e1d2'; c.lineWidth=3; c.beginPath(); c.moveTo(x+18,y+8); c.lineTo(x+18,y-50); c.stroke();
  const cols=['#e8603c','#f5b82e','#0f8b8d','#fff6e6'];
  c.fillStyle=mixColor(cols[i%4],'#3a3557',nt*0.6); c.beginPath(); c.moveTo(x-18,y-42); c.quadraticCurveTo(x+18,y-76,x+54,y-42); c.closePath(); c.fill();
  // tumbona
  c.fillStyle=mixColor('#fff6e6','#706a86',nt); c.beginPath(); c.moveTo(x-22,y+8); c.lineTo(x+20,y+8); c.lineTo(x+32,y-8); c.lineTo(x+28,y-10); c.lineTo(x+16,y+2); c.lineTo(x-22,y+2); c.closePath(); c.fill();
  // bañista si hace buen tiempo
  drawBeachGuest(c,x,y,i,T);
}

export function drawTable(c,t,T){
  // sombra
  c.fillStyle='rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(t.x,t.y+16,56,12,0,0,7); c.fill();
  // sillas
  c.fillStyle=t.color; rr(c,t.x-62,t.y-26,22,40,6); c.fill(); rr(c,t.x+40,t.y-26,22,40,6); c.fill();
  // mesa
  c.fillStyle='#8a5a36'; c.fillRect(t.x-4,t.y-14,8,30);
  c.fillStyle='#c79a55'; c.beginPath(); c.ellipse(t.x,t.y-16,38,12,0,0,7); c.fill(); c.strokeStyle='#8a5a36'; c.lineWidth=2; c.stroke();
  if(t.state==='busy' && t.cust && t.cust.state==='eat'){ t.cust.served.forEach((id,i)=>drawIcon(c,id,t.x-10+i*20,t.y-24,22)); }
  if(t.state==='dirty'){
    c.fillStyle='#e9e1d2'; c.beginPath(); c.ellipse(t.x-10,t.y-18,9,4,0,0,7); c.fill(); c.fillStyle='rgba(184,50,31,.8)'; c.beginPath(); c.arc(t.x-8,t.y-19,2.5,0,7); c.fill();
    c.fillStyle='rgba(242,176,30,.6)'; rr(c,t.x+6,t.y-30,8,12,2); c.fill();
    // moscas
    for(let i=0;i<2;i++){ c.fillStyle='#2a211c'; c.beginPath(); c.arc(t.x+Math.sin(T*6+i*2)*18, t.y-40+Math.cos(T*7+i)*8,1.8,0,7); c.fill(); }
    // aviso
    const index=Game.tables.indexOf(t);
    const task=Game.floor?.tasks.find(q=>q.kind==='clean'&&q.target==='table'+index&&['queued','walking','working','blocked'].includes(q.state));
    const owner=task&&(task.requestedBy||task.actor);
    const name=owner?(Net.names?.[owner]||Game.floor?.actors.find(a=>a.id===owner)?.name||'Personal'):'';
    const label=task?(task.state==='working'?'Limpiando · ':'Asignada · ')+name:floorTableLabel(t);
    c.font='700 12px Satoshi, sans-serif';
    const labelWidth=Math.max(68,c.measureText(label).width+18);
    const pulse = task?1:1+Math.sin(T*6)*0.08;
    // mientras friega, el rótulo se ancla sobre la cabeza del personaje (sobre la mesa lo taparía)
  let bx=t.x,by=t.y-62;
  if(task&&task.state==='working'){const a=Game.floor?.actors.find(a=>a.id===task.actor);if(a){bx=a.x;by=a.y-150;}}
  c.save(); c.translate(bx,by); c.scale(pulse,pulse);
    c.fillStyle='#fff6e6'; rr(c,-labelWidth/2,-14,labelWidth,26,13); c.fill(); c.strokeStyle='#2a211c'; c.lineWidth=2; c.stroke();
    c.fillStyle='#2a211c'; c.font='700 13px Satoshi, sans-serif'; c.textAlign='center'; c.fillText(label,0,4);
    c.restore();
  }
}
