import {floorCommand} from './floor-service.js?v=28.17.2-flat-sand';
import { normalizeRoomCode, validRoomCode, ROOM_LENGTH } from './relay-crypto.mjs';
/* =========================================================
   net.js
   Red: mensajes cifrados sobre WSS público de pruebas, sala compartida,
   sincronización anfitrión→invitado y acciones pendientes del invitado.
   ========================================================= */
import { STATION_LABEL, who } from './config.js?v=28.17.2-flat-sand';
import { $, clamp, escapeHtml } from './util.js?v=28.17.2-flat-sand';
import { Audio } from './audio.js?v=28.17.2-flat-sand';
import { Game, NET_SIM, Net, guestCust, hostLive, isGuest } from './state.js?v=28.17.2-flat-sand';
import { TABLE_POS } from './world.js?v=28.17.2-flat-sand';
import { cleanFx, cleanTable, hud, newSeason, pendingIdx, servable, slotOf, tryServe } from './sim.js?v=28.17.2-flat-sand';
import { applyRevResp, refreshReportUI, revSigOf, showReportUI } from './report.js?v=28.17.2-flat-sand';
import { Plan, applyPlanAction, applyUrgent, hideAll, refreshPlanMoney, renderForecast, renderTab, renderUrgent, setSpeed, showFinalUI, showPlan, showPlanUI, showServiceUI, toastLocal, toggleReady, updateHud, updateReadyUI, updateStockbar } from './ui.js?v=28.17.2-flat-sand';

import {
  REJECT_MSG, pendHas, guestServe, guestClean, guestPendTick,
} from './net-guest.js?v=28.17.2-flat-sand';
import {
  netOpen, netSimDelay, netSend, netAct, netDirty, leaveCoop, goSolo,
} from './net-link.js?v=28.17.2-flat-sand';
import {
  onNet, applyAct, pushAck, snapshot, netTick, applyState, guestTick,
} from './net-sync.js?v=28.17.2-flat-sand';
import {
  PINGS, sendPing, showPing, showLobby, lobbyStatus, lobbyError, myName, renderLobby, netLost, hideNetMsg,
} from './net-lobby.js?v=28.17.2-flat-sand';
export {
  REJECT_MSG, pendHas, guestServe, guestClean, guestPendTick,
  netOpen, netSimDelay, netSend, netAct, netDirty, leaveCoop, goSolo,
  onNet, applyAct, pushAck, snapshot, netTick, applyState, guestTick,
  PINGS, sendPing, showPing, showLobby, lobbyStatus, lobbyError, myName, renderLobby, netLost, hideNetMsg,
};
$('#btn-ping').addEventListener('click',e=>{ e.stopPropagation(); $('#ping-menu').classList.toggle('hidden'); });
document.querySelectorAll('#ping-menu button').forEach(b=>b.addEventListener('click',()=>sendPing(b.dataset.ping)));
$('#btn-coop').addEventListener('click',()=>{ Audio.init(); Audio.click(); showLobby(); setTimeout(()=>$('#lobby-name').focus(),50); });
$('#btn-create').addEventListener('click',()=>{ Audio.click(); Net.names.p1 = myName()||'Jugador 1'; netOpen(()=>netSend({t:'create'})); });
$('#btn-join').addEventListener('click',()=>{ Audio.click(); const code=normalizeRoomCode($('#lobby-join-code').value);
  if(!validRoomCode(code)){ lobbyError('Pega el código privado completo de 26 caracteres.'); return; }
  Net.names.p2 = myName()||'Jugador 2'; netOpen(()=>netSend({t:'join', code})); });
$('#lobby-join-code').addEventListener('keydown',e=>{ if(e.key==='Enter') $('#btn-join').click(); });
$('#lobby-join-code').maxLength=ROOM_LENGTH+6;
$('#lobby-join-code').addEventListener('input',e=>{ e.target.value=normalizeRoomCode(e.target.value).slice(0,ROOM_LENGTH); });
$('#btn-copy-room').addEventListener('click',async()=>{
  if(!Net.code)return;
  try { await navigator.clipboard.writeText(Net.code); lobbyStatus('Código copiado. Compártelo solo con tu pareja.'); }
  catch { const selection=window.getSelection(),range=document.createRange();range.selectNodeContents($('#lobby-code'));selection.removeAllRanges();selection.addRange(range);lobbyStatus('Código seleccionado. Mantén pulsado o usa Ctrl+C para copiar.'); }
});
document.querySelectorAll('#role-pick button').forEach(b=>b.addEventListener('click',()=>{ Audio.click(); Net.roles.p1=b.dataset.role; Net.roles.p2 = b.dataset.role==='barra'?'cocina':'barra'; renderLobby(); netDirty(); }));
$('#btn-lobby-go').addEventListener('click',()=>{ if(!Net.peer) return; Audio.good(); newSeason(); Plan.tab='compras'; showPlan(); });
$('#btn-lobby-back').addEventListener('click',()=>{ Audio.click(); leaveCoop(); });
$('#btn-net-home').addEventListener('click',()=>{ hideNetMsg(); location.reload(); });
$('#btn-net-solo').addEventListener('click',()=>{ hideNetMsg(); goSolo(); });
$('#btn-net-wait').addEventListener('click',()=>{ hideNetMsg(); });

document.addEventListener('floor-send',e=>{if(Net.role==='guest')netAct({a:'floor',command:e.detail});});
