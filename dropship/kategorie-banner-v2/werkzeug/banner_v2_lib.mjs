/**
 * banner_v2_lib.mjs — reine Funktionen für kategorie_banner_v2.mjs (kein Netz, keine Dateien, getestet in banner_v2_test.mjs).
 *
 * Grundlage: Messung und Plan vom 11.11.2026 (scratchpad banner1111). Was das Werkzeug liefert und warum:
 *  - Der sichtbare «Banner» der Kategorieseite ist NICHT collection.image, sondern der Theme-Kopf lux_hero (Titel, Beschreibung,
 *    Titelbilder der ersten 4 Produkte, am Handy 2). collection.image erscheint nur als og:image, in der Bild-Sitemap, als
 *    Startseiten-Kachel (48 px, cover), Entdecken-Karte (1.12, contain) und Verzeichniskachel (1.08, contain).
 *  - Darum zwei Teile: (1) collection.image = EIN echtes, geprüftes Produktfoto, quadratisch, Produkt mittig mit rund 10 % Rand,
 *    heller ruhiger Grund (Rang 5 des Plans); (2) luxe.kopf_produkte = 4 geprüfte Produkte für den Kopf (Rang 1/2; das Theme liest
 *    die Liste erst nach der Theme-Änderung, bis dahin wirkungslos).
 *  - Kein Text, keine Zahl, kein Preis im Bild; Text gehört ins HTML. Keine KI-Szenen, keine KI-Produkte: nur echte Fotos, die
 *    höchstens beschnitten (nur Hintergrund) und auf ihrer eigenen Randfarbe eingepasst werden.
 */
import { createHash } from 'node:crypto';

export const PROMPT_VERSION = 'v2-1111c';

// ---------------------------------------------------------------- Wortlisten (Titel)
/** Kopie von gmc_feed_item.LIZENZ + gmc_schaufenster.LIZENZ_PLUS (Stand 11.11.2026), damit die Bibliothek ohne Repo testbar bleibt. */
export const LIZENZ = /\b(harry potter|batman|superman|spider[- ]?man|paw patrol|pok[eé]mon|peppa|star wars|marvel|avengers|minions?|hello kitty|barbie|mickey|minnie|super mario|sonic|bluey|spongebob|hulk|iron man|captain america|pikachu|garfield|pingu|wednesday|morticia|patrick star|zelda|disney|frozen|lego)\b/i;
/** Fremdmarken im Titel (Banner zeigt sonst das Logo). Ohne «braun» (Farbe), «galaxy» (Sternenprojektor), «omega» (Omega-3). */
export const MARKEN = /\b(nike|adidas|puma|reebok|converse|vans|new balance|asics|under armour|north face|timberland|levi'?s|tommy hilfiger|calvin klein|lacoste|ralph lauren|hugo boss|michael kors|chanel|gucci|prada|dior|herm[eè]s|louis vuitton|burberry|versace|fendi|rolex|casio|g-shock|seiko|swatch|tissot|apple|iphone|ipad|airpods|samsung|xiaomi|huawei|sony|playstation|xbox|nintendo|playmobil|fisher-price|mattel|hasbro|de'?longhi|dyson|philips|bosch|sonax|akyga|hunter|new era|crocs|birkenstock|ugg|dr\.? ?martens|supreme|poedagar|naturehike|dainese|hi-tec|clinique|l'or[eé]al|maybelline|nivea|occ motorsport|fellowes)\b/i;
/** Wirkversprechen im Titel: solche Produkte zeigen fast immer Pfeile oder vorher/nachher. */
export const WIRK = /lifting|anti[- ]?aging|abnehm|fettverbrenn|\bheil(t|ung|en)?\b|therap|medizin|schmerz(frei|linder)|entgift|detox|faltenfrei|cellulite/i;
export const SOMMER = /sommer|strand|bade(mode|anzug|hose|shorts|kleid|tuch|schlappen)|bikini|tankini|flip[- ]?flops?|\bpool|sonnenschutz|sonnencreme|zehentrenner|sandalen?\b|schwimm/i;
export const HALLOWEEN = /halloween|k(ü|ue)rbis|pumpkin|horror|zombie|blutig/i;
export const WEIHNACHT = /weihnacht|advent|christbaum|nikolaus|samichlaus|santa|rentier|lebkuchen|schneem(a|ä)nn|schneeflock|winter/i;
export const FASNACHT = /fasnacht|fasching|karneval|kost(ü|ue)m|maske|konfetti/i;
/** Prüf- und Negativ-Tags (Kopie gmc_schaufenster NEGATIV_TAGS/PRUEF_TAGS, 11.11.2026) plus eigene. */
export const PRUEF_TAGS = /^(cj-ausgelistet|bild-zu-klein|google-bild-abgelehnt|waffenzubehoer-nicht-verkaufen|stecker-nicht-ch|stecker-unklar|marken-pruefen|waffe-pruefen|versand-pruefen|google-policy-waffen|heilversprechen-risiko|google-kanal-markenware-unklar|lieferumfang-unklar|preis-pruefen-cj-spanne|compliance-pruefen|grind-gehalten-0911|text-offen)$/;
/** Produkte, die nicht auf Schaufenster-Plätze dürfen, bis der Besitzer entscheidet (Gegenprüfung 11.11.). */
export const SPERR_PRODUKTE = [
  'sportliche-herrenuhr-mit-chronograph-481792',   // Gestalt der Audemars Piguet Royal Oak (Hypothese Rechtsrisiko, Besitzer-Entscheid offen)
  'keramik-tiki-tasse-fur-cocktails-088704',       // Titelbild mit weissem Überlagerungsrest, stand in 6 Köpfen
  'weit-geschnittene-trainingsschuhe-mit-weicher-635000', // Seitenstreifen im Stil einer Sportmarke (Sichtung 11.11., Gemini meldete nichts)
];

// ---------------------------------------------------------------- Saison
/** @returns {string|null} Sperrgrund für die Saison (November bis März keine Sommerware, Halloween nur im Oktober), ausser die Kategorie ist selbst so eine. */
export function saisonSperre(titel, kat, datum) {
  const m = datum.getUTCMonth() + 1;
  const katText = `${kat.handle || ''} ${kat.titel || ''}`;
  if ((m >= 11 || m <= 3) && SOMMER.test(titel || '') && !SOMMER.test(katText)) return 'saison-sommer';
  if (m !== 10 && HALLOWEEN.test(titel || '') && !HALLOWEEN.test(katText)) return 'saison-halloween';
  return null;
}

/**
 * Saisonbonus 0..2: bis 24.12. Weihnachten in Geschenk-/Wohnwelten, ab 11.11. bis 20.02. Fasnacht in Kostümwelten.
 * Fasnacht zählt nach Titel ODER Produktart (Kostüm/Verkleidung), aber nie ein Weihnachts- oder Nikolauskostüm
 * (Lauf 11.11.: «Kostüm Nikolaus» bekam den Fasnachtsbonus und wurde Kategoriebild von «Kostüme & Fasnacht»).
 */
export function saisonBonus(titel, kat, datum, typ = '') {
  const m = datum.getUTCMonth() + 1, t = datum.getUTCDate();
  const katText = `${kat.handle || ''} ${kat.titel || ''}`.toLowerCase();
  const weihnachtsZeit = m === 11 || (m === 12 && t <= 24);
  const fasnachtsZeit = (m === 11 && t >= 11) || m === 12 || m === 1 || (m === 2 && t <= 20);
  if (weihnachtsZeit && /geschenk|weihnacht|wohnen|deko|premium|advent/.test(katText) && WEIHNACHT.test(titel || '')) return 2;
  if (fasnachtsZeit && /kost(ü|ue)m|fasnacht|party|karneval/.test(katText) && (FASNACHT.test(titel || '') || /kost(ü|ue)m|verkleid/i.test(typ || '')) && !WEIHNACHT.test(titel || '')) return 2;
  return 0;
}

// ---------------------------------------------------------------- Produkt-Tor
/**
 * Darf das Produkt in Banner oder Kopf? Rein: der Aufrufer liefert die Felder aus der Admin-API.
 * @param {{handle:string,title:string,status:string,onlineStoreUrl:string|null,tracksInventory:boolean,totalInventory:number,tags:string[],featuredImage?:object}} p
 * @param {{kat:{handle:string,titel:string}, datum:Date, sperrTags?:Set<string>|string[], sperrHandles?:Set<string>|string[]}} ctx
 * @returns {{ok:boolean, grund:string|null}}
 */
export function produktTor(p, ctx) {
  const sperrTags = new Set(ctx.sperrTags || []), sperrHandles = new Set([...(ctx.sperrHandles || [])]);
  const nein = grund => ({ ok: false, grund });
  if (!p || p.status !== 'ACTIVE') return nein('status-' + String(p?.status || 'fehlt').toLowerCase());
  if (!p.onlineStoreUrl) return nein('nicht-im-onlineshop');
  if (p.tracksInventory === true && !(Number(p.totalInventory) > 0)) return nein('ausverkauft');
  for (const t of p.tags || []) {
    if (sperrTags.has(t)) return nein('sperrtag:' + t);
    if (PRUEF_TAGS.test(t)) return nein('pruef-tag:' + t);
  }
  if (sperrHandles.has(p.handle)) return nein('sperrliste');
  const titel = p.title || '';
  if (LIZENZ.test(titel)) return nein('lizenz-titel');
  if (MARKEN.test(titel)) return nein('marke-titel');
  if (WIRK.test(titel)) return nein('wirkversprechen-titel');
  const s = saisonSperre(titel, ctx.kat, ctx.datum);
  if (s) return nein(s);
  if (!p.featuredImage?.url) return nein('kein-bild');
  return { ok: true, grund: null };
}

/** Bewährt = mindestens 4 Sterne bei mindestens 3 Stimmen (wie gmc_schaufenster). Werte aus reviews.rating / reviews.rating_count. */
export function bewaehrt(ratingWert, anzahlWert) {
  let r = ratingWert;
  if (typeof r === 'string' && r.trim().startsWith('{')) { try { r = JSON.parse(r).value; } catch { return false; } }
  const rating = Number.parseFloat(String(r ?? '')), anzahl = Number.parseInt(String(anzahlWert ?? ''), 10);
  return Number.isFinite(rating) && Number.isFinite(anzahl) && rating >= 4 && anzahl >= 3;
}

// ---------------------------------------------------------------- Bilder
/** Basis einer CDN-Adresse ohne Abfrage (?v=, &width=). */
export const urlStamm = u => String(u || '').split('?')[0];
/**
 * Ist es dasselbe Bild? Shopify behält beim Tausch eines Collection-Bildes den Dateinamen und ändert nur ?v=
 * (GEMESSEN 11.11.2026 an weihnachten-2026). Darum zählt: gleiche volle Adresse, oder gleicher Dateiname UND gleicher
 * Alt-Text UND gleiche Masse (wo bekannt). Ein Vergleich nur des Dateinamens hielt das neue Bild für unverändert.
 */
export function bildGleich(a, b) {
  if (!a?.url || !b?.url) return !a?.url && !b?.url;
  if (String(a.url) === String(b.url)) return true;
  if (urlStamm(a.url) !== urlStamm(b.url)) return false;
  if (String(a.altText || '') !== String(b.altText || '')) return false;
  const m = (x, y) => x == null || y == null || Number(x) === Number(y);
  return m(a.width, b.width) && m(a.height, b.height);
}
/** Dateistamm ohne Endung und ohne Shopifys Kollisions-Anhang «_<uuid>». */
export function dateiStamm(u) {
  const name = decodeURIComponent(urlStamm(u).split('/').pop() || '');
  return name.replace(/\.(jpe?g|png|webp|gif|avif|heic)$/i, '').replace(/_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, '');
}

/**
 * Bildkandidaten eines Produkts: Titelbild (nr 0, darf auch in den Kopf) und bis zu `galerie` weitere (nur für collection.image).
 * Zu kleine oder extrem schmale Bilder fallen weg.
 */
export function bildKandidaten(p, { galerie = 2, minPx = 800, ratioMin = 0.6, ratioMax = 1.7 } = {}) {
  const aus = [], gesehen = new Set();
  const liste = [p.featuredImage, ...((p.media?.nodes || []).map(m => m?.image))];
  for (const im of liste) {
    if (!im?.url) continue;
    const k = urlStamm(im.url); if (gesehen.has(k)) continue; gesehen.add(k);
    const nr = aus.length;
    if (nr > galerie) break;
    const w = Number(im.width) || 0, h = Number(im.height) || 0;
    const ok = Math.min(w, h) >= minPx && h / w >= ratioMin && h / w <= ratioMax;
    aus.push({ url: im.url, w, h, nr, titelbild: nr === 0, groesseOk: ok });
  }
  return aus;
}

/**
 * Randanalyse eines kleinen RGB-Bildes (rgb24, w×h). Ring = äusserste `ring` Pixel.
 * @returns {{bg:number[], anteil:number, lum:number, hell:boolean, ruhig:boolean}}
 *   bg = Median der Ringfarbe, anteil = Anteil der Ringpixel innerhalb `tol` (grösste Kanal-Abweichung) vom Median.
 */
export function randAnalyse(rgb, w, h, { ring = 3, tol = 18, minHell = 200, minRuhig = 0.92 } = {}) {
  if (!rgb || rgb.length < w * h * 3 || w < 2 * ring + 1 || h < 2 * ring + 1) throw new Error('randAnalyse: Puffer zu klein');
  const px = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= ring && x < w - ring && y >= ring && y < h - ring) continue;
    const i = (y * w + x) * 3; px.push([rgb[i], rgb[i + 1], rgb[i + 2]]);
  }
  const med = k => { const a = px.map(p => p[k]).sort((p, q) => p - q); return a[a.length >> 1]; };
  const bg = [med(0), med(1), med(2)];
  const nah = px.filter(p => Math.max(Math.abs(p[0] - bg[0]), Math.abs(p[1] - bg[1]), Math.abs(p[2] - bg[2])) <= tol).length;
  const anteil = nah / px.length;
  const lum = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
  return { bg, anteil: Math.round(anteil * 1000) / 1000, lum: Math.round(lum), hell: lum >= minHell, ruhig: anteil >= minRuhig };
}

/**
 * Begrenzungsrahmen des Produkts: Pixel, die mehr als `tol` von der Hintergrundfarbe abweichen. Zeilen/Spalten mit weniger als
 * `minAnteil` Vordergrund zählen als Rauschen. Ergebnis in Bruchteilen 0..1 (unabhängig von der Analysegrösse).
 */
export function rahmen(rgb, w, h, bg, { tol = 30, minAnteil = 0.02 } = {}) {
  const zeile = new Array(h).fill(0), spalte = new Array(w).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3;
    if (Math.max(Math.abs(rgb[i] - bg[0]), Math.abs(rgb[i + 1] - bg[1]), Math.abs(rgb[i + 2] - bg[2])) > tol) { zeile[y]++; spalte[x]++; }
  }
  const minZ = Math.max(1, Math.ceil(minAnteil * w)), minS = Math.max(1, Math.ceil(minAnteil * h));
  const ys = zeile.map((n, i) => n >= minZ ? i : -1).filter(i => i >= 0), xs = spalte.map((n, i) => n >= minS ? i : -1).filter(i => i >= 0);
  if (!ys.length || !xs.length) return { leer: true, x0: 0, y0: 0, x1: 1, y1: 1, rand: 0 };
  const x0 = xs[0] / w, x1 = (xs[xs.length - 1] + 1) / w, y0 = ys[0] / h, y1 = (ys[ys.length - 1] + 1) / h;
  const r3 = v => Math.round(v * 1000) / 1000;
  return { leer: false, x0: r3(x0), y0: r3(y0), x1: r3(x1), y1: r3(y1), rand: r3(Math.min(x0, y0, 1 - x1, 1 - y1)) };
}

/**
 * Einpassen: das Produkt (Rahmen `box` in Bruchteilen eines w×h-Bildes, plus `puffer`) mittig in eine W×H-Fläche mit
 * Rand randX/randY, höchstens `maxZoom` hochgezogen. Beschnitten wird nur Hintergrund ausserhalb des Rahmens.
 * @returns {{crop:{x,y,w,h}, scale:number, ziel:{x,y,w,h}, W:number, H:number, produktAnteil:number}}
 */
export function einpassPlan({ w, h, box, W, H, randX = 0.1, randY = 0.1, maxZoom = 1.5, puffer = 0.02 }) {
  if (!(w > 0 && h > 0 && W > 0 && H > 0)) throw new Error('einpassPlan: Masse fehlen');
  const b = box && !box.leer ? box : { x0: 0, y0: 0, x1: 1, y1: 1 };
  const cx0 = Math.max(0, Math.floor((b.x0 - puffer) * w)), cy0 = Math.max(0, Math.floor((b.y0 - puffer) * h));
  const cx1 = Math.min(w, Math.ceil((b.x1 + puffer) * w)), cy1 = Math.min(h, Math.ceil((b.y1 + puffer) * h));
  const cw = Math.max(1, cx1 - cx0), ch = Math.max(1, cy1 - cy0);
  const innenW = W * (1 - 2 * randX), innenH = H * (1 - 2 * randY);
  const scale = Math.min(innenW / cw, innenH / ch, maxZoom);
  let tw = Math.round(cw * scale), th = Math.round(ch * scale);
  tw = Math.min(tw, W); th = Math.min(th, H);
  const x = Math.floor((W - tw) / 2), y = Math.floor((H - th) / 2);
  const produktAnteil = Math.round(Math.max(tw / W, th / H) * 1000) / 1000;
  return { crop: { x: cx0, y: cy0, w: cw, h: ch }, scale: Math.round(scale * 10000) / 10000, ziel: { x, y, w: tw, h: th }, W, H, produktAnteil };
}

/**
 * Quadrat für collection.image: Seitenlänge zwischen sMin und sMax (gerade), so gross, dass das Produkt die Innenfläche
 * (1 - 2·rand) füllt, ohne mehr als maxZoom hochgezogen zu werden. Füllt das Produkt auch bei sMin weniger als `minAnteil`
 * der Seite, ist das Foto zu klein: Fehler statt verschwommenem Bild.
 */
export function quadratPlan({ w, h, box, sMax = 1600, sMin = 1200, rand = 0.1, maxZoom = 1.5, puffer = 0.02, minAnteil = 0.6 }) {
  const probe = einpassPlan({ w, h, box, W: sMax, H: sMax, randX: rand, randY: rand, maxZoom: 1e9, puffer });
  const lang = Math.max(probe.crop.w, probe.crop.h);
  // Seitenlänge, bei der das Produkt genau die Innenfläche füllt, mit Zoom = maxZoom
  let S = Math.floor((lang * maxZoom) / (1 - 2 * rand));
  S = Math.max(sMin, Math.min(sMax, S));
  S -= S % 2;
  const plan = einpassPlan({ w, h, box, W: S, H: S, randX: rand, randY: rand, maxZoom, puffer });
  if (plan.produktAnteil < minAnteil) return { ...plan, S, fehler: 'foto-zu-klein' };
  return { ...plan, S, fehler: null };
}

/**
 * Harte Kante? Anteil der Punkte auf dem Zuschnittrand (nur Seiten im Bildinneren), die mehr als `tol` vom Grund abweichen.
 * Weiche Schatten oder Spiegelungen unter der Rahmenschwelle würden sonst als gerade Kante im neuen Bild stehen.
 * rgb: Analysebild n×n des Quellfotos, crop in Pixeln des Quellfotos (w×h). @returns {number} 0..1
 */
export function kantenAnteil(rgb, n, crop, w, h, bg, { tol = 12 } = {}) {
  const x0 = Math.floor(crop.x / w * n), y0 = Math.floor(crop.y / h * n);
  const x1 = Math.min(n - 1, Math.ceil((crop.x + crop.w) / w * n) - 1), y1 = Math.min(n - 1, Math.ceil((crop.y + crop.h) / h * n) - 1);
  const weg = (x, y) => { const i = (y * n + x) * 3; return Math.max(Math.abs(rgb[i] - bg[0]), Math.abs(rgb[i + 1] - bg[1]), Math.abs(rgb[i + 2] - bg[2])) > tol; };
  let alle = 0, ab = 0;
  const seite = (innen, punkte) => { if (!innen) return; for (const [x, y] of punkte) { alle++; if (weg(x, y)) ab++; } };
  const bereich = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
  seite(crop.x > 0, bereich(y0, y1).map(y => [x0, y]));
  seite(crop.x + crop.w < w, bereich(y0, y1).map(y => [x1, y]));
  seite(crop.y > 0, bereich(x0, x1).map(x => [x, y0]));
  seite(crop.y + crop.h < h, bereich(x0, x1).map(x => [x, y1]));
  return alle ? Math.round(ab / alle * 1000) / 1000 : 0;
}

/**
 * Wie viel des Produktrahmens bleibt bei object-fit:cover (mittig) in einer Kachel mit Seitenverhältnis `zielAspect` (Breite/Höhe)?
 * @returns {number} 0..1
 */
export function zuschnittErhalt(box, w, h, zielAspect) {
  const b = box && !box.leer ? box : { x0: 0, y0: 0, x1: 1, y1: 1 };
  const srcA = w / h;
  let vx0 = 0, vx1 = 1, vy0 = 0, vy1 = 1;
  if (srcA > zielAspect) { const f = zielAspect / srcA; vx0 = (1 - f) / 2; vx1 = 1 - vx0; }
  else { const f = srcA / zielAspect; vy0 = (1 - f) / 2; vy1 = 1 - vy0; }
  const iw = Math.max(0, Math.min(b.x1, vx1) - Math.max(b.x0, vx0)), ih = Math.max(0, Math.min(b.y1, vy1) - Math.max(b.y0, vy0));
  const flaeche = (b.x1 - b.x0) * (b.y1 - b.y0);
  return flaeche > 0 ? Math.round((iw * ih / flaeche) * 1000) / 1000 : 0;
}

/** Kachelformate laut Theme-Messung 11.11.2026 (Breite/Höhe). */
export const FORMATE = {
  kopfDesktopHeute: 360 / 230,   // 4 Spalten bei 1440, Kopf mindestens 230 px hoch (kurzer Text = breiteste Kachel)
  kopfDesktopPlan: 360 / 280,    // Rang 1: feste Höhe 260 bis 300 px
  kopfHandyHeute: 179 / 502,     // 2 Spalten, Kopf am Handy 230 bis 1168 px hoch (Halloween 502)
  startseiteKachel: 1,           // 48 px, cover
  verzeichnisKachel: 1.08,       // contain
  entdeckenKarte: 1.12,          // contain
  ogQuer: 1.91,                  // grosse Link-Vorschau (QUELLE Meta-Empfehlung, nicht neu geprüft)
};

// ---------------------------------------------------------------- Gemini-Urteil
export const PRUEF_FELDER_NEIN = ['text', 'infografik', 'collage', 'logo_marke', 'wasserzeichen', 'nachbildung', 'wirkversprechen', 'anstoessig'];
export const PRUEF_FELDER_JA = ['kategorie_passt', 'produkt_erkennbar'];

export function pruefPrompt(kategorie) {
  return `Du prüfst ein Produktfoto für das Kategoriebild «${kategorie}» eines Schweizer Online-Shops. Antworte NUR als JSON mit genau diesen Feldern (true/false) und "grund" (kurz, deutsch):\n`
    + '{"text": lesbare Wörter oder Buchstaben irgendwo im Bild, in jeder Sprache (auch auf Verpackung, Etikett, Karte, Schild, Produktaufdruck); reine Ziffern einer Uhr, Skala oder Waage zählen NICHT, '
    + '"infografik": Masslinien, Pfeile, Zoll- oder cm-Angaben, Symbole, Beschriftungslinien, Funktionsgrafik, '
    + '"collage": mehrere Einzelbilder oder Ansichten zusammengesetzt, '
    + '"logo_marke": Markenlogo, Monogramm oder Herstellername erkennbar, '
    + '"wasserzeichen": Wasserzeichen, Stempel oder Überlagerungsrest (weisse Flächen, abgeschnittene Etiketten), '
    + '"nachbildung": erkennbare Nachbildung eines bekannten Marken- oder Luxusdesigns (z. B. Royal Oak, Submariner, Nautilus, Luxusmonogramm), '
    + '"wirkversprechen": vorher/nachher, Lifting- oder Wirkungspfeile, medizinische Aussage, '
    + '"anstoessig": nackte Haut über das Übliche von Mode hinaus, Waffen, Gewalt, '
    + `"kategorie_passt": das Produkt gehört offensichtlich in «${kategorie}», `
    + '"produkt_erkennbar": EIN Produkt ist als Ganzes klar erkennbar (kein reiner Stoff- oder Detailausschnitt), '
    + '"grund": "kurz"}';
}

/** Urteil aus der Gemini-Antwort. Fehlt ein Feld oder ist es kein Boolean, ist das Bild NICHT ok (fail-closed). */
export function urteilBewerten(c) {
  if (!c || typeof c !== 'object') return { ok: false, gruende: ['keine-antwort'] };
  const gruende = [];
  for (const f of PRUEF_FELDER_NEIN) { if (typeof c[f] !== 'boolean') gruende.push('feld-fehlt:' + f); else if (c[f]) gruende.push(f); }
  for (const f of PRUEF_FELDER_JA) { if (typeof c[f] !== 'boolean') gruende.push('feld-fehlt:' + f); else if (!c[f]) gruende.push('nicht-' + f); }
  return { ok: gruende.length === 0, gruende, grund: String(c.grund || '').slice(0, 160) };
}

// ---------------------------------------------------------------- Auswahl
/**
 * Punkte für ein collection.image-Kandidatenfoto. Untauglich (-Infinity): Grund nicht hell und ruhig, Produkt nicht gefunden,
 * Foto zu klein, Gemini nicht ok (ausser KI aus: dann `pruefung:'ungeprueft'` und ein Abzug, damit geprüfte vorgehen).
 */
export function quadratPunkte(k) {
  const a = k.analyse;
  if (!k.groesseOk || !a || !a.hell || !a.ruhig || a.rahmen?.leer) return -Infinity;
  if (k.plan?.fehler) return -Infinity;
  if (k.urteil && k.urteil.ok === false) return -Infinity;
  let s = 0;
  if (k.urteil?.ok === true) s += 5; else s -= 5;                // ungeprüft nur als letzter Ausweg
  s += 2 * (k.bonus || 0);
  if (k.bewaehrt) s += 3;
  if (Math.min(k.w, k.h) >= 1200) s += 1;
  if (k.titelbild) s += 0.5;
  s += Math.min(0.15, a.rahmen?.rand || 0) * 10;                 // schon Luft um das Produkt: weniger Eingriff
  // Füllgrad im Quadrat: ein flaches, breites Produkt ist in der 48-px-Kachel nur ein Strich (Lauf 11.11.: Kaminofen-Diffuser)
  const z = k.plan?.ziel, F = k.plan?.W && k.plan?.H ? (z ? (z.w * z.h) / (k.plan.W * k.plan.H) : 0) : 0;
  s += Math.min(0.5, F) * 4;
  s -= Math.min(2, (k.pos || 0) * 0.05);                          // vorne in der Sammlung = was Kundschaft zuerst sieht
  return Math.round(s * 1000) / 1000;
}

/** Wählt das Quadrat-Foto: bestes nach quadratPunkte, Produkt und Bildinhalt (dHash) in diesem Lauf und bei anderen Sammlungen noch nicht verwendet. */
export function waehleQuadrat(kandidaten, { belegtProdukte = new Set(), belegtHashes = [], hashAbstand = 6 } = {}) {
  const frei = k => !belegtProdukte.has(k.produktId) && !(k.dhash && belegtHashes.some(h => hamming(h, k.dhash) <= hashAbstand));
  const liste = kandidaten.map(k => ({ k, p: quadratPunkte(k) })).filter(x => x.p > -Infinity && frei(x.k));
  liste.sort((a, b) => b.p - a.p || (a.k.pos - b.k.pos) || (a.k.nr - b.k.nr));
  return liste.length ? liste[0].k : null;
}

/**
 * Kopf: 4 Titelbilder (Theme zeigt nur featured_image), je Produkt eines, Seitenverhältnis 0.8..1.25, mindestens 800 px,
 * Produkt (nur bei ruhigem Grund messbar) bleibt in der Desktop-Kachel nach Rang 1 zu mindestens `minErhaltPlan` und in der
 * heutigen (breiteren) zu mindestens `minErhaltHeute` sichtbar, Gemini ok (oder ungeprüft
 * bei KI aus). Höchstens `maxBelegung` Sammlungen je Produkt in diesem Lauf. Reihenfolge: Saison, bewährt, Sammlungsreihenfolge;
 * danach die zwei mit dem besten Handy-Ausschnitt nach vorn (das heutige Theme zeigt am Handy die ersten 2).
 */
export function waehleKopf(kandidaten, { anzahl = 4, belegung = new Map(), maxBelegung = 2, minErhaltPlan = 0.75, minErhaltHeute = 0.6, kiAus = false, maxJeTyp = 2 } = {}) {
  // erhalt == null: Szenenfoto ohne ruhigen Grund, die Lage des Produkts ist unbekannt (Mitte zählt, wie object-fit:cover)
  const erhaltOk = e => e == null || ((e.desktopPlan ?? 0) >= minErhaltPlan && (e.desktopHeute ?? 0) >= minErhaltHeute);
  const tauglich = kandidaten.filter(k => k.titelbild && Math.min(k.w, k.h) >= 800 && k.h / k.w >= 0.8 && k.h / k.w <= 1.25
    && (k.urteil?.ok === true || (kiAus && !k.urteil))
    && erhaltOk(k.erhalt)
    && (belegung.get(k.produktId) || 0) < maxBelegung);
  tauglich.sort((a, b) => (b.bonus || 0) - (a.bonus || 0) || (Number(!!b.bewaehrt) - Number(!!a.bewaehrt)) || (a.pos - b.pos));
  // Vielfalt: höchstens `maxJeTyp` Produkte derselben Produktart (productType); ohne Produktart keine Grenze. Reicht es so nicht
  // für `anzahl`, werden die zurückgestellten in ihrer Reihenfolge nachgefüllt (lieber vier gleichartige als gar kein Kopf).
  const aus = [], ids = new Set(), jeTyp = new Map(), zurueck = [];
  for (const k of tauglich) {
    if (ids.has(k.produktId)) continue;
    const typ = String(k.typ || '').trim().toLowerCase();
    if (typ && (jeTyp.get(typ) || 0) >= maxJeTyp) { zurueck.push(k); continue; }
    ids.add(k.produktId); if (typ) jeTyp.set(typ, (jeTyp.get(typ) || 0) + 1); aus.push(k);
    if (aus.length >= anzahl) break;
  }
  for (const k of zurueck) { if (aus.length >= anzahl) break; if (ids.has(k.produktId)) continue; ids.add(k.produktId); aus.push(k); }
  const handy = [...aus].sort((a, b) => (b.erhalt?.handyHeute ?? 0.5) - (a.erhalt?.handyHeute ?? 0.5));
  const vorn = handy.slice(0, 2);
  return [...vorn, ...aus.filter(k => !vorn.includes(k))];
}

// ---------------------------------------------------------------- altes Bild
/** Klasse des heutigen collection.image. */
export function altBildKlasse(bild) {
  if (!bild?.url) return 'fehlt';
  const stamm = dateiStamm(bild.url), alt = String(bild.altText || '');
  const w = Number(bild.width) || 0, h = Number(bild.height) || 0;
  if (/_result|^oig\d*$|[-_]ai[-_]\d+$|dall-?e|midjourney|firefly/i.test(stamm)) return 'ki';
  if (/^pexels-photo|^photo-\d{9,}|unsplash/i.test(stamm)) return 'stock';
  if (/LuxeStyle-Pinnwand/i.test(alt) || /^pinnwand-/i.test(stamm)) return 'pinnwand';
  if (/LuxeStyle-Label/i.test(alt) || (w === 1600 && h === 1200)) return 'label';
  if (h > 0 && w / h >= 2.2) return 'textbanner';
  return 'foto';
}

/** BigBuy-Dateinamen tragen EAN und SKU: «4067983848452_S64193532_P00», «5901720131485_I01». */
export function bigbuyKennung(url) {
  const s = dateiStamm(url);
  const m = s.match(/^(\d{8,14})(?:_(S\d{5,10}))?_(?:P|I)\d{2}/i);
  return m ? { ean: m[1], sku: m[2] || null } : null;
}

/** Englischer oder interner Alt-Text (nur Hinweis, keine Übersetzung). */
export const ALT_FREMD = /\b(christmas|gift|gifts|for him|for her|kids|shop now|sale|women|men's|label)\b|pinnwand|luxestyle/i;

/**
 * Ersetzen oder behalten? Gründe sind Wahrheit (Quelle nicht lieferbar, kein Mitglied), Form (KI, Stock, Textbanner, Label),
 * Doppel (gleiches Bild in anderen Sammlungen) oder der Gemini-Befund des alten Bildes. Pinnwand-Banner bleiben (Rang 8 eigenes Werkzeug),
 * ausser FORCE. Unbekannte Quelle ohne Befund bleibt, ausser FORCE.
 * @param {{bild:object|null, klasse:string, quelle:{gefunden:boolean, lieferbar?:boolean, mitglied?:boolean, grund?:string}, doppelt:number, altUrteil?:{ok:boolean,gruende:string[]}|null}} a
 */
export function ersetzenEntscheid(a, { force = false } = {}) {
  const g = [];
  if (a.klasse === 'fehlt') return { ersetzen: true, gruende: ['kein-bild'], nurAlt: false };
  if (a.klasse === 'ki') g.push('ki-szene');
  if (a.klasse === 'stock') g.push('stockfoto-keine-ware');
  if (a.klasse === 'textbanner') g.push('altes-textbanner');
  if (a.klasse === 'label') g.push('altes-label');
  if (a.quelle?.gefunden && a.quelle.lieferbar === false) g.push('quelle-nicht-lieferbar' + (a.quelle.grund ? ':' + a.quelle.grund : ''));
  if (a.quelle?.gefunden && a.quelle.mitglied === false) g.push('quelle-kein-mitglied');
  // Alle Mitglieder gelesen und das Foto steckt in keinem: es zeigt Ware, die nicht (mehr) in der Sammlung ist (Gegenprüfung 11.11., 36 Fälle)
  if (!a.quelle?.gefunden && a.quelle?.vollstaendig === true && a.klasse === 'foto') g.push('quelle-kein-mitglied:vollstaendig-gesucht');
  if ((a.doppelt || 0) >= 1) g.push(`doppelt:${a.doppelt}`);
  if (a.altUrteil && a.altUrteil.ok === false) g.push('befund:' + (a.altUrteil.gruende || []).join('+'));
  if (a.klasse === 'pinnwand' && !force) {
    // Pinnwand bleibt (Rang 8), ausser die Wahrheit spricht dagegen; Doppel und Gemini-Befunde der Collage zählen hier nicht.
    // (Eine Collage steckt nie in den Produktmedien: «vollständig gesucht» greift oben nur für Fotos.)
    const hart = g.filter(x => /^quelle-/.test(x));
    if (!hart.length) return { ersetzen: false, gruende: ['pinnwand-bleibt'], nurAlt: ALT_FREMD.test(String(a.bild?.altText || '')) };
  }
  if (!g.length) {
    if (!a.quelle?.gefunden && !force && a.klasse === 'foto' && a.altUrteil == null) return { ersetzen: false, gruende: ['quelle-unbekannt-ohne-befund'], nurAlt: altNoetig(a.bild) };
    if (force) return { ersetzen: true, gruende: ['force'], nurAlt: false };
    return { ersetzen: false, gruende: ['ok'], nurAlt: altNoetig(a.bild) };
  }
  return { ersetzen: true, gruende: g, nurAlt: false };
}
const altNoetig = b => !String(b?.altText || '').trim() || ALT_FREMD.test(String(b?.altText || ''));

// ---------------------------------------------------------------- Texte
/** Kategoriename ohne Emoji und Zierzeichen. */
export function katName(titel) {
  return String(titel || '').replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu, '').replace(/\s+/g, ' ').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, '').trim();
}
const FUELL = /\s+(für|mit|und|aus|in|im|zum|zur|der|die|das|den|dem|des|ein|eine|einer|von|&|-|–|,)$/i;
/** Alt-Text «Kategorie – Motiv», höchstens `max` Zeichen, an einer Wortgrenze, ohne Füllwort am Ende, ohne interne Wörter. */
export function altText(katTitel, produktTitel, max = 125) {
  const kat = katName(katTitel);
  let motiv = katName(produktTitel).replace(/\b(pinnwand|label|luxestyle)\b/gi, '').replace(/\s+/g, ' ').trim();
  const platz = max - kat.length - 3;
  if (motiv.length > platz) { motiv = motiv.slice(0, platz + 1); motiv = motiv.slice(0, Math.max(0, motiv.lastIndexOf(' '))).trim(); }
  for (let i = 0; i < 5 && FUELL.test(motiv); i++) motiv = motiv.replace(FUELL, '').trim();
  motiv = motiv.replace(/[,;:–\-&]+$/, '').trim();
  return motiv ? `${kat} – ${motiv}` : kat;
}

// ---------------------------------------------------------------- Hash
/** dHash aus 9×8 Graustufen (72 Byte): 64 Bit als 16 Hex-Zeichen. */
export function dHash(grau) {
  if (!grau || grau.length < 72) throw new Error('dHash: 72 Byte nötig');
  let bits = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += grau[y * 9 + x] > grau[y * 9 + x + 1] ? '1' : '0';
  let hex = '';
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}
export function hamming(a, b) {
  if (!a || !b || a.length !== b.length) return 64;
  let n = 0;
  for (let i = 0; i < a.length; i++) { let v = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (v) { n += v & 1; v >>= 1; } }
  return n;
}

// ---------------------------------------------------------------- Plan, Sicherung, Rücklesen, Rücknahme
export const stabil = o => JSON.stringify(o, Object.keys(o).sort());
/** Plan-Hash über die Einträge (ohne Zeitstempel des Berichts): 16 Hex-Zeichen. */
export function planHash(eintraege) {
  const h = createHash('sha256');
  for (const e of eintraege) h.update(JSON.stringify([e.handle, e.id, e.basis, e.entscheid, e.neu && { quelle: e.neu.quelleProdukt?.id, bild: e.neu.quelleBild?.url, sha: e.neu.sha256, alt: e.neu.alt, art: e.neu.art }, e.kopf?.ids || null, e.altNeu || null]));
  return h.digest('hex').slice(0, 16);
}
export function planAlterOk(planZeit, jetzt, maxH = 24) {
  const t = Date.parse(planZeit);
  return Number.isFinite(t) && jetzt.getTime() - t >= 0 && jetzt.getTime() - t <= maxH * 3600e3;
}
/** Deckel je Lauf: Vorgabe 10, höchstens 25. */
export function deckel(n, { vorgabe = 10, max = 25 } = {}) {
  const v = Number.parseInt(String(n ?? ''), 10);
  return Math.min(max, Number.isFinite(v) && v > 0 ? v : vorgabe);
}
/** Metafeld-Wert vergleichbar machen: Liste oder JSON-Text einer Liste → kompaktes JSON; leer → null. */
export function kopfWert(v) {
  if (v == null || v === '') return null;
  if (Array.isArray(v)) return JSON.stringify(v);
  const s = String(v).trim();
  if (s.startsWith('[')) { try { return JSON.stringify(JSON.parse(s)); } catch { return s; } }
  return s;
}

/** Stand vor dem Schreiben. */
export function sicherungsEintrag(c, zeit) {
  return { handle: c.handle, id: c.id, zeit,
    bild: c.image?.url ? { url: c.image.url, altText: c.image.altText || '', width: c.image.width || null, height: c.image.height || null } : null,
    kopf: kopfWert(c.kopf?.value ?? c.kopf ?? null) };
}

/** Hat sich seit dem Trockenlauf etwas verändert? @returns {string[]} leer = gleich. */
export function basisPruefen(basis, aktuell) {
  const d = [];
  if (!bildGleich(basis.bild, aktuell.bild)) d.push('bild');
  if (String(basis.bild?.altText || '') !== String(aktuell.bild?.altText || '')) d.push('alt');
  if (kopfWert(basis.kopf) !== kopfWert(aktuell.kopf)) d.push('kopf');
  return d;
}

/** Rücklesen nach dem Schreiben. soll: {bild?:{alt, w, h}, kopf?:string[]}, vorher: Sicherung, ist: frisch gelesen. */
export function rueckleseBefund(soll, vorher, ist) {
  const d = []; ist = ist || {}; vorher = vorher || {};
  if (soll.bild) {
    if (!ist.bild?.url) d.push('bild-fehlt');
    else {
      if (soll.bild.neueDatei && bildGleich(ist.bild, vorher.bild)) d.push('bild-unveraendert');
      if (String(ist.bild.altText || '') !== soll.bild.alt) d.push('alt');
      if (soll.bild.w && (Number(ist.bild.width) !== soll.bild.w || Number(ist.bild.height) !== soll.bild.h)) d.push(`masse:${ist.bild.width}x${ist.bild.height}`);
    }
  }
  if (soll.kopf && kopfWert(ist.kopf) !== kopfWert(soll.kopf)) d.push('kopf');
  return d;
}

/** Aus dem Ledger (Zeilen {art:'aenderung'|'zurueck', lauf, handle, ...}) die je Sammlung letzte, nicht zurückgenommene Änderung. */
export function offeneAenderungen(zeilen) {
  const offen = new Map();
  for (const z of zeilen) {
    if (z.art === 'aenderung') offen.set(z.handle, z);
    else if (z.art === 'zurueck' && offen.get(z.handle)?.lauf === z.lauf) offen.delete(z.handle);
  }
  return offen;
}

/**
 * Belegung aus früheren Läufen: Quellprodukte der heute noch offenen Bild-Änderungen anderer Sammlungen. Sonst könnte ein späterer
 * Lauf dasselbe Produkt wieder als Kategoriebild wählen (das neue Bild hat einen eigenen Dateinamen, der Dateistamm-Abgleich greift nicht).
 * @returns {Set<string>} Produkt-IDs
 */
export function belegtAusLedger(zeilen, handlesDiesesLaufs = []) {
  const ohne = new Set(handlesDiesesLaufs), aus = new Set();
  for (const [h, z] of offeneAenderungen(zeilen)) if (!ohne.has(h) && z.teile?.includes('bild') && z.quelle?.produkt?.id) aus.add(z.quelle.produkt.id);
  return aus;
}

/**
 * Rücknahme je Teil: zurück, wenn heute noch unser Stand gilt; «schon», wenn der alte Stand schon da ist; «fremd», wenn jemand
 * anderes inzwischen geändert hat (dann nichts anfassen, ausser fremdUeberschreiben).
 * @returns {{aktion:'zurueck'|'schon'|'fremd', teile:{bild?:string, kopf?:string}}}
 */
export function rueckEntscheid(aenderung, aktuell, { fremdUeberschreiben = false } = {}) {
  const teile = {};
  if (aenderung.teile?.includes('bild')) {
    teile.bild = bildGleich(aktuell.bild, aenderung.nachher?.bild) ? 'zurueck' : (bildGleich(aktuell.bild, aenderung.vorher?.bild) ? 'schon' : 'fremd');
  }
  if (aenderung.teile?.includes('kopf')) {
    const ist = kopfWert(aktuell.kopf), neu = kopfWert(aenderung.nachher?.kopf), alt = kopfWert(aenderung.vorher?.kopf);
    teile.kopf = ist === neu ? 'zurueck' : (ist === alt ? 'schon' : 'fremd');
  }
  const w = Object.values(teile);
  if (!w.length) return { aktion: 'schon', teile };
  if (w.includes('fremd') && !fremdUeberschreiben) return { aktion: 'fremd', teile };
  if (w.every(x => x === 'schon')) return { aktion: 'schon', teile };
  if (fremdUeberschreiben) for (const k of Object.keys(teile)) if (teile[k] === 'fremd') teile[k] = 'zurueck';
  return { aktion: 'zurueck', teile };
}
