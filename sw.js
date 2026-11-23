/* وش تبي: ملف التشغيل كتطبيق
   الصفحة تُجلب من الشبكة دائماً (عشان التحديثات توصل فوراً)، والنسخة المحفوظة للطوارئ بدون إنترنت فقط.
   طلبات الخادم (Apps Script) لا تمر من هنا ولا تُحفظ. */
const CACHE = 'wishtabi-v1';
const SHELL = ['./', './icon-192.png', './icon-512.png', './manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put('./', cp)); return res; }).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r)));
});
