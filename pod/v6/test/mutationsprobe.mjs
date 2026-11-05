/**
 * Mutationsprobe für den Editor v6: baut absichtlich Fehler in eine KOPIE von lspod-designer-v6.js ein (die Datei im Repo wird nie verändert) und prüft,
 * dass die Tests rot werden: zuerst unit_test.mjs, dann (falls grün geblieben) die Kern-Szenarien von editor_test.mjs.
 * Eine Mutation gilt als erkannt, wenn einer der beiden Läufe mit Fehler endet. Überlebt eine, fehlt eine Prüfung.
 * Aufruf: node mutationsprobe.mjs [Teil]   Umgebung: V6_BILDCACHE (optional)
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { hier, V6_DATEI } from './lib.mjs';

const MUTANTEN = [
  ['M01 Wechselkurs der Aufpreise', "var PREIS_KURS = 0.90;", "var PREIS_KURS = 0.80;"],
  ['M02 Obergrenze der Druckdatei entfällt', "if (maxPx > 0 && w * h > maxPx) {", "if (false && maxPx > 0 && w * h > maxPx) {"],
  ['M03 Rand des Sichtfensters 20 % statt 10 %', "var m = Math.max(aw, ah) * 0.1;", "var m = Math.max(aw, ah) * 0.2;"],
  ['M04 Platzierungen schliessen sich nicht aus', "return Object.keys(k).filter(function (q) { return ebenen[q] && ebenen[q].length > 0; });", "return Object.keys(k).filter(function (q) { return false; });"],
  ['M05 Konflikte nur in einer Richtung', "karte.konflikte[p.id][q] = true; karte.konflikte[q][p.id] = true;", "karte.konflikte[p.id][q] = true;"],
  ['M06 Vorgabe Mindest-dpi 50 statt 100', "var MIN_DPI_VORGABE = 100;", "var MIN_DPI_VORGABE = 50;"],
  ['M07 dpi ohne Obergrenze der Druckdatei', "return Math.min(dpi, pf.dpi * (rg ? rg.k : 1));", "return dpi;"],
  ['M08 Dateigrösse in cm falsch umgerechnet', "breite: pf.breitePx / pf.dpi * 2.54,", "breite: pf.breitePx / pf.dpi * 2.5,"],
  ['M09 Druckdatei in fester Grösse statt Pixelgrösse des Printfiles', "var W = g.render.w, H = g.render.h;", "var W = 1200, H = 1200;"],
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
  ['M22 Shopify → Printful-Variante geht verloren', "if (shopId != null && karte.shop[String(shopId)] != null) return Number(karte.shop[String(shopId)]);", "if (false) return 0;"],
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
];

const nur = process.argv[2] || '';
const ordner = join(tmpdir(), 'v6-mutation');
rmSync(ordner, { recursive: true, force: true });
mkdirSync(ordner, { recursive: true });
const original = readFileSync(V6_DATEI, 'utf8');
const node = process.execPath;
const testOrdner = hier;
let erkannt = 0, ueberlebt = [], unanwendbar = [];
for (const [name, alt, neu] of MUTANTEN) {
  if (nur && !name.startsWith(nur)) continue;
  const teile = original.split(alt);
  if (teile.length !== 2) { unanwendbar.push(`${name} (Muster ${teile.length - 1}× gefunden)`); console.log(`?  ${name}: Muster nicht genau einmal gefunden (${teile.length - 1})`); continue; }
  const datei = join(ordner, 'mutant.js');
  writeFileSync(datei, teile.join(neu));
  const umg = { ...process.env, V6_DATEI: datei };
  const u = spawnSync(node, [join(testOrdner, 'unit_test.mjs')], { env: umg, encoding: 'utf8', timeout: 120000 });
  if (u.status !== 0) { erkannt++; console.log(`✓ ${name}: erkannt durch unit_test`); continue; }
  const e = spawnSync(node, [join(testOrdner, 'editor_test.mjs'), 'kern'], { env: umg, encoding: 'utf8', timeout: 300000 });
  if (e.status !== 0) { erkannt++; console.log(`✓ ${name}: erkannt durch editor_test`); continue; }
  ueberlebt.push(name); console.log(`✗ ${name}: ÜBERLEBT`);
}
rmSync(ordner, { recursive: true, force: true });
console.log(`\n${erkannt} erkannt, ${ueberlebt.length} überlebt, ${unanwendbar.length} nicht anwendbar`);
if (ueberlebt.length) console.log('Überlebt:\n  ' + ueberlebt.join('\n  '));
process.exit(ueberlebt.length || unanwendbar.length ? 1 : 0);
