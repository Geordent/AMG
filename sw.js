// Кэш оболочки приложения. Тайлы карты хранятся отдельно, в IndexedDB, этим файлом они не трогаются.
const CACHE = 'amg-shell-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const u = new URL(req.url);
  if (u.hostname === 'demo-bucket.protomaps.com') return;
  const isPage = req.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('index.html');
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    if (isPage) {
      try { const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; }
      catch (err) { return (await c.match(req)) || (await c.match('./')) || Response.error(); }
    }
    const hit = await c.match(req);
    if (hit) return hit;
    try { const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }
    catch (err) { return Response.error(); }
  })());
});
