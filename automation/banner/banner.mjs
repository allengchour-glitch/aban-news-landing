/**
 * PINNWAND (Endfassung): Kategorie-Banner 2000 x 1000 (2:1) im Stil einer Pinterest-Pinnwand fuer LuxeStyle.ch.
 *
 * Fotos haengen wie angepinnte Karten (weisser Rand, hoechstens 1.6 Grad Schraeglage, feiner Schatten, leicht
 * ueberlappend) auf warmem Leinenpapier; ein Titelband in Markentinte laeuft quer durch die Mitte.
 *
 * Aufbau: Titelband mittig (y 355..645), darueber und darunter je eine gestaffelte Kartenreihe, links und rechts je eine
 * Kartenspalte. Titel und Fusszeile liegen in der Sicherheitszone x 570..1430 (860 px), die in JEDEM Zuschnitt bleibt:
 *   4:3 = x 333..1667 (1333 x 1000)      Quadrat = x 500..1500 (1000 x 1000)
 *
 * Die Aufteilung (Spaltenbreite, Karten je Seite/Reihe) wird je Fotozahl gesucht (rezept()): Kartenformate nahe am Quadrat
 * UND Spaltenkanten, die in beiden Zuschnitten keine schmalen Kartenstreifen am Rand hinterlassen.
 *
 * Zwei Schritte in der Seite (Skript, kein Netz noetig):
 *   1. Titel: beste Zeilenaufteilung (1-2 Zeilen, nie ein «&» allein) und groesste passende Schrift; Fusszeile passt sich an.
 *   2. Beim load: Fotos den Karten nach Wichtigkeit UND Seitenverhaeltnis zuordnen (Hungarian), Hochformat-Koepfe halten,
 *      weisse Freisteller (Schuhe, Schmuck auf Weiss) im Rahmen vergroessern, soweit das Produkt nicht beschnitten wird.
 *
 * Schnittstelle (unveraendert):
 *   bannerHtml(titel, bilder, anzahl [, opts]) -> komplette HTML-Seite fuer einen Viewport von 2000 x 1000
 *     bilder: URL- oder file://-Strings (6..14, empfohlen ab 8, Ziel 12); Anhang  #fokus=X,Y (Prozent) legt den Bildausschnitt fest,
 *             Anhang  #frei  erzwingt die Freisteller-Behandlung. anzahl: Text wie '12’000+ Artikel' oder '' (siehe anzahlText()).
 *     opts.band: 'tinte' (Vorgabe) | 'marine' (nur zum Vergleich);  opts.streng: true = weniger als 8 Fotos werfen einen Fehler.
 *   anzahlText(n) -> '250+ Artikel' (auf zwei gueltige Stellen abgerundet, Schweizer Apostroph)
 *
 * Schriften: nur lokale (Liberation Serif, Inter / Liberation Sans, DejaVu als Rueckfall). Kein Preis, kein Rabatt im Bild.
 */

export const W = 2000, H = 1000;
export const TECH_MIN = 6, MIN_FOTOS = 8, ZIEL_FOTOS = 12, MAX_FOTOS = 14;
export const SICHER = { x0: 570, x1: 1430 };                 // Titel und Fusszeile bleiben in jedem Zuschnitt innerhalb dieser Zone
export const ZUSCHNITTE = { '4x3': [333, 1667], '1x1': [500, 1500] };

const TITEL_MAX = 860, FUSS_MAX = 840;

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 252 -> '250+ Artikel', 1266 -> '1’200+ Artikel', 12881 -> '12’000+ Artikel'. Zwei gueltige Stellen, nie aufrunden. Unter 20: keine Zahl. */
export function anzahlText(n) {
  n = Math.floor(Number(n));
  if (!Number.isFinite(n) || n < 20) return '';
  const schritt = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
  const v = Math.floor(n / schritt) * schritt;
  return `${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '’')}+ Artikel`;
}

/** Startgroesse des Titels (px auf der 2000er Flaeche); das Skript in der Seite verfeinert sie. Rein. */
export function titelGroesse(titel) {
  const n = String(titel).length;
  return n <= 7 ? 176 : n <= 11 ? 160 : n <= 15 ? 128 : n <= 22 ? 104 : 92;
}

/** '' wenn die Fotozahl reicht, sonst ein Hinweis (unter 8 Fotos wirkt die Wand locker, der Auftrag lautet «viele Produkte»). Rein. */
export function fotoHinweis(n) {
  return n >= MIN_FOTOS ? '' : `nur ${n} Fotos, empfohlen ab ${MIN_FOTOS} (Ziel ${ZIEL_FOTOS})`;
}

/** Zerlegt eine Quelle in { src, fokus: [x,y] | null, frei: boolean } (Anhaenge #fokus=X,Y und #frei). Rein. */
export function quelle(s) {
  const str = String(s ?? '').trim();
  const i = str.indexOf('#');
  const src = i < 0 ? str : str.slice(0, i), anhang = i < 0 ? '' : str.slice(i + 1);
  const m = anhang.match(/(?:^|&)fokus=(\d{1,3}),(\d{1,3})(?:&|$)/);
  return { src, fokus: m ? [Math.min(100, +m[1]), Math.min(100, +m[2])] : null, frei: /(?:^|&)frei(?:&|$)/.test(anhang) };
}

/** Entfernt Leeres und Dubletten (gleiche Quelle ohne Anhang), begrenzt auf MAX_FOTOS. Rein. */
export function eindeutig(bilder) {
  const gesehen = new Set(), aus = [];
  for (const b of bilder || []) {
    const q = quelle(b);
    if (!q.src || gesehen.has(q.src)) continue;
    gesehen.add(q.src); aus.push(q);
  }
  return aus.slice(0, MAX_FOTOS);
}

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// ---------------------------------------------------------------------------------------------------------------------------
// Geometrie
// ---------------------------------------------------------------------------------------------------------------------------
const M = 18;                 // Aussenrand
const BAND = { y: 355, h: 290 };
const OV = 9;                 // Karten werden um OV (+ Zufall) vergroessert -> Nachbarn ueberlappen leicht
const ZEILE_OBEN = [M, BAND.y - 18], ZEILE_UNTEN = [BAND.y + BAND.h + 30, H - M];
const UEBER = 20;             // mittlere Vergroesserung einer Karte je Seite (OV + Zufall + Versatz), fuer die Streifen-Rechnung
const STAFFEL = 0.88;         // niedrigere Karten einer Reihe sind 12 % niedriger (Pinterest-Rhythmus)

const SEITE_EINZEL_MAX = H - 2 * M - 100;               // eine einzelne Seitenkarte darf fast die ganze Hoehe nehmen
const ZH = ZEILE_OBEN[1] - ZEILE_OBEN[0];              // Hoehe einer Mittelreihe
const SEITEN_GEWICHTE = { 2: [1.12, 0.88], 3: [1, 1.12, 0.88] };   // Hoehen der Seitenkarten: unregelmaessig statt Raster
function seitenHoehe(anz, w) { return anz === 1 ? Math.min(SEITE_EINZEL_MAX, w * 1.5) : (H - 2 * M) / anz; }

/** Anteil einer Karte (x, w), der im Zuschnitt [a, b] sichtbar ist (0..1). Rein. */
export function sichtbarkeit(x, w, [a, b]) { return Math.max(0, Math.min(x + w, b) - Math.max(x, a)) / w; }

/** Strafe fuer einen schmalen Kartenstreifen am Zuschnittrand: ab 4 % sichtbar, bis 30 % voll bestraft, bis 55 % abklingend. Rein. */
function streifen(v) { return v < 0.04 ? 0 : v < 0.30 ? 1 : v < 0.55 ? (0.55 - v) / 0.25 : 0; }

const cache = new Map();
/** Sucht die Aufteilung: Karten moeglichst quadratisch (4:5..5:4) und keine Kartenstreifen an den Zuschnittkanten. Rein. */
export function rezept(n) {
  if (cache.has(n)) return cache.get(n);
  let best = null;
  const q = x => Math.log(x) ** 2;
  const ss = []; for (let s = 300; s <= 520; s += 10) ss.push(s); ss.push(309, 476);
  for (const s of ss) for (let l = 1; l <= 3; l++) for (let r = 1; r <= 3; r++) for (let t = 1; t <= 6; t++) {
    const bb = n - l - r - t; if (bb < 1 || bb > 6 || t + bb < 4) continue;
    const sw = s - M, cw = W - 2 * s;
    let kosten = 0;
    for (const [anz, w] of [[l, sw], [r, sw]]) { const h = seitenHoehe(anz, w); kosten += anz * q(w / h); if (anz === 1) kosten += 0.9 * (1 - h / (H - 2 * M)); }
    kosten += t * q((cw / t) / ZH) + bb * q((cw / bb) / ZH);
    kosten += 0.12 * (Math.abs(l - r) + Math.abs(t - bb));
    // Zuschnitt-Sicherheit: Streifen an den Kanten von 4:3 und Quadrat (mit der Ueberlappung der Karten gerechnet); dazu Belohnung fuer Karten, die im Zuschnitt gut sichtbar bleiben
    const zellen = [];
    for (let i = 0; i < l; i++) zellen.push([M, sw]);
    for (let i = 0; i < r; i++) zellen.push([W - s, sw]);
    for (const anz of [t, bb]) for (let i = 0; i < anz; i++) zellen.push([s + i * cw / anz, cw / anz]);
    for (const z of Object.values(ZUSCHNITTE)) {
      const sicht = zellen.map(([x, w]) => sichtbarkeit(x - UEBER, w + 2 * UEBER, z));
      kosten += 1.4 * sicht.reduce((a, v) => a + streifen(v), 0);
      kosten -= 0.05 * sicht.filter(v => v >= 0.55).length;
    }
    if (!best || kosten < best.kosten - 1e-9) best = { s, l, r, t, b: bb, kosten };
  }
  if (!best) throw new Error(`bannerHtml: ${n} Fotos, erlaubt sind ${TECH_MIN} bis ${MAX_FOTOS}`);
  cache.set(n, best); return best;
}

/** Wichtigkeit eines Platzes (0..1): wie viel davon bleibt in 4:3 und Quadrat sichtbar. Rein. */
export function platzWert(x, w) {
  return 0.25 + 0.35 * sichtbarkeit(x, w, ZUSCHNITTE['4x3']) + 0.4 * sichtbarkeit(x, w, ZUSCHNITTE['1x1']);
}

/** Berechnet die Kartenplaetze (x, y, w, h, Winkel, Wichtigkeit). Rein, deterministisch je Titel. */
export function plaetze(n, titel) {
  if (!(n >= TECH_MIN && n <= MAX_FOTOS)) throw new Error(`bannerHtml: ${n} Fotos, erlaubt sind ${TECH_MIN} bis ${MAX_FOTOS}`);
  const rz = rezept(n);
  const rng = mulberry32(hash(titel));
  const zellen = [];
  // Mittelreihen gestaffelt: hohe und niedrige Karten wechseln sich ab; die Kante zum Band liegt unter dem Band (z-index), die Aussenkante schwankt
  const reihe = (anz, x0, x1, oben) => {
    const w = (x1 - x0) / anz, start = rng() < .5 ? 0 : 1;
    for (let i = 0; i < anz; i++) {
      const hoch = anz === 1 || (i + start) % 2 === 0;
      let y0, y1;
      if (oben) {   // Unterkante am Band (leicht darunter), Oberkante 20..32 (hoch) bzw. 12 % tiefer (niedrig)
        y1 = ZEILE_OBEN[1] + 6 + rng() * 8;
        const top = 20 + rng() * 12;
        y0 = hoch ? top : top + (1 - STAFFEL) * (y1 - top) + rng() * 6;
      } else {      // Oberkante am Band, Unterkante 984..990 (hoch) bzw. 960..966 (niedrig)
        y0 = ZEILE_UNTEN[0] - 6 - rng() * 8;
        y1 = hoch ? 984 + rng() * 6 : 960 + rng() * 6;
      }
      zellen.push({ x: x0 + i * w, y: y0, w, h: y1 - y0, art: 'mitte', fest: true });
    }
  };
  const spalte = (anz, x0, x1) => {
    if (anz === 1) { const h = seitenHoehe(1, x1 - x0); zellen.push({ x: x0, y: (H - h) / 2, w: x1 - x0, h, art: 'seite' }); return; }
    const gew = SEITEN_GEWICHTE[anz], summe = gew.reduce((a, b) => a + b, 0), gesamt = H - 2 * M;
    let y = M;
    for (let i = 0; i < anz; i++) { const h = gesamt * gew[i] / summe; zellen.push({ x: x0, y, w: x1 - x0, h, art: 'seite' }); y += h; }
  };
  reihe(rz.t, rz.s, W - rz.s, true);
  reihe(rz.b, rz.s, W - rz.s, false);
  spalte(rz.l, M, rz.s);
  spalte(rz.r, W - rz.s, W - M);
  for (const z of zellen) z.wert = platzWert(z.x, z.w);
  // Reihenfolge ohne Skript: wichtigster Platz zuerst (die besten Fotos liegen dann in jedem Zuschnitt sichtbar)
  zellen.sort((a, b) => b.wert - a.wert || Math.abs(a.x + a.w / 2 - W / 2) - Math.abs(b.x + b.w / 2 - W / 2));
  let vz = 1;
  return zellen.map((z, i) => {
    vz = -vz;                                           // Vorzeichen wechselt je Karte, damit nichts gleichmaessig kippt
    const grad = vz * (0.5 + rng() * 1.1);               // 0.5 .. 1.6 Grad
    const dx = (rng() - 0.5) * 16, dy = (rng() - 0.5) * 16, ov = OV + rng() * 7;
    const x = Math.max(14, z.x - ov + dx);
    const y = z.fest ? z.y : Math.max(20, z.y - ov + dy);
    const w = Math.min(z.w + 2 * ov, W - 14 - x);
    const h = z.fest ? z.h : Math.min(z.h + 2 * ov, H - 10 - y);
    return { x, y, w, h, art: z.art, wert: z.wert, grad: Math.round(grad * 100) / 100, nr: i, pin: (rng() - 0.5) * 0.3 };
  });
}

/** Einzelne Seitenkarten haengen auf einem Bogen Kraftpapier, der die Spaltenhoehe fuellt (sonst blieben Luecken in den Ecken). */
export function papiere(n, titel) {
  const rz = rezept(n), rng = mulberry32(hash(titel + '#papier')), aus = [];
  for (const [anz, x0, x1] of [[rz.l, M, rz.s], [rz.r, W - rz.s, W - M]]) {
    if (anz !== 1) continue;
    aus.push({ x: x0 + 4, y: M + 8, w: x1 - x0 - 8, h: H - 2 * M - 16, grad: Math.round((rng() < .5 ? -1 : 1) * (0.5 + rng() * 1.1) * 100) / 100 });
  }
  return aus;
}

const PINS = [
  ['#e6b25a', '#b9771c'], // Bernstein
  ['#4f8a6c', '#2a5a43'], // Waldgruen
  ['#d98a6a', '#a8452f'], // Terrakotta
];
const BAENDER = { tinte: ['#2c2118', '#1e160f'], marine: ['#27323f', '#1c2530'] };

// ---------------------------------------------------------------------------------------------------------------------------
// Skript in der Seite (wird als Text eingebettet; laeuft im Browser, nicht in Node)
// ---------------------------------------------------------------------------------------------------------------------------
/* eslint-disable */
function seitenSkript(C) {
  var bericht = window.__bericht = { titelPx: 0, titelZeilen: 0, titelBreite: 0, fuss: '', fussBreite: 0, zuordnung: [], freisteller: [], fehlend: 0, messbar: 0 };

  /* ---- 1. Titel: beste Zeilenaufteilung + groesste passende Schrift ---- */
  var t = document.getElementById('t');
  var cv = document.createElement('canvas').getContext('2d');
  var FAM = "'Liberation Serif','DejaVu Serif',Georgia,serif", TRACK = -0.012;
  function breite(s, fs) { cv.font = '700 ' + fs + 'px ' + FAM; return cv.measureText(s).width + TRACK * fs * s.length; }
  var raw = C.titel.replace(/\s+/g, ' ').trim(), worte = raw.split(' ');
  var kand = [[raw]], i;
  for (i = 1; i < worte.length; i++) kand.push([worte.slice(0, i).join(' '), worte.slice(i).join(' ')]);
  worte.forEach(function (w, j) {          // auch ein Umbruch nach dem Bindestrich im Wort (Damen-/Mode), aber nur als Notloesung
    var k = w.indexOf('-');
    if (k > 0 && k < w.length - 1) kand.push([worte.slice(0, j).concat([w.slice(0, k + 1)]).join(' '), [w.slice(k + 1)].concat(worte.slice(j + 1)).join(' ')]);
  });
  var best = null;
  kand.forEach(function (z) {
    if (z.some(function (s) { return s === '&' || s === ''; })) return;     // nie ein «&» allein in einer Zeile
    var mx = 0; z.forEach(function (s) { mx = Math.max(mx, breite(s, 100)); });
    var fs = Math.min(C.start, 100 * C.maxW / mx * 0.995, (z.length > 1 ? C.maxH2 : C.maxH) / (z.length * C.lh));
    var score = fs * (1 - 0.05 * (z.length - 1)) + (z.length > 1 && z[1].charAt(0) === '&' ? 3 : 0) - (z.length > 1 && z[0].slice(-1) === '-' ? 6 : 0);
    if (!best || score > best.score) best = { fs: fs, score: score, zeilen: z };
  });
  if (!best) best = { fs: 48, zeilen: [raw] };
  var fs = Math.floor(best.fs);
  t.textContent = '';
  best.zeilen.forEach(function (z, j) { if (j) t.appendChild(document.createElement('br')); var sp = document.createElement('span'); sp.textContent = z; t.appendChild(sp); });
  t.style.whiteSpace = 'nowrap'; t.style.fontSize = fs + 'px';
  while (fs > 36 && t.scrollWidth > C.maxW + 0.5) { fs--; t.style.fontSize = fs + 'px'; }
  bericht.titelPx = fs; bericht.titelZeilen = best.zeilen.length;
  var tr = document.createRange(); tr.selectNodeContents(t);
  var tb = [].slice.call(tr.getClientRects()).reduce(function (a, r) { return { l: Math.min(a.l, r.left), r: Math.max(a.r, r.right) }; }, { l: 1e9, r: -1e9 });
  bericht.titelBreite = Math.round(tb.r - tb.l); bericht.titelLinks = Math.round(tb.l); bericht.titelRechts = Math.round(tb.r);

  /* ---- Fusszeile: dreiteilig nur, wenn sie bei Schriftgroesse >= 30 in die Zone passt, sonst «Schweizer Shop» weglassen ---- */
  var sub = document.querySelector('.sub'), kinder = [].slice.call(sub.children);
  function fussBreite() { return kinder[kinder.length - 1].getBoundingClientRect().right - kinder[0].getBoundingClientRect().left; }
  bericht.fuss = 'voll';
  if (sub.querySelector('.m2') && sub.querySelector('.m3') && fussBreite() > C.fussMax) { sub.classList.add('kurz'); bericht.fuss = 'kurz'; kinder = kinder.filter(function (e) { return getComputedStyle(e).display !== 'none'; }); }
  for (var u = 1; u >= 0.7 && fussBreite() > C.fussMax; u -= 0.02) { sub.style.setProperty('--u', u); bericht.fuss += '*'; }
  bericht.fussBreite = Math.round(fussBreite());
  var fr = kinder[0].getBoundingClientRect(), fl = kinder[kinder.length - 1].getBoundingClientRect();
  bericht.fussLinks = Math.round(fr.left); bericht.fussRechts = Math.round(fl.right);

  /* ---- 2. Fotos den Karten zuordnen (nach dem load) ---- */
  function zuordnen(imgs, ms) {
    var ks = [].slice.call(document.querySelectorAll('.k'));
    var N = imgs.length; if (N < 2) return;
    var wert = ks.map(function (k) { return +k.getAttribute('data-wert'); });
    var ord = wert.map(function (w, j) { return j; }).sort(function (a, b) { return wert[b] - wert[a]; }), rang = [];
    ord.forEach(function (ci, r) { rang[ci] = r; });
    var asps = imgs.map(function (im, a) {       // Freisteller: es zaehlt das Seitenverhaeltnis des PRODUKTS (der weisse Rand wird ohnehin beschnitten)
      var asp = (im.naturalWidth || 1) / (im.naturalHeight || 1), m = ms[a];
      if (m && m.box && (m.frei || im.hasAttribute('data-frei'))) {
        var bw = (m.box[2] - m.box[0]) * (im.naturalWidth || 1), bh = (m.box[3] - m.box[1]) * (im.naturalHeight || 1);
        if (bw > 0 && bh > 0) asp = Math.max(0.55, Math.min(1.8, bw / bh));
      }
      return asp;
    });
    var cost = imgs.map(function (im, a) {
      var m = ms[a], frei = m && m.box && (m.frei || im.hasAttribute('data-frei'));
      return ks.map(function (k, j) {
        var qq = 1 - a / (N - 1), ss = 1 - rang[j] / (N - 1), kw = +k.getAttribute('data-w') - 22, kh = +k.getAttribute('data-h') - 22, ca = kw / kh;
        var c = 4 * Math.pow(qq - ss, 2) + 1.3 * Math.abs(Math.log(ca / asps[a]));
        if (frei) {                                   // Freisteller: wie viel vom PRODUKT schneidet die Karte ab? (Bogen, Armband: nie in eine breite Karte)
          var iw = im.naturalWidth || 1, ih = im.naturalHeight || 1, sc = Math.max(kw / iw, kh / ih);
          var bw = (m.box[2] - m.box[0]) * iw * sc, bh = (m.box[3] - m.box[1]) * ih * sc;
          c += 6 * (1 - Math.min(1, kw / bw) * Math.min(1, kh / bh));
        }
        return c;
      });
    });
    var zu = hungarian(cost);
    imgs.forEach(function (im, a) {
      ks[zu[a]].querySelector('.f').appendChild(im);
      var fok = im.getAttribute('data-fokus');
      var nat = (im.naturalWidth || 1) / (im.naturalHeight || 1);
      im.style.objectPosition = fok ? fok.split(',')[0] + '% ' + fok.split(',')[1] + '%' : '50% ' + (nat < 0.9 ? 8 : 40) + '%';   // Hochformat: Kopf oben halten
    });
    bericht.zuordnung = zu;
    bericht.fehlend = imgs.filter(function (im) { return !im.complete || !im.naturalWidth; }).length;
  }
  function hungarian(a) {       /* O(n^3); Zeilen = Fotos, Spalten = Karten; liefert die Karte je Foto */
    var n = a.length, INF = 1e9, u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
    for (var i = 1; i <= n; i++) {
      p[0] = i; var j0 = 0, minv = new Array(n + 1).fill(INF), used = new Array(n + 1).fill(false);
      do {
        used[j0] = true; var i0 = p[j0], delta = INF, j1 = 0;
        for (var j = 1; j <= n; j++) if (!used[j]) { var cur = a[i0 - 1][j - 1] - u[i0] - v[j]; if (cur < minv[j]) { minv[j] = cur; way[j] = j0; } if (minv[j] < delta) { delta = minv[j]; j1 = j; } }
        for (var j = 0; j <= n; j++) if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
        j0 = j1;
      } while (p[j0] !== 0);
      do { var jb = way[j0]; p[j0] = p[jb]; j0 = jb; } while (j0);
    }
    var res = []; for (var j = 1; j <= n; j++) res[p[j] - 1] = j - 1; return res;
  }

  /* ---- 3. Weisse Freisteller: Produkt im Rahmen vergroessern, soweit es dabei nicht beschnitten wird ---- */
  function messen(src) {         // liest die Pixel einer Kopie (crossOrigin); schlaegt das fehl (kein CORS), bleibt das Foto unveraendert
    return new Promise(function (ok) {
      var fertig = false; function fin(v) { if (!fertig) { fertig = true; ok(v); } }
      setTimeout(function () { fin(null); }, 5000);
      var im = new Image(); im.crossOrigin = 'anonymous';
      im.onerror = function () { fin(null); };
      im.onload = function () {
        try {
          var G = 96, cn = document.createElement('canvas'); cn.width = G; cn.height = G;
          var cx = cn.getContext('2d', { willReadFrequently: true }); cx.drawImage(im, 0, 0, G, G);
          var d = cx.getImageData(0, 0, G, G).data;
          var lum = function (o) { return (0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2]) / 255; };
          var weiss = function (o) { return lum(o) >= 0.92 && Math.min(d[o], d[o + 1], d[o + 2]) >= 228; };
          var inhalt = function (o) { return !(lum(o) >= 0.94 && Math.min(d[o], d[o + 1], d[o + 2]) >= 236); };
          var RING = 6, ring = 0, ringW = 0, x, y, x0 = G, y0 = G, x1 = -1, y1 = -1, sr = 0, sg = 0, sb = 0;
          for (y = 0; y < G; y++) for (x = 0; x < G; x++) {
            var o = (y * G + x) * 4;
            if (x < RING || y < RING || x >= G - RING || y >= G - RING) { ring++; if (weiss(o)) { ringW++; sr += d[o]; sg += d[o + 1]; sb += d[o + 2]; } }
            if (inhalt(o)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          }
          var ecken = [[0, 0], [G - 3, 0], [0, G - 3], [G - 3, G - 3]].every(function (c) {
            var s = 0; for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) s += lum(((c[1] + b) * G + c[0] + a) * 4); return s / 9 >= 0.92;
          });
          fin({ frei: ecken && ringW / ring >= 0.92, ring: ringW / ring, bg: ringW ? [Math.round(sr / ringW), Math.round(sg / ringW), Math.round(sb / ringW)] : [255, 255, 255], box: x1 < 0 ? null : [Math.max(0, x0 - 2) / G, Math.max(0, y0 - 2) / G, Math.min(G, x1 + 3) / G, Math.min(G, y1 + 3) / G] });
        } catch (e) { fin(null); }
      };
      im.src = src;
    });
  }
  function freistellen(im, m) {
    var f = im.parentNode, cw = f.offsetWidth, ch = f.offsetHeight, iw = im.naturalWidth, ih = im.naturalHeight, b = m.box;
    if (!b || !iw || !ih) return { s: 1 };
    var c = Math.max(cw / iw, ch / ih), dw = iw * c, dh = ih * c, ox = (cw - dw) / 2, oy = (ch - dh) / 2;       // cover, zentriert
    var X0 = ox + b[0] * dw, X1 = ox + b[2] * dw, Y0 = oy + b[1] * dh, Y1 = oy + b[3] * dh, mg = 0.05 * Math.min(cw, ch);
    var cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2, hw = (X1 - X0) / 2, hh = (Y1 - Y0) / 2;
    // Das Produkt kommt in die Kartenmitte und wird so weit vergroessert (hoechstens freiMax), dass es mit 5 % Rand in der Karte bleibt (zu gross: verkleinert).
    // Der freigelegte Rand hat die Farbe des Bildrands (Kartengrund = Mittel der weissen Randpixel), also keine Naht.
    var s = Math.max(0.4, Math.min(C.freiMax, (cw / 2 - mg) / Math.max(1e-6, hw), (ch / 2 - mg) / Math.max(1e-6, hh)));   // ragt das Produkt ueber die Karte, wird es verkleinert (bis 0.4), statt angeschnitten
    if (Math.abs(s - 1) < 0.04) return { s: 1 };
    if (m.bg) f.style.background = 'rgb(' + m.bg.join(',') + ')';
    // Das Foto wird in voller Groesse (cover-Mass) in die Karte gelegt statt per object-fit beschnitten, sonst waere der beschnittene Teil
    // beim Verkleinern nicht mehr zu holen (Armband in einer breiten Karte).
    im.style.position = 'absolute'; im.style.left = ox.toFixed(1) + 'px'; im.style.top = oy.toFixed(1) + 'px';
    im.style.width = dw.toFixed(1) + 'px'; im.style.height = dh.toFixed(1) + 'px'; im.style.objectFit = 'fill';
    im.style.transformOrigin = (cx - ox).toFixed(1) + 'px ' + (cy - oy).toFixed(1) + 'px';
    im.style.transform = 'translate(' + (cw / 2 - cx).toFixed(1) + 'px,' + (ch / 2 - cy).toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
    // Abstand des Produkts zum Kartenrand nach der Behandlung (Anteil der kleineren Kartenseite; negativ = angeschnitten)
    var rand = Math.min(cw / 2 - s * hw, ch / 2 - s * hh) / Math.min(cw, ch);
    return { s: s, rand: Math.round(rand * 1000) / 1000 };
  }
  function freisteller(imgs, ms) {
    imgs.forEach(function (im, a) {
      var m = ms[a], zwang = im.hasAttribute('data-frei');                                       // #frei: von Hand erzwungen (auch ohne lesbare Pixel)
      if (im.getAttribute('data-fokus')) return;                                                  // ein ausdruecklicher Bildausschnitt gilt
      if (m) bericht.messbar++;
      if (!m && !zwang) return;
      if (m && !(m.frei || zwang)) return;
      var r = m && m.box ? freistellen(im, m) : { s: 1 };
      if (zwang && r.s === 1) { im.style.transformOrigin = '50% 50%'; im.style.transform = 'scale(' + C.freiMax + ')'; r = { s: C.freiMax }; }
      bericht.freisteller.push({ src: im.getAttribute('src'), s: Math.round(r.s * 1000) / 1000, rand: r.rand, ring: m ? Math.round(m.ring * 100) / 100 : null });
    });
  }
  window.addEventListener('load', function () {
    var ende = function () { window.__fertig = true; };
    var imgs = [].slice.call(document.querySelectorAll('.k img'));
    imgs.sort(function (a, b) { return a.getAttribute('data-i') - b.getAttribute('data-i'); });
    Promise.all(imgs.map(function (im) { return im.getAttribute('data-fokus') ? null : messen(im.currentSrc || im.src); })).then(function (ms) {
      try { zuordnen(imgs, ms); freisteller(imgs, ms); } catch (e) { bericht.fehler = String(e); }
      ende();
    }, ende);
  });
}
/* eslint-enable */

// ---------------------------------------------------------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------------------------------------------------------
/** Komplette HTML-Seite (Viewport 2000 x 1000). bilder = URL- oder file://-Strings (6..14), anzahl = Text oder ''. */
export function bannerHtml(titel, bilder, anzahl, opts = {}) {
  const titelText = String(titel ?? '').replace(/\s+/g, ' ').trim();
  const fotos = eindeutig(bilder);
  const n = fotos.length;
  if (n < TECH_MIN) throw new Error(`bannerHtml: ${n} Fotos, erlaubt sind ${TECH_MIN} bis ${MAX_FOTOS}`);
  if (opts.streng && n < MIN_FOTOS) throw new Error(`bannerHtml: ${n} Fotos, mindestens ${MIN_FOTOS} verlangt (Ziel ${ZIEL_FOTOS})`);
  const hinweis = fotoHinweis(n);
  const sl = plaetze(n, titelText);
  const [bA, bB] = BAENDER[opts.band] || BAENDER.tinte;
  const karte = (p, f, i) => {
    const [pa, pb] = PINS[p.nr % PINS.length];
    const nadel = p.nr % 2 === 0;                          // Nadel nur an jeder zweiten Karte
    const band = p.nr % 6 === 5;                           // Washi-Streifen nur an jeder sechsten
    const halter = nadel
      ? `<i class="pin" style="left:${(50 + p.pin * 100).toFixed(1)}%;--a:${pa};--b:${pb}"></i>`
      : band ? `<i class="tape" style="--r:${(p.nr % 4 === 1 ? 1 : -1) * 3}deg;--c:${p.nr % 12 === 5 ? 'rgba(214,168,86,.62)' : 'rgba(120,160,138,.62)'}"></i>` : '';
    return `<div class="k ${p.art}" data-wert="${p.wert.toFixed(3)}" data-w="${p.w.toFixed(1)}" data-h="${p.h.toFixed(1)}" style="left:${p.x.toFixed(1)}px;top:${p.y.toFixed(1)}px;width:${p.w.toFixed(1)}px;height:${p.h.toFixed(1)}px;transform:rotate(${p.grad}deg)"><div class="f"><img data-i="${i}"${f.fokus ? ` data-fokus="${f.fokus[0]},${f.fokus[1]}"` : ''}${f.frei ? ' data-frei' : ''} src="${esc(f.src)}" alt=""></div>${halter}</div>`;
  };
  const karten = sl.map((p, i) => karte(p, fotos[i], i)).join('\n')
    + papiere(n, titelText).map(p => `<div class="papier" style="left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;transform:rotate(${p.grad}deg)"><i class="tape" style="--r:${(-p.grad * 2).toFixed(2)}deg;--c:rgba(214,168,86,.62)"></i></div>`).join('\n');
  const rz = rezept(n);
  const bandX = Math.max(200, rz.s - 90);                  // Band laeuft unter die Seitenkarten; Titel bleibt in der Sicherheitszone
  const marke = `<span class="m1">LuxeStyle.ch</span>`
    + (anzahl ? `<span class="pt a"></span><span class="m2">Schweizer Shop</span><span class="pt b"></span><span class="m3">${esc(anzahl)}</span>` : `<span class="pt a"></span><span class="m2">Schweizer Shop</span>`);
  const cfg = { titel: titelText, maxW: TITEL_MAX, maxH: 190, maxH2: 172, lh: 1.02, start: titelGroesse(titelText), fussMax: FUSS_MAX, freiMax: 1.22 };
  const cfgJson = JSON.stringify(cfg).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="de-CH"><head><meta charset="utf-8"><title>${esc(titelText)}</title>${hinweis ? `<meta name="banner-hinweis" content="${esc(hinweis)}">` : ''}<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{position:relative;font-family:'Liberation Serif','DejaVu Serif',Georgia,serif;color:#241c14;
  background:
   radial-gradient(ellipse 70% 62% at 50% 46%,rgba(255,250,240,.75) 0%,rgba(255,250,240,0) 70%),
   repeating-linear-gradient(0deg,rgba(110,84,50,.045) 0 1px,transparent 1px 4px),
   repeating-linear-gradient(90deg,rgba(110,84,50,.04) 0 1px,transparent 1px 4px),
   linear-gradient(135deg,#f1e7d4 0%,#e7d9bf 100%)}
body::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:9;background:radial-gradient(ellipse 85% 85% at 50% 50%,rgba(0,0,0,0) 62%,rgba(90,60,25,.16) 100%)}
.k{position:absolute;padding:11px;background:#fffdf7;border-radius:13px;
  box-shadow:0 1px 2px rgba(70,45,20,.30),0 6px 12px rgba(70,45,20,.18),0 16px 28px rgba(70,45,20,.12)}
.k.mitte{z-index:1}.k.seite{z-index:3}
.papier{position:absolute;z-index:2;border-radius:11px;box-shadow:0 1px 2px rgba(70,45,20,.3),0 10px 22px rgba(70,45,20,.2);
  background:repeating-linear-gradient(0deg,rgba(255,255,255,.07) 0 1px,transparent 1px 5px),linear-gradient(160deg,#e6d1a8 0%,#d9bf90 100%)}
.papier .tape{top:-10px}
.f{position:relative;width:100%;height:100%;border-radius:5px;overflow:hidden;background:#efe6d6}
.f img{width:100%;height:100%;object-fit:cover;object-position:50% 40%;display:block}
.f::after{content:'';position:absolute;inset:0;border-radius:5px;box-shadow:inset 0 0 0 1px rgba(60,40,20,.24)}
.pin{position:absolute;top:-8px;width:20px;height:20px;margin-left:-10px;border-radius:50%;
  background:radial-gradient(circle at 34% 30%,#fff9 0 8%,var(--a) 22%,var(--b) 100%);
  box-shadow:0 5px 6px rgba(40,25,10,.34),0 1px 2px rgba(40,25,10,.5),inset 0 -2px 3px rgba(0,0,0,.22)}
.tape{position:absolute;top:-11px;left:50%;width:84px;height:24px;margin-left:-42px;transform:rotate(var(--r));background:var(--c);
  box-shadow:0 2px 3px rgba(40,25,10,.18);
  -webkit-mask:linear-gradient(90deg,transparent 0,#000 3px,#000 calc(100% - 3px),transparent 100%);
  background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.22) 0 4px,transparent 4px 10px)}
.band{position:absolute;z-index:2;left:${bandX}px;width:${W - 2 * bandX}px;top:${BAND.y}px;height:${BAND.h}px;transform:rotate(-.7deg);
  background:repeating-linear-gradient(90deg,rgba(255,255,255,.028) 0 1px,transparent 1px 3px),linear-gradient(180deg,${bA} 0%,${bB} 100%);color:#f8f0df;
  box-shadow:0 2px 3px rgba(20,15,10,.4),0 14px 30px rgba(30,20,10,.34)}
.band::before{content:'';position:absolute;inset:13px;border:1.5px dashed rgba(230,178,90,.45);border-radius:6px;pointer-events:none}
.band .pin{top:-8px}
.tw{position:absolute;left:50%;top:26px;width:${TITEL_MAX}px;height:190px;margin-left:-${TITEL_MAX / 2}px;display:flex;align-items:center;justify-content:center}
.t{width:${TITEL_MAX}px;text-align:center;font-weight:700;line-height:1.02;letter-spacing:-.012em;font-size:${titelGroesse(titelText)}px;
  text-shadow:0 2px 0 rgba(0,0,0,.28)}
.sub{--u:1;position:absolute;left:50%;width:${FUSS_MAX}px;margin-left:-${FUSS_MAX / 2}px;bottom:28px;display:flex;align-items:center;justify-content:center;gap:calc(18px*var(--u));
  font-family:'Inter','Liberation Sans','DejaVu Sans',sans-serif;white-space:nowrap}
.m1{font-family:'Liberation Serif','DejaVu Serif',serif;font-style:italic;font-weight:700;font-size:calc(44px*var(--u));letter-spacing:.01em;color:#f8f0df}
.m2,.m3{font-weight:600;font-size:calc(30px*var(--u));letter-spacing:.12em;text-transform:uppercase;color:#e6b25a}
.kurz .m2,.kurz .pt.b{display:none}
.kurz .m3{font-size:calc(34px*var(--u))}
.pt{width:10px;height:10px;transform:rotate(45deg);background:#e6b25a;opacity:.85}
</style></head><body data-fotos="${n}">
${karten}
<div class="band"><i class="pin" style="left:${(rz.s - bandX) + 40}px;--a:#e6b25a;--b:#b9771c"></i><i class="pin" style="left:${W - 2 * bandX - (rz.s - bandX) - 40}px;--a:#4f8a6c;--b:#2a5a43"></i>
  <div class="tw"><div class="t" id="t">${esc(titelText)}</div></div>
  <div class="sub">${marke}</div></div>
<script>(${seitenSkript.toString()})(${cfgJson});</script>
</body></html>`;
}
