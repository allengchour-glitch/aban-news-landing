/* angebote-plus.js — macht aus einer eBay-Trefferliste eine Produktsuche fuer die Schweiz.
 *
 * GEMESSEN 2026-09-23 an 12 Suchen x 50 echten Treffern (tools/fixtures/, von Hand gelabelt):
 *   „velo"            nur  2/50 sind Velos — ebay.de kennt das Schweizer Wort nicht und
 *                     liefert Saettel der Marke „Velo"
 *   „nintendo switch" nur 22/50 sind Konsolen — der Rest Spiele, Joy-Cons, Netzteile
 *   „playstation 5"   nur 27/50 sind Konsolen
 *   Preise durchwegs in EUR ab Deutschland, ohne Hinweis auf Einfuhr-MwSt.
 * Diese Datei loest das auf der Seite, ohne die eBay-Anbindung zu aendern:
 *   begriff()   Schweizer Wort -> Wort, das ebay.de versteht (velo -> fahrrad)
 *   ordne()     das gesuchte Ding nach vorn, Zubehoer nach hinten (eBay-Reihenfolge bleibt
 *               innerhalb gleicher Bewertung erhalten)
 *   spanne()    typischer Preis der echten Produkte (nicht des Zubehoers)
 *   chf()/herkunft()  ehrlicher Preis fuer die Schweiz
 * Messung: node tools/angebote_qualitaet.mjs
 */
(function (root) {
  "use strict";

  function klein(s) {
    return String(s || "").toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  }
  function woerter(s) { return klein(s).split(/[^a-z0-9]+/).filter(Boolean); }

  /* 🇨🇭 ebay.de ist deutsch-deutsch. Nur Woerter, die dort nachweislich anders heissen. */
  var SCHWEIZ = { velo: "fahrrad", natel: "handy", trottinett: "tretroller", pneu: "reifen",
    pneus: "reifen", glace: "eis", velohelm: "fahrradhelm", poulet: "haehnchen",
    rueebli: "karotten", nuesslisalat: "feldsalat", finken: "hausschuhe", tumbler: "waeschetrockner" };
  function begriff(q) {
    var geaendert = false;
    var aus = String(q || "").trim().split(/\s+/).map(function (w) {
      var k = klein(w);
      if (SCHWEIZ[k]) { geaendert = true; return SCHWEIZ[k]; }
      /* Velo-Komposita: „veloschloss" -> „fahrradschloss" */
      if (/^velo[a-z]{3,}/.test(k)) { geaendert = true; return "fahrrad" + k.slice(4); }
      return w;
    }).join(" ");
    return { q: aus, geaendert: geaendert };
  }

  /* Allgemeiner Zubehoer-Wortschatz — Dinge, die man ZU einem Produkt kauft.
     ⚠️ GEMESSEN (erste Fassung): „akku", „filter", „teile", „beutel", „auflage" standen hier und
     schoben 26 % der ECHTEN Produkte nach hinten — Akku-Rasenmaeher, Filterkaffeemaschinen,
     LEGO-Sets mit „771 Teile", Staubsauger „mit Beutel". Woerter, die auch Eigenschaften eines
     Produkts beschreiben, gehoeren nicht in diese Liste. */
  var ZUBEHOER = ["zubehoer", "ersatzteil", "ersatzteile", "controller", "gamepad", "joy",
    "huelle", "case", "cover", "tasche", "netzteil", "ladegeraet", "ladekabel", "kabel", "adapter",
    "display", "bildschirm", "akkudeckel", "backcover", "bezug", "bezuege", "ueberwurf", "schonbezug",
    "kissen", "kissenfuellung", "fuellung", "reparatur", "defekt", "headset", "dock",
    "displayschutz", "schutzfolie", "folie", "halterung", "halter", "griffe", "sattel", "kleinteile",
    "pins", "spiel", "spiele", "game", "mitgliedschaft", "aufsatz", "buerste", "fernbedienung",
    "spikes", "hebebock"];
  var ZSET = {}; ZUBEHOER.forEach(function (w) { ZSET[w] = 1; });

  function stammwort(w) { return w.replace(/(en|er|e|n|s)$/, ""); }
  function istZubehoerWort(w) {
    if (ZSET[w]) return true;
    for (var k in ZSET) if (k.length >= 5 && w.length > k.length && w.lastIndexOf(k) === w.length - k.length) return true;
    return false;
  }

  /* Der Titel beginnt mit dem, WAS verkauft wird; nach „mit", „inkl.", „+", „-" folgen Beigaben.
     ⚠️ GEMESSEN: „Konsole mit Joy-Con", „Sofa mit 2 Kissen", „iPhone inkl. Ladekabel" galten als
     Zubehoer, solange der ganze Titel zaehlte. */
  var TRENNER = / (mit|inkl\.?|inklusive|incl\.?|ohne|und|plus|\+|&|-|–|\|)( |$)|[(,:\/]/;
  function kopf(titel) {
    var t = klein(titel), m = t.match(TRENNER);
    var k = m ? t.slice(0, m.index) : t;
    return woerter(k).length >= 2 ? k : t.split(/\s+/).slice(0, 3).join(" ");
  }

  /* Bewertung eines Titels fuer die Suche q: >0 eher das Produkt, <0 eher Zubehoer. */
  function signal(titel, q) {
    var alle = woerter(titel), vorn = woerter(kopf(titel));
    var qs = woerter(q).filter(function (w) { return w.length >= 4; });
    var s = 0, zub = 0, i;
    var tl = " " + klein(titel) + " ";
    /* „fuer iPhone 15", „für PlayStation 5": das Ding ist Beiwerk */
    for (i = 0; i < qs.length; i++) {
      if (tl.indexOf(" fuer " + qs[i]) >= 0 || tl.indexOf(" for " + qs[i]) >= 0) { s -= 3; break; }
    }
    /* Kompositum: das Ende traegt die Bedeutung. „ECKsofa" ist ein Sofa. „SOFAkissen" ist nur
       dann Zubehoer, wenn der Kopf ein Zubehoer-Wort ist — „STAUBSAUGERroboter" bleibt Staubsauger. */
    alle.forEach(function (w) {
      qs.forEach(function (q1) {
        var qn = stammwort(q1);
        if (w.length > q1.length + 2 && w.lastIndexOf(q1) === w.length - q1.length) s += 1;
        else if (w.length > qn.length + 3 && w.indexOf(qn) === 0) {
          var rest = w.slice(qn.length).replace(/^(er|en|e|n|s)/, "");
          if (rest.length >= 3 && istZubehoerWort(rest)) s -= 2;
        }
      });
    });
    vorn.forEach(function (w) { if (ZSET[w]) zub++; });
    s -= Math.min(zub, 2) * 2;
    return s;
  }

  function preis(p) {
    var m = String(p || "").replace(/['’\s]/g, "").match(/(\d+(?:[.,]\d{1,2})?)/);
    return m ? parseFloat(m[1].replace(",", ".")) : NaN;
  }
  function median(a) {
    if (!a.length) return NaN;
    var b = a.slice().sort(function (x, y) { return x - y; }), m = b.length >> 1;
    return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
  }

  /* Reihenfolge: gesuchtes Ding zuerst. Preis-Ausreisser nach unten (ein 50-Euro-Spiel zwischen
     450-Euro-Konsolen) — gemessen am Median der Treffer OHNE Zubehoer-Signal. */
  function ordne(items, q) {
    var mit = (items || []).map(function (it, i) { return { it: it, i: i, s: signal(it.title, q), p: preis(it.price) }; });
    var basis = mit.filter(function (x) { return x.s >= 0 && !isNaN(x.p); }).map(function (x) { return x.p; });
    var ref = basis.length >= 8 ? median(basis) : NaN;
    /* ⚠️ Erst 0.3 — das traf guenstige, echte Laptops (45 EUR bei Median 230). Spiele (50 EUR)
       neben Konsolen (450 EUR) liegen bei rund 0.1; 0.2 trennt beides. */
    mit.forEach(function (x) { if (!isNaN(ref) && !isNaN(x.p) && x.p < ref * 0.2) x.s -= 2; });
    mit.sort(function (a, b) { return (b.s > 0 ? 1 : b.s < 0 ? -1 : 0) - (a.s > 0 ? 1 : a.s < 0 ? -1 : 0) || a.i - b.i; });
    return mit.map(function (x) { var o = {}; for (var k in x.it) o[k] = x.it[k]; o._zubehoer = x.s < 0; return o; });
  }

  /* Typischer Preis: nur Treffer, die nach dem Produkt selbst aussehen. */
  function spanne(geordnet) {
    var p = geordnet.filter(function (x) { return !x._zubehoer; }).map(function (x) { return preis(x.price); })
      .filter(function (n) { return !isNaN(n); }).sort(function (a, b) { return a - b; });
    if (p.length < 5) return null;
    function q(f) { return p[Math.min(p.length - 1, Math.floor(f * (p.length - 1) + 0.5))]; }
    var r = { n: p.length, tief: q(0.25), mitte: q(0.5), hoch: q(0.75) };
    /* ⚠️ GEMESSEN: bei „velo" (-> fahrrad) meldete das „typischer Preis CHF 12 bis 187, Mitte 23" —
       nicht erkanntes Zubehoer (Lampen, Staender) dominierte. Ein typischer Preis ist nur eine
       Aussage, wenn die Preise beieinander liegen. Liegen die Quartile weiter als Faktor 4
       auseinander, lieber nichts sagen als etwas Falsches. */
    return r.hoch > r.tief * 4 ? null : r;
  }

  function chf(betrag, kurs) {
    if (isNaN(betrag) || !kurs) return "";
    return "≈ CHF " + (Math.round(betrag * kurs * 20) / 20).toFixed(2).replace(/\.00$/, ".–");
  }
  /* Einfuhr: MwSt 8,1 % ab ca. CHF 62 Warenwert (5 CHF Steuer), dazu Gebuehr des Zustellers.
     Bewusst keine Summe — die Gebuehr haengt vom Zusteller ab; wir sagen, DASS etwas dazukommt. */
  function herkunft(loc) {
    var l = String(loc || "").toUpperCase();
    if (l === "CH") return { ch: true, text: "Versand aus der Schweiz" };
    return { ch: false, text: "Versand aus " + (l || "dem Ausland") + " · Einfuhr-MwSt. & Zollgebühr möglich" };
  }

  /* Marken -> Ratgeber-Kategorie: „iphone" hat keinen eigenen Kaufberater, „handy" schon. */
  var MARKE = { iphone: "handy", galaxy: "handy", pixel: "handy", playstation: "spielkonsole",
    ps5: "spielkonsole", ps4: "spielkonsole", nintendo: "spielkonsole", switch: "spielkonsole",
    xbox: "spielkonsole", macbook: "laptop", thinkpad: "laptop", ipad: "tablet", dyson: "staubsauger",
    roomba: "saugroboter", nespresso: "kaffeemaschine" };

  /* Passender Kaufberater aus data/kaufberater-index.json. Das getippte Wort zaehlt mehr als
     seine Uebersetzung: „velo" soll zum Velo-Ratgeber, nicht zum Fahrrad-Ratgeber. */
  function kaufberater(q, index) {
    var eigen = woerter(q).filter(function (w) { return w.length >= 3; });
    var uebersetzt = woerter(begriff(q).q).concat(eigen.map(function (w) { return MARKE[w] || ""; }))
      .filter(function (w) { return w.length >= 3 && eigen.indexOf(w) < 0; });
    if (!eigen.length || !index) return null;
    var best = null, bs = 0;
    index.forEach(function (it) {
      if (it.k !== "kauf") return;
      var slug = klein(it.u).replace(/-kaufen-schweiz\.html$/, "").replace(/^\//, "");
      var s = 0;
      eigen.forEach(function (w) { if (slug === w) s += 10; else if (slug.split("-").indexOf(w) >= 0) s += 4; });
      uebersetzt.forEach(function (w) { if (slug === w) s += 9; else if (slug.split("-").indexOf(w) >= 0) s += 3; });
      if (s > bs) { bs = s; best = it; }
    });
    return bs >= 3 ? best : null;
  }

  var API = { begriff: begriff, signal: signal, ordne: ordne, spanne: spanne, preis: preis,
    chf: chf, herkunft: herkunft, kaufberater: kaufberater };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.ABAN_ANGEBOTE = API;
})(this);
