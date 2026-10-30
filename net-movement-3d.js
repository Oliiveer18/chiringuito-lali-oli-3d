import { Game, Net } from './state.js?v=28.17.2-flat-sand';
import { netAct } from './net-link.js?v=28.17.2-flat-sand';
import { playerPoses3D, acceptGuestMovement3D } from './movement-3d-model.mjs';
let blocked=()=>false;
const guestBudget={};
let outgoing={serviceId:null,seq:0,sentAt:-Infinity,last:null,latest:null,correction:0};
export function setMovementCollision3D(checker){blocked=checker;}
function outgoingSession(){
  const id=Game.floor?.id;
  if(outgoing.serviceId!==id){
    outgoing={serviceId:id,seq:0,sentAt:-Infinity,last:null,latest:null,correction:0};
  }
  return outgoing;
}
export function acceptGuestPose3D(packet){
  if(Net.role!=='host')return false;
  return acceptGuestMovement3D(Game,packet,guestBudget,performance.now(),blocked);
}
export function publishLocalPose3D(position,heading){
  if(Game.mode!=='service'||!Game.floor?.id)return;
  const pose={x:Math.round(position.x*1000)/1000,z:Math.round(position.z*1000)/1000,heading:Math.round(heading*1000)/1000};
  if(Net.role!=='guest'){
    Object.assign(playerPoses3D(Game)[Net.me||'p1'],pose);
    return;
  }
  const state=outgoingSession();state.latest=pose;
  const changed=!state.last||Math.hypot(pose.x-state.last.x,pose.z-state.last.z)>.01||Math.abs(pose.heading-state.last.heading)>.02;
  if(changed&&performance.now()-state.sentAt>=50)flushLocalPose3D();
}
export function flushLocalPose3D(){
  if(Net.role!=='guest'||!Net.peer||Game.mode!=='service'||Game.speed===0)return;
  const state=outgoingSession();if(!state.latest)return;
  state.seq=Math.max(state.seq,playerPoses3D(Game).p2.seq)+1;
  state.sentAt=performance.now();state.last={...state.latest};
  netAct({a:'move3d',serviceId:state.serviceId,seq:state.seq,pose:state.latest});
}
export function consumeLocalCorrection3D(){
  if(Net.role!=='guest'||Game.mode!=='service')return null;
  const state=outgoingSession(),pose=playerPoses3D(Game).p2;
  if(pose.correctionSeq<=state.correction)return null;
  state.correction=pose.correctionSeq;
  return pose;
}
