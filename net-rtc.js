/* Configuración WebRTC / ICE y mensajes de error del cooperativo (sin PeerJS). */
const OPEN_RELAY = { username: 'openrelayproject', credential: 'openrelayproject' };
const ICE_SERVERS = [
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:global.stun.twilio.com:3478',
      'stun:stun.cloudflare.com:3478'
    ]
  },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443?transport=tcp',
      'turn:global.relay.metered.ca:80',
      'turn:global.relay.metered.ca:443',
      'turn:global.relay.metered.ca:443?transport=tcp',
      'turns:global.relay.metered.ca:443',
      'turns:global.relay.metered.ca:443?transport=tcp'
    ],
    ...OPEN_RELAY
  }
];

export function peerRtcConfig(turnConfig){
  const t = turnConfig ?? (typeof globalThis !== 'undefined' && globalThis.window && globalThis.window.TURN_CONFIG);
  const ice = ICE_SERVERS.map(s => ({ ...s, urls: Array.isArray(s.urls) ? s.urls.slice() : s.urls }));
  if (t && t.urls) ice.push({ urls: t.urls, username: t.username, credential: t.credential });
  return { iceServers: ice, iceCandidatePoolSize: 10 };
}

export const LOBBY_PREFIX = 'chiringuito-lali-oli-3d-';

export function hostPeerId(code){
  return LOBBY_PREFIX + String(code || '').toUpperCase();
}

/** Errores PeerJS que el enlace reintenta solo; no mostrar fallo definitivo en la sala. */
export function isTransientJoinPeerError(e){
  const t = e && (e.type || e.message);
  return t === 'peer-unavailable' || t === 'network' || t === 'server-error';
}

export function guestSearchStatus(cloudTry, cloudsTotal, attemptSec){
  const srv = cloudsTotal > 1 ? ` (servidor ${cloudTry + 1}/${cloudsTotal})` : '';
  const wait = attemptSec > 0 ? ` · ${attemptSec}s` : '';
  return `Buscando anfitrión…${srv}${wait} Comprueba el código o espera a que pulse «Crear partida».`;
}

export function peerErrorMessage(e, role = 'guest'){
  const t = (e && (e.type || e.message)) || 'error';
  if (t === 'peer-unavailable') {
    return role === 'guest'
      ? 'No hay ninguna partida con ese código todavía. Copia el código completo o pide al anfitrión que pulse «Crear partida» de nuevo.'
      : 'Tu pareja no ha podido localizar la sala. Dile el código otra vez.';
  }
  if (t === 'unavailable-id') return 'Ese código ya está en uso. Pulsa «Crear partida» otra vez.';
  if (t === 'network' || t === 'socket-error' || t === 'socket-closed' || t === 'server-error') {
    return 'Problema de red o del servidor de señalización. Comprueba la conexión a internet e inténtalo en unos segundos.';
  }
  if (t === 'browser-incompatible') return 'Tu navegador no admite la conexión cooperativa. Prueba Chrome o Safari actualizados.';
  if (t === 'connection-error' || t === 'negotiation-failed') {
    return 'No se pudo abrir el enlace web entre redes distintas. Comprueba internet y vuelve a unirte con el código completo.';
  }
  return role === 'guest'
    ? 'No se pudo unir a la partida (' + t + '). Revisa el código e inténtalo otra vez.'
    : 'No se pudo crear la sala (' + t + '). Inténtalo de nuevo.';
}
