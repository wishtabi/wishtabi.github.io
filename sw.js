/* وش تبي — Service Worker
   - صفحات التطبيق: من الشبكة أولاً (أي تحديث ترفعه يوصل للناس فوراً)، ومن النسخة المحفوظة عند انقطاع النت.
   - الخطوط ومكتبة الخرائط: من النسخة المحفوظة أولاً (أسرع فتح).
   - طلبات الخادم (Apps Script) والخرائط وبيئة التطوير /dev/: لا تُلمس إطلاقاً.
   عند تعديل هذا الملف غيّر رقم الإصدار V. */
const V = 'wt-v3';
const CORE = ['/', '/download/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'];
const CDN = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const OFFLINE = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>وش تبي</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#1B2A4A;color:#fff;font-family:Tajawal,system-ui,sans-serif;text-align:center;padding:24px">
<div><img src="/icons/icon-192.png" width="88" height="88" style="border-radius:22px" alt=""><h2>ما فيه اتصال بالإنترنت</h2><p style="opacity:.8">تأكد من الشبكة وجرّب مرة ثانية.</p>
<button onclick="location.reload()" style="background:#EB8420;color:#fff;border:0;border-radius:12px;padding:12px 26px;font:inherit;font-weight:700">حاول مرة ثانية</button></div></body></html>`;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    if (url.pathname.startsWith('/dev/')) return;           // بيئة التطوير خارج التخزين
    if (req.mode === 'navigate') {                           // صفحات: الشبكة أولاً
      e.respondWith(fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(url.pathname, copy)); }
        return res;
      }).catch(() => caches.match(url.pathname).then(r => r || caches.match('/'))
        .then(r => r || new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))));
      return;
    }
    e.respondWith(caches.match(req).then(hit => {             // ملفات ثابتة: المحفوظ ثم التحديث بالخلفية
      const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(req, copy)); } return res; });
      return hit ? (net.catch(() => {}), hit) : net;
    }));
    return;
  }

  if (CDN.includes(url.hostname)) {                          // خطوط ومكتبات: المحفوظ أولاً
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(V).then(c => c.put(req, copy)); }
      return res;
    })));
  }
  // غير ذلك (الخادم، الخرائط...) يمر مباشرة للشبكة
});
