/* Wiederverwendbare Merkliste (Favoriten) — lokal im Browser, ohne Login.
 *
 * Gespeichert wird ein kleiner Abzug des Inserats (nicht nur die ID), damit die Merkliste
 * auch dann vollstaendig bleibt, wenn ein Eintrag gerade nicht in der geladenen Trefferliste
 * steckt (anderer Filter, andere Kategorie, neu geladene Seite).
 *
 * Nutzung:
 *   AbanMerk.toggle({id:"x", titel:"…", preis:"CHF 20.–"})  -> true, wenn jetzt gemerkt
 *   AbanMerk.has("x") · AbanMerk.list() · AbanMerk.count()
 *   AbanMerk.clear() -> die entfernten Eintraege (fuer "Rueckgaengig") · AbanMerk.restore(arr)
 *   AbanMerk.onChange(fn)  (feuert auch, wenn ein anderer Tab die Liste aendert)
 */
(function () {
  var KEY = "abanMerk";
  var MAX = 100;              // Deckel, damit localStorage nicht volllaeuft
  var FELDER = ["id", "titel", "preis", "ort", "plz", "kat", "zustand", "typ", "url", "bild", "emoji", "demo", "beschreibung"];
  var hoerer = [];

  function lies() {
    var roh;
    try { roh = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; }
    if (!roh || typeof roh.length !== "number") return [];
    var out = [];
    for (var i = 0; i < roh.length; i++) {
      var e = roh[i];
      // Altbestand: die Liste war eine reine ID-Liste ["demo-1","demo-2"]
      if (typeof e === "string" || typeof e === "number") { out.push({ id: String(e) }); continue; }
      if (e && e.id != null) { e.id = String(e.id); out.push(e); }
    }
    return out;
  }

  function schreib(a) {
    try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); } catch (e) { /* privater Modus / Speicher voll */ }
    melde();
  }

  function melde() { for (var i = 0; i < hoerer.length; i++) { try { hoerer[i](); } catch (e) { } } }

  function schlank(it) {
    var o = {};
    for (var i = 0; i < FELDER.length; i++) {
      var k = FELDER[i];
      if (it[k] !== undefined && it[k] !== null && it[k] !== "") o[k] = it[k];
    }
    if (o.beschreibung) o.beschreibung = String(o.beschreibung).slice(0, 200);
    o.id = String(it.id);
    o.ts = Date.now();
    return o;
  }

  function index(a, id) {
    id = String(id);
    for (var i = 0; i < a.length; i++) if (a[i].id === id) return i;
    return -1;
  }

  window.AbanMerk = {
    list: function () { return lies(); },
    count: function () { return lies().length; },
    has: function (id) { return index(lies(), id) >= 0; },
    /** Eintrag merken oder entfernen. Gibt true zurueck, wenn er jetzt gemerkt ist. */
    toggle: function (it) {
      if (!it || it.id == null) return false;
      var a = lies(), i = index(a, it.id);
      if (i >= 0) { a.splice(i, 1); schreib(a); return false; }
      a.push(schlank(it));
      if (a.length > MAX) a = a.slice(a.length - MAX);   // aelteste fallen raus
      schreib(a);
      return true;
    },
    remove: function (id) { var a = lies(), i = index(a, id); if (i >= 0) { a.splice(i, 1); schreib(a); } },
    /** Leert die Liste und gibt sie zurueck, damit die Seite "Rueckgaengig" anbieten kann. */
    clear: function () { var a = lies(); try { localStorage.removeItem(KEY); } catch (e) { } melde(); return a; },
    restore: function (a) { if (a && a.length) schreib(a.slice(0, MAX)); },
    onChange: function (fn) { if (typeof fn === "function") hoerer.push(fn); }
  };

  // Zweiter Tab aendert die Merkliste -> hier nachziehen.
  if (typeof window.addEventListener === "function") {
    window.addEventListener("storage", function (e) { if (!e || e.key === KEY || e.key === null) melde(); });
  }
})();

/* ── Oberfläche: Herz-Knopf, Leiste, Merklisten-Ansicht ────────────────────────
 * Eine Seite hängt sich so ein:
 *   var M = AbanMerk.ui({ grid: document.querySelector("#grid"), render: render,
 *                         daten: function(id){ return …aus der Trefferliste… },
 *                         zaehlwort: "gemerkt" });
 *   // im Karten-Markup:  M.herz(it.id)
 *   // in render():       items = M.nur ? M.liste() : applyFilters(items)
 * Die Merkliste gilt seitenübergreifend — gemerkt ist gemerkt, egal wo.
 */
(function () {
  var CSS = ""
    + ".lxm-herz{position:relative;background:#fff;border:1.5px solid var(--line,#e6e1d6);border-radius:50%;width:38px;height:38px;flex:0 0 auto;font-size:18px;line-height:1;cursor:pointer;color:var(--amber-dk,#b45309);display:flex;align-items:center;justify-content:center;font-family:inherit;transition:background .12s,border-color .12s,color .12s,transform .12s;-webkit-tap-highlight-color:transparent;touch-action:manipulation}"
    /* unsichtbare Vergroesserung auf 44px — Finger-Trefferflaeche ohne Layout-Sprung */
    + ".lxm-herz::after{content:\"\";position:absolute;top:50%;left:50%;width:44px;height:44px;transform:translate(-50%,-50%)}"
    + ".lxm-herz:hover{border-color:var(--amber,#d97706);background:var(--cream,#fef3c7)}"
    + ".lxm-herz:active{transform:scale(.9)}"
    + ".lxm-herz[aria-pressed=\"true\"]{background:var(--amber-dk,#b45309);border-color:var(--amber-dk,#b45309);color:#fff}"
    + ".lxm-herz[aria-pressed=\"true\"]:hover{background:#a04708;border-color:#a04708}"
    + ".lxm-herz.pop{animation:lxmpop .32s ease-out}"
    + "@keyframes lxmpop{0%{transform:scale(1)}38%{transform:scale(1.28)}100%{transform:scale(1)}}"
    + ".lxm-weg{opacity:0;transform:scale(.96);transition:opacity .18s,transform .18s}"
    + "#lxm-bar{position:fixed;left:50%;transform:translateX(-50%);bottom:16px;z-index:80;background:#1f2937;color:#fff;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;gap:10px;padding:9px 12px 9px 18px;font-size:.9rem;font-weight:700;max-width:calc(100vw - 24px);flex-wrap:wrap}"
    + "#lxm-bar[hidden]{display:none}"
    + "#lxm-bar .lxm-lbl{white-space:nowrap}"
    + "#lxm-bar button{font-family:inherit;border:0;border-radius:14px;padding:8px 14px;font-weight:700;font-size:.85rem;cursor:pointer;min-height:40px}"
    + "#lxm-bar button[hidden]{display:none}"
    + "#lxm-bar .lxm-zeig{background:var(--amber,#d97706);color:#1f2937}"
    + "#lxm-bar .lxm-leer{background:transparent;color:#f4e7d3;border:1px solid rgba(255,255,255,.3)}"
    + "#lxm-bar .lxm-undo{background:#fff;color:#1f2937}"
    + "body.lxm-platz{padding-bottom:84px}"
    + "@media(max-width:420px){#lxm-bar{left:12px;right:12px;transform:none;max-width:none;padding:9px 12px}#lxm-bar button{flex:1 1 auto}}"
    + "@media(prefers-reduced-motion:reduce){.lxm-herz,.lxm-herz:active,.lxm-herz.pop,.lxm-weg{animation:none;transition:none;transform:none}}";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function css() {
    if (document.getElementById("lxm-css")) return;
    var st = document.createElement("style"); st.id = "lxm-css"; st.textContent = CSS;
    document.head.appendChild(st);
  }

  window.AbanMerk.ui = function (cfg) {
    cfg = cfg || {};
    var A = window.AbanMerk, grid = cfg.grid, karte = cfg.karte || ".card";
    var wort = cfg.zaehlwort || "gemerkt";
    var geleert = null, undoUhr = null;
    var M = { nur: false };
    css();

    var bar = document.createElement("div");
    bar.id = "lxm-bar"; bar.hidden = true;
    bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Merkliste");
    bar.innerHTML = '<span class="lxm-lbl" aria-live="polite">♥ <span class="lxm-zahl">0</span> ' + esc(wort) + '</span>'
      + '<button class="lxm-zeig" type="button">Merkliste ansehen</button>'
      + '<button class="lxm-leer" type="button">Leeren</button>'
      + '<button class="lxm-undo" type="button" hidden>↺ Rückgängig</button>';
    document.body.appendChild(bar);
    var lbl = bar.querySelector(".lxm-lbl"), zahl = bar.querySelector(".lxm-zahl"),
      bZeig = bar.querySelector(".lxm-zeig"), bLeer = bar.querySelector(".lxm-leer"), bUndo = bar.querySelector(".lxm-undo");

    /** Knopf-HTML fuer eine Karte. */
    M.herz = function (id) {
      var on = A.has(id), t = on ? "Aus der Merkliste entfernen" : "Zur Merkliste hinzufügen";
      return '<button class="lxm-herz" type="button" data-merk="' + esc(id) + '" aria-pressed="' + (on ? "true" : "false")
        + '" aria-label="' + t + '" title="' + t + '">' + (on ? "♥" : "♡") + "</button>";
    };
    M.istMerk = function (id) { return A.has(id); };
    /** Gemerkte Eintraege: frische Daten der Seite, sonst der gespeicherte Abzug. */
    M.liste = function () {
      return A.list().map(function (e) { return (cfg.daten && cfg.daten(e.id)) || e; });
    };

    function barZeichnen() {
      var n = A.count();
      bar.hidden = !n && !geleert;
      document.body.classList.toggle("lxm-platz", !bar.hidden);
      zahl.textContent = n;
      lbl.hidden = !n; bZeig.hidden = !n; bLeer.hidden = !n; bUndo.hidden = !geleert;
      bZeig.textContent = M.nur ? "Alle Treffer zeigen" : "Merkliste ansehen";
      bZeig.setAttribute("aria-pressed", M.nur ? "true" : "false");
    }
    M.auffrischen = barZeichnen;

    /** Herz an Ort und Stelle umschreiben — ohne die ganze Liste neu zu bauen. */
    function herzZeichnen(btn, on, pop) {
      var t = on ? "Aus der Merkliste entfernen" : "Zur Merkliste hinzufügen";
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "♥" : "♡";
      btn.setAttribute("aria-label", t); btn.title = t;
      var k = btn.closest(karte); if (k) k.classList.toggle("sel", on);
      if (pop && on) { btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop"); }
    }

    function klick(btn) {
      var id = btn.dataset.merk, k = btn.closest(karte);
      var daten = (cfg.daten && cfg.daten(id))
        || A.list().filter(function (e) { return e.id === String(id); })[0]
        || { id: id, titel: (k && k.querySelector("h3") ? k.querySelector("h3").textContent : id) };
      var on = A.toggle(daten);
      barZeichnen();
      if (M.nur && !on && k) {
        // In der Merklisten-Ansicht verschwindet die Karte — ohne Neuaufbau der ganzen Liste.
        k.classList.add("lxm-weg");
        setTimeout(function () {
          if (k.parentNode) k.parentNode.removeChild(k);
          var rest = grid.querySelectorAll(karte).length;
          if (!rest) { if (cfg.render) cfg.render(); }
          else if (cfg.zaehler) cfg.zaehler(rest);
        }, 180);
        return;
      }
      herzZeichnen(btn, on, true);
    }

    if (grid) grid.addEventListener("click", function (e) {
      var h = e.target.closest("[data-merk]"); if (h) { e.preventDefault(); klick(h); }
    });
    bZeig.addEventListener("click", function () {
      M.nur = !M.nur; barZeichnen();
      if (cfg.render) cfg.render();
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); }
    });
    bLeer.addEventListener("click", function () {
      geleert = A.clear(); M.nur = false; barZeichnen(); if (cfg.render) cfg.render();
      clearTimeout(undoUhr); undoUhr = setTimeout(function () { geleert = null; barZeichnen(); }, 8000);
    });
    bUndo.addEventListener("click", function () {
      if (!geleert) return;
      A.restore(geleert); geleert = null; clearTimeout(undoUhr); barZeichnen(); if (cfg.render) cfg.render();
    });
    // Zweiter Tab aendert die Merkliste -> Zaehler und Herzen nachziehen.
    A.onChange(function () {
      barZeichnen();
      Array.prototype.forEach.call(document.querySelectorAll(".lxm-herz"), function (b) { herzZeichnen(b, A.has(b.dataset.merk), false); });
    });

    barZeichnen();
    return M;
  };
})();
