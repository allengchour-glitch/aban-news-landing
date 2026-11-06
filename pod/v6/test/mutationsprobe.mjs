/**
 * Mutationsprobe für den Editor v6 und den Kartenbauer: baut absichtlich Fehler in KOPIEN von lspod-designer-v6.js und werkzeug/karte_fuer_editor.mjs ein (die Dateien im Repo
 * werden nie verändert) und prüft, dass die Tests rot werden: zuerst unit_test.mjs, dann (falls grün geblieben, nur bei Mutanten des Editors) die Kern-Szenarien von vorschau_test.mjs und editor_test.mjs.
 * Mutanten: M/N (Editor 6.1.0), W (Editor 6.2.0: Qualitätstor, Vorschau, Entwurf), K (Kartenbauer), V (Vorschaubauer, nur unit_test).
 * Eine Mutation gilt als erkannt, wenn einer der Läufe mit Fehler endet (Exit-Code ungleich null, vom Test selbst beendet). Überlebt eine, fehlt eine Prüfung.
 * Absicherungen (nach der Gegenlesung vom 06.11.2026): (1) VOR dem ersten Mutanten läuft jede benutzte Stufe auf dem UNVERÄNDERTEN Code; ist sie dort rot, bricht die Probe ab (sonst gälte jeder Mutant
 * als «erkannt»); (2) ein Mutant mit Syntaxfehler zählt als «nicht anwendbar», nicht als erkannt; (3) ein vom Zeitlimit (300 s) abgebrochener Lauf zählt NICHT als erkannt, sondern als «ungeklärt»;
 * (4) die Ausgabe der Läufe wird gelesen: neben «erkannt durch …» steht die erste fehlgeschlagene Prüfung.
 * Aufruf: node mutationsprobe.mjs [Teil]         (Teil: Anfang des Mutantennamens, z. B. M18 oder N0 oder W oder K oder V)
 *         node mutationsprobe.mjs --muster      (nur prüfen, ob jedes Suchmuster genau einmal vorkommt, keine Tests)
 * Umgebung: V6_BILDCACHE (optional), PARALLEL (gleichzeitige Läufe, Vorgabe 3).
 * Die Kopien liegen in einem eigenen, neu angelegten Temp-Ordner (mkdtemp): parallele Läufe stören sich nicht.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { hier, V6_DATEI } from './lib.mjs';

const KARTENBAUER = join(hier, '..', 'werkzeug', 'karte_fuer_editor.mjs');
const VORSCHAUBAUER = join(hier, '..', 'werkzeug', 'vorschau_daten_bauen.mjs');

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
  ['M17 dpi-Schwelle 50 statt Mindestwert der Karte', "if (dpi < Math.min(minDpi, d) - 1e-9) return 'sperre';", "if (dpi < Math.min(50, d) - 1e-9) return 'sperre';"],
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
  ['N18 alte Druckdatei-Adressen bleiben nach Fehler und Änderung', ["eingefroren = null;\n        druckUrls = {};\n        vorschauUrl = '';\n        formularSynchronisieren();", "if (!eingefroren) { druckUrls = {}; vorschauUrl = ''; }"], ["eingefroren = null;\n        formularSynchronisieren();", ""]],
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
  // ── 6.2.0: Qualitätstor, Vorschau «Auf dem Produkt», Entwurf (Prüfungen: unit_test, vorschau_test, editor_test) ──
  ['W01 Sperre schon bei der Dichte statt beim Mindestwert (Dichte ignoriert)', "var d = dichte > 0 ? dichte : Infinity;", "var d = Infinity;"],
  ['W02 Warnstufe endet bei 100 statt 150 dpi', "return dpi < Math.min(DPI_GUT, d) - 1e-9 ? 'mittel' : 'gut';", "return dpi < Math.min(100, d) - 1e-9 ? 'mittel' : 'gut';"],
  ['W03 Genau der Mindestwert sperrt noch', "if (dpi < Math.min(minDpi, d) - 1e-9) return 'sperre';", "if (dpi < Math.min(minDpi, d) + 1e-9) return 'sperre';"],
  ['W04 Anzeige rundet unter der Sperre auf («75» neben der Sperre)', "function dpiGanz(dpi, stufe) { return stufe === 'sperre' ? Math.floor(dpi + 1e-9) : Math.round(dpi); }", "function dpiGanz(dpi, stufe) { return Math.round(dpi); }"],
  ['W05 Kaufsperre bei zu kleinem Foto entfällt', "if (qs) { meldung(qs, 'err'); return; }", ""],
  ['W06 Sperrliste rechnet ohne Dichte der Druckdatei', "if (qualitaetStufe(d, karte.minDpi, g.printfile.dpi * g.render.k) === 'sperre') lage.sperren.push(", "if (qualitaetStufe(d, karte.minDpi, null) === 'sperre') lage.sperren.push("],
  ['W07 Anzeige rechnet ohne Dichte der Druckdatei', "var dichte = g.printfile.dpi * g.render.k;\n      var stufe = qualitaetStufe(d, karte.minDpi, dichte);", "var dichte = 0;\n      var stufe = qualitaetStufe(d, karte.minDpi, dichte);"],
  ['W08 qd fehlt in _pod_karte', "o.qd = Math.floor(lage.min + 1e-9);", ""],
  ['W09 qd gerundet statt abgerundet', "o.qd = Math.floor(lage.min + 1e-9);", "o.qd = Math.round(lage.min);"],
  ['W10 Speicher schreiben ohne Schutz (gesperrter Speicher wirft)', "function speicherSchreiben(k, v) { try { var s = window.localStorage; if (!s) return false; s.setItem(k, v); return true; } catch (e) { return false; } }", "function speicherSchreiben(k, v) { var s = window.localStorage; if (!s) return false; s.setItem(k, v); return true; }"],
  ['W11 Speicher lesen ohne Schutz (gesperrter Speicher wirft)', "function speicherLesen(k) { try { var s = window.localStorage; return s ? s.getItem(k) : null; } catch (e) { return null; } }", "function speicherLesen(k) { var s = window.localStorage; return s ? s.getItem(k) : null; }"],
  ['W12 Entwurf bleibt nach dem Warenkorb im Speicher', "entwurfAus = true; clearTimeout(entwurfTimer); speicherLoeschen(entwurfKey);", "entwurfAus = true; clearTimeout(entwurfTimer);"],
  ['W13 Zu alter Entwurf wird wiederhergestellt', " || Date.now() - d.t > ENTWURF_MAX_ALTER_MS", ""],
  ['W14 Entwurf wird beim Verlassen der Seite nicht gesichert', "window.addEventListener('pagehide', function () { if (document.body.contains(ui.karte)) entwurfSofort(); });", ""],
  ['W15 Wiederhergestelltes Foto behält die Höhe des Ausschnitts nicht', "e._origW = n.aw; e._origH = n.ah > 0 ? n.ah : n.aw;", "e._origW = n.aw; e._origH = n.aw;"],
  ['W16 Entwurf speichert Fotos ohne fertige Datei', "if (e.type !== 'image' || !e.printUrl || e.uploading || !/^https:\\/\\//i.test(e.printUrl)) return null;", "if (e.type !== 'image') return null;"],
  ['W17 Entwurf: Platzierung gibt es nicht (mehr) oder ist ein fremder Schlüssel («__proto__», «constructor»): wird trotzdem eingesetzt', "if (!Object.prototype.hasOwnProperty.call(st.ebenen, pid) || !Array.isArray(d.ebenen[pid])) return;   // diese Platzierung gibt es nicht mehr", "if (!Array.isArray(d.ebenen[pid])) return;"],
  ['W18 Vorschau: Vorlage liegt immer hinter dem Design', "if (vl.vorderansicht !== false) { designZeichnen(); vorlageZeichnen(); } else { vorlageZeichnen(); designZeichnen(); }", "{ designZeichnen(); vorlageZeichnen(); }"],
  ['W20 Vorschau: Vorlage immer multipliziert', "if (opt.overlay === 'multiply') ctx.globalCompositeOperation = 'multiply';", "ctx.globalCompositeOperation = 'multiply';"],
  ['W21 Vorschau: Bildfehler lässt eine leere Ansicht stehen (kein Rückfall)', "if (!r.ok) { if (r.grund !== 'veraltet') vorschauRueckfall(); return; }", "if (!r.ok) { return; }"],
  ['W22 Vorschau: Bilder ohne CORS-Anfrage geladen (Export unmöglich)', "img.crossOrigin = 'anonymous';\n          img.onload = function () { clearTimeout(t); ok(img); };", "img.onload = function () { clearTimeout(t); ok(img); };"],
  ['W23 Export: Dateigewicht nicht begrenzt', "ok(b && b.size > 0 && b.size <= VORSCHAU_MAX_BYTES ? b : null);", "ok(b && b.size > 0 ? b : null);"],
  ['W24 Export: PNG statt JPEG', "}, 'image/jpeg', VORSCHAU_QUALITAET[i]);", "}, 'image/png');"],
  ['W25 Export: 400 statt 800 Pixel', "var VORSCHAU_PX = 800;", "var VORSCHAU_PX = 400;"],
  ['W26 _vorschau wird nicht in die Eigenschaften geschrieben', "if (verwendet.length && vorschauUrl) props._vorschau = vorschauUrl;", ""],
  // beide Rücksetzungen zugleich entfernt (jede für sich wird von der anderen gedeckt, wie bei N18); sichtbar im Formular der Seite nach einem abgelehnten Warenkorb
  ['W27 Alte _vorschau-Adresse bleibt nach Fehler und Änderung', ["eingefroren = null;\n        druckUrls = {};\n        vorschauUrl = '';\n        formularSynchronisieren();", "if (!eingefroren) { druckUrls = {}; vorschauUrl = ''; }"], ["eingefroren = null;\n        druckUrls = {};\n        formularSynchronisieren();", "if (!eingefroren) { druckUrls = {}; }"]],
  ['W28 Kontrast-Hinweis kommt nie', "var KONTRAST_SCHWELLE = 1.8;", "var KONTRAST_SCHWELLE = 1.0;"],
  ['W29 Kontrast-Hinweis nennt immer «dunkel»', "ui.pvKontrast.textContent = a.art === 'dunkel' ? T.kontrastDunkel : T.kontrastHell;", "ui.pvKontrast.textContent = T.kontrastDunkel;"],
  ['W30 Stickerei bekommt eine Vorschau statt des Hinweises', "if (p.technik === 'EMBROIDERY' || /^embroidery/.test(p.id)) return { art: 'hinweis', code: 'stickerei' };", ""],
  ['W31 Rundum-Druck bekommt eine Vorschau statt des Hinweises', "if (karte.klasse === 'PANEL') return { art: 'hinweis', code: 'rundum' };", ""],
  ['W32 Tasse: Zylinder gerade statt gewölbt', "var X1 = mx + R * Math.sin(t1), X2 = mx + R * Math.sin(t2);", "var X1 = mx + R * t1 / 1.5707963, X2 = mx + R * t2 / 1.5707963;"],
  ['W33 Tasse: Katalogfoto nicht multipliziert (Tasse bleibt flach weiss)', "ctx.globalCompositeOperation = 'multiply';\n        ctx.drawImage(foto, sa[0]", "ctx.globalCompositeOperation = 'source-over';\n        ctx.drawImage(foto, sa[0]"],
  ['W34 Reiter «Rücken» zeichnet die Vorlage der ersten Platzierung', "return weg(cv, p, geo(p), spec.m, opt).then(function (r) {", "return weg(cv, karte.platzierungen[0], geo(karte.platzierungen[0]), spec.m, opt).then(function (r) {"],
  ['W35 Vorschau: Stoff immer weiss statt Farbe der Variante', "else { ctx.fillStyle = farbe.hex || '#ffffff'; ctx.fillRect(L.ox, L.oy, L.w, L.h); }", "else { ctx.fillStyle = '#ffffff'; ctx.fillRect(L.ox, L.oy, L.w, L.h); }"],
  ['W36 Vorschaudaten: Bildadressen ohne https werden angenommen', "if (/^https:\\/\\//i.test(k) && (v === null || (typeof v === 'string' && /^https:\\/\\//i.test(v)))) bilder[k] = v;", "bilder[k] = v;"],
  ['W37 Vorschaudaten: Schema wird nicht geprüft', "if (roh.schema !== 1) return { fehler: 'Vorschauschema ' + roh.schema + ' unbekannt' };", ""],
  ['W38 Tassen-Eichung: Winkel über 360 Grad erlaubt', "if (t.winkel != null && !(istZahl(t.winkel) && t.winkel > 90 && t.winkel <= 360)) return false;", "if (t.winkel != null && !istZahl(t.winkel)) return false;"],
  ['W39 Einpassen und Füllen vertauscht', "if ((modus === 'fuellen') === (aspekt >= aw / ah)) { h = ah; w = ah * aspekt; } else { w = aw; h = aw / aspekt; }", "if ((modus !== 'fuellen') === (aspekt >= aw / ah)) { h = ah; w = ah * aspekt; } else { w = aw; h = aw / aspekt; }"],
  ['W40 Kontrastanalyse zählt durchsichtige Pixel mit', "if (a < 0.2) continue;", ""],
  ['W41 qd bleibt auch dann stehen, wenn es die 255 Zeichen sprengt (Kauf abgelehnt)', "if (mit.length <= POD_KARTE_MAX || text.length > POD_KARTE_MAX) text = mit;", "text = mit;"],
  ['W42 qd entfällt immer', "if (mit.length <= POD_KARTE_MAX || text.length > POD_KARTE_MAX) text = mit;", "if (false) text = mit;"],
  // ── Korrekturrunde 06.11.2026: Fristen, farbfeste Vorlagen, Tasse ohne Spiegel, kleine Funde, Lücken der Gegenleser ──
  ['W43 Kauf wartet beliebig lange auf die Vorschau (keine Frist)', "var kaufFrist = Math.min(VORSCHAU_KAUF_MS, vorschauZeit);", "var kaufFrist = 600000;"],
  ['W44 Attribut data-vorschau-zeit wird ignoriert', "var vorschauZeit = attrVZeit && Number(attrVZeit) > 0 ? Number(attrVZeit) : VORSCHAU_ZEIT_MS;", "var vorschauZeit = VORSCHAU_ZEIT_MS;"],
  ['W45 «Vorschau wird erstellt …» wird nie gezeigt', "if (nr === pvNr && st.sicht === 'produkt') ui.pvLaed.hidden = false; }, 250);", "if (nr === pvNr && st.sicht === 'produkt') ui.pvLaed.hidden = true; }, 250);"],
  ['W46 farbfeste Platzierung zeigt eine Vorschau in der falschen Farbe', "if (m.farbfest.indexOf(p.id) >= 0) return { art: 'hinweis', code: 'farbfest' };", ""],
  ['W47 Modell «keine» mit Grund «farbfest» zeigt den allgemeinen Hinweis', "m.grund === 'stickerei' || m.grund === 'rundum' || m.grund === 'farbfest' ? m.grund : 'keine'", "m.grund === 'stickerei' || m.grund === 'rundum' ? m.grund : 'keine'"],
  ['W48 Tasse ohne gespiegeltes Foto springt still zurück (kein Hinweis)', "if (m.adapter === 'tasse') { var pv = pvVariante(); var t = pv != null ? m.tasse[String(pv)] : null; if (!t || !t.foto) return { art: 'hinweis', code: 'keine' }; }", ""],
  ['W50 gesperrter Kauf sieht aus wie freier Kauf', "'.lsp6-cta[aria-disabled=\"true\"]{background:#6b6a72;cursor:not-allowed}',", ""],
  ['W51 Sperren beim Bauen setzt die Deckkraft fest (überdeckt später die Optik der Sperre)', "ui.cta.disabled = an; ui.cta.style.opacity = an ? '0.7' : '';", "ui.cta.disabled = an; ui.cta.style.opacity = an ? '0.7' : '1';"],
  ['W52 Kaufsperre wird nach Variantenwechsel ohne gewählte Ebene nicht aufgefrischt', "qualitaetPruefen();   // die Kaufsperre gilt für ALLE Fotos der neuen Ausführung (auch ohne gewählte Ebene)", ""],
  ['W53 Design-Leinwand der Produktansicht bleibt liegen', "leinwandFreigeben(r.dcv);   // die Design-Leinwand wird nur für den Kontrast-Hinweis gebraucht", ""],
  ['W54 Mini-Leinwand des Kontrast-Hinweises bleibt liegen', "leinwandFreigeben(klein);   // iOS-Safari hat eine Obergrenze für den Speicher aller Zeichenflächen: nicht liegen lassen", ""],
  ['W55 Export gibt die Design-Leinwand nicht frei', "leinwandFreigeben(r && r.dcv);\n        if (!r.ok) { leinwandFreigeben(cv); return null; }", "if (!r.ok) { leinwandFreigeben(cv); return null; }"],
  ['W56 Tasse: nur sechs Scheiben statt 48 (kantiger Zylinder)', "var SCHEIBEN = 48;", "var SCHEIBEN = 6;"],
  ['W57 Tasse: Winkel der Druckbreite fest 270 Grad statt der Eichung', "var winkel = (t.winkel || 330) * Math.PI / 180;", "var winkel = 270 * Math.PI / 180;"],
  ['W58 Kontrast: Anteil für den Hinweis nur 30 %', "var KONTRAST_ANTEIL = 0.6;", "var KONTRAST_ANTEIL = 0.3;"],
  ['W59 Kontrast: Schwelle des Verhältnisses nur 1,2', "var KONTRAST_SCHWELLE = 1.8;", "var KONTRAST_SCHWELLE = 1.2;"],
  ['W60 Export: nur eine JPEG-Qualität (0,85), kein Absenken', "var VORSCHAU_QUALITAET = [0.85, 0.72, 0.6, 0.48];", "var VORSCHAU_QUALITAET = [0.85];"],
  ['W61 Export: Gewichtsgrenze 800 KB statt 80 KB', "var VORSCHAU_MAX_BYTES = 80 * 1024;", "var VORSCHAU_MAX_BYTES = 800 * 1024;"],
  ['W62 Export: 1600 statt 800 Pixel', "var VORSCHAU_PX = 800;", "var VORSCHAU_PX = 1600;"],
  ['W63 Tasse: Katalogfoto ohne CORS wird trotzdem geladen (kein Spiegel nötig)', "return Promise.all([vorschauBild(t.foto), designLeinwand(p, offW, offH)]).then(function (a) {", "return Promise.all([vorschauBild(t.foto || t.quelle), designLeinwand(p, offW, offH)]).then(function (a) {"],
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

// Mutanten des Vorschaubauers (nur unit_test.mjs, V6_VORSCHAUBAUER zeigt auf die Kopie)
const VB_MUTANTEN = [
  ['V01 Raster- und Fremdbilder landen in «bilder»', "if (typeof url !== 'string' || bildArt(url) !== 'foto' || url in bilder) return;", "if (typeof url !== 'string' || url in bilder) return;"],
  ['V02 Dateiname ohne ?v= (Printful ändert das Bild, der Name bleibt)', "createHash('sha1').update(String(url))", "createHash('sha1').update(new URL(url).pathname)"],
  ['V03 Spiegel-Adresse ohne https wird eingebacken', "bilder[url] = typeof spiegel[name] === 'string' && /^https:\\/\\//i.test(spiegel[name]) ? spiegel[name] : null;", "bilder[url] = typeof spiegel[name] === 'string' ? spiegel[name] : null;"],
  ['V04 Rundum-Druck bekommt eine Vorschau', "if (technisch === 'PANEL') { adapter = 'keine'; grund = 'rundum'; }", "if (false) { adapter = 'keine'; grund = 'rundum'; }"],
  ['V05 Poster und Leinwand ohne Papier-Adapter', "else if (PAPIER_TYPEN.includes(k.typ)) { adapter = 'papier'; }", "else if (false) { adapter = 'papier'; }"],
  ['V06 Unbekannte Option wird still überhört (auch --live)', "else throw new Error(`unbekannte Option ${k} (dieses Werkzeug hat nur den Trockenlauf; Hochladen macht der Hauptlauf)`);", "else { /* überhört */ }"],
  ['V07 Dateiplan nicht nach Dateiname sortiert', "const dateien = [...nach.values()].sort((a, b) => a.dateiname.localeCompare(b.dateiname));", "const dateien = [...nach.values()];"],
  ['V08 Fehlende Katalogdatei wird nicht gemeldet', "if (!datei) { fehler.push(`Modell ${id}: Katalogdatei fehlt`); continue; }", ""],
  ['V09 Vorlage hinter dem Druck wird nicht gemerkt', "tw: vl.vorlageBreite, th: vl.vorlageHoehe, fl: vl.flaecheLinks, fo: vl.flaecheOben, fb: vl.flaecheBreite, fh: vl.flaecheHoehe, vorne: vl.vorderansicht !== false,", "tw: vl.vorlageBreite, th: vl.vorlageHoehe, fl: vl.flaecheLinks, fo: vl.flaecheOben, fb: vl.flaecheBreite, fh: vl.flaecheHoehe, vorne: true,"],
  ['V10 Druckfläche links und oben vertauscht', "fl: vl.flaecheLinks, fo: vl.flaecheOben,", "fl: vl.flaecheOben, fo: vl.flaecheLinks,"],
  ['V11 Tasse ohne Eichung jeder Variante wird trotzdem «tasse»', "const alleGeeicht = vs.length > 0 && vs.every((id) => TASSEN_EICHUNG[id] && typeof bild.get(id) === 'string');", "const alleGeeicht = true;"],
  ['V12 Tassen-Radius der 11-oz-Tasse verstellt', "1320: Object.freeze({ fotoBreite: 700, fotoHoehe: 1000, mitteX: 407, radius: 194,", "1320: Object.freeze({ fotoBreite: 700, fotoHoehe: 1000, mitteX: 407, radius: 204,"],
  ['V13 Bündel mit fehlendem Modell wird trotzdem geschrieben', "else dateien[`buendel-${name}.vorschau.json`] = vorschauDatei(teile, stand);", "dateien[`buendel-${name}.vorschau.json`] = vorschauDatei(teile, stand);"],
  ['V14 Schema 2 statt 1 in den Dateien', "export const SCHEMA = 1;", "export const SCHEMA = 2;"],
  ['V15 farbfest auch bei nur einer Stofffarbe', "const fest = mitFoto && !p.vorlage.hintergrundUrl && !p.vorlage.hintergrundFarbe && farben > 1;", "const fest = mitFoto && !p.vorlage.hintergrundUrl && !p.vorlage.hintergrundFarbe;"],
  ['V16 farbfeste Platzierungen werden nicht gemeldet', "if (fest) farbfest.push(p.id);\n    else {", "if (fest) { /* nicht gemeldet */ }\n    else {"],
  ['V17 Modell mit nur farbfesten Platzierungen bleibt «flach»', "if (fotoPlatzierungen.length > 0 && fotoPlatzierungen.every((id) => farbfest.includes(id))) { adapter = 'keine'; grund = 'farbfest'; }", ""],
  ['V18 Bilder farbfester Platzierungen kommen in den Spiegelplan', "if (fest) farbfest.push(p.id);\n    else {", "if (fest) farbfest.push(p.id);\n    {"],
  ['V19 Bilder von Modellen ohne Vorschau bleiben im Plan', "if (adapter === 'keine') { for (const u of Object.keys(bilder)) delete bilder[u];", "if (false) { for (const u of Object.keys(bilder)) delete bilder[u];"],
  ['V20 Farben werden nach dem Namen gezählt (Düfte der Kerze zählen als Farben)', "const c = String(v.color_code ?? '').trim().toLowerCase();", "const c = String(v.color_code ?? v.color ?? '').trim().toLowerCase();"],
  ['V21 Stickerei-Platzierungen zählen als farbfest', "const mitFoto = bildArt(p.vorlage?.bildUrl) === 'foto' && p.technik !== 'EMBROIDERY' && !/^embroidery/.test(p.id);", "const mitFoto = bildArt(p.vorlage?.bildUrl) === 'foto';"],
  ['V22 Katalogordner: die letzte Datei gewinnt statt der ersten', "const datei = ordner.map((o) => join(o, `${id}.json`)).find((d) => existsSync(d));", "const datei = ordner.map((o) => join(o, `${id}.json`)).filter((d) => existsSync(d)).pop();"],
];

const nur = process.argv[2] || '';
const original = readFileSync(V6_DATEI, 'utf8');
const originalKb = readFileSync(KARTENBAUER, 'utf8');
const originalVb = readFileSync(VORSCHAUBAUER, 'utf8');
const node = process.execPath;

if (nur === '--muster') {
  let schlecht = 0;
  const zaehle = (q, alt) => [].concat(alt).map((a) => q.split(a).length - 1);
  for (const [name, alt] of MUTANTEN) { const c = zaehle(original, alt); if (c.some((x) => x !== 1)) { schlecht++; console.log(`?  ${name}: Muster ${c.join('/')}× gefunden`); } }
  for (const [name, alt] of KB_MUTANTEN) { const c = zaehle(originalKb, alt); if (c.some((x) => x !== 1)) { schlecht++; console.log(`?  ${name}: Muster ${c.join('/')}× gefunden`); } }
  for (const [name, alt] of VB_MUTANTEN) { const c = zaehle(originalVb, alt); if (c.some((x) => x !== 1)) { schlecht++; console.log(`?  ${name}: Muster ${c.join('/')}× gefunden`); } }
  console.log(`${MUTANTEN.length + KB_MUTANTEN.length + VB_MUTANTEN.length} Muster geprüft, ${schlecht} nicht anwendbar`);
  process.exit(schlecht ? 1 : 0);
}

const ordner = mkdtempSync(join(tmpdir(), 'v6-mutation-'));
/** Einen Testlauf starten. Gibt { code, signal, zeit, aus } zurück: zeit = vom Zeitlimit beendet, aus = Ausgabe (gekürzt). */
function lauf(datei, args, env) {
  return new Promise((ok) => {
    const k = spawn(node, [join(hier, datei), ...args], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let aus = '';
    const sammeln = (d) => { if (aus.length < 40000) aus += d; };
    k.stdout.on('data', sammeln); k.stderr.on('data', sammeln);
    let zeit = false;
    const t = setTimeout(() => { zeit = true; k.kill('SIGKILL'); }, 300000);
    k.on('close', (code, signal) => { clearTimeout(t); ok({ code, signal, zeit, aus }); });
  });
}
/** Erste fehlgeschlagene Prüfung (Zeile mit ✗) für die Anzeige. */
const ersterFehler = (aus) => ((aus.split('\n').find((z) => /✗/.test(z)) || aus.trim().split('\n').slice(-1)[0] || '').trim().slice(0, 150));
const gescheitert = (r) => r.code !== 0 && !r.zeit && r.signal === null;
const aufgaben = [];
MUTANTEN.forEach(([name, alt, neu], i) => aufgaben.push({ name, art: 'editor', alt, neu, i }));
KB_MUTANTEN.forEach(([name, alt, neu], i) => aufgaben.push({ name, art: 'kartenbauer', alt, neu, i: 100 + i }));
VB_MUTANTEN.forEach(([name, alt, neu], i) => aufgaben.push({ name, art: 'vorschaubauer', alt, neu, i: 200 + i }));
const gewaehlt = aufgaben.filter((a) => !nur || a.name.startsWith(nur) || (nur === 'K' && a.art === 'kartenbauer') || (nur === 'V' && a.art === 'vorschaubauer'));
const ergebnis = { erkannt: 0, ueberlebt: [], unanwendbar: [], ungeklaert: [] };
let naechster = 0;
// Ausgangslage: die benutzten Stufen auf dem UNVERÄNDERTEN Code müssen grün sein, sonst ist jedes «erkannt» wertlos
{
  const stufen = [['unit_test.mjs', []]];
  if (gewaehlt.some((a) => a.art === 'editor')) stufen.push(['vorschau_test.mjs', ['kern']], ['editor_test.mjs', ['kern']]);
  for (const [datei, args] of stufen) {
    const r = await lauf(datei, args, {});
    if (r.code !== 0) { console.log(`ABBRUCH: Ausgangslage ist rot: ${datei} ${args.join(' ')} endet mit ${r.zeit ? 'Zeitüberschreitung' : 'Exit ' + r.code}. Erste Meldung: ${ersterFehler(r.aus)}`); rmSync(ordner, { recursive: true, force: true }); process.exit(3); }
    console.log(`Ausgangslage grün: ${datei} ${args.join(' ')}`.trim());
  }
}
async function arbeiter() {
  while (naechster < gewaehlt.length) {
    const a = gewaehlt[naechster++];
    let mutiert = a.art === 'editor' ? original : a.art === 'kartenbauer' ? originalKb : originalVb;
    const alte = [].concat(a.alt), neue = [].concat(a.neu);
    let schlecht = null;
    alte.forEach((muster, j) => {
      const teile = mutiert.split(muster);
      if (teile.length !== 2) schlecht = `${teile.length - 1}×`;
      else mutiert = teile.join(neue[j]);
    });
    if (schlecht) { ergebnis.unanwendbar.push(`${a.name} (Muster ${schlecht} gefunden)`); console.log(`?  ${a.name}: Muster nicht genau einmal gefunden (${schlecht})`); continue; }
    const pruefeSyntax = (datei) => { const x = spawnSync(node, ['--check', datei], { encoding: 'utf8' }); return x.status === 0 ? null : (x.stderr || '').split('\n').find((z) => /Error/.test(z)) || 'Syntaxfehler'; };
    // Ergebnis einer Stufe: true = erkannt (weiter zum nächsten Mutanten), 'zeit' = ungeklärt, false = nicht erkannt (nächste Stufe)
    const stufe = async (name, datei, args, umg) => {
      const r = await lauf(datei, args, umg);
      if (r.zeit) { ergebnis.ungeklaert.push(`${a.name} (${name}: Zeitüberschreitung)`); console.log(`?  ${a.name}: ${name} nach 300 s abgebrochen, ungeklärt`); return 'zeit'; }
      if (gescheitert(r)) { ergebnis.erkannt++; console.log(`✓ ${a.name}: erkannt durch ${name}: ${ersterFehler(r.aus)}`); return true; }
      return false;
    };
    let ergebnisStufe = false;
    if (a.art === 'editor') {
      const datei = join(ordner, `mutant-${a.i}.js`);
      writeFileSync(datei, mutiert);
      const fehlerSyntax = pruefeSyntax(datei);
      if (fehlerSyntax) { ergebnis.unanwendbar.push(`${a.name} (Syntaxfehler: ${fehlerSyntax})`); console.log(`?  ${a.name}: Mutant ist kein gültiger Code (${fehlerSyntax})`); continue; }
      const umg = { V6_DATEI: datei };
      for (const [name, f, args] of [['unit_test', 'unit_test.mjs', []], ['vorschau_test', 'vorschau_test.mjs', ['kern']], ['editor_test', 'editor_test.mjs', ['kern']]]) {
        ergebnisStufe = await stufe(name, f, args, umg);
        if (ergebnisStufe) break;
      }
    } else if (a.art === 'vorschaubauer') {
      // Der Bauer importiert relativ zu seinem Ort: die Pfade der Kopie zeigen auf die echten Dateien
      const fix = mutiert.replaceAll("'../../../dropship/", `'${pathToFileURL(join(hier, '..', '..', '..', 'dropship')).href}/`);
      const datei = join(ordner, `vorschaubauer-${a.i}.mjs`);
      writeFileSync(datei, fix);
      const fehlerSyntax = pruefeSyntax(datei);
      if (fehlerSyntax) { ergebnis.unanwendbar.push(`${a.name} (Syntaxfehler: ${fehlerSyntax})`); console.log(`?  ${a.name}: Mutant ist kein gültiger Code (${fehlerSyntax})`); continue; }
      ergebnisStufe = await stufe('unit_test', 'unit_test.mjs', [], { V6_VORSCHAUBAUER: datei });
    } else {
      // Der Kartenbauer importiert relativ zu seinem Ort: die Pfade der Kopie zeigen auf die echten Dateien
      const fix = mutiert.replaceAll("'../../../dropship/", `'${pathToFileURL(join(hier, '..', '..', '..', 'dropship')).href}/`);
      const datei = join(ordner, `kartenbauer-${a.i}.mjs`);
      writeFileSync(datei, fix);
      const fehlerSyntax = pruefeSyntax(datei);
      if (fehlerSyntax) { ergebnis.unanwendbar.push(`${a.name} (Syntaxfehler: ${fehlerSyntax})`); console.log(`?  ${a.name}: Mutant ist kein gültiger Code (${fehlerSyntax})`); continue; }
      ergebnisStufe = await stufe('unit_test', 'unit_test.mjs', [], { V6_KARTENBAUER: datei });
    }
    if (ergebnisStufe === true || ergebnisStufe === 'zeit') continue;
    ergebnis.ueberlebt.push(a.name); console.log(`✗ ${a.name}: ÜBERLEBT`);
  }
}
await Promise.all(Array.from({ length: Math.max(1, Number(process.env.PARALLEL) || 3) }, arbeiter));
rmSync(ordner, { recursive: true, force: true });
console.log(`\n${ergebnis.erkannt} erkannt, ${ergebnis.ueberlebt.length} überlebt, ${ergebnis.unanwendbar.length} nicht anwendbar, ${ergebnis.ungeklaert.length} ungeklärt (von ${gewaehlt.length})`);
if (ergebnis.ueberlebt.length) console.log('Überlebt:\n  ' + ergebnis.ueberlebt.join('\n  '));
if (ergebnis.unanwendbar.length) console.log('Nicht anwendbar:\n  ' + ergebnis.unanwendbar.join('\n  '));
if (ergebnis.ungeklaert.length) console.log('Ungeklärt (Zeitüberschreitung, zählt nicht als erkannt):\n  ' + ergebnis.ungeklaert.join('\n  '));
process.exit(ergebnis.ueberlebt.length || ergebnis.unanwendbar.length || ergebnis.ungeklaert.length ? 1 : 0);
