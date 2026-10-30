/* Small MQTT 3.1.1 codec. No credentials, analytics or third-party script. */
const utf8 = new TextEncoder();
export const MAX_PACKET = 262144;
export function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
export function field(value) {
  const bytes = typeof value === 'string' ? utf8.encode(value) : value;
  if (bytes.length > 65535) throw new Error('MQTT field too large');
  return concat(Uint8Array.of(bytes.length >> 8, bytes.length & 255), bytes);
}
export function packet(header, body = new Uint8Array()) {
  if (body.length > MAX_PACKET) throw new Error('MQTT packet too large');
  const length = []; let n = body.length;
  do { let d = n % 128; n = Math.floor(n / 128); if (n) d |= 128; length.push(d); } while (n);
  return concat(Uint8Array.of(header, ...length), body);
}
export function readPackets(bytes) {
  const packets = []; let start = 0;
  while (start < bytes.length) {
    let at = start + 1, length = 0, multiplier = 1, complete = false;
    for (let i = 0; i < 4; i++) {
      if (at >= bytes.length) return { packets, rest: bytes.slice(start) };
      const d = bytes[at++]; length += (d & 127) * multiplier;
      if (!(d & 128)) { complete = true; break; }
      multiplier *= 128;
    }
    if (!complete || length > MAX_PACKET) throw new Error('Invalid MQTT length');
    if (at + length > bytes.length) break;
    packets.push({ header: bytes[start], body: bytes.slice(at, at + length) });
    start = at + length;
  }
  return { packets, rest: bytes.slice(start) };
}
