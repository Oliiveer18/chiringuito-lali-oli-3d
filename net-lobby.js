/* Sala, avisos y mensajes de desconexión. Lo importa net.js. */
import { STATION_LABEL } from './config.js?v=28.17.0-online-web';
import { $, escapeHtml } from './util.js?v=28.17.0-online-web';
import { Audio } from './audio.js?v=28.17.0-online-web';
import { Game, Net, hostLive, isGuest } from './state.js?v=28.17.0-online-web';
import { hideAll, toastLocal } from './ui.js?v=28.17.0-online-web';
import { netAct, netDirty, netOpen, netSend } from './net-link.js?v=28.17.0-online-web';
export const PINGS = { ayuda:'¡Échame una mano!', mesas:'Hay mesas sucias', genero:'Se acaba el género', bien:'¡Buen trabajo!' };
export function sendPing(k){
  $('#ping-menu').classList.add('hidden');
  if(isGuest()) netAct({a:'ping',k}); else if(hostLive()) Net.events.push({e:'ping',from:'p1',k});
  toastLocal('Aviso enviado', PINGS[k], '');
}
export function showPing(from,k){ toastLocal(escapeHtml(Net.names[from]||'Tu pareja'), PINGS[k]||'', k==='bien'?'good':'bad'); Audio._raw.start(); if(navigator.vibrate) try{ navigator.vibrate(120); }catch(e){} }
export function showLobby(){
  Game.mode='lobby'; hideAll(); $('#lobby').classList.add('show'); renderLobby();
}
export function lobbyStatus(t){ const el=$('#lobby-status'); if(el){ el.textContent=t; el.classList.remove('err'); } }
export function lobbyError(t){ const el=$('#lobby-status'); if(el){ el.textContent=t; el.classList.add('err'); } }
export function myName(){ const v=($('#lobby-name').value||'').trim().slice(0,14); return v; }
export function renderLobby(){
  const step = Net.role==='host' ? 'host' : Net.role==='guest' ? 'guest' : 'choose';
  ['choose','host','guest'].forEach(k=>$('#lobby-'+k).classList.toggle('hidden', k!==step));
  $('#lobby-name').closest('.field').classList.toggle('hidden', step!=='choose');
  $('#btn-lobby-go').classList.toggle('hidden', step!=='host');
  if(step==='host'){
    $('#lobby-code').textContent = Net.code ? Net.code.match(/.{1,13}/g).join(' ') : '····';
    $('#btn-lobby-go').disabled = !Net.peer;
    if (Net.peer) {
      $('#lobby-peer').innerHTML = `<span class="dot on"></span><span><b>${escapeHtml(Net.names.p2)}</b> se ha unido a la partida</span>`;
    } else if (Net.signalingReady) {
      $('#lobby-peer').innerHTML = '<span class="dot on"></span><span>Sala cifrada lista. Copia el código privado y no cierres esta pantalla.</span>';
    } else {
      $('#lobby-peer').innerHTML = '<span class="dot"></span>Preparando código en la red…';
    }
    document.querySelectorAll('#role-pick button').forEach(b=>b.classList.toggle('on', b.dataset.role===Net.roles.p1));
    $('#role-note').textContent = `${Net.names.p1}: ${STATION_LABEL[Net.roles.p1]} · ${Net.peer?Net.names.p2:'Tu pareja'}: ${STATION_LABEL[Net.roles.p2]}`;
    lobbyStatus('');
  }
  if(step==='guest'){
    $('#guest-info').innerHTML = `Estás en la partida <b>${Net.code}</b> de <b>${escapeHtml(Net.names.p1)}</b>. Llevarás <b>${STATION_LABEL[Net.roles.p2].toLowerCase()}</b>.<br>Esperando a que empiece la temporada…`;
    lobbyStatus('');
  }
}
export function netLost(html, canSolo){
  $('#netmsg-text').innerHTML = html;
  $('#btn-net-solo').classList.toggle('hidden', !canSolo || Game.mode==='lobby');
  $('#netmsg').classList.add('show');
}
export function hideNetMsg(){ $('#netmsg').classList.remove('show'); }
