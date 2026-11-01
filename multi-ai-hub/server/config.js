// Configuration loader: reads .env (if present) then process.env. No secrets are hard-coded.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
loadDotEnv(path.join(APP_ROOT, '.env'));

const bool = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));
const num = (v, d) => (v === undefined || v === '' || isNaN(+v) ? d : +v);

export function loadConfig(overrides = {}) {
  const env = process.env;
  const host = overrides.host ?? env.HOST ?? '127.0.0.1';
  const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(host);
  const cfg = {
    port: num(overrides.port ?? env.PORT, 7777),
    host,
    dataDir: path.resolve(APP_ROOT, overrides.dataDir ?? env.DATA_DIR ?? 'data'),
    masterKey: overrides.masterKey ?? env.MASTER_KEY ?? '',
    // Login is mandatory when exposed beyond localhost.
    requireLogin: isLoopback ? bool(overrides.requireLogin ?? env.REQUIRE_LOGIN, false) : true,
    allowSignup: bool(overrides.allowSignup ?? env.ALLOW_SIGNUP, false),
    googleClientId: env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: env.GOOGLE_CLIENT_SECRET || '',
    publicUrl: env.PUBLIC_URL || '',
    httpsKey: env.HTTPS_KEY_FILE || '',
    httpsCert: env.HTTPS_CERT_FILE || '',
    backupIntervalMin: num(env.BACKUP_INTERVAL_MIN, 30),
    backupKeep: num(env.BACKUP_KEEP, 10),
    maxConcurrency: num(overrides.maxConcurrency ?? env.MAX_CONCURRENCY, 3),
    llmTimeoutMs: num(env.LLM_TIMEOUT_MS, 120000),
    execTimeoutMs: num(env.EXEC_TIMEOUT_MS, 120000),
    silent: overrides.silent ?? false,
  };
  if (!cfg.publicUrl) cfg.publicUrl = `${cfg.httpsCert ? 'https' : 'http'}://${isLoopback ? 'localhost' : host}:${cfg.port}`;
  return cfg;
}
