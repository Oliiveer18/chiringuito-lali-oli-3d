/* =========================================================
   icons.js
   Iconos dibujados por código (canvas → dataURL) para HUD y botones.
   ========================================================= */
import { ITEM_IDS } from './config.js?v=28.17.1-online-web';

// Colores [principal, fondo] de productos añadidos por módulos posteriores (v11, v14)
export const EXTRA = {};

// ---------- Iconos (dibujados por código) ----------
export function rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
export function drawIcon(c,id,x,y,s){
  c.save(); c.translate(x,y); c.scale(s/32,s/32); c.lineJoin='round';
  const out = '#2a211c'; c.lineWidth=1.6; c.strokeStyle=out;
  switch(id){
    case 'cerveza':
      c.fillStyle='#f2b01e'; rr(c,-9,-7,16,21,3); c.fill(); c.stroke();
      c.beginPath(); c.arc(9,3,5,-Math.PI/2,Math.PI/2); c.stroke();
      c.fillStyle='#fff'; c.beginPath(); c.ellipse(-1,-8,10,5,0,0,Math.PI*2); c.fill(); c.stroke();
      c.fillStyle='rgba(255,255,255,.6)'; c.fillRect(-6,-2,2,12); break;
    case 'barraquito':
      c.beginPath(); c.moveTo(-8,-13); c.lineTo(8,-13); c.lineTo(6,14); c.lineTo(-6,14); c.closePath();
      c.save(); c.clip();
      c.fillStyle='#4a2a14'; c.fillRect(-10,6,20,10);
      c.fillStyle='#b9773e'; c.fillRect(-10,-1,20,7);
      c.fillStyle='#e6c79a'; c.fillRect(-10,-7,20,6);
      c.fillStyle='#fff7ea'; c.fillRect(-10,-14,20,7);
      c.restore(); c.stroke();
      c.fillStyle='#8a4b1c'; c.beginPath(); c.arc(-2,-11,1.2,0,7); c.arc(3,-10,1.2,0,7); c.fill();
      c.fillStyle='#f4e23a'; c.beginPath(); c.ellipse(9,-12,4,2,0.6,0,7); c.fill(); c.stroke(); break;
    case 'batido':
      c.strokeStyle='#d6342a'; c.lineWidth=2.4; c.beginPath(); c.moveTo(2,-8); c.lineTo(8,-17); c.stroke(); c.strokeStyle=out; c.lineWidth=1.6;
      c.fillStyle='#f6e27a'; c.beginPath(); c.moveTo(-9,-9); c.lineTo(9,-9); c.lineTo(6,14); c.lineTo(-6,14); c.closePath(); c.fill(); c.stroke();
      c.fillStyle='#fff8d6'; c.beginPath(); c.ellipse(0,-9,9,3,0,0,7); c.fill(); c.stroke();
      c.fillStyle='#f1c94a'; c.beginPath(); c.ellipse(-10,-7,6,2.6,-0.5,0,7); c.fill(); c.stroke(); break;
    case 'papas':
      c.fillStyle='#8a5a36'; c.beginPath(); c.ellipse(0,6,15,8,0,0,Math.PI); c.lineTo(-15,6); c.fill(); c.stroke();
      c.fillStyle='#f3ead8'; c.beginPath(); c.ellipse(0,6,15,4,0,0,7); c.fill(); c.stroke();
      [[-7,2],[0,0],[7,2],[-3,-3],[4,-4]].forEach(([px,py])=>{ c.fillStyle='#c9a266'; c.beginPath(); c.ellipse(px,py,5,4,0.3,0,7); c.fill(); c.stroke(); c.fillStyle='rgba(255,255,255,.7)'; c.fillRect(px-1,py-2,2,1); });
      c.fillStyle='#b8321f'; c.beginPath(); c.arc(10,-6,4,0,7); c.fill(); c.stroke();
      c.fillStyle='#5f8a2b'; c.beginPath(); c.arc(-11,-5,3.5,0,7); c.fill(); c.stroke(); break;
    case 'queso':
      c.fillStyle='#f3ead8'; c.beginPath(); c.ellipse(0,6,15,6,0,0,7); c.fill(); c.stroke();
      c.fillStyle='#f6e7b8'; c.beginPath(); c.ellipse(0,0,12,8,0,0,7); c.fill(); c.stroke();
      c.strokeStyle='#a2692f'; c.lineWidth=1.4; for(let i=-6;i<=6;i+=4){ c.beginPath(); c.moveTo(i-3,-5); c.lineTo(i+3,4); c.stroke(); }
      c.fillStyle='#b8321f'; c.beginPath(); c.arc(-4,-1,3,0,7); c.fill();
      c.fillStyle='#5f8a2b'; c.beginPath(); c.arc(5,1,2.6,0,7); c.fill(); break;
    case 'pescado':
      c.fillStyle='#f3ead8'; c.beginPath(); c.ellipse(0,8,16,5,0,0,7); c.fill(); c.stroke();
      c.fillStyle='#d9633f'; c.beginPath(); c.ellipse(-2,0,11,7,0,0,7); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(8,0); c.lineTo(15,-7); c.lineTo(15,7); c.closePath(); c.fill(); c.stroke();
      c.fillStyle='#fff'; c.beginPath(); c.arc(-8,-2,2,0,7); c.fill(); c.fillStyle=out; c.beginPath(); c.arc(-8,-2,1,0,7); c.fill();
      c.fillStyle='#f4e23a'; c.beginPath(); c.moveTo(-14,8); c.arc(-14,8,5,Math.PI,Math.PI*1.6); c.closePath(); c.fill(); c.stroke(); break;
    default: {
      const col=EXTRA[id];
      if(col){ c.fillStyle=col[1]; c.beginPath(); c.arc(0,0,15,0,7); c.fill(); c.stroke(); c.fillStyle=col[0]; c.beginPath(); c.arc(0,-2,9,0,7); c.fill(); }
    }
  }
  c.restore();
}
export const ICON_URL = {};
export function buildIcons(){
  for(const id of ITEM_IDS){ const cv=document.createElement('canvas'); cv.width=cv.height=88; const c=cv.getContext('2d'); drawIcon(c,id,44,46,76); ICON_URL[id]=cv.toDataURL(); }
}
