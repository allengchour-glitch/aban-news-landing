/**
 * Vorschaudaten für die Ansicht «Auf dem Produkt» des Editors v6.2.0 (WP3): aus den Printful-Katalogdateien (katalog/<ModellId>.json) je Modell die verdichteten Vorlagendaten
 * bauen und auflisten, welche Printful-Bilder auf Shopify Files gespiegelt werden müssen. Rein bis auf das Schreiben in den Ausgabeordner: kein Netz, nie ein Schreibzugriff
 * auf Shopify, Printful oder das Theme.
 *
 * WARUM SPIEGELN: die Katalogfotos unter files.cdn.printful.com/products/… senden keinen CORS-Kopf (GEMESSEN 06.11.2026: kein access-control-allow-origin), eine Zeichenfläche mit
 * so einem Bild lässt sich nicht als JPEG exportieren. Die Vorlagenbilder unter /m/… senden «access-control-allow-origin: *» (GEMESSEN), gehen also direkt; gespiegelt werden sie trotzdem,
 * weil unklar ist, wie stabil die Printful-Adressen mit ?v= sind (Bauplan, «Unbekannt») und damit die Seite nicht von einem fremden CDN abhängt. cdn.shopify.com sendet CORS «*».
 *
 * TROCKENLAUF IST DER EINZIGE MODUS: das Werkzeug schreibt höchstens in --out. Das Hochladen der Bilder macht später der Hauptlauf anhand von spiegel_plan.json und liefert eine Datei
 * { "<dateiname>": "<Adresse auf Shopify Files>" }; mit --spiegel wird sie in die Vorschaudaten eingebacken (ohne sie steht überall null, der Editor nimmt dann die Printful-Adresse).
 *
 * AUFRUF
 *   node vorschau_daten_bauen.mjs --katalog <Ordner mit <id>.json> [--modelle 71,19,268 | alle] [--out <Ordner>] [--spiegel <hochgeladen.json>] [--buendel name=71,456,586 …] [--stand JJJJ-MM-TT]
 *   Ohne --out wird nur der Bericht ausgegeben. Mit --out entstehen:
 *     <id>.vorschau.json            Vorschaudaten (Schema 1) EINES Modells
 *     buendel-<name>.vorschau.json  mehrere Modelle in einer Datei (ein Shop-Produkt aus mehreren Printful-Modellen, wie beim Kartenbündel)
 *     spiegel_plan.json             was hochzuladen wäre: Quelle, Dateiname, Art, Modelle
 *     bericht.json                  Zahlen zum Lauf
 *
 * SCHEMA 1 (was der Editor liest: adapter, grund, bilder, tasse; «vorlagen» ist die Gegenprobe gegen die Karte und wird vom Editor nicht gelesen)
 *   { schema: 1, stand, modelle: { "<Printful-Produkt>": {
 *       adapter: 'flach' | 'tasse' | 'papier' | 'keine',   flach = Hintergrund → Design → Vorlagenbild (Kleidung, Taschen, Hüllen), tasse = Zylinder, papier = Poster und Leinwand,
 *                                                           keine = ehrlicher Hinweis statt Vorschau
 *       grund: null | 'rundum' | 'ungeeignet' | 'layout',  warum «keine» (Rundum-Druck, technisch ungeeignet, nur Raster-Layout statt Produktfoto als Vorlage)
 *       titel, klasse,
 *       bilder: { "<Printful-Adresse>": "<Adresse auf Shopify Files>" | null },   alle Vorlagen- und Hintergrundbilder, die FOTOS sind (kein Raster); der Editor zeichnet nur, was hier steht
 *       tasse: { "<Printful-Variante>": { foto, quelle, fotoBreite, fotoHoehe, mitteX, radius, oben, unten, winkel, ausschnitt } },
 *       vorlagen: { "<Platzierung>": { technik, printfile: {b, h, dpi}, art: 'foto'|'layout'|null, bild, hg, farbe, tw, th, fl, fo, fb, fh, vorne } }
 *   } } }
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { modellkarteBauen } from '../../../dropship/selbst-gestalten-fertig-0511/werkzeuge/modellkarte.mjs';

export const SCHEMA = 1;
export const ADAPTER = Object.freeze(['flach', 'tasse', 'papier', 'keine']);
/** Produkttypen des Katalogs, die der Papier-Adapter zeichnet (flaches Blatt mit Schatten). */
export const PAPIER_TYPEN = Object.freeze(['POSTER', 'CANVAS', 'FRAMED-POSTER']);

/**
 * Eichung der Tassenfotos (Printful-Modell 19, drei Grössen), von Hand an den Katalogfotos gemessen am 06.11.2026 (Umriss der nicht-weissen Pixel, Spaltenprofil je Zeile; Werkzeug im Scratch).
 * Alle Zahlen in Pixeln des Katalogfotos. mitteX/radius = Körper des Zylinders (linke und rechte Kante des Bechers in Zeilen unter dem Rand), oben/unten = Druckband (Rand bis Boden,
 * Verhältnis Druckhöhe zu Körperhöhe aus dem Printfile), winkel = Winkel der ganzen Druckbreite (Annahme 330 Grad: 9 Zoll Druckbreite bei rund 9,7 Zoll Umfang), ausschnitt = Bildteil,
 * der gezeigt wird (Tasse samt Henkel in der Mitte). Nicht gegen ein Printful-Mockup gemessen (Tasse ist in der Messung des Pixelvergleichs ausdrücklich nicht enthalten).
 */
export const TASSEN_EICHUNG = Object.freeze({
  1320: Object.freeze({ fotoBreite: 700, fotoHoehe: 1000, mitteX: 407, radius: 194, oben: 290, unten: 735, winkel: 330, ausschnitt: Object.freeze([0, 165, 700, 700]) }),
  4830: Object.freeze({ fotoBreite: 275, fotoHoehe: 500, mitteX: 168, radius: 71, oben: 80, unten: 289, winkel: 330, ausschnitt: Object.freeze([0, 48, 275, 275]) }),
  16586: Object.freeze({ fotoBreite: 700, fotoHoehe: 1000, mitteX: 428, radius: 202, oben: 280, unten: 785, winkel: 330, ausschnitt: Object.freeze([0, 160, 700, 700]) }),
});

/** Art eines Vorlagenbildes nach der Adresse: 'foto' (Printful-Mockup-Bilder unter /m/: Geisterbild, Hintergrundtextur, Hülle auf dem Handy), 'layout' (Raster mit Beschriftung, api-template), sonst null. */
export function bildArt(url) {
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) return null;
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.hostname !== 'files.cdn.printful.com') return null;
  if (/^\/m\//.test(u.pathname)) return 'foto';
  if (/api-template|\/generator\//.test(u.pathname)) return 'layout';
  return null;
}

/** Dateiname einer gespiegelten Datei: stabil aus der GANZEN Quelladresse (mit ?v=): ändert Printful das Bild, ändert sich die Adresse und damit der Name (nie eine Datei überschreiben). */
export function dateiname(url) {
  const h = createHash('sha1').update(String(url)).digest('hex').slice(0, 10);
  const pfad = new URL(url).pathname;
  const endung = (pfad.match(/\.(png|jpe?g|webp)$/i) || ['', 'png'])[1].toLowerCase().replace('jpeg', 'jpg');
  return `luxe-vorschau-${h}.${endung}`;
}

function sortiert(obj) {
  const aus = {};
  for (const k of Object.keys(obj).sort()) aus[k] = obj[k];
  return aus;
}

/** Eine Vorlage der Modellkarte in die kurze Form der Gegenprobe. */
function vorlageKurz(vl) {
  if (!vl) return null;
  return {
    art: bildArt(vl.bildUrl), bild: vl.bildUrl ?? null, hg: vl.hintergrundUrl ?? null, farbe: vl.hintergrundFarbe ?? null,
    tw: vl.vorlageBreite, th: vl.vorlageHoehe, fl: vl.flaecheLinks, fo: vl.flaecheOben, fb: vl.flaecheBreite, fh: vl.flaecheHoehe, vorne: vl.vorderansicht !== false,
  };
}

/**
 * Vorschaudaten EINES Modells.
 * @param {object} katalog   geparste Katalogdatei
 * @param {Record<string, string>} [spiegel]   { dateiname: Adresse auf Shopify Files } aus dem Hochladen (fehlende Einträge: null)
 * @returns {{ pid: string, eintrag: object, dateien: {quelle:string, dateiname:string, art:string}[], bericht: object }}
 */
export function vorschauModell(katalog, spiegel = {}) {
  const k = modellkarteBauen(katalog);
  const pid = String(k.printfulProductId);
  const technisch = k.technischeKlasse;
  const bilder = {};
  const dateien = [];
  const merke = (url, art) => {
    if (typeof url !== 'string' || bildArt(url) !== 'foto' || url in bilder) return;
    const name = dateiname(url);
    bilder[url] = typeof spiegel[name] === 'string' && /^https:\/\//i.test(spiegel[name]) ? spiegel[name] : null;
    dateien.push({ quelle: url, dateiname: name, art });
  };
  const vorlagen = {};
  const ohneFoto = [];
  for (const p of k.platzierungen) {
    vorlagen[p.id] = { technik: p.technik, printfile: { b: p.printfile.breitePx, h: p.printfile.hoehePx, dpi: p.printfile.dpi }, ...vorlageKurz(p.vorlage) };
    const alle = [p.vorlage, ...(p.geometrien ?? []).map((g) => g.vorlage)];
    for (const vl of alle) { if (vl) { merke(vl.bildUrl, 'vorlage'); merke(vl.hintergrundUrl, 'hintergrund'); } }
    if (bildArt(p.vorlage?.bildUrl) !== 'foto') ohneFoto.push(p.id);
  }
  let adapter, grund = null;
  const tasse = {};
  if (technisch === 'PANEL') { adapter = 'keine'; grund = 'rundum'; }
  else if (technisch === 'UNGEEIGNET') { adapter = 'keine'; grund = 'ungeeignet'; }
  else if (PAPIER_TYPEN.includes(k.typ)) { adapter = 'papier'; }
  else if (k.typ === 'MUG') {
    // nur Tassen mit eigener Eichung (heute nur Modell 19): jede Variante braucht ihr Foto in TASSEN_EICHUNG
    const vs = k.varianten.map((v) => v.printfulVariantId);
    const bild = new Map((katalog.varianten ?? []).map((v) => [Number(v.id), v.image]));
    const alleGeeicht = vs.length > 0 && vs.every((id) => TASSEN_EICHUNG[id] && typeof bild.get(id) === 'string');
    if (alleGeeicht) {
      adapter = 'tasse';
      for (const id of vs) {
        const quelle = bild.get(id);
        const name = dateiname(quelle);
        tasse[id] = { foto: typeof spiegel[name] === 'string' && /^https:\/\//i.test(spiegel[name]) ? spiegel[name] : null, quelle, ...TASSEN_EICHUNG[id], ausschnitt: [...TASSEN_EICHUNG[id].ausschnitt] };
        dateien.push({ quelle, dateiname: name, art: 'tassenfoto' });
      }
    } else { adapter = 'keine'; grund = 'ungeeignet'; }
  } else if (k.platzierungen.some((p) => bildArt(p.vorlage?.bildUrl) === 'foto')) adapter = 'flach';
  else { adapter = 'keine'; grund = 'layout'; }
  const eintrag = { adapter, grund, titel: k.titelEn ?? null, klasse: k.klasse ?? null, bilder: sortiert(bilder), tasse, vorlagen: sortiert(vorlagen) };
  return {
    pid, eintrag, dateien,
    bericht: { pid, titel: k.titelEn, typ: k.typ, klasse: k.klasse, technischeKlasse: technisch, adapter, grund, platzierungen: k.platzierungen.length, ohneFotoVorlage: ohneFoto, dateien: dateien.length },
  };
}

/** Datei (Schema 1) aus Modelleinträgen. */
export function vorschauDatei(modelle, stand) {
  const m = {};
  for (const { pid, eintrag } of [...modelle].sort((a, b) => Number(a.pid) - Number(b.pid))) m[pid] = eintrag;
  return { schema: SCHEMA, stand, modelle: m };
}

/** Plan der zu spiegelnden Dateien: eine Zeile je Quelladresse, mit den Modellen, die sie brauchen. */
export function spiegelPlan(ergebnisse, stand) {
  const nach = new Map();
  for (const e of ergebnisse) for (const d of e.dateien) {
    const z = nach.get(d.quelle) ?? { quelle: d.quelle, dateiname: d.dateiname, art: d.art, modelle: [] };
    if (!z.modelle.includes(Number(e.pid))) z.modelle.push(Number(e.pid));
    nach.set(d.quelle, z);
  }
  const dateien = [...nach.values()].sort((a, b) => a.dateiname.localeCompare(b.dateiname));
  for (const d of dateien) d.modelle.sort((a, b) => a - b);
  return {
    stand, anzahl: dateien.length,
    hinweis: 'Nur Plan: dieses Werkzeug lädt nichts hoch. Der Hauptlauf lädt jede Quelle als Datei <dateiname> auf Shopify Files und schreibt { "<dateiname>": "<Adresse>" }; danach das Werkzeug mit --spiegel erneut starten.',
    dateien,
  };
}

/** Alle oder die gewählten Modelle aus einem Katalogordner bauen. */
export function bauen({ katalogOrdner, modelle = 'alle', spiegel = {}, stand = new Date().toISOString().slice(0, 10), buendel = {} }) {
  const ids = modelle === 'alle'
    ? readdirSync(katalogOrdner).map((f) => f.match(/^(\d+)\.json$/)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b)
    : modelle.map(Number);
  const ergebnisse = [];
  const fehler = [];
  for (const id of ids) {
    const datei = join(katalogOrdner, `${id}.json`);
    if (!existsSync(datei)) { fehler.push(`Modell ${id}: Katalogdatei fehlt`); continue; }
    try { ergebnisse.push(vorschauModell(JSON.parse(readFileSync(datei, 'utf8')), spiegel)); }
    catch (e) { fehler.push(`Modell ${id}: ${e.message}`); }
  }
  const dateien = {};
  for (const e of ergebnisse) dateien[`${e.pid}.vorschau.json`] = vorschauDatei([e], stand);
  for (const [name, liste] of Object.entries(buendel)) {
    const teile = ergebnisse.filter((e) => liste.map(String).includes(e.pid));
    const fehlt = liste.map(String).filter((p) => !teile.some((e) => e.pid === p));
    if (fehlt.length) fehler.push(`Bündel ${name}: Modell(e) ${fehlt.join(', ')} nicht gebaut`);
    else dateien[`buendel-${name}.vorschau.json`] = vorschauDatei(teile, stand);
  }
  const plan = spiegelPlan(ergebnisse, stand);
  const zaehler = {};
  for (const e of ergebnisse) zaehler[e.bericht.adapter] = (zaehler[e.bericht.adapter] ?? 0) + 1;
  const bericht = {
    stand, modelle: ergebnisse.length, adapter: zaehler, zuSpiegeln: plan.anzahl, fehler,
    ohneFotoVorlage: ergebnisse.filter((e) => e.bericht.adapter === 'flach' && e.bericht.ohneFotoVorlage.length).map((e) => ({ pid: e.pid, platzierungen: e.bericht.ohneFotoVorlage })),
    je: ergebnisse.map((e) => e.bericht),
  };
  return { dateien, plan, bericht, ergebnisse };
}

/** Standardausgabe für Menschen. */
export function berichtText(b) {
  const z = Object.entries(b.adapter).map(([k, v]) => `${k} ${v}`).join(', ');
  return [`${b.modelle} Modelle: ${z}`, `zu spiegeln: ${b.zuSpiegeln} Dateien`,
    `Modelle «flach» mit Platzierungen ohne Fotovorlage (dort fällt der Editor auf die Druckfläche zurück): ${b.ohneFotoVorlage.length}`,
    ...(b.fehler.length ? ['FEHLER:', ...b.fehler.map((f) => '  ' + f)] : [])].join('\n');
}

// ── Kommandozeile ───────────────────────────────────────────────────────────────────────────────
function argumente(argv) {
  const a = { buendel: {} };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const wert = () => { if (i + 1 >= argv.length) throw new Error(`${k} braucht einen Wert`); return argv[++i]; };
    if (k === '--katalog') a.katalog = wert();
    else if (k === '--out') a.out = wert();
    else if (k === '--spiegel') a.spiegel = wert();
    else if (k === '--stand') a.stand = wert();
    else if (k === '--modelle') { const v = wert(); a.modelle = v === 'alle' ? 'alle' : v.split(',').map((x) => x.trim()).filter(Boolean); }
    else if (k === '--buendel') { const [name, liste] = wert().split('='); if (!/^[a-z0-9-]+$/.test(name || '') || !liste) throw new Error('--buendel name=71,456,586 (name aus a-z, 0-9, -)'); a.buendel[name] = liste.split(',').map((x) => x.trim()).filter(Boolean); }
    else throw new Error(`unbekannte Option ${k} (dieses Werkzeug hat nur den Trockenlauf; Hochladen macht der Hauptlauf)`);
  }
  if (!a.katalog) throw new Error('--katalog <Ordner> fehlt');
  return a;
}

export function main(argv) {
  const a = argumente(argv);
  const spiegel = a.spiegel ? JSON.parse(readFileSync(a.spiegel, 'utf8')) : {};
  const r = bauen({ katalogOrdner: a.katalog, modelle: a.modelle ?? 'alle', spiegel, stand: a.stand, buendel: a.buendel });
  console.log(berichtText(r.bericht));
  if (a.out) {
    mkdirSync(a.out, { recursive: true });
    for (const [name, inhalt] of Object.entries(r.dateien)) writeFileSync(join(a.out, name), JSON.stringify(inhalt) + '\n');
    writeFileSync(join(a.out, 'spiegel_plan.json'), JSON.stringify(r.plan, null, 1) + '\n');
    writeFileSync(join(a.out, 'bericht.json'), JSON.stringify(r.bericht, null, 1) + '\n');
    console.log(`geschrieben nach ${a.out}: ${Object.keys(r.dateien).length} Vorschaudateien, spiegel_plan.json, bericht.json`);
  } else console.log('(ohne --out: nichts geschrieben)');
  return r.bericht.fehler.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exit(main(process.argv.slice(2))); } catch (e) { console.error('FEHLER: ' + e.message); process.exit(2); }
}
