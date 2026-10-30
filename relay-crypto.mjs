/* Public broker: only hashes and authenticated ciphertext leave the browser.
   26 random base32 symbols provide 130 bits; do not replace with short codes. */
export const ROOM_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const ROOM_LENGTH = 26;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const MAX_PLAIN = 524288;
export function newRoomCode() {
  return [...crypto.getRandomValues(new Uint8Array(ROOM_LENGTH))]
    .map(n => ROOM_ALPHABET[n & 31]).join('');
}
export function normalizeRoomCode(code) {
  return String(code || '').toUpperCase().replace(/[\s-]/g, '');
}
export function validRoomCode(code) { return /^[A-Z2-7]{26}$/.test(code); }
export async function roomCrypto(id) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(id)));
  const key = await crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
  // Domain-separated topic digest: it never reveals the encryption key.
  const topicHash = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode('topic:' + id)));
  return { key, root: 'lalioli3d/v1/' + [...topicHash].map(n => n.toString(16).padStart(2, '0')).join('') };
}
async function streamBytes(bytes, Stream) {
  const reader = new Blob([bytes]).stream().pipeThrough(new Stream('gzip')).getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > MAX_PLAIN) { await reader.cancel(); throw new Error('Relay message too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const out = new Uint8Array(size); let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}
export async function encryptWire(room, topic, json, compress = true) {
  let bytes = encoder.encode(json), flag = 0;
  if (bytes.length > MAX_PLAIN) throw new Error('Relay message too large');
  if (compress && bytes.length > 768 && typeof CompressionStream !== 'undefined') {
    const compressed = await streamBytes(bytes, CompressionStream);
    if (compressed.length < bytes.length) { bytes = compressed; flag = 1; }
  }
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const plain = new Uint8Array(bytes.length + 1); plain[0] = flag; plain.set(bytes, 1);
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: encoder.encode(topic) }, room.key, plain
  ));
  const out = new Uint8Array(13 + cipher.length); out[0] = 1; out.set(nonce, 1); out.set(cipher, 13);
  return out;
}
export async function decryptWire(room, topic, bytes) {
  if (bytes.length < 30 || bytes.length > 250000 || bytes[0] !== 1) throw new Error('Invalid relay wire');
  let plain = new Uint8Array(await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(1, 13), additionalData: encoder.encode(topic) }, room.key, bytes.slice(13)
  ));
  if (plain[0] > 1) throw new Error('Unsupported relay encoding');
  if (plain[0] === 1) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Gzip not supported');
    plain = await streamBytes(plain.slice(1), DecompressionStream);
  } else plain = plain.slice(1);
  if (plain.length > MAX_PLAIN) throw new Error('Relay message too large');
  return JSON.parse(decoder.decode(plain));
}
