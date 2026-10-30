/* =========================================================
   nav.js
   Navegación A* por cuadrícula: rutas de clientes que no atraviesan mesas.
   ========================================================= */
import { H, W } from './config.js?v=28.17.2-flat-sand';
import { clamp, lerp } from './util.js?v=28.17.2-flat-sand';
import { Game } from './state.js?v=28.17.2-flat-sand';

// ---------- Navegación (mejora 1): rutas que no atraviesan mesas ----------
export const NAV = {cs:10, gw:0, gh:0, blocked:null, cx:0, cy:0};
export function navRebuild(){
  NAV.gw=Math.ceil(W/NAV.cs); NAV.gh=Math.ceil(H/NAV.cs); NAV.cx=NAV.gw; NAV.cy=NAV.gh;
  NAV.blocked=new Uint8Array(NAV.gw*NAV.gh);
  const block=(x0,y0,x1,y1)=>{
    const gx0=Math.max(0,Math.floor(x0/NAV.cs)), gx1=Math.min(NAV.gw-1,Math.ceil(x1/NAV.cs)-1);
    const gy0=Math.max(0,Math.floor(y0/NAV.cs)), gy1=Math.min(NAV.gh-1,Math.ceil(y1/NAV.cs)-1);
    for(let gy=gy0; gy<=gy1; gy++) for(let gx=gx0; gx<=gx1; gx++) NAV.blocked[gy*NAV.gw+gx]=1;
  };
  const R=8;
  for(const t of Game.tables) block(t.x-64-R, t.y-28-R, t.x+64+R, t.y+16+R);
  block(20,150,540,540);
}
export function navCellFree(gx,gy){ return gx>=0&&gy>=0&&gx<NAV.gw&&gy<NAV.gh&&!NAV.blocked[gy*NAV.gw+gx]; }
export function navFreeAt(x,y){ return navCellFree(Math.floor(x/NAV.cs),Math.floor(y/NAV.cs)); }
export function navNearestFree(x,y){
  let gx=Math.floor(x/NAV.cs), gy=Math.floor(y/NAV.cs);
  if(navCellFree(gx,gy)) return {x,y};
  for(let r=1;r<40;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
    if(Math.abs(dx)!==r && Math.abs(dy)!==r) continue;
    if(navCellFree(gx+dx,gy+dy)) return {x:(gx+dx+0.5)*NAV.cs, y:(gy+dy+0.5)*NAV.cs};
  }
  return {x,y};
}
export function navLineFree(x0,y0,x1,y1){
  const d=Math.hypot(x1-x0,y1-y0), n=Math.max(2,Math.ceil(d/5));
  for(let i=0;i<=n;i++){ if(!navFreeAt(lerp(x0,x1,i/n), lerp(y0,y1,i/n))) return false; }
  return true;
}
export function navFind(x0,y0,x1,y1){
  const a=navNearestFree(x0,y0), b=navNearestFree(x1,y1);
  const g0x=Math.floor(a.x/NAV.cs), g0y=Math.floor(a.y/NAV.cs);
  const g1x=Math.floor(b.x/NAV.cs), g1y=Math.floor(b.y/NAV.cs);
  if(g0x===g1x && g0y===g1y) return [{x:b.x,y:b.y}];
  const idx=(x,y)=>y*NAV.gw+x;
  const open=[{x:g0x,y:g0y,g:0,f:0,p:null}];
  const seen=new Map(); seen.set(idx(g0x,g0y),0);
  const H=(x,y)=>{ const dx=Math.abs(x-g1x),dy=Math.abs(y-g1y); return Math.max(dx,dy)+0.41*Math.min(dx,dy); };
  let found=null, guard=0;
  while(open.length && guard++<20000){
    let bi=0; for(let i=1;i<open.length;i++) if(open[i].f<open[bi].f) bi=i;
    const cur=open.splice(bi,1)[0];
    if(cur.x===g1x&&cur.y===g1y){ found=cur; break; }
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dy) continue;
      const nx=cur.x+dx, ny=cur.y+dy;
      if(!navCellFree(nx,ny)) continue;
      if(dx&&dy&&(!navCellFree(cur.x+dx,cur.y)||!navCellFree(cur.x,cur.y+dy))) continue;
      const ng=cur.g+((dx&&dy)?1.41:1);
      const ni=idx(nx,ny);
      if(seen.has(ni)&&seen.get(ni)<=ng) continue;
      seen.set(ni,ng);
      open.push({x:nx,y:ny,g:ng,f:ng+H(nx,ny),p:cur});
    }
  }
  if(!found) return [{x:b.x,y:b.y}];
  let pts=[]; for(let n=found;n;n=n.p) pts.push({x:(n.x+0.5)*NAV.cs, y:(n.y+0.5)*NAV.cs});
  pts.reverse(); pts[0]={x:x0,y:y0}; pts[pts.length-1]={x:b.x,y:b.y};
  const sm=[]; let i=0;
  while(i<pts.length-1){
    let j=pts.length-1;
    while(j>i+1 && !navLineFree(pts[i].x,pts[i].y,pts[j].x,pts[j].y)) j--;
    sm.push(pts[j]); i=j;
  }
  return sm;
}
export function navSetTarget(c, x, y, approach){
  c.tx=x; c.ty=y;
  if(approach){
    c.path=navFind(c.x,c.y,approach.x,approach.y);
    c.finalHop=true;
  } else {
    c.path=navFind(c.x,c.y,x,y);
    c.finalHop=false;
  }
  c.navIdx=0;
}
// avanza por la ruta: frenado al llegar, separación solo mientras camina y deslizamiento junto a mesas
export function navStep(c, dt, mul){
  const speed=c.speed*(mul||1);
  let px=c.tx, py=c.ty;
  if(c.path && c.navIdx<c.path.length){
    const wp=c.path[c.navIdx];
    if(Math.hypot(wp.x-c.x,wp.y-c.y)<10){ c.navIdx++; }
    if(c.navIdx<c.path.length){ const w=c.path[c.navIdx]; px=w.x; py=w.y; }
  }
  let dx=px-c.x, dy=py-c.y; const d=Math.hypot(dx,dy);
  const brake = d<70 ? clamp(d/70,0.25,1) : 1;
  let vx=dx/(d||1)*speed*brake, vy=dy/(d||1)*speed*brake;
  // Separación y esquiva solo mientras camina: evita temblores al estar quieto en la cola
  if(d>12){
    for(const o of Game.customers){
      if(o===c) continue;
      const ox=c.x-o.x, oy=c.y-o.y, od=Math.hypot(ox,oy);
      if(od<30 && od>0.01){ const f=(30-od)/30*46; vx+=ox/od*f; vy+=oy/od*f; }
    }
    for(const t of Game.tables){
      if(t===c.exemptTable) continue;
      const ox=c.x-t.x, oy=c.y-(t.y-8), od=Math.hypot(ox,oy);
      if(od<70 && od>0.01){ const f=(70-od)/70*110; vx+=ox/od*f; vy+=oy/od*f; }
    }
  }
  const nl=Math.hypot(vx,vy); if(nl>speed){ vx=vx/nl*speed; vy=vy/nl*speed; }
  const mx=vx*dt, my=vy*dt; c.x+=mx; c.y+=my;
  const moved=Math.hypot(mx,my);
  c.stridePh=(c.stridePh||0)+moved*0.11*(c.look&&c.look.walk?c.look.walk.stride:1);
  if(Math.abs(vx)>3) c.dir=vx<0?-1:1;
  c.movingSpd=Math.hypot(vx,vy);
  const done = d<5 && !(c.path && c.navIdx<c.path.length);
  if(done){ c.movingSpd=0; c.exemptTable=null; }
  return done;
}
