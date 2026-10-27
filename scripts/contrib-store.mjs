// AMG краудсорсинг — хранение внутреннего состояния бота в публичном репозитории.
// Состояние (хеши пользователей, координаты голосов) шифруется AES-256-GCM ключом из секрета
// AMG_STATE_KEY (32 байта, base64) и лежит в ветке contrib-state. Telegram ID не хранится вовсе:
// вместо него HMAC-хеш на том же ключе — без ключа по нему нельзя узнать человека.
import crypto from 'node:crypto';

export function stateKey(b64) {
  const k = Buffer.from(String(b64 || ''), 'base64');
  if (k.length !== 32) throw new Error('AMG_STATE_KEY: нужен ключ 32 байта в base64 (openssl rand -base64 32)');
  return k;
}
export function hashUid(key, uid) {
  return crypto.createHmac('sha256', key).update('amg-uid:' + String(uid)).digest('base64url').slice(0, 22);
}
export function encryptState(key, obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return JSON.stringify({ v: 1, alg: 'aes-256-gcm', iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') }) + '\n';
}
export function decryptState(key, text) {
  const j = JSON.parse(text);
  if (j.alg !== 'aes-256-gcm') throw new Error('state: неизвестный формат');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(j.iv, 'base64'));
  d.setAuthTag(Buffer.from(j.tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(j.data, 'base64')), d.final()]).toString('utf8'));
}
