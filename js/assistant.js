/* aban news — „Frag aban"-Assistent (selbst-gehostet, kein Tracking, keine Cloud-KI).
 * Durchsucht /assistant-index.json (Abans eigene Inhalte) und antwortet mit Links.
 * Ehrlich: keine generative KI — er zeigt dir die passende Stelle, statt zu halluzinieren.
 */
(function () {
  "use strict";
  if (window.__abanAssistant) return; window.__abanAssistant = true;

  var A = "#b45309", AL = "#fde9c8", INK = "#1f2937", MUT = "#6b7280", LINE = "#ece3d4";
  var idx = null, loading = false;

  // --- Styles (gescoped, inline) ---
  var css = document.createElement("style");
  css.textContent =
    "#aban-fab{position:fixed;right:18px;bottom:18px;z-index:9998;background:" + A + ";color:#fff;border:0;border-radius:999px;" +
    "padding:12px 18px;font:700 15px/1 -apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.18);cursor:pointer}" +
    "#aban-fab:hover{filter:brightness(1.06)}" +
    "#aban-panel{position:fixed;right:18px;bottom:74px;z-index:9999;width:360px;max-width:calc(100vw - 36px);max-height:72vh;" +
    "display:none;flex-direction:column;background:#fffbf5;color:" + INK + ";border:1px solid " + AL + ";border-radius:16px;" +
    "box-shadow:0 18px 50px rgba(0,0,0,.22);overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,sans-serif}" +
    "#aban-panel.open{display:flex}" +
    "#aban-head{background:" + A + ";color:#fff;padding:12px 14px;display:flex;justify-content:space-between;align-items:center}" +
    "#aban-head b{font-size:15px}#aban-head small{display:block;opacity:.9;font-weight:400;font-size:11px;margin-top:2px}" +
    "#aban-x{background:0;border:0;color:#fff;font-size:20px;cursor:pointer;line-height:1}" +
    "#aban-body{padding:12px 14px;overflow:auto;flex:1}" +
    ".aban-msg{margin:8px 0;font-size:14px;line-height:1.5}" +
    ".aban-a{background:#fff;border:1px solid " + LINE + ";border-radius:12px;padding:10px 12px;margin:8px 0}" +
    ".aban-a .t{font-weight:700;font-size:13.5px}.aban-a p{margin:3px 0 6px;font-size:13px;color:#374151}" +
    ".aban-a a{color:" + A + ";font-weight:700;text-decoration:none;font-size:13px}" +
    ".aban-chip{display:inline-block;background:#fff;border:1px solid " + AL + ";color:" + A + ";border-radius:999px;" +
    "padding:6px 11px;margin:4px 4px 0 0;font-size:12.5px;cursor:pointer}" +
    ".aban-chip:hover{background:" + AL + "}" +
    "#aban-foot{border-top:1px solid " + LINE + ";padding:10px;display:flex;gap:6px}" +
    "#aban-in{flex:1;border:1px solid " + LINE + ";border-radius:10px;padding:9px 11px;font-size:14px;background:#fff;color:" + INK + "}" +
    "#aban-send{background:" + A + ";color:#fff;border:0;border-radius:10px;padding:0 14px;font-weight:700;cursor:pointer}" +
    "#aban-note{font-size:10.5px;color:" + MUT + ";text-align:center;padding:0 10px 8px}" +
    "@media(prefers-color-scheme:dark){#aban-panel{background:#1a1712;color:#f3ede2;border-color:#3a352d}" +
    ".aban-a{background:#231f19;border-color:#3a352d}.aban-a p{color:#d6cdbd}#aban-in{background:#231f19;color:#f3ede2;border-color:#3a352d}}";
  document.head.appendChild(css);

  // --- DOM ---
  var fab = el("button", { id: "aban-fab", "aria-label": "Frag aban — Hilfe" }, "💬 Frag aban");
  var panel = el("div", { id: "aban-panel", role: "dialog", "aria-label": "Frag aban Assistent" });
  panel.innerHTML =
    '<div id="aban-head"><div><b>Frag aban</b><small>durchsucht die Seite · kein Tracking</small></div><button id="aban-x" aria-label="Schließen">×</button></div>' +
    '<div id="aban-body"></div>' +
    '<div id="aban-foot"><input id="aban-in" placeholder="Frag etwas, z. B. „werde ich von KI gefunden?"" autocomplete="off"><button id="aban-send">→</button></div>' +
    '<div id="aban-note">Ehrlich: kein Cloud-Chatbot — zeigt dir die passende Stelle auf abannews.com.</div>';
  document.body.appendChild(fab); document.body.appendChild(panel);

  var body = panel.querySelector("#aban-body"), input = panel.querySelector("#aban-in");
  var STARTERS = ["Werde ich von KI gefunden?", "Welche KI-Tools lohnen sich?", "Was kostet der Monitor?",
                  "KI rechtssicher nutzen (Arzt/Anwalt)?", "Was ist aban news?"];

  function greet() {
    body.innerHTML = "";
    add("aban-msg", "Hallo! Ich zeige dir die passende Stelle auf der Seite. Frag einfach — oder tipp auf eine Frage:");
    var chips = el("div", {});
    STARTERS.forEach(function (s) {
      var c = el("span", { class: "aban-chip" }, s);
      c.onclick = function () { input.value = s; answer(s); };
      chips.appendChild(c);
    });
    body.appendChild(chips);
  }

  function ensureIndex(cb) {
    if (idx) return cb();
    if (loading) return;
    loading = true;
    fetch("/assistant-index.json", { cache: "force-cache" })
      .then(function (r) { return r.json(); })
      .then(function (d) { idx = (d && d.items) || []; loading = false; cb(); })
      .catch(function () { loading = false; add("aban-msg", "Konnte den Index nicht laden — schreib uns an hallo@abannews.com."); });
  }

  function tokens(s) {
    return (s || "").toLowerCase().replace(/[^a-zäöüß0-9 ]/g, " ").split(/\s+/).filter(function (w) { return w.length >= 3; });
  }

  function answer(qRaw) {
    var q = (qRaw || "").trim(); if (!q) return;
    add("aban-msg", "<b>Du:</b> " + esc(q));
    ensureIndex(function () {
      var qt = tokens(q), scored = [];
      idx.forEach(function (it) {
        var hay_q = (it.q || "").toLowerCase(), hay_a = (it.a || "").toLowerCase(),
            tg = (it.tags || []).map(function (x) { return String(x).toLowerCase(); });
        var sc = 0;
        qt.forEach(function (w) {
          if (hay_q.indexOf(w) >= 0) sc += 3;
          if (tg.indexOf(w) >= 0) sc += 3; else if (tg.some(function (t) { return t.indexOf(w) >= 0; })) sc += 2;
          if (hay_a.indexOf(w) >= 0) sc += 1;
        });
        if (sc > 0) scored.push([sc, it]);
      });
      scored.sort(function (a, b) { return b[0] - a[0]; });
      if (!scored.length) {
        add("aban-msg", "Dazu hab ich nichts Passendes auf der Seite. Frag uns direkt: " +
          '<a href="mailto:hallo@abannews.com" style="color:' + A + ';font-weight:700">hallo@abannews.com</a> — oder der ' +
          '<a href="/start" style="color:' + A + ';font-weight:700">Überblick</a> hilft.');
        return;
      }
      scored.slice(0, 3).forEach(function (p) {
        var it = p[1], ext = /^https?:|^mailto:/.test(it.url), tgt = ext ? ' target="_blank" rel="noopener"' : "";
        var c = el("div", { class: "aban-a" });
        c.innerHTML = '<div class="t">' + esc(it.q) + "</div><p>" + esc(it.a || "") + "</p>" +
          '<a href="' + it.url + '"' + tgt + ">Ansehen →</a>";
        body.appendChild(c);
      });
      body.scrollTop = body.scrollHeight;
    });
  }

  function add(cls, html) { var d = el("div", { class: cls }); d.innerHTML = html; body.appendChild(d); body.scrollTop = body.scrollHeight; }
  function el(t, attrs, txt) { var e = document.createElement(t); for (var k in attrs) e.setAttribute(k, attrs[k]); if (txt) e.textContent = txt; return e; }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  function open() { panel.classList.add("open"); if (!body.childNodes.length) greet(); setTimeout(function () { input.focus(); }, 50); }
  function close() { panel.classList.remove("open"); }
  fab.onclick = function () { panel.classList.contains("open") ? close() : open(); };
  panel.querySelector("#aban-x").onclick = close;
  panel.querySelector("#aban-send").onclick = function () { answer(input.value); input.value = ""; };
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") { answer(input.value); input.value = ""; } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
})();
