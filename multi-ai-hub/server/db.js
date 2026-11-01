// SQLite storage (node:sqlite, WAL mode for crash safety). Every user-owned table carries user_id
// for tenant isolation; all service queries filter by user_id. Schema is plain SQL so it can be
// ported to PostgreSQL later (TEXT ids, ISO timestamps, JSON stored as TEXT).
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const now = () => new Date().toISOString();
export const uid = (p = '') => p + crypto.randomBytes(8).toString('hex');

const MIGRATIONS = [
  `CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, password_hash TEXT, totp_secret TEXT,
     totp_enabled INTEGER DEFAULT 0, google_sub TEXT, role TEXT DEFAULT 'user', plan TEXT DEFAULT 'free',
     disabled INTEGER DEFAULT 0, created_at TEXT);
   CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT, expires_at TEXT, pending_2fa INTEGER DEFAULT 0, created_at TEXT);
   CREATE TABLE settings (user_id TEXT, key TEXT, value TEXT, PRIMARY KEY(user_id, key));
   CREATE TABLE providers (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, kind TEXT, base_url TEXT, model TEXT,
     api_key_enc TEXT, cost_tier TEXT DEFAULT 'unknown', enabled INTEGER DEFAULT 1, allow_paid INTEGER DEFAULT 0,
     daily_limit INTEGER DEFAULT 0, config TEXT DEFAULT '{}', created_at TEXT);
   CREATE TABLE agents (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, icon TEXT, role TEXT, personality TEXT, tone TEXT,
     specialty TEXT, instructions TEXT, provider_id TEXT, model TEXT, status TEXT DEFAULT 'active', department_id TEXT,
     permissions TEXT DEFAULT '{}', relations TEXT DEFAULT '{}', color TEXT, created_at TEXT, updated_at TEXT, last_active_at TEXT);
   CREATE TABLE org_units (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, parent_id TEXT, lead_agent_id TEXT, created_at TEXT);
   CREATE TABLE projects (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, root_path TEXT, description TEXT, created_at TEXT);
   CREATE TABLE missions (id TEXT PRIMARY KEY, user_id TEXT, project_id TEXT, title TEXT, instruction TEXT, status TEXT,
     plan TEXT, result TEXT, error TEXT, created_at TEXT, updated_at TEXT);
   CREATE TABLE tasks (id TEXT PRIMARY KEY, user_id TEXT, mission_id TEXT, seq INTEGER, title TEXT, description TEXT, role TEXT,
     agent_id TEXT, status TEXT DEFAULT 'todo', depends_on TEXT DEFAULT '[]', progress INTEGER DEFAULT 0, output TEXT,
     files TEXT DEFAULT '[]', attempts INTEGER DEFAULT 0, kind TEXT DEFAULT 'work', started_at TEXT, finished_at TEXT, created_at TEXT);
   CREATE TABLE meetings (id TEXT PRIMARY KEY, user_id TEXT, mission_id TEXT, type TEXT, topic TEXT, status TEXT,
     participants TEXT DEFAULT '[]', decisions TEXT DEFAULT '[]', created_at TEXT, ended_at TEXT);
   CREATE TABLE messages (id TEXT PRIMARY KEY, user_id TEXT, channel TEXT, sender_type TEXT, sender_id TEXT, content TEXT,
     meta TEXT DEFAULT '{}', created_at TEXT);
   CREATE INDEX idx_messages_channel ON messages(user_id, channel, created_at);
   CREATE TABLE memories (id TEXT PRIMARY KEY, user_id TEXT, agent_id TEXT, project_id TEXT, kind TEXT, content TEXT,
     weight REAL DEFAULT 1, created_at TEXT);
   CREATE TABLE permission_requests (id TEXT PRIMARY KEY, user_id TEXT, agent_id TEXT, mission_id TEXT, action TEXT, target TEXT,
     reason TEXT, impact TEXT, operation TEXT, status TEXT DEFAULT 'pending', scope TEXT, created_at TEXT, decided_at TEXT);
   CREATE TABLE grants (id TEXT PRIMARY KEY, user_id TEXT, action TEXT, target TEXT, scope TEXT, mission_id TEXT,
     expires_at TEXT, revoked INTEGER DEFAULT 0, source_request TEXT, created_at TEXT);
   CREATE TABLE file_changes (id TEXT PRIMARY KEY, user_id TEXT, project_id TEXT, path TEXT, op TEXT, backup_path TEXT,
     agent_id TEXT, mission_id TEXT, size INTEGER, created_at TEXT);
   CREATE TABLE logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, level TEXT, source TEXT, message TEXT,
     mission_id TEXT, agent_id TEXT, created_at TEXT);
   CREATE INDEX idx_logs_user ON logs(user_id, id);
   CREATE TABLE metrics (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, provider_id TEXT, agent_id TEXT, ok INTEGER,
     latency_ms INTEGER, tokens_in INTEGER, tokens_out INTEGER, cost REAL, error TEXT, created_at TEXT);
   CREATE TABLE scores (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, agent_id TEXT, task_id TEXT, dimension TEXT,
     score REAL, created_at TEXT);
   CREATE TABLE notifications (id TEXT PRIMARY KEY, user_id TEXT, level TEXT, title TEXT, body TEXT, link TEXT,
     read INTEGER DEFAULT 0, created_at TEXT);
   CREATE TABLE notify_channels (id TEXT PRIMARY KEY, user_id TEXT, kind TEXT, name TEXT, config_enc TEXT,
     min_level TEXT DEFAULT 'warn', enabled INTEGER DEFAULT 1, created_at TEXT);
   CREATE TABLE layouts (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, data TEXT, is_default INTEGER DEFAULT 0, created_at TEXT);
   CREATE TABLE proposals (id TEXT PRIMARY KEY, user_id TEXT, agent_id TEXT, mission_id TEXT, title TEXT, body TEXT,
     status TEXT DEFAULT 'proposed', result TEXT, created_at TEXT);
   CREATE TABLE environments (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, kind TEXT, status TEXT, path TEXT,
     container_id TEXT, image TEXT, created_at TEXT);
   CREATE TABLE mcp_servers (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, command TEXT, args TEXT DEFAULT '[]',
     enabled INTEGER DEFAULT 0, status TEXT, tools TEXT DEFAULT '[]', created_at TEXT);
   CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, actor TEXT, action TEXT, detail TEXT, created_at TEXT);`,
];

export function openDb(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new DatabaseSync(file);
  raw.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  raw.exec('CREATE TABLE IF NOT EXISTS schema_version (v INTEGER)');
  const cur = raw.prepare('SELECT v FROM schema_version').get()?.v ?? 0;
  for (let i = cur; i < MIGRATIONS.length; i++) {
    raw.exec('BEGIN');
    try {
      raw.exec(MIGRATIONS[i]);
      raw.exec('DELETE FROM schema_version');
      raw.prepare('INSERT INTO schema_version (v) VALUES (?)').run(i + 1);
      raw.exec('COMMIT');
    } catch (e) { raw.exec('ROLLBACK'); throw e; }
  }
  const cache = new Map();
  const stmt = (sql) => { let s = cache.get(sql); if (!s) { s = raw.prepare(sql); cache.set(sql, s); } return s; };
  const db = {
    raw, file,
    get: (sql, ...p) => stmt(sql).get(...p),
    all: (sql, ...p) => stmt(sql).all(...p),
    run: (sql, ...p) => stmt(sql).run(...p),
    exec: (sql) => raw.exec(sql),
    /** Insert an object into a table. */
    insert(table, obj) {
      const keys = Object.keys(obj);
      stmt(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map((k) => norm(obj[k])));
      return obj;
    },
    /** Update a row by id, restricted to the owning user. */
    update(table, id, userId, obj) {
      const keys = Object.keys(obj);
      if (!keys.length) return;
      stmt(`UPDATE ${table} SET ${keys.map((k) => k + '=?').join(',')} WHERE id=? AND user_id=?`).run(...keys.map((k) => norm(obj[k])), id, userId);
    },
    tx(fn) { raw.exec('BEGIN'); try { const r = fn(); raw.exec('COMMIT'); return r; } catch (e) { raw.exec('ROLLBACK'); throw e; } },
    close() { cache.clear(); raw.close(); },
  };
  return db;
}

function norm(v) {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return v;
}

export const parseJson = (s, d) => { try { return s == null ? d : JSON.parse(s); } catch { return d; } };
