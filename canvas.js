/* =========================================================
   canvas.js
   Canvas principal: viewport, redimensionado y conversión de coordenadas.
   ========================================================= */
import { H, W } from './config.js?v=28.17.2-flat-sand';
import { $ } from './util.js?v=28.17.2-flat-sand';

// ---------- Entrada ----------
export const canvas=$('#game'), ctx=canvas.getContext('2d');
export let view={s:1,ox:0,oy:0,dpr:1};
export function resize(){
  const vp=window.visualViewport;
  const width=Math.max(1,vp?vp.width:innerWidth),height=Math.max(1,vp?vp.height:innerHeight);
  const root=document.documentElement;
  root.style.setProperty('--game-width',width+'px');
  root.style.setProperty('--game-height',height+'px');
  root.style.setProperty('--game-left',(vp?vp.offsetLeft:0)+'px');
  root.style.setProperty('--game-top',(vp?vp.offsetTop:0)+'px');
  const dpr=Math.min(window.devicePixelRatio||1,2);view.dpr=dpr;
  const cw=Math.max(1,Math.round(width*dpr)),ch=Math.max(1,Math.round(height*dpr));
  if(canvas.width!==cw)canvas.width=cw;
  if(canvas.height!==ch)canvas.height=ch;
  const hud=document.getElementById('hud'),stock=document.getElementById('stockbar');
  const top=hud&&hud.getClientRects().length?hud.getBoundingClientRect().height+4:0;
  const bottom=stock&&stock.getClientRects().length?stock.getBoundingClientRect().height+4:0;
  root.style.setProperty('--top-ui',top+'px');
  root.style.setProperty('--bottom-ui',bottom+'px');
  const styles=getComputedStyle(root);
  const left=parseFloat(styles.getPropertyValue('--game-safe-left'))||0;
  const right=parseFloat(styles.getPropertyValue('--game-safe-right'))||0;
  const availableW=Math.max(1,width-left-right);
  view.dpr=dpr;
  if(width>=height){
    /* Horizontal: el juego llena el ancho y solo se recorta cielo/arena.
       Banda jugable protegida: por encima del rótulo del chiringuito (y≈186)
       hasta el suelo (y=720) => 530 unidades. El HUD flotante no debe tapar
       el rótulo: s <= (alto - HUD)/530. Y nunca se recortan más de 140
       unidades de cielo: s <= alto/580. */
    const fitW=availableW/W;
    const sCss=Math.min(fitW,height/580,(height-top)/530);
    view.s=sCss*dpr;
    const worldH=H*sCss;
    /* Si el mundo no cabe en vertical: fondo anclado abajo (solo se pierde
       cielo). Si sobra pantalla: centrado (se extiende cielo y arena). */
    view.oy=worldH>=height?(height-worldH)*dpr:(height-worldH)/2*dpr;
  }else{
    /* Vertical: encajar por ancho; reservar HUD/stockbar para no tapar el borde jugable. */
    const insetTop=top+6, insetBottom=bottom+10;
    const playH=Math.max(1,height-insetTop-insetBottom);
    const sCss=availableW/W;
    view.s=sCss*dpr;
    const worldH=H*sCss;
    view.oy=(insetTop+Math.max(0,(playH-worldH)/2))*dpr;
  }
  view.ox=(availableW-W*(view.s/dpr))/2*dpr;
  document.body.classList.toggle('portrait',width<height);
}
export let viewportResizeFrame=0;
export function scheduleViewportResize(){
  cancelAnimationFrame(viewportResizeFrame);
  viewportResizeFrame=requestAnimationFrame(resize);
}
addEventListener('resize',scheduleViewportResize);
addEventListener('orientationchange',()=>{
  scheduleViewportResize();setTimeout(scheduleViewportResize,250);setTimeout(scheduleViewportResize,600);
});
if(window.visualViewport){
  window.visualViewport.addEventListener('resize',scheduleViewportResize);
  window.visualViewport.addEventListener('scroll',scheduleViewportResize);
}
if(window.ResizeObserver){
  const viewportObserver=new ResizeObserver(scheduleViewportResize);
  for(const id of ['hud','stockbar']){const el=document.getElementById(id);if(el)viewportObserver.observe(el);}
}
resize();
export function toWorld(cx,cy){
  const rect=canvas.getBoundingClientRect();
  return {x:((cx-rect.left)*canvas.width/rect.width-view.ox)/view.s,
          y:((cy-rect.top)*canvas.height/rect.height-view.oy)/view.s};
}
