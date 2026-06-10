/* aban news — dezenter Sprach-Hinweis (kein Auto-Redirect, dismissbar, kein Tracking).
   Zeigt einen Banner, wenn die Browsersprache von der Seitensprache abweicht und es
   eine passende <link rel="alternate" hreflang="…"> gibt. Nur DE↔EN. */
(function () {
  try {
    var pageLang = (document.documentElement.lang || 'de').slice(0, 2).toLowerCase();
    var navLang = (navigator.language || navigator.userLanguage || '').slice(0, 2).toLowerCase();
    if (!navLang || navLang === pageLang) return;
    if (navLang !== 'en' && navLang !== 'de') return;

    var KEY = 'aban_lang_dismiss';
    try { if (localStorage.getItem(KEY)) return; } catch (e) {}

    var alt = document.querySelector('link[rel="alternate"][hreflang="' + navLang + '"]');
    var url = alt && alt.getAttribute('href');
    if (!url) return;
    // gleiche Seite? dann nichts anbieten
    var a0 = document.createElement('a'); a0.href = url;
    if (a0.href === location.href) return;

    var msg = {
      en: ['This page is also available in English.', 'View in English', 'Dismiss'],
      de: ['Diese Seite gibt es auch auf Deutsch.', 'Auf Deutsch ansehen', 'Schliessen']
    }[navLang];

    var bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:60;background:#15202b;color:#fff;' +
      'padding:.7rem 1rem;display:flex;gap:.9rem;align-items:center;justify-content:center;flex-wrap:wrap;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:.92rem;font-weight:600;' +
      'box-shadow:0 -6px 20px rgba(0,0,0,.18)';

    var span = document.createElement('span'); span.textContent = msg[0];
    var link = document.createElement('a');
    link.href = url; link.textContent = msg[1] + ' →';
    link.style.cssText = 'color:#fbbf24;font-weight:800;text-decoration:none';
    var x = document.createElement('button');
    x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', msg[2]);
    x.style.cssText = 'background:none;border:0;color:#cbd5e1;font-size:1.1rem;cursor:pointer;line-height:1;padding:.1rem .4rem';
    x.addEventListener('click', function () {
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      if (bar.parentNode) bar.parentNode.removeChild(bar);
    });

    bar.appendChild(span); bar.appendChild(link); bar.appendChild(x);
    document.body.appendChild(bar);
  } catch (e) {}
})();
