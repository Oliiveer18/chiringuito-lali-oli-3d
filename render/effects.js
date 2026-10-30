/* Mechanical extraction from render.js; declaration bodies are unchanged. */
import { lerp } from "../util.js?v=28.17.0-online-web";

export function drawLights(c,T,a){
  c.save(); c.globalCompositeOperation='lighter';
  const pts=[]; for(let i=0;i<=16;i++){ const t=i/16; pts.push({x:lerp(486,1260,t), y:lerp(250,380,t)+Math.sin(t*Math.PI)*-40+ Math.sin(t*Math.PI*4)*12}); }
  c.strokeStyle=`rgba(40,30,20,${a})`; c.lineWidth=2; c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y)); c.stroke();
  pts.forEach((p,i)=>{ const fl=0.75+Math.sin(T*3+i)*0.25; const col=['255,200,90','255,120,90','120,220,220'][i%3]; const g=c.createRadialGradient(p.x,p.y+6,0,p.x,p.y+6,26); g.addColorStop(0,`rgba(${col},${0.9*a*fl})`); g.addColorStop(1,`rgba(${col},0)`); c.fillStyle=g; c.beginPath(); c.arc(p.x,p.y+6,26,0,7); c.fill(); });
  c.restore();
}
