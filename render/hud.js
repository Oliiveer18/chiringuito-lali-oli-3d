/* Mechanical extraction from render.js; declaration bodies are unchanged. */
import { W } from "../config.js?v=28.17.3-flat-sand";
import { rr } from "../icons.js?v=28.17.3-flat-sand";
import { Game } from "../state.js?v=28.17.3-flat-sand";
import { Net } from "../state.js?v=28.17.3-flat-sand";
import { guestCust } from "../state.js?v=28.17.3-flat-sand";
import { isGuest } from "../state.js?v=28.17.3-flat-sand";
import { canvas } from "../canvas.js?v=28.17.3-flat-sand";
import { view } from "../canvas.js?v=28.17.3-flat-sand";

export function drawPendingBadges(c,T){
  if(!isGuest() || !Net.pend.size) return;
  for(const p of Net.pend.values()){
    let x,y,r;
    if(p.kind==='serve'){
      const cu=guestCust.get(p.key); if(!cu) continue;
      x=cu.x; y=cu.y-8; r=30;
      if(['queue','prep','arrive'].includes(cu.state)) y=cu.y-22;
    } else {
      const t=Game.tables[p.key]; if(!t) continue;
      // r=42 centrado en (t.x, t.y-4): el aro queda por debajo del rótulo «Limpiar» (t.y-76…t.y-50)
      x=t.x; y=t.y-4; r=42;
    }
    c.save();
    c.globalAlpha = p.expired?1:0.65+0.35*Math.sin(T*5);
    c.strokeStyle = p.expired?'#e8a33d':'#9ff0d0';
    c.lineWidth=2.5; c.setLineDash([7,5]); c.lineDashOffset=-(T*26)%12;
    c.beginPath(); c.arc(x,y,r,0,7); c.stroke();
    c.restore();
    // píldora en coordenadas de PANTALLA (tamaño legible constante en px CSS):
    // los anillos siguen al objeto, pero el texto no se encoge con la escena
    const dpr=view.dpr||1;
    const sx=view.ox+x*view.s, sy=view.oy+y*view.s, sr=r*view.s; // ancla del anillo en pantalla
    const label = p.expired?'Sin confirmación':'Enviado…';
    c.save();
    c.setTransform(1,0,0,1,0,0);
    c.font='700 '+(12*dpr)+'px Satoshi, sans-serif';
    const tw=c.measureText(label).width+18*dpr;
    let bx=sx+sr+10*dpr; if(bx+tw>canvas.width-8*dpr) bx=sx-sr-10*dpr-tw; // no cabe: a la izquierda
    let by=sy-9*dpr;
    if(p.kind==='serve'){
      const cu=guestCust.get(p.key);
      if(cu && ['queue','prep','arrive'].includes(cu.state)) by=sy-72*view.s;
    }
    by=Math.max(8*dpr, Math.min(by, canvas.height-8*dpr-19*dpr));      // dentro del lienzo
    c.fillStyle='rgba(42,33,28,.88)'; rr(c,bx,by,tw,19*dpr,9*dpr); c.fill();
    c.strokeStyle=p.expired?'#e8a33d':'#9ff0d0'; c.lineWidth=1.2*dpr; rr(c,bx,by,tw,19*dpr,9*dpr); c.stroke();
    c.fillStyle=p.expired?'#ffd9a0':'#d9fff0'; c.textAlign='left'; c.fillText(label,bx+9*dpr,by+13*dpr);
    c.restore();
  }
}

export function drawNetStatus(c){
  if(!isGuest() || Net.confMs==null) return;
  const dpr=view.dpr||1;
  // esquina superior derecha del ÁREA DE ESCENA (por debajo del HUD), en píxeles de canvas
  const rx=view.ox+W*view.s, ry=view.oy;
  c.save(); c.setTransform(1,0,0,1,0,0); // coordenadas de pantalla, sin la escala de la escena
  const ms=Math.round(Net.confMs);
  const col = ms<150?'#5cc35a': ms<400?'#f5b82e':'#e8473c';
  const txt = 'confirmación '+ms+' ms';
  c.font='700 '+(11*dpr)+'px Satoshi, sans-serif';
  const tw=c.measureText(txt).width+24*dpr;
  const pillX=rx-tw-14*dpr; // misma x para fondo, punto y texto: márgenes consistentes
  c.fillStyle='rgba(42,33,28,.72)'; rr(c,pillX,ry+12*dpr,tw,20*dpr,10*dpr); c.fill();
  c.fillStyle=col; c.beginPath(); c.arc(pillX+9*dpr,ry+22*dpr,3.5*dpr,0,7); c.fill();
  c.fillStyle='#fff6e6'; c.textAlign='left'; c.fillText(txt,pillX+18*dpr,ry+26*dpr);
  c.restore();
}
