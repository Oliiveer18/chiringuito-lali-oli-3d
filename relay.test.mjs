import assert from 'node:assert/strict';
import { concat, field, packet, readPackets } from './relay-codec.mjs';
import { newRoomCode, validRoomCode, normalizeRoomCode, roomCrypto, encryptWire, decryptWire } from './relay-crypto.mjs';
import { BrokerPeer } from './broker-peer.js';
let count = 0;
const check = async (name, fn) => { await fn(); count++; console.log('  ok  ' + name); };
await check('room codes are cryptographically random, private and pasteable', () => {
  const codes = new Set(Array.from({ length: 1000 }, newRoomCode));
  assert.equal(codes.size, 1000); assert.ok([...codes].every(validRoomCode));
  assert.equal(validRoomCode('ABCD'), false);
  assert.equal(normalizeRoomCode('abcd-efgh ijkl'), 'ABCDEFGHIJKL');
});
await check('MQTT parser handles partial, coalesced and variable-length packets', () => {
  for (const size of [0, 1, 127, 128, 16383, 16384, 200000]) {
    const original = new Uint8Array(size).fill(72), wire = packet(0x30, original);
    const partial = readPackets(wire.slice(0, wire.length - 1));
    assert.equal(partial.packets.length, 0);
    const result = readPackets(concat(partial.rest, wire.slice(wire.length - 1), packet(0xd0)));
    assert.equal(result.packets.length, 2); assert.deepEqual(result.packets[0].body, original);
    assert.equal(result.rest.length, 0);
  }
  assert.deepEqual([...field('é')], [0, 2, 195, 169]);
  assert.throws(() => readPackets(Uint8Array.of(0x30, 255, 255, 255, 255, 1)));
  assert.throws(() => packet(0x30, new Uint8Array(300000)));
});
await check('room topic does not expose code or AES key', async () => {
  const id = newRoomCode(), room = await roomCrypto(id);
  assert.equal(room.root.includes(id), false);
  assert.equal(room.key.extractable, false);
  assert.notEqual(room.root, (await roomCrypto(newRoomCode())).root);
});
await check('AES-GCM hides plaintext and authenticates destination, key and ciphertext', async () => {
  const room = await roomCrypto(newRoomCode()), topic = room.root + '/h';
  const json = JSON.stringify({ name: 'Nombre QA privado', stock: 123 });
  const wire = await encryptWire(room, topic, json);
  assert.equal(new TextDecoder().decode(wire).includes('Nombre QA'), false);
  assert.deepEqual(await decryptWire(room, topic, wire), JSON.parse(json));
  await assert.rejects(decryptWire(room, topic + 'wrong', wire));
  await assert.rejects(decryptWire(await roomCrypto(newRoomCode()), topic, wire));
  const tampered = wire.slice(); tampered[tampered.length - 2] ^= 1;
  await assert.rejects(decryptWire(room, topic, tampered));
  assert.notDeepEqual(wire, await encryptWire(room, topic, json));
});
await check('compressed snapshots round-trip and reject oversized plaintext', async () => {
  const room = await roomCrypto(newRoomCode()), topic = room.root + '/g/test';
  const object = { stock: Array(1000).fill({ id: 'papas', owner: 'p2', qty: 3 }) };
  const wire = await encryptWire(room, topic, JSON.stringify(object));
  assert.ok(wire.length < 2000);
  assert.deepEqual(await decryptWire(room, topic, wire), object);
  await assert.rejects(encryptWire(room, topic, 'a'.repeat(600000)));
  const uncompressed = await encryptWire(room, topic, JSON.stringify(object), false);
  assert.deepEqual(await decryptWire(room, topic, uncompressed), object);
});
await check('receiver ignores retained, replayed, altered and unrelated-room messages', async () => {
  const room = await roomCrypto(newRoomCode()), topic = room.root + '/h', received = [];
  const peer = Object.assign(Object.create(BrokerPeer.prototype), {
    destroyed: false, generation: 1, roomId: 'test', room: async () => room,
    rx: Promise.resolve(), rxPending: 0, bytesReceived: 0, seen: new Map(),
    receiveMessage: (_, __, msg) => received.push(msg)
  });
  const payload = await encryptWire(room, topic, JSON.stringify({ sid: 'session-test', n: 1, kind: 'data' }));
  const body = concat(field(topic), payload);
  peer.receivePacket({ header: 0x31, body }, room, 1); await peer.rx;
  assert.equal(received.length, 0);
  peer.receivePacket({ header: 0x30, body }, room, 1); await peer.rx;
  peer.receivePacket({ header: 0x30, body }, room, 1); await peer.rx;
  assert.equal(received.length, 1);
  const altered = body.slice(); altered[altered.length - 1] ^= 1;
  peer.receivePacket({ header: 0x30, body: altered }, room, 1); await peer.rx;
  peer.receivePacket({ header: 0x30, body: concat(field('unrelated/room'), payload) }, room, 1); await peer.rx;
  assert.equal(received.length, 1); assert.equal(peer.rxPending, 0);
});
console.log(`${count} relay regression groups passed`);
