// AMG краудсорсинг, этап 1 — общая логика приёмника голосов «Я здесь».
// Чистые функции без I/O и без сети: их используют бот (contrib-bot-once.mjs) и тесты (contrib-test.mjs).
// Вердикт «у объекта / рядом / далеко» считается здесь, а не на клиенте.
// Основа — черновик с сервера zimablade (2026-10-15); правила согласия — docs/2026-10-27-amg-crowd-concept.md.

export const GEORGIA_BBOX = { minLat: 41.0, maxLat: 43.6, minLng: 40.0, maxLng: 46.8 };

// Допуск «у объекта» зависит от точности точки (precision из sites.geojson) — синхронно с index.html PRECISION_TOL_M.
export const PRECISION_TOLERANCE_M = { exact: 60, building: 100, street: 250, approximate: 400 };
export const DEFAULT_TOLERANCE_M = 100;
export function toleranceFor(precision) { return PRECISION_TOLERANCE_M[precision] || DEFAULT_TOLERANCE_M; }

export const VERIFY_N = 2;              // значок «проверено»: 2 разных человека у объекта
export const CORRECT_MAX_M = 1500;      // дальше — уже не неточность точки, а другой объект/ошибка
export const CORRECT_N = 3;             // коррекция точки: 3 разных человека…
export const CORRECT_MIN_DAYS = 2;      // …минимум в 2 разных дня (UTC)…
export const CORRECT_AGREE_M = 100;     // …и их точки согласуются между собой
export const USER_MAX_PER_DAY = 20;     // лимит голосов на человека в сутки
export const USER_MAX_KMH = 300;        // «телепорт»: быстрее — голос отклоняется

// --- base64url ---
export function b64urlDecode(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}
export function b64urlEncode(s) {
  return Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- геометрия ---
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, r = d => d * Math.PI / 180;
  const dLat = r(lat2 - lat1), dLon = r(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
export function inGeorgia(lat, lng) {
  return lat >= GEORGIA_BBOX.minLat && lat <= GEORGIA_BBOX.maxLat &&
         lng >= GEORGIA_BBOX.minLng && lng <= GEORGIA_BBOX.maxLng;
}

// --- payload: c|site-XXXX|lat|lng (подтвердить) или k|site-XXXX|lat|lng (поправить) → base64url ---
// Формат совпадает с makeHerePayload в index.html; в /start помещается до 64 символов.
export function decodeHerePayload(payload) {
  let raw;
  try { raw = b64urlDecode(payload); } catch { return { ok: false, reason: 'decode' }; }
  const p = String(raw).split('|');
  if (p.length !== 4 || (p[0] !== 'c' && p[0] !== 'k')) return { ok: false, reason: 'format' };
  const kind = p[0] === 'k' ? 'correct' : 'confirm';
  const siteId = p[1], lat = +p[2], lng = +p[3];
  if (!siteId || !isFinite(lat) || !isFinite(lng)) return { ok: false, reason: 'format' };
  return { ok: true, kind, siteId, lat, lng };
}
export function encodeHerePayload(siteId, lat, lng, kind = 'c') {
  const tag = kind === 'k' ? 'k' : 'c';
  return b64urlEncode(`${tag}|${siteId}|${lat.toFixed(5)}|${lng.toFixed(5)}`);
}

// --- состояние: внутреннее (хеши пользователей, голоса) — хранится только зашифрованным ---
export function emptyState(updated = null) { return { version: 2, updated, offset: 0, sites: {}, users: {} }; }

function median(a) {
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
// Согласованная точка из набора голосов: медиана + максимальный разброс вокруг неё.
export function consensusPoint(list) {
  if (!list || !list.length) return null;
  const lat = median(list.map(v => v.lat)), lng = median(list.map(v => v.lng));
  let spread = 0;
  for (const v of list) spread = Math.max(spread, haversine(v.lat, v.lng, lat, lng));
  return { lat: +lat.toFixed(5), lng: +lng.toFixed(5), spread_m: spread };
}

// Главная операция: принять голос. siteCoords: Map(siteId -> {lat,lng,precision?}); uid — уже хеш.
// Ничего не переносит на карте сама: коррекция становится предложением (status correction_proposed),
// решение принимает хранитель данных (бот открывает Issue).
export function castVote(state, siteCoords, payload, uid, nowISO = new Date().toISOString()) {
  const d = decodeHerePayload(payload);
  if (!d.ok) return { accepted: false, reason: 'bad_payload' };
  const site = siteCoords.get(d.siteId);
  if (!site) return { accepted: false, reason: 'unknown_site' };
  if (!inGeorgia(d.lat, d.lng)) return { accepted: false, reason: 'outside_bbox' };
  const dist = haversine(d.lat, d.lng, site.lat, site.lng);
  const tol = toleranceFor(site.precision);
  const rec = state.sites[d.siteId] || (state.sites[d.siteId] = { status: 'collecting', votes: {}, corrects: {} });
  rec.votes || (rec.votes = {}); rec.corrects || (rec.corrects = {});
  const point = { lat: +d.lat.toFixed(5), lng: +d.lng.toFixed(5), d: Math.round(dist), t: nowISO };

  if (d.kind === 'correct') {
    if (dist < tol) return { accepted: false, reason: 'too_close', dist_m: Math.round(dist) };
    if (dist > CORRECT_MAX_M) return { accepted: false, reason: 'too_far', dist_m: Math.round(dist) };
    if (rec.corrects[uid]) return { accepted: false, reason: 'duplicate_correct', count: Object.keys(rec.corrects).length };
    rec.corrects[uid] = point;
    const list = Object.values(rec.corrects);
    const days = new Set(list.map(v => String(v.t).slice(0, 10))).size;
    const c = consensusPoint(list);
    let newlyProposed = false;
    if (list.length >= CORRECT_N && days >= CORRECT_MIN_DAYS && c && c.spread_m <= CORRECT_AGREE_M) {
      if (rec.status !== 'correction_proposed') newlyProposed = true;
      rec.status = 'correction_proposed';
      rec.proposal = { lat: c.lat, lng: c.lng, spread_m: Math.round(c.spread_m), n: list.length, days, from_m: Math.round(haversine(c.lat, c.lng, site.lat, site.lng)) };
    }
    return { accepted: true, kind: 'correct', siteId: d.siteId, dist_m: Math.round(dist),
             count: list.length, days, status: rec.status, newlyProposed, proposal: rec.proposal || null };
  }

  if (dist > tol) return { accepted: false, reason: 'too_far', dist_m: Math.round(dist), tol_m: tol };
  if (rec.votes[uid]) return { accepted: false, reason: 'duplicate', count: Object.keys(rec.votes).length };
  rec.votes[uid] = point;
  const count = Object.keys(rec.votes).length;
  rec.checked = nowISO.slice(0, 7);                         // «проверено <месяц>»
  if (count >= VERIFY_N && rec.status === 'collecting') rec.status = 'verified';
  return { accepted: true, kind: 'confirm', siteId: d.siteId, dist_m: Math.round(dist), count, status: rec.status };
}

// Публичный фид data/contributions.json: только статус, число людей и месяц последней проверки.
// Без хешей, без координат голосов и без предложенных координат.
export function publicFeed(state, updatedISO = null) {
  const out = { version: 2, updated: updatedISO || state.updated, sites: {} };
  for (const [id, r] of Object.entries(state.sites)) {
    const count = Object.keys(r.votes || {}).length;
    if (!count && r.status !== 'correction_proposed') continue;
    out.sites[id] = { status: r.status, count };
    if (r.checked) out.sites[id].checked = r.checked;
  }
  return out;
}

// --- антинакрутка: лимит в сутки и «телепорт» (по пользователю) ---
// userGuard не меняет историю — userCommit вызывается только для принятого голоса.
export function userGuard(state, uid, lat, lng, nowMs = Date.now(), maxKmh = USER_MAX_KMH, maxPerDay = USER_MAX_PER_DAY) {
  state.users || (state.users = {});
  const u = state.users[uid] || (state.users[uid] = { last: null, win: { start: nowMs, n: 0 } });
  if (nowMs - u.win.start > 86400000) { u.win.start = nowMs; u.win.n = 0; }
  if (u.win.n >= maxPerDay) return { ok: false, reason: 'rate_limit' };
  if (u.last) {
    const dt = (nowMs - u.last.t) / 1000;
    if (dt > 0) {
      const kmh = (haversine(lat, lng, u.last.lat, u.last.lng) / dt) * 3.6;
      if (kmh > maxKmh) return { ok: false, reason: 'velocity', kmh: Math.round(kmh) };
    }
  }
  return { ok: true };
}
export function userCommit(state, uid, lat, lng, nowMs = Date.now()) {
  const u = state.users[uid];
  u.win.n += 1;
  u.last = { lat, lng, t: nowMs };
}
