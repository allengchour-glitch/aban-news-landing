/* aban Partner-Box — kontextbezogene Affiliate-Box, EHRLICH & gegated.
   Verwendung: <div data-partner="AUTO_VERSICHERUNG_URL" data-text="KFZ-Versicherung vergleichen und sparen"
                    data-cta="Vergleichen"></div>
   Zeigt die Box NUR, wenn window.ABAN_AFFILIATE[KEY] gefüllt ist (sonst bleibt der Slot leer).
   Immer sichtbar als „Anzeige · Partner" gekennzeichnet, Link rel="sponsored noopener".
   Lädt nach js/affiliate-config.js. Self-styled (.abn-pbox), idempotent, druck-ausgeblendet. */
(function () {
  if (window.__abanPartnerBox) return;
  window.__abanPartnerBox = true;
  function run() {
    var cfg = window.ABAN_AFFILIATE || {};
    var slots = document.querySelectorAll("[data-partner]");
    if (!slots.length) return;
    var injectedCss = false;
    function css() {
      if (injectedCss) return; injectedCss = true;
      var s = document.createElement("style");
      s.textContent =
        ".abn-pbox{border:1px solid #e6e1d6;border-radius:14px;background:#fff;padding:14px 16px;margin:4px 0}" +
        ".abn-pbox .lab{font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;color:#9a8e76;font-weight:700;margin-bottom:6px}" +
        ".abn-pbox .tt{font-weight:700;font-size:.95rem;color:#1f2937;margin-bottom:8px;line-height:1.3}" +
        ".abn-pbox a.abn-pb-cta{display:inline-block;background:#b45309;color:#fff;border-radius:18px;padding:8px 16px;font-weight:700;font-size:.85rem;text-decoration:none}" +
        ".abn-pbox a.abn-pb-cta:hover{background:#a04708}" +
        "@media print{.abn-pbox{display:none}}";
      document.head.appendChild(s);
    }
    function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    Array.prototype.forEach.call(slots, function (el) {
      if (el.getAttribute("data-pb-done")) return;
      var key = el.getAttribute("data-partner");
      var url = key && cfg[key];
      if (!url) { el.style.display = "none"; return; } // gegated: kein Link -> nichts anzeigen
      css();
      var text = el.getAttribute("data-text") || "Partner-Angebot ansehen";
      var cta = el.getAttribute("data-cta") || "Zum Angebot";
      el.className = (el.className ? el.className + " " : "") + "abn-pbox";
      el.innerHTML = '<div class="lab">Anzeige · Partner</div><div class="tt">' + esc(text) + '</div>' +
        '<a class="abn-pb-cta" href="' + esc(url) + '" target="_blank" rel="sponsored noopener nofollow">' + esc(cta) + ' →</a>';
      el.setAttribute("data-pb-done", "1");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
