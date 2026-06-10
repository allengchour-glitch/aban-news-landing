/* aban news — Scroll-Reveal + sticky/kondensierte Kopfzeile.
   Self-hosted, kein Tracking. Respektiert prefers-reduced-motion. */
(function () {
  "use strict";

  // --- Sticky-Kopfzeile: Schatten/Kondensieren ab etwas Scroll ---
  var header = document.querySelector("header.site-header");
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 40) header.classList.add("is-stuck");
      else header.classList.remove("is-stuck");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // --- Scroll-Reveal ---
  // Fail-safe: Ohne .reveal-ready versteckt das CSS nichts. Wir setzen die Klasse
  // erst, wenn wir die Elemente auch aktiv wieder einblenden können. Lädt dieses
  // Skript nicht, bleiben alle Inhalte sichtbar (SEO/No-JS-freundlich).
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var els = document.querySelectorAll("[data-reveal]");
  if (reduce || !("IntersectionObserver" in window) || !els.length) {
    return; // nichts verstecken -> sichtbar lassen
  }
  document.documentElement.classList.add("reveal-ready");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  els.forEach(function (el) { io.observe(el); });
})();
