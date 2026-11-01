// Per-user realtime event bus. Delivered to browsers via Server-Sent Events.
import { EventEmitter } from 'node:events';

export function createBus() {
  const em = new EventEmitter();
  em.setMaxListeners(1000);
  const clients = new Map(); // userId -> Set(res)
  return {
    emit(userId, type, data = {}) {
      const payload = { type, data, at: new Date().toISOString() };
      em.emit('event', userId, payload);
      const set = clients.get(userId);
      if (set) for (const res of set) { try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch {} }
    },
    on(fn) { em.on('event', fn); return () => em.off('event', fn); },
    attach(userId, res) {
      if (!clients.has(userId)) clients.set(userId, new Set());
      clients.get(userId).add(res);
      const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 25000);
      res.on('close', () => { clearInterval(ping); clients.get(userId)?.delete(res); });
    },
    clientCount: () => [...clients.values()].reduce((a, s) => a + s.size, 0),
    closeAll() { for (const s of clients.values()) for (const r of s) { try { r.end(); } catch {} } clients.clear(); },
  };
}
