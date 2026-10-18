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
