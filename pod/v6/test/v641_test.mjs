/**
 * Browser-Tests (Playwright, Chromium) für das Delta von Editor 6.4.1 gegenüber 6.4.0 (09.11.2026):
 *   (a) Standard-Textfarbe nach dem Stoff (weiss oder #111111), Text folgt dem Wechsel der Ausführung, eine gewählte Farbe nie; Rückgängig, Entwurf, Bündel
 *   (b) Kontrast-Hinweis auch in «Bearbeiten» und «Druckversion» (gerechnet aus dem Design gegen den Stoff, ohne die Vorschau zu zeichnen)
 *   (c) Handy 390 × 844: «Text | Sticker | Bild» (und die Stickerauswahl) stehen direkt unter der Bühne
 *   (d) weisse Schrift ohne Schatten (Konstante WEISS_SCHATTEN) in Druckdatei, Vorschau und Bühne
 *   (e) Beschriftung der Druckfläche im Rahmen, tabpanel an der Vorschau, Pfeile/Entf auf den Platzierungs-Reitern, Schieberwerte nach Zahleneingabe
 *   «kaufvergleich»: Druckdatei (PNG-Bytes), Warenkorb-Eigenschaften, _pod_karte und _vorschau (JPEG-Bytes) sind in allen Ansichten und über mehrere Ausführungen BYTEGLEICH zu 6.4.0 (der Referenz, über
 *   editor=ref auf derselben Attrappenseite), AUSSER in den zwei GEWOLLTEN Fällen: Standardfarbe auf dunklem Stoff und weisse Schrift (Schatten).
 * Aufruf: node v641_test.mjs [Teil]   (Teil: Name oder Anfang eines Szenarios; ohne Angabe alle)
 * Umgebung: V6_DATEI (Vorgabe 6.4.1; gegen 6.4.0 laufen die Prüfungen des Deltas ROT, das ist der Beleg, dass sie etwas messen), V6_REF_DATEI (Referenz des Kaufvergleichs, hier fest 6.4.0).
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const v6 = join(dirname(fileURLToPath(import.meta.url)), '..');
process.env.V6_REF_DATEI = process.env.V6_REF_DATEI || join(v6, 'lspod-designer-v6-6.4.0.js');   // vor dem Import von lib.mjs: dort wird die Umgebung gelesen
const { playwright, starteServer, seiteOeffnen, editorBereit, geisterPng, pngAusKoerper, V6_DATEI, V6_REF_DATEI } = await import('./lib.mjs');
const { chromium } = playwright();
let n = 0; const fehler = [];
function pruefe(name, ok, detail = '') { n++; if (!ok) { fehler.push(`${name} ${detail}`); console.log(`  ✗ ${name} ${detail}`); if (process.env.V6_ABBRUCH) process.exit(1); } }
const nur = process.argv[2] || '';
const szenarien = [];
function szenario(name, kern, fn) { szenarien.push({ name, kern, fn }); }
const quelle = readFileSync(V6_DATEI, 'utf8');
const IST_641 = /var VERSION = '6\.(4\.[1-9]|[5-9])/.test(quelle);

const PC = { breite: 1440, hoehe: 900 };
const MOBIL = { breite: 390, hoehe: 844, mobil: true };
const GEISTER = { printfulBild: (u) => (/\/m\//.test(u) ? { typ: 'image/png', body: geisterPng() } : null) };
const T71 = 'karte=71&shop=1001:4012,1002:4020,1003:4045&vorschau=71&bearbeiten=1&themeregel=1&varianten=1001:Weiss,1002:Schwarz,1003:Pink';
const T19 = 'karte=19&shop=1001:1320,1002:4830,1003:16586&vorschau=19&bearbeiten=1&themeregel=1';
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function oeffnen(b, srv, query, opt = {}) {
  const s = await seiteOeffnen(b, srv.url, { ...PC, ...GEISTER, ...opt, query });
  await editorBereit(s.page);
  return s;
}
const sichtWarten = (p) => p.waitForSelector('[data-feld="sicht"]:not([hidden])', { timeout: 10000 });
const ed = (p, f, ...a) => p.evaluate(new Function('a', `const ed = window.LSPOD6.editors[0]; return (${f})(ed, ...a);`), a);
const textHinzufuegen = async (p, text) => { await p.getByRole('button', { name: '➕ Text' }).click(); await p.locator('.lsp6-text').fill(text); };
const feldEingabe = (p, name) => p.locator('.lsp6-field', { hasText: name }).locator('input');
async function feldSetzen(p, name, wert) { const f = feldEingabe(p, name); await f.fill(String(wert)); await f.press('Tab'); }
async function variante(p, wert) {   // Auswahl im Formular der Attrappe wie im Theme (Radio mit name="id"); wartet, bis der Editor die Ausführung übernommen hat
  await p.locator(`input[name="id"][value="${wert}"]`).check();
  const pv = { 1001: 4012, 1002: 4020, 1003: 4045 }[wert];
  if (pv) await p.waitForFunction((x) => window.LSPOD6.editors[0].st.pfVariante === x, pv, { timeout: 5000 });
  await p.waitForTimeout(80);
}
const textEbenen = (p) => ed(p, `(ed) => Object.values(ed.st.ebenen).flat().filter((e) => e.type === 'text').map((e) => ({ id: e.id, text: e.text, color: e.color, auto: e.farbeAuto === true }))`);
const buehnenFarbe = (p) => p.evaluate(() => [...document.querySelectorAll('.lsp6-layer > div')].map((c) => getComputedStyle(c).color));
/** Bild als Motiv: ein einfarbiges Quadrat (Daten-URL). */
const motivHinzu = (p, farbe = '#2040c0', gemeldet = 200) => p.evaluate(([f, g]) => {   // gemeldet: die Originalgrösse, die der Editor für das Qualitätstor annimmt (das Bild selbst hat 200 px)
  const cv = document.createElement('canvas'); cv.width = 200; cv.height = 200;
  const c = cv.getContext('2d'); c.fillStyle = f; c.fillRect(0, 0, 200, 200);
  return window.LSPOD6.editors[0].neuesBild(cv.toDataURL('image/png'), g, g).id;
}, [farbe, gemeldet]);
const bilderGeladen = (p) => p.waitForFunction(() => [...document.querySelectorAll('.lsp6-layer img, .lsp6-tpl, .lsp6-bg')].every((i) => i.hidden || (i.complete && i.naturalWidth > 0)), null, { timeout: 15000 });
const kein = (s) => s.fehler.length === 0;

// Eigene Rechnung (nicht die des Editors): welche Standardfarbe verlangt ein Stoff?
const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const kon = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const erwarteFarbe = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return kon(1, lum(r, g, b)) > kon(lum(17, 17, 17), lum(r, g, b)) ? '#ffffff' : '#111111'; };

// ── (a) Standard-Textfarbe ──────────────────────────────────────────────────────────────────────
szenario('textfarbe', true, async (b, srv) => {
  const s = await oeffnen(b, srv, T71);
  const p = s.page;
  await sichtWarten(p);
  const hex = await ed(p, '(ed) => ({ w: ed.karte.farbeVon[4012], s: ed.karte.farbeVon[4020], p: ed.karte.farbeVon[4045] })');
  pruefe('Testkarte: die drei Ausführungen haben Stofffarben (weiss, schwarz, pink)', !!hex.w && !!hex.s && !!hex.p, JSON.stringify(hex));
  pruefe('Rechnung: schwarzer Stoff verlangt weisse Schrift, weisser Stoff dunkle', erwarteFarbe(hex.s) === '#ffffff' && erwarteFarbe(hex.w) === '#111111', JSON.stringify(hex));
  // 1. weisser Stoff: ein neuer Text startet dunkel
  await textHinzufuegen(p, 'Eins');
  let t = await textEbenen(p);
  pruefe('weisser Stoff: neuer Text startet #111111 und trägt farbeAuto', t.length === 1 && t[0].color === '#111111' && t[0].auto, JSON.stringify(t));
  // 2. Wechsel auf schwarz: der Text folgt (Zustand, Bühne, Farbwahl)
  await variante(p, 1002);
  t = await textEbenen(p);
  pruefe('Wechsel auf schwarzen Stoff: der Standardtext wird weiss', t[0].color === '#ffffff' && t[0].auto, JSON.stringify(t));
  pruefe('die Bühne zeichnet den Text weiss', (await buehnenFarbe(p))[0] === 'rgb(255, 255, 255)', JSON.stringify(await buehnenFarbe(p)));
  pruefe('die Farbwahl der gewählten Ebene zeigt Weiss (Haken)', (await p.locator('.lsp6-sw[data-c="#ffffff"]').innerText()) === '✓' && (await p.locator('.lsp6-sw[data-c="#111111"]').innerText()) === '', await p.locator('.lsp6-sw[data-c="#ffffff"]').innerText());
  // 3. ein zweiter Text auf schwarzem Stoff startet gleich weiss
  await textHinzufuegen(p, 'Zwei');
  t = await textEbenen(p);
  pruefe('schwarzer Stoff: ein NEUER Text startet weiss', t.length === 2 && t[1].color === '#ffffff' && t[1].auto, JSON.stringify(t));
  // 4. Wechsel auf pink: Farbe nach der eigenen Rechnung
  await variante(p, 1003);
  t = await textEbenen(p);
  pruefe(`pinker Stoff (${hex.p}): beide Standardtexte haben die Farbe der eigenen Rechnung (${erwarteFarbe(hex.p)})`, t.every((x) => x.color === erwarteFarbe(hex.p)), JSON.stringify(t));
  // 5. gewählte Farbe wird nie überschrieben: Text 1 bekommt Rot, Text 2 genau #111111 (derselbe Wert wie der Standard, aber gewählt)
  await ed(p, `(ed, id) => ed.waehlen(id)`, t[0].id);
  await p.locator('.lsp6-sw[data-c="#b3122b"]').click();
  await ed(p, `(ed, id) => ed.waehlen(id)`, t[1].id);
  await variante(p, 1001);
  await p.locator('.lsp6-sw[data-c="#111111"]').click();
  t = await textEbenen(p);
  pruefe('gewählte Farben tragen kein farbeAuto mehr', t.every((x) => !x.auto) && t[0].color === '#b3122b' && t[1].color === '#111111', JSON.stringify(t));
  for (const v of [1002, 1003, 1001, 1002]) {
    await variante(p, v);
    t = await textEbenen(p);
    pruefe(`Ausführung ${v}: gewählte Farben bleiben (Rot und das gewählte #111111 auch auf dunklem Stoff)`, t[0].color === '#b3122b' && t[1].color === '#111111' && t.every((x) => !x.auto), JSON.stringify(t));
  }
  // 6. die Farbwahl über das Farbfeld (input type=color) zählt ebenfalls als Wahl
  await textHinzufuegen(p, 'Drei');
  t = await textEbenen(p);
  pruefe('schwarzer Stoff: dritter Text startet weiss (Auto)', t[2].color === '#ffffff' && t[2].auto, JSON.stringify(t[2]));
  await p.locator('input[type="color"][title]').first().evaluate((i) => { i.value = '#ffffff'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await variante(p, 1001);
  t = await textEbenen(p);
  pruefe('Farbfeld: eine gewählte weisse Farbe bleibt auch auf weissem Stoff weiss', t[2].color === '#ffffff' && !t[2].auto, JSON.stringify(t[2]));
  pruefe('keine Seitenfehler', kein(s), s.fehler.join(' | '));
  await s.schliessen();
});

szenario('textfarbe-rueckgaengig', true, async (b, srv) => {
  // Rückgängig kann einen Stand aus einer anderen Ausführung bringen: die Standardfarbe passt sich an, eine gewählte nicht
  const s = await oeffnen(b, srv, T71);
  const p = s.page;
  await sichtWarten(p);
  await textHinzufuegen(p, 'Alpha');                       // Stand 1: Auto, dunkel, weisser Stoff
  await variante(p, 1002);                                  // Text wird weiss (kein neuer Verlaufsstand)
  await textHinzufuegen(p, 'Beta');                         // Stand 2
  await ed(p, '(ed) => ed.speichern()');                    // den Verlauf ausdrücklich sichern (sonst täte es erst der Zeitgeber nach 700 ms)
  let t = await textEbenen(p);
  pruefe('Ausgangslage: beide Texte weiss auf schwarzem Stoff', t.length === 2 && t.every((x) => x.color === '#ffffff'), JSON.stringify(t));
  // zurück bis zum Stand mit nur einem Text: das ist der Stand von der WEISSEN Ausführung (Alpha dunkel gespeichert); nach dem Wiederherstellen muss Alpha auf schwarzem Stoff weiss sein
  for (let i = 0; i < 5; i++) { t = await textEbenen(p); if (t.length === 1) break; await ed(p, '(ed) => ed.zurueck()'); }
  t = await textEbenen(p);
  const stand = await ed(p, '(ed) => ed.st.ebenen[ed.st.aktiv].length');
  pruefe('Rückgängig bis zum Stand mit einem Text: Alpha ist WEISS (der ältere Stand hielt es noch dunkel)', t.length === 1 && t[0].text === 'Alpha' && t[0].color === '#ffffff' && t[0].auto && stand === 1, JSON.stringify(t));
  pruefe('die Bühne zeichnet Alpha weiss', (await buehnenFarbe(p))[0] === 'rgb(255, 255, 255)', JSON.stringify(await buehnenFarbe(p)));
  for (let i = 0; i < 5; i++) { t = await textEbenen(p); if (t.length === 2) break; await ed(p, '(ed) => ed.wiederholen()'); }
  t = await textEbenen(p);
  pruefe('Wiederholen: beide Texte weiss auf schwarzem Stoff', t.length === 2 && t.every((x) => x.color === '#ffffff'), JSON.stringify(t));
  // gewählte Farbe im älteren Stand bleibt
  await ed(p, '(ed) => ed.waehlen(ed.st.ebenen[ed.st.aktiv][0].id)');
  await p.locator('.lsp6-sw[data-c="#111111"]').click();
  await ed(p, '(ed) => ed.speichern()');
  await textHinzufuegen(p, 'Gamma');
  await ed(p, '(ed) => ed.speichern()');
  await ed(p, '(ed) => ed.zurueck()');
  t = await textEbenen(p);
  pruefe('Rückgängig: eine gewählte Farbe (#111111 auf schwarzem Stoff) wird nicht angefasst', t.length >= 1 && t.find((x) => x.text === 'Alpha').color === '#111111' && !t.find((x) => x.text === 'Alpha').auto, JSON.stringify(t));
  pruefe('keine Seitenfehler', kein(s), s.fehler.join(' | '));
  await s.schliessen();
});

szenario('textfarbe-entwurf', true, async (b, srv) => {
  // Entwurf: farbeAuto wird gespeichert; ein Entwurf aus einer anderen Ausführung passt beim Laden an; ein Entwurf von 6.4.0 (ohne das Feld) gilt als gewählt
  const s = await oeffnen(b, srv, T71);
  const p = s.page;
  await sichtWarten(p);
  await textHinzufuegen(p, 'Entwurf');
  await ed(p, '(ed) => ed.entwurfSofort()');
  const roh = await p.evaluate(() => { const ed = window.LSPOD6.editors[0]; return { key: ed.entwurfKey, wert: window.localStorage.getItem(ed.entwurfKey) }; });
  const d = JSON.parse(roh.wert);
  const text = Object.values(d.ebenen).flat().find((e) => e.type === 'text');
  pruefe('Entwurf speichert farbeAuto und die Farbe', text && text.farbeAuto === true && text.color === '#111111', JSON.stringify(text));
  await s.schliessen();
  const mitEntwurf = async (wert, query) => {
    const init = `(() => { try { window.localStorage.setItem(${JSON.stringify(roh.key)}, ${JSON.stringify(wert)}); } catch (e) {} })();`;
    return oeffnen(b, srv, query, { initSkript: init });
  };
  // gleicher Entwurf, die Seite startet mit der SCHWARZEN Ausführung (erste Auswahl der Attrappe)
  const schwarzZuerst = T71.replace('varianten=1001:Weiss,1002:Schwarz,1003:Pink', 'varianten=1002:Schwarz,1001:Weiss,1003:Pink');
  const s2 = await mitEntwurf(roh.wert, schwarzZuerst);
  await sichtWarten(s2.page);
  await s2.page.waitForFunction(() => window.LSPOD6.editors[0].st.ebenen.front.length === 1, null, { timeout: 5000 });
  let t = await textEbenen(s2.page);
  pruefe('Entwurf aus der weissen Ausführung, Seite startet schwarz: der Standardtext wird beim Laden weiss', t.length === 1 && t[0].color === '#ffffff' && t[0].auto, JSON.stringify(t));
  pruefe('die Bühne zeichnet ihn weiss', (await buehnenFarbe(s2.page))[0] === 'rgb(255, 255, 255)', JSON.stringify(await buehnenFarbe(s2.page)));
  await s2.schliessen();
  // Entwurf ohne farbeAuto (von 6.4.0): bleibt #111111, auch auf schwarzem Stoff
  const alt = JSON.parse(roh.wert); Object.values(alt.ebenen).flat().forEach((e) => { delete e.farbeAuto; });
  const s3 = await mitEntwurf(JSON.stringify(alt), schwarzZuerst);
  await sichtWarten(s3.page);
  await s3.page.waitForFunction(() => window.LSPOD6.editors[0].st.ebenen.front.length === 1, null, { timeout: 5000 });
  t = await textEbenen(s3.page);
  pruefe('Entwurf von 6.4.0 (ohne farbeAuto): die Farbe bleibt #111111 und gilt als gewählt', t.length === 1 && t[0].color === '#111111' && !t[0].auto, JSON.stringify(t));
  await s3.schliessen();
});

szenario('textfarbe-faelle', true, async (b, srv) => {
  // Ohne bekannten Stoff, Tasse (weiss), Bündel mit Modellwechsel, v5-Modus: nichts ändert sich dort, wo der Stoff unbekannt ist
  const s = await oeffnen(b, srv, T19);
  await sichtWarten(s.page);
  await textHinzufuegen(s.page, 'Tasse');
  let t = await textEbenen(s.page);
  pruefe('Tasse (weisser Becher): der Text startet #111111', t[0].color === '#111111' && t[0].auto, JSON.stringify(t));
  await s.schliessen();
  const l = await oeffnen(b, srv, 'modus=legacy6&bearbeiten=0');
  await textHinzufuegen(l.page, 'Rückfall');
  const lc = await l.page.evaluate(() => Object.values(window.LSPOD6.editors[0].st.ebenen).flat().map((e) => ({ color: e.color, auto: e.farbeAuto === true })));
  pruefe('v5-Modus (Rückfall ohne Karte): der Text startet #111111 wie bisher', lc.length === 1 && lc[0].color === '#111111', JSON.stringify(lc));
  await l.schliessen();
  // Kartenbündel (T-Shirt 71 + 586): der Wechsel der Ausführung wechselt das Modell; die Standardfarbe folgt dem neuen Stoff
  const bq = 'karte=buendel&m=71,586&shop=1001:4012:71,1002:4020:71,1003:15124:586&vorschau=71,586&bearbeiten=1&themeregel=1&varianten=1001:Weiss,1002:Schwarz,1003:Modell586';
  const bs = await oeffnen(b, srv, bq);
  await sichtWarten(bs.page);
  await textHinzufuegen(bs.page, 'Bündel');
  const farbe0 = (await textEbenen(bs.page))[0].color;
  await variante(bs.page, 1002);
  const farbe1 = (await textEbenen(bs.page))[0].color;
  await bs.page.locator('input[name="id"][value="1003"]').check();
  await bs.page.waitForFunction(() => window.LSPOD6.editors[0].karte.printfulProductId === 586, null, { timeout: 5000 });
  const hex586 = await bs.page.evaluate(() => { const ed = window.LSPOD6.editors[0]; return ed.karte.farbeVon[ed.st.pfVariante] || null; });
  const farbe2 = (await textEbenen(bs.page))[0].color;
  pruefe('Bündel: weiss → dunkler Text, schwarz → weisser Text', farbe0 === '#111111' && farbe1 === '#ffffff', `${farbe0} ${farbe1}`);
  pruefe(`Bündel nach dem Modellwechsel (Modell 586, Stoff ${hex586}): die Farbe folgt dem Stoff des neuen Modells`, hex586 ? farbe2 === erwarteFarbe(hex586) : farbe2 === '#111111', `${farbe2} ${hex586}`);
  pruefe('keine Seitenfehler', kein(bs), bs.fehler.join(' | '));
  await bs.schliessen();
});

// ── (e) Kleinigkeiten ───────────────────────────────────────────────────────────────────────────
szenario('schieber', true, async (b, srv) => {
  const s = await oeffnen(b, srv, T71);
  const p = s.page;
  await sichtWarten(p);
  await textHinzufuegen(p, 'Schieber');
  const lesen = () => p.evaluate(() => { const ed = window.LSPOD6.editors[0], e = ed.st.ebenen[ed.st.aktiv][0], u = ed.ui; return { scale: e.scale, rot: e.rot, rangeGroesse: Number(u.rangeGroesse.value), rangeDrehen: Number(u.rangeDrehen.value), grad: u.drehenWert.textContent, min: Number(u.rangeGroesse.min), max: Number(u.rangeGroesse.max), step: Number(u.rangeGroesse.step) }; });
  const v0 = await lesen();
  pruefe('Ausgangslage: der Schieber zeigt die Grösse der Ebene', Math.abs(v0.rangeGroesse - v0.scale) <= v0.step / 2 + 1e-9, JSON.stringify(v0));
  await feldSetzen(p, 'Schrifthöhe (mm)', 30);
  const v1 = await lesen();
  pruefe('nach der Eingabe «Schrifthöhe 30 mm» folgt der Grössenschieber (höchstens ein halber Schritt Abstand)', Math.abs(v1.rangeGroesse - v1.scale) <= v1.step / 2 + 1e-9 && Math.abs(v1.scale - v0.scale) > 0.1, JSON.stringify([v0, v1]));
  await feldSetzen(p, 'Drehung °', 35);
  const v2 = await lesen();
  pruefe('nach der Eingabe «Drehung 35°» folgen der Drehschieber und die Gradanzeige', v2.rot === 35 && v2.rangeDrehen === 35 && v2.grad === '35°', JSON.stringify(v2));
  await feldSetzen(p, 'Drehung °', -20);
  const v3 = await lesen();
  pruefe('negative Drehung: Schieber und Anzeige', v3.rangeDrehen === -20 && v3.grad === '-20°', JSON.stringify(v3));
  // Bild: «Breite (cm)»
  const id = await motivHinzu(p); await bilderGeladen(p);
  await feldSetzen(p, 'Breite (cm)', 12);
  const bi = await p.evaluate(() => { const ed = window.LSPOD6.editors[0], e = ed.st.ebenen[ed.st.aktiv].find((x) => x.type === 'image'), u = ed.ui; return { scale: e.scale, range: Number(u.rangeGroesse.value), step: Number(u.rangeGroesse.step) }; });
  pruefe('nach der Eingabe «Breite 12 cm» folgt der Grössenschieber auch bei einem Bild', Math.abs(bi.range - bi.scale) <= bi.step / 2 + 1e-9, JSON.stringify(bi));
  // Gegenrichtung (Schieber → Feld) bleibt wie bisher
  await p.evaluate(() => { const u = window.LSPOD6.editors[0].ui; u.rangeDrehen.value = '50'; u.rangeDrehen.dispatchEvent(new Event('input', { bubbles: true })); });
  const gr = await p.evaluate(() => ({ feld: [...document.querySelectorAll('.lsp6-field')].find((f) => /Drehung/.test(f.textContent)).querySelector('input').value, grad: window.LSPOD6.editors[0].ui.drehenWert.textContent }));
  pruefe('Schieber → Zahlenfeld: Drehung 50° (unverändert)', gr.feld === '50' && gr.grad === '50°', JSON.stringify(gr));
  pruefe('keine Seitenfehler', kein(s), s.fehler.join(' | '));
  await s.schliessen();
});

szenario('tastatur-reiter', true, async (b, srv) => {
  // Pfeile, Entf und Rück auf den Reitern der Platzierungen gehören dem Reiter (6.4.0 hatte es für die Ansicht- und Zoom-Reiter behoben, nicht für diese)
  const s = await oeffnen(b, srv, T71);
  const p = s.page;
  await sichtWarten(p);
  const tabs = await p.locator('.lsp6-tab').count();
  pruefe('Testkarte hat mehrere Platzierungen (Reiter)', tabs >= 2, String(tabs));
  await textHinzufuegen(p, 'Taste');
  await feldSetzen(p, 'X (cm)', 8); await feldSetzen(p, 'Y (cm)', 12);
  const lesen = () => p.evaluate(() => { const ed = window.LSPOD6.editors[0], l = ed.st.ebenen[ed.st.aktiv]; return { anzahl: l.length, cx: l[0] && l[0].cx, cy: l[0] && l[0].cy, aktiv: ed.st.aktiv, sel: ed.st.sel }; });
  const v0 = await lesen();
  const tab = p.locator('.lsp6-tab').first();
  for (const taste of ['ArrowUp', 'ArrowDown', 'Delete', 'Backspace']) {
    await ed(p, '(ed) => ed.waehlen(ed.st.ebenen[ed.st.aktiv][0] && ed.st.ebenen[ed.st.aktiv][0].id)');
    await tab.focus();
    await tab.press(taste);
    const v = await lesen();
    pruefe(`Fokus auf dem Reiter der Platzierung, ${taste}: die Ebene bleibt (Anzahl, Lage)`, v.anzahl === v0.anzahl && v.cx === v0.cx && v.cy === v0.cy, JSON.stringify([v0, v]));
  }
  // Pfeil nach rechts/links wechselt die Platzierung (Reiter-Muster) und verschiebt nichts
  await ed(p, '(ed) => ed.wechseln(ed.platzierungIds()[0])');
  await ed(p, '(ed) => ed.waehlen(ed.st.ebenen[ed.st.aktiv][0].id)');
  await tab.focus();
  await tab.press('ArrowRight');
  await ed(p, '(ed) => ed.wechseln(ed.platzierungIds()[0])');
  const nach = await lesen();
  pruefe('Reiter: Pfeil nach rechts wechselt nur die Platzierung, die Ebene der ersten bleibt unverschoben', nach.cx === v0.cx && nach.cy === v0.cy && nach.anzahl === v0.anzahl, JSON.stringify([v0, nach]));
  // Gegenprobe: die Tastenkürzel gelten weiter, wo der Fokus auf einem gewöhnlichen Knopf liegt (Bestand von v5, bewusst nicht geändert)
  await ed(p, '(ed) => ed.waehlen(ed.st.ebenen[ed.st.aktiv][0].id)');
  await p.locator('.lsp6-btn', { hasText: 'Rückgängig' }).focus();
  await p.keyboard.press('ArrowRight');
  const knopf = await lesen();
  pruefe('Gegenprobe: Pfeil auf einem gewöhnlichen Knopf (Rückgängig) verschiebt die gewählte Ebene weiter (Verhalten von v5)', knopf.cx > nach.cx, JSON.stringify([nach, knopf]));
  // die Reiter der Ansicht und des Zooms bleiben geschützt (Bestand von 6.4.0)
  await ed(p, '(ed) => ed.waehlen(ed.st.ebenen[ed.st.aktiv][0].id)');
  const vorher = await lesen();
  await p.locator('.lsp6-sbtn').first().focus();
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Delete');
  const ansicht = await lesen();
  pruefe('Ansicht-Reiter: ArrowDown und Entf wirken nicht auf die Ebene (wie in 6.4.0)', ansicht.anzahl === vorher.anzahl && ansicht.cy === vorher.cy, JSON.stringify([vorher, ansicht]));
  pruefe('keine Seitenfehler', kein(s), s.fehler.join(' | '));
  await s.schliessen();
});

szenario('tabpanel', true, async (b, srv) => {
  const s = await oeffnen(b, srv, T71);
  const p = s.page;
  await sichtWarten(p);
  const lage = await p.evaluate(() => [...document.querySelectorAll('.lsp6-sbtn')].map((x) => { const z = document.getElementById(x.getAttribute('aria-controls')); return { art: x.getAttribute('data-sicht'), ziel: !!z, rolle: z && z.getAttribute('role'), name: z && (z.getAttribute('aria-label') || z.getAttribute('aria-labelledby')) }; }));
  pruefe('jeder Ansicht-Reiter verweist auf ein vorhandenes Feld mit role=tabpanel und einem Namen', lage.length === 3 && lage.every((x) => x.ziel && x.rolle === 'tabpanel' && x.name), JSON.stringify(lage));
  const pv = lage.find((x) => x.art === 'produkt');
  pruefe('die Vorschau ist ein tabpanel mit dem Namen «Vorschau»', pv && pv.rolle === 'tabpanel' && pv.name === 'Vorschau', JSON.stringify(pv));
  pruefe('genau zwei tabpanel (Bühne und Vorschau)', await p.locator('[role="tabpanel"]').count() === 2);
  await s.schliessen();
  const e = await oeffnen(b, srv, 'karte=71&shop=1001:4012,1002:4020,1003:4045&vorschau=71&bearbeiten=0&themeregel=1');
  await e.page.waitForSelector('[data-feld="sicht"]:not([hidden])', { timeout: 10000 });
  pruefe('data-bearbeiten=0 (Verhalten von 6.3.1): kein tablist, die Vorschau trägt keine Rolle tabpanel', await e.page.locator('[data-feld="produktansicht"]').getAttribute('role') === null && await e.page.locator('[role="tablist"] .lsp6-sbtn').count() === 0);
  await e.schliessen();
});

// ── (e) Beschriftung der Druckfläche im Rahmen ──────────────────────────────────────────────────
const SHIRT_ID = '15422811439489', HOODIE_ID = '15422815699329', TOTE_ID = '15422819991937';
const lies = (datei) => JSON.parse(readFileSync(join(v6, 'maps', datei), 'utf8'));
function liveQ(id, extra = '') {
  const k = lies(`lspod-${id}.karte.json`);
  const v = (k.modelle ? Object.entries(k.shop.varianten).map(([sv, x]) => ({ sv, pv: x.pv, m: String(x.m) })) : Object.entries(k.shop.varianten).map(([sv, pv]) => ({ sv, pv: Number(pv), m: String(k.printfulProductId) }))).slice(0, 3);
  return `karte=live-${id}&vorschau=live-${id}&spiegel=0&varianten=${v.map((x) => `${x.sv}:M${x.m}-${x.pv}`).join(',')}&bearbeiten=1&themeregel=1${extra ? '&' + extra : ''}`;
}
szenario('beschriftung-im-rahmen', true, async (b, srv) => {
  for (const [name, q] of [['T-Shirt 71 (Test)', T71], ['Shirt live', liveQ(SHIRT_ID)], ['Hoodie live', liveQ(HOODIE_ID)], ['Jutebeutel live', liveQ(TOTE_ID)]]) {
    for (const [ansicht, opt] of [['Rechner', PC], ['Handy', MOBIL]]) {
      const s = await oeffnen(b, srv, q, opt);
      const p = s.page;
      await sichtWarten(p);
      await p.waitForFunction(() => window.LSPOD6.editors[0].produktBuehne(), null, { timeout: 10000 });
      for (const stufe of [0, 1, 2]) {
        await ed(p, '(ed, i) => ed.zoomSetzen(i)', stufe);
        await p.waitForTimeout(120);
        const m = await p.evaluate(() => {
          const t = document.querySelector('.lsp6-tag'), f = document.querySelector('.lsp6-frame'), st = document.querySelector('.lsp6-stage');
          if (!t || t.hidden) return { weg: true };
          const a = t.getBoundingClientRect(), r = f.getBoundingClientRect(), g = st.getBoundingClientRect();
          const zahl = t.querySelector('.lsp6-tag-z');
          return { text: t.textContent, tagL: a.left, tagR: a.right, rahL: Math.max(r.left, g.left), rahR: Math.min(r.right, g.right), zahlenGekuerzt: !!zahl && zahl.scrollWidth > zahl.clientWidth + 1, wortGekuerzt: !!t.querySelector('.lsp6-tag-l') && t.querySelector('.lsp6-tag-l').scrollWidth > t.querySelector('.lsp6-tag-l').clientWidth + 1 };
        });
        if (m.weg) { pruefe(`${name}, ${ansicht}, Zoom ${stufe}: die Beschriftung ist verborgen`, false, 'verborgen'); continue; }
        pruefe(`${name}, ${ansicht}, Zoom ${stufe}: die Beschriftung «${m.text}» ragt nicht über den Rahmen (rechts ${m.tagR.toFixed(1)} ≤ ${m.rahR.toFixed(1)})`, m.tagR <= m.rahR + 0.5 && m.tagL >= m.rahL - 0.5, JSON.stringify(m));
        pruefe(`${name}, ${ansicht}, Zoom ${stufe}: die Zahlen der Beschriftung bleiben vollständig (bei Platzmangel kürzt sich zuerst das Wort «Druckfläche»${m.wortGekuerzt ? ', hier gekürzt' : ''})`, /\d/.test(m.text) && !m.zahlenGekuerzt, JSON.stringify(m));
      }
      pruefe(`${name}, ${ansicht}: keine Seitenfehler`, kein(s), s.fehler.join(' | '));
      await s.schliessen();
    }
  }
  // Wortlaut bleibt vollständig, wo Platz ist (Druckfläche gross, Zoom 2)
  const s = await oeffnen(b, srv, T71);
  await sichtWarten(s.page);
  await ed(s.page, '(ed) => ed.zoomSetzen(2)');
  const voll = await s.page.evaluate(() => { const t = document.querySelector('.lsp6-tag'); return { text: t.textContent, abgeschnitten: [...t.children].some((c) => c.scrollWidth > c.clientWidth + 1), teile: t.children.length }; });
  pruefe('bei grossem Rahmen (Zoom «Druckfläche») steht der volle Satz «Druckfläche … cm» unverkürzt', /^Druckfläche \d/.test(voll.text) && !voll.abgeschnitten && voll.teile === 2, JSON.stringify(voll));
  await s.schliessen();
});

// ── (b) Kontrast-Hinweis in «Bearbeiten» und «Druckversion» ─────────────────────────────────────
szenario('kontrast-bearbeiten', true, async (b, srv) => {
  const s = await oeffnen(b, srv, T71);
  const p = s.page;
  await sichtWarten(p);
  const hinweis = '[data-feld="kontrast-bearbeiten"]';
  const sichtbar = () => p.evaluate((h) => { const e = document.querySelector(h); return !!e && !e.hidden && e.getClientRects().length > 0; }, hinweis);
  const warte = (soll) => p.waitForFunction(([h, v]) => { const e = document.querySelector(h); return !!e && (!e.hidden) === v; }, [hinweis, soll], { timeout: 5000 });
  const text = () => p.locator(hinweis).innerText();
  const gezeichnet = () => p.locator('.lsp6-pv').getAttribute('data-gezeichnet');
  const swatch = (c) => p.locator(`.lsp6-sw[data-c="${c}"]`).click();
  pruefe('das Element für den Hinweis gibt es und es ist zunächst verborgen', await p.locator(hinweis).count() === 1 && !(await sichtbar()));
  await variante(p, 1002);
  await textHinzufuegen(p, 'Hallo');
  await p.waitForTimeout(700);
  pruefe('schwarzer Stoff, Standardtext (weiss): kein Hinweis', !(await sichtbar()));
  await swatch('#111111');
  await warte(true);
  const t1 = await text();
  pruefe('schwarzer Stoff, dunkle Wahl: Hinweis «dunkel auf dunkel» in «Bearbeiten»', /dunkel/.test(t1) && /hellere/.test(t1) && !/—/.test(t1), t1);
  pruefe('der Hinweis wurde gerechnet, OHNE die Vorschau zu zeichnen (die Canvas der Vorschau blieb ungezeichnet)', (await gezeichnet()) === null || Number(await gezeichnet()) === 0, String(await gezeichnet()));
  pruefe('der Hinweis steht unter der Bühne (nach der Zoomleiste)', await p.evaluate((h) => { const e = document.querySelector(h), st = document.querySelector('.lsp6-stagewrap'); return !!(st.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING); }, hinweis));
  // Druckversion: derselbe Hinweis; Vorschau: nur ihr eigener
  await p.locator('.lsp6-sbtn[data-sicht="druck"]').click();
  await p.waitForTimeout(500);
  pruefe('«Druckversion»: derselbe Hinweis', await sichtbar() && /dunkel/.test(await text()));
  await p.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  await p.waitForFunction(() => !document.querySelector('[data-feld="kontrast"]').hidden, null, { timeout: 8000 });
  pruefe('«Vorschau»: der Hinweis der Bühne ist verborgen, der der Vorschau steht (kein doppelter Hinweis)', !(await sichtbar()) && await p.locator('[data-feld="kontrast"]').isVisible());
  // Änderungen IN der Vorschau (Farbwahl): der Hinweis der Bühne bleibt verborgen, der der Vorschau folgt
  await swatch('#ffffff');
  await p.waitForFunction(() => document.querySelector('[data-feld="kontrast"]').hidden, null, { timeout: 8000 });
  await swatch('#111111');
  await p.waitForFunction(() => !document.querySelector('[data-feld="kontrast"]').hidden, null, { timeout: 8000 });
  await p.waitForTimeout(600);
  pruefe('Farbwahl in der «Vorschau»: nur ihr eigener Hinweis, der der Bühne bleibt verborgen', !(await sichtbar()) && await p.locator('[data-feld="kontrast"]').isVisible());
  await p.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').click();
  await warte(true);
  pruefe('zurück in «Bearbeiten»: der Hinweis ist wieder da', await sichtbar());
  // weisser Stoff
  await variante(p, 1001);
  await warte(false);
  pruefe('weisser Stoff, dunkle Wahl: kein Hinweis', !(await sichtbar()));
  await swatch('#ffffff');
  await warte(true);
  const t2 = await text();
  pruefe('weisser Stoff, weisse Wahl: Hinweis «hell auf hell»', /hell/.test(t2) && /dunklere/.test(t2), t2);
  // Entscheidung gleich der der Vorschau, für alle Kombinationen aus Ausführung und Farbwahl
  const farben = ['#111111', '#ffffff', '#c1922f', '#b3122b', '#1e4fd6', '#1c8a4b', '#e84393', '#000080'];
  const abw = [];
  for (const v of [1001, 1002, 1003]) {
    await variante(p, v);
    for (const c of farben) {
      await swatch(c);
      const z0 = Number(await gezeichnet()) || 0;
      await p.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
      await p.waitForFunction((z) => (Number(document.querySelector('.lsp6-pv').getAttribute('data-gezeichnet')) || 0) > z, z0, { timeout: 8000 });
      const vorschau = await p.locator('[data-feld="kontrast"]').isVisible();   // die Vorschau entscheidet; die Bühne muss nach der Rückkehr dasselbe zeigen (bis 3 s Zeit, kein Raten mit einer festen Pause)
      await p.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').click();
      let gleich = true;
      try { await p.waitForFunction(([h, v]) => { const e = document.querySelector(h); return !!e && (!e.hidden && e.getClientRects().length > 0) === v; }, [hinweis, vorschau], { timeout: 3000 }); } catch { gleich = false; }
      if (!gleich) abw.push(`${v}/${c}: Vorschau ${vorschau}, Bühne ${await sichtbar()}`);
    }
  }
  pruefe('alle 24 Kombinationen (3 Ausführungen × 8 Farben): Hinweis in «Bearbeiten» genau dann, wenn ihn die Vorschau zeigt', abw.length === 0, abw.join(' | '));
  // Bild und Entfernen
  await variante(p, 1002);
  await swatch('#ffffff');
  await ed(p, '(ed) => { const e = ed.st.ebenen[ed.st.aktiv][0]; ed.entfernen(e.id); }');
  await motivHinzu(p, '#101010'); await bilderGeladen(p);
  await warte(true);
  pruefe('dunkles Bild auf schwarzem Stoff: Hinweis (nicht nur für Text, auch für Fotos und Bilder)', await sichtbar() && /dunkel/.test(await text()), await text());
  await ed(p, '(ed) => { const l = ed.st.ebenen[ed.st.aktiv]; ed.entfernen(l[0].id); }');
  await warte(false);
  pruefe('alle Ebenen entfernt: der Hinweis verschwindet', !(await sichtbar()));
  pruefe('keine Seitenfehler', kein(s), s.fehler.join(' | '));
  await s.schliessen();
  // Tasse: weisser Becher
  const t = await oeffnen(b, srv, T19);
  await sichtWarten(t.page);
  await textHinzufuegen(t.page, 'Tasse');
  await t.page.locator('.lsp6-sw[data-c="#ffffff"]').click();
  await t.page.waitForFunction((h) => { const e = document.querySelector(h); return e && !e.hidden; }, hinweis, { timeout: 5000 });
  pruefe('Tasse (weisser Becher), weisse Schrift: Hinweis «hell auf hell»', /hell/.test(await t.page.locator(hinweis).innerText()));
  await t.page.locator('.lsp6-sw[data-c="#111111"]').click();
  await t.page.waitForFunction((h) => { const e = document.querySelector(h); return e && e.hidden; }, hinweis, { timeout: 5000 });
  pruefe('Tasse, dunkle Schrift: kein Hinweis', await t.page.evaluate((h) => { const e = document.querySelector(h); return !!e && e.hidden; }, hinweis));
  await t.schliessen();
  // data-bearbeiten=0 (Verhalten von 6.3.1): kein neuer Hinweis in der Druckfläche
  const z = await oeffnen(b, srv, 'karte=71&shop=1001:4012,1002:4020,1003:4045&vorschau=71&bearbeiten=0&themeregel=1&varianten=1002:Schwarz,1001:Weiss');
  await z.page.waitForSelector('[data-feld="sicht"]:not([hidden])', { timeout: 10000 });
  await textHinzufuegen(z.page, 'Alt');
  await z.page.locator('.lsp6-sw[data-c="#111111"]').click();
  await z.page.waitForTimeout(800);
  pruefe('data-bearbeiten=0: der Hinweis der Bühne bleibt verborgen (Verhalten wie 6.3.1)', await z.page.evaluate((h) => { const e = document.querySelector(h); return !e || e.hidden; }, hinweis));
  await z.schliessen();
});

// ── (c) Handy: Werkzeugzeile unter der Bühne ────────────────────────────────────────────────────
szenario('handy-lage', true, async (b, srv) => {
  const faelle = [['T-Shirt 71 (Test, mit Platzierungs-Reitern)', T71], ['Shirt live', liveQ(SHIRT_ID)], ['Hoodie live', liveQ(HOODIE_ID)], ['Jutebeutel live', liveQ(TOTE_ID)], ['Tasse 19', T19],
    ['Poster 268', 'karte=268&vorschau=268&bearbeiten=1&themeregel=1'], ['6.3.1-Modus (data-bearbeiten=0)', T71.replace('bearbeiten=1', 'bearbeiten=0')]];
  const GRENZE = 844 - 60;   // die Knöpfe enden mindestens 60 px über dem unteren Rand des Fensters, wenn der Anfang des Editors am oberen Rand steht
  for (const [name, q] of faelle) {
    const s = await oeffnen(b, srv, q, MOBIL);
    const p = s.page;
    if (!/bearbeiten=0/.test(q)) await sichtWarten(p); else await p.waitForSelector('[data-feld="sicht"]:not([hidden])', { timeout: 10000 });
    await p.waitForTimeout(500);
    const m = await p.evaluate(() => {
      const k = document.querySelector('.lsp6').getBoundingClientRect(), z = document.querySelector('[data-feld="werkzeuge"]'), knoepfe = [...z.querySelectorAll('.lsp6-btn.dark')].map((e) => e.getBoundingClientRect());
      const st = document.querySelector('.lsp6-stagewrap'), pvw = document.querySelector('[data-feld="produktansicht"]'), zoom = document.querySelector('[data-feld="zoom"]'), meta = document.querySelector('[data-feld="meta"]');
      const nach = (a, c) => !!(a.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING);
      return { oben: Math.min(...knoepfe.map((r) => r.top)) - k.top, unten: Math.max(...knoepfe.map((r) => r.bottom)) - k.top, links: Math.min(...knoepfe.map((r) => r.left)), rechts: Math.max(...knoepfe.map((r) => r.right)), anzahl: knoepfe.length,
        reihenfolge: nach(st, z) && nach(pvw, z) && nach(zoom, z) && nach(z, meta), picker: !!z.querySelector('.lsp6-picker'), breit: document.documentElement.scrollWidth, texte: knoepfe.length };
    });
    pruefe(`${name}: die Knöpfe «Text | Sticker | Bild» enden ${m.unten.toFixed(0)} px unter dem Anfang des Editors (höchstens ${GRENZE})`, m.anzahl === 3 && m.unten <= GRENZE, JSON.stringify(m));
    pruefe(`${name}: Reihenfolge Bühne, Vorschau, Zoomleiste, Werkzeuge, Masszeile; Stickerauswahl in der Werkzeugzeile`, m.reihenfolge && m.picker, JSON.stringify(m));
    pruefe(`${name}: die Knöpfe liegen innerhalb des Fensters (390 px) und die Seite scrollt nicht seitlich`, m.links >= 0 && m.rechts <= 390 && m.breit <= 390, JSON.stringify(m));
    // Wirkung: Text hinzufügen; Sticker öffnet die Auswahl direkt unter den Knöpfen
    await p.getByRole('button', { name: '➕ Text' }).click();
    pruefe(`${name}: «Text» fügt einen Text hinzu`, await p.evaluate(() => Object.values(window.LSPOD6.editors[0].st.ebenen).flat().length) === 1);
    await p.getByRole('button', { name: '⭐ Sticker' }).click();
    const pk = await p.evaluate(() => { const z = document.querySelector('[data-feld="werkzeuge"]'), r = z.querySelector('.lsp6-btn.dark').getBoundingClientRect(), pi = z.querySelector('.lsp6-picker'), pr = pi.getBoundingClientRect(); return { sichtbar: !pi.hidden && pr.height > 0, abstand: pr.top - Math.max(...[...z.querySelectorAll('.lsp6-btn.dark')].map((e) => e.getBoundingClientRect().bottom)) }; });
    pruefe(`${name}: die Stickerauswahl öffnet direkt unter den Knöpfen (Abstand ${pk.abstand.toFixed(0)} px)`, pk.sichtbar && pk.abstand >= 0 && pk.abstand <= 24, JSON.stringify(pk));
    pruefe(`${name}: keine Seitenfehler`, kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
});

// ── (d) weisse Schrift ohne Schatten ────────────────────────────────────────────────────────────
const STAT = `async () => {
  const ed = window.LSPOD6.editors[0];
  async function pixel(blobOderCanvas) {
    let cv;
    if (blobOderCanvas instanceof Blob) { const bmp = await createImageBitmap(blobOderCanvas); cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height; cv.getContext('2d').drawImage(bmp, 0, 0); }
    else cv = blobOderCanvas;
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let beteiligt = 0, dunkel = 0, kern = 0, halo = 0; const maske = new Uint8Array(d.length / 4);
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a === 0) continue;
      beteiligt++;
      if (d[i] < 250 || d[i + 1] < 250 || d[i + 2] < 250) dunkel++;
      if (a === 255) { kern++; maske[i / 4] = 1; } else halo++;
    }
    const h = await crypto.subtle.digest('SHA-256', maske);
    return { breite: cv.width, hoehe: cv.height, beteiligt, dunkel, kern, halo, kernSha: Array.from(new Uint8Array(h)).map((x) => x.toString(16).padStart(2, '0')).join('') };
  }
  const druck = await pixel(await ed.druckdateiErzeugen(ed.st.aktiv, { skala: 0.25 }));
  const cv = document.createElement('canvas'); cv.width = 800; cv.height = 800;
  const r = await ed.vorschauZeichnen(cv, {});
  const vorschau = r.ok && r.dcv ? await pixel(r.dcv) : null;
  const gesamt = await crypto.subtle.digest('SHA-256', await (await ed.druckdateiErzeugen(ed.st.aktiv, { skala: 0.25 })).arrayBuffer());
  const c = document.querySelector('.lsp6-layer > div');
  return { druck, vorschau, ganz: Array.from(new Uint8Array(gesamt)).map((x) => x.toString(16).padStart(2, '0')).join(''), schatten: c ? getComputedStyle(c).textShadow : null };
}`;
async function statistik(b, srv, ref, farbe, v = 1002, extra = '') {
  const s = await oeffnen(b, srv, T71 + (ref ? '&editor=ref' : '') + extra);
  const p = s.page;
  await sichtWarten(p);
  await variante(p, v);
  await textHinzufuegen(p, 'Weiss');
  await feldSetzen(p, 'Schrifthöhe (mm)', 40);
  await p.locator(`.lsp6-sw[data-c="${farbe}"]`).click();
  await p.waitForTimeout(150);
  const r = await p.evaluate(new Function('return (' + STAT + ')()'));
  r.fehler = s.fehler.slice();
  await s.schliessen();
  return r;
}
szenario('schatten', true, async (b, srv) => {
  const weissAlt = await statistik(b, srv, true, '#ffffff');
  const weissNeu = await statistik(b, srv, false, '#ffffff');
  pruefe('Bezug: weisse Schrift hat in 6.4.0 einen Schatten (dunkle Pixel mit Alpha in der Druckdatei)', weissAlt.druck.dunkel > 200, JSON.stringify(weissAlt.druck));
  pruefe('6.4.1: weisse Schrift hat KEINEN Schatten in der Druckdatei (keine dunklen Pixel mit Alpha)', weissNeu.druck.dunkel === 0 && weissNeu.druck.beteiligt > 1000, JSON.stringify(weissNeu.druck));
  pruefe('Vorschau (Design-Leinwand, auch Quelle von _vorschau): in 6.4.0 mit Schatten, in 6.4.1 ohne', weissAlt.vorschau && weissNeu.vorschau && weissAlt.vorschau.dunkel > 100 && weissNeu.vorschau.dunkel === 0, JSON.stringify([weissAlt.vorschau, weissNeu.vorschau]));
  pruefe('die voll deckenden (weissen) Pixel der Schrift sind in 6.4.1 dieselben wie in 6.4.0 (nur der Hof ist weg)', weissAlt.druck.kernSha === weissNeu.druck.kernSha && weissAlt.druck.kern === weissNeu.druck.kern && weissAlt.druck.kern > 500, JSON.stringify([weissAlt.druck.kern, weissNeu.druck.kern]));
  pruefe('mit der Konstante: Pixel mit Alpha in 6.4.1 nie mehr als in 6.4.0 (der Hof entfällt, nichts kommt dazu)', weissNeu.druck.beteiligt <= weissAlt.druck.beteiligt && weissNeu.druck.beteiligt >= weissAlt.druck.kern, JSON.stringify([weissAlt.druck.beteiligt, weissNeu.druck.beteiligt]));
  pruefe('Bühne («Bearbeiten»): weisse Schrift ohne text-shadow', weissNeu.schatten === 'none', String(weissNeu.schatten));
  pruefe('Bezug: Bühne von 6.4.0 hatte den Schatten', /rgba\(0, 0, 0, 0\.4\)/.test(String(weissAlt.schatten)), String(weissAlt.schatten));
  // dunkle und farbige Schrift: Druckdatei und Vorschau byte-gleich zu 6.4.0
  for (const [v, c] of [[1001, '#111111'], [1002, '#111111'], [1002, '#b3122b'], [1003, '#1e4fd6']]) {
    const alt = await statistik(b, srv, true, c, v), neu = await statistik(b, srv, false, c, v);
    pruefe(`Ausführung ${v}, Farbe ${c}: Druckdatei (PNG, 25 %) byte-gleich zu 6.4.0`, alt.ganz === neu.ganz && alt.druck.beteiligt > 500, `${alt.ganz.slice(0, 12)} ${neu.ganz.slice(0, 12)}`);
    pruefe(`Ausführung ${v}, Farbe ${c}: Design-Leinwand der Vorschau pixelgleich zu 6.4.0`, JSON.stringify(alt.vorschau) === JSON.stringify(neu.vorschau), JSON.stringify([alt.vorschau, neu.vorschau]));
  }
  pruefe('keine Seitenfehler', weissAlt.fehler.length === 0 && weissNeu.fehler.length === 0, JSON.stringify([weissAlt.fehler, weissNeu.fehler]));
});

// ── Kaufvergleich: byteglich zu 6.4.0, ausser in den zwei gewollten Fällen ──────────────────────
async function reviewBestaetigen(p) {
  const dialog = p.locator('[data-lsp6-review="1"]');
  await dialog.waitFor({ state: 'visible', timeout: 30000 });
  await dialog.locator('.lsp6-review-accept').check();
  await dialog.locator('.lsp6-review-confirm').click();
}
/** Eine Bestellung durchspielen (Druckprüfung bestätigen, Warenkorb-Anfrage abfangen); gibt die Eigenschaften zurück, jede Cloudinary-Adresse durch den SHA-256 der hochgeladenen Bytes ersetzt. */
async function kauf(b, srv, ref, query, aktion, opt = {}) {
  const s = await oeffnen(b, srv, query + (ref ? '&editor=ref' : ''), opt);
  const p = s.page;
  const hashes = {}; let zaehler = 0;
  await p.route('https://api.cloudinary.com/**', async (route) => {
    const buf = route.request().postDataBuffer() || Buffer.alloc(0);
    const idx = ++zaehler;
    const png = pngAusKoerper(buf);
    if (png) hashes[idx] = 'png:' + sha256(png.png);
    else { const a = buf.indexOf(Buffer.from([0xff, 0xd8, 0xff])), e = buf.lastIndexOf(Buffer.from([0xff, 0xd9])); hashes[idx] = a >= 0 && e > a ? 'jpg:' + sha256(buf.subarray(a, e + 2)) : 'roh:' + sha256(buf); }
    await route.fallback();
  });
  await sichtWarten(p);
  await aktion(p);
  const version = await p.evaluate(() => window.LSPOD6.version);   // vor dem Kauf: danach steht die Warenkorb-Seite da
  await p.locator('.lsp6-cta').click();
  await reviewBestaetigen(p);
  await p.waitForURL('**/cart', { timeout: 30000 });
  const wk = s.warenkorb[0];
  const props = {};
  for (const [k, w] of Object.entries((wk && wk.properties) || {})) {
    const m = /\/mock\/(\d+)\.png$/.exec(String(w));
    props[k] = m ? (hashes[Number(m[1])] || 'unbekannt:' + m[1]) : w;
  }
  const r = { props, rest: { ...wk, properties: undefined }, uploads: Object.values(hashes), fehler: s.fehler.slice(), version };
  await s.schliessen();
  return r;
}
const unterschiede = (a, c) => [...new Set([...Object.keys(a), ...Object.keys(c)])].filter((k) => a[k] !== c[k]);
const aktionMotiv = (v, farbe, opt = {}) => async (p) => {
  if (v !== 1001) await variante(p, v);
  if (!opt.nurBild) {
    await textHinzufuegen(p, 'Hallo Welt');
    await feldSetzen(p, 'Schrifthöhe (mm)', 22); await feldSetzen(p, 'X (cm)', 8); await feldSetzen(p, 'Y (cm)', 12);
    if (farbe) await p.locator(`.lsp6-sw[data-c="${farbe}"]`).click();
  }
  if (opt.bild !== false) {
    await motivHinzu(p, '#2040c0', 4000); await bilderGeladen(p);   // gemeldete Originalgrösse 4000 px: das Qualitätstor sperrt den Kauf nicht
    await feldSetzen(p, 'X (cm)', 18); await feldSetzen(p, 'Y (cm)', 25); await feldSetzen(p, 'Breite (cm)', 7); await feldSetzen(p, 'Drehung °', 20);
  }
  if (opt.ansicht) await ed(p, '(ed, a) => ed.sichtSetzen(a)', opt.ansicht);
  if (opt.ansicht === 'produkt') await p.waitForTimeout(500);
  await ed(p, '(ed) => ed.waehlen(null)');
};
szenario('kaufvergleich', true, async (b, srv) => {
  // gleich: alle Eigenschaften, alle Upload-Bytes (Druckdateien und Vorschau-JPEG) und der Rest der Warenkorb-Anfrage
  const gleich = [
    ['weisser Stoff, Standardfarbe, Text und Bild', 1001, null, {}],
    ['schwarzer Stoff, gewählte dunkle Farbe (#111111)', 1002, '#111111', {}],
    ['schwarzer Stoff, gewähltes Rot', 1002, '#b3122b', {}],
    ['pinker Stoff, gewählte dunkle Farbe', 1003, '#111111', {}],
    ['pinker Stoff, gewähltes Blau', 1003, '#1e4fd6', {}],
    ['schwarzer Stoff, nur ein Bild (kein Text)', 1002, null, { nurBild: true }],
    ['schwarzer Stoff, Kauf aus «Druckversion»', 1002, '#111111', { ansicht: 'druck' }],
    ['schwarzer Stoff, Kauf aus «Vorschau»', 1002, '#111111', { ansicht: 'produkt' }],
    ['weisser Stoff, Kauf aus «Vorschau»', 1001, null, { ansicht: 'produkt' }],
  ];
  for (const [name, v, farbe, opt] of gleich) {
    const alt = await kauf(b, srv, true, T71, aktionMotiv(v, farbe, opt));
    const neu = await kauf(b, srv, false, T71, aktionMotiv(v, farbe, opt));
    const d = unterschiede(alt.props, neu.props);
    pruefe(`${name}: verglichen werden die Referenz 6.4.0 und die geprüfte Fassung (${neu.version})`, alt.version === '6.4.0' && neu.version === (/var VERSION = '([\d.]+)'/.exec(quelle) || [])[1], `${alt.version} gegen ${neu.version}`);
    pruefe(`${name}: Druckdatei, _pod_karte, _vorschau und alle Eigenschaften byte-gleich zu 6.4.0`, d.length === 0 && Object.keys(alt.props).length >= 3, `Unterschiede: ${d.join(', ')} | ${JSON.stringify(Object.keys(alt.props))}`);
    pruefe(`${name}: Uploads (Anzahl und SHA-256 jedes hochgeladenen Bytestroms) und die übrige Warenkorb-Anfrage gleich`, JSON.stringify(alt.uploads) === JSON.stringify(neu.uploads) && JSON.stringify(alt.rest) === JSON.stringify(neu.rest), JSON.stringify([alt.uploads, neu.uploads]));
    pruefe(`${name}: Eigenschaften vollständig: Druckdatei, Design, _pod_karte${/Vorschau|Druckversion|Bild|Text|Standard|gewählt/.test(name) ? ', _vorschau' : ''}`, ['_pod_karte', '_vorschau'].every((k) => !!neu.props[k]) && Object.keys(neu.props).some((k) => /Druckdatei/.test(k)), JSON.stringify(Object.keys(neu.props)));
    pruefe(`${name}: keine Seitenfehler`, alt.fehler.length === 0 && neu.fehler.length === 0, JSON.stringify([alt.fehler, neu.fehler]));
  }
  // anders, aber NUR so wie gewollt: (d) weisse Schrift (Schatten) und (a) Standardfarbe auf dunklem Stoff
  const anders = [
    ['(d) schwarzer Stoff, gewählte weisse Schrift', 1002, '#ffffff', {}, 'schatten'],
    ['(d) weisser Stoff, gewählte weisse Schrift', 1001, '#ffffff', {}, 'schatten'],
    ['(a) schwarzer Stoff, Standardfarbe (6.4.1 weiss, 6.4.0 dunkel)', 1002, null, {}, 'standard'],
    ['(a) pinker Stoff, Standardfarbe', 1003, null, {}, 'standard'],
  ];
  for (const [name, v, farbe, opt, art] of anders) {
    const alt = await kauf(b, srv, true, T71, aktionMotiv(v, farbe, opt));
    const neu = await kauf(b, srv, false, T71, aktionMotiv(v, farbe, opt));
    const d = unterschiede(alt.props, neu.props).sort();
    const erlaubt = Object.keys(neu.props).filter((k) => /Druckdatei|^_vorschau$/.test(k)).sort();
    pruefe(`${name}: Druckdatei (PNG) UND Vorschau-Bild unterscheiden sich, sonst nichts (nicht _pod_karte, nicht die Beschreibung des Designs)`, d.join('|') === erlaubt.join('|') && d.length >= 2, `Unterschiede: ${d.join(', ')}`);
    pruefe(`${name}: die übrige Warenkorb-Anfrage ist gleich`, JSON.stringify(alt.rest) === JSON.stringify(neu.rest), JSON.stringify([alt.rest, neu.rest]));
    pruefe(`${name}: keine Seitenfehler`, alt.fehler.length === 0 && neu.fehler.length === 0, JSON.stringify([alt.fehler, neu.fehler]));
  }
});

// ── Lauf ─────────────────────────────────────────────────────────────────────────────────────────
const srv = await starteServer();
const browser = await chromium.launch();
const auswahl = szenarien.filter((x) => (nur === 'kern' ? x.kern : !nur || x.name.startsWith(nur)));
for (const sz of auswahl) {
  const t0 = Date.now();
  const vorher = fehler.length;
  try { await sz.fn(browser, srv); } catch (e) { n++; fehler.push(`${sz.name}: Ausnahme ${e.message.split('\n')[0]}`); console.log(`  ✗ ${sz.name}: Ausnahme ${e.message.split('\n').slice(0, process.env.V6_VOLL ? 40 : 3).join(' / ')}`); if (process.env.V6_ABBRUCH) process.exit(1); }
  console.log(`${fehler.length === vorher ? '✓' : '✗'} ${sz.name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
await browser.close(); await srv.stop();
console.log(fehler.length ? `\n${fehler.length} von ${n} Prüfungen FEHLGESCHLAGEN` : `\n${n} Prüfungen bestanden`);
process.exit(fehler.length ? 1 : 0);
