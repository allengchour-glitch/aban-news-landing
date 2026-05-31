/*!
 * aban news — Hype-Filter Widget (Embed)
 * Einbettbares Mini-Widget: Textfeld + "Hype prüfen". Ruft die öffentliche
 * aban-Edge-API auf und zeigt Score + die wichtigsten Funde.
 *
 * Einbinden:
 *   <script src="https://abannews.com/js/hype-filter-widget.js" async></script>
 *   <!-- optional: <div data-hype-filter></div> als Mount-Ziel -->
 *
 * Optionale Attribute am <script>-Tag ODER am Mount-<div>:
 *   data-endpoint="https://abannews.com/api/hype-check"  (Default)
 *   data-attribution="off"   schaltet den "Powered by"-Link ab
 *
 * Reines Vanilla-JS, keine Abhängigkeiten. Alles in einer Closure.
 * Lizenz: frei nutzbar. (c) aban news
 */
(function () {
  "use strict";

  var DEFAULT_ENDPOINT = "https://abannews.com/api/hype-check";
  var ATTRIBUTION_URL = "https://abannews.com/hype-filter.html";
  var instanceSeq = 0;

  // ---- Hilfen --------------------------------------------------------------

  // HTML-Escaping für alle dynamischen Strings (XSS-Schutz). Wird überall dort
  // verwendet, wo API- oder Nutzer-Text in Markup landet.
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Nur http/https-Hex-Farben zulassen, sonst Fallback (kein CSS-Injection).
  function safeColor(value, fallback) {
    return /^#[0-9a-fA-F]{3,8}$/.test(String(value || "")) ? value : fallback;
  }

  function readAttr(el, name) {
    if (!el || !el.getAttribute) return null;
    var v = el.getAttribute(name);
    return v == null || v === "" ? null : v;
  }

  // Das <script>, das uns geladen hat (für data-* und Self-Mount).
  function currentScript() {
    if (document.currentScript) return document.currentScript;
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || "";
      if (/hype-filter-widget\.js(\?|$)/.test(src)) return scripts[i];
    }
    return scripts[scripts.length - 1] || null;
  }

  // ---- Styles (gescopt; im Shadow Root isoliert) ---------------------------

  function styleText() {
    return [
      ":host{all:initial;display:block}",
      ".afw{",
      "  font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;",
      "  line-height:1.5;color:#1f2937;background:#ffffff;",
      "  border:1px solid #ece3d4;border-radius:14px;padding:16px;",
      "  max-width:520px;box-sizing:border-box;",
      "  -webkit-text-size-adjust:100%;text-align:left;",
      "}",
      ".afw *{box-sizing:border-box}",
      ".afw-h{display:flex;align-items:baseline;gap:8px;margin:0 0 10px}",
      ".afw-title{font-size:15px;font-weight:700;margin:0;color:#1f2937}",
      ".afw-sub{font-size:12px;color:#6b7280;margin:0}",
      ".afw-label{display:block;font-size:12px;color:#6b7280;margin:0 0 4px}",
      ".afw-ta{",
      "  width:100%;min-height:96px;resize:vertical;font:inherit;font-size:14px;",
      "  color:#1f2937;background:#fffdf9;border:1px solid #e5dccb;border-radius:10px;",
      "  padding:10px;display:block;",
      "}",
      ".afw-ta:focus{outline:2px solid #b45309;outline-offset:1px;border-color:#d97706}",
      ".afw-row{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap}",
      ".afw-btn{",
      "  font:inherit;font-size:14px;font-weight:600;cursor:pointer;",
      "  background:#d97706;color:#fff;border:0;border-radius:10px;padding:9px 16px;",
      "}",
      ".afw-btn:hover{background:#b45309}",
      ".afw-btn:focus-visible{outline:2px solid #1f2937;outline-offset:2px}",
      ".afw-btn[disabled]{opacity:.6;cursor:default}",
      ".afw-count{font-size:12px;color:#9ca3af}",
      ".afw-out{margin-top:14px}",
      ".afw-empty{display:none}",
      ".afw-status{font-size:13px;color:#6b7280;margin:0}",
      ".afw-err{font-size:13px;color:#b91c1c;margin:0}",
      ".afw-score{display:flex;align-items:center;gap:12px;margin:0 0 8px}",
      ".afw-badge{",
      "  --c:#d97706;flex:0 0 auto;width:56px;height:56px;border-radius:50%;",
      "  display:flex;align-items:center;justify-content:center;",
      "  font-size:18px;font-weight:800;color:#fff;background:var(--c);",
      "}",
      ".afw-grade{font-size:14px;font-weight:700;margin:0}",
      ".afw-verdict{font-size:13px;color:#374151;margin:2px 0 0}",
      ".afw-metrics{font-size:12px;color:#6b7280;margin:6px 0 0}",
      ".afw-cats{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}",
      ".afw-chip{",
      "  font-size:12px;background:#fef3c7;color:#b45309;border:1px solid #fde9c8;",
      "  border-radius:999px;padding:3px 9px;",
      "}",
      ".afw-find-h{font-size:12px;color:#6b7280;margin:12px 0 4px}",
      ".afw-finds{list-style:none;margin:0;padding:0}",
      ".afw-find{font-size:13px;padding:5px 0;border-top:1px solid #f1ece1}",
      ".afw-find b{color:#1f2937}",
      ".afw-find .afw-fl{color:#6b7280}",
      ".afw-find .afw-fr{color:#15803d}",
      ".afw-foot{margin-top:12px;font-size:11px;color:#9ca3af}",
      ".afw-foot a{color:#b45309;text-decoration:none}",
      ".afw-foot a:hover{text-decoration:underline}",
      "@media (prefers-color-scheme:dark){",
      "  .afw{background:#1c2530;color:#e8eaed;border-color:#2c3744}",
      "  .afw-title{color:#f3f4f6}.afw-ta{background:#141b22;color:#e8eaed;border-color:#2c3744}",
      "  .afw-verdict{color:#cbd2da}.afw-find b{color:#f3f4f6}",
      "  .afw-chip{background:#3a2c12;color:#fcd9a3;border-color:#4a3a18}",
      "}"
    ].join("\n");
  }

  // ---- Widget --------------------------------------------------------------

  function mountWidget(host, opts) {
    instanceSeq += 1;
    var uid = "afw-" + instanceSeq;
    var endpoint = opts.endpoint || DEFAULT_ENDPOINT;
    var showAttribution = opts.attribution !== false;

    // Style-Isolation via Shadow DOM, sonst namespaced Fallback.
    var root, useShadow = false;
    if (host.attachShadow) {
      try {
        root = host.attachShadow({ mode: "open" });
        useShadow = true;
      } catch (e) { root = host; }
    } else {
      root = host;
    }

    var style = document.createElement("style");
    style.textContent = styleText();
    root.appendChild(style);

    var wrap = document.createElement("div");
    wrap.className = "afw";

    // Statische Hülle. Dynamische Inhalte werden ausschließlich via textContent
    // bzw. escaptem Markup gefüllt — kein ungefiltertes innerHTML.
    wrap.innerHTML =
      '<div class="afw-h">' +
        '<p class="afw-title">Hype-Check</p>' +
        '<p class="afw-sub">Wie nüchtern klingt dein Text?</p>' +
      '</div>' +
      '<label class="afw-label" for="' + uid + '-ta">Text einfügen (Deutsch)</label>' +
      '<textarea id="' + uid + '-ta" class="afw-ta" ' +
        'placeholder="Text hier einfügen — dann auf &bdquo;Hype prüfen&ldquo; klicken."></textarea>' +
      '<div class="afw-row">' +
        '<button type="button" class="afw-btn">Hype prüfen</button>' +
        '<span class="afw-count" aria-hidden="true">0 Zeichen</span>' +
      '</div>' +
      '<div class="afw-out afw-empty" role="region" aria-live="polite" aria-label="Ergebnis"></div>' +
      (showAttribution
        ? '<p class="afw-foot">Powered by <a target="_blank" rel="noopener">aban news Hype-Filter</a></p>'
        : "");

    root.appendChild(wrap);

    var ta = wrap.querySelector(".afw-ta");
    var btn = wrap.querySelector(".afw-btn");
    var count = wrap.querySelector(".afw-count");
    var out = wrap.querySelector(".afw-out");

    if (showAttribution) {
      var foot = wrap.querySelector(".afw-foot a");
      if (foot) {
        foot.setAttribute("href", ATTRIBUTION_URL);
        foot.textContent = "aban news Hype-Filter";
      }
    }

    function updateCount() {
      count.textContent = (ta.value.length || 0) + " Zeichen";
    }
    ta.addEventListener("input", updateCount);

    // Status anzeigen (Text only).
    function setStatus(msg) {
      out.className = "afw-out";
      out.textContent = "";
      var p = document.createElement("p");
      p.className = "afw-status";
      p.textContent = msg;
      out.appendChild(p);
    }
    function setError(msg) {
      out.className = "afw-out";
      out.textContent = "";
      var p = document.createElement("p");
      p.className = "afw-err";
      p.textContent = msg;
      out.appendChild(p);
    }

    // Ergebnis rendern. Markup wird aus escapten Teilen zusammengesetzt; Farben
    // werden über safeColor gefiltert.
    function renderResult(data) {
      var score = Number(data && data.score);
      if (!isFinite(score)) { setError("Unerwartete Antwort der API."); return; }

      var color = safeColor(data.gradeColor, "#d97706");
      var grade = esc(data.grade || "");
      var verdict = esc(data.verdict || "");
      var m = data.metrics || {};
      var wc = Number(m.wordCount);
      var density = Number(m.hypeDensity);

      var html = "";
      html += '<div class="afw-score">';
      html += '<div class="afw-badge" style="--c:' + esc(color) + '">' + esc(String(Math.round(score))) + "</div>";
      html += "<div>";
      html += '<p class="afw-grade" style="color:' + esc(color) + '">' + grade + "</p>";
      if (verdict) html += '<p class="afw-verdict">' + verdict + "</p>";
      html += "</div></div>";

      if (isFinite(wc)) {
        var mt = esc(String(wc)) + " Wörter";
        if (isFinite(density)) mt += " · " + esc(String(density)) + " Hype-Wörter je 100";
        html += '<p class="afw-metrics">' + mt + "</p>";
      }

      // Top-Kategorien (max 3).
      var cats = Array.isArray(data.categories) ? data.categories.slice(0, 3) : [];
      if (cats.length) {
        html += '<ul class="afw-cats">';
        for (var i = 0; i < cats.length; i++) {
          var c = cats[i] || {};
          var cl = esc(c.label || "");
          var cn = Number(c.count);
          html += '<li class="afw-chip">' + cl + (isFinite(cn) ? " · " + esc(String(cn)) : "") + "</li>";
        }
        html += "</ul>";
      }

      // Erste Funde (max 4).
      var finds = Array.isArray(data.findings) ? data.findings.slice(0, 4) : [];
      if (finds.length) {
        html += '<p class="afw-find-h">Gefunden:</p><ul class="afw-finds">';
        for (var j = 0; j < finds.length; j++) {
          var f = finds[j] || {};
          var fm = esc(f.match || "");
          var flabel = esc(f.label || "");
          var repl = (Array.isArray(f.replacements) && f.replacements.length)
            ? esc(String(f.replacements[0])) : "";
          html += '<li class="afw-find"><b>' + fm + "</b> ";
          html += '<span class="afw-fl">' + flabel + "</span>";
          if (repl) html += ' <span class="afw-fr">→ ' + repl + "</span>";
          html += "</li>";
        }
        html += "</ul>";
      }

      out.className = "afw-out";
      // html besteht ausschließlich aus statischen Fragmenten + esc()-gefilterten
      // Werten — kein ungefilterter dynamischer String.
      out.innerHTML = html;
    }

    var busy = false;
    function run() {
      if (busy) return;
      var text = ta.value || "";
      if (!text.trim()) { setError("Bitte zuerst etwas Text einfügen."); ta.focus(); return; }

      busy = true;
      btn.disabled = true;
      btn.textContent = "Prüfe …";
      setStatus("Analysiere …");

      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true; finish();
        setError("Zeitüberschreitung. Später erneut versuchen.");
      }, 20000);

      function finish() {
        clearTimeout(timer);
        busy = false;
        btn.disabled = false;
        btn.textContent = "Hype prüfen";
      }

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text, action: "analyze" })
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (data) {
          if (done) return; done = true; finish();
          if (data && data.error) { setError(String(data.error)); return; }
          renderResult(data);
        })
        .catch(function () {
          if (done) return; done = true; finish();
          setError("Verbindung fehlgeschlagen. Bitte später erneut versuchen.");
        });
    }

    btn.addEventListener("click", run);
    ta.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); }
    });

    updateCount();
    return host;
  }

  // ---- Bootstrap -----------------------------------------------------------

  function optsFrom(el, scriptEl) {
    var endpoint = readAttr(el, "data-endpoint") || readAttr(scriptEl, "data-endpoint") || DEFAULT_ENDPOINT;
    var attrRaw = readAttr(el, "data-attribution");
    if (attrRaw == null) attrRaw = readAttr(scriptEl, "data-attribution");
    var attribution = !(attrRaw && /^(off|false|0|no)$/i.test(attrRaw));
    return { endpoint: endpoint, attribution: attribution };
  }

  function init(scriptEl) {
    scriptEl = scriptEl || currentScript();

    // 1) Alle expliziten Mount-Ziele.
    var targets = document.querySelectorAll("[data-hype-filter]:not([data-afw-ready])");
    if (targets.length) {
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        t.setAttribute("data-afw-ready", "1");
        mountWidget(t, optsFrom(t, scriptEl));
      }
      return;
    }

    // 2) Kein Mount-Ziel → an der Stelle des Skripts selbst einhängen (einmalig).
    if (scriptEl && !scriptEl.getAttribute("data-afw-ready")) {
      scriptEl.setAttribute("data-afw-ready", "1");
      var holder = document.createElement("div");
      holder.setAttribute("data-afw-ready", "1");
      if (scriptEl.parentNode) {
        scriptEl.parentNode.insertBefore(holder, scriptEl.nextSibling);
        mountWidget(holder, optsFrom(scriptEl, scriptEl));
      }
    }
  }

  // Einziges globales Objekt: window.AbanHypeFilter.init().
  var api = { init: init, mount: mountWidget, version: "1.0.0" };
  try { if (!window.AbanHypeFilter) window.AbanHypeFilter = api; } catch (e) {}

  // currentScript jetzt festhalten (in async/defer evtl. später null).
  var self = currentScript();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(self); });
  } else {
    init(self);
  }
})();
