// AMG краудсорсинг — тесты логики приёмника голосов, шифрования состояния и прохода бота.
// Запуск: node scripts/contrib-test.mjs (также в CI перед деплоем). Сеть не используется.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  encodeHerePayload, decodeHerePayload, haversine, inGeorgia,
  castVote, emptyState, publicFeed, userGuard, userCommit, VERIFY_N, CORRECT_N,
} from './contrib-lib.mjs';
import { stateKey, hashUid, encryptState, decryptState } from './contrib-store.mjs';
import { processUpdates } from './contrib-bot-once.mjs';

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('  ok  ', name); } catch (e) { fail++; console.log('  FAIL', name, '::', e.message); } };

// Тбилиси, Памятник Свободы (site-0022) = [44.8014958, 41.6934017]
const SITE = { lat: 41.6934017, lng: 44.8014958, precision: 'building' };
const siteCoords = new Map([['site-0022', SITE]]);
const north = dM => ({ lat: SITE.lat + dM / 111320, lng: SITE.lng });
const vote = (st, uid, dM, kind = 'c', t = '2026-10-27T10:00:00Z') => { const p = north(dM); return castVote(st, siteCoords, encodeHerePayload('site-0022', p.lat, p.lng, kind), uid, t); };

t('payload: туда-обратно и влезает в /start (64)', () => {
  const p = encodeHerePayload('site-0022', 41.69340, 44.80150);
  assert.ok(p.length <= 64, 'длина ' + p.length);
  const d = decodeHerePayload(p);
  assert.equal(d.ok, true); assert.equal(d.siteId, 'site-0022'); assert.ok(Math.abs(d.lat - 41.69340) < 1e-6);
});
t('haversine ~111 м на 0.001°', () => { const d = haversine(SITE.lat, SITE.lng, SITE.lat + 0.001, SITE.lng); assert.ok(d > 100 && d < 125, 'got ' + d); });
t('inGeorgia', () => { assert.equal(inGeorgia(41.69, 44.80), true); assert.equal(inGeorgia(55.75, 37.61), false); });

t(`${VERIFY_N} разных человека у объекта → «проверено»`, () => {
  const st = emptyState();
  assert.equal(vote(st, 'a', 10).status, 'collecting');
  const r = vote(st, 'b', 30);
  assert.equal(r.status, 'verified'); assert.equal(r.count, VERIFY_N);
});
t('один человек дважды → duplicate', () => {
  const st = emptyState(); vote(st, 'a', 5);
  const r = vote(st, 'a', 8);
  assert.equal(r.accepted, false); assert.equal(r.reason, 'duplicate'); assert.equal(r.count, 1);
});
t('далеко / вне Грузии / мусор / неизвестный объект → отклонено', () => {
  const st = emptyState();
  assert.equal(vote(st, 'a', 500).reason, 'too_far');
  assert.equal(castVote(st, siteCoords, encodeHerePayload('site-0022', 55.75, 37.61), 'a').reason, 'outside_bbox');
  assert.equal(castVote(st, siteCoords, 'not-base64!!', 'a').reason, 'bad_payload');
  assert.equal(castVote(st, siteCoords, encodeHerePayload('site-XXXX', SITE.lat, SITE.lng), 'a').reason, 'unknown_site');
});
t(`коррекция: ${CORRECT_N} человека в один день → ещё не предложение`, () => {
  const st = emptyState();
  for (const u of ['a', 'b', 'c']) vote(st, u, 300 + u.charCodeAt(0) % 5, 'k', '2026-10-27T10:00:00Z');
  assert.equal(st.sites['site-0022'].status, 'collecting');
});
t(`коррекция: ${CORRECT_N} человека в 2 дня, согласны → предложение, точка НЕ переносится`, () => {
  const st = emptyState();
  vote(st, 'a', 300, 'k', '2026-10-26T10:00:00Z'); vote(st, 'b', 310, 'k', '2026-10-27T10:00:00Z');
  const r = vote(st, 'c', 305, 'k', '2026-10-27T12:00:00Z');
  assert.equal(r.status, 'correction_proposed'); assert.equal(r.newlyProposed, true);
  assert.ok(r.proposal.from_m > 280 && r.proposal.from_m < 330, 'from_m ' + r.proposal.from_m);
  assert.equal(SITE.lat, 41.6934017, 'исходная точка не тронута');
  assert.equal(vote(st, 'd', 306, 'k', '2026-10-28T10:00:00Z').newlyProposed, false, 'Issue открывается один раз');
});
t('коррекция: разброс > 100 м → не предложение', () => {
  const st = emptyState();
  vote(st, 'a', 300, 'k', '2026-10-26T10:00:00Z'); vote(st, 'b', 600, 'k', '2026-10-27T10:00:00Z'); vote(st, 'c', 900, 'k', '2026-10-27T11:00:00Z');
  assert.equal(st.sites['site-0022'].status, 'collecting');
});
t('лимит 20 в сутки', () => {
  const st = emptyState();
  for (let i = 0; i < 20; i++) { assert.equal(userGuard(st, 'z', SITE.lat, SITE.lng, 1000 + i).ok, true); userCommit(st, 'z', SITE.lat, SITE.lng, 1000 + i); }
  assert.equal(userGuard(st, 'z', SITE.lat, SITE.lng, 1000 + 21).reason, 'rate_limit');
  assert.equal(userGuard(st, 'z', SITE.lat, SITE.lng, 1000 + 86400001).ok, true, 'через сутки снова можно');
});
t('«телепорт» → отклонено', () => {
  const st = emptyState();
  userGuard(st, 'v', 41.6934, 44.8015, 0); userCommit(st, 'v', 41.6934, 44.8015, 0);
  assert.equal(userGuard(st, 'v', 41.6934 + 1.8, 44.8015, 60000).reason, 'velocity');
});
t('публичный фид: без хешей, координат голосов и предложений', () => {
  const st = emptyState(); vote(st, 'a', 10); vote(st, 'b', 20);
  vote(st, 'c', 300, 'k', '2026-10-26T10:00:00Z');
  const feed = publicFeed(st, 'T'), s = feed.sites['site-0022'], txt = JSON.stringify(feed);
  assert.deepEqual(Object.keys(feed).sort(), ['sites', 'updated', 'version']);
  assert.equal(s.status, 'verified'); assert.equal(s.count, 2); assert.equal(s.checked, '2026-10');
  assert.ok(!/"a"|"b"|"c"|votes|corrects|proposal|lat|lng/.test(txt), 'утечка: ' + txt);
});
t('шифрование состояния: туда-обратно, подмена ловится, ключ проверяется', () => {
  const key = stateKey(crypto.randomBytes(32).toString('base64'));
  const st = emptyState(); vote(st, hashUid(key, 123), 10);
  const enc = encryptState(key, st);
  assert.ok(!enc.includes('site-0022'), 'в зашифрованном не видно данных');
  assert.deepEqual(decryptState(key, enc), st);
  const j = JSON.parse(enc); j.data = Buffer.from('x' + Buffer.from(j.data, 'base64').toString('binary'), 'binary').toString('base64');
  assert.throws(() => decryptState(key, JSON.stringify(j)));
  assert.throws(() => decryptState(stateKey(crypto.randomBytes(32).toString('base64')), enc));
  assert.throws(() => stateKey('short'));
});
t('hashUid: стабилен, зависит от ключа, не содержит ID', () => {
  const k1 = stateKey(crypto.randomBytes(32).toString('base64')), k2 = stateKey(crypto.randomBytes(32).toString('base64'));
  assert.equal(hashUid(k1, 123456789), hashUid(k1, 123456789));
  assert.notEqual(hashUid(k1, 123456789), hashUid(k2, 123456789));
  assert.ok(!hashUid(k1, 123456789).includes('123456789'));
});
t('проход бота: приветствие, языки, только личные чаты, offset, «решающая» отметка', () => {
  const st = emptyState(), coords = new Map([['site-0022', SITE]]);
  const msg = (id, from, text, lang, type = 'private') => ({ update_id: id, message: { chat: { id: from, type }, from: { id: from, language_code: lang }, date: 1793000000 + id * 60, text } });
  const p = encodeHerePayload('site-0022', SITE.lat, SITE.lng);
  const res = processUpdates(st, [msg(5, 1, '/start', 'ka'), msg(6, 2, '/start ' + p, 'ru'), msg(7, 3, '/start ' + p, 'en'),
    msg(8, 4, '/start ' + p, 'ru', 'group'), msg(9, 5, 'привет', 'ru')], coords, x => 'h' + x);
  assert.equal(res.offset, 10); assert.equal(st.offset, 10);
  assert.equal(res.replies.length, 3, 'группа и обычный текст игнорируются');
  assert.match(res.replies[0].text, /გამარჯობა/);
  assert.match(res.replies[1].text, /1\/2/);
  assert.match(res.replies[2].text, /deciding/);
  assert.equal(publicFeed(st).sites['site-0022'].status, 'verified');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
