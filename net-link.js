/* Sala privada y enlace web cifrado. Lo importa net.js. */
import { newRoomCode } from './relay-crypto.mjs';
import { $ } from './util.js?v=28.17.2-flat-sand';
import { Audio } from './audio.js?v=28.17.2-flat-sand';
import { Game, NET_SIM, Net } from './state.js?v=28.17.2-flat-sand';
import { pendingIdx, slotOf } from './sim.js?v=28.17.2-flat-sand';
import { showReportUI } from './report.js?v=28.17.2-flat-sand';
import { hideAll, setSpeed, showPlanUI, showServiceUI } from './ui.js?v=28.17.2-flat-sand';
import { onNet } from './net-sync.js?v=28.17.2-flat-sand';
import { lobbyError, lobbyStatus, renderLobby } from './net-lobby.js?v=28.17.2-flat-sand';
import {
  peerRtcConfig, peerErrorMessage, hostPeerId, isTransientJoinPeerError, guestSearchStatus
} from './net-rtc.js?v=28.17.2-flat-sand';
export { peerRtcConfig, peerErrorMessage, hostPeerId };

// ---------- Red: WSS cifrado (sin TURN, cuentas ni NAT directo) ----------
let peer = null, conn = null, joinGen = 0, searchTimer = null;
const boundConnections = new WeakSet();
const newCode = newRoomCode;

const PEERJS_CLOUDS = [
  { brokerURL: 'wss://broker.emqx.io:8084/mqtt' }
];
const CLOUD_KEY = 'lali-oli.3d.peerjs-cloud';
let cloudIdx = 0;
try {
  const saved = parseInt(sessionStorage.getItem(CLOUD_KEY), 10);
  if (saved >= 0 && saved < PEERJS_CLOUDS.length) cloudIdx = saved;
} catch (e) {}

function saveCloudIdx(){
  try { sessionStorage.setItem(CLOUD_KEY, String(cloudIdx)); } catch (e) {}
}

function peerOptions(){
  const cloud = PEERJS_CLOUDS[cloudIdx] || PEERJS_CLOUDS[0];
  const opts = {
    debug: 0,
    ...cloud,
    roomId: Net.role === 'guest' && Net.code ? hostPeerId(Net.code) : undefined
  };
  const custom = window.COOP_RELAY_CONFIG;
  if (custom && typeof custom === 'object') Object.assign(opts, custom);
  return opts;
}

function connectOptions(extra = {}){
  return {
    reliable: true,
    ...extra
  };
}

function clearGuestSearch(){
  if (searchTimer) { clearInterval(searchTimer); searchTimer = null; }
}

function startGuestSearch(cloudTry){
  clearGuestSearch();
  const started = Date.now();
  const tick = () => {
    const sec = Math.floor((Date.now() - started) / 1000);
    lobbyStatus(guestSearchStatus(cloudTry, PEERJS_CLOUDS.length, sec));
  };
  tick();
  searchTimer = setInterval(tick, 2000);
}

function attachConn(c, { onOpen, onFail }){
  // The recovery wrapper reuses its Link when the underlying channel reconnects.
  // Reattaching would process every message twice after each recovery.
  if(boundConnections.has(c))return;
  boundConnections.add(c);
  let opened = false;
  c.on('open', () => {
    conn = c;
    opened = true;
    clearGuestSearch();
    onOpen && onOpen();
  });
  c.on('data', d => { try { onNet(typeof d === 'string' ? JSON.parse(d) : d); } catch (e) {} });
  c.on('close', () => {
    if(conn!==c)return;
    conn = null;
    Net.peer = false;
    onNet({ t: 'peer', on: false });
  });
  c.on('failed', () => {
    if (!opened) onFail && onFail();
  });
}

function makePeer(id, handlers){
  if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
  // The host id remains private; only a domain-separated digest reaches MQTT.
  peer = id ? new Peer(id, peerOptions()) : new Peer(peerOptions());
  if (handlers.open) peer.on('open', handlers.open);
  if (handlers.connection) peer.on('connection', handlers.connection);
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
  peer.on('error', e => {
    if (handlers.error) handlers.error(e);
    else lobbyError(peerErrorMessage(e, Net.role === 'host' ? 'host' : 'guest'));
  });
}

export function netOpen(onOpen){
  if (peer && !peer.destroyed) { onOpen(); return; }
  if (!window.Peer) { lobbyError('No se ha podido cargar el módulo de conexión. Recarga la página.'); return; }
  lobbyStatus('Conectando al enlace web cifrado…');
  makePeer(null, {
    open: () => { saveCloudIdx(); lobbyStatus(''); onOpen(); },
    error: e => {
      if (cloudIdx + 1 < PEERJS_CLOUDS.length && (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error')) {
        cloudIdx++;
        saveCloudIdx();
        lobbyStatus('Reintentando con otro servidor…');
        makePeer(null, {
          open: () => { saveCloudIdx(); lobbyStatus(''); onOpen(); },
          error: e2 => lobbyError(peerErrorMessage(e2, 'guest'))
        });
        return;
      }
      lobbyError(peerErrorMessage(e, 'guest'));
    }
  });
}

function hostStart(attempt = 0){
  const code = newCode();
  Net.role = 'host'; Net.me = 'p1'; Net.code = code; Net.signalingReady = false;
  lobbyStatus('Creando sala…');
  const peerId = hostPeerId(code);
  makePeer(peerId, {
    open: () => {
      Net.signalingReady = true;
      saveCloudIdx();
      renderLobby();
      lobbyStatus('');
    },
    connection: c => {
      conn = c;
      attachConn(c, {
        onOpen: () => { Net.peer = true; onNet({ t: 'peer', on: true }); },
        onFail: () => {}
      });
    },
    error: e => {
      if (e && e.type === 'unavailable-id' && attempt < 6) {
        lobbyStatus('Código ocupado, generando otro…');
        hostStart(attempt + 1);
        return;
      }
      Net.signalingReady = false;
      lobbyError(peerErrorMessage(e, 'host'));
    }
  });
}

function guestJoin(code, cloudTry = 0){
  Net.role = 'guest'; Net.me = 'p2'; Net.code = code;
  cloudIdx = cloudTry;
  const gen = ++joinGen;
  clearGuestSearch();
  lobbyStatus('Preparando conexión…');
  const targetId = hostPeerId(code);
  makePeer(null, {
    open: () => {
      if (gen !== joinGen) return;
      saveCloudIdx();
      startGuestSearch(cloudTry);
      conn = peer.connect(targetId, connectOptions());
      attachConn(conn, {
        onOpen: () => {
          if (gen !== joinGen) return;
          Net.peer = true;
          renderLobby();
          lobbyStatus('');
          netSend({ t: 'hello', name: Net.names.p2 });
          onNet({ t: 'peer', on: true });
        },
        onFail: () => {
          if (gen !== joinGen) return;
          clearGuestSearch();
          if (cloudTry + 1 < PEERJS_CLOUDS.length) {
            lobbyStatus('No encontrado en este servidor, probando otro…');
            guestJoin(code, cloudTry + 1);
            return;
          }
          lobbyError(peerErrorMessage({ type: 'peer-unavailable' }, 'guest'));
        }
      });
    },
    error: e => {
      if (gen !== joinGen) return;
      if (isTransientJoinPeerError(e)) {
        startGuestSearch(cloudTry);
        return;
      }
      if (cloudIdx + 1 < PEERJS_CLOUDS.length && (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error')) {
        cloudIdx++;
        saveCloudIdx();
        lobbyStatus('Reintentando servidor…');
        guestJoin(code, cloudIdx);
        return;
      }
      clearGuestSearch();
      lobbyError(peerErrorMessage(e, 'guest'));
    }
  });
}

export function netSimDelay(dir){
  if (!NET_SIM.on) return 0;
  const base = dir === 'up' ? NET_SIM.up : NET_SIM.down;
  const jit = NET_SIM.jitter ? (Math.random() * 2 - 1) * NET_SIM.jitter : 0;
  const now = performance.now();
  const lastAt = dir === 'up' ? NET_SIM._upAt : NET_SIM._dnAt;
  const at = Math.max(now + Math.max(0, base + jit), lastAt + 1);
  if (dir === 'up') NET_SIM._upAt = at; else NET_SIM._dnAt = at;
  return at - now;
}
export function netSend(o){
  if (o.t === 'create') { hostStart(); return; }
  if (o.t === 'join') { guestJoin(o.code); return; }
  const fire = () => { if (conn && conn.open) conn.send(o); };
  const d = netSimDelay('up');
  if (d > 0) setTimeout(fire, d); else fire();
}
export function netAct(o){ netSend({ t: 'act', ...o }); }
export function netDirty(){ Net.sendT = 1e9; Net.revDirty = true; }

export function leaveCoop(){
  joinGen++;
  clearGuestSearch();
  Net.signalingReady = false;
  if (conn) { try { conn.close(); } catch (e) {} conn = null; }
  if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
  Net.role = 'solo'; Net.me = 'p1'; Net.code = null; Net.peer = false; Net.lastMode = null;
  hideAll(); Game.mode = 'title'; $('#title').classList.add('show');
}
export function goSolo(){
  joinGen++;
  clearGuestSearch();
  if (conn) { try { conn.close(); } catch (e) {} conn = null; }
  if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
  Net.role = 'solo'; Net.me = 'p1'; Net.peer = false;
  if (Game.mode === 'service') {
    Game.slots = Game.slots.filter(s => s.who !== 'p2');
    const p1 = slotOf('p1'); if (p1) p1.station = 'all';
    Game.slots.forEach(s => { if (s.cust && s.who === 'p2') s.cust = null; });
    for (const c of Game.customers) if (c.state === 'prep' && !c.inPrep && pendingIdx(c).length) {}
    setSpeed(1); showServiceUI();
  } else if (Game.mode === 'plan') showPlanUI();
  else if (Game.mode === 'report') showReportUI();
  else if (Game.mode === 'lobby') { hideAll(); Game.mode = 'title'; $('#title').classList.add('show'); }
}
