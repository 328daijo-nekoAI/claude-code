// AES-256-GCM encryption for API keys and other secrets at rest.
// Master key: MASTER_KEY env var (any string, hashed to 32 bytes) or an auto-generated key file
// in the data directory (created with 0600 permissions). Losing the key file makes stored secrets unreadable.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function createSecrets(cfg) {
  let keyMaterial = cfg.masterKey;
  if (!keyMaterial) {
    const f = path.join(cfg.dataDir, 'master.key');
    if (!fs.existsSync(f)) {
      fs.mkdirSync(cfg.dataDir, { recursive: true });
      fs.writeFileSync(f, crypto.randomBytes(32).toString('base64'), { mode: 0o600 });
    }
    keyMaterial = fs.readFileSync(f, 'utf8').trim();
  }
  const key = crypto.createHash('sha256').update(keyMaterial).digest();
  return {
    encrypt(plain) {
      if (plain == null || plain === '') return null;
      const iv = crypto.randomBytes(12);
      const c = crypto.createCipheriv('aes-256-gcm', key, iv);
      const enc = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
      return 'v1:' + Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
    },
    decrypt(blob) {
      if (!blob) return '';
      if (!blob.startsWith('v1:')) throw new Error('unknown secret format');
      const buf = Buffer.from(blob.slice(3), 'base64');
      const d = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
      d.setAuthTag(buf.subarray(12, 28));
      return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
    },
    mask(plain) { return plain ? plain.slice(0, 3) + '…' + plain.slice(-4) : ''; },
  };
}
