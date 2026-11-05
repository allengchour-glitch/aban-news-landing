/**
 * Mutationsprobe für den Editor v6 und den Kartenbauer: baut absichtlich Fehler in KOPIEN von lspod-designer-v6.js und werkzeug/karte_fuer_editor.mjs ein (die Dateien im Repo
 * werden nie verändert) und prüft, dass die Tests rot werden: zuerst unit_test.mjs, dann (falls grün geblieben, nur bei Mutanten des Editors) die Kern-Szenarien von editor_test.mjs.
 * Eine Mutation gilt als erkannt, wenn einer der beiden Läufe mit Fehler endet. Überlebt eine, fehlt eine Prüfung.
 * Aufruf: node mutationsprobe.mjs [Teil]         (Teil: Anfang des Mutantennamens, z. B. M18 oder N0 oder K)
 *         node mutationsprobe.mjs --muster      (nur prüfen, ob jedes Suchmuster genau einmal vorkommt, keine Tests)
 * Umgebung: V6_BILDCACHE (optional), PARALLEL (gleichzeitige Läufe, Vorgabe 3).
 * Die Kopien liegen in einem eigenen, neu angelegten Temp-Ordner (mkdtemp): parallele Läufe stören sich nicht.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { hier, V6_DATEI } from './lib.mjs';

const KARTENBAUER = join(hier, '..', 'werkzeug', 'karte_fuer_editor.mjs');

// Mutanten des Editors: [Name, altes Muster (muss genau einmal vorkommen), neuer Text]
const MUTANTEN = [
  ['M01 Wechselkurs der Aufpreise', "var PREIS_KURS = 0.90;", "var PREIS_KURS = 0.80;"],
  ['M02 Obergrenze der Druckdatei entfällt', "if (maxPx > 0 && w * h > maxPx) {", "if (false && maxPx > 0 && w * h > maxPx) {"],
  ['M03 Rand des Sichtfensters 20 % statt 10 %', "var m = Math.max(aw, ah) * 0.1;", "var m = Math.max(aw, ah) * 0.2;"],
  ['M04 Platzierungen schliessen sich nicht aus', "return Object.keys(k).filter(function (q) { return ebenen[q] && ebenen[q].length > 0; });", "return Object.keys(k).filter(function (q) { return false; });"],
  ['M05 Konflikte nur in einer Richtung', "karte.konflikte[p.id][q] = true; karte.konflikte[q][p.id] = true;", "karte.konflikte[p.id][q] = true;"],
  ['M06 Vorgabe Mindest-dpi 50 statt 100', "var MIN_DPI_VORGABE = 100;", "var MIN_DPI_VORGABE = 50;"],
  ['M07 dpi ohne Obergrenze der Druckdatei', "return Math.min(dpi, pf.dpi * (rg ? rg.k : 1));", "return dpi;"],
  ['M08 Dateigrösse in cm falsch umgerechnet', "breite: pf.breitePx / pf.dpi * 2.54,", "breite: pf.breitePx / pf.dpi * 2.5,"],
  ['M09 Druckdatei in fester Grösse statt Pixelgrösse des Printfiles', "var W = Math.max(1, Math.floor(g.render.w * sk)), H = Math.max(1, Math.floor(g.render.h * sk));", "var W = 1200, H = 1200;"],
  ['M10 Schlüssel der Druckdatei ohne Platzierung', "props['\\u{1F5BC}\\uFE0F Druckdatei (' + p.id + ')'] = druckUrls[p.id];", "props['\\u{1F5BC}\\uFE0F Druckdatei'] = druckUrls[p.id];"],
  ['M11 Aufpreis in _pod_karte immer 0', "o.ap = Math.round(ap * 100) / 100;", "o.ap = 0;"],
  ['M12 Aufpreisbox auch ohne Ebenen', "if (ap > 0 && st.ebenen[p.id].length) {", "if (ap > 0) {"],
  ['M13 v5-Modus: falsche Leinwandhöhe', "var hoehe = Math.round(ref * ratio);", "var hoehe = ref;"],
  ['M14 X in cm mit der Höhe gerechnet', "f.x.input.value = schweizerZahl(e.cx * m.breite, 1).replace(',', '.');", "f.x.input.value = schweizerZahl(e.cx * m.hoehe, 1).replace(',', '.');"],
  ['M15 Variante ändert die Druckdatei nicht', "if (printfulVarianteId != null) {\n      var v = karte.varianten[printfulVarianteId];", "if (false) {\n      var v = karte.varianten[printfulVarianteId];"],
  ['M16 gesperrter Reiter nicht markiert', "b.setAttribute('aria-disabled', 'true');", "b.removeAttribute('aria-disabled');"],
  ['M17 dpi-Schwelle 50 statt Mindestwert der Karte', "var tief = d < karte.minDpi;", "var tief = d < 50;"],
  ['M18 Bearbeitung markiert die Ebene nicht sofort als «lädt hoch»', "if (CLOUDINARY_AKTIV) { e.uploading = true; e.printUrl = ''; geaendert(); }", ""],
  ['M19 v6 setzt den Guard von v5', "window.__lspodDesignerV6Loaded = true;", "window.__lspodDesignerV6Loaded = true; window.__lspodDesignerLoaded = true;"],
  ['M20 Stickerei-Hinweis wird nicht gezeigt', "if (!h || (h.art !== 'einschraenkung' && !HINWEIS_TEXTE[h.code])) return;", "return;"],
  ['M21 Platzierung ohne Breite wird nicht verworfen', "if (!pf || !(pf.breitePx > 0) || !(pf.hoehePx > 0)) return false;", "if (!pf) return false;"],
  ['M22 Shopify → Printful-Variante geht verloren', "if (karte.shop[k] != null) return { pv: Number(karte.shop[k]), m: karte.printfulProductId };", "if (false) return null;"],
  ['M23 v5-Modus: Schlüssel ohne «Vorne ·»', "var vor = zwei ? T.pSide[i] + ' \\xB7 ' : '';", "var vor = '';"],
  ['M24 Aufpreis-Summe zählt falsch', "summe += ap; }", "summe += 1; }"],
  ['M25 Zahlenformat rundet ab', "var r = Math.round((n + Number.EPSILON * Math.sign(n)) * f) / f;", "var r = Math.floor((n + Number.EPSILON * Math.sign(n)) * f) / f;"],
  ['M26 Escape schliesst die Vorschau nicht', "zuBtn.addEventListener('click', zu);\n        modal.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') zu(); });", "zuBtn.addEventListener('click', zu);"],
  ['M27 Druckfläche quadratisch statt im Seitenverhältnis', "var fl = (vl.flaecheLinks - w.x) / w.w, fo = (vl.flaecheOben - w.y) / w.h, fb = vl.flaecheBreite / w.w, fh = vl.flaecheHoehe / w.h;", "var fl = (vl.flaecheLinks - w.x) / w.w, fo = (vl.flaecheOben - w.y) / w.h, fb = vl.flaecheBreite / w.w, fh = fb * w.w / w.h;"],
  ['M28 Druckdatei trägt den Text an falscher Stelle', "var cx = e.cx * W, cy = e.cy * H;", "var cx = e.cx * W, cy = e.cx * H;"],
  ['M29 Rückgängig prüft die aktive Platzierung nicht', "if (!blockiertDurch(st.aktiv).length) return;", "return;"],
  ['M30 Variantenfarbe wird ignoriert', "var eigeneFarbe = st.pfVariante != null && karte.farbeVon[st.pfVariante]", "var eigeneFarbe = false && karte.farbeVon[st.pfVariante]"],
  ['M31 Interne Hinweistexte der Karte werden gezeigt', "return h.art === 'einschraenkung' && h.text ? h.text : null;", "return h.text || 'Erfahrungswert, nicht gemessen';"],
  ['M32 Foto-Einpassen entfällt (Foto ragt über flache Fläche)', "if (faktor < 1) { e.scale", "if (false) { e.scale"],
  // ── neu nach den Funden der Gegenleser ──
  ['N01 Bündel: das Modell wechselt nicht mit der Variante', "      karte = neu;\n      if (!platzierungIn(karte, st.aktiv)", "      if (!platzierungIn(karte, st.aktiv)"],
  ['N02 Motiv auf nicht vorhandener Platzierung sperrt den Kauf nicht', "if (fremde.length) { meldung(fmt(T.orphan, { a: fremde.map(", "if (false) { meldung(fmt(T.orphan, { a: fremde.map("],
  ['N03 Bündel: Variante ohne Zuordnung gilt als eingerichtet', "if (buendel) return !!zuordnungFuer(st.shopVariante);", "if (buendel) return true;"],
  ['N04 Mehrere Druckdateien ohne Zuordnung: Standardgeometrie statt Sperre', "if (mehrereGeometrien() && st.pfVariante == null) return false;", ""],
  ['N05 Variante nach dem Bauen nicht mehr verglichen', "if (String(aktuelleShopVariante()) !== eingefroren.sv) throw new Error(T.varChanged);", ""],
  // Einfrieren ganz entfernt: Geometrie folgt immer der Seite UND der Variantenwächter läuft auch während des Bauens (einzeln wäre jede Hälfte durch die andere gedeckt)
  ['N06 Geometrie folgt der Seite statt der eingefrorenen Variante', ["var pv = pfV !== undefined ? pfV : (eingefroren ? eingefroren.pv : st.pfVariante);", "if (eingefroren) return;   // während die Druckdateien gebaut werden, gilt die eingefrorene Variante"], ["var pv = st.pfVariante;", ""]],
  ['N07 Variantenwechsel während des Bauens wird nachgeführt', "if (eingefroren) return;   // während die Druckdateien gebaut werden, gilt die eingefrorene Variante", ""],
  ['N08 Foto-Bearbeitung: jeder Upload darf schreiben', "function gilt() { return bildVersion[e.id] === nr; }", "function gilt() { return true; }"],
  ['N09 Upload des Originals überschreibt die Bearbeitung', "if ((bildVersion[e.id] || 0) !== nr0) return;   // inzwischen bearbeitet: die Bearbeitung hat ihren eigenen Upload", ""],
  ['N10 Originalgrösse geht bei Rückgängig verloren', "if (n.type === 'image' && !n._origW && origMass[n.id]) {", "if (false) {"],
  ['N11 Dateigrösse wird vor dem Upload nicht geprüft', "if (maxBytes > 0 && blob.size > maxBytes) {", "if (false) {"],
  ['N12 Ablehnung als «zu gross» wird nicht wiederholt', "if (err && err.gross && versuch < 4) { versuch++; skala *= 0.7; return einmal(); }", ""],
  ['N13 Upload ohne Zeitlimit', "if (zeitMs > 0) timer = setTimeout(", "if (false) timer = setTimeout("],
  ['N14 aktiver Reiter wird nicht ins Sichtfeld gerückt', "if (an) aktivenReiterZeigen(b);", ""],
  ['N15 Sprungziel #lspod-start fehlt', "try { if (!document.getElementById('lspod-start')) ui.karte.id = 'lspod-start'; } catch (x) { /* egal */ }", ""],
  ['N16 Tippfläche der Griffe nur 40 px', 'content:"";position:absolute;inset:-9px', 'content:"";position:absolute;inset:-5px'],
  ['N17 _pod_karte über 255 Zeichen wird nicht abgelehnt', "if (podKarteWert(verwendet).length > POD_KARTE_MAX) {", "if (false) {"],
  // beide Rücksetzungen zugleich entfernt (jede für sich wird von der anderen gedeckt)
  ['N18 alte Druckdatei-Adressen bleiben nach Fehler und Änderung', ["eingefroren = null;\n        druckUrls = {};\n        formularSynchronisieren();", "if (!eingefroren) druckUrls = {};"], ["eingefroren = null;", ""]],
  ['N20 Emoji im Text werden zerschnitten', "return Array.from(z).slice(0, 40).join('');", "return z.slice(0, 40);"],
  ['N21 Rundum-Druck: Druckbogen als Druckfläche bezeichnet (Bühne)', "ui.tag.textContent = fmt(karte.klasse === 'PANEL' ? T.sheetInfo : T.areaInfo,", "ui.tag.textContent = fmt(T.areaInfo,"],
  ['N22 Rundum-Druck: Druckbogen als Druckfläche bezeichnet (Meta)', "teile.push(fmt(karte.klasse === 'PANEL' ? T.sheetInfo : T.areaInfo,", "teile.push(fmt(T.areaInfo,"],
  ['N23 Eingaben während des Bauens nicht gesperrt', "if (an) ui.karte.setAttribute('inert', '');", "if (an) { /* nichts */ }"],
  ['N24 Bündel: Zuordnung auf unbekanntes Modell wird angenommen', "x.m != null && modelle[String(x.m)])", "x.m != null)"],
  ['N25 data-max-px=0 heisst wieder «keine Grenze»', "if (!legacy && (!(maxPixel > 0) || maxPixel > MAX_PIXEL_ABS)) maxPixel = MAX_PIXEL_ABS;", ""],
  ['N26 Hinzufügen auf fremder Platzierung erlaubt', "if (!platzierungIn(karte, st.aktiv)) {   // fremde Platzierung", "if (false) {   // fremde Platzierung"],
  ['N27 px in _pod_karte nennt die geplante statt der tatsächlichen Grösse', "var rg = letzteGroesse[p.id] && fix ? letzteGroesse[p.id] : g.render;", "var rg = g.render;"],
  ['N28 Stickerei-Hinweis verspricht Garnfarben', "de: 'Stickerei: Dein Motiv wird gestickt.", "de: 'Stickerei: Dein Motiv wird in Garnfarben gestickt."],
  ['N29 Modus des Containers wird nicht gesetzt', "container.setAttribute('data-lspod6-modus', legacy ? 'v5' : 'karte');", ""],
];

// Mutanten des Kartenbauers (nur unit_test.mjs, V6_KARTENBAUER zeigt auf die Kopie)
const KB_MUTANTEN = [
  ['K01 Kartenbau prüft die Printful-Varianten nicht gegen den Katalog', "if (fremd.length) {", "if (false) {"],
  ['K02 ohneAufpreis wirkt nicht', "if (opt.ohneAufpreis) roh = roh.filter(", "if (false) roh = roh.filter("],
  ['K03 ohneEtiketten wirkt nicht', "if (opt.ohneEtiketten) roh = roh.filter(", "if (false) roh = roh.filter("],
  ['K04 Rundum-Druck wird nicht abgewiesen', "if (k.klasse === 'PANEL' && !opt.panelErlauben) {", "if (false) {"],
  ['K05 Bündel: unbekannte Printful-Variante wird nicht gemeldet', "if (!m) { fehlt.push(", "if (false) { fehlt.push("],
  ['K06 Bündel: Variante in zwei Katalogen wird nicht gemeldet', "if (besitzer.has(id)) throw new Error(", "if (false) throw new Error("],
  ['K07 GID-Schlüssel werden nicht erkannt', "(?:gid:\\/\\/shopify\\/ProductVariant\\/)?", ""],
  ['K08 Konflikte nennen entfernte Platzierungen', "kollidiertMit: p.kollidiertMitImEditor.filter((q) => bleibt.has(q)),", "kollidiertMit: p.kollidiertMitImEditor,"],
  ['K09 Bündel: nicht verkaufte Modelle bleiben drin', "for (const pid of Object.keys(modelle)) if (!gebraucht.has(pid)) delete modelle[pid];", ""],
  ['K10 Bündel: dasselbe Modell zweimal wird angenommen', "if (modelle[pid]) throw new Error(", "if (false) throw new Error("],
  ['K11 Filter lassen leere Karte zu', "if (!roh.length) throw new Error(", "if (false) throw new Error("],
  ['K12 Zuordnung mit Bruch als Printful-Variante wird angenommen', "if (!Number.isInteger(pv) || pv <= 0) {", "if (false) {"],
];

const nur = process.argv[2] || '';
const original = readFileSync(V6_DATEI, 'utf8');
const originalKb = readFileSync(KARTENBAUER, 'utf8');
const node = process.execPath;

if (nur === '--muster') {
  let schlecht = 0;
  const zaehle = (q, alt) => [].concat(alt).map((a) => q.split(a).length - 1);
  for (const [name, alt] of MUTANTEN) { const c = zaehle(original, alt); if (c.some((x) => x !== 1)) { schlecht++; console.log(`?  ${name}: Muster ${c.join('/')}× gefunden`); } }
  for (const [name, alt] of KB_MUTANTEN) { const c = zaehle(originalKb, alt); if (c.some((x) => x !== 1)) { schlecht++; console.log(`?  ${name}: Muster ${c.join('/')}× gefunden`); } }
  console.log(`${MUTANTEN.length + KB_MUTANTEN.length} Muster geprüft, ${schlecht} nicht anwendbar`);
  process.exit(schlecht ? 1 : 0);
}

const ordner = mkdtempSync(join(tmpdir(), 'v6-mutation-'));
function lauf(datei, args, env) {
  return new Promise((ok) => {
    const k = spawn(node, [join(hier, datei), ...args], { env: { ...process.env, ...env }, stdio: 'ignore' });
    const t = setTimeout(() => k.kill('SIGKILL'), 300000);
    k.on('close', (code) => { clearTimeout(t); ok(code); });
  });
}
const aufgaben = [];
MUTANTEN.forEach(([name, alt, neu], i) => aufgaben.push({ name, art: 'editor', alt, neu, i }));
KB_MUTANTEN.forEach(([name, alt, neu], i) => aufgaben.push({ name, art: 'kartenbauer', alt, neu, i: 100 + i }));
const gewaehlt = aufgaben.filter((a) => !nur || a.name.startsWith(nur) || (nur === 'K' && a.art === 'kartenbauer'));
const ergebnis = { erkannt: 0, ueberlebt: [], unanwendbar: [] };
let naechster = 0;
async function arbeiter() {
  while (naechster < gewaehlt.length) {
    const a = gewaehlt[naechster++];
    let mutiert = a.art === 'editor' ? original : originalKb;
    const alte = [].concat(a.alt), neue = [].concat(a.neu);
    let schlecht = null;
    alte.forEach((muster, j) => {
      const teile = mutiert.split(muster);
      if (teile.length !== 2) schlecht = `${teile.length - 1}×`;
      else mutiert = teile.join(neue[j]);
    });
    if (schlecht) { ergebnis.unanwendbar.push(`${a.name} (Muster ${schlecht} gefunden)`); console.log(`?  ${a.name}: Muster nicht genau einmal gefunden (${schlecht})`); continue; }
    if (a.art === 'editor') {
      const datei = join(ordner, `mutant-${a.i}.js`);
      writeFileSync(datei, mutiert);
      const umg = { V6_DATEI: datei };
      if (await lauf('unit_test.mjs', [], umg) !== 0) { ergebnis.erkannt++; console.log(`✓ ${a.name}: erkannt durch unit_test`); continue; }
      if (await lauf('editor_test.mjs', ['kern'], umg) !== 0) { ergebnis.erkannt++; console.log(`✓ ${a.name}: erkannt durch editor_test`); continue; }
    } else {
      // Der Kartenbauer importiert relativ zu seinem Ort: die Pfade der Kopie zeigen auf die echten Dateien
      const fix = mutiert.replaceAll("'../../../dropship/", `'${pathToFileURL(join(hier, '..', '..', '..', 'dropship')).href}/`);
      const datei = join(ordner, `kartenbauer-${a.i}.mjs`);
      writeFileSync(datei, fix);
      if (await lauf('unit_test.mjs', [], { V6_KARTENBAUER: datei }) !== 0) { ergebnis.erkannt++; console.log(`✓ ${a.name}: erkannt durch unit_test`); continue; }
    }
    ergebnis.ueberlebt.push(a.name); console.log(`✗ ${a.name}: ÜBERLEBT`);
  }
}
await Promise.all(Array.from({ length: Math.max(1, Number(process.env.PARALLEL) || 3) }, arbeiter));
rmSync(ordner, { recursive: true, force: true });
console.log(`\n${ergebnis.erkannt} erkannt, ${ergebnis.ueberlebt.length} überlebt, ${ergebnis.unanwendbar.length} nicht anwendbar (von ${gewaehlt.length})`);
if (ergebnis.ueberlebt.length) console.log('Überlebt:\n  ' + ergebnis.ueberlebt.join('\n  '));
process.exit(ergebnis.ueberlebt.length || ergebnis.unanwendbar.length ? 1 : 0);
