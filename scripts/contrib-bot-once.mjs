// AMG краудсорсинг, этап 1 — проход Telegram-бота. Запускается GitHub Actions
// (.github/workflows/contrib-bot.yml): забирает новые сообщения (getUpdates), принимает голоса «Я здесь»,
// отвечает, сохраняет зашифрованное состояние и публичный фид data/contributions.json.
// Предложенную коррекцию точки не применяет — открывает Issue для хранителя данных.
//
// Два режима:
//   один проход (по умолчанию) — сколько сообщений накопилось, столько и обработал;
//   дежурство (AMG_LOOP_SECONDS > 0) — держит длинный polling (AMG_TG_POLL_TIMEOUT) до дедлайна,
//   отвечает за секунды, сам коммитит состояние и фид; workflow продлевает дежурство следующим запуском.
//
// Переменные окружения:
//   AMG_BOT_TOKEN    токен бота (секрет). Без него — пробный прогон без сети.
//   AMG_STATE_KEY    ключ состояния, 32 байта base64 (секрет).
//   AMG_STATE_FILE   путь к зашифрованному состоянию (по умолчанию state/contrib-state.enc).
//   AMG_FEED_FILE    путь к публичному фиду (по умолчанию data/contributions.json).
//   AMG_LOOP_SECONDS секунды дежурства; 0 — один проход.
//   AMG_TG_POLL_TIMEOUT  длинный polling, сек (0 — без ожидания).
//   AMG_HEARTBEAT_DAYS   период heartbeat-коммита в ветку состояния (0 — выключить).
//   GITHUB_TOKEN, GITHUB_REPOSITORY — для Issue о коррекции (в Actions заданы автоматически).
//   GITHUB_OUTPUT    сюда пишется feed_changed=true|false.
//   AMG_TG_API       адрес Bot API (по умолчанию https://api.telegram.org; для локального теста — заглушка).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { castVote, emptyState, publicFeed, userGuard, userCommit, decodeHerePayload, encodeHerePayload, VERIFY_N, CORRECT_N } from './contrib-lib.mjs';
import { stateKey, hashUid, encryptState, decryptState } from './contrib-store.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://artmap-georgia.github.io/AMG/';

const LOOP_SECONDS = parseInt(process.env.AMG_LOOP_SECONDS || '0', 10) || 0;
const POLL_TIMEOUT = parseInt(process.env.AMG_TG_POLL_TIMEOUT || '0', 10) || 0;
const HEARTBEAT_DAYS = parseInt(process.env.AMG_HEARTBEAT_DAYS || '14', 10) || 0;
const POLL_ABORT_MS = (POLL_TIMEOUT + 20) * 1000;
const IN_ACTIONS = process.env.GITHUB_ACTIONS === 'true';

// --- тексты ответов: язык по language_code пользователя Telegram ---
const T = {
  welcome: { ru: `Привет! Это бот ArtMap Georgia. Открой объект на карте ${SITE_URL}, подойди к нему и нажми «Я здесь» — я засчитаю подтверждение.`,
             en: `Hi! This is the ArtMap Georgia bot. Open an object on ${SITE_URL}, walk up to it and tap “I’m here” — I’ll count your confirmation.`,
             ka: `გამარჯობა! ეს ArtMap Georgia-ს ბოტია. გახსენი ობიექტი რუკაზე ${SITE_URL}, მიდი მასთან და დააჭირე «აქ ვარ» — დადასტურებას ჩავთვლი.` },
  bad_payload: { ru: 'Не разобрал метку. Открой «Я здесь» ещё раз с сайта.', en: 'Could not read the link. Tap “I’m here” on the site again.', ka: 'ბმული ვერ წავიკითხე. საიტზე კიდევ ერთხელ დააჭირე «აქ ვარ».' },
  unknown_site: { ru: 'Такого объекта нет на карте.', en: 'This object is not on the map.', ka: 'ასეთი ობიექტი რუკაზე არ არის.' },
  outside_bbox: { ru: 'Координаты вне Грузии — не засчитано.', en: 'Coordinates are outside Georgia — not counted.', ka: 'კოორდინატები საქართველოს გარეთაა — არ ჩაითვალა.' },
  too_far: { ru: 'Ты в {d} м от метки — похоже, это другой объект или сбой GPS. Подойди ближе.', en: 'You are {d} m from the marker — probably another object or a GPS glitch. Get closer.', ka: 'ნიშნიდან {d} მ-ში ხარ — ალბათ სხვა ობიექტია ან GPS-ის შეცდომა. მიუახლოვდი.' },
  too_close: { ru: 'Ты и так у объекта ({d} м) — нажми «Я здесь», а не «исправить точку».', en: 'You are already at the object ({d} m) — tap “I’m here”, not “fix the point”.', ka: 'ისედაც ობიექტთან ხარ ({d} მ) — დააჭირე «აქ ვარ» და არა «გასწორებას».' },
  duplicate: { ru: 'Ты уже подтверждал этот объект — спасибо!', en: 'You have already confirmed this object — thanks!', ka: 'ეს ობიექტი უკვე დაადასტურე — მადლობა!' },
  duplicate_correct: { ru: 'Ты уже предлагал исправление для этой точки — спасибо!', en: 'You have already suggested a fix for this point — thanks!', ka: 'ამ წერტილის გასწორება უკვე შემოგვთავაზე — მადლობა!' },
  rate_limit: { ru: 'На сегодня достаточно отметок — продолжим завтра 🙂', en: 'That’s enough check-ins for today — let’s continue tomorrow 🙂', ka: 'დღეისთვის საკმარისია — ხვალ გავაგრძელოთ 🙂' },
  velocity: { ru: 'Слишком быстро переместился между отметками — эта не засчитана.', en: 'You moved too fast between check-ins — this one is not counted.', ka: 'მონიშვნებს შორის ძალიან სწრაფად გადაადგილდი — ეს არ ჩაითვალა.' },
  confirm_ok: { ru: '✓ Спасибо! Отметка принята ({n}/{need}).', en: '✓ Thanks! Check-in accepted ({n}/{need}).', ka: '✓ მადლობა! მონიშვნა მიღებულია ({n}/{need}).' },
  confirm_verified: { ru: '✓ Спасибо! Твоя отметка стала решающей — объект подтверждён на карте.', en: '✓ Thanks! Yours was the deciding check-in — the object is now confirmed on the map.', ka: '✓ მადლობა! შენი მონიშვნა გადამწყვეტი აღმოჩნდა — ობიექტი რუკაზე დადასტურებულია.' },
  confirm_more: { ru: '✓ Спасибо! Объект уже подтверждён, твоя отметка добавлена ({n}).', en: '✓ Thanks! The object is already confirmed; your check-in is added ({n}).', ka: '✓ მადლობა! ობიექტი უკვე დადასტურებულია, შენი მონიშვნა დაემატა ({n}).' },
  correct_ok: { ru: '✓ Спасибо! Исправление принято ({n}/{need}). Когда так же отметят другие люди в разные дни, мы проверим и перенесём точку.', en: '✓ Thanks! Fix recorded ({n}/{need}). When others agree on different days, we’ll check and move the point.', ka: '✓ მადლობა! გასწორება მიღებულია ({n}/{need}). როცა სხვებიც დაეთანხმებიან სხვადასხვა დღეს, შევამოწმებთ და წერტილს გადავიტანთ.' },
  correct_proposed: { ru: '✓ Спасибо! Достаточно людей согласны — исправление передано на проверку.', en: '✓ Thanks! Enough people agree — the fix has been sent for review.', ka: '✓ მადლობა! საკმარისი ადამიანი ეთანხმება — გასწორება შესამოწმებლად გადაეცა.' },
};
function langOf(code) { const c = String(code || '').toLowerCase(); return c.startsWith('ka') ? 'ka' : /^(ru|uk|be|kk)/.test(c) ? 'ru' : 'en'; }
function say(key, lang, vars = {}) {
  const e = T[key] || T.bad_payload;
  let s = e[lang] || e.en;
  for (const [k, v] of Object.entries(vars)) s = s.replace('{' + k + '}', v);
  return s;
}

// --- обработка пачки обновлений (без сети; тестируется в contrib-test.mjs) ---
export function processUpdates(state, updates, siteCoords, hash, nowMs = Date.now()) {
  const replies = [], events = [];
  let offset = state.offset || 0;
  for (const u of updates || []) {
    offset = Math.max(offset, u.update_id + 1);
    const msg = u.message; if (!msg || !msg.text || !msg.chat || msg.chat.type !== 'private') continue;
    const m = /^\/start(?:\s+(\S+))?/.exec(msg.text.trim()); if (!m) continue;
    const lang = langOf(msg.from && msg.from.language_code);
    const payload = m[1] || '';
    if (!payload) { replies.push({ chat_id: msg.chat.id, text: say('welcome', lang) }); continue; }
    const uid = hash(msg.from && msg.from.id);
    const when = (msg.date ? msg.date * 1000 : nowMs);
    const d = decodeHerePayload(payload);
    if (d.ok) {
      const g = userGuard(state, uid, d.lat, d.lng, when);
      if (!g.ok) { replies.push({ chat_id: msg.chat.id, text: say(g.reason, lang) }); continue; }
    }
    const res = castVote(state, siteCoords, payload, uid, new Date(when).toISOString());
    if (res.accepted) userCommit(state, uid, d.lat, d.lng, when);
    let text;
    if (!res.accepted) text = say(res.reason, lang, { d: res.dist_m });
    else if (res.kind === 'correct') {
      text = res.newlyProposed ? say('correct_proposed', lang) : say('correct_ok', lang, { n: res.count, need: CORRECT_N });
      if (res.newlyProposed) events.push({ type: 'correction', siteId: res.siteId, proposal: res.proposal });
    } else {
      text = res.count === VERIFY_N ? say('confirm_verified', lang)
        : res.count > VERIFY_N ? say('confirm_more', lang, { n: res.count })
        : say('confirm_ok', lang, { n: res.count, need: VERIFY_N });
    }
    replies.push({ chat_id: msg.chat.id, text });
  }
  state.offset = offset;
  return { replies, events, offset };
}

function loadSites() {
  const gj = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sites.geojson'), 'utf8'));
  const coords = new Map(), names = new Map();
  for (const f of gj.features || []) {
    coords.set(f.properties.id, { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], precision: f.properties.precision });
    const n = f.properties.name || {}; names.set(f.properties.id, n.ru || n.en || n.ka || f.properties.id);
  }
  return { coords, names };
}
function feedWithoutTime(f) { return JSON.stringify({ ...f, updated: null }); }

function writeFeedIfChanged(state, feedPath) {
  const feed = publicFeed(state, state.updated);
  const prev = fs.existsSync(feedPath) ? JSON.parse(fs.readFileSync(feedPath, 'utf8')) : null;
  const changed = !prev || feedWithoutTime(prev) !== feedWithoutTime(feed);
  if (changed) fs.writeFileSync(feedPath, JSON.stringify(feed, null, 2) + '\n');
  return changed;
}

// --- git/gh: только внутри GitHub Actions; локально и в тестах — no-op ---
function gitTry(args, cwd = ROOT) {
  if (!IN_ACTIONS) { console.log('[git:dry]', args.join(' ')); return null; }
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    const msg = String(e.stderr || e.message || '').trim().split('\n')[0];
    if (msg) console.error('[git]', msg);
    return null;
  }
}
const BOT_ID = ['-c', 'user.name=amg-contrib-bot', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com'];
function commitState(dir, msg, pending) {
  if (!IN_ACTIONS) return false;
  gitTry(['add', '-A'], dir);
  const dirty = (gitTry(['status', '--porcelain'], dir) || '').trim();
  if (dirty) {
    if (gitTry([...BOT_ID, 'commit', '-q', '-m', msg], dir) === null) return false;
    pending.add(dir);
  }
  if (!pending.has(dir)) return false;
  for (let i = 0; i < 3; i++) {
    if (gitTry(['push', '-q', 'origin', 'contrib-state'], dir) !== null) { pending.delete(dir); return true; }
    if (gitTry(['fetch', '-q', '--depth=1', 'origin', 'contrib-state'], dir) !== null) gitTry(['rebase', 'FETCH_HEAD'], dir);
  }
  return false;
}
function publishFeed() {
  if (!IN_ACTIONS) return false;
  gitTry(['add', 'data/contributions.json']);
  const dirty = (gitTry(['status', '--porcelain', 'data/contributions.json']) || '').trim();
  if (dirty && gitTry([...BOT_ID, 'commit', '-q', '-m', 'contrib: feed']) === null) return false;
  for (let i = 0; i < 3; i++) {
    if (gitTry(['push', '-q', 'origin', 'HEAD:main']) !== null) {
      // Пуш мог пройти, а dispatch — нет: остаёмся в pending, следующий проход повторит
      // (push будет no-op) и снова попробует запустить деплой.
      return dispatchWorkflow('pages.yml');
    }
    if (gitTry(['pull', '-q', '--rebase', 'origin', 'main']) === null) gitTry(['rebase', '--abort']);
  }
  return false;
}
function dispatchWorkflow(file, inputs = {}) {
  if (!IN_ACTIONS) { console.log('[dispatch:dry]', file); return false; }
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return false;
  const args = ['workflow', 'run', file, '--ref', 'main', '-R', repo];
  for (const [k, v] of Object.entries(inputs)) args.push('-f', `${k}=${v}`);
  try {
    execFileSync('gh', args, {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GH_TOKEN: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '' },
    });
    console.log('[dispatch]', file, JSON.stringify(inputs));
    return true;
  } catch (e) {
    console.error('[dispatch]', String(e.stderr || e.message).trim().split('\n')[0]);
    return false;
  }
}
function heartbeatDue(dir) {
  if (!HEARTBEAT_DAYS) return false;
  try {
    const t = Date.parse(fs.readFileSync(path.join(dir, 'heartbeat'), 'utf8').trim());
    return !Number.isFinite(t) || Date.now() - t >= HEARTBEAT_DAYS * 86400000;
  } catch { return true; }
}
function touchHeartbeat(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'heartbeat'), new Date().toISOString() + '\n');
}

async function pollOnce(ctx) {
  const q = `?timeout=${ctx.timeout}&limit=100&allowed_updates=${encodeURIComponent('["message"]')}&offset=${ctx.state.offset || 0}`;
  const r = await fetch(ctx.api('getUpdates', q), { signal: AbortSignal.timeout(POLL_ABORT_MS) });
  const j = await r.json();
  if (!j.ok) {
    const err = new Error('getUpdates: ' + (j.description || r.status));
    if (r.status === 401 || r.status === 403) err.fatal = true;   // токен неверный/отозван — не крутить 5,5 ч
    throw err;
  }
  const updates = j.result || [];
  const res = processUpdates(ctx.state, updates, ctx.coords, ctx.hash);
  for (const rep of res.replies) {
    await fetch(ctx.api('sendMessage'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: rep.chat_id, text: rep.text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(20000),
    }).catch(() => {});
  }
  for (const ev of res.events) await openCorrectionIssue(ev, ctx.names, ctx.coords).catch(e => console.error('[issue]', e.message));
  if (updates.length) {
    ctx.state.updated = new Date().toISOString();
    fs.mkdirSync(path.dirname(ctx.statePath), { recursive: true });
    fs.writeFileSync(ctx.statePath, encryptState(ctx.key, ctx.state));
    // Подтверждаем offset только после записи состояния: сбой процесса не потеряет голос.
    await fetch(ctx.api('getUpdates', `?timeout=0&limit=1&offset=${ctx.state.offset}`), { signal: AbortSignal.timeout(20000) }).catch(() => {});
  }
  return { updates: updates.length, replies: res.replies.length, events: res.events.length };
}

// Дежурство: длинный polling до дедлайна, состояние/фид пишутся и коммитятся по ходу.
async function runLoop(ctx) {
  const dir = path.dirname(ctx.statePath);
  const statePending = new Set();
  const deadline = Date.now() + LOOP_SECONDS * 1000;
  let feedPending = false;
  if (heartbeatDue(dir)) {
    touchHeartbeat(dir);
    commitState(dir, 'contrib: heartbeat', statePending);
    console.log('[loop] heartbeat');
  }
  console.log(`[loop] start: ${Math.round(LOOP_SECONDS / 60)} мин, long poll ${POLL_TIMEOUT} с`);
  let failures = 0;
  while (Date.now() < deadline) {
    let pass;
    try { pass = await pollOnce(ctx); }
    catch (e) {
      failures++;
      console.error(`[loop] poll (${failures}):`, e.message);
      // Останавливаем дежурство, чтобы не жечь 5,5 ч job'а впустую; schedule перезапустит позже.
      if (e.fatal || failures >= 20) { console.error('[loop] стоп: повторяющаяся ошибка'); process.exitCode = 1; return; }
      await new Promise(res => setTimeout(res, 5000));
      continue;
    }
    failures = 0;
    if (pass.updates) {
      commitState(dir, 'contrib: state', statePending);
      if (writeFeedIfChanged(ctx.state, ctx.feedPath)) feedPending = true;
    } else if (statePending.has(dir)) {
      commitState(dir, 'contrib: state', statePending);
    }
    if (feedPending && publishFeed()) feedPending = false;
    console.log(`[loop] updates=${pass.updates} replies=${pass.replies} corrections=${pass.events} left=${Math.max(0, Math.round((deadline - Date.now()) / 1000))}s`);
    if (!pass.updates) await new Promise(res => setTimeout(res, 1000));
  }
  commitState(dir, 'contrib: state', statePending);
  if (writeFeedIfChanged(ctx.state, ctx.feedPath)) feedPending = true;
  if (feedPending) publishFeed();
  console.log('[loop] done');
}

async function openCorrectionIssue(ev, names, coords) {
  const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
  const s = coords.get(ev.siteId), p = ev.proposal;
  const title = `[${ev.siteId}] Коррекция точки — ${names.get(ev.siteId)}`;
  const body = [
    `Бот: ${p.n} человек(а) в ${p.days} разных дня(ей), стоя на месте, отметили, что объект не там, где метка.`,
    '', `- Сейчас: \`${s.lat.toFixed(5)},${s.lng.toFixed(5)}\``,
    `- Предложено (медиана): \`${p.lat},${p.lng}\` — в ${p.from_m} м от текущей, разброс голосов ${p.spread_m} м`,
    `- Объект на сайте: ${SITE_URL}#s=${encodeURIComponent(ev.siteId)}`,
    `- Посмотреть предложенную точку: https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=19/${p.lat}/${p.lng}`,
    '', 'Проверьте на спутнике/улице и, если согласны, поправьте координаты в `data/sites.geojson` (и `precision`).',
  ].join('\n');
  if (!repo || !token) { console.log('[issue:dry]', title); return; }
  const r = await fetch(`https://api.github.com/repos/${repo}/issues`, { method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body, labels: ['report'] }) });
  console.log('[issue]', r.status, title);
}

async function main() {
  const TOKEN = process.env.AMG_BOT_TOKEN || '';
  const { coords, names } = loadSites();
  const feedPath = path.resolve(ROOT, process.env.AMG_FEED_FILE || 'data/contributions.json');
  const out = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };

  if (!TOKEN) {   // пробный прогон: без сети, на выдуманных сообщениях
    const st = emptyState(), fake = (id, from, p, lang) => ({ update_id: id, message: { chat: { id: from, type: 'private' }, from: { id: from, language_code: lang }, date: 1793000000 + id * 3600, text: '/start ' + p } });
    const [lng, lat] = [44.8056267, 41.6972943];
    const res = processUpdates(st, [fake(1, 11, encodeHerePayload('site-0003', lat, lng), 'ru'), fake(2, 22, encodeHerePayload('site-0003', lat + 0.0002, lng), 'en'),
      { update_id: 3, message: { chat: { id: 33, type: 'private' }, from: { id: 33, language_code: 'ka' }, text: '/start' } }], coords, x => 'u' + x);
    for (const r of res.replies) console.log('[dry] →', r.chat_id, r.text);
    console.log('[dry] feed:', JSON.stringify(publicFeed(st, 'dry')));
    out('feed_changed', 'false');
    return;
  }

  const key = stateKey(process.env.AMG_STATE_KEY);
  const statePath = path.resolve(ROOT, process.env.AMG_STATE_FILE || 'state/contrib-state.enc');
  const state = fs.existsSync(statePath) ? decryptState(key, fs.readFileSync(statePath, 'utf8')) : emptyState();
  const TG = (process.env.AMG_TG_API || 'https://api.telegram.org').replace(/\/$/, '');
  const api = (m, q = '') => `${TG}/bot${TOKEN}/${m}${q}`;
  const ctx = { key, state, statePath, coords, names, feedPath, api, hash: x => hashUid(key, x), timeout: POLL_TIMEOUT };

  if (LOOP_SECONDS > 0) {
    await runLoop(ctx);
    out('feed_changed', 'false');
    return;
  }

  const res = await pollOnce(ctx);
  const changed = writeFeedIfChanged(state, feedPath);
  out('feed_changed', String(changed));
  console.log(`[bot] updates=${res.updates} replies=${res.replies} corrections=${res.events} feed_changed=${changed}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error('[bot] fatal:', e.message); process.exit(1); });
}
