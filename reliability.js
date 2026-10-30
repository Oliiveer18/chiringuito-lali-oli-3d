import { Game, Net } from './state.js?v=28.17.0-online-web';
import { setSpeed, toastLocal } from './ui.js?v=28.17.0-online-web';
import { BrokerPeer } from './broker-peer.js';
const Base=BrokerPeer;
let sessionToken;try{sessionToken=sessionStorage.getItem('lali-oli.3d.peer-token');if(!sessionToken){sessionToken=crypto.randomUUID();sessionStorage.setItem('lali-oli.3d.peer-token',sessionToken);}}catch(e){sessionToken=String(Date.now())+Math.random();}
function notice(text){const el=document.querySelector('#lobby-status');if(el)el.textContent=text;}
const LINK_WINDOW_MS=45000;
function lost(){if(Game.mode==='service'&&Game.speed){Net.pausedByDrop=true;setSpeed(0);}Net.peer=false;notice('Conexión interrumpida. Reconectando durante 45 segundos…');}
class Link {
 constructor(owner,target,options,inbound=false){this.owner=owner;this.target=target;this.options=options;this.inbound=inbound;this.open=false;this.done=false;this.handlers={};this.start=0;this.last=0;this.generation=0;this.attemptMs=inbound?15000:28000;owner.links.add(this);}
 on(name,fn){(this.handlers[name]??=[]).push(fn);return this;}
 emit(name,...args){for(const fn of this.handlers[name]||[])fn(...args);}
 bind(raw){if(this.done){raw.close();return;}clearTimeout(this.retry);clearTimeout(this.expiry);clearTimeout(this.attempt);clearInterval(this.heartbeat);const gen=++this.generation;this.raw=raw;
 const fail=()=>{if(gen!==this.generation||this.done)return;clearTimeout(this.attempt);clearInterval(this.heartbeat);const wasOpen=this.open;this.generation++;this.open=false;try{raw.close();}catch(e){}if(wasOpen)lost();if(!this.start)this.start=Date.now();const left=LINK_WINDOW_MS-(Date.now()-this.start);if(left<=0)return this.finish();this.expiry=setTimeout(()=>this.finish(),left);if(!this.inbound)this.retry=setTimeout(()=>this.dial(),1500);};
 raw.on('open',()=>{if(gen!==this.generation||this.done)return;clearTimeout(this.attempt);clearTimeout(this.expiry);this.open=true;this.start=0;this.last=Date.now();this.emit('open');this.heartbeat=setInterval(()=>{if(Date.now()-this.last>12000)return fail();try{raw.send({__laliNet:'ping'});}catch(e){fail();}},3000);});
 raw.on('data',data=>{if(gen!==this.generation||this.done)return;this.last=Date.now();if(data&&data.__laliNet){if(data.__laliNet==='ping')try{raw.send({__laliNet:'pong'});}catch(e){}return;}this.emit('data',data);});
 raw.on('close',fail);raw.on('error',err=>{this.emit('error',err);fail();});this.attempt=setTimeout(fail,this.start?Math.max(1,Math.min(this.attemptMs,LINK_WINDOW_MS-(Date.now()-this.start))):this.attemptMs);
 }
 dial(){if(this.done||this.owner.destroyed)return this.finish();try{this.bind(Base.prototype.connect.call(this.owner,this.target,this.options));}catch(e){if(!this.start)this.start=Date.now();if(Date.now()-this.start>=LINK_WINDOW_MS)this.finish();else this.retry=setTimeout(()=>this.dial(),1500);}}
 send(data){if(this.open&&!this.done)this.raw.send(data);}
 finish(){if(this.done)return;this.done=true;const wasOpen=this.open;this.open=false;clearTimeout(this.retry);clearTimeout(this.expiry);clearTimeout(this.attempt);clearInterval(this.heartbeat);this.owner.links.delete(this);try{this.raw?.close();}catch(e){}if(!wasOpen&&!this.inbound)this.emit('failed');this.emit('close');}
 close(){this.finish();}
}
if(Base){window.Peer=class ReliablePeer extends Base {
 constructor(...args){super(...args);this.links=new Set();this.slot=null;this.partnerToken=null;this.sessionToken=sessionToken;this.signalSince=0;
 this.on('disconnected',()=>{if(!this.signalSince)this.signalSince=Date.now();this.repair();});this.on('open',()=>{this.signalSince=0;clearTimeout(this.signalTimer);});
 this.resume=()=>{if(this.disconnected)this.repair();};window.addEventListener('online',this.resume);document.addEventListener('visibilitychange',this.resume);
 }
 repair(){if(this.destroyed||!this.disconnected)return;if(Date.now()-this.signalSince>LINK_WINDOW_MS){notice('No se pudo recuperar la señal. Si la partida no responde, vuelve a entrar con el código.');return;}try{this.reconnect();}catch(e){}clearTimeout(this.signalTimer);this.signalTimer=setTimeout(()=>this.repair(),2000);}
 connect(target,options={}){const opts={...options,metadata:{...options.metadata,laliToken:this.sessionToken}};const link=new Link(this,target,opts);link.dial();return link;}
 emit(name,...args){if(name!=='connection')return super.emit(name,...args);const raw=args[0],token=raw.metadata?.laliToken;
 const tokenClash=token&&this.partnerToken&&this.partnerToken!==token;
 const busy=this.slot&&!this.slot.done&&(this.slot.open||this.slot.raw?.open||(this.slot.raw&&!this.slot.open&&this.slot.start===0));
 if(tokenClash||busy){try{raw.close();}catch(e){}return true;}
 if(token)this.partnerToken=token;
 if(this.slot&&!this.slot.done){this.slot.bind(raw);return super.emit('connection',this.slot);}
 this.slot=new Link(this,raw.peer,{},true);this.slot.bind(raw);return super.emit('connection',this.slot);
 }
 destroy(){clearTimeout(this.signalTimer);window.removeEventListener('online',this.resume);document.removeEventListener('visibilitychange',this.resume);for(const link of this.links||[])link.close();return super.destroy();}
};}
const badge=document.getElementById('version-badge');if(badge)badge.textContent='v8 · guardado y reconexión';
