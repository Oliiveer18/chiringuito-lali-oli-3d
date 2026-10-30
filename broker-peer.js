/* Peer-compatible encrypted WSS transport for the independent 3D prototype.
   Public EMQX broker: https://www.emqx.com/en/mqtt/public-mqtt5-broker
   Best effort testing service, NOT a production SLA. No retained messages.
   Rooms use 130-bit invite secrets; topics and MQTT client ids disclose no code.
   Host authority remains in net-sync.js; this module only transports messages. */
import { concat, field, packet, readPackets, MAX_PACKET } from './relay-codec.mjs';
import { roomCrypto, encryptWire, decryptWire } from './relay-crypto.mjs';

export const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
class Events {
  constructor() { this.handlers = new Map(); }
  on(name, fn) { if (!this.handlers.has(name)) this.handlers.set(name, new Set()); this.handlers.get(name).add(fn); return this; }
  emit(name, ...args) { for (const fn of this.handlers.get(name) || []) fn(...args); return true; }
}
class BrokerLink extends Events {
  constructor(owner, target, room, inbound, metadata = {}) {
    super(); this.owner = owner; this.peer = target; this.room = room;
    this.inbound = inbound; this.metadata = metadata; this.open = false; this.closed = false;
    this.transport = 'encrypted-wss'; this.remoteSession = null; this.compression = false;
  }
  send(data) {
    if (!this.open || this.closed) return;
    this.owner.transmit(this.room, this.topic, { kind: 'data', from: this.owner.id, data }, this.compression)
      .catch(e => { if (!this.closed) this.emit('error', { type: 'network', message: e.message }); });
  }
  close(remote = false) {
    if (this.closed) return;
    if (!remote && this.open) this.owner.transmit(this.room, this.topic, { kind: 'bye', from: this.owner.id }).catch(() => {});
    this.open = false; this.closed = true;
    if (this.owner.rawLinks.get(this.peer) === this) this.owner.rawLinks.delete(this.peer);
    this.emit('close');
  }
}
export class BrokerPeer extends Events {
  constructor(id, options) {
    super();
    if (typeof id === 'object') { options = id; id = null; }
    this.options = options || {}; this.host = !!id; this.id = id || crypto.randomUUID();
    this.roomId = id || this.options.roomId || null;
    this.transport = 'encrypted-wss'; this.destroyed = false; this.disconnected = false; this.open = false;
    this.rawLinks = new Map(); this.rooms = new Map(); this.subscriptions = new Set(); this.pending = new Map();
    this.seen = new Map(); this.readyWaiters = new Set(); this.serial = 0; this.packetId = 0; this.generation = 0;
    this.tx = Promise.resolve(); this.rx = Promise.resolve(); this.rxPending = 0; this.txPending = 0;
    this.bytesSent = 0; this.bytesReceived = 0;
    queueMicrotask(() => this.start());
  }
  room(id) {
    if (!this.rooms.has(id)) this.rooms.set(id, roomCrypto(id));
    return this.rooms.get(id);
  }
  async start() {
    if (this.destroyed || this.connecting || this.open) return;
    this.connecting = true; const generation = ++this.generation;
    this.connectionId = crypto.randomUUID();
    const connectionId = this.connectionId;
    try {
      const room = this.roomId ? await this.room(this.roomId) : null;
      const willTopic = room ? room.root + '/status' : null;
      const will = room ? await encryptWire(room, willTopic, JSON.stringify({
        sid: crypto.randomUUID(), n: 1, kind: 'gone', from: this.id, session: connectionId
      })) : null;
      if (this.destroyed || generation !== this.generation) return;
      const socket = this.socket = new WebSocket(this.options.brokerURL || BROKER_URL, ['mqtt']);
      socket.binaryType = 'arraybuffer'; this.buffer = new Uint8Array();
      const current = () => !this.destroyed && generation === this.generation;
      this.connectTimer = setTimeout(() => { if (current()) this.fail(); }, 12000);
      socket.onopen = () => {
        if (!current()) return;
        const clientId = 'lo3d-' + crypto.randomUUID().replaceAll('-', '').slice(0, 16);
        const variable = concat(field('MQTT'), Uint8Array.of(4, will ? 6 : 2, 0, 30));
        socket.send(packet(0x10, concat(variable, field(clientId),
          ...(will ? [field(willTopic), field(will)] : []))));
      };
      socket.onmessage = event => {
        if (!current() || !(event.data instanceof ArrayBuffer)) return;
        try {
          const bytes = new Uint8Array(event.data);
          if (bytes.length + this.buffer.length > MAX_PACKET * 2) throw new Error('Relay frame too large');
          const parsed = readPackets(concat(this.buffer, bytes)); this.buffer = parsed.rest;
          for (const p of parsed.packets) this.receivePacket(p, room, generation);
        } catch { this.fail(); }
      };
      socket.onerror = () => { if (current()) this.fail(); };
      socket.onclose = () => { if (current()) this.fail(); };
    } catch (e) {
      if (!this.destroyed && generation === this.generation) this.fail();
    }
  }
  receivePacket({ header, body }, room, generation) {
    const type = header >> 4;
    if (type === 2) {
      if (body.length !== 2 || body[1] !== 0) { this.fail(); return; }
      this.connectedAt = Date.now(); this.subscriptions.clear();
      (async () => {
        if (room) {
          await this.subscribe(room.root + '/status');
          await this.subscribe(this.host ? room.root + '/h' : room.root + '/g/' + this.id);
        }
        if (this.destroyed || generation !== this.generation) return;
        clearTimeout(this.connectTimer); this.connecting = false; this.open = true; this.disconnected = false;
        for (const waiter of this.readyWaiters) waiter.resolve(); this.readyWaiters.clear();
        this.pingTimer = setInterval(() => {
          if (this.socket?.readyState !== WebSocket.OPEN) return;
          if (Date.now() - this.lastPong > 45000) { this.fail(); return; }
          this.socket.send(packet(0xc0));
        }, 15000);
        this.lastPong = Date.now(); this.emit('open', this.id);
      })().catch(() => { if (generation === this.generation) this.fail(); });
    } else if (type === 9) {
      if (body.length < 3) return;
      const id = (body[0] << 8) | body[1], pending = this.pending.get(id);
      if (pending) {
        this.pending.delete(id); clearTimeout(pending.timer);
        body[2] === 0x80 ? pending.reject(new Error('Subscription denied')) : pending.resolve();
      }
    } else if (type === 13) this.lastPong = Date.now();
    else if (type === 3) {
      // Ignore retained packets, including malicious old snapshots.
      if (header & 1 || body.length < 2) return;
      const len = (body[0] << 8) | body[1];
      if (len > 200 || body.length < len + 2) return;
      const topic = new TextDecoder().decode(body.slice(2, 2 + len));
      let at = 2 + len; const qos = (header >> 1) & 3;
      if (qos === 1) {
        if (body.length < at + 2) return;
        this.socket.send(packet(0x40, body.slice(at, at + 2))); at += 2;
      } else if (qos !== 0) return;
      const payload = body.slice(at); this.bytesReceived += payload.length;
      if (++this.rxPending > 40) { this.rxPending--; this.fail(); return; }
      this.rx = this.rx.then(async () => {
        if (generation !== this.generation || this.destroyed) return;
        const activeRoom = this.roomId ? await this.room(this.roomId) : null;
        if (!activeRoom || !topic.startsWith(activeRoom.root + '/')) return;
        let msg;
        try { msg = await decryptWire(activeRoom, topic, payload); } catch { return; }
        if (!msg || typeof msg.sid !== 'string' || msg.sid.length > 50 ||
          !Number.isSafeInteger(msg.n) || msg.n < 1) return;
        const replayKey = topic + ':' + msg.sid;
        if (msg.n <= (this.seen.get(replayKey) || 0)) return;
        this.seen.set(replayKey, msg.n);
        if (this.seen.size > 64) this.seen.delete(this.seen.keys().next().value);
        this.receiveMessage(activeRoom, topic, msg);
      }).catch(() => {}).finally(() => { this.rxPending--; });
    }
  }
  subscribe(topic) {
    if (this.subscriptions.has(topic)) return Promise.resolve();
    const id = this.packetId = this.packetId % 65535 + 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('Subscription timeout')); }, 8000);
      this.pending.set(id, { timer, resolve: () => { this.subscriptions.add(topic); resolve(); }, reject });
      try { this.socket.send(packet(0x82, concat(Uint8Array.of(id >> 8, id & 255), field(topic), Uint8Array.of(0)))); }
      catch (e) { clearTimeout(timer); this.pending.delete(id); reject(e); }
    });
  }
  ready() {
    if (this.open) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const waiter = { resolve: () => { clearTimeout(timer); resolve(); }, reject: e => { clearTimeout(timer); reject(e); } };
      const timer = setTimeout(() => { this.readyWaiters.delete(waiter); reject(new Error('Relay unavailable')); }, 12000);
      this.readyWaiters.add(waiter);
    });
  }
  connect(target, options = {}) {
    const link = new BrokerLink(this, target, null, false, options.metadata);
    this.rawLinks.set(target, link);
    (async () => {
      this.roomId = target;
      const room = await this.room(target); link.room = room; link.topic = room.root + '/h';
      await this.ready();
      await this.subscribe(room.root + '/status');
      await this.subscribe(room.root + '/g/' + this.id);
      if (link.closed || this.destroyed) return;
      await this.transmit(room, link.topic, { kind: 'join', from: this.id, metadata: options.metadata, zip: typeof DecompressionStream !== 'undefined' });
    })().catch(e => { if (!link.closed) link.emit('error', { type: 'network', message: e.message }); });
    return link;
  }
  transmit(room, topic, msg, compress = true) {
    if (this.txPending >= 40) { this.fail(); return Promise.reject(new Error('Relay queue full')); }
    // Freeze mutable snapshots now, before asynchronous compression/encryption.
    const json = JSON.stringify({ ...msg, sid: this.connectionId, session: this.connectionId, n: ++this.serial });
    this.txPending++;
    const generation = this.generation;
    const sent = this.tx.then(async () => {
      if (this.destroyed || generation !== this.generation || this.socket?.readyState !== WebSocket.OPEN) return;
      const bytes = await encryptWire(room, topic, json, compress);
      if (this.destroyed || generation !== this.generation || this.socket?.readyState !== WebSocket.OPEN) return;
      if (this.socket.bufferedAmount > 262144) throw new Error('Relay backpressure');
      this.socket.send(packet(0x30, concat(field(topic), bytes)));
      this.bytesSent += bytes.length;
    }).finally(() => { this.txPending--; });
    this.tx = sent.catch(() => {}); return sent;
  }
  receiveMessage(room, topic, msg) {
    if (typeof msg.from !== 'string' || msg.from.length > 100 || msg.from === this.id) return;
    if (topic === room.root + '/status') {
      if (msg.kind !== 'gone') return;
      const link = this.rawLinks.get(msg.from);
      if (link?.remoteSession === msg.session) link.close(true);
      return;
    }
    if (msg.kind === 'join' && this.host && topic === room.root + '/h') {
      if (!/^[a-f0-9-]{36}$/.test(msg.from) || typeof msg.metadata?.laliToken !== 'string') return;
      let link = this.rawLinks.get(msg.from);
      if (link?.open && link.remoteSession === msg.session) {
        this.transmit(room, link.topic, { kind: 'welcome', from: this.id, zip: typeof DecompressionStream !== 'undefined' }).catch(() => {}); return;
      }
      if (link) link.close(true);
      link = new BrokerLink(this, msg.from, room, true, msg.metadata);
      link.topic = room.root + '/g/' + msg.from; link.remoteSession = msg.session; link.compression = msg.zip === true;
      this.rawLinks.set(msg.from, link); this.emit('connection', link);
      if (link.closed) return;
      link.open = true;
      this.transmit(room, link.topic, { kind: 'welcome', from: this.id, zip: typeof DecompressionStream !== 'undefined' }).catch(() => {});
      link.emit('open');
      return;
    }
    const link = this.rawLinks.get(msg.from);
    if (!link || link.closed) return;
    if (msg.kind === 'welcome' && !this.host && topic === room.root + '/g/' + this.id) {
      link.remoteSession = msg.session;
      link.compression = msg.zip === true;
      if (!link.open) { link.open = true; link.emit('open'); }
    } else if (msg.session === link.remoteSession) {
      if (msg.kind === 'data' && link.open) link.emit('data', msg.data);
      else if (msg.kind === 'bye') link.close(true);
    }
  }
  fail() {
    if (this.destroyed || (!this.connecting && this.disconnected)) return;
    const wasReady = this.open; this.generation++; this.open = false; this.connecting = false; this.disconnected = true;
    clearTimeout(this.connectTimer); clearInterval(this.pingTimer);
    try { this.socket?.close(); } catch {}
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('Relay disconnected')); }
    this.pending.clear(); this.subscriptions.clear();
    for (const link of [...this.rawLinks.values()]) link.close(true);
    if (!wasReady) this.emit('error', { type: 'network', message: 'Relay unavailable' });
    this.emit('disconnected');
  }
  reconnect() { if (!this.destroyed && !this.connecting && !this.open) this.start(); }
  destroy() {
    if (this.destroyed) return;
    for (const link of [...this.rawLinks.values()]) link.close(true);
    this.destroyed = true; this.generation++; this.open = false;
    clearTimeout(this.connectTimer); clearInterval(this.pingTimer);
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('Relay destroyed')); }
    this.pending.clear();
    for (const w of this.readyWaiters) w.reject(new Error('Relay destroyed')); this.readyWaiters.clear();
    // Closing without MQTT DISCONNECT intentionally publishes our encrypted
    // last will, so leaving a room notifies the partner immediately.
    try { this.socket?.close(); } catch {}
    this.emit('close');
  }
}
