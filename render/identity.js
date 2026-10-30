/* Mechanical extraction from render.js; declaration bodies are unchanged. */
import { STATION_LABEL } from "../config.js?v=28.17.1-online-web";
import { W } from "../config.js?v=28.17.1-online-web";
import { WHO_COLOR } from "../config.js?v=28.17.1-online-web";
import { clamp } from "../util.js?v=28.17.1-online-web";
import { rr } from "../icons.js?v=28.17.1-online-web";
import { Game } from "../state.js?v=28.17.1-online-web";
import { Net } from "../state.js?v=28.17.1-online-web";
import { isCoop } from "../state.js?v=28.17.1-online-web";
import { drawAngerCue } from "./scene.js?v=28.17.1-online-web";
import { drawOrderIcons } from "./scene.js?v=28.17.1-online-web";
import { drawPersonalityBadge } from "./characters.js?v=28.17.1-online-web";

export const STATION_ZONE = { cocina:248, barra:410 };

export const MOODS = {caro:'¡Qué caro!', lleno:'Mucha cola…', nohay:'¿No queda?', enfado:'¡Me voy!', llevar:'Para llevar', feliz:'¡Riquísimo!', meh:'Bueno…', cambio:'Cambio', mesa:'¿Mesa?'};

export function drawBubbleAt(c, cu, T, bx, by) {
  if (cu.state === 'queue' || cu.state === 'arrive' || cu.state === 'prep') {
    const n = cu.order.length, bw = 14 + n * 34;
    const grace = cu.patience <= 0 && cu.maxPatience > 0;
    c.fillStyle = '#fff6e6'; rr(c, bx - bw / 2, by, bw, 40, 12); c.fill();
    c.strokeStyle = grace ? (Math.sin(T * 10) > 0 ? '#e8473c' : '#7d2f24') : '#2a211c'; c.lineWidth = 2; c.stroke();
    // Rabito
    c.beginPath(); c.moveTo(bx - 6, by + 40); c.lineTo(bx, by + 48); c.lineTo(bx + 6, by + 40); c.fillStyle = '#fff6e6'; c.fill();
    drawOrderIcons(c, cu, bx - bw / 2, by);
    if (cu.state === 'queue' || (cu.state === 'prep' && !cu.inPrep)) {
      const p = clamp(cu.patience / (cu.maxPatience || 1), 0, 1);
      const sw = Math.min(50, bw - 12);
      c.fillStyle = 'rgba(42,33,28,.18)'; rr(c, bx - sw / 2, by + 33, sw, 7, 3.5); c.fill();
      c.fillStyle = p > 0.5 ? '#5cc35a' : p > 0.25 ? '#f5b82e' : '#e8473c'; rr(c, bx - sw / 2, by + 33, Math.max(2, sw * p), 7, 3.5); c.fill();
      if (cu.anger > 0) drawAngerCue(c, bx - sw / 2 + 7, by + 36.5, cu.anger, T);
    }
    drawPersonalityBadge(c, cu, bx, by, bw);
  } else if (cu.mood && cu.moodT > 0) {
    const txt = cu.moodTxt || MOODS[cu.mood]; if (!txt) return;
    c.font = '700 13px Satoshi, sans-serif'; const tw = c.measureText(txt).width + 18;
    const good = cu.mood === 'feliz';
    c.globalAlpha = clamp(cu.moodT, 0, 1);
    c.fillStyle = good ? '#dff3d6' : (cu.mood === 'llevar' || cu.mood === 'meh' || cu.mood === 'cambio' || cu.mood === 'mesa') ? '#fff6e6' : '#ffd9cf';
    rr(c, bx - tw / 2, by, tw, 26, 13); c.fill(); c.strokeStyle = '#2a211c'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#2a211c'; c.textAlign = 'center'; c.fillText(txt, bx, by + 18); c.globalAlpha = 1;
  } else if (cu.state === 'waitTable') {
    c.font = '700 13px Satoshi, sans-serif'; const txt = cu.moodTxt || '¿Mesa?'; const tw = c.measureText(txt).width + 18;
    c.fillStyle = '#fff6e6'; rr(c, bx - tw / 2, by, tw, 26, 13); c.fill(); c.strokeStyle = '#2a211c'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#2a211c'; c.textAlign = 'center'; c.fillText(txt, bx, by + 18);
  }
}

export function drawBubble(c,cu,T){
  if(cu.state==='queue' || cu.state==='arrive' || cu.state==='prep'){
    const n=cu.order.length, bw=14+n*34;
    const stag = cu.spot>=0 ? cu.spot%2===1 : cu.id%2===0;
    const prepActive = Game.slots.some(s=>s.cust);
    const by = cu.y - (stag?(prepActive?224:214):142);
    const bx = clamp(cu.x, bw/2+6, W-bw/2-6);
    drawBubbleAt(c, cu, T, bx, by);
    const atCounter = cu.state==='queue' || (cu.state==='prep' && cu.inPrep===0);
    if(cu.spot>=0 && atCounter){ c.fillStyle='rgba(42,33,28,.85)'; c.beginPath(); c.arc(cu.x,cu.y+20,11,0,7); c.fill(); c.fillStyle='#fff6e6'; c.font='700 13px Satoshi, sans-serif'; c.textAlign='center'; c.fillText(String(cu.spot+1),cu.x,cu.y+25); }
  } else if(cu.mood && cu.moodT>0){
    const txt=cu.moodTxt || MOODS[cu.mood]; if(!txt) return;
    c.font='700 13px Satoshi, sans-serif'; const tw=c.measureText(txt).width+18;
    const mx=clamp(cu.x,tw/2+4,W-tw/2-4);
    drawBubbleAt(c, cu, T, mx, cu.y - 132);
  } else if(cu.state==='waitTable'){
    c.font='700 13px Satoshi, sans-serif'; const txt=cu.moodTxt||'¿Mesa?'; const tw=c.measureText(txt).width+18;
    const mx=clamp(cu.x,tw/2+4,W-tw/2-4);
    drawBubbleAt(c, cu, T, mx, cu.y - 132);
  }
}

export function drawStationLabels(c){
  if(!isCoop()) return;
  c.font='700 13px Satoshi, sans-serif'; c.textAlign='center';
  const px = Net.roles.p1==='barra'?435:265;
  const p2x = Net.roles.p2==='barra'?435:265;
  const nps=[['p1',px],['p2',p2x]].map(([w,x])=>({w,x,lab:Net.names[w]+' · '+STATION_LABEL[Net.roles[w]],tw:c.measureText(Net.names[w]+' · '+STATION_LABEL[Net.roles[w]]).width+14}));
  // nombres largos: resolver solape horizontal de izquierda a derecha (hueco de 8px, sin salir del lienzo)
  const sorted=nps.slice().sort((a,b)=>a.x-b.x);
  for(let i=1;i<sorted.length;i++){ const p=sorted[i-1], q=sorted[i]; const minX=p.x+p.tw/2+8+q.tw/2; if(q.x<minX) q.x=minX; }
  const prepActive = Game.mode==='service' && Game.slots.some(s=>s.cust);
  const labelY = prepActive ? 318 : 332;
  for(const n of nps){ if(n.x+n.tw/2>W-6) n.x=W-6-n.tw/2; c.fillStyle='rgba(42,33,28,.8)'; rr(c,n.x-n.tw/2,labelY,n.tw,20,10); c.fill(); c.fillStyle=WHO_COLOR[n.w]; c.fillText(n.lab,n.x,labelY+14); }
  c.textAlign='center';
}
