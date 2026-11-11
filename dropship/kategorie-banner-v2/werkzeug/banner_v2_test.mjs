// Tests der reinen Funktionen von banner_v2_lib.mjs (kein Netz). Aufruf: node banner_v2_test.mjs
// LIB_PFAD=<datei> testet eine andere Fassung (Mutationsprobe).
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HIER = dirname(fileURLToPath(import.meta.url));
const L = await import(pathToFileURL(resolve(process.env.LIB_PFAD || `${HIER}/banner_v2_lib.mjs`)).href);

let n = 0, f = 0;
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function pruef(name, ist, soll) { n++; if (!gleich(ist, soll)) { f++; console.log(`✗ ${name}\n   ist  ${JSON.stringify(ist)}\n   soll ${JSON.stringify(soll)}`); } }
function wirft(name, fn) { n++; try { fn(); f++; console.log(`✗ ${name}: kein Fehler`); } catch { /* gut */ } }

const NOV = new Date('2026-11-11T12:00:00Z'), OKT = new Date('2026-10-15T12:00:00Z'), JUL = new Date('2026-07-01T12:00:00Z');
const KAT = { handle: 'geschenke-fuer-ihn', titel: 'Geschenke für Ihn' };
const P = (o = {}) => ({ id: 'gid://shopify/Product/1', handle: 'p1', title: 'Lederrucksack Braun', status: 'ACTIVE', onlineStoreUrl: 'https://luxestyle.ch/products/p1',
  tracksInventory: false, totalInventory: 0, tags: [], featuredImage: { url: 'https://cdn.shopify.com/a.jpg', width: 1000, height: 1000 }, ...o });
const tor = (p, o = {}) => L.produktTor(p, { kat: KAT, datum: NOV, sperrTags: ['nicht-bewerben'], sperrHandles: ['gesperrt-1'], ...o });

// ---------------------------------------------------------------- Produkt-Tor
pruef('Tor: aktives Produkt ok (Farbe «Braun» ist keine Marke)', tor(P()), { ok: true, grund: null });
pruef('Tor: Entwurf', tor(P({ status: 'DRAFT' })).grund, 'status-draft');
pruef('Tor: nicht im Onlineshop', tor(P({ onlineStoreUrl: null })).grund, 'nicht-im-onlineshop');
pruef('Tor: getrackt mit Bestand 0 = ausverkauft', tor(P({ tracksInventory: true, totalInventory: 0 })).grund, 'ausverkauft');
pruef('Tor: getrackt mit Bestand 3 ok', tor(P({ tracksInventory: true, totalInventory: 3 })).ok, true);
pruef('Tor: nicht getrackt mit Bestand 0 ok (CJ)', tor(P({ tracksInventory: false, totalInventory: 0 })).ok, true);
pruef('Tor: Sperrtag', tor(P({ tags: ['nicht-bewerben'] })).grund, 'sperrtag:nicht-bewerben');
pruef('Tor: Prüf-Tag', tor(P({ tags: ['google-bild-abgelehnt'] })).grund, 'pruef-tag:google-bild-abgelehnt');
pruef('Tor: Sperrliste', tor(P({ handle: 'gesperrt-1' })).grund, 'sperrliste');
pruef('Tor: Sperrliste der Bibliothek (Royal-Oak-Look)', L.SPERR_PRODUKTE.includes('sportliche-herrenuhr-mit-chronograph-481792'), true);
pruef('Tor: Lizenz', tor(P({ title: 'Plüsch Pikachu Kissen' })).grund, 'lizenz-titel');
pruef('Tor: Marke', tor(P({ title: 'Herren Sneaker Puma R78' })).grund, 'marke-titel');
pruef('Tor: Galaxy-Projektor ist keine Marke', tor(P({ title: 'Galaxy Sternenprojektor' })).ok, true);
pruef('Tor: Wirkversprechen', tor(P({ title: 'Anti-Aging Gesichtsroller' })).grund, 'wirkversprechen-titel');
pruef('Tor: Sandale im November gesperrt', tor(P({ title: 'Herren Ledersandale' })).grund, 'saison-sommer');
pruef('Tor: Sandale im Juli ok', tor(P({ title: 'Herren Ledersandale' }), { datum: JUL }).ok, true);
pruef('Tor: Bademode in Bademode-Kategorie ok', tor(P({ title: 'Bikini Set' }), { kat: { handle: 'damen-bademode', titel: 'Bademode' } }).ok, true);
pruef('Tor: Halloween im November gesperrt', tor(P({ title: 'Halloween Kürbis Laterne' })).grund, 'saison-halloween');
pruef('Tor: Horror-Requisit im November gesperrt', tor(P({ title: 'Horror Kreissäge 49 cm' })).grund, 'saison-halloween');
pruef('Tor: Halloween im Oktober ok', tor(P({ title: 'Halloween Kürbis Laterne' }), { datum: OKT }).ok, true);
pruef('Tor: Halloween-Kategorie selbst ok', tor(P({ title: 'Halloween Kürbis Laterne' }), { kat: { handle: 'halloween', titel: 'Halloween' } }).ok, true);
pruef('Tor: ohne Bild', tor(P({ featuredImage: null })).grund, 'kein-bild');

// ---------------------------------------------------------------- Saison-Bonus
const KOST = { handle: 'kostueme-fasnacht', titel: 'Kostüme & Fasnacht' };
pruef('Bonus: Weihnacht in Geschenk-Kategorie im November', L.saisonBonus('Weihnachts-Kerzenleuchten', KAT, NOV), 2);
pruef('Bonus: Weihnacht nach dem 24.12. = 0', L.saisonBonus('Weihnachts-Kerzenleuchten', KAT, new Date('2026-12-25T10:00:00Z')), 0);
pruef('Bonus: Weihnacht in Schuh-Kategorie = 0', L.saisonBonus('Weihnachts-Socken', { handle: 'herren-schuhe', titel: 'Herren-Schuhe' }, NOV), 0);
pruef('Bonus: Fasnacht am 10.11. = 0', L.saisonBonus('Kostüm Pirat', KOST, new Date('2026-11-10T10:00:00Z')), 0);
pruef('Bonus: Fasnacht am 11.11. = 2', L.saisonBonus('Kostüm Pirat', KOST, NOV), 2);
pruef('Bonus: Nikolaus-Kostüm in Fasnacht-Kategorie = 0', L.saisonBonus('Kostüm Nikolaus XXL Oberteil', KOST, NOV, 'Kostüme & Verkleidung'), 0);
pruef('Bonus: Produktart Kostüm zählt (Titel ohne Kostüm-Wort)', L.saisonBonus('Zimmermädchenset', KOST, NOV, 'Kostüme & Verkleidung'), 2);
pruef('Bonus: Produktart Kostüm in Schuh-Kategorie = 0', L.saisonBonus('Zimmermädchenset', { handle: 'herren-schuhe', titel: 'Herren-Schuhe' }, NOV, 'Kostüme & Verkleidung'), 0);
pruef('Bonus: Fasnacht im März = 0', L.saisonBonus('Kostüm Pirat', KOST, new Date('2027-03-01T10:00:00Z')), 0);

// ---------------------------------------------------------------- bewährt
pruef('bewährt: 4,5 bei 3', L.bewaehrt('4.5', '3'), true);
pruef('bewährt: 3,9 bei 10 nein', L.bewaehrt('3.9', '10'), false);
pruef('bewährt: 5 bei 2 nein', L.bewaehrt('5', '2'), false);
pruef('bewährt: Judge.me-JSON', L.bewaehrt('{"scale_min":"1.0","scale_max":"5.0","value":"4.6"}', '8'), true);
pruef('bewährt: Müll nein', L.bewaehrt('{kaputt', 'x'), false);

// ---------------------------------------------------------------- Bilder
pruef('dateiStamm: ohne Abfrage, Endung, uuid-Anhang', L.dateiStamm('https://cdn.shopify.com/s/files/1/x/collections/S768d319fe6da433_b90b8cde-2d0c-43b9-a04d-e7197a2a7528.webp?v=1'), 'S768d319fe6da433');
pruef('dateiStamm: Prozent-Kodierung', L.dateiStamm('https://cdn.shopify.com/files/Smart_20TV.jpg?v=2'), 'Smart_20TV');
pruef('urlStamm', L.urlStamm('https://a/b.jpg?v=1&width=2'), 'https://a/b.jpg');
{
  const p = P({ featuredImage: { url: 'https://c/a.jpg?v=1', width: 1000, height: 1000 },
    media: { nodes: [{ image: { url: 'https://c/a.jpg?v=2', width: 1000, height: 1000 } }, { image: { url: 'https://c/b.jpg', width: 500, height: 500 } }, { image: { url: 'https://c/c.jpg', width: 900, height: 2000 } }, { image: { url: 'https://c/d.jpg', width: 1000, height: 1000 } }, { image: { url: 'https://c/e.jpg', width: 1000, height: 1000 } }] } });
  const k = L.bildKandidaten(p);
  pruef('bildKandidaten: Doppel entfernt, höchstens 3', k.map(x => x.url), ['https://c/a.jpg?v=1', 'https://c/b.jpg', 'https://c/c.jpg']);
  pruef('bildKandidaten: Titelbild markiert, Grösse geprüft', k.map(x => [x.titelbild, x.groesseOk]), [[true, true], [false, false], [false, false]]);
}
// synthetische Bilder: 20×20 rgb
function bild(w, h, bg, rechteck, farbe = [0, 0, 0], rauschen = 0) {
  const b = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3; const drin = rechteck && x >= rechteck[0] && x < rechteck[2] && y >= rechteck[1] && y < rechteck[3];
    const c = drin ? farbe : bg; const r = rauschen ? ((x * 7 + y * 13) % 2 ? rauschen : -rauschen) : 0;
    b[i] = Math.max(0, Math.min(255, c[0] + r)); b[i + 1] = Math.max(0, Math.min(255, c[1] + r)); b[i + 2] = Math.max(0, Math.min(255, c[2] + r));
  }
  return b;
}
{
  const a = L.randAnalyse(bild(20, 20, [255, 255, 255], [5, 5, 15, 15]), 20, 20);
  pruef('randAnalyse: weisser Freisteller', [a.bg, a.hell, a.ruhig, a.anteil], [[255, 255, 255], true, true, 1]);
  pruef('randAnalyse: dunkler Grund nicht hell', L.randAnalyse(bild(20, 20, [40, 40, 40], [5, 5, 15, 15]), 20, 20).hell, false);
  pruef('randAnalyse: unruhiger Rand nicht ruhig', L.randAnalyse(bild(20, 20, [230, 230, 230], null, [0, 0, 0], 40), 20, 20).ruhig, false);
  wirft('randAnalyse: Puffer zu klein', () => L.randAnalyse(Buffer.alloc(10), 20, 20));
  const r = L.rahmen(bild(20, 20, [255, 255, 255], [5, 4, 15, 12]), 20, 20, [255, 255, 255]);
  pruef('rahmen: Bruchteile', [r.x0, r.y0, r.x1, r.y1, r.rand, r.leer], [0.25, 0.2, 0.75, 0.6, 0.2, false]);
  pruef('rahmen: leeres Bild', L.rahmen(bild(20, 20, [255, 255, 255]), 20, 20, [255, 255, 255]).leer, true);
  const ein = bild(100, 100, [255, 255, 255], [20, 20, 80, 80]); const i0 = (50 * 100 + 3) * 3; ein[i0] = 0; ein[i0 + 1] = 0; ein[i0 + 2] = 0;
  pruef('rahmen: einzelnes Rauschpixel unter minAnteil zählt nicht', L.rahmen(ein, 100, 100, [255, 255, 255]).x0, 0.2);
}
{
  const box = { x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.75, leer: false };
  const e = L.einpassPlan({ w: 800, h: 800, box, W: 1000, H: 1000, randX: 0.1, randY: 0.1, maxZoom: 1.5, puffer: 0 });
  pruef('einpassPlan: Zuschnitt nur um den Rahmen', e.crop, { x: 200, y: 200, w: 400, h: 400 });
  pruef('einpassPlan: Zoom gedeckelt 1.5', e.scale, 1.5);
  pruef('einpassPlan: mittig', e.ziel, { x: 200, y: 200, w: 600, h: 600 });
  const q = L.quadratPlan({ w: 800, h: 800, box: { x0: 0.1, y0: 0.05, x1: 0.9, y1: 0.95, leer: false } });
  pruef('quadratPlan: S gerade, 1200..1600', [q.S % 2, q.S >= 1200 && q.S <= 1600, q.fehler], [0, true, null]);
  pruef('quadratPlan: Rand ≥ 10 %', q.ziel.x >= 0.1 * q.S - 1 && q.ziel.y >= 0.1 * q.S - 1, true);
  pruef('quadratPlan: Zoom ≤ 1.5', q.scale <= 1.5, true);
  // 705 px volles Produkt: 705·1.5/0.8 = 1321.9 → ungerade 1321, gerade gemacht 1320 (JPEG 4:2:0 braucht gerade Masse)
  pruef('quadratPlan: ungerade Rechnung wird gerade (1321 → 1320)', L.quadratPlan({ w: 705, h: 705, box: { x0: 0, y0: 0, x1: 1, y1: 1, leer: false } }).S, 1320);
  const winzig = L.quadratPlan({ w: 400, h: 400, box: { x0: 0.4, y0: 0.4, x1: 0.6, y1: 0.6, leer: false } });
  pruef('quadratPlan: winziges Produkt = foto-zu-klein', winzig.fehler, 'foto-zu-klein');
  const quer = L.quadratPlan({ w: 2000, h: 1000, box: { x0: 0.05, y0: 0.1, x1: 0.95, y1: 0.9, leer: false } });
  pruef('quadratPlan: Querformat passt in die Breite', quer.ziel.w <= quer.S * 0.8 + 1 && quer.crop.x + quer.crop.w <= 2000, true);
}
{
  // 20×20 weiss, Produkt in Spalten/Zeilen 7..12, darunter ein grauer «Schatten» (235, unter der Rahmenschwelle) in Zeilen 14..17.
  // Zuschnitt (Quellfoto 200×200) x 60..140, y 60..150 = Analyse-Rand Spalten 6 und 13, Zeilen 6 und 14: nur unten liegt Schatten.
  const b = bild(20, 20, [255, 255, 255], [7, 7, 13, 13]);
  for (let y = 14; y < 18; y++) for (let x = 4; x < 16; x++) { const i = (y * 20 + x) * 3; b[i] = b[i + 1] = b[i + 2] = 235; }
  const crop = { x: 60, y: 60, w: 80, h: 90 };
  pruef('kantenAnteil: Schatten am unteren Zuschnittrand erkannt (10 von 34 Randpunkten: unten 8, links und rechts je 1 in Zeile 14)', L.kantenAnteil(b, 20, crop, 200, 200, [255, 255, 255]), 0.294);
  pruef('kantenAnteil: sauberer Rand = 0', L.kantenAnteil(bild(20, 20, [255, 255, 255], [6, 6, 14, 14]), 20, { x: 50, y: 50, w: 100, h: 100 }, 200, 200, [255, 255, 255]), 0);
  pruef('kantenAnteil: Rand am Bildrand zählt nicht (Fotorand)', L.kantenAnteil(bild(20, 20, [255, 255, 255], [0, 0, 20, 20]), 20, { x: 0, y: 0, w: 200, h: 200 }, 200, 200, [255, 255, 255]), 0);
}
pruef('zuschnittErhalt: volles Quadrat in 1.29 behält 77.5 %', L.zuschnittErhalt({ x0: 0, y0: 0, x1: 1, y1: 1 }, 1000, 1000, 1.29), 0.775);
pruef('zuschnittErhalt: kleines mittiges Produkt bleibt ganz', L.zuschnittErhalt({ x0: 0.3, y0: 0.3, x1: 0.7, y1: 0.7 }, 1000, 1000, 1.29), 1);
pruef('zuschnittErhalt: Hochformat-Kachel schneidet seitlich', L.zuschnittErhalt({ x0: 0, y0: 0.4, x1: 1, y1: 0.6 }, 1000, 1000, 0.5), 0.5);

// ---------------------------------------------------------------- Gemini-Urteil
const GUT = { text: false, infografik: false, collage: false, logo_marke: false, wasserzeichen: false, nachbildung: false, wirkversprechen: false, anstoessig: false, kategorie_passt: true, produkt_erkennbar: true, grund: 'sauber' };
pruef('urteil: sauber', L.urteilBewerten(GUT).ok, true);
pruef('urteil: Logo', L.urteilBewerten({ ...GUT, logo_marke: true }).gruende, ['logo_marke']);
pruef('urteil: Feld fehlt = nicht ok', L.urteilBewerten({ ...GUT, nachbildung: undefined }).gruende, ['feld-fehlt:nachbildung']);
pruef('urteil: Feld als Text = nicht ok', L.urteilBewerten({ ...GUT, text: 'false' }).ok, false);
pruef('urteil: passt nicht', L.urteilBewerten({ ...GUT, kategorie_passt: false }).gruende, ['nicht-kategorie_passt']);
pruef('urteil: keine Antwort', L.urteilBewerten(null).gruende, ['keine-antwort']);
pruef('Prompt nennt Kategorie und alle Felder', [...L.PRUEF_FELDER_NEIN, ...L.PRUEF_FELDER_JA].every(x => L.pruefPrompt('Herren-Schuhe').includes(`"${x}"`)) && L.pruefPrompt('Herren-Schuhe').includes('«Herren-Schuhe»'), true);

// ---------------------------------------------------------------- Auswahl
const ANA = { hell: true, ruhig: true, rahmen: { leer: false, rand: 0.1 } };
const K = (o = {}) => ({ produktId: 'A', url: 'https://c/a.jpg', w: 1200, h: 1200, nr: 0, titelbild: true, groesseOk: true, pos: 0, bonus: 0, bewaehrt: false, analyse: ANA, plan: { fehler: null }, urteil: { ok: true }, erhalt: { desktopPlan: 1, desktopHeute: 1, handyHeute: 0.5 }, ...o });
pruef('quadratPunkte: unruhig = untauglich', L.quadratPunkte(K({ analyse: { ...ANA, ruhig: false } })), -Infinity);
pruef('quadratPunkte: Gemini-Befund = untauglich', L.quadratPunkte(K({ urteil: { ok: false } })), -Infinity);
pruef('quadratPunkte: Plan-Fehler = untauglich', L.quadratPunkte(K({ plan: { fehler: 'foto-zu-klein' } })), -Infinity);
pruef('quadratPunkte: quadratisches Produkt vor flachem (Füllgrad)', L.quadratPunkte(K({ plan: { fehler: null, W: 1600, H: 1600, ziel: { w: 1280, h: 1280 } } })) > L.quadratPunkte(K({ plan: { fehler: null, W: 1600, H: 1600, ziel: { w: 1280, h: 350 } } })), true);
pruef('quadratPunkte: geprüft vor ungeprüft', L.quadratPunkte(K()) > L.quadratPunkte(K({ urteil: null })), true);
{
  const a = K({ produktId: 'A', pos: 0 }), b = K({ produktId: 'B', url: 'https://c/b.jpg', pos: 5, bewaehrt: true }), c = K({ produktId: 'C', url: 'https://c/c.jpg', pos: 1, urteil: null });
  pruef('waehleQuadrat: bewährt gewinnt', L.waehleQuadrat([a, b, c]).produktId, 'B');
  pruef('waehleQuadrat: belegtes Produkt übersprungen', L.waehleQuadrat([a, b, c], { belegtProdukte: new Set(['B']) }).produktId, 'A');
  pruef('waehleQuadrat: gleicher Bildinhalt (dHash) übersprungen', L.waehleQuadrat([{ ...a, dhash: 'ffff0000ffff0000' }, { ...b, dhash: '0f0f0f0f0f0f0f0f' }], { belegtHashes: ['0f0f0f0f0f0f0f0e'] }).produktId, 'A');
  pruef('waehleQuadrat: nichts Taugliches = null', L.waehleQuadrat([K({ analyse: { ...ANA, hell: false } })]), null);
}
{
  const ks = ['A', 'B', 'C', 'D', 'E'].map((id, i) => K({ produktId: id, url: `https://c/${id}.jpg`, pos: i, erhalt: { desktopPlan: 1, desktopHeute: 1, handyHeute: i / 10 } }));
  const w = L.waehleKopf(ks);
  pruef('waehleKopf: 4 Produkte, die zwei mit dem besten Handy-Ausschnitt vorn', w.map(k => k.produktId), ['D', 'C', 'A', 'B']);
  pruef('waehleKopf: nur Titelbilder', L.waehleKopf([K({ titelbild: false })]).length, 0);
  pruef('waehleKopf: Hochformat ausgeschlossen', L.waehleKopf([K({ h: 1800 })]).length, 0);
  pruef('waehleKopf: ohne Urteil nur bei KI aus', [L.waehleKopf([K({ urteil: null })]).length, L.waehleKopf([K({ urteil: null })], { kiAus: true }).length], [0, 1]);
  pruef('waehleKopf: Belegung je Lauf', L.waehleKopf(ks, { belegung: new Map([['A', 2], ['B', 1]]) }).map(k => k.produktId).sort(), ['B', 'C', 'D', 'E']);
  pruef('waehleKopf: Saison vor Reihenfolge', L.waehleKopf([...ks, K({ produktId: 'S', url: 'https://c/s.jpg', pos: 9, bonus: 2, erhalt: { desktopPlan: 1, desktopHeute: 1, handyHeute: 0 } })]).map(k => k.produktId).includes('S'), true);
  pruef('waehleKopf: Szenenfoto (erhalt null) erlaubt', L.waehleKopf([K({ erhalt: null })]).length, 1);
  pruef('waehleKopf: Produkt angeschnitten ausgeschlossen', L.waehleKopf([K({ erhalt: { desktopPlan: 0.6, desktopHeute: 0.5, handyHeute: 0.3 } })]).length, 0);
  const typ = ['A', 'B', 'C', 'D', 'E'].map((id, i) => K({ produktId: id, url: `https://c/${id}.jpg`, pos: i, typ: i < 3 ? 'Taschen' : 'Uhren', erhalt: { desktopPlan: 1, desktopHeute: 1, handyHeute: 0.5 } }));
  pruef('waehleKopf: höchstens 2 je Produktart', L.waehleKopf(typ).map(k => k.produktId).sort(), ['A', 'B', 'D', 'E']);
  pruef('waehleKopf: auffüllen, wenn nur eine Produktart da ist', L.waehleKopf(typ.slice(0, 3)).length, 3);
}

// ---------------------------------------------------------------- altes Bild und Entscheid
pruef('Klasse: KI _result', L.altBildKlasse({ url: 'https://c/57f3_resultfac90cace9c2be9d.jpg', width: 2048, height: 1152 }), 'ki');
pruef('Klasse: KI OIG', L.altBildKlasse({ url: 'https://c/OIG2.jpg', width: 1024, height: 1024 }), 'ki');
pruef('Klasse: Stockfoto', L.altBildKlasse({ url: 'https://c/pexels-photo-325867.jpg', width: 1200, height: 800 }), 'stock');
pruef('Klasse: Pinnwand', L.altBildKlasse({ url: 'https://c/pinnwand-uhren.jpg', altText: 'Uhren – LuxeStyle-Pinnwand', width: 2000, height: 1000 }), 'pinnwand');
pruef('Klasse: Label', L.altBildKlasse({ url: 'https://c/x.jpg', width: 1600, height: 1200 }), 'label');
pruef('Klasse: Textbanner', L.altBildKlasse({ url: 'https://c/cat-geschenke.jpg', width: 1600, height: 620 }), 'textbanner');
pruef('Klasse: Foto', L.altBildKlasse({ url: 'https://c/a.jpg', width: 800, height: 800 }), 'foto');
pruef('Klasse: fehlt', L.altBildKlasse(null), 'fehlt');
pruef('BigBuy: EAN und SKU', L.bigbuyKennung('https://c/4067983848452_S64193532_P00_a5de9104-acd0-4485-8f20-281f4d3289f4.jpg'), { ean: '4067983848452', sku: 'S64193532' });
pruef('BigBuy: nur EAN', L.bigbuyKennung('https://c/5901720131485_I01.jpg'), { ean: '5901720131485', sku: null });
pruef('BigBuy: anderes = null', L.bigbuyKennung('https://c/e42b30a8-2aa2.jpg'), null);
const FOTO = { url: 'https://c/a.jpg', altText: 'Uhren', width: 800, height: 800 };
pruef('Entscheid: fehlt → ersetzen', L.ersetzenEntscheid({ bild: null, klasse: 'fehlt', quelle: {} }).ersetzen, true);
pruef('Entscheid: KI → ersetzen', L.ersetzenEntscheid({ bild: FOTO, klasse: 'ki', quelle: { gefunden: false } }).gruende, ['ki-szene']);
pruef('Entscheid: Quelle Entwurf → ersetzen', L.ersetzenEntscheid({ bild: FOTO, klasse: 'foto', quelle: { gefunden: true, lieferbar: false, mitglied: true, grund: 'draft' } }).gruende, ['quelle-nicht-lieferbar:draft']);
pruef('Entscheid: Doppel → ersetzen', L.ersetzenEntscheid({ bild: FOTO, klasse: 'foto', quelle: { gefunden: true, lieferbar: true, mitglied: true }, doppelt: 2 }).gruende, ['doppelt:2']);
pruef('Entscheid: Gemini-Befund → ersetzen', L.ersetzenEntscheid({ bild: FOTO, klasse: 'foto', quelle: { gefunden: false }, altUrteil: { ok: false, gruende: ['text', 'logo_marke'] } }).gruende, ['befund:text+logo_marke']);
pruef('Entscheid: sauberes lieferbares Foto bleibt', L.ersetzenEntscheid({ bild: FOTO, klasse: 'foto', quelle: { gefunden: true, lieferbar: true, mitglied: true }, doppelt: 0, altUrteil: { ok: true, gruende: [] } }), { ersetzen: false, gruende: ['ok'], nurAlt: false });
pruef('Entscheid: Foto in keinem Mitglied (vollständig gesucht) → ersetzen', L.ersetzenEntscheid({ bild: FOTO, klasse: 'foto', quelle: { gefunden: false, vollstaendig: true, gelesen: 120 }, doppelt: 0, altUrteil: null }).gruende, ['quelle-kein-mitglied:vollstaendig-gesucht']);
pruef('Entscheid: Suche abgebrochen (nicht vollständig) → bleibt', L.ersetzenEntscheid({ bild: FOTO, klasse: 'foto', quelle: { gefunden: false, vollstaendig: false, gelesen: 300 }, doppelt: 0, altUrteil: null }).ersetzen, false);
pruef('Entscheid: Pinnwand bleibt trotz vollständiger Suche', L.ersetzenEntscheid({ bild: { url: 'https://c/pinnwand-x.jpg', altText: 'X – LuxeStyle-Pinnwand', width: 2000, height: 1000 }, klasse: 'pinnwand', quelle: { gefunden: false, vollstaendig: true }, doppelt: 0 }).ersetzen, false);
pruef('Entscheid: unbekannte Quelle ohne Befund bleibt', L.ersetzenEntscheid({ bild: FOTO, klasse: 'foto', quelle: { gefunden: false }, doppelt: 0, altUrteil: null }).gruende, ['quelle-unbekannt-ohne-befund']);
pruef('Entscheid: FORCE ersetzt', L.ersetzenEntscheid({ bild: FOTO, klasse: 'foto', quelle: { gefunden: false }, doppelt: 0 }, { force: true }).ersetzen, true);
const PINN = { url: 'https://c/pinnwand-uhren.jpg', altText: 'Uhren – LuxeStyle-Pinnwand', width: 2000, height: 1000 };
pruef('Entscheid: Pinnwand bleibt, Alt-Text-Vorschlag', L.ersetzenEntscheid({ bild: PINN, klasse: 'pinnwand', quelle: { gefunden: false }, doppelt: 1 }), { ersetzen: false, gruende: ['pinnwand-bleibt'], nurAlt: true });
pruef('Entscheid: Pinnwand mit FORCE ersetzt', L.ersetzenEntscheid({ bild: PINN, klasse: 'pinnwand', quelle: { gefunden: false }, doppelt: 1 }, { force: true }).ersetzen, true);
pruef('Entscheid: leerer Alt-Text = Vorschlag', L.ersetzenEntscheid({ bild: { ...FOTO, altText: '' }, klasse: 'foto', quelle: { gefunden: true, lieferbar: true, mitglied: true }, altUrteil: { ok: true } }).nurAlt, true);
pruef('Entscheid: englischer Alt-Text = Vorschlag', L.ersetzenEntscheid({ bild: { ...FOTO, altText: 'Christmas 2026 – LuxeStyle' }, klasse: 'foto', quelle: { gefunden: true, lieferbar: true, mitglied: true }, altUrteil: { ok: true } }).nurAlt, true);

// ---------------------------------------------------------------- Texte
pruef('katName: Emoji weg', L.katName('Weihnachten 🎄'), 'Weihnachten');
pruef('katName: führendes Emoji weg', L.katName('🎁 Geschenke bis CHF 30'), 'Geschenke bis CHF 30');
pruef('altText: Kategorie – Motiv', L.altText('Weihnachten 🎄', 'Weihnachts-Kerzenleuchten'), 'Weihnachten – Weihnachts-Kerzenleuchten');
{
  const a = L.altText('Geschenke für Ihn', 'Grosser Rindsleder-Rucksack für Herren mit Laptopfach und vielen Fächern für Reise und Büro und Alltag für', 60);
  pruef('altText: höchstens max Zeichen', a.length <= 60, true);
  pruef('altText: kein Füllwort am Ende', /\s(für|mit|und)$/.test(a), false);
}
pruef('altText: Schnitt endet auf «mit» → Füllwort weg', L.altText('Uhren', 'Armbanduhr Leder mit Datum und Stoppuhr', 30), 'Uhren – Armbanduhr Leder');
pruef('altText: keine internen Wörter', /pinnwand|luxestyle/i.test(L.altText('Uhren', 'LuxeStyle Pinnwand Uhr')), false);

// ---------------------------------------------------------------- Hash
const steigend = Buffer.from(Array.from({ length: 72 }, (_, i) => (i % 9) * 20));
const fallend = Buffer.from(Array.from({ length: 72 }, (_, i) => 200 - (i % 9) * 20));
pruef('dHash: steigend = 0…', L.dHash(steigend), '0000000000000000');
pruef('dHash: fallend = f…', L.dHash(fallend), 'ffffffffffffffff');
pruef('hamming: gleich 0, gegenteilig 64', [L.hamming('ab12', 'ab12'), L.hamming('0000000000000000', 'ffffffffffffffff')], [0, 64]);
wirft('dHash: zu kurz', () => L.dHash(Buffer.alloc(10)));

// ---------------------------------------------------------------- Plan, Sicherung, Rücklesen, Rücknahme
{
  const e = [{ handle: 'h', id: '1', basis: { bild: { url: 'u' } }, entscheid: { ersetzen: true }, neu: { quelleProdukt: { id: 'p' }, quelleBild: { url: 'b' }, sha256: 's', alt: 'a', art: 'komponiert' }, kopf: { ids: ['x'] } }];
  const h = L.planHash(e);
  pruef('planHash: 16 Hex, gleich bei gleichem Inhalt', [h.length, L.planHash(JSON.parse(JSON.stringify(e)))], [16, h]);
  pruef('planHash: ändert sich mit dem Bild', L.planHash([{ ...e[0], neu: { ...e[0].neu, sha256: 't' } }]) !== h, true);
  pruef('planHash: ändert sich mit dem Kopf', L.planHash([{ ...e[0], kopf: { ids: ['y'] } }]) !== h, true);
}
const J = new Date('2026-11-11T20:00:00Z');
pruef('planAlter: 23 h ok, 25 h nein, Zukunft nein, Müll nein', [L.planAlterOk('2026-11-10T21:00:00Z', J), L.planAlterOk('2026-11-10T19:00:00Z', J), L.planAlterOk('2026-11-11T21:00:00Z', J), L.planAlterOk('x', J)], [true, false, false, false]);
pruef('deckel: Vorgabe 10, höchstens 25', [L.deckel(undefined), L.deckel('3'), L.deckel('100'), L.deckel('abc'), L.deckel('-4')], [10, 3, 25, 10, 10]);
{
  const c = { handle: 'h', id: '1', image: { url: 'https://c/a.jpg?v=1', altText: 'Alt', width: 800, height: 800 }, kopf: '["gid://shopify/Product/1","gid://shopify/Product/2"]' };
  const s = L.sicherungsEintrag(c, 'z');
  pruef('Sicherung: Bild und Kopf', [s.bild.url, s.bild.altText, s.kopf], ['https://c/a.jpg?v=1', 'Alt', '["gid://shopify/Product/1","gid://shopify/Product/2"]']);
  pruef('Sicherung: ohne Bild = null', L.sicherungsEintrag({ handle: 'h', id: '1', image: null }, 'z').bild, null);
  pruef('Basis: nur ?v= anders = gleich', L.basisPruefen(s, { bild: { url: 'https://c/a.jpg?v=9', altText: 'Alt' }, kopf: '[ "gid://shopify/Product/1", "gid://shopify/Product/2" ]' }), []);
  pruef('Basis: anderes Bild, Alt, Kopf', L.basisPruefen(s, { bild: { url: 'https://c/b.jpg', altText: 'X' }, kopf: null }), ['bild', 'alt', 'kopf']);
  const soll = { bild: { alt: 'Neu', w: 1600, h: 1600, neueDatei: true }, kopf: ['gid://shopify/Product/3'] };
  pruef('Rücklesen: alles gleich', L.rueckleseBefund(soll, s, { bild: { url: 'https://c/neu.jpg', altText: 'Neu', width: 1600, height: 1600 }, kopf: '["gid://shopify/Product/3"]' }), []);
  pruef('Rücklesen: Bild unverändert, Alt, Masse, Kopf', L.rueckleseBefund(soll, s, { bild: { url: 'https://c/a.jpg?v=2', altText: 'Alt', width: 800, height: 800 }, kopf: null }), ['bild-unveraendert', 'alt', 'masse:800x800', 'kopf']);
  pruef('Rücklesen: gleicher Dateiname, neue Version, neuer Alt, neue Masse = neues Bild (Shopify, GEMESSEN 11.11.)', L.rueckleseBefund(soll, s, { bild: { url: 'https://c/a.jpg?v=2', altText: 'Neu', width: 1600, height: 1600 }, kopf: '["gid://shopify/Product/3"]' }), []);
  pruef('Basis: gleicher Dateiname, andere Masse = verändert', L.basisPruefen(s, { bild: { url: 'https://c/a.jpg?v=9', altText: 'Alt', width: 1600, height: 1600 }, kopf: '["gid://shopify/Product/1","gid://shopify/Product/2"]' }), ['bild']);
  {
    const aend = { teile: ['bild'], vorher: { bild: { url: 'https://c/a.jpg?v=1', altText: 'Alt', width: 800, height: 800 } }, nachher: { bild: { url: 'https://c/a.jpg?v=2', altText: 'Neu', width: 1600, height: 1600 } } };
    pruef('Rücknahme: gleicher Dateiname, unser Stand = zurück', L.rueckEntscheid(aend, { bild: { url: 'https://c/a.jpg?v=2', altText: 'Neu', width: 1600, height: 1600 } }).aktion, 'zurueck');
    pruef('Rücknahme: gleicher Dateiname, alter Stand = schon', L.rueckEntscheid(aend, { bild: { url: 'https://c/a.jpg?v=1', altText: 'Alt', width: 800, height: 800 } }).aktion, 'schon');
    pruef('Rücknahme: gleicher Dateiname, dritter Stand = fremd', L.rueckEntscheid(aend, { bild: { url: 'https://c/a.jpg?v=3', altText: 'X', width: 1200, height: 1200 } }).aktion, 'fremd');
    pruef('bildGleich: beide ohne Bild gleich, eines ohne ungleich', [L.bildGleich(null, null), L.bildGleich(null, { url: 'https://c/a.jpg' })], [true, false]);
    pruef('bildGleich: gleicher Dateiname, gleiche Masse, anderer Alt = ungleich', L.bildGleich({ url: 'https://c/a.jpg?v=1', altText: 'A', width: 800, height: 800 }, { url: 'https://c/a.jpg?v=2', altText: 'B', width: 800, height: 800 }), false);
    pruef('bildGleich: anderer Dateiname, gleicher Alt = ungleich', L.bildGleich({ url: 'https://c/a.jpg?v=1', altText: 'A' }, { url: 'https://c/b.jpg?v=1', altText: 'A' }), false);
    pruef('bildGleich: gleicher Dateiname, Version, Alt, Masse = gleich', L.bildGleich({ url: 'https://c/a.jpg?v=1', altText: 'A', width: 800, height: 800 }, { url: 'https://c/a.jpg?v=7', altText: 'A', width: 800, height: 800 }), true);
  }
  pruef('Rücklesen: nichts gelesen = Bild fehlt', L.rueckleseBefund(soll, s, null).includes('bild-fehlt'), true);
}
{
  const z = [
    { art: 'aenderung', lauf: 'L1', handle: 'a' }, { art: 'aenderung', lauf: 'L1', handle: 'b' },
    { art: 'aenderung', lauf: 'L2', handle: 'a' }, { art: 'zurueck', lauf: 'L1', handle: 'a' }, { art: 'zurueck', lauf: 'L1', handle: 'b' }];
  const o = L.offeneAenderungen(z);
  pruef('Ledger: späterer Lauf bleibt offen, b zurückgenommen', [[...o.keys()], o.get('a')?.lauf ?? null], [['a'], 'L2']);
  const z2 = [{ art: 'aenderung', lauf: 'L1', handle: 'a', teile: ['bild'], quelle: { produkt: { id: 'P1' } } }, { art: 'aenderung', lauf: 'L1', handle: 'b', teile: ['kopf'] },
    { art: 'aenderung', lauf: 'L1', handle: 'c', teile: ['bild'], quelle: { produkt: { id: 'P3' } } }, { art: 'zurueck', lauf: 'L1', handle: 'c' },
    { art: 'aenderung', lauf: 'L1', handle: 'd', teile: ['bild'], quelle: { produkt: { id: 'P4' } } }];
  pruef('belegtAusLedger: nur offene Bild-Änderungen anderer Sammlungen', [...L.belegtAusLedger(z2, ['d'])].sort(), ['P1']);
}
{
  const a = { teile: ['bild', 'kopf'], vorher: { bild: { url: 'https://c/alt.jpg?v=1', altText: 'A' }, kopf: null }, nachher: { bild: { url: 'https://c/neu.jpg?v=1', altText: 'N' }, kopf: '["x"]' } };
  pruef('Rücknahme: heute unser Stand → zurück', L.rueckEntscheid(a, { bild: { url: 'https://c/neu.jpg?v=5', altText: 'N' }, kopf: '["x"]' }), { aktion: 'zurueck', teile: { bild: 'zurueck', kopf: 'zurueck' } });
  pruef('Rücknahme: alter Stand schon da → schon', L.rueckEntscheid(a, { bild: { url: 'https://c/alt.jpg?v=1', altText: 'A' }, kopf: null }).aktion, 'schon');
  pruef('Rücknahme: fremd geändert → nichts', L.rueckEntscheid(a, { bild: { url: 'https://c/fremd.jpg' }, kopf: '["x"]' }).aktion, 'fremd');
  pruef('Rücknahme: fremd mit Übersteuerung → zurück', L.rueckEntscheid(a, { bild: { url: 'https://c/fremd.jpg' }, kopf: '["x"]' }, { fremdUeberschreiben: true }).teile, { bild: 'zurueck', kopf: 'zurueck' });
  pruef('Rücknahme: nur Kopf noch unser, Bild schon alt', L.rueckEntscheid(a, { bild: { url: 'https://c/alt.jpg', altText: 'A' }, kopf: '["x"]' }), { aktion: 'zurueck', teile: { bild: 'schon', kopf: 'zurueck' } });
}
pruef('kopfWert: JSON mit Leerzeichen = kompakt', L.kopfWert('[ "a" , "b" ]'), '["a","b"]');

console.log(`${n - f} von ${n} Prüfungen bestanden${f ? `, ${f} FEHLGESCHLAGEN` : ''}`);
process.exit(f ? 1 : 0);
