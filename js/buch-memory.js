// ============================================================
// BUCH-MEMORY — kleine, wiederverwendbare Lese-/Fortschritt-Memory
// fuer Buch-Seiten (buch.html, trilogie.html, i18n-Varianten).
//
// Merkt sich AUSSCHLIESSLICH lokal im Browser (localStorage):
//   - ob/wann PDF/ePub geladen wurde,
//   - welche Abschnitte (z. B. Band-Karten) geoeffnet waren,
//   - wann zuletzt besucht ("Willkommen zurueck").
// Kein Server, keine Cookies, kein Tracking — nichts verlaesst das Geraet.
//
// Konfiguration ueber data-Attribute (eine Quelle der Wahrheit im Markup):
//   <body data-memory-key="aban_buch_v1">           Pflicht: eigener Key pro Buch.
//   <a   data-dl="pdf" ...>                           Download-Link markieren.
//   <span data-dl-state="pdf" data-dl-label="✓ Geladen am" hidden></span>
//   <details data-remember="band1"> ... </details>   Offen-Zustand merken.
//   <p data-resume data-resume-text="Willkommen zurueck — zuletzt am %d." hidden></p>
//   <button data-reset type="button">Zuruecksetzen</button>
//
// data-dl-label / data-resume-text sind sprachabhaengig -> i18n im Markup,
// nicht im Skript.
// ============================================================
(function () {
  "use strict";

  var KEY = document.body.getAttribute("data-memory-key");
  if (!KEY) return; // ohne Key keine Memory (Seite nicht konfiguriert)

  var hasLS = (function () {
    try { var k = "__t"; localStorage.setItem(k, k); localStorage.removeItem(k); return true; }
    catch (e) { return false; }
  })();

  function load() {
    if (!hasLS) return {};
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function save(s) { if (hasLS) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} } }

  function fmt(ts) {
    try { return new Date(ts).toLocaleDateString(document.documentElement.lang || "de-DE"); }
    catch (e) { return ""; }
  }

  var state = load();
  state.downloads = state.downloads || {}; // {pdf: ts, epub: ts}
  state.opened = state.opened || {};       // {band1: true}

  // ---- Download-Status merken + anzeigen ----
  function renderDownloads() {
    [].forEach.call(document.querySelectorAll("[data-dl-state]"), function (el) {
      var id = el.getAttribute("data-dl-state");
      var ts = state.downloads[id];
      if (ts) {
        var label = el.getAttribute("data-dl-label") || "✓ Geladen am";
        el.textContent = label + " " + fmt(ts);
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    });
  }
  [].forEach.call(document.querySelectorAll("[data-dl]"), function (a) {
    a.addEventListener("click", function () {
      state.downloads[a.getAttribute("data-dl")] = Date.now();
      save(state);
      renderDownloads();
    });
  });
  renderDownloads();

  // ---- Offen-Zustand von Abschnitten (z. B. <details>) merken ----
  [].forEach.call(document.querySelectorAll("[data-remember]"), function (d) {
    var id = d.getAttribute("data-remember");
    if (state.opened[id] && "open" in d) d.open = true;
    d.addEventListener("toggle", function () {
      state.opened[id] = !!d.open;
      save(state);
    });
  });

  // ---- "Willkommen zurueck" (nur, wenn schon einmal besucht) ----
  var resume = document.querySelector("[data-resume]");
  if (resume && state.visited) {
    var tpl = resume.getAttribute("data-resume-text") || "Willkommen zurück — zuletzt hier am %d.";
    resume.textContent = tpl.replace("%d", fmt(state.visited));
    resume.hidden = false;
  }
  state.visited = Date.now();
  save(state);

  // ---- Zuruecksetzen ----
  var reset = document.querySelector("[data-reset]");
  if (reset) {
    reset.addEventListener("click", function () {
      if (hasLS) { try { localStorage.removeItem(KEY); } catch (e) {} }
      location.reload();
    });
  }
})();
