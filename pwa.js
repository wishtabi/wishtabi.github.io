/* وش تبي — تثبيت التطبيق على الجوال (PWA)
   يسجّل الـ Service Worker، ويعرض شريط "ثبّت التطبيق":
   - أندرويد/هواوي (Chrome، Edge، Samsung): زر تثبيت مباشر.
   - آيفون (Safari): شرح بالخطوات من زر المشاركة.
   لإخفاء الشريط في صفحة معيّنة: <script src="/pwa.js" data-banner="off"></script>
   الواجهة البرمجية: window.WT_PWA = { platform, standalone, canPrompt(), install(), guide() } */
(function () {
  var me = document.currentScript;
  var showBanner = !(me && me.getAttribute('data-banner') === 'off');

  if ('serviceWorker' in navigator) {
    addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }

  // من يفتح التطبيق من أيقونته يصل بـ ?src=app (start_url في manifest) — نتذكّره ولا نعرض له شريط التثبيت مرة ثانية
  var APPKEY = 'wt_app';
  function markApp() { try { localStorage.setItem(APPKEY, '1'); } catch (e) {} }
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('src') === 'app') { markApp(); q.delete('src'); history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }
  } catch (e) {}
  var fromIcon = false; try { fromIcon = localStorage.getItem(APPKEY) === '1'; } catch (e) {}

  var ua = navigator.userAgent;
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)').matches) || navigator.standalone === true || fromIcon;
  var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var inApp = /FBAN|FBAV|Instagram|Snapchat|Line\/|TikTok|musical_ly|Twitter|; wv\)/.test(ua);
  var iosSafari = ios && !inApp && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
  var huawei = /HUAWEI|HONOR|HarmonyOS|HuaweiBrowser/i.test(ua);
  var android = /Android/.test(ua);
  var platform = ios ? 'ios' : huawei ? 'huawei' : android ? 'android' : 'desktop';

  var KEY = 'wt_install_later', deferred = null, bar = null;
  function snoozed() { try { return +localStorage.getItem(KEY) > Date.now(); } catch (e) { return false; } }
  function snooze(days) { try { localStorage.setItem(KEY, String(Date.now() + days * 864e5)); } catch (e) {} }

  var css = document.createElement('style');
  css.textContent =
    '.wti{position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));margin:0 auto;max-width:456px;z-index:9990;background:#1B2A4A;color:#fff;border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,.28);padding:12px;display:flex;align-items:center;gap:10px;font-family:Tajawal,system-ui,sans-serif;direction:rtl;transform:translateY(16px);opacity:0;transition:transform .3s,opacity .3s}' +
    '.wti.on{transform:none;opacity:1}' +
    '.wti img{width:44px;height:44px;border-radius:11px;flex:none}' +
    '.wti .t{flex:1;min-width:0;line-height:1.35}.wti .t b{display:block;font-size:15px}.wti .t small{font-size:12.5px;opacity:.8}' +
    '.wti .go{background:#EB8420;color:#fff;border:0;border-radius:11px;padding:9px 14px;font:inherit;font-weight:700;font-size:14px;flex:none;cursor:pointer}' +
    '.wti .x{background:none;border:0;color:#fff;opacity:.6;font-size:22px;width:30px;height:30px;flex:none;line-height:1;cursor:pointer}' +
    '.wtg{position:fixed;inset:0;z-index:9995;background:rgba(10,17,33,.55);display:flex;align-items:flex-end;justify-content:center;font-family:Tajawal,system-ui,sans-serif;direction:rtl}' +
    '.wtg .s{background:#fff;color:#16233F;width:100%;max-width:480px;border-radius:22px 22px 0 0;padding:20px 20px calc(22px + env(safe-area-inset-bottom));animation:wtup .28s ease}' +
    '@keyframes wtup{from{transform:translateY(40px);opacity:0}}' +
    '.wtg h3{margin:0 0 4px;font-size:19px}.wtg p{margin:0 0 14px;color:#66708A;font-size:14px}' +
    '.wtg ol{list-style:none;margin:0 0 16px;padding:0;display:grid;gap:10px;counter-reset:s}' +
    '.wtg li{counter-increment:s;display:flex;gap:12px;align-items:center;background:#F2F4F8;border-radius:14px;padding:11px 12px;font-size:15px;line-height:1.45}' +
    '.wtg li:before{content:counter(s);flex:none;width:28px;height:28px;border-radius:50%;background:#EB8420;color:#fff;font-weight:800;display:grid;place-items:center}' +
    '.wtg li svg{width:20px;height:20px;vertical-align:-4px;color:#2D58B3}' +
    '.wtg .ok{width:100%;background:#1B2A4A;color:#fff;border:0;border-radius:14px;padding:13px;font:inherit;font-weight:700;font-size:16px;cursor:pointer}' +
    '@media (prefers-color-scheme:dark){.wtg .s{background:#162035;color:#E7EBF4}.wtg li{background:#0D1322}.wtg p{color:#97A1BA}.wtg li svg{color:#82A5F1}}';
  document.head.appendChild(css);

  var SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>';
  var PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  var DOTS = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';

  function guide() {
    var steps, title = 'تثبيت وش تبي على جوالك', sub = 'خطوات بسيطة، ويصير التطبيق على شاشتك مثل أي تطبيق.';
    if (ios && !iosSafari) {
      sub = 'التثبيت في الآيفون يكون من متصفح Safari.';
      steps = ['انسخ رابط الصفحة', 'افتح <b>Safari</b> والصق الرابط', 'اضغط زر المشاركة ' + SHARE + ' ثم <b>«إضافة إلى الشاشة الرئيسية»</b>'];
    } else if (ios) {
      steps = ['اضغط زر المشاركة ' + SHARE + ' أسفل الشاشة <small>(أو ··· ثم مشاركة)</small>', 'مرّر واختر <b>«إضافة إلى الشاشة الرئيسية»</b> ' + PLUS, 'اضغط <b>«إضافة»</b> — وتلقى التطبيق على شاشتك'];
    } else if (inApp) {
      sub = 'أنت تفتح الرابط من داخل تطبيق آخر.';
      steps = ['اضغط القائمة ' + DOTS + ' أعلى الصفحة', 'اختر <b>«فتح في المتصفح»</b>', 'من المتصفح اضغط <b>«تثبيت التطبيق»</b>'];
    } else if (huawei) {
      steps = ['افتح الرابط في <b>متصفح هواوي</b> (Browser)', 'اضغط القائمة ☰ أو ' + DOTS, 'اختر <b>«إضافة إلى»</b> ثم <b>«الشاشة الرئيسية»</b>'];
    } else {
      steps = ['افتح الرابط في <b>Chrome</b>', 'اضغط القائمة ' + DOTS + ' أعلى الشاشة', 'اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>'];
    }
    var o = document.createElement('div');
    o.className = 'wtg';
    o.innerHTML = '<div class="s" role="dialog" aria-modal="true" aria-label="' + title + '"><h3>' + title + '</h3><p>' + sub + '</p><ol>' +
      steps.map(function (s) { return '<li><span>' + s + '</span></li>'; }).join('') + '</ol><button class="ok" type="button">تمام</button></div>';
    function close() { o.remove(); }
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    o.querySelector('.ok').onclick = close;
    document.body.appendChild(o);
  }

  function install() {
    if (deferred) {
      var d = deferred; deferred = null;
      d.prompt();
      return d.userChoice.then(function (r) { if (r.outcome === 'accepted') markApp(); else snooze(3); hideBar(); return r.outcome; });
    }
    guide();
    return Promise.resolve('guide');
  }

  function hideBar() { if (bar) { bar.classList.remove('on'); var b = bar; bar = null; setTimeout(function () { b.remove(); }, 300); } }
  function showBar(sub, btn) {
    if (!showBanner || standalone || bar || snoozed()) return;
    bar = document.createElement('div');
    bar.className = 'wti';
    bar.innerHTML = '<img src="/icons/icon-192.png" alt=""><div class="t"><b>ثبّت تطبيق وش تبي</b><small>' + sub + '</small></div>' +
      '<button class="go" type="button">' + btn + '</button><button class="x" type="button" aria-label="لاحقاً">×</button>';
    document.body.appendChild(bar);
    requestAnimationFrame(function () { requestAnimationFrame(function () { bar && bar.classList.add('on'); }); });
    bar.querySelector('.go').onclick = function () { install(); if (!deferred) hideBar(); };
    bar.querySelector('.x').onclick = function () { snooze(7); hideBar(); };
  }

  addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    document.dispatchEvent(new Event('wt-installable'));
    setTimeout(function () { if (deferred) showBar('يصير على شاشة جوالك مثل أي تطبيق', 'تثبيت'); }, 2500);
  });
  addEventListener('appinstalled', function () { markApp(); deferred = null; hideBar(); document.dispatchEvent(new Event('wt-installed')); });
  if (ios && !standalone) setTimeout(function () { showBar('بخطوتين من زر المشاركة', 'الطريقة'); }, 3500);

  window.WT_PWA = {
    platform: platform, ios: ios, iosSafari: iosSafari, inApp: inApp, standalone: standalone,
    canPrompt: function () { return !!deferred; }, install: install, guide: guide
  };
})();
