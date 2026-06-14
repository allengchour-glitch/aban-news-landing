/* aban Ad-Slot — Google-AdSense-Platzierungen, EHRLICH & gegated.
   Verwendung: <div data-ad-slot="kategorie-mid"></div>
   Zeigt Werbung NUR, wenn window.ABAN_ADS.ADSENSE_CLIENT gesetzt ist (sonst bleibt der Slot leer).
   Lädt das AdSense-Script genau einmal; jede Anzeige ist als „Anzeige" gekennzeichnet (Pflicht).
   Lädt nach js/ads-config.js. Self-styled (.abn-ad), idempotent, druck-ausgeblendet. */
(function () {
  if (window.__abanAdSlot) return;
  window.__abanAdSlot = true;
  function run() {
    var cfg = window.ABAN_ADS || {};
    var client = cfg.ADSENSE_CLIENT || "";
    var slots = document.querySelectorAll("[data-ad-slot]");
    if (!slots.length) return;
    if (!client) { Array.prototype.forEach.call(slots, function (el) { el.style.display = "none"; }); return; }

    var s = document.createElement("style");
    s.textContent =
      ".abn-ad{margin:12px 0;text-align:center}.abn-ad .lab{font-size:.66rem;text-transform:uppercase;letter-spacing:.05em;color:#9a8e76;font-weight:700;margin-bottom:4px}" +
      "@media print{.abn-ad{display:none}}";
    document.head.appendChild(s);

    // AdSense-Loader einmalig
    if (!document.querySelector('script[data-aban-adsense]')) {
      var sc = document.createElement("script");
      sc.async = true;
      sc.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(client);
      sc.crossOrigin = "anonymous";
      sc.setAttribute("data-aban-adsense", "1");
      document.head.appendChild(sc);
    }

    Array.prototype.forEach.call(slots, function (el) {
      if (el.getAttribute("data-ad-done")) return;
      var slotId = (cfg.SLOTS && cfg.SLOTS[el.getAttribute("data-ad-slot")]) || "";
      el.className = (el.className ? el.className + " " : "") + "abn-ad";
      var ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.display = "block";
      ins.setAttribute("data-ad-client", client);
      if (slotId) ins.setAttribute("data-ad-slot", slotId);
      ins.setAttribute("data-ad-format", "auto");
      ins.setAttribute("data-full-width-responsive", "true");
      el.innerHTML = '<div class="lab">Anzeige</div>';
      el.appendChild(ins);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
      el.setAttribute("data-ad-done", "1");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
