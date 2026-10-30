/* Pruebas del enlace cooperativo (ICE, mensajes de error) sin WebRTC real. */
import {
  peerRtcConfig, peerErrorMessage, hostPeerId, isTransientJoinPeerError, guestSearchStatus
} from './net-rtc.js?v=28.17.2-flat-sand';

let ok = 0, ko = 0;
const check = (name, cond, extra) => {
  if (cond) { ok++; console.log('  ok  ' + name); }
  else { ko++; console.log('  FALLO  ' + name + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

console.log('peerRtcConfig');
const cfg = peerRtcConfig();
check('iceServers presentes', Array.isArray(cfg.iceServers) && cfg.iceServers.length >= 2);
check('incluye STUN Google', cfg.iceServers.some(s => String(s.urls).includes('stun.l.google.com')));
check('incluye TURN relay', cfg.iceServers.some(s => String(s.urls).includes('openrelay.metered.ca') || String(s.urls).includes('global.relay.metered.ca')));
check('TURN con credenciales', cfg.iceServers.some(s => s.username && s.credential));
check('pool ICE > 0', cfg.iceCandidatePoolSize >= 4);

console.log('hostPeerId');
check('CHAU → id 3D aislado', hostPeerId('CHAU') === 'chiringuito-lali-oli-3d-CHAU');
check('normaliza minúsculas', hostPeerId('chau') === 'chiringuito-lali-oli-3d-CHAU');

console.log('peerErrorMessage');
check('peer-unavailable invitada', peerErrorMessage({ type: 'peer-unavailable' }, 'guest').includes('código'));
check('connection-error menciona redes', peerErrorMessage({ type: 'connection-error' }, 'guest').includes('redes'));
check('host unavailable-id', peerErrorMessage({ type: 'unavailable-id' }, 'host').includes('código'));

console.log('join helpers');
check('peer-unavailable es transitorio', isTransientJoinPeerError({ type: 'peer-unavailable' }));
check('browser-incompatible no transitorio', !isTransientJoinPeerError({ type: 'browser-incompatible' }));
check('texto buscando anfitrión', guestSearchStatus(0, 2, 5).includes('Buscando anfitrión'));

console.log('\n' + ok + ' ok, ' + ko + ' fallos');
if (ko) process.exit(1);
