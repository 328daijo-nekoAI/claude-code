// Shared helpers: settings, logging, audit trail, notifications.
import { now, uid, parseJson } from './db.js';

export const DEFAULT_SETTINGS = {
  setupDone: false,
  freeFirst: true,            // prefer free / local providers
  allowPaid: false,           // master switch for paid APIs (user-only; agents can never change it)
  simulatorFallback: true,    // use the offline simulator when no real AI is available
  autonomy: 'balanced',       // cautious | balanced | autonomous
  maxConcurrency: 3,
  autoCreateAgents: true,
  autoSleepMinutes: 30,
  webResearch: false,
  bulkDeleteThreshold: 5,
  defaultProjectId: '',
  cloudMode: 'local-sandbox', // local-sandbox | docker
  notifyBrowser: true,
  notifyMinLevel: 'info',
  fontScale: 1,
  accent: 'green',
  language: 'ja',
  emergencyStop: false,
};

// Keys that can only be changed through an explicit user request (never by agents / orchestrator).
export const PROTECTED_SETTINGS = new Set(['allowPaid', 'emergencyStop', 'autonomy', 'bulkDeleteThreshold']);

const LEVELS = { debug: 0, info: 1, success: 1, warn: 2, error: 3, critical: 4 };
export const levelRank = (l) => LEVELS[l] ?? 1;

export function createCore(db, bus) {
  const notifyThrottle = new Map();
  const core = {
    getSettings(userId) {
      const out = { ...DEFAULT_SETTINGS };
      for (const r of db.all('SELECT key, value FROM settings WHERE user_id=?', userId)) out[r.key] = parseJson(r.value, r.value);
      return out;
    },
    setSetting(userId, key, value) {
      db.run('INSERT INTO settings (user_id,key,value) VALUES (?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value',
        userId, key, JSON.stringify(value));
    },
    log(userId, level, source, message, extra = {}) {
      const row = { user_id: userId, level, source, message: String(message).slice(0, 4000), mission_id: extra.missionId || null,
        agent_id: extra.agentId || null, created_at: now() };
      const r = db.insert('logs', row);
      bus.emit(userId, 'log', { ...row });
      return r;
    },
    audit(userId, actor, action, detail = {}) {
      db.insert('audit', { user_id: userId, actor, action, detail: JSON.stringify(detail).slice(0, 4000), created_at: now() });
    },
    /** Create an in-app notification; external channels are fanned out by the notifier service. */
    notify(userId, { level = 'info', title, body = '', link = '' }) {
      const key = userId + '|' + title;
      const last = notifyThrottle.get(key);
      if (last && Date.now() - last < 15000 && levelRank(level) < 3) return null; // frequency control
      notifyThrottle.set(key, Date.now());
      const n = { id: uid('n_'), user_id: userId, level, title, body: String(body).slice(0, 2000), link, read: 0, created_at: now() };
      db.insert('notifications', n);
      bus.emit(userId, 'notification', n);
      core.onNotify?.(userId, n);
      return n;
    },
    onNotify: null,
  };
  return core;
}
