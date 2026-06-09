/* aban news — site-weite Ankündigungs-Leiste (Header-Banner).
   Schlank, schließbar (7 Tage Ruhe via localStorage), sprach-bewusst (de/en),
   rotiert durch mehrere Botschaften. Einbinden mit:
   <script defer src="/js/announce.js"></script>  (vor </body>) */
(function () {
  "use strict";
  try {
    var raw = localStorage.getItem("aban_announce_dismissed");
    if (raw && (Date.now() - parseInt(raw, 10)) < 7 * 24 * 3600 * 1000) return;
  } catch (e) {}

  var en = (document.documentElement.lang || "").toLowerCase().indexOf("en") === 0;
  var SUB = "https://abannews.beehiiv.com/subscribe";
  var msgs = en ? [
    { t: "🔎 Are you recommended by AI? <b>Check free</b> →", h: "/ki-erwaehnungs-check.html" },
    { t: "✍️ Free AI Toolkit — texts &amp; a roadmap in minutes →", h: "/en/ki-werkzeug.html" },
    { t: "📬 Daily 5-min AI briefing — <b>subscribe free</b> →", h: SUB }
  ] : [
    { t: "🔎 Wirst du von KI empfohlen? <b>Gratis prüfen</b> →", h: "/ki-erwaehnungs-check.html" },
    { t: "✍️ Gratis KI-Werkzeug — Texte &amp; Fahrplan in Minuten →", h: "/ki-werkzeug.html" },
    { t: "📬 Täglich 5-Min-KI-Briefing — <b>gratis abonnieren</b> →", h: SUB }
  ];

  var css = document.createElement("style");
  css.textContent =
    "#aban-ann{position:relative;z-index:40;background:#b45309;color:#fff;" +
    "font:600 .9rem/1.35 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;" +
    "text-align:center;padding:9px 42px 9px 16px}" +
    "#aban-ann a{color:#fff;text-decoration:none;display:inline-block;max-width:100%;" +
    "border:1px solid rgba(255,255,255,.65);border-radius:999px;padding:3px 13px;font-weight:700}" +
    "#aban-ann a:hover{background:rgba(255,255,255,.18);text-decoration:none}" +
    "#aban-ann .m{transition:opacity .4s ease}" +
    "#aban-ann .x{position:absolute;right:6px;top:50%;transform:translateY(-50%);" +
    "background:transparent;border:0;color:#fff;font-size:1.15rem;line-height:1;cursor:pointer;" +
    "padding:4px 9px;opacity:.85;border-radius:6px}" +
    "#aban-ann .x:hover{opacity:1;background:rgba(255,255,255,.15)}" +
    "@media(prefers-color-scheme:dark){#aban-ann{background:#92400e}}";
  document.head.appendChild(css);

  var bar = document.createElement("div");
  bar.id = "aban-ann";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", en ? "Announcement" : "Ankündigung");

  var link = document.createElement("a");
  link.className = "m";
  var i = Math.floor(Math.random() * msgs.length);
  function render() { link.innerHTML = msgs[i].t; link.href = msgs[i].h; }
  render();

  var close = document.createElement("button");
  close.className = "x";
  close.type = "button";
  close.setAttribute("aria-label", en ? "Dismiss" : "Schließen");
  close.innerHTML = "×";
  close.addEventListener("click", function () {
    try { localStorage.setItem("aban_announce_dismissed", String(Date.now())); } catch (e) {}
    bar.parentNode && bar.parentNode.removeChild(bar);
    if (timer) clearInterval(timer);
  });

  bar.appendChild(link);
  bar.appendChild(close);
  document.body.insertBefore(bar, document.body.firstChild);

  var timer = null;
  if (msgs.length > 1 && !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    timer = setInterval(function () {
      link.style.opacity = "0";
      setTimeout(function () { i = (i + 1) % msgs.length; render(); link.style.opacity = "1"; }, 400);
    }, 6000);
  }
})();
