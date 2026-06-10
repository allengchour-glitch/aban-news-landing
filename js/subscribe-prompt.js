/* aban news — dezenter Exit-Intent / Scroll-Subscribe-Prompt.
   Kein Tracking, kein externes Skript, DSGVO-safe. Zeigt sich einmal pro
   30 Tage (localStorage), bei Verlassen-Absicht (Desktop) oder 60% Scroll.
   Respektiert prefers-reduced-motion, schliessbar per Button/Esc/Backdrop. */
(function () {
  "use strict";
  var KEY = "aban_sub_prompt_seen";
  var DAYS = 30;

  // already subscribed (came back via willkommen) or recently seen -> skip
  try {
    var seen = localStorage.getItem(KEY);
    if (seen && (Date.now() - parseInt(seen, 10)) < DAYS * 864e5) return;
  } catch (e) { /* localStorage blocked -> show once per page load */ }

  var shown = false;

  function markSeen() {
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
  }

  function build() {
    var wrap = document.createElement("div");
    wrap.className = "aban-sp-backdrop";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-label", "aban news abonnieren");
    wrap.innerHTML =
      '<div class="aban-sp-box">' +
        '<button class="aban-sp-close" type="button" aria-label="Schliessen">&times;</button>' +
        '<p class="aban-sp-kicker">☕ Bevor du gehst</p>' +
        '<p class="aban-sp-title">aban news: Mo&ndash;Fr morgens, 3&ndash;5 Min, kein Hype.</p>' +
        '<p class="aban-sp-sub">Der ehrliche KI-Newsletter f&uuml;r DACH. Kostenlos, jederzeit 1-Klick abbestellbar.</p>' +
        '<form class="aban-sp-form" action="https://abannews.beehiiv.com/subscribe" method="get" novalidate>' +
          '<label class="aban-sp-sronly" for="aban-sp-email">E-Mail-Adresse</label>' +
          '<input id="aban-sp-email" type="email" name="email" required placeholder="deine@email.de" autocomplete="email">' +
          '<button type="submit">Kostenlos abonnieren &rarr;</button>' +
        '</form>' +
        '<p class="aban-sp-trust">DSGVO-konform &middot; kein Spam &middot; kein Tracking-Pixel</p>' +
      '</div>';
    return wrap;
  }

  function injectStyles() {
    var css =
      '.aban-sp-backdrop{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;' +
      'justify-content:center;padding:1rem;background:rgba(35,23,8,.55);opacity:0;transition:opacity .2s}' +
      '.aban-sp-backdrop.aban-sp-on{opacity:1}' +
      '.aban-sp-box{position:relative;max-width:30rem;width:100%;background:#fffdf9;color:#1f2937;' +
      'border:1px solid #d97706;border-radius:14px;padding:1.75rem;box-shadow:0 16px 50px rgba(35,23,8,.3);' +
      'font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}' +
      '.aban-sp-close{position:absolute;top:.5rem;right:.7rem;border:0;background:none;font-size:1.6rem;' +
      'line-height:1;color:#9ca3af;cursor:pointer}.aban-sp-close:hover{color:#1f2937}' +
      '.aban-sp-kicker{margin:0 0 .35rem;font-size:.8rem;font-weight:600;color:#b45309;' +
      'text-transform:uppercase;letter-spacing:.04em}' +
      '.aban-sp-title{margin:0 0 .5rem;font-size:1.25rem;font-weight:800;line-height:1.3}' +
      '.aban-sp-sub{margin:0 0 1rem;font-size:.95rem;color:#4b5563;line-height:1.5}' +
      '.aban-sp-form{display:flex;flex-wrap:wrap;gap:.5rem}' +
      '.aban-sp-form input{flex:1 1 12rem;min-width:0;padding:.7rem .9rem;font-size:1rem;' +
      'border:1px solid #e5e7eb;border-radius:6px;background:#fff;color:#1f2937}' +
      '.aban-sp-form input:focus-visible{outline:2px solid #d97706;outline-offset:1px}' +
      '.aban-sp-form button{flex:0 0 auto;padding:.7rem 1.1rem;font-size:1rem;font-weight:700;' +
      'border:0;border-radius:6px;background:#d97706;color:#fff;cursor:pointer}' +
      '.aban-sp-form button:hover{background:#b45309}' +
      '.aban-sp-trust{margin:.85rem 0 0;font-size:.78rem;color:#6b7280}' +
      '.aban-sp-sronly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;' +
      'clip:rect(0 0 0 0);white-space:nowrap;border:0}' +
      '@media (prefers-reduced-motion:reduce){.aban-sp-backdrop{transition:none}}';
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }

  var node = null;
  function close() {
    if (!node) return;
    node.classList.remove("aban-sp-on");
    markSeen();
    var n = node; node = null;
    setTimeout(function () { if (n && n.parentNode) n.parentNode.removeChild(n); }, 220);
  }

  function show() {
    if (shown) return;
    shown = true;
    injectStyles();
    node = build();
    node.addEventListener("click", function (e) {
      if (e.target === node || e.target.classList.contains("aban-sp-close")) close();
    });
    document.body.appendChild(node);
    requestAnimationFrame(function () { node.classList.add("aban-sp-on"); });
    var input = node.querySelector("input");
    if (input) { try { input.focus(); } catch (e) {} }
  }

  // Trigger 1: desktop exit-intent (cursor leaves viewport top)
  document.addEventListener("mouseout", function (e) {
    if (!e.relatedTarget && e.clientY <= 0) show();
  });
  // Trigger 2: scrolled past 60% (works on mobile/touch)
  window.addEventListener("scroll", function () {
    var h = document.documentElement;
    var pct = (h.scrollTop + window.innerHeight) / h.scrollHeight;
    if (pct >= 0.6) show();
  }, { passive: true });
  // Esc closes
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
})();
