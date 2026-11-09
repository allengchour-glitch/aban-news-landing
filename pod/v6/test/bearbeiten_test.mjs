/**
 * Browser-Tests (Playwright, Chromium) für die Ansichten «Bearbeiten | Druckversion | Vorschau» des Editors v6.4.0: Reiter je Fall, Zoom, Schichtfolge (Grund, Ebenen, Vorlagenbild, Rahmen, Griffe),
 * Ziehen/Skalieren/Drehen mit Maus UND Touch, Bedienung bei 390/360/320 px, «Gleiche Vorschau» (Bearbeiten gegen die Vorschau-Canvas, Pixel), Fehler A bis D, Druckdatei unabhängig von der Ansicht
 * (Byte-Vergleich gegen 6.3.1), Review-Tor, Entwurf, Start-Steuerung.
 * Karten und Vorschaudaten: die LIVE-Dateien aus pod/v6/maps (T-Shirt 71/456/586, Hoodie 145/821, Classic-Tee 438, Kiss-Cut 358, Stickerei 1552) und die Test-Karten aus testdaten/ (Tasse 19, Poster 268,
 * Kappe 206, Allover-Hoodie 388, Modell 1592, T-Shirt 71 mit Farbtabelle). Vorlagenbilder: Nachbauten (lib.mjs: geisterPng) oder, mit V6_BILDCACHE, die echten Printful-Bilder.
 * Aufruf: node bearbeiten_test.mjs [Teil]   (Teil: Name oder Anfang eines Szenarios; ohne Angabe alle; «kern» = die für die Mutationsprobe, seit 6.4.0 alle: sie dauern zusammen unter einer Minute)
 * Umgebung: V6_DATEI (andere Fassung des Editors, für die Mutationsprobe), V6_REF_DATEI (Referenz für den Byte-Vergleich, Standard 6.3.1), V6_BILDCACHE, V6_MESSWERTE=1 (druckt die Zahlen von «Gleiche Vorschau»).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { playwright, starteServer, seiteOeffnen, editorBereit, pngRGBA, geisterPng, BILDCACHE, V6_DATEI, v6Ordner, hier } from './lib.mjs';

if (!/var VERSION = '6\.[4-9]\./.test(readFileSync(V6_DATEI, 'utf8'))) { console.log('übersprungen: V6_DATEI ist älter als 6.4.0 (die Ansichten gibt es dort nicht)'); process.exit(0); }
const { chromium } = playwright();
let n = 0; const fehler = [];
function pruefe(name, ok, detail = '') { n++; if (!ok) { fehler.push(`${name} ${detail}`); console.log(`  ✗ ${name} ${detail}`); if (process.env.V6_ABBRUCH) process.exit(1); } }   // V6_ABBRUCH=1 (nur Mutationsprobe): beim ersten Fehler beenden
function nahe(name, ist, soll, eps) { pruefe(name, Math.abs(ist - soll) <= eps, `ist=${ist} soll=${soll} (±${eps})`); }
const nur = process.argv[2] || '';
const szenarien = [];
function szenario(name, kern, fn) { szenarien.push({ name, kern, fn }); }

const PC = { breite: 1440, hoehe: 900 };
const MOBIL = { breite: 390, hoehe: 844, mobil: true };

// ── Daten ───────────────────────────────────────────────────────────────────────────────────────
const lies = (datei) => JSON.parse(readFileSync(join(v6Ordner, 'maps', datei), 'utf8'));
const SHIRT_ID = '15422811439489', HOODIE_ID = '15422815699329', TEE_ID = '15422857642369', KISS_ID = '15422942609793', STICK_ID = '15422854463873', TASCHE_ID = '15422819991937';
const shirtKarte = lies(`lspod-${SHIRT_ID}.karte.json`);
/** Shopify-Varianten eines LIVE-Bündels oder -Einzelmodells: [{ sv, pv, m }]. */
function liveVarianten(karte) {
  if (karte.modelle) return Object.entries(karte.shop.varianten).map(([sv, x]) => ({ sv, pv: x.pv, m: String(x.m) }));
  return Object.entries(karte.shop.varianten).map(([sv, pv]) => ({ sv, pv: Number(pv), m: String(karte.printfulProductId) }));
}
const SHIRT_V = liveVarianten(shirtKarte);
const weisse = new Set(Object.values(shirtKarte.modelle['71'].farben || {}).flat());
const V71 = SHIRT_V.find((v) => v.m === '71' && weisse.has(v.pv)), V71_FARBIG = SHIRT_V.find((v) => v.m === '71' && !weisse.has(v.pv));
const V456 = SHIRT_V.find((v) => v.m === '456'), V586 = SHIRT_V.find((v) => v.m === '586');
const varParam = (liste) => liste.map((v) => `${v.sv}:M${v.m}-${v.pv}`).join(',');
/** Abfrage für eine LIVE-Datei: Karte und Vorschaudaten, Vorlagenbilder von der Printful-Adresse (spiegel=0), Bearbeiten an, Theme-Regel img{max-width:100%} (wie der echte Shop). */
const liveQ = (id, varianten, extra = '') => `karte=live-${id}&vorschau=live-${id}&spiegel=0&varianten=${varParam(varianten)}&bearbeiten=1&themeregel=1${extra ? '&' + extra : ''}`;
const SHIRT_Q = (v = [V71, V456, V586], extra = '') => liveQ(SHIRT_ID, v, extra);
/** Test-Karten (testdaten/): T-Shirt 71 mit drei Farben (weiss, schwarz, pink) und Vorschaudaten aus dem Katalog. */
const SHOP71 = 'shop=1001:4012,1002:4020,1003:4045';
const T71 = `karte=71&${SHOP71}&vorschau=71&bearbeiten=1&themeregel=1`;
const T19 = 'karte=19&shop=1001:1320,1002:4830,1003:16586&vorschau=19&bearbeiten=1&themeregel=1';
/** Vorlagenbild: echtes Bild aus V6_BILDCACHE, sonst der Nachbau des Geisterbildes (lib.mjs). */
const sha = (u) => createHash('sha1').update(u).digest('hex').slice(0, 16);
const BILDER = {
  printfulBild: (u) => {
    if (BILDCACHE) { const f = join(BILDCACHE, sha(u)); if (existsSync(f)) return { typ: /\.jpe?g/i.test(u) ? 'image/jpeg' : 'image/png', body: readFileSync(f) }; }
    return /\/m\//.test(u) ? { typ: 'image/png', body: geisterPng() } : null;
  },
};
const GEISTER = { printfulBild: (u) => (/\/m\//.test(u) ? { typ: 'image/png', body: geisterPng() } : null) };
// Seit der Korrektur zu 6.4.0 lädt die Bühne das Produktfoto vom Spiegel (wie die Vorschau), wo die Vorschaudaten ihn kennen (spiegel=1, Vorgabe der Test-Karten): beide Adressen bekommen dasselbe Bild
const MIRROR = /\/luxe-vorschau-[0-9a-f]+\.png/;
const WEISS_DECKEND = { printfulBild: (u) => (/\/m\//.test(u) ? { typ: 'image/png', body: pngRGBA(1000, 1000, () => [255, 255, 255, 255]) } : null), shopifyBild: (u) => (MIRROR.test(u) ? { typ: 'image/png', body: pngRGBA(1000, 1000, () => [255, 255, 255, 255]) } : null) };

async function oeffnen(b, srv, query, opt = {}) {
  const s = await seiteOeffnen(b, srv.url, { ...PC, printfulBild: BILDER.printfulBild, ...opt, query });
  await editorBereit(s.page);
  return s;
}
const tabsText = (p) => p.evaluate(() => [...document.querySelectorAll('.lsp6-sbtn')].filter((x) => !x.hidden).map((x) => x.textContent));
const gruppeSichtbar = (p) => p.evaluate(() => { const g = document.querySelector('[data-feld="sicht"]'); return !!g && !g.hidden && g.getClientRects().length > 0; });
const sichtWarten = (p) => p.waitForSelector('[data-feld="sicht"]:not([hidden])', { timeout: 10000 });
const sicht = (p) => p.evaluate(() => window.LSPOD6.editors[0].st.sicht);
async function textHinzufuegen(p, text) { await p.getByRole('button', { name: '➕ Text' }).click(); await p.locator('.lsp6-text').fill(text); }
async function reviewBestaetigen(p) {
  const dialog = p.locator('[data-lsp6-review="1"]');
  await dialog.waitFor({ state: 'visible', timeout: 30000 });
  await dialog.locator('.lsp6-review-accept').check();
  await dialog.locator('.lsp6-review-confirm').click();
}
const rect = (p, sel) => p.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
/** Bild als Motiv: ein einfarbiges Quadrat (Daten-URL), Seitenlänge 200 px; gibt die Ebene zurück (Position und Grösse über die Zahlenfelder setzen). */
const motivHinzu = (p, farbe = '#d01030') => p.evaluate((f) => {
  const cv = document.createElement('canvas'); cv.width = 200; cv.height = 200;
  const c = cv.getContext('2d'); c.fillStyle = f; c.fillRect(0, 0, 200, 200);
  const e = window.LSPOD6.editors[0].neuesBild(cv.toDataURL('image/png'), 200, 200);
  return e.id;
}, farbe);
const bilderGeladen = (p) => p.waitForFunction(() => [...document.querySelectorAll('.lsp6-layer img, .lsp6-tpl, .lsp6-bg')].every((i) => i.hidden || (i.complete && i.naturalWidth > 0)), null, { timeout: 15000 });
const feldEingabe = (p, name) => p.locator('.lsp6-field', { hasText: name }).locator('input');
async function feldSetzen(p, name, wert) { const f = feldEingabe(p, name); await f.fill(String(wert)); await f.press('Tab'); }
const ebenen = (p, id = 'front') => p.evaluate((i) => window.LSPOD6.editors[0].st.ebenen[i].map((e) => ({ id: e.id, cx: e.cx, cy: e.cy, scale: e.scale, rot: e.rot, text: e.text })), id);

// ── Eigene Rechnung der Sichtfenster (Soll nach der Spezifikation, unabhängig vom Editor) ─────────
function erwFenster(vl, art) {
  const tw = vl.vorlageBreite, th = vl.vorlageHoehe, ax = vl.flaecheLinks, ay = vl.flaecheOben, aw = vl.flaecheBreite, ah = vl.flaecheHoehe;
  const bx0 = Math.min(0, ax), by0 = Math.min(0, ay), bx1 = Math.max(tw, ax + aw), by1 = Math.max(th, ay + ah);
  if (art === 'vorlage') return { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 };
  let m = Math.max(aw, ah) * 0.1;
  if (art === 'produkt') m = Math.max(m, Math.min(Math.max(aw, ah) * 0.35, Math.min(aw, ah) * (1 / 0.45 - 1) / 2));
  const x0 = Math.max(ax - m, bx0), y0 = Math.max(ay - m, by0), x1 = Math.min(ax + aw + m, bx1), y1 = Math.min(ay + ah + m, by1);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
/** Geometrie der aktiven Platzierung aus dem Editor (Karte): { vl, masse }. */
const geoAktiv = (p) => p.evaluate(() => { const g = window.LSPOD6.editors[0].geo(); return { vl: g.vorlage, masse: g.masse }; });
/** Lage von Bühne, Host (Druckfläche) und Vorlagenbild in Bruchteilen der Bühne. */
const lage = (p) => p.evaluate(() => {
  const st = document.querySelector('.lsp6-stage').getBoundingClientRect(), h = document.querySelector('.lsp6-host').getBoundingClientRect(), t = document.querySelector('.lsp6-tpl').getBoundingClientRect();
  return { bw: st.width, bh: st.height, hl: (h.left - st.left) / st.width, ho: (h.top - st.top) / st.height, hb: h.width / st.width, hh: h.height / st.height, tl: (t.left - st.left) / st.width, to: (t.top - st.top) / st.height, tb: t.width / st.width, th: t.height / st.height };
});
function sollLage(vl, art) {
  const w = erwFenster(vl, art);
  return { hl: (vl.flaecheLinks - w.x) / w.w, ho: (vl.flaecheOben - w.y) / w.h, hb: vl.flaecheBreite / w.w, hh: vl.flaecheHoehe / w.h, tl: (0 - w.x) / w.w, to: (0 - w.y) / w.h, tb: vl.vorlageBreite / w.w, th: vl.vorlageHoehe / w.h, asp: w.w / w.h };
}
function lagePruefen(name, ist, soll, eps = 0.0012) {   // GEMESSEN weicht die Bühne höchstens 0,13 Vorlagenpixel (0,004 %) von der Rechnung ab; 0,12 % der Bühnenbreite entsprechen 0,7 Bildpunkten
  for (const k of ['hl', 'ho', 'hb', 'hh', 'tl', 'to', 'tb', 'th']) nahe(`${name}: ${k}`, ist[k], soll[k], eps);
  nahe(`${name}: Seitenverhältnis der Bühne`, ist.bw / ist.bh, soll.asp, 0.002);
}

// ── 1. Reiter je Fall ───────────────────────────────────────────────────────────────────────────
szenario('angebot', true, async (b, srv) => {
  const s = await oeffnen(b, srv, T71);
  const p = s.page;
  await sichtWarten(p);
  pruefe('T-Shirt (Produktfoto): drei Reiter Bearbeiten, Druckversion, Vorschau', (await tabsText(p)).join('|') === 'Bearbeiten|Druckversion|Vorschau', (await tabsText(p)).join('|'));
  pruefe('Vorgabe: «Bearbeiten» gewählt (aria-selected), die anderen nicht', await p.evaluate(() => [...document.querySelectorAll('.lsp6-sbtn')].map((x) => x.getAttribute('data-sicht') + ':' + x.getAttribute('aria-selected')).join(',')) === 'bearbeiten:true,druck:false,produkt:false');
  pruefe('Bearbeiten: Bühne sichtbar, Canvas verborgen, data-ansicht=bearbeiten', await p.locator('.lsp6-stagewrap').isVisible() && await p.locator('.lsp6-pvwrap').isHidden() && (await p.locator('.lsp6-stage').getAttribute('data-ansicht')) === 'bearbeiten');
  pruefe('Bearbeiten: kein Vorhang, der Link «Ganze Vorlage zeigen» ist durch die Zoomknöpfe ersetzt', await p.locator('.lsp6-veil:visible').count() === 0 && await p.locator('.lsp6-meta .lsp6-linkbtn').isHidden() && await p.locator('.lsp6-zoom').isVisible());
  pruefe('Bearbeiten: Hinweiszeile unter den Reitern', /Produktfoto/.test(await p.locator('[data-feld="sichtnote"]').innerText()));
  pruefe('Reiterleiste ist ein tablist mit role=tab', await p.locator('[data-feld="sicht"][role="tablist"] [role="tab"]').count() === 3);
  const hoch = await p.locator('.lsp6-sbtn').evaluateAll((e) => e.map((x) => x.getBoundingClientRect().height));
  pruefe('Reiter mindestens 44 px hoch', hoch.every((h) => h >= 44), hoch.join(','));
  pruefe('drei Reiter: kompakte Schrift und enge Füllung (data-anzahl=3), damit sie am Handy nebeneinander passen', await p.evaluate(() => { const g = document.querySelector('[data-feld="sicht"]'), b = document.querySelector('.lsp6-sbtn'); const c = getComputedStyle(b); return g.getAttribute('data-anzahl') === '3' && c.paddingLeft === '6px' && c.fontSize === '12.5px'; }));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
  // alle anderen Fälle: kein Reiter «Druckversion» und kein Produkt-Bearbeiten
  const falle = [
    ['Tasse 19 (Zylinder)', T19, 'Bearbeiten|Vorschau'],
    ['Poster 268 (Papier)', 'karte=268&vorschau=268&bearbeiten=1', 'Bearbeiten|Vorschau'],
    ['Kappe 206 (Stickerei, Hinweis)', 'karte=206&vorschau=206&bearbeiten=1', 'Bearbeiten|Vorschau'],
    ['Allover-Hoodie 388 (Rundum, Hinweis)', 'karte=388&vorschau=388&bearbeiten=1', 'Bearbeiten|Vorschau'],
    ['Modell 1592 (feste Stofffarbe, Hinweis)', 'karte=1592&shop=1001:50079,1002:50077,1003:50082&vorschau=1592&bearbeiten=1&varianten=1001:Black,1002:White,1003:DarkGrey', 'Bearbeiten|Vorschau'],
  ];
  for (const [name, q, soll] of falle) {
    const t = await oeffnen(b, srv, q);
    await sichtWarten(t.page);
    const x = await tabsText(t.page);
    pruefe(`${name}: Reiter ${soll}`, x.join('|') === soll, x.join('|'));
    pruefe(`${name}: «Bearbeiten» zeigt die Bühne von 6.3.1 (kein Produktbild, Vorhang vorhanden)`, (await t.page.locator('.lsp6-stage').getAttribute('data-ansicht')) === 'druck' && await t.page.locator('.lsp6-zoom').isHidden() && !(await t.page.evaluate(() => window.LSPOD6.editors[0].produktBuehne())));
    pruefe(`${name}: kein Reiter «Druckversion» (wäre identisch)`, !x.includes('Druckversion'));
    pruefe(`${name}: keine Seitenfehler`, t.fehler.length === 0, t.fehler.join(' | '));
    await t.schliessen();
  }
  // ohne Vorschaudaten, mit 0 und mit angebot
  const o = await oeffnen(b, srv, 'karte=71&' + SHOP71 + '&bearbeiten=1');
  pruefe('ohne Vorschaudaten: keine Reiter, Bühne wie 6.3.1, der Link «Ganze Vorlage zeigen» da', !(await gruppeSichtbar(o.page)) && await o.page.locator('.lsp6-meta .lsp6-linkbtn').isVisible() && await o.page.locator('.lsp6-zoom').isHidden());
  await o.schliessen();
  const z = await oeffnen(b, srv, T71.replace('bearbeiten=1', 'bearbeiten=0'));
  await sichtWarten(z.page);
  pruefe('data-bearbeiten=0: zwei Schalter «Druckfläche | Auf dem Produkt» wie 6.3.1, kein Knoten «bearbeiten»', (await z.page.locator('.lsp6-sbtn').allInnerTexts()).join('|') === 'Druckfläche|Auf dem Produkt' && await z.page.locator('[data-sicht="bearbeiten"]').count() === 0 && (await z.page.locator('.lsp6-stage').getAttribute('data-ansicht')) === 'druck');
  pruefe('data-bearbeiten=0: role=group mit aria-pressed (kein tablist)', await z.page.locator('[data-feld="sicht"][role="group"]').count() === 1 && (await z.page.locator('.lsp6-sbtn[data-sicht="druck"]').getAttribute('aria-pressed')) === 'true');
  await z.schliessen();
  // Schalter in der Schnittstelle: 0 und «aus» schalten «Bearbeiten auf dem Produkt» ab, 1 und angebot lassen es zu
  // (Fund: ein Rollout, der «false», «off», «nein» oder «no» schreibt, schaltete die neue Ansicht still ein; Gross- und Kleinschreibung und Leerzeichen zählen nicht)
  for (const [wert, soll, modus] of [['0', false, 'aus'], ['aus', false, 'aus'], ['false', false, 'aus'], ['off', false, 'aus'], ['nein', false, 'aus'], ['no', false, 'aus'], ['OFF', false, 'aus'], ['%20False%20', false, 'aus'], ['1', true, 'start'], ['ja', true, 'start'], ['angebot', true, 'angebot'], ['Angebot', true, 'angebot']]) {
    const m = await oeffnen(b, srv, T71.replace('bearbeiten=1', 'bearbeiten=' + wert));
    await sichtWarten(m.page);
    const r = await m.page.evaluate(() => { const ed = window.LSPOD6.editors[0]; return { modus: ed.bearbeitenModus, moeglich: ed.produktfotoMoeglich(ed.st.aktiv), tabs: [...document.querySelectorAll('.lsp6-sbtn')].filter((x) => !x.hidden).map((x) => x.textContent.trim()).join('|') }; });
    pruefe(`data-bearbeiten=${wert}: Modus «${modus}», Produktfoto-Tor ${soll ? 'offen' : 'zu'} (auch in der Schnittstelle), Reiter ${soll ? 'Bearbeiten|Druckversion|Vorschau' : 'Druckfläche|Auf dem Produkt'}`, r.modus === modus && r.moeglich === soll && r.tabs === (soll ? 'Bearbeiten|Druckversion|Vorschau' : 'Druckfläche|Auf dem Produkt'), JSON.stringify(r));
    await m.schliessen();
  }
  const a = await oeffnen(b, srv, T71.replace('bearbeiten=1', 'bearbeiten=angebot'));
  await sichtWarten(a.page);
  pruefe('data-bearbeiten=angebot: drei Reiter, Start in «Druckversion»', (await tabsText(a.page)).join('|') === 'Bearbeiten|Druckversion|Vorschau' && (await sicht(a.page)) === 'druck' && (await a.page.locator('.lsp6-stage').getAttribute('data-ansicht')) === 'druck');
  await a.schliessen();
  const l = await oeffnen(b, srv, 'modus=legacy6&bearbeiten=1');
  pruefe('v5-Modus (ohne Karte): keine Reiter, Bühne wie 6.3.1, Ansicht «druck»', !(await gruppeSichtbar(l.page)) && (await sicht(l.page)) === 'druck');
  await l.schliessen();
});

szenario('reiter-a11y', true, async (b, srv) => {
  const s = await oeffnen(b, srv, T71);
  const p = s.page;
  await sichtWarten(p);
  const attr = await p.evaluate(() => [...document.querySelectorAll('.lsp6-sbtn')].map((x) => ({ t: x.getAttribute('tabindex'), sel: x.getAttribute('aria-selected'), c: x.getAttribute('aria-controls'), vorhanden: !!document.getElementById(x.getAttribute('aria-controls')) })));
  pruefe('roving tabindex: nur der gewählte Reiter ist per Tab erreichbar', attr.map((x) => x.t).join(',') === '0,-1,-1' && attr.filter((x) => x.sel === 'true').length === 1);
  pruefe('aria-controls zeigt auf ein vorhandenes Feld (Bühne oder Produktansicht)', attr.every((x) => x.vorhanden), JSON.stringify(attr));
  const farben = await p.evaluate(() => [...document.querySelectorAll('.lsp6-sbtn')].map((x) => getComputedStyle(x).backgroundColor));
  pruefe('der gewählte Reiter sieht anders aus als die übrigen (Hintergrund)', farben[0] !== farben[1] && farben[1] === farben[2], JSON.stringify(farben));
  await p.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').focus();
  await p.keyboard.press('ArrowRight');
  pruefe('Pfeil rechts: Fokus auf «Druckversion», noch nicht gewählt', await p.evaluate(() => document.activeElement.getAttribute('data-sicht')) === 'druck' && (await sicht(p)) === 'bearbeiten');
  await p.keyboard.press('Enter');
  pruefe('nach der Wahl wandert der Tabindex mit (nur der gewählte Reiter ist per Tab erreichbar: -1,0,-1)', (await p.evaluate(() => [...document.querySelectorAll('.lsp6-sbtn')].map((x) => x.getAttribute('tabindex')).join(','))) === '-1,0,-1');
  pruefe('Enter wählt: Druckversion, aria-selected und Live-Meldung', (await sicht(p)) === 'druck' && (await p.locator('.lsp6-sbtn[data-sicht="druck"]').getAttribute('aria-selected')) === 'true' && /Druckversion/.test(await p.locator('[data-feld="sichtlive"]').innerText()));
  pruefe('Druckversion: Hinweis «So wird die Druckdatei gedruckt», Vorhang sichtbar, kein Zoom-Knopf', /So wird die Druckdatei/.test(await p.locator('[data-feld="sichtnote"]').innerText()) && await p.locator('.lsp6-veil:visible').count() === 4 && await p.locator('.lsp6-zoom').isHidden());
  await p.keyboard.press('End');
  await p.keyboard.press('Space');
  pruefe('Ende + Leertaste: Vorschau gewählt', (await sicht(p)) === 'produkt');
  await p.keyboard.press('Home');
  pruefe('Pos1: Fokus auf «Bearbeiten»', await p.evaluate(() => document.activeElement.getAttribute('data-sicht')) === 'bearbeiten');
  const fokus = await p.evaluate(() => { const b0 = document.querySelector('.lsp6-sbtn'); b0.focus(); return /focus-visible/.test([...document.styleSheets].map((ss) => [...ss.cssRules].map((r) => r.cssText).join('')).join('')); });
  pruefe('Fokusring (focus-visible) ist definiert', fokus);
  pruefe('kein Gedankenstrich in der Oberfläche', !/—/.test(await p.locator('.lsp6').innerText()));
  await s.schliessen();
  // englisch
  const e = await oeffnen(b, srv, T71 + '&lang=en');
  await sichtWarten(e.page);
  pruefe('englisch: Edit | Print file | Preview', (await tabsText(e.page)).join('|') === 'Edit|Print file|Preview', (await tabsText(e.page)).join('|'));
  pruefe('englisch: Zoomknöpfe und Stufe', (await e.page.locator('.lsp6-zoom button').allInnerTexts()).join('|') === 'Zoom −|Zoom +' && /Product/.test(await e.page.locator('[data-feld="zoomstufe"]').innerText()));
  await e.schliessen();
  // Hinweise der Vorschau nennen den Namen der Bühnenansicht: Stickerei (2 Reiter) «Bearbeiten», T-Shirt mit fester Farbe (3 Reiter) «Druckversion»
  const k = await oeffnen(b, srv, 'karte=206&vorschau=206&bearbeiten=1');
  await sichtWarten(k.page);
  await k.page.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  const hk = await k.page.locator('[data-feld="produktinfo"]').innerText();
  pruefe('Stickerei: der Hinweis nennt die Ansicht «Bearbeiten» (es gibt keine «Druckfläche» mehr)', /Ansicht «Bearbeiten»/.test(hk) && !/Druckfläche»/.test(hk), hk.slice(-80));
  await k.schliessen();
  const f = await oeffnen(b, srv, 'karte=1592&shop=1001:50079,1002:50077,1003:50082&vorschau=1592&bearbeiten=1&varianten=1001:Black,1002:White,1003:DarkGrey');
  await sichtWarten(f.page);
  await f.page.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  pruefe('feste Stofffarbe (Modell 1592, nur Bearbeiten und Vorschau): Hinweis nennt «Bearbeiten»', /Ansicht «Bearbeiten»/.test(await f.page.locator('[data-feld="produktinfo"]').innerText()));
  await f.schliessen();
});

szenario('tastatur-ansicht', true, async (b, srv) => {
  // Schlussprüfung 09.11.: Pfeiltasten, Entf und Rück auf den neuen Knöpfen (Reiter, Zoom) dürfen die gewählte Ebene weder verschieben noch löschen; die Reiter-Tastenfolge lässt genau einen Tab-Stopp
  const s = await oeffnen(b, srv, T71);
  const p = s.page;
  await sichtWarten(p);
  await textHinzufuegen(p, 'Hallo');
  const zustand = () => p.evaluate(() => { const ed = window.LSPOD6.editors[0]; const l = ed.st.ebenen[ed.st.aktiv]; return { n: l.length, cx: l[0] && l[0].cx, cy: l[0] && l[0].cy, sel: ed.st.sel }; });
  const vor = await zustand();
  pruefe('Ausgangslage: eine Textebene ist gewählt', vor.n === 1 && vor.sel != null, JSON.stringify(vor));
  await p.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').focus();
  for (const taste of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) await p.keyboard.press(taste);
  const nachPfeilen = await zustand();
  pruefe('Pfeiltasten auf den Reitern bewegen den Fokus, nicht die gewählte Ebene', nachPfeilen.cx === vor.cx && nachPfeilen.cy === vor.cy && nachPfeilen.n === 1, JSON.stringify(nachPfeilen));
  const ti = await p.evaluate(() => [...document.querySelectorAll('.lsp6-sbtn')].map((x) => x.getAttribute('tabindex')));
  pruefe('nach Pfeiltasten ist genau ein Reiter Tab-Stopp (Roving-Tabindex)', ti.filter((x) => x === '0').length === 1 && ti.filter((x) => x === '-1').length === ti.length - 1, ti.join(','));
  await p.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').focus();
  await p.keyboard.press('Delete'); await p.keyboard.press('Backspace');
  pruefe('Entf und Rück auf einem Reiter löschen die gewählte Ebene nicht', (await zustand()).n === 1);
  const zoomKnopf = p.locator('.lsp6-zoom button[data-zoom="plus"]');
  await zoomKnopf.focus();
  for (const taste of ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight']) await p.keyboard.press(taste);
  const nachZoom = await zustand();
  pruefe('Entf, Rück und Pfeile auf einem Zoom-Knopf lassen die gewählte Ebene unverändert', nachZoom.n === 1 && nachZoom.cx === vor.cx && nachZoom.cy === vor.cy, JSON.stringify(nachZoom));
  // Strg+Z bleibt auch mit Fokus auf den neuen Knöpfen erreichbar (Rückgängig)
  const ebenenJson = () => p.evaluate(() => { const ed = window.LSPOD6.editors[0]; return JSON.stringify(ed.st.ebenen[ed.st.aktiv].map((e) => [e.id, e.text, e.cx, e.cy])); });
  const vorUndo = await ebenenJson();
  await p.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').focus();
  await p.keyboard.press('Control+z');
  const nachUndo = await ebenenJson();
  pruefe('Strg+Z mit Fokus auf einem Reiter macht den letzten Schritt rückgängig (die Ebenen ändern sich)', nachUndo !== vorUndo);
  await p.keyboard.press('Control+y');
  pruefe('Strg+Y mit Fokus auf einem Reiter stellt den Schritt wieder her (gleiche Ebenen wie vorher)', (await ebenenJson()) === vorUndo);
  // Gegenprobe: dieselben Tasten auf der Bühne wirken weiter wie in 6.3.1 (Pfeil verschiebt, Entf löscht)
  await p.locator('.lsp6-karte, .lsp6').first().evaluate((x) => x.focus && x.focus());
  await p.evaluate(() => { const bt = document.activeElement; if (bt && bt.blur) bt.blur(); });
  await p.locator('.lsp6-stage').click({ position: { x: 5, y: 5 }, force: true });
  await p.locator('[data-lid]').first().click({ force: true });
  const vorBuehne = await zustand();
  await p.keyboard.press('ArrowRight');
  pruefe('Pfeil nach rechts bei Fokus auf der Bühne verschiebt die gewählte Ebene weiter (wie 6.3.1)', (await zustand()).cx > vorBuehne.cx, JSON.stringify(await zustand()));
  await p.keyboard.press('Delete');
  pruefe('Entf bei Fokus auf der Bühne löscht die gewählte Ebene weiter (wie 6.3.1)', (await zustand()).n === 0);
  // Pos1/Ende auf den Reitern scrollen die Seite nicht (preventDefault)
  await p.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').focus();
  await p.evaluate(() => window.scrollTo(0, 0));
  const y0 = await p.evaluate(() => window.scrollY);
  await p.keyboard.press('End');
  await p.waitForTimeout(300);
  // ohne preventDefault scrollte «Ende» die Seite um rund 745 px (gemessen am Mutanten); das Nachziehen des Fokus selbst verschiebt höchstens wenige Pixel
  pruefe('Ende auf einem Reiter scrollt die Seite nicht (höchstens das Nachziehen des Fokus, unter 100 px)', Math.abs((await p.evaluate(() => window.scrollY)) - y0) < 100, String(await p.evaluate(() => window.scrollY)));
  await p.keyboard.press('Home');
  await p.waitForTimeout(300);
  pruefe('Pos1 auf einem Reiter scrollt die Seite nicht (unter 100 px)', Math.abs((await p.evaluate(() => window.scrollY)) - y0) < 100);
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

szenario('karten-css-haertung', true, async (b, srv) => {
  // Schlussprüfung 09.11.: ein Farbwert aus den Kartendaten darf kein fremdes CSS einschleusen (position:fixed über die ganze Seite)
  const HOSTIL = 'red;position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:2147483647';
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const bildRoute = (r) => r.fulfill({ status: 200, contentType: 'image/png', body: geisterPng(), headers: { 'access-control-allow-origin': '*' } });
  await page.route('https://files.cdn.printful.com/**', bildRoute);
  await page.route('https://cdn.shopify.com/**', bildRoute);
  await page.route('**/karten/71.json*', async (r) => {
    const res = await r.fetch(); const k = await res.json();
    const tausche = (o) => { if (o && typeof o === 'object') for (const key of Object.keys(o)) { if (key === 'hintergrundFarbe') o[key] = HOSTIL; else if (key === 'hintergrundUrl') o[key] = null; else tausche(o[key]); } };
    tausche(k); delete k.farben;
    r.fulfill({ response: res, body: JSON.stringify(k) });
  });
  const fehler = []; page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto(`${srv.url}/mock.html?${T71}`, { waitUntil: 'domcontentloaded' });
  await editorBereit(page);
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => { const g = document.querySelector('.lsp6-grund'); return { pos: g && getComputedStyle(g).position, w: g && g.getBoundingClientRect().width, hidden: g && g.hidden, fenster: innerWidth, hoehe: g && g.getBoundingClientRect().height }; });
  pruefe('Farbwert mit eingeschleustem CSS: die Grundfläche bleibt absolut in der Bühne (nicht fixed)', r.pos !== 'fixed', JSON.stringify(r));
  pruefe('Farbwert mit eingeschleustem CSS: die Grundfläche ist nicht fensterbreit', r.hidden || r.w < r.fenster - 50, JSON.stringify(r));
  pruefe('keine Seitenfehler', fehler.length === 0, fehler.join(' | '));
  await ctx.close();
});

// ── 2. Fenster und Zoom ─────────────────────────────────────────────────────────────────────────
szenario('fenster-zoom', true, async (b, srv) => {
  for (const [bez, opt] of [['Rechner', PC], ['Handy 390', MOBIL]]) {
    const s = await oeffnen(b, srv, SHIRT_Q(), opt);
    const p = s.page;
    await sichtWarten(p);
    const g = await geoAktiv(p);
    pruefe(`${bez}: Vorgabe-Stufe ist «Produkt» (35 % Rand)`, await p.locator('[data-feld="zoomstufe"]').innerText() === 'Produkt' && await p.evaluate(() => window.LSPOD6.editors[0].st.zoom) === 'produkt');
    lagePruefen(`${bez} Stufe Produkt`, await lage(p), sollLage(g.vl, 'produkt'));
    if (bez === 'Handy 390') {
      const l = await lage(p);
      pruefe('Handy: die Druckfläche füllt mindestens 45 % der Bühnenbreite und 160 px', l.hb >= 0.45 - 0.005 && l.hb * l.bw >= 160, `${(l.hb * 100).toFixed(1)} % = ${(l.hb * l.bw).toFixed(0)} px`);
    }
    await textHinzufuegen(p, 'Hallo');
    const vorher = await ebenen(p);
    await p.getByRole('button', { name: 'Zoom −' }).click();
    pruefe(`${bez}: Zoom − → «Ganzes Produkt», Knopf Zoom − gesperrt (aria-disabled)`, await p.locator('[data-feld="zoomstufe"]').innerText() === 'Ganzes Produkt' && (await p.getByRole('button', { name: 'Zoom −' }).getAttribute('aria-disabled')) === 'true');
    lagePruefen(`${bez} Stufe Ganzes Produkt`, await lage(p), sollLage(g.vl, 'vorlage'));
    await p.getByRole('button', { name: 'Zoom −' }).click({ force: true });
    pruefe(`${bez}: am Ende bleibt es bei «Ganzes Produkt»`, await p.evaluate(() => window.LSPOD6.editors[0].st.zoom) === 'vorlage');
    await p.getByRole('button', { name: 'Zoom +' }).click();
    await p.getByRole('button', { name: 'Zoom +' }).click();
    pruefe(`${bez}: zweimal Zoom + → «Druckfläche», Knopf Zoom + gesperrt`, await p.locator('[data-feld="zoomstufe"]').innerText() === 'Druckfläche' && (await p.getByRole('button', { name: 'Zoom +' }).getAttribute('aria-disabled')) === 'true');
    lagePruefen(`${bez} Stufe Druckfläche`, await lage(p), sollLage(g.vl, 'flaeche'));
    await p.getByRole('button', { name: 'Zoom +' }).click({ force: true });
    pruefe(`${bez}: am Ende bleibt es bei «Druckfläche»`, await p.evaluate(() => window.LSPOD6.editors[0].st.zoom) === 'flaeche');
    const nachher = await ebenen(p);
    pruefe(`${bez}: die Ebenen sind nach allen Zoomstufen unverändert`, JSON.stringify(vorher) === JSON.stringify(nachher), JSON.stringify([vorher, nachher]));
    pruefe(`${bez}: die Ebene liegt in jeder Stufe an derselben Stelle der Druckfläche (Mitte der Fläche)`, await p.evaluate(() => { const h = document.querySelector('.lsp6-host').getBoundingClientRect(), l2 = document.querySelector('.lsp6-layer').getBoundingClientRect(); const e = window.LSPOD6.editors[0].st.ebenen.front[0]; return Math.abs((l2.left + l2.width / 2 - h.left) / h.width - e.cx) < 0.01; }));
    await p.getByRole('button', { name: 'Zoom −' }).click(); await p.getByRole('button', { name: 'Zoom −' }).click({ force: true });
    pruefe(`${bez}: Tastatur: Zoom + per Enter`, await (async () => { await p.getByRole('button', { name: 'Zoom +' }).focus(); await p.keyboard.press('Enter'); return (await p.evaluate(() => window.LSPOD6.editors[0].st.zoom)) === 'produkt'; })());
    pruefe(`${bez}: Zoom-Knöpfe mindestens 44 px, Zustand als Live-Meldung`, (await p.locator('.lsp6-zoom button').evaluateAll((e) => e.every((x) => x.getBoundingClientRect().height >= 44 && x.getBoundingClientRect().width >= 44))) && /Produkt/.test(await p.locator('[data-feld="zoomlive"]').textContent()));
    // Druckversion: der Link von 6.3.1, kein Zoomknopf; Zoom zurück in Bearbeiten hält die Stufe
    await p.locator('.lsp6-sbtn[data-sicht="druck"]').click();
    lagePruefen(`${bez} Druckversion`, await lage(p), sollLage(g.vl, 'flaeche'));
    pruefe(`${bez}: Druckversion hat den Link «Ganze Vorlage zeigen», keine Zoomknöpfe`, await p.locator('.lsp6-meta .lsp6-linkbtn').isVisible() && await p.locator('.lsp6-zoom').isHidden());
    await p.evaluate(() => window.LSPOD6.editors[0].zoomSetzen('vorlage'));
    pruefe(`${bez}: in der Druckversion ändert die Schnittstelle den Zoom der Produktbühne nicht (Stufe bleibt «produkt»)`, await p.evaluate(() => window.LSPOD6.editors[0].st.zoom) === 'produkt');
    await p.locator('.lsp6-meta .lsp6-linkbtn').click();
    lagePruefen(`${bez} Druckversion, ganze Vorlage`, await lage(p), sollLage(g.vl, 'vorlage'));
    await p.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').click();
    lagePruefen(`${bez} zurück in Bearbeiten (Stufe Produkt)`, await lage(p), sollLage(g.vl, 'produkt'));
    pruefe(`${bez}: kein seitliches Scrollen, keine Seitenfehler`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1) && s.fehler.length === 0, s.fehler.join(' | '));
    await s.schliessen();
  }
  // lange, schmale Flächen: das Fenster fällt nie unter den 10-%-Rand von 'flaeche' (Eigenrechnung gegen die Hilfsfunktion des Editors)
  const s2 = await oeffnen(b, srv, T71);
  const r = await s2.page.evaluate(() => {
    const H = window.LSPOD6.hilfen;
    const vl = { vorlageBreite: 3000, vorlageHoehe: 3000, flaecheLinks: 300, flaecheOben: 1200, flaecheBreite: 2400, flaecheHoehe: 300 };
    return { p: H.sichtfenster(vl, 'produkt'), f: H.sichtfenster(vl, 'flaeche'), rand: H.BEARBEITEN_RAND, min: H.BEARBEITEN_MIN_ANTEIL };
  });
  pruefe('Konstanten BEARBEITEN_RAND 0,35 und BEARBEITEN_MIN_ANTEIL 0,45', r.rand === 0.35 && r.min === 0.45, JSON.stringify([r.rand, r.min]));
  pruefe('Streifen 8:1: das Fenster «Produkt» enthält das Fenster «Druckfläche»', r.p.x <= r.f.x + 1e-6 && r.p.y <= r.f.y + 1e-6 && r.p.x + r.p.w >= r.f.x + r.f.w - 1e-6 && r.p.y + r.p.h >= r.f.y + r.f.h - 1e-6, JSON.stringify(r));
  await s2.schliessen();
});

// ── 3. Fund A: Theme-Regel img{max-width:100%} ──────────────────────────────────────────────────
szenario('theme-regel', true, async (b, srv) => {
  for (const [bez, opt] of [['Rechner', PC], ['Handy', MOBIL]]) {
    const s = await oeffnen(b, srv, SHIRT_Q(), opt);
    const p = s.page;
    await sichtWarten(p);
    const g = await geoAktiv(p);
    for (const art of ['bearbeiten', 'druck']) {
      await p.locator(`.lsp6-sbtn[data-sicht="${art}"]`).click();
      const l = await lage(p), soll = sollLage(g.vl, art === 'bearbeiten' ? 'produkt' : 'flaeche');
      const px = await p.evaluate(() => { const t = document.querySelector('.lsp6-tpl').getBoundingClientRect(); return { w: t.width, h: t.height }; });
      nahe(`${bez} ${art}: Vorlagenbild so breit wie Bühne × Inline-Prozent (nicht auf die Bühne geklemmt)`, px.w, l.bw * soll.tb, 1.5);
      nahe(`${bez} ${art}: Vorlagenbild so hoch wie Bühne × Inline-Prozent`, px.h, l.bh * soll.th, 1.5);
      pruefe(`${bez} ${art}: das Vorlagenbild ist breiter als die Bühne (Regel max-width:none wirkt)`, px.w > l.bw * 1.2, `${px.w} gegen ${l.bw}`);
      nahe(`${bez} ${art}: das Vorlagenbild bleibt quadratisch (nicht gequetscht)`, px.w / px.h, g.vl.vorlageBreite / g.vl.vorlageHoehe, 0.01);
    }
    await s.schliessen();
  }
  // ein Modell mit Textur (Variante ohne Farbtabelle): auch das Hintergrundbild bleibt ungequetscht
  const t = await oeffnen(b, srv, T71.replace('1001:4012', '1001:4020'));   // Test-Karte 71 mit Farbtabelle: schwarze Variante
  await sichtWarten(t.page);
  const bg = await t.page.evaluate(() => { const i = document.querySelector('.lsp6-bg'); const st = document.querySelector('.lsp6-stage').getBoundingClientRect(); const r = i.getBoundingClientRect(); return { sichtbar: !i.hidden, w: r.width, h: r.height, bw: st.width }; });
  pruefe('Modell mit Textur: das Hintergrundbild ist so breit wie das Vorlagenbild und quadratisch', !bg.sichtbar || Math.abs(bg.w - bg.h) < 1.5, JSON.stringify(bg));
  await t.schliessen();
});

// ── 4. Schichtfolge ─────────────────────────────────────────────────────────────────────────────
szenario('schichten', true, async (b, srv) => {
  // (a) Vorlagenbild ÜBER dem Motiv: Nachbau des Geisterbildes mit dunkler Falte (Alpha 70) in der Mitte; ein deckend weisses Motiv auf schwarzem Stoff zeigt die Falte nur, wenn das Vorlagenbild darüber liegt
  const s = await oeffnen(b, srv, T71.replace('4012', '4020') + '&varianten=1001:Schwarz,1002:Weiss', { ...GEISTER });
  const p = s.page;
  await sichtWarten(p);
  await p.evaluate(() => { const st = document.createElement('style'); st.textContent = '.lsp6-frame,.lsp6-tag,.lsp6-readout,.lsp6-chrome-host,.lsp6-guide{visibility:hidden!important}'; document.head.appendChild(st); });
  await motivHinzu(p, '#ffffff');
  await bilderGeladen(p);
  const motivId = await p.evaluate(() => window.LSPOD6.editors[0].st.sel);
  await p.evaluate(() => window.LSPOD6.editors[0].waehlen(null));
  const rg = await p.evaluate(() => { const st = document.querySelector('.lsp6-stage').getBoundingClientRect(), t = document.querySelector('.lsp6-tpl').getBoundingClientRect(), h = document.querySelector('.lsp6-host').getBoundingClientRect(); return { tl: t.left - st.left, tw: t.width, hy: h.top - st.top + h.height / 2 }; });
  const bildStueck = async (fx) => {   // Farbe eines Pixels: x = Bruchteil der Breite des Vorlagenbildes, y = Mitte der Druckfläche (dort liegt das Motiv)
    const png = await p.locator('.lsp6-stage').screenshot();
    return p.evaluate(async ([b64, px, py]) => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return Array.from(x.getImageData(Math.round(px), Math.round(py), 1, 1).data); }, [png.toString('base64'), rg.tl + fx * rg.tw, rg.hy]);
  };
  const falte = await bildStueck(0.5), glatt = await bildStueck(0.44);
  pruefe('Schichtfolge: das Vorlagenbild liegt über dem Motiv (die Falte scheint durch das weisse Motiv: ≤ 215)', falte[0] <= 215 && falte[0] >= 150, JSON.stringify(falte));
  pruefe('Schichtfolge: neben der Falte ist das Motiv nur leicht abgedunkelt (Schatten Alpha 22), nicht deckend weiss', glatt[0] >= 215 && glatt[0] <= 250, JSON.stringify(glatt));
  const z = await p.evaluate(() => { const g = (s) => getComputedStyle(document.querySelector(s)).zIndex; return { host: g('.lsp6-host'), tpl: g('.lsp6-tpl'), chrome: g('.lsp6-chrome-host'), frame: g('.lsp6-frame'), tag: g('.lsp6-tag') }; });
  pruefe('Stapelfolge: Host (Motiv) < Vorlagenbild < Rahmen und Etikett < Griffe', Number(z.host) < Number(z.tpl) && Number(z.tpl) < Number(z.frame) && Number(z.frame) < Number(z.chrome) && Number(z.tag) < Number(z.chrome), JSON.stringify(z));
  // (b) Motiv beschnitten: Mitte der Ebene auf den linken Rand der Druckfläche, die linke Hälfte liegt ausserhalb und darf nicht sichtbar sein
  await p.evaluate((i) => window.LSPOD6.editors[0].waehlen(i), motivId);
  await feldSetzen(p, 'X (cm)', 0);
  await p.evaluate(() => window.LSPOD6.editors[0].waehlen(null));
  await bilderGeladen(p);
  const png = await p.locator('.lsp6-stage').screenshot();
  const h = await rect(p, '.lsp6-host'), sr = await rect(p, '.lsp6-stage');
  const aussen = await p.evaluate(async ([x, y]) => { const el = document.elementFromPoint(x, y); return el ? el.className : null; }, [h.x - 10, h.y + h.h / 2]);
  const pix = (px, py) => p.evaluate(async ([b64, x, y]) => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const cx = c.getContext('2d'); cx.drawImage(i, 0, 0); return Array.from(cx.getImageData(Math.round(x), Math.round(y), 1, 1).data); }, [png.toString('base64'), px, py]);
  const innen = await pix(h.x + 12 - sr.x, h.y + h.h * 0.42 - sr.y), draussen = await pix(h.x - 12 - sr.x, h.y + h.h * 0.42 - sr.y);
  pruefe('Beschnitt: innerhalb der Druckfläche ist das weisse Motiv zu sehen (heller als der schwarze Stoff)', innen[0] >= 180, JSON.stringify(innen));
  pruefe('Beschnitt: ausserhalb der Druckfläche zeigt der Stoff, nicht das Motiv (dunkel)', draussen[0] <= 60, JSON.stringify([draussen, aussen]));
  pruefe('kein Vorhang in Bearbeiten', await p.locator('.lsp6-veil:visible').count() === 0);
  await s.schliessen();

  // (c) Griffe über dem Vorlagenbild und nie beschnitten: ein deckend weisses Vorlagenbild verdeckt das Motiv ganz, Löschknopf (rot) und Griff (schwarz) bleiben sichtbar, auch an der Ecke der Fläche
  const t = await oeffnen(b, srv, T71, { ...WEISS_DECKEND });
  const q = t.page;
  await sichtWarten(q);
  await q.evaluate(() => { const st = document.createElement('style'); st.textContent = '.lsp6-frame,.lsp6-tag,.lsp6-readout{visibility:hidden!important}'; document.head.appendChild(st); });
  const id = await motivHinzu(q, '#0000ff');
  await bilderGeladen(q);
  await feldSetzen(q, 'X (cm)', 0); await feldSetzen(q, 'Y (cm)', 0);
  await q.evaluate((i) => window.LSPOD6.editors[0].waehlen(i), id);
  await q.locator('.lsp6-stage').scrollIntoViewIfNeeded();
  const sr2 = await rect(q, '.lsp6-stage'), del = await rect(q, '.lsp6-del'), gr = await rect(q, '.lsp6-handle'), host = await rect(q, '.lsp6-host');
  const png2 = await q.locator('.lsp6-stage').screenshot();
  const pix2 = (px, py) => q.evaluate(async ([b64, x, y]) => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const cx = c.getContext('2d'); cx.drawImage(i, 0, 0); return Array.from(cx.getImageData(Math.round(x), Math.round(y), 1, 1).data); }, [png2.toString('base64'), px, py]);
  const cDel = await pix2(del.x + del.w / 2 - 9 - sr2.x, del.y + del.h / 2 - sr2.y), cGriff = await pix2(gr.x + gr.w / 2 - 9 - sr2.x, gr.y + gr.h / 2 - sr2.y), cMotiv = await pix2(host.x + 8 - sr2.x, host.y + 8 - sr2.y);
  pruefe('Griffe: der Löschknopf (rot) liegt über dem deckend weissen Vorlagenbild', cDel[0] >= 150 && cDel[1] <= 80 && cDel[2] <= 100, JSON.stringify({ cDel, del, sr2, host }));
  pruefe('Griffe: der Skalieren-Griff (dunkel) liegt über dem Vorlagenbild', cGriff[0] <= 90 && cGriff[1] <= 90, JSON.stringify(cGriff));
  pruefe('das Motiv selbst liegt UNTER dem deckenden Vorlagenbild (Ecke der Fläche ist weiss)', cMotiv[0] >= 240 && cMotiv[1] >= 240 && cMotiv[2] >= 240, JSON.stringify(cMotiv));
  pruefe('Griffe nie beschnitten: Löschknopf liegt links oben ausserhalb der Druckfläche und ist vollständig in der Bühne', del.x < host.x && del.y < host.y && del.x >= sr2.x - 0.5 && del.y >= sr2.y - 0.5, JSON.stringify({ del, host, sr2 }));
  const treffer = await q.evaluate(([x1, y1, x2, y2]) => [document.elementFromPoint(x1, y1), document.elementFromPoint(x2, y2)].map((e) => (e && e.className) || ''), [del.x + del.w / 2, del.y + del.h / 2, gr.x + gr.w / 2, gr.y + gr.h / 2]);
  pruefe('Griffe sind trefferbar: elementFromPoint liefert Löschknopf und Skalieren-Griff', /lsp6-del/.test(treffer[0]) && /lsp6-handle/.test(treffer[1]), JSON.stringify(treffer));
  pruefe('Auswahlrahmen und Griffe stehen in der Schicht über dem Foto (.lsp6-chrome), nicht im beschnittenen Host', await q.evaluate(() => !!document.querySelector('.lsp6-chrome .lsp6-handle') && !document.querySelector('.lsp6-host .lsp6-handle') && !!document.querySelector('.lsp6-chrome .lsp6-sel-frame')));
  await q.locator('.lsp6-sbtn[data-sicht="druck"]').click();
  pruefe('Druckversion: die Griffe sind wieder in der Ebene (Aufbau von 6.3.1), die Schicht ist leer', await q.evaluate(() => !!document.querySelector('.lsp6-layer .lsp6-handle') && document.querySelector('.lsp6-chrome').children.length === 0));
  await q.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').click();
  pruefe('zurück in Bearbeiten: die Griffe ziehen wieder in die Schicht', await q.evaluate(() => !!document.querySelector('.lsp6-chrome .lsp6-handle') && !document.querySelector('.lsp6-layer .lsp6-handle')));
  pruefe('keine Seitenfehler', t.fehler.length === 0, t.fehler.join(' | '));
  await t.schliessen();
  // (d) vorderansicht false: das Vorlagenbild liegt UNTER dem Motiv (wie zeichneFlach)
  const u = await oeffnen(b, srv, T71, { ...WEISS_DECKEND });
  await sichtWarten(u.page);
  await u.page.evaluate(() => { const ed = window.LSPOD6.editors[0]; ed.karte.platzierungen.forEach((pl) => { pl.vorlage.vorderansicht = false; (pl.geometrien || []).forEach((g) => { if (g.vorlage) g.vorlage.vorderansicht = false; }); }); ed.wechseln('front'); ed.sichtSetzen('bearbeiten'); });
  await u.page.locator('.lsp6-sbtn[data-sicht="druck"]').click(); await u.page.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').click();
  const zu = await u.page.evaluate(() => { const g = (s) => getComputedStyle(document.querySelector(s)).zIndex; return { tpl: g('.lsp6-tpl'), host: g('.lsp6-host'), a: document.querySelector('.lsp6-tpl').getAttribute('data-schicht') }; });
  pruefe('vorderansicht false: Vorlagenbild unter dem Host', Number(zu.tpl) < Number(zu.host) && zu.a === 'unten', JSON.stringify(zu));
  await u.schliessen();
});

// ── 5. Ziehen, Skalieren, Drehen: Maus und Touch ────────────────────────────────────────────────
szenario('ebenen-bedienung', true, async (b, srv) => {
  const s = await oeffnen(b, srv, SHIRT_Q(), { ...PC });
  const p = s.page;
  await sichtWarten(p);
  await textHinzufuegen(p, 'Hallo');
  const e0 = (await ebenen(p))[0];
  const h = await rect(p, '.lsp6-host'), l = await rect(p, '.lsp6-layer');
  const cx0 = l.x + l.w / 2, cy0 = l.y + l.h / 2;
  await p.mouse.move(cx0, cy0); await p.mouse.down(); await p.mouse.move(cx0 + 30, cy0 + 20, { steps: 4 }); await p.mouse.move(cx0 + 60, cy0 + 40, { steps: 4 }); await p.mouse.up();
  const e1 = (await ebenen(p))[0];
  pruefe('Ziehen in Bearbeiten zeichnet die Vorschau-Canvas nicht (CSS-Komposition, kein Canvas bei jedem Schritt)', await p.locator('.lsp6-pv').evaluate((c) => !c.getAttribute('data-gezeichnet')));
  nahe('Maus ziehen: cx ändert sich um 60 px / Breite der Druckfläche', e1.cx - e0.cx, 60 / h.w, 0.012);
  nahe('Maus ziehen: cy ändert sich um 40 px / Höhe der Druckfläche', e1.cy - e0.cy, 40 / h.h, 0.012);
  // Skalieren und Drehen am Griff (liegt in der Schicht über dem Foto)
  const g = await rect(p, '.lsp6-handle'), m = await rect(p, '.lsp6-layer');
  const mx = m.x + m.w / 2, my = m.y + m.h / 2, gx = g.x + g.w / 2, gy = g.y + g.h / 2, d0 = Math.hypot(gx - mx, gy - my);
  await p.mouse.move(gx, gy); await p.mouse.down(); await p.mouse.move(mx + (gx - mx) * 1.6, my + (gy - my) * 1.6, { steps: 6 }); await p.mouse.up();
  const e2 = (await ebenen(p))[0];
  nahe('Maus am Griff: Skalierung wächst um den Faktor der Entfernung (1,6)', e2.scale / e1.scale, 1.6, 0.12);
  const g2 = await rect(p, '.lsp6-handle'), m2 = await rect(p, '.lsp6-layer');
  const ax = m2.x + m2.w / 2, ay = m2.y + m2.h / 2, gx2 = g2.x + g2.w / 2, gy2 = g2.y + g2.h / 2, r2 = Math.hypot(gx2 - ax, gy2 - ay), w2 = Math.atan2(gy2 - ay, gx2 - ax);
  await p.mouse.move(gx2, gy2); await p.mouse.down(); await p.mouse.move(ax + r2 * Math.cos(w2 + 0.5), ay + r2 * Math.sin(w2 + 0.5), { steps: 6 }); await p.mouse.up();
  const e3 = (await ebenen(p))[0];
  nahe('Maus am Griff: Drehung um rund 28,6° (0,5 rad)', e3.rot - e2.rot, 0.5 * 180 / Math.PI, 3);
  // Griff und Löschknopf folgen dem Motiv (Rotation) und bleiben auf der Ebene
  const gg = await rect(p, '.lsp6-handle'), dd = await rect(p, '.lsp6-del'), ll = await rect(p, '.lsp6-layer');
  const mid = { x: ll.x + ll.w / 2, y: ll.y + ll.h / 2 }, gm = { x: gg.x + gg.w / 2, y: gg.y + gg.h / 2 }, dm = { x: dd.x + dd.w / 2, y: dd.y + dd.h / 2 };
  nahe('Skalieren-Griff und Löschknopf liegen gegenüber (Spiegelung an der Mitte der Ebene)', Math.hypot(gm.x + dm.x - 2 * mid.x, gm.y + dm.y - 2 * mid.y), 0, 2.5);
  // Tastatur, Rückgängig, Wiederholen
  await p.locator('.lsp6').focus();
  await p.keyboard.press('ArrowRight');
  const e4 = (await ebenen(p))[0];
  nahe('Pfeiltaste rechts: cx wächst um 0,005', e4.cx - e3.cx, 0.005, 0.0011);
  await p.keyboard.press('Control+z'); await p.keyboard.press('Control+z');
  await p.keyboard.press('Control+y');
  pruefe('Rückgängig und Wiederholen laufen in Bearbeiten', (await ebenen(p)).length === 1);
  // Ansichtswechsel: Ebene, Auswahl und Werte bleiben
  const vorW = JSON.stringify(await ebenen(p)), vorSel = await p.evaluate(() => window.LSPOD6.editors[0].st.sel);
  for (const art of ['druck', 'produkt', 'bearbeiten']) { await p.locator(`.lsp6-sbtn[data-sicht="${art}"]`).click(); if (art === 'produkt') await p.waitForTimeout(300); }
  pruefe('Ansichtswechsel hin und her: Ebenen und Auswahl unverändert', JSON.stringify(await ebenen(p)) === vorW && (await p.evaluate(() => window.LSPOD6.editors[0].st.sel)) === vorSel);
  // Zurück in der Ebene (Druckversion) gilt der Rahmen von 6.3.1 wieder (8 px um die Ebene, kein Stil aus der Schicht über dem Foto)
  await p.locator('.lsp6-sbtn[data-sicht="druck"]').click();
  const rahmen = await p.evaluate(() => {
    const f = document.querySelector('.lsp6-layer .lsp6-sel-frame'), l = document.querySelector('.lsp6-layer');
    if (!f) return null;
    // Layoutmasse (offset*) statt Bildschirmrechtecken: die Ebene ist gedreht, dann sind die Rechtecke von Rahmen und Ebene verschieden gross
    return { stil: f.getAttribute('style'), links: f.offsetLeft, oben: f.offsetTop, dw: f.offsetWidth - l.offsetWidth, dh: f.offsetHeight - l.offsetHeight, sichtbar: getComputedStyle(f).display !== 'none' };
  });
  pruefe('Druckversion: der gewählte Rahmen sitzt wieder in der Ebene, ohne Stil aus der Schicht, 8 px Abstand rundum', !!rahmen && !rahmen.stil && rahmen.sichtbar && Math.abs(rahmen.links + 8) <= 0.6 && Math.abs(rahmen.oben + 8) <= 0.6 && Math.abs(rahmen.dw - 16) <= 1.2 && Math.abs(rahmen.dh - 16) <= 1.2, JSON.stringify(rahmen));
  await p.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').click();
  // Das Motiv lässt sich nicht aus der Druckfläche ziehen
  const l5 = await rect(p, '.lsp6-layer');
  await p.mouse.move(l5.x + l5.w / 2, l5.y + l5.h / 2); await p.mouse.down(); await p.mouse.move(h.x - 300, h.y - 300, { steps: 6 }); await p.mouse.up();
  const e6 = (await ebenen(p))[0];
  pruefe('das Motiv bleibt auf der Druckfläche (cx und cy in [0, 1])', e6.cx >= 0 && e6.cx <= 1 && e6.cy >= 0 && e6.cy <= 1 && e6.cx < 0.05, JSON.stringify(e6));
  // Leere Fläche wählt ab
  const hLeer = await rect(p, '.lsp6-host');
  await p.mouse.click(hLeer.x + hLeer.w * 0.9, hLeer.y + hLeer.h * 0.9);
  pruefe('Klick auf die leere Fläche wählt ab, die Griffe verschwinden', (await p.evaluate(() => window.LSPOD6.editors[0].st.sel)) === null && await p.locator('.lsp6-chrome').isHidden());
  // Löschen über den Knopf in der Schicht
  const l7 = await rect(p, '.lsp6-layer');
  await p.mouse.click(l7.x + l7.w / 2, l7.y + l7.h / 2);
  await p.locator('.lsp6-del').click();
  pruefe('Löschknopf (in der Schicht über dem Foto) entfernt die Ebene, keine Reste in der Schicht', (await ebenen(p)).length === 0 && await p.locator('.lsp6-chrome').evaluate((e) => e.children.length === 0 && e.hidden));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

szenario('touch', true, async (b, srv) => {
  const s = await oeffnen(b, srv, SHIRT_Q(), MOBIL);
  const p = s.page;
  await sichtWarten(p);
  await textHinzufuegen(p, 'Hallo');
  const cdp = await s.ctx.newCDPSession(p);
  const touch = async (typ, x, y) => cdp.send('Input.dispatchTouchEvent', { type: typ, touchPoints: typ === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  await p.locator('.lsp6-stage').scrollIntoViewIfNeeded();
  const e0 = (await ebenen(p))[0], h = await rect(p, '.lsp6-host'), l = await rect(p, '.lsp6-layer');
  const cx0 = l.x + l.w / 2, cy0 = l.y + l.h / 2;
  await touch('touchStart', cx0, cy0);
  for (let i = 1; i <= 6; i++) await touch('touchMove', cx0 + 10 * i, cy0 + 6 * i);
  await touch('touchEnd');
  const e1 = (await ebenen(p))[0];
  nahe('Touch: Ziehen verschiebt cx um 60 px / Breite der Druckfläche', e1.cx - e0.cx, 60 / h.w, 0.015);
  nahe('Touch: Ziehen verschiebt cy um 36 px / Höhe der Druckfläche', e1.cy - e0.cy, 36 / h.h, 0.015);
  const g = await rect(p, '.lsp6-handle'), m = await rect(p, '.lsp6-layer');
  const mx = m.x + m.w / 2, my = m.y + m.h / 2, gx = g.x + g.w / 2, gy = g.y + g.h / 2;
  await touch('touchStart', gx, gy);
  for (let i = 1; i <= 6; i++) await touch('touchMove', mx + (gx - mx) * (1 + 0.1 * i), my + (gy - my) * (1 + 0.1 * i));
  await touch('touchEnd');
  const e2 = (await ebenen(p))[0];
  pruefe('Touch am Griff: die Ebene wird grösser (Faktor rund 1,6)', e2.scale / e1.scale > 1.35 && e2.scale / e1.scale < 1.8, String(e2.scale / e1.scale));
  // Wischen ausserhalb der Ebenen scrollt die Seite (touch-action pan-y auf der Bühne)
  pruefe('Bühne lässt das senkrechte Wischen der Seite zu (touch-action: pan-y), die Ebene nimmt alle Gesten (none)', await p.evaluate(() => getComputedStyle(document.querySelector('.lsp6-stage')).touchAction === 'pan-y' && getComputedStyle(document.querySelector('.lsp6-layer')).touchAction === 'none'));
  // Antippen eines kleinen Motivs knapp daneben wählt es in Bearbeiten (Trefferfläche +10 px)
  await p.evaluate(() => window.LSPOD6.editors[0].waehlen(null));
  const kl = await motivHinzu(p, '#00aa00');
  await bilderGeladen(p);
  await feldSetzen(p, 'Breite (cm)', 2);
  await p.evaluate(() => window.LSPOD6.editors[0].waehlen(null));
  const k = await p.evaluate((id) => { const r = document.querySelector(`[data-lid="${id}"]`).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, kl);
  await p.touchscreen.tap(k.x + k.w + 6, k.y + k.h / 2);
  pruefe('Antippen 6 px neben einem kleinen Motiv wählt es in Bearbeiten (Trefferfläche vergrössert)', (await p.evaluate(() => window.LSPOD6.editors[0].st.sel)) === kl, JSON.stringify(k));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 6. Handy: Bedienung bei 390, 360 und 320 px ─────────────────────────────────────────────────
szenario('handy-bedienung', true, async (b, srv) => {
  for (const breite of [390, 360, 320]) {
    const s = await oeffnen(b, srv, SHIRT_Q(), { breite, hoehe: 800, mobil: true });
    const p = s.page;
    await sichtWarten(p);
    const kopf = await p.evaluate(() => { const g = document.querySelector('[data-feld="sicht"]'), k = document.querySelector('.lsp6'); return { gw: g.scrollWidth, gc: g.clientWidth, kw: k.scrollWidth, kc: k.clientWidth, dok: document.documentElement.scrollWidth, fenster: window.innerWidth, hoehen: [...g.querySelectorAll('.lsp6-sbtn')].map((x) => x.getBoundingClientRect().height), zeilen: new Set([...g.querySelectorAll('.lsp6-sbtn')].map((x) => Math.round(x.getBoundingClientRect().top))).size }; });
    pruefe(`${breite} px: Reiterleiste ohne seitliches Überlaufen, jeder Reiter ≥ 44 px, kein seitliches Scrollen der Seite`, kopf.gw <= kopf.gc + 1 && kopf.kw <= kopf.kc + 1 && kopf.dok <= kopf.fenster + 1 && kopf.hoehen.every((h) => h >= 44), JSON.stringify(kopf));
    if (breite >= 360) pruefe(`${breite} px: die drei Reiter stehen in einer Zeile`, kopf.zeilen === 1, String(kopf.zeilen));
    else pruefe(`${breite} px: höchstens zwei Reihen`, kopf.zeilen <= 2, String(kopf.zeilen));
    await textHinzufuegen(p, 'Hallo');
    const l = await lage(p);
    if (breite >= 360) pruefe(`${breite} px: die Druckfläche füllt mindestens 45 % der Bühnenbreite`, l.hb >= 0.445, `${(l.hb * 100).toFixed(1)} %`);
    pruefe(`${breite} px: die Druckfläche ist breiter als 140 px (bedienbar)`, l.hb * l.bw >= 140, `${(l.hb * l.bw).toFixed(0)} px`);
    // Motive in der rechten unteren und der linken oberen Ecke der Fläche: Griff und Löschknopf liegen ganz in der Bühne und sind trefferbar (5 Punkte der 44-px-Fläche)
    for (const [x, y, name] of [[0, 0, 'links oben'], [100, 100, 'rechts unten']]) {
      const cm = await p.evaluate(() => window.LSPOD6.editors[0].geo().masse);
      await feldSetzen(p, 'X (cm)', x === 0 ? 0 : cm.breite); await feldSetzen(p, 'Y (cm)', y === 0 ? 0 : cm.hoehe);
      await p.locator('.lsp6-stage').scrollIntoViewIfNeeded();
      const st = await rect(p, '.lsp6-stage'), gr = await rect(p, '.lsp6-handle'), dl = await rect(p, '.lsp6-del');
      const innen = (r) => r.x >= st.x - 0.5 && r.y >= st.y - 0.5 && r.x + r.w <= st.x + st.w + 0.5 && r.y + r.h <= st.y + st.h + 0.5;
      pruefe(`${breite} px, Motiv ${name}: Griff und Löschknopf liegen vollständig in der Bühne (nichts abgeschnitten)`, innen(gr) && innen(dl), JSON.stringify({ gr, dl, st }));
      const t5 = await p.evaluate(() => { const res = []; for (const sel of ['.lsp6-handle', '.lsp6-del']) { const r = document.querySelector(sel).getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let ok = 0; for (const [dx, dy] of [[0, 0], [-20, 0], [20, 0], [0, -20], [0, 20]]) { const e = document.elementFromPoint(cx + dx, cy + dy); if (e && e.matches(sel)) ok++; } res.push(ok); } return res; });
      pruefe(`${breite} px, Motiv ${name}: die 44-px-Trefferfläche von Griff und Löschknopf (5 Punkte) trifft`, t5[0] === 5 && t5[1] === 5, JSON.stringify(t5));
    }
    pruefe(`${breite} px: keine Seitenfehler`, s.fehler.length === 0, s.fehler.join(' | '));
    await s.schliessen();
  }
});

// ── 7. «Gleiche Vorschau»: Bearbeiten gegen die Vorschau-Canvas ─────────────────────────────────
/** Zeichnet in der Seite: dieselbe Szene als Bearbeiten (Stufe «Ganzes Produkt», ohne Rahmen, Etikett, Griffe) und als Vorschau-Canvas; vergleicht Pixel im Druckbereich und den Schwerpunkt des Motivs. */
const VERGLEICH = `async (a) => {
  const laden = (b64) => new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = 'data:image/png;base64,' + b64; });
  const N = 300;
  const ausschnitt = (quelle, r) => { const cv = document.createElement('canvas'); cv.width = N; cv.height = Math.round(N * r.h / r.w); const c = cv.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(quelle, r.x, r.y, r.w, r.h, 0, 0, cv.width, cv.height); return c.getImageData(0, 0, cv.width, cv.height); };
  const bo = await laden(a.bOhne), bm = await laden(a.bMit);
  const vo = window.__vo, vm = window.__vm;
  const L = window.LSPOD6.hilfen.vorlageLage(a.vl, vm.width, vm.height);
  const B = { x: a.tpl.x, y: a.tpl.y, w: a.tpl.w, h: a.tpl.h };
  const rB = { x: B.x, y: B.y, w: B.w, h: B.h }, rV = { x: L.ox, y: L.oy, w: L.w, h: L.h };
  const BO = ausschnitt(bo, rB), BM = ausschnitt(bm, rB), VO = ausschnitt(vo, rV), VM = ausschnitt(vm, rV);
  const area = { x0: Math.round(a.vl.flaecheLinks / a.vl.vorlageBreite * N), y0: Math.round(a.vl.flaecheOben / a.vl.vorlageHoehe * BO.height), x1: Math.round((a.vl.flaecheLinks + a.vl.flaecheBreite) / a.vl.vorlageBreite * N), y1: Math.round((a.vl.flaecheOben + a.vl.flaecheHoehe) / a.vl.vorlageHoehe * BO.height) };
  const sum = [0, 0, 0]; let cnt = 0, gross = 0;
  for (let y = area.y0; y < area.y1; y++) for (let x = area.x0; x < area.x1; x++) {
    const i = (y * N + x) * 4; let mx = 0;
    for (let k = 0; k < 3; k++) { const d = Math.abs(BM.data[i + k] - VM.data[i + k]); sum[k] += d; if (d > mx) mx = d; }
    if (mx > 12) gross++; cnt++;
  }
  const schwerpunkt = (O, M) => { let sx = 0, sy = 0, c = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; for (let y = 0; y < O.height; y++) for (let x = 0; x < N; x++) { const i = (y * N + x) * 4; const d = Math.max(Math.abs(O.data[i] - M.data[i]), Math.abs(O.data[i + 1] - M.data[i + 1]), Math.abs(O.data[i + 2] - M.data[i + 2])); if (d > 40) { sx += x; sy += y; c++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } return c ? { x: sx / c / N, y: sy / c / N, n: c, bw: x1 - x0 + 1, bh: y1 - y0 + 1 } : { x: -1, y: -1, n: 0, bw: 0, bh: 0 }; };
  const sb = schwerpunkt(BO, BM), sv = schwerpunkt(VO, VM);
  return { mittel: sum.map((s) => s / cnt), anteilGross: gross / cnt, sb, sv };
}`;
async function gleicheVorschau(p, opt = {}) {
  const farbe = opt.farbe || '#d01030';
  await p.evaluate(() => { const st = document.createElement('style'); st.id = 'lsp6-test-aus'; st.textContent = '.lsp6-frame,.lsp6-tag,.lsp6-readout,.lsp6-chrome-host,.lsp6-guide{visibility:hidden!important}'; document.head.appendChild(st); });
  await p.evaluate(() => { const ed = window.LSPOD6.editors[0]; ed.sichtSetzen('bearbeiten'); ed.zoomSetzen('vorlage'); ed.waehlen(null); });
  await bilderGeladen(p);
  const px = await p.evaluate(() => Math.round(document.querySelector('.lsp6-stage').getBoundingClientRect().width));
  const zeichneV = async (name) => p.evaluate(async ([nm, W]) => { const cv = document.createElement('canvas'); cv.width = W; cv.height = W; const r = await window.LSPOD6.editors[0].vorschauZeichnen(cv, {}); window[nm] = cv; return r.ok; }, [name, px]);
  const bOhne = (await p.locator('.lsp6-stage').screenshot()).toString('base64');
  pruefe(`${opt.name}: Vorschau ohne Motiv zeichnet`, await zeichneV('__vo'));
  let id;
  if (opt.text) {   // Text statt Quadrat: Schrift und Schrifthöhe nach opt, Farbe nach opt.farbe (die Schriftwahl der Ebene läuft über die Schnittstelle)
    id = await p.evaluate(([t, f, i]) => { const ed = window.LSPOD6.editors[0], e = ed.neuerText(t); e.color = f; ed.ui.schriftwahl.selectedIndex = i; ed.ui.schriftwahl.dispatchEvent(new Event('change', { bubbles: true })); return e.id; }, [opt.text, farbe, opt.schrift || 0]);
    await bilderGeladen(p);
    const cm0 = await p.evaluate(() => window.LSPOD6.editors[0].geo().masse);
    await feldSetzen(p, 'X (cm)', (opt.cx ?? 0.5) * cm0.breite); await feldSetzen(p, 'Y (cm)', (opt.cy ?? 0.4) * cm0.hoehe); await feldSetzen(p, 'Schrifthöhe (mm)', opt.mm || 40);
  } else {
  id = await motivHinzu(p, farbe);
  await bilderGeladen(p);
  const cm = await p.evaluate(() => window.LSPOD6.editors[0].geo().masse);
  await feldSetzen(p, 'X (cm)', (opt.cx ?? 0.5) * cm.breite); await feldSetzen(p, 'Y (cm)', (opt.cy ?? 0.4) * cm.hoehe); await feldSetzen(p, 'Breite (cm)', (opt.breite ?? 0.45) * cm.breite);
  }
  await p.evaluate(() => { const ed = window.LSPOD6.editors[0]; ed.waehlen(null); });
  await bilderGeladen(p);
  await p.waitForTimeout(150);
  const bMit = (await p.locator('.lsp6-stage').screenshot()).toString('base64');
  pruefe(`${opt.name}: Vorschau mit Motiv zeichnet`, await zeichneV('__vm'));
  const g = await geoAktiv(p);
  const tpl = await p.evaluate(() => { const st = document.querySelector('.lsp6-stage').getBoundingClientRect(), t = document.querySelector('.lsp6-tpl').getBoundingClientRect(); return { x: t.left - st.left, y: t.top - st.top, w: t.width, h: t.height, bw: st.width, bh: st.height }; });
  const soll = sollLage(g.vl, 'vorlage');
  nahe(`${opt.name}: Lage des Produktfotos in der Bühne (links)`, tpl.x / tpl.bw, soll.tl, 0.0012); nahe(`${opt.name}: Lage des Produktfotos (oben)`, tpl.y / tpl.bh, soll.to, 0.0012);
  nahe(`${opt.name}: Grösse des Produktfotos (Breite)`, tpl.w / tpl.bw, soll.tb, 0.0012); nahe(`${opt.name}: Grösse des Produktfotos (Höhe)`, tpl.h / tpl.bh, soll.th, 0.0012);
  const erg = await p.evaluate(new Function('a', 'return (' + VERGLEICH + ')(a)'), { bOhne, bMit, vl: g.vl, tpl });
  await p.evaluate(() => { const st = document.getElementById('lsp6-test-aus'); if (st) st.remove(); });
  await p.evaluate((i) => window.LSPOD6.editors[0].entfernen(i), id);
  return erg;
}
function s5Pruefen(name, e, strenge = {}) {
  if (process.env.V6_MESSWERTE) console.log(`  Messwert «Gleiche Vorschau» ${name}: mittlerer Abstand R/G/B ${e.mittel.map((x) => x.toFixed(2)).join('/')} (von 255), Pixel mit Abstand > 12: ${(e.anteilGross * 100).toFixed(2)} %, Schwerpunkt Bearbeiten ${e.sb.x.toFixed(4)}/${e.sb.y.toFixed(4)}, Vorschau ${e.sv.x.toFixed(4)}/${e.sv.y.toFixed(4)} (Bildbreite 1), Motivpixel ${e.sb.n}/${e.sv.n}, Umriss ${e.sb.bw}×${e.sb.bh} / ${e.sv.bw}×${e.sv.bh} px`);   // nur zum Ablesen der Zahlen fürs README
  for (let k = 0; k < 3; k++) pruefe(`${name}: mittlerer Abstand Kanal ${'RGB'[k]} im Druckbereich ≤ 4/255`, e.mittel[k] <= (strenge.mittel ?? 4), e.mittel.map((x) => x.toFixed(2)).join('/'));
  pruefe(`${name}: höchstens ${(strenge.gross ?? 0.03) * 100} % der Pixel im Druckbereich weichen um mehr als 12/255 ab`, e.anteilGross <= (strenge.gross ?? 0.03), (e.anteilGross * 100).toFixed(2) + ' %');
  pruefe(`${name}: das Motiv ist in beiden Bildern zu sehen`, e.sb.n > 200 && e.sv.n > 200, JSON.stringify([e.sb.n, e.sv.n]));
  // Spezifikation S5: ≤ 1,5 %. GEMESSEN liegen alle Fälle unter 0,35 % (Rauschen der Bildschirmfotos, 1 px = 0,25 %): die Schranke steht bei 0,5 %, damit eine Verschiebung des Motivs um 2,7 mm (rund 0,33 % der Bildbreite bei einer 30-cm-Druckfläche) nicht mehr unbemerkt bleibt, der Umriss darf höchstens 1,5 Bildpunkte abweichen
  nahe(`${name}: Schwerpunkt des Motivs (x) ≤ 0,5 % der Bildbreite`, e.sb.x, e.sv.x, 0.005); nahe(`${name}: Schwerpunkt des Motivs (y) ≤ 0,5 % der Bildbreite`, e.sb.y, e.sv.y, 0.005);
  nahe(`${name}: Breite des Motivumrisses (Bildpunkte bei 400 px Bildbreite)`, e.sb.bw, e.sv.bw, 1.5); nahe(`${name}: Höhe des Motivumrisses (Bildpunkte bei 400 px Bildbreite)`, e.sb.bh, e.sv.bh, 1.5);
}
szenario('gleiche-vorschau', true, async (b, srv) => {
  // drei T-Shirt-Modelle des LIVE-Bündels (71, 456, 586), je weiss; dazu schwarz mit hellem Motiv (die Schichtfolge zeigt sich nur auf dunklem Stoff)
  const faelle = [['T-Shirt 71', V71], ['T-Shirt 456', V456], ['T-Shirt 586', V586]];
  for (const [name, v] of faelle) {
    const s = await oeffnen(b, srv, SHIRT_Q([v, V71, V456, V586].filter((x, i, a) => a.findIndex((y) => y.sv === x.sv) === i)));
    const p = s.page;
    await sichtWarten(p);
    pruefe(`${name}: Bearbeiten zeigt das Produkt`, await p.evaluate(() => window.LSPOD6.editors[0].produktBuehne()));
    const e = await gleicheVorschau(p, { name });
    s5Pruefen(name, e);
    // ein grosses Motiv (80 % der Druckbreite): sein Umriss ist rund 85 Bildpunkte breit, eine Abweichung der Grösse von 2 % fällt damit über die Schranke von 1,5 Bildpunkten
    s5Pruefen(`${name}, grosses Motiv`, await gleicheVorschau(p, { name: `${name}, grosses Motiv`, breite: 0.8, cy: 0.42 }), { gross: 0.05 });
    // Text (Linse «Gleiche Vorschau»: die Bühne zeichnete ihn mit anderer Schrift, anderem Gewicht und anderer Höhenlage als die Leinwand): alle fünf Schriften, 40 mm Schrifthöhe; GEMESSEN höchstens 0,33 % Abstand der Schwerpunkte
    for (let i = 0; i < 5; i++) s5Pruefen(`${name}, Text in Schrift ${i + 1}`, await gleicheVorschau(p, { name: `${name}, Text ${i + 1}`, text: 'HEHE 24', schrift: i, mm: 40 }), { gross: 0.04 });
    pruefe(`${name}: keine Seitenfehler`, s.fehler.length === 0, s.fehler.join(' | '));
    await s.schliessen();
  }
  // Textur-Variante (kein Eintrag in der Farbtabelle: Stoff aus dem Hintergrundbild der Vorlage)
  if (V71_FARBIG) {
    const s = await oeffnen(b, srv, SHIRT_Q([V71_FARBIG, V71, V456, V586]));
    await sichtWarten(s.page);
    const e = await gleicheVorschau(s.page, { name: 'T-Shirt 71 mit Textur' });
    s5Pruefen('T-Shirt 71 mit Textur', e);
    await s.schliessen();
  }
  // Hoodie 145/821 und Classic-Tee 438 (LIVE-Karten)
  const hoodie = liveVarianten(lies(`lspod-${HOODIE_ID}.karte.json`)), tee = liveVarianten(lies(`lspod-${TEE_ID}.karte.json`));
  for (const [name, id, vs, v] of [['Sweatshirt 145', HOODIE_ID, hoodie, hoodie.find((x) => x.m === '145')], ['Hoodie 821', HOODIE_ID, hoodie, hoodie.find((x) => x.m === '821')], ['Classic-Tee 438', TEE_ID, tee, tee[0]]]) {
    const s = await oeffnen(b, srv, liveQ(id, [v, ...vs.filter((x) => x.sv !== v.sv)]));
    await sichtWarten(s.page);
    const ok = await s.page.evaluate(() => window.LSPOD6.editors[0].produktBuehne());
    pruefe(`${name}: Bearbeiten zeigt das Produkt`, ok);
    if (ok) s5Pruefen(name, await gleicheVorschau(s.page, { name }));
    await s.schliessen();
  }
  // schwarzer Stoff (Test-Karte 71, Farbtabelle) mit hellem Motiv: Grundfarbe und Schichtfolge
  const t = await oeffnen(b, srv, T71.replace('shop=1001:4012,1002:4020,1003:4045', 'shop=1001:4012,1002:4020,1003:4045') + '&varianten=1001:Weiss,1002:Schwarz,1003:Pink', { ...GEISTER });
  await sichtWarten(t.page);
  await t.page.locator('input[name="id"][value="1002"]').check();
  await t.page.waitForFunction(() => window.LSPOD6.editors[0].st.pfVariante === 4020);
  const sw = await gleicheVorschau(t.page, { name: 'schwarzer Stoff', farbe: '#ffffff', cx: 0.5, cy: 0.5, breite: 0.5 });
  s5Pruefen('schwarzer Stoff mit weissem Motiv', sw);
  await t.page.locator('input[name="id"][value="1003"]').check();
  await t.page.waitForFunction(() => window.LSPOD6.editors[0].st.pfVariante === 4045);
  s5Pruefen('pinker Stoff mit weissem Motiv', await gleicheVorschau(t.page, { name: 'pinker Stoff', farbe: '#ffffff', cx: 0.4, cy: 0.35, breite: 0.4 }));
  await t.schliessen();
});

// ── 8. Druckdatei, Eigenschaften, Kaufweg unabhängig von der Ansicht ────────────────────────────
const DRUCKDATEI = `async () => {
  const ed = window.LSPOD6.editors[0];
  const blob = await ed.druckdateiErzeugen(ed.st.aktiv, {});
  const buf = await blob.arrayBuffer();
  const h = await crypto.subtle.digest('SHA-256', buf);
  return { sha: Array.from(new Uint8Array(h)).map((x) => x.toString(16).padStart(2, '0')).join(''), bytes: buf.byteLength };
}`;
async function entwurfMitMotiven(p) {
  await textHinzufuegen(p, 'Hallo Welt');
  await feldSetzen(p, 'Schrifthöhe (mm)', 22);
  await feldSetzen(p, 'X (cm)', 8); await feldSetzen(p, 'Y (cm)', 12);
  await motivHinzu(p, '#2040c0'); await bilderGeladen(p);
  await feldSetzen(p, 'X (cm)', 18); await feldSetzen(p, 'Y (cm)', 25); await feldSetzen(p, 'Breite (cm)', 7); await feldSetzen(p, 'Drehung °', 20);
  await p.evaluate(() => window.LSPOD6.editors[0].waehlen(null));
}
const druck = async (p) => p.evaluate(new Function('return (' + DRUCKDATEI + ')()'));
szenario('druckdatei-unveraendert', true, async (b, srv) => {
  const ergebnis = {};
  for (const [name, extra, opt] of [['Bearbeiten Rechner', 'bearbeiten=1', PC], ['Druckversion Rechner', 'bearbeiten=angebot', PC], ['Bearbeiten Handy', 'bearbeiten=1', MOBIL], ['6.3.1 Rechner', 'editor=ref&bearbeiten=0', PC]]) {
    const s = await oeffnen(b, srv, SHIRT_Q([V71, V456, V586], extra).replace('&bearbeiten=1', ''), opt);
    const p = s.page;
    await p.waitForFunction(() => window.LSPOD6 && window.LSPOD6.editors.length === 1);
    if (!/6\.3\.1/.test(name)) await sichtWarten(p);
    await entwurfMitMotiven(p);
    ergebnis[name] = { d: await druck(p), karte: await p.evaluate(() => window.LSPOD6.editors[0].eigenschaften()), sicht: await p.evaluate(() => window.LSPOD6.editors[0].st.sicht) };
    if (/^Bearbeiten Rechner/.test(name)) {
      for (const art of ['druck', 'produkt', 'bearbeiten']) { await p.locator(`.lsp6-sbtn[data-sicht="${art}"]`).click(); if (art === 'produkt') await p.waitForTimeout(300); }
      await p.getByRole('button', { name: 'Zoom −' }).click(); await p.getByRole('button', { name: 'Zoom +' }).click();
      ergebnis['Bearbeiten nach Ansichtswechsel und Zoom'] = { d: await druck(p), karte: await p.evaluate(() => window.LSPOD6.editors[0].eigenschaften()) };
    }
    await s.schliessen();
  }
  const ref = ergebnis['6.3.1 Rechner'];
  pruefe('Vergleich: Ansichten waren wie erwartet (Druckversion = «druck», Bearbeiten = «bearbeiten»)', ergebnis['Druckversion Rechner'].sicht === 'druck' && ergebnis['Bearbeiten Rechner'].sicht === 'bearbeiten' && ergebnis['6.3.1 Rechner'].sicht === 'druck');
  for (const k of Object.keys(ergebnis)) {
    if (k === '6.3.1 Rechner') continue;
    pruefe(`Druckdatei (PNG, SHA-256) in «${k}» ist bytegleich der Druckdatei von 6.3.1`, ergebnis[k].d.sha === ref.d.sha && ergebnis[k].d.bytes === ref.d.bytes, `${ergebnis[k].d.sha.slice(0, 12)} gegen ${ref.d.sha.slice(0, 12)}`);
    pruefe(`Eigenschaften (_pod_karte und alle Schlüssel) in «${k}» sind gleich 6.3.1`, JSON.stringify(ergebnis[k].karte) === JSON.stringify(ref.karte), JSON.stringify(ergebnis[k].karte).slice(0, 120));
  }
  pruefe('die Druckdatei ist nicht leer (mehr als 5 KB)', ref.d.bytes > 5000, String(ref.d.bytes));
});

szenario('review-kaufweg', true, async (b, srv) => {
  const lauf = async (extra) => {
    const s = await oeffnen(b, srv, SHIRT_Q([V71, V456, V586]).replace('&bearbeiten=1', '') + '&' + extra);
    const p = s.page;
    await p.waitForFunction(() => window.LSPOD6 && window.LSPOD6.editors.length === 1);
    if (!/ref/.test(extra)) await sichtWarten(p);
    await textHinzufuegen(p, 'Kauf');
    await p.locator('.lsp6-cta').click();
    await reviewBestaetigen(p);
    await p.waitForURL('**/cart', { timeout: 30000 });
    const r = { uploads: s.uploads.map((u) => ({ typ: u.typ, b: u.breite, h: u.hoehe })), wk: s.warenkorb.map((w) => Object.keys(w.properties || {}).sort().join('|')), karte: s.warenkorb[0] && s.warenkorb[0].properties && s.warenkorb[0].properties._pod_karte, fehler: s.fehler };
    await s.schliessen();
    return r;
  };
  const neu = await lauf('bearbeiten=1'), alt = await lauf('editor=ref&bearbeiten=0');
  pruefe('Kauf aus «Bearbeiten»: Druckprüfung wurde bestätigt, die Bestellung ging in den Warenkorb', neu.wk.length === 1 && neu.uploads.length >= 1, JSON.stringify(neu));
  pruefe('Kauf aus «Bearbeiten»: Uploads (Typ, Pixelgrösse) wie 6.3.1', JSON.stringify(neu.uploads.filter((u) => u.b)) === JSON.stringify(alt.uploads.filter((u) => u.b)), JSON.stringify([neu.uploads, alt.uploads]));
  pruefe('Kauf aus «Bearbeiten»: Eigenschaften und _pod_karte wie 6.3.1', neu.wk[0] === alt.wk[0] && neu.karte === alt.karte, JSON.stringify([neu.wk[0], alt.wk[0], neu.karte, alt.karte]));
  pruefe('keine Seitenfehler beim Kauf', neu.fehler.length === 0 && alt.fehler.length === 0, JSON.stringify([neu.fehler, alt.fehler]));
  // Ein Ansichtswechsel ist keine Änderung des Designs: eine offene Druckprüfung (Dialog) bleibt offen und gültig
  const o = await oeffnen(b, srv, SHIRT_Q());
  await sichtWarten(o.page);
  await textHinzufuegen(o.page, 'Kauf');
  await o.page.locator('.lsp6-cta').click();
  const dialog = o.page.locator('[data-lsp6-review="1"]');
  await dialog.waitFor({ state: 'visible', timeout: 30000 });
  await o.page.evaluate(() => { const ed = window.LSPOD6.editors[0]; ed.sichtSetzen('druck'); ed.sichtSetzen('bearbeiten'); });
  await o.page.waitForTimeout(150);
  pruefe('Ansichtswechsel bei offener Druckprüfung: der Dialog bleibt offen und die Bestätigung führt in den Warenkorb', await dialog.isVisible());
  await dialog.locator('.lsp6-review-accept').check();
  await dialog.locator('.lsp6-review-confirm').click();
  await o.page.waitForURL('**/cart', { timeout: 30000 });
  pruefe('Ansichtswechsel bei offener Druckprüfung: Warenkorb erreicht, keine Seitenfehler', o.warenkorb.length === 1 && o.fehler.length === 0, JSON.stringify([o.warenkorb.length, o.fehler]));
  await o.schliessen();
});

// ── 8b. Gate: wann zeigt «Bearbeiten» das Produkt? Platzierungen, Bündel, veränderte Vorschaudaten ─────
/** Vorschaudaten eines Modells vom Test-Server holen, in der Seite verändern und dem Editor geben (fremde oder ältere Daten). */
async function datenSetzen(p, modell, aendern) {
  return p.evaluate(async ([m, fn]) => {
    const roh = await (await fetch('/vorschau/' + m + '.json?spiegel=1')).json();
    // eslint-disable-next-line no-new-func
    new Function('d', fn)(roh);
    return window.LSPOD6.editors[0].vorschauDatenSetzen(roh);
  }, [modell, aendern]);
}
const stand = (p) => p.evaluate(() => { const ed = window.LSPOD6.editors[0]; return { sicht: ed.st.sicht, wunsch: ed.st.sichtWunsch, pb: ed.produktBuehne(), aktiv: ed.st.aktiv, tabs: [...document.querySelectorAll('.lsp6-sbtn')].filter((x) => !x.hidden).map((x) => x.textContent).join('|') }; });
szenario('gate', true, async (b, srv) => {
  // (e) volles Modell 71: acht Platzierungen; die mit Raster-Vorlage (Etikett, Ärmel …) haben kein Produktfoto
  const s = await oeffnen(b, srv, T71);
  const p = s.page;
  await sichtWarten(p);
  // Test-Katalog 71: alle acht Vorlagen sind Fotos; für «Etikett innen» das Foto aus den Vorschaudaten nehmen (= dort ein Raster, kein Produktfoto)
  const etikettUrl = await p.evaluate(() => window.LSPOD6.editors[0].karte.platzierungen.find((q) => q.id === 'label_inside').vorlage.bildUrl);
  const frontUrl = await p.evaluate(() => window.LSPOD6.editors[0].karte.platzierungen.find((q) => q.id === 'front').vorlage.bildUrl);
  pruefe('Vorbereitung: «Etikett innen» hat eine andere Vorlagenadresse als «Vorne»', etikettUrl && etikettUrl !== frontUrl);
  await datenSetzen(p, '71', `delete d.modelle['71'].bilder[${JSON.stringify(etikettUrl)}];`);
  const ids = await p.evaluate(() => window.LSPOD6.editors[0].platzierungIds());
  const moeglich = await p.evaluate(() => { const ed = window.LSPOD6.editors[0]; const r = {}; ed.platzierungIds().forEach((i) => { r[i] = ed.produktfotoMoeglich(i); }); return r; });
  const mit = ids.filter((i) => moeglich[i]), ohne = ids.filter((i) => !moeglich[i]);
  pruefe('Modell 71: es gibt Platzierungen mit und ohne Produktfoto (Gate rechnet je Platzierung)', mit.length >= 1 && ohne.length >= 1, JSON.stringify(moeglich));
  pruefe('Modell 71, Vorne: Produktbühne, drei Reiter', mit.includes('front') && (await stand(p)).pb && (await stand(p)).tabs === 'Bearbeiten|Druckversion|Vorschau', JSON.stringify(await stand(p)));
  await p.locator('.lsp6-sbtn[data-sicht="druck"]').click();   // Wunsch «Druckversion»
  await p.evaluate((i) => window.LSPOD6.editors[0].wechseln(i), ohne[0]);
  let x = await stand(p);
  pruefe(`Platzierung ohne Foto (${ohne[0]}): Bühne von 6.3.1 in «Bearbeiten», kein Reiter «Druckversion», keine Produktbühne`, x.sicht === 'bearbeiten' && !x.pb && !/Druckversion/.test(x.tabs), JSON.stringify(x));
  pruefe(`Platzierung ohne Foto: der Wunsch «Druckversion» bleibt erhalten`, x.wunsch === 'druck');
  await p.evaluate(() => window.LSPOD6.editors[0].wechseln('front'));
  x = await stand(p);
  pruefe('zurück auf «Vorne»: der Wunsch kommt zurück (Druckversion), die Reiter auch', x.sicht === 'druck' && /Druckversion/.test(x.tabs), JSON.stringify(x));
  await p.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').click();
  await p.evaluate((i) => window.LSPOD6.editors[0].wechseln(i), ohne[0]);
  await p.evaluate(() => window.LSPOD6.editors[0].wechseln('front'));
  x = await stand(p);
  pruefe('Wunsch «Bearbeiten»: nach dem Hin und Her über eine Platzierung ohne Foto zeigt «Vorne» wieder das Produkt', x.sicht === 'bearbeiten' && x.pb, JSON.stringify(x));
  await s.schliessen();
  // (a) Vorlagenadresse aus «bilder» entfernen: das Foto ist nicht als Produktfoto bekannt (Raster)
  const a = await oeffnen(b, srv, T71);
  await sichtWarten(a.page);
  await datenSetzen(a.page, '71', "Object.values(d.modelle['71'].bilder = d.modelle['71'].bilder).length; d.modelle['71'].bilder = {};");
  let y = await stand(a.page);
  pruefe('(a) Vorlagenadresse nicht in den Vorschaudaten: keine Produktbühne, kein Reiter «Druckversion»', !y.pb && !/Druckversion/.test(y.tabs), JSON.stringify(y));
  await datenSetzen(a.page, '71', "d.modelle['71'].farbfest = ['front'];");
  y = await stand(a.page);
  pruefe('(b) farbfeste Vorlage (feste Stofffarbe): keine Produktbühne', !y.pb && !/Druckversion/.test(y.tabs), JSON.stringify(y));
  await datenSetzen(a.page, '71', "d.modelle['71'].adapter = 'keine'; d.modelle['71'].bilder = {};");
  y = await stand(a.page);
  pruefe('(c) Adapter «keine»: keine Produktbühne', !y.pb && !/Druckversion/.test(y.tabs), JSON.stringify(y));
  await datenSetzen(a.page, '71', "");
  y = await stand(a.page);
  pruefe('wieder gültige Daten: die Produktbühne ist zurück (der Wunsch «Bearbeiten» blieb)', y.pb && y.tabs === 'Bearbeiten|Druckversion|Vorschau', JSON.stringify(y));
  pruefe('keine Seitenfehler', a.fehler.length === 0, a.fehler.join(' | '));
  await a.schliessen();
  // Bündel (T-Shirt 71 + 586): Vorschaudaten nur für 71: Modell 586 hat keine Vorschau, die Reiter verschwinden und kommen mit 71 zurück
  const k = await oeffnen(b, srv, 'karte=buendel&m=71,586&shop=1001:4012:71,1002:15124:586&vorschau=71&bearbeiten=1&themeregel=1&varianten=1001:A,1002:B');
  await sichtWarten(k.page);
  let z = await stand(k.page);
  pruefe('Bündel: Modell 71 hat Vorschaudaten: Produktbühne und drei Reiter', z.pb && z.tabs === 'Bearbeiten|Druckversion|Vorschau', JSON.stringify(z));
  await k.page.locator('.lsp6-sbtn[data-sicht="produkt"]').click();   // Wunsch «Vorschau»
  pruefe('Bündel: Wunsch «Vorschau» ist gewählt', (await stand(k.page)).sicht === 'produkt' && (await stand(k.page)).wunsch === 'produkt');
  await k.page.locator('input[name="id"][value="1002"]').check();
  await k.page.waitForFunction(() => window.LSPOD6.editors[0].karte.printfulProductId === 586, null, { timeout: 5000 });
  await k.page.waitForTimeout(150);
  z = await stand(k.page);
  pruefe('Bündel: Modell 586 ohne Vorschaudaten: Bühne von 6.3.1, die Reiterleiste verschwindet, der Wunsch «Vorschau» wird aufgegeben', !z.pb && z.sicht === 'bearbeiten' && z.wunsch === 'bearbeiten' && !(await gruppeSichtbar(k.page)), JSON.stringify(z));
  await k.page.locator('input[name="id"][value="1001"]').check();
  await k.page.waitForFunction(() => window.LSPOD6.editors[0].karte.printfulProductId === 71, null, { timeout: 5000 });
  await k.page.waitForTimeout(150);
  z = await stand(k.page);
  pruefe('Bündel: zurück auf Modell 71: Produktbühne und Reiter sind wieder da, die aufgegebene «Vorschau» kommt nicht von selbst zurück', z.pb && z.sicht === 'bearbeiten' && z.tabs === 'Bearbeiten|Druckversion|Vorschau', JSON.stringify(z));
  await k.schliessen();
  // Das Tor verlangt den Adapter «flach» UND ein bekanntes Produktfoto: ein Tassen- oder Poster-Modell, dessen Vorlagenadresse (zufällig) in «bilder» steht, bekommt trotzdem keine Produktbühne
  for (const [name, q, id] of [['Tasse 19 (Adapter «tasse»)', T19, '19'], ['Poster 268 (Adapter «papier»)', 'karte=268&vorschau=268&bearbeiten=1', '268']]) {
    const t = await oeffnen(b, srv, q);
    await sichtWarten(t.page);
    const url = await t.page.evaluate(() => window.LSPOD6.editors[0].karte.platzierungen[0].vorlage.bildUrl);
    const angenommen = await datenSetzen(t.page, id, `d.modelle[${JSON.stringify(id)}].bilder[${JSON.stringify(url)}] = null;`);
    const w = await stand(t.page);
    pruefe(`${name}: Vorlagenadresse steht in «bilder» (Daten angenommen), trotzdem keine Produktbühne und kein Reiter «Druckversion» (anderer Adapter)`, angenommen === true && /^https:/.test(url) && !w.pb && !/Druckversion/.test(w.tabs), JSON.stringify([angenommen, url, w]));
    await t.schliessen();
  }
});

// ── 9. Fehler B, C, D ───────────────────────────────────────────────────────────────────────────
szenario('fehler-bcd', true, async (b, srv) => {
  // B: ungültige Kombination, dann die gültige Variante eines anderen Modells: der rote Hinweis muss wegfallen
  const s = await oeffnen(b, srv, SHIRT_Q([V71, V586, V456]) + '&bearbeiten=1');
  const p = s.page;
  await sichtWarten(p);
  await p.evaluate(() => { const r = document.createElement('input'); r.type = 'radio'; r.name = 'id'; r.value = '999999999'; r.id = 'fremd'; document.getElementById('varianten').appendChild(r); });
  await p.locator('#fremd').check();
  await p.waitForFunction(() => !document.querySelector('[data-feld="modellhinweis"]').hidden, null, { timeout: 5000 });
  const text = await p.locator('[data-feld="modellhinweis"]').innerText();
  pruefe('Variante ausserhalb der Zuordnung: der alte Hinweis «noch nicht eingerichtet» bleibt (echte Nicht-Einrichtung)', /noch nicht eingerichtet/.test(text), text);
  await p.locator(`input[name="id"][value="${V586.sv}"]`).check();
  await p.waitForFunction((pv) => window.LSPOD6.editors[0].st.pfVariante === pv, V586.pv, { timeout: 5000 });
  await p.waitForTimeout(150);
  pruefe('Fund B: nach gültiger Wahl (anderes Modell, ein Reiter) verschwindet der Hinweis', await p.locator('[data-feld="modellhinweis"]').isHidden());
  // C: keine Ausführung gewählt (die Seite hat die Kombination nicht angeboten) = «Diese Kombination gibt es nicht»
  await p.evaluate(() => { document.querySelectorAll('input[name="id"]').forEach((r) => { r.checked = false; }); document.querySelector('input[name="id"]').disabled = true; document.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForFunction(() => !document.querySelector('[data-feld="modellhinweis"]').hidden, null, { timeout: 5000 });
  pruefe('Fund C: ohne gewählte Ausführung steht «Diese Kombination gibt es nicht. Bitte wähle eine andere Auswahl.»', await p.locator('[data-feld="modellhinweis"]').innerText() === 'Diese Kombination gibt es nicht. Bitte wähle eine andere Auswahl.', await p.locator('[data-feld="modellhinweis"]').innerText());
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
  // D: Kiss-Cut-Aufkleber: nur die Grösse 3 × 3 hat ein bekanntes Produktfoto, die anderen keine Vorschau-Eichung
  const kiss = liveVarianten(lies(`lspod-${KISS_ID}.karte.json`));
  const k = await oeffnen(b, srv, liveQ(KISS_ID, kiss));
  await sichtWarten(k.page).catch(() => null);
  const tabsKiss = [];
  for (const v of kiss) {
    await k.page.locator(`input[name="id"][value="${v.sv}"]`).check();
    await k.page.waitForFunction((pv) => window.LSPOD6.editors[0].st.pfVariante === pv, v.pv, { timeout: 5000 });
    await k.page.waitForTimeout(120);
    tabsKiss.push([v.pv, (await tabsText(k.page)).join('|'), await gruppeSichtbar(k.page), await k.page.evaluate(() => window.LSPOD6.editors[0].produktBuehne())]);
  }
  const ohneFoto = tabsKiss.filter((x) => x[0] !== kiss[0].pv);
  pruefe('Fund D: Ausführungen ohne Vorschau-Eichung haben keinen Reiter «Vorschau» (und die Gruppe nur, wenn es etwas zu wählen gibt)', ohneFoto.every((x) => !/Vorschau/.test(x[1]) || !x[2]), JSON.stringify(tabsKiss));
  pruefe('Fund D: Ausführungen ohne Foto fallen in «Bearbeiten» auf die Bühne von 6.3.1 zurück (kein Produktbild, kein totes Umschalten)', ohneFoto.every((x) => x[3] === false), JSON.stringify(tabsKiss));
  pruefe('Fund D: die Ausführung mit bekanntem Foto behält Bearbeiten, Druckversion und Vorschau', /Bearbeiten\|Druckversion\|Vorschau/.test(tabsKiss[0][1]), JSON.stringify(tabsKiss[0]));
  await k.schliessen();
  // Stickerei (LIVE-Karte 1552): nur Bearbeiten und Vorschau, der Hinweis erklärt es
  const st = await oeffnen(b, srv, liveQ(STICK_ID, liveVarianten(lies(`lspod-${STICK_ID}.karte.json`))));
  await sichtWarten(st.page);
  pruefe('Stickerei (LIVE 1552): keine Produktbühne, Reiter Bearbeiten und Vorschau', (await tabsText(st.page)).join('|') === 'Bearbeiten|Vorschau' && !(await st.page.evaluate(() => window.LSPOD6.editors[0].produktBuehne())), (await tabsText(st.page)).join('|'));
  await st.schliessen();
});

// ── 10. Start-Steuerung, Entwurf, Rückfall ──────────────────────────────────────────────────────
szenario('start-steuerung', true, async (b, srv) => {
  // (a) Vorschaudaten treffen verspätet ein, der Kunde hat nichts angefasst: die Ansicht wechselt von selbst auf «Bearbeiten» (Produkt)
  const a = await oeffnen(b, srv, SHIRT_Q([V71, V456, V586], 'vverz=1200'));
  pruefe('vor dem Eintreffen der Daten: Bühne wie 6.3.1, keine Reiter', !(await gruppeSichtbar(a.page)) && (await a.page.locator('.lsp6-stage').getAttribute('data-ansicht')) === 'druck');
  await sichtWarten(a.page);
  pruefe('(a) nichts angefasst: nach dem Eintreffen der Daten zeigt «Bearbeiten» das Produkt', await a.page.evaluate(() => window.LSPOD6.editors[0].produktBuehne()) && (await a.page.locator('.lsp6-stage').getAttribute('data-ansicht')) === 'bearbeiten');
  await a.schliessen();
  // (b) Text getippt, BEVOR die Daten eintreffen: die Ansicht springt nicht unter dem Finger, «Druckversion» bleibt
  const c = await oeffnen(b, srv, SHIRT_Q([V71, V456, V586], 'vverz=1500'));
  await textHinzufuegen(c.page, 'Hallo');
  const vor = await rect(c.page, '.lsp6-host');
  await sichtWarten(c.page);
  const nach = await rect(c.page, '.lsp6-host');
  pruefe('(b) Text vor dem Eintreffen: die Ansicht bleibt «Druckversion», die Bühne springt nicht', (await sicht(c.page)) === 'druck' && Math.abs(vor.w - nach.w) < 1 && Math.abs(vor.x - nach.x) < 1, JSON.stringify([vor, nach, await sicht(c.page)]));
  pruefe('(b) die Reiter sind da, der Kunde kann «Bearbeiten» selbst wählen', (await tabsText(c.page)).join('|') === 'Bearbeiten|Druckversion|Vorschau');
  await c.page.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').click();
  pruefe('(b) Klick auf «Bearbeiten»: das Produkt wird gezeigt, die Ebene bleibt', (await sicht(c.page)) === 'bearbeiten' && (await ebenen(c.page)).length === 1);
  await c.schliessen();
  // (c) Vorgabe festgeschrieben: erst «Bearbeiten», dann Text getippt: die Ansicht bleibt «Bearbeiten» (kein Zurückkippen)
  const d = await oeffnen(b, srv, SHIRT_Q());
  await sichtWarten(d.page);
  await textHinzufuegen(d.page, 'Hallo');
  await d.page.locator('.lsp6-text').fill('Hallo Welt');
  pruefe('(c) nach dem Tippen bleibt die Ansicht «Bearbeiten»', (await sicht(d.page)) === 'bearbeiten' && await d.page.evaluate(() => window.LSPOD6.editors[0].produktBuehne()));
  // (d) «Druckversion» gewählt, Seite neu laden: Vorgabe wieder «Bearbeiten», Entwurf wiederhergestellt; die Ansicht steht nicht im Entwurf
  await d.page.locator('.lsp6-sbtn[data-sicht="druck"]').click();
  await d.page.evaluate(() => window.LSPOD6.editors[0].entwurfSofort());
  const gespeichert = await d.page.evaluate(() => { const ed = window.LSPOD6.editors[0]; const t = localStorage.getItem(ed.entwurfKey); return t; });
  pruefe('(e) der Entwurf im localStorage trägt kein Ansichtsfeld (Schema v:1 unverändert)', !!gespeichert && !/sicht|zoom|bearbeiten|ansicht/i.test(Object.keys(JSON.parse(gespeichert)).join(',')) && JSON.parse(gespeichert).v === 1, Object.keys(JSON.parse(gespeichert || '{}')).join(','));
  await d.page.reload();
  await editorBereit(d.page); await sichtWarten(d.page);
  pruefe('(d) nach dem Neuladen: «Bearbeiten» ist wieder die Vorgabe, der Entwurf (Text) ist da', (await sicht(d.page)) === 'bearbeiten' && (await ebenen(d.page)).length === 1 && (await ebenen(d.page))[0].text === 'Hallo Welt');
  await d.schliessen();
  // Entwurf, den 6.3.1 geschrieben hat, lädt in 6.4.0 (gleicher Entwurfsschlüssel, gleiches Schema)
  const e = await oeffnen(b, srv, SHIRT_Q([V71, V456, V586], 'editor=ref').replace('&bearbeiten=1', '&bearbeiten=0'));
  await textHinzufuegen(e.page, 'Alt-Entwurf');
  await e.page.evaluate(() => window.LSPOD6.editors[0].entwurfSofort());
  await e.page.goto(`${srv.url}/mock.html?${SHIRT_Q()}`, { waitUntil: 'domcontentloaded' });
  await editorBereit(e.page); await sichtWarten(e.page);
  pruefe('ein Entwurf von 6.3.1 lädt in 6.4.0 mit Text und Meldung «Dein Entwurf wurde wiederhergestellt»', (await ebenen(e.page)).length === 1 && (await ebenen(e.page))[0].text === 'Alt-Entwurf' && /Entwurf wurde wiederhergestellt/.test(await e.page.locator('[data-feld="status"]').innerText()));
  await e.schliessen();
});

szenario('rueckfall-bild', true, async (b, srv) => {
  // das Produktfoto lädt nicht (404 auf /m/): «Bearbeiten» springt auf «Druckversion» mit einem ruhigen Hinweis, der Kauf geht weiter
  const s = await oeffnen(b, srv, SHIRT_Q(), { printfulBild: (u) => (/\/m\//.test(u) ? { status: 404, typ: 'text/plain', body: '' } : null) });
  const p = s.page;
  await sichtWarten(p);
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.sicht === 'druck', null, { timeout: 8000 });
  pruefe('Foto fehlt: die Ansicht fällt auf «Druckversion» zurück und sagt es ruhig', (await sicht(p)) === 'druck' && /Produktfoto lädt gerade nicht/.test(await p.locator('[data-feld="sichthinweis"]').innerText()));
  await textHinzufuegen(p, 'Kauf');
  await p.locator('.lsp6-cta').click();
  await reviewBestaetigen(p);
  await p.waitForURL('**/cart', { timeout: 30000 });
  pruefe('Foto fehlt: der Kauf geht trotzdem durch (Druckdatei, ohne Vorschau-Foto)', s.warenkorb.length === 1 && s.uploads.length >= 1);
  pruefe('Foto fehlt: keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
  // das Foto scheitert erst, wenn die Seite längst steht (spätes 404, kein weiterer Neuaufbau): der Rückfall kommt trotzdem, aus dem Fehlerereignis des Bildes
  const t = await oeffnen(b, srv, SHIRT_Q(), { printfulBild: (u) => (/\/m\//.test(u) ? { status: 404, typ: 'text/plain', body: '', verzoegerung: 1800 } : null) });
  await sichtWarten(t.page);
  await t.page.waitForTimeout(300);
  pruefe('spätes 404: vor dem Fehler zeigt «Bearbeiten» noch die Bühne (der Test misst den Rückfall aus dem Fehlerereignis)', (await sicht(t.page)) === 'bearbeiten' || (await sicht(t.page)) === 'druck');
  await t.page.waitForFunction(() => window.LSPOD6.editors[0].st.sicht === 'druck', null, { timeout: 6000 });
  pruefe('spätes 404: die Ansicht fällt auf «Druckversion» zurück und sagt es ruhig', (await sicht(t.page)) === 'druck' && /Produktfoto lädt gerade nicht/.test(await t.page.locator('[data-feld="sichthinweis"]').innerText()));
  pruefe('spätes 404: keine Seitenfehler', t.fehler.length === 0, t.fehler.join(' | '));
  await t.schliessen();
});

szenario('statische-pruefung', true, async () => {
  const q = readFileSync(V6_DATEI, 'utf8');
  /** Rumpf einer Funktion (bis zur nächsten Funktion auf derselben Einrückung). */
  const rumpf = (name) => { const m = new RegExp(`\\n( *)function ${name}\\(`).exec(q); if (!m) return null; const a = m.index + 1, rest = q.slice(a + 1), e = new RegExp(`\\n${m[1]}(function |/\\*\\*|// ──)`).exec(rest); return q.slice(a, e ? a + 1 + e.index : q.length); };
  const verboten = ['st.sicht', 'st.ansicht', 'st.zoom', 'sichtWunsch', 'ui.stage', 'ui.host', 'ui.chrome', 'geoAktiv', 'bereichGroesse', 'getBoundingClientRect', 'clientWidth', 'produktBuehne', 'fensterSchluessel'];
  for (const f of ['druckdateiErzeugen', 'druckdateiVorbereiten', 'ebenenZeichnen', 'podKarteWert', 'eigenschaften', 'beschreibung', 'geo']) {
    const r = rumpf(f);
    pruefe(`Quelltext: Funktion ${f} gefunden`, !!r && r.length > 80);
    pruefe(`Quelltext: ${f} liest keine Ansicht, keine Bühne und keine Bildschirmmasse`, !!r && verboten.every((v) => !r.includes(v)), r ? verboten.filter((v) => r.includes(v)).join(',') : '');
  }
  pruefe('Quelltext: die neue CSS-Regel max-width:none!important steht bei .lsp6-bg,.lsp6-tpl (genau einmal)', (q.match(/'\.lsp6-bg,\.lsp6-tpl\{position:absolute;display:block;max-width:none!important;max-height:none!important/g) || []).length === 1);
  pruefe('Quelltext: prefers-reduced-motion wird respektiert (keine Übergänge, keine Animation)', /prefers-reduced-motion:reduce\)\{\.lsp6 \*[^}]*transition:none!important;animation:none!important/.test(q));
  pruefe('Quelltext: tabsAufbauen ruft modellHinweisAktualisieren() vor dem Rücksprung', /if \(ids\.length < 2\) \{ ui\.tabs\.hidden = true; modellHinweisAktualisieren\(\); return; \}/.test(q));
  pruefe('Quelltext: der Entwurf kennt keine Ansicht (ebeneFuerEntwurf/entwurfSpeichern lesen st.sicht nicht)', !/function (entwurfSpeichern|speichern|entwurfSofort)\([^)]*\) \{[^}]*st\.sicht/.test(q));
  pruefe('Quelltext: keine Berechnung der Vorschau-Canvas in knotenZeichnen (nur vorschauPlanen, die nur in «Vorschau» arbeitet)', /function vorschauPlanen\(\) \{\n *if \(st\.sicht !== 'produkt'/.test(q));
});

// ── 11. Korrekturen nach der Gegenprüfung vom 09.11.2026 ─────────────────────────────────────────
const JUTE_V = liveVarianten(lies(`lspod-${TASCHE_ID}.karte.json`));
const griffLage = (p) => p.evaluate(() => {
  const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
  return { stage: r('.lsp6-stage'), handle: r('.lsp6-handle'), del: r('.lsp6-del'), layer: r('.lsp6-layer'), chrome: r('.lsp6-chrome'), frame: r('.lsp6-chrome .lsp6-sel-frame') };
});
/** Liegt der runde Knopf k von g (Durchmesser 30 px, sichtbar ist die Scheibe, nicht das umschliessende Rechteck einer gedrehten Box) ganz in der Bühne? (Spielraum eps Pixel.) */
const imStueck = (g, k, eps = 0.6) => { const m = g[k] && { x: g[k].x + g[k].w / 2, y: g[k].y + g[k].h / 2 }; return !!m && m.x - 15 >= g.stage.x - eps && m.y - 15 >= g.stage.y - eps && m.x + 15 <= g.stage.x + g.stage.w + eps && m.y + 15 <= g.stage.y + g.stage.h + eps; };
const buehneZeigen = (p) => p.evaluate(() => document.querySelector('.lsp6-stage').scrollIntoView({ block: 'center' }));
const mitteVon = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const abstand = (a, b2) => Math.hypot(a.x - b2.x, a.y - b2.y);

szenario('griffe-rand', true, async (b, srv) => {
  // Fund (Browser-Prüfer): am Rand der Druckfläche ragten Griff und Löschknopf aus der Bühne und wurden beschnitten (Spezifikation S2: «Griffe nie beschnitten»). Nachgestellt am Bio-Jutebeutel mit
  // einem langen Text: ohne die Korrektur lag der Griff bei X = Rand ganz ausserhalb (sichtbarer Anteil 0).
  for (const [name, vp] of [['Handy 390 px', MOBIL], ['PC 1440 px', PC]]) {
    const s = await oeffnen(b, srv, liveQ(TASCHE_ID, JUTE_V), vp);
    const p = s.page;
    await sichtWarten(p);
    pruefe(`${name}: der Jutebeutel zeigt «Bearbeiten» auf dem Produkt`, await p.evaluate(() => window.LSPOD6.editors[0].produktBuehne()));
    await textHinzufuegen(p, 'AUSSERHALB DER DRUCKFLAECHE');
    const cm = await p.evaluate(() => window.LSPOD6.editors[0].geo().masse);
    for (const [cx, cy, rot] of [[1, 0.5, 0], [0, 0.5, 0], [0.5, 0, 0], [0.5, 1, 0], [1, 1, 0], [0, 0, 0], [1, 0.5, 35], [1, 1, 200], [0, 0, 120]]) {
      await feldSetzen(p, 'X (cm)', (cx * cm.breite).toFixed(2)); await feldSetzen(p, 'Y (cm)', (cy * cm.hoehe).toFixed(2)); await feldSetzen(p, 'Drehung °', rot);
      await p.waitForTimeout(60); await buehneZeigen(p);
      const g = await griffLage(p);
      const was = `${name} X=${cx} Y=${cy} Drehung ${rot}°`;
      pruefe(`${was}: der Skalieren-Griff liegt vollständig in der Bühne`, imStueck(g, 'handle'), JSON.stringify({ h: g.handle, st: g.stage }));
      pruefe(`${was}: der Löschknopf liegt vollständig in der Bühne`, imStueck(g, 'del'), JSON.stringify({ d: g.del, st: g.stage }));
      const treffer = await p.evaluate(([x1, y1, x2, y2]) => [document.elementFromPoint(x1, y1), document.elementFromPoint(x2, y2)].map((e) => (e && e.className) || ''), [g.handle.x + g.handle.w / 2, g.handle.y + g.handle.h / 2, g.del.x + g.del.w / 2, g.del.y + g.del.h / 2]);
      pruefe(`${was}: beide sind trefferbar`, /lsp6-handle/.test(treffer[0]) && /lsp6-del/.test(treffer[1]), JSON.stringify(treffer));
    }
    // Der nach innen gerutschte Griff bedient weiter: am Rand (X = Rand, Y = Mitte) anfassen und nach aussen ziehen, die Skalierung folgt dem Abstand zur Mitte der Ebene
    await feldSetzen(p, 'X (cm)', cm.breite.toFixed(2)); await feldSetzen(p, 'Y (cm)', (0.5 * cm.hoehe).toFixed(2)); await feldSetzen(p, 'Drehung °', 0);
    await p.waitForTimeout(60); await buehneZeigen(p);
    const g0 = await griffLage(p), e0 = (await ebenen(p))[0], C = mitteVon(g0.layer), H = mitteVon(g0.handle);
    const Z = { x: C.x + (H.x - C.x) * 0.8, y: C.y + (H.y - C.y) * 0.8 };   // etwas kleiner ziehen (nach innen), damit das Ziel in der Bühne bleibt
    await p.mouse.move(H.x, H.y); await p.mouse.down(); await p.mouse.move(Z.x, Z.y, { steps: 6 }); await p.mouse.up();
    const e1 = (await ebenen(p))[0];
    nahe(`${name}: der Griff am Bühnenrand skaliert nach dem Abstand zur Mitte der Ebene (Faktor ${(abstand(Z, C) / abstand(H, C)).toFixed(2)})`, e1.scale / e0.scale, abstand(Z, C) / abstand(H, C), 0.12);
    const g1 = await griffLage(p);
    pruefe(`${name}: nach dem Skalieren liegen Griff und Löschknopf weiter in der Bühne`, imStueck(g1, 'handle') && imStueck(g1, 'del'));
    // Druckversion: die Griffe sitzen wieder in der Ebene, ohne Verschiebung (6.3.1); zurück in «Bearbeiten» sind sie wieder innen
    await p.locator('.lsp6-sbtn[data-sicht="druck"]').click();
    pruefe(`${name}: Druckversion: Griff und Löschknopf ohne Verschiebung (transform none)`, await p.evaluate(() => ['.lsp6-handle', '.lsp6-del'].every((q) => getComputedStyle(document.querySelector(q)).transform === 'none')));
    await p.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').click();
    const g2 = await griffLage(p);
    pruefe(`${name}: zurück in «Bearbeiten»: Griff und Löschknopf wieder in der Bühne`, imStueck(g2, 'handle') && imStueck(g2, 'del'));
    pruefe(`${name}: keine Seitenfehler`, s.fehler.length === 0, s.fehler.join(' | '));
    await s.schliessen();
  }
  // Mitte der Druckfläche (kein Randfall): keine Verschiebung, die Griffe bleiben an den Ecken der Schicht
  const t = await oeffnen(b, srv, T71);
  await sichtWarten(t.page);
  await textHinzufuegen(t.page, 'Mitte');
  const gm = await griffLage(t.page);
  pruefe('Motiv in der Mitte: Griff und Löschknopf unverschoben (transform none)', await t.page.evaluate(() => ['.lsp6-handle', '.lsp6-del'].every((q) => getComputedStyle(document.querySelector(q)).transform === 'none')) && imStueck(gm, 'handle') && imStueck(gm, 'del'));
  await t.schliessen();
});

szenario('chrome-folgt', true, async (b, srv) => {
  // Fund (Code-Prüfer, Mutant BE17): Rahmen, Griff und Löschknopf liegen in der Schicht über dem Foto; sie müssen dem Motiv auch beim reinen Ziehen, bei der Pfeiltaste und im Zahlenfeld folgen (nicht nur beim Skalieren)
  const s = await oeffnen(b, srv, T71);
  const p = s.page;
  await sichtWarten(p);
  await textHinzufuegen(p, 'Hallo');
  const folgt = async (was) => {
    const g = await griffLage(p), ml = mitteVon(g.layer);
    pruefe(`${was}: die Schicht der Griffe liegt auf der Mitte der Ebene`, abstand(mitteVon(g.chrome), ml) <= 1.2, JSON.stringify({ chrome: mitteVon(g.chrome), layer: ml }));
    pruefe(`${was}: der gestrichelte Rahmen liegt auf der Mitte der Ebene (8 px Abstand rundum)`, abstand(mitteVon(g.frame), ml) <= 1.2 && Math.abs(g.frame.w - g.layer.w - 16) <= 1.5 && Math.abs(g.frame.h - g.layer.h - 16) <= 1.5, JSON.stringify({ frame: g.frame, layer: g.layer }));
    const dc = { x: g.handle.x + g.handle.w / 2 - ml.x, y: g.handle.y + g.handle.h / 2 - ml.y }, lc = { x: g.del.x + g.del.w / 2 - ml.x, y: g.del.y + g.del.h / 2 - ml.y };
    pruefe(`${was}: Griff und Löschknopf liegen sich gegenüber (Mitte der Ebene dazwischen)`, Math.hypot(dc.x + lc.x, dc.y + lc.y) <= 2.5, JSON.stringify({ dc, lc }));
  };
  await folgt('Ausgangslage');
  // reines Ziehen mit der Maus: schon während der Bewegung, ohne dass sich die Grösse ändert
  const l = await rect(p, '.lsp6-layer'), c0 = { x: l.x + l.w / 2, y: l.y + l.h / 2 };
  await p.mouse.move(c0.x, c0.y); await p.mouse.down(); await p.mouse.move(c0.x + 40, c0.y + 25, { steps: 4 });
  await folgt('mitten im Ziehen');
  await p.mouse.move(c0.x + 70, c0.y + 45, { steps: 4 }); await p.mouse.up();
  await folgt('nach dem Ziehen');
  await p.locator('.lsp6').focus();
  await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowDown');
  await folgt('nach Pfeiltasten');
  await feldSetzen(p, 'X (cm)', 11); await feldSetzen(p, 'Y (cm)', 17);
  await folgt('nach dem Zahlenfeld');
  // Hilfslinien: in «Bearbeiten» liegen sie in der Schicht über dem Produktfoto (sonst verdeckt das Foto sie), in der Druckversion im Host
  const guide = () => p.evaluate(() => { const g = document.querySelector('.lsp6-guide'); const t = document.querySelector('.lsp6-tpl'); const par = g.parentElement; return { eltern: par.className, z: Number(getComputedStyle(par).zIndex) || 0, tpl: Number(getComputedStyle(t).zIndex) || 0 }; });
  const gb = await guide();
  pruefe('Hilfslinien liegen in «Bearbeiten» in der Schicht über dem Produktfoto', /lsp6-chrome-host/.test(gb.eltern) && gb.z > gb.tpl, JSON.stringify(gb));
  await p.locator('.lsp6-sbtn[data-sicht="druck"]').click();
  pruefe('Hilfslinien liegen in der Druckversion im Host (wie 6.3.1)', /lsp6-host/.test((await guide()).eltern), JSON.stringify(await guide()));
  await p.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').click();
  // Kleines Motiv: die Schicht ist mindestens 64 × 64 px gross, der Rahmen bleibt eng am Motiv
  await feldSetzen(p, 'Schrifthöhe (mm)', 3);
  await p.locator('.lsp6-text').fill('i');
  const gk = await griffLage(p);
  pruefe('kleines Motiv: die Ebene ist kleiner als 64 px', gk.layer.h < 60 && gk.layer.w < 60, JSON.stringify(gk.layer));
  pruefe('kleines Motiv: die Schicht der Griffe ist mindestens 64 × 64 px (Mindestmass, damit Griff und Löschknopf nicht auf dem Motiv liegen)', gk.chrome.w >= 63.5 && gk.chrome.h >= 63.5, JSON.stringify(gk.chrome));
  await folgt('kleines Motiv');
  // Zoom: die Auswahl bleibt, die Griffe auch
  await p.locator('.lsp6-text').fill('Hallo');
  const sel0 = await p.evaluate(() => window.LSPOD6.editors[0].st.sel);
  for (const knopf of ['Zoom +', 'Zoom −', 'Zoom −', 'Zoom +']) {
    await p.getByRole('button', { name: knopf }).click();
    pruefe(`${knopf}: die Ebene bleibt gewählt, die Griffe sind sichtbar`, (await p.evaluate(() => window.LSPOD6.editors[0].st.sel)) === sel0 && await p.locator('.lsp6-handle').isVisible() && await p.locator('.lsp6-del').isVisible());
    await folgt(`nach ${knopf}`);
  }
  // Hinweiszeile unter den Reitern (Fund: nur der Text wurde geprüft, nicht die Sichtbarkeit; ein verborgenes Element hat in innerText trotzdem seinen Text)
  const note = p.locator('[data-feld="sichtnote"]');
  pruefe('Bearbeiten: die Hinweiszeile unter den Reitern ist sichtbar', await note.isVisible() && /Produktfoto/.test(await note.innerText()));
  await p.locator('.lsp6-sbtn[data-sicht="druck"]').click();
  pruefe('Druckversion: die Hinweiszeile ist sichtbar und nennt die Druckdatei', await note.isVisible() && /So wird die Druckdatei/.test(await note.innerText()));
  await p.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  pruefe('Vorschau: keine Hinweiszeile (nicht sichtbar)', !(await note.isVisible()));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

szenario('ohne-resizeobserver', true, async (b, srv) => {
  // Umgebung ohne ResizeObserver (ältere Browser): Zoom und das Nachladen eines Fotos müssen die Ebenen und Griffe trotzdem richtig setzen (Mutanten BE01 und BE18: sonst vom ResizeObserver gedeckt)
  const s = await oeffnen(b, srv, T71, { initSkript: 'window.ResizeObserver = undefined;' });
  const p = s.page;
  await sichtWarten(p);
  pruefe('ohne ResizeObserver: kein Seitenfehler beim Start', s.fehler.length === 0, s.fehler.join(' | '));
  const id = await motivHinzu(p, '#2040c0');
  await bilderGeladen(p);
  await p.waitForTimeout(150);   // kein weiteres Ereignis: nur das Laden des Fotos kann Rahmen und Schicht jetzt noch nachziehen (Mutant B64)
  const sitzt = async (was) => {
    const g = await griffLage(p), h = await rect(p, '.lsp6-host'), e = (await ebenen(p))[0];
    const soll = { x: h.x + e.cx * h.w, y: h.y + e.cy * h.h };
    pruefe(`${was}: die Ebene sitzt auf der Mitte, die der Entwurf nennt (cx/cy × Druckfläche)`, abstand(mitteVon(g.layer), soll) <= 1.5, JSON.stringify({ ist: mitteVon(g.layer), soll }));
    pruefe(`${was}: der Rahmen liegt 8 px um das Foto`, Math.abs(g.frame.w - g.layer.w - 16) <= 1.5 && Math.abs(g.frame.h - g.layer.h - 16) <= 1.5 && abstand(mitteVon(g.frame), mitteVon(g.layer)) <= 1.5, JSON.stringify({ frame: g.frame, layer: g.layer }));
  };
  await sitzt('gleich nach dem Laden des Fotos');
  await feldSetzen(p, 'X (cm)', 8); await feldSetzen(p, 'Y (cm)', 12); await feldSetzen(p, 'Breite (cm)', 6);
  await sitzt('nach den Zahlenfeldern');
  for (const knopf of ['Zoom +', 'Zoom −', 'Zoom −']) {
    await p.getByRole('button', { name: knopf }).click();
    await sitzt(`nach ${knopf}`);
  }
  pruefe('ohne ResizeObserver: keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

szenario('rueckfall-reiter', true, async (b, srv) => {
  // (a) Fund BE10: kann die Vorschau nicht gezeichnet werden und es gibt keinen Reiter «Druckversion» (Tasse), fällt die Ansicht auf «Bearbeiten» zurück (nicht in den unsichtbaren Reiter)
  const t = await oeffnen(b, srv, T19, { shopifyBild: (u) => (/\.jpg/.test(u) ? { status: 404, typ: 'text/plain', body: '' } : null) });
  await sichtWarten(t.page);
  pruefe('Tasse: Reiter Bearbeiten und Vorschau, kein Reiter Druckversion', (await tabsText(t.page)).join('|') === 'Bearbeiten|Vorschau');
  await t.page.locator('.lsp6-sbtn[data-sicht="produkt"]').click();
  await t.page.waitForFunction(() => window.LSPOD6.editors[0].st.sicht === 'bearbeiten', null, { timeout: 8000 }).catch(() => {});
  pruefe('Tasse ohne Katalogfoto: die Vorschau scheitert, die Ansicht fällt auf «Bearbeiten» zurück', (await sicht(t.page)) === 'bearbeiten', await sicht(t.page));
  pruefe('Tasse ohne Katalogfoto: der Reiter «Bearbeiten» ist gewählt, die Bühne sichtbar, die Canvas verborgen', await t.page.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').getAttribute('aria-selected') === 'true' && await t.page.locator('.lsp6-stagewrap').isVisible() && await t.page.locator('.lsp6-pvwrap').isHidden());
  const hinweis = t.page.locator('[data-feld="sichthinweis"]');
  pruefe('Tasse ohne Katalogfoto: der Hinweis sagt ruhig, dass die Vorschau nicht verfügbar ist, und nennt «Bearbeiten»', await hinweis.isVisible() && /Produktvorschau/.test(await hinweis.innerText()) && /«Bearbeiten»/.test(await hinweis.innerText()), await hinweis.innerText());
  pruefe('Tasse ohne Katalogfoto: keine Seitenfehler', t.fehler.length === 0, t.fehler.join(' | '));
  await t.schliessen();
  // (b) Fund BE24: ein veralteter Fehler (Adresse ≠ aktuelles Bild) erzwingt keinen Rückfall
  const u = await oeffnen(b, srv, SHIRT_Q());
  await sichtWarten(u.page);
  await u.page.evaluate(() => { const ed = window.LSPOD6.editors[0]; ed.ui.tplFehlerUrl = 'https://files.cdn.printful.com/m/veraltet.png'; ed.zoomSetzen('flaeche'); ed.zoomSetzen('produkt'); });
  pruefe('veralteter Fehler einer anderen Adresse: «Bearbeiten» bleibt (nur das gerade gezeigte Foto zählt)', (await sicht(u.page)) === 'bearbeiten' && await u.page.evaluate(() => window.LSPOD6.editors[0].produktBuehne()));
  await u.schliessen();
  // (c) Fund (Code-Prüfer): nach einem einmaligen Ladefehler des Produktfotos ist «Bearbeiten» nicht bis zum Neuladen der Seite gesperrt, jede erneute Wahl versucht es noch einmal
  let tot = true, anfragen = 0;
  const v = await oeffnen(b, srv, SHIRT_Q(), { printfulBild: (x) => { if (!/\/m\//.test(x)) return null; anfragen++; return tot ? { status: 404, typ: 'text/plain', body: '' } : { typ: 'image/png', body: geisterPng() }; } });
  await v.page.waitForFunction(() => window.LSPOD6 && window.LSPOD6.editors[0] && window.LSPOD6.editors[0].st.sicht === 'druck', null, { timeout: 10000 }).catch(() => {});
  pruefe('einmaliger Ladefehler: Rückfall auf «Druckversion»', (await sicht(v.page)) === 'druck', await sicht(v.page));
  const vorher = anfragen;
  tot = false;
  await v.page.locator('.lsp6-sbtn[data-sicht="bearbeiten"]').click();
  await v.page.waitForFunction(() => { const t = document.querySelector('.lsp6-tpl'); return window.LSPOD6.editors[0].st.sicht === 'bearbeiten' && t.complete && t.naturalWidth > 0; }, null, { timeout: 8000 }).catch(() => {});
  pruefe('nach dem Ladefehler: die erneute Wahl von «Bearbeiten» lädt das Foto noch einmal und zeigt das Produkt', (await sicht(v.page)) === 'bearbeiten' && await v.page.evaluate(() => window.LSPOD6.editors[0].produktBuehne() && document.querySelector('.lsp6-tpl').naturalWidth > 0) && anfragen > vorher, `anfragen ${vorher} → ${anfragen}`);
  pruefe('einmaliger Ladefehler: keine Seitenfehler', v.fehler.length === 0, v.fehler.join(' | '));
  await v.schliessen();
  // (d) Fokus: nach dem Verschwinden der Reiter bleibt der Fokus nie auf einem verborgenen Element
  const w = await oeffnen(b, srv, T71);
  await sichtWarten(w.page);
  await w.page.locator('.lsp6-sbtn[data-sicht="druck"]').click();
  const roh = await w.page.evaluate(async () => (await fetch('/vorschau/71.json?spiegel=1')).json());
  roh.modelle['71'].bilder = {};
  await w.page.evaluate((d) => window.LSPOD6.editors[0].vorschauDatenSetzen(d), roh);
  pruefe('Vorschaudaten ohne Produktfoto: «Bearbeiten» zeigt die Bühne von 6.3.1, der Fokus liegt nicht auf einem verborgenen Reiter', await w.page.evaluate(() => { const a = document.activeElement; return window.LSPOD6.editors[0].st.sicht === 'bearbeiten' && !window.LSPOD6.editors[0].produktBuehne() && (!a || (!a.hidden && a.getClientRects().length > 0) || a === document.body); }));
  await w.schliessen();
});

szenario('foto-quelle', true, async (b, srv) => {
  // Fund: die Bühne lud das Produktfoto von der Printful-Adresse, die Vorschau vom Spiegel (zwei Downloads, zwei Ausfallrisiken). Mit den Reitern lädt die Bühne jetzt dieselbe Datei wie die Vorschau.
  const s = await oeffnen(b, srv, T71);
  await sichtWarten(s.page);
  await bilderGeladen(s.page);
  const quelle = await s.page.evaluate(() => document.querySelector('.lsp6-tpl').getAttribute('src'));
  pruefe('Bearbeiten: das Produktfoto kommt vom Spiegel auf Shopify Files (wie die Vorschau)', /^https:\/\/cdn\.shopify\.com\/.*luxe-vorschau-[0-9a-f]+\.png/.test(quelle), quelle);
  await s.page.locator('.lsp6-sbtn[data-sicht="druck"]').click();
  pruefe('Druckversion: dieselbe Datei (kein zweiter Download desselben Fotos)', (await s.page.evaluate(() => document.querySelector('.lsp6-tpl').getAttribute('src'))) === quelle);
  // Grenze (GEMESSEN): bis die Vorschaudaten da sind, kennt der Editor den Spiegel nicht, die Bühne lädt dann einmal die Printful-Adresse; danach nie wieder
  pruefe('höchstens ein Aufruf von files.cdn.printful.com für das Produktfoto (nur der Start vor den Vorschaudaten)', s.bildAnfragen.filter((u) => /files\.cdn\.printful\.com\/m\//.test(u)).length <= 1, s.bildAnfragen.filter((u) => /printful/.test(u)).join(' '));
  await s.schliessen();
  // Printful nicht erreichbar (Werbeblocker, Filter), der Spiegel schon: «Bearbeiten» zeigt das Produkt weiter. Die Vorschaudaten kommen verzögert (600 ms), der Fehler der Printful-Adresse trifft also VOR ihnen ein
  // und darf den Rückfall nicht auslösen, wenn die Bühne danach auf den Spiegel wechselt (die Adresse des Fehlers ist nicht mehr die gezeigte)
  const t = await oeffnen(b, srv, T71 + '&vverz=600', { printfulBild: (u) => (/\/m\//.test(u) ? { status: 404, typ: 'text/plain', body: '' } : null) });
  await sichtWarten(t.page);
  await bilderGeladen(t.page);
  pruefe('Printful 404 vor den Vorschaudaten, Spiegel erreichbar: «Bearbeiten» zeigt das Produkt (kein Rückfall auf «Druckversion»)', await t.page.evaluate(() => window.LSPOD6.editors[0].produktBuehne() && document.querySelector('.lsp6-tpl').naturalWidth > 0 && window.LSPOD6.editors[0].st.sicht === 'bearbeiten'), await sicht(t.page));
  pruefe('Printful 404: der Fehler der alten Adresse wurde gemerkt (sonst prüft der Test die Regel nicht)', await t.page.evaluate(() => /printful/.test(window.LSPOD6.editors[0].ui.tplFehlerUrl || '')));
  pruefe('Printful 404: keine Seitenfehler', t.fehler.length === 0, t.fehler.join(' | '));
  await t.schliessen();
  // data-bearbeiten=0 (6.3.1): die Bühne lädt die Printful-Adresse wie bisher
  const z = await oeffnen(b, srv, T71.replace('bearbeiten=1', 'bearbeiten=0'));
  await sichtWarten(z.page);
  await bilderGeladen(z.page);
  pruefe('data-bearbeiten=0: das Produktfoto der Bühne kommt von der Printful-Adresse (Verhalten wie 6.3.1)', /^https:\/\/files\.cdn\.printful\.com\/m\//.test(await z.page.evaluate(() => document.querySelector('.lsp6-tpl').getAttribute('src'))));
  await z.schliessen();
});

szenario('text-gleich', true, async (b, srv) => {
  // Fund (Linse «Gleiche Vorschau»): die Bühne zeichnete Text mit anderer Schrift und anderem Gewicht als die Leinwand von Vorschau und Druckdatei (bis 9 % breiter, bis 57 % mehr Tinte). Gemessen wird,
  // womit die Leinwand wirklich zeichnet (ctx.font der Druckdatei, abgefangen), und womit die Bühne zeichnet (berechneter Stil des Textes): Familie, Gewicht, Schrägstellung und die Breite eines Textes.
  const init = `(() => { window.__fonts = []; const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font'); Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', { get() { return d.get.call(this); }, set(v) { window.__fonts.push(String(v)); d.set.call(this, v); }, configurable: true }); })();`;
  const norm = (f) => String(f).replace(/["']/g, '').replace(/\s*,\s*/g, ',').trim();
  for (const [name, abfrage, aus] of [['mit Reitern', T71, false], ['data-bearbeiten=0 (6.3.1)', T71.replace('bearbeiten=1', 'bearbeiten=0'), true]]) {
    const s = await oeffnen(b, srv, abfrage, { initSkript: init });
    const p = s.page;
    await sichtWarten(p);
    const id = await p.evaluate(() => window.LSPOD6.editors[0].neuerText('Printful 24 Gewicht').id);
    for (const schrift of [0, 1, 2, 3, 4]) for (const [fett, kursiv] of [[undefined, false], [false, false], [true, true]]) {
      const r = await p.evaluate(async ([i, f, k, sch]) => {
        const ed = window.LSPOD6.editors[0], e = ed.st.ebenen[ed.st.aktiv].find((q) => q.id === i);
        e.bold = f; e.italic = k; ed.ui.schriftwahl.selectedIndex = sch; ed.ui.schriftwahl.dispatchEvent(new Event('change', { bubbles: true }));
        window.__fonts = [];
        await ed.druckdateiErzeugen(ed.st.aktiv, { skala: 0.3 });
        const c = document.querySelector('.lsp6-layer > div'), cs = getComputedStyle(c);
        const leinwand = window.__fonts.filter((x) => /\dpx /.test(x)).pop() || '';
        const mx = document.createElement('canvas').getContext('2d');
        mx.font = leinwand.replace(/\d+(\.\d+)?px/, cs.fontSize);
        return { leinwand, familie: cs.fontFamily, gewicht: cs.fontWeight, stil: cs.fontStyle, breite: c.getBoundingClientRect().width, leinwandBreite: mx.measureText(c.textContent).width, schatten: cs.textShadow };
      }, [id, fett, kursiv, schrift]);
      const m = /^(italic )?(bold |900 )?([\d.]+)px (.*)$/.exec(r.leinwand);
      const was = `${name}, Schrift ${schrift + 1}, fett ${fett === undefined ? 'Vorgabe' : fett}, kursiv ${kursiv}`;
      if (!m) { pruefe(`${was}: die Leinwand hat eine Schrift gesetzt`, false, JSON.stringify(r)); continue; }
      if (aus) {
        pruefe(`${was}: 6.3.1 bleibt unverändert (Gewicht 800 oder 400, Familie der Bühne)`, (r.gewicht === '800' || r.gewicht === '400') && !!r.familie, JSON.stringify(r));
        continue;
      }
      const gewichtLeinwand = m[2] ? (m[2] === 'bold ' ? '700' : '900') : '400';
      pruefe(`${was}: dieselbe Schriftfamilie wie die Leinwand`, norm(r.familie) === norm(m[4]), `${r.familie} gegen ${m[4]}`);
      pruefe(`${was}: dasselbe Gewicht wie die Leinwand (${gewichtLeinwand})`, r.gewicht === gewichtLeinwand, `${r.gewicht} gegen ${gewichtLeinwand}`);
      pruefe(`${was}: dieselbe Schrägstellung`, (r.stil === 'italic') === !!m[1], r.stil);
      pruefe(`${was}: die Breite des Textes stimmt mit der Leinwand überein (≤ 1 %)`, Math.abs(r.breite / r.leinwandBreite - 1) <= 0.01, `${r.breite} gegen ${r.leinwandBreite}`);
    }
    if (!aus) {
      // senkrechter Versatz der Zeile: proportional zur Schrifthöhe (derselbe Bruchteil einer Schrifthöhe bei 15 mm und bei 70 mm; Mutant B81 rechnet mit einer festen Pixelzahl)
      const anteil = async (mm) => { await feldSetzen(p, 'Schrifthöhe (mm)', mm); return p.evaluate(() => { const c = document.querySelector('.lsp6-layer > div'), cs = getComputedStyle(c); return { top: parseFloat(cs.top), px: parseFloat(cs.fontSize), pos: cs.position }; }); };
      await p.evaluate((i) => window.LSPOD6.editors[0].waehlen(i), id);
      const klein = await anteil(15), gross = await anteil(70);
      pruefe(`${name}: der Versatz der Zeile ist proportional zur Schrifthöhe (15 mm gegen 70 mm)`, klein.pos === 'relative' && gross.px > 3 * klein.px && Math.abs(klein.top / klein.px - gross.top / gross.px) <= 0.004, JSON.stringify({ klein, gross }));
      pruefe(`${name}: der Versatz ist klein (unter 0,2 em), keine ungeprüfte Verschiebung`, Math.abs(gross.top / gross.px) < 0.2, JSON.stringify(gross));
    }
    // weisse Schrift: derselbe Schlagschatten wie die Leinwand (ohne Versatz, Unschärfe 0,12 · Schrifthöhe)
    const sch = await p.evaluate((i) => { const ed = window.LSPOD6.editors[0], e = ed.st.ebenen[ed.st.aktiv].find((q) => q.id === i); e.color = '#ffffff'; ed.ui.schriftwahl.dispatchEvent(new Event('change', { bubbles: true })); const c = document.querySelector('.lsp6-layer > div'), cs = getComputedStyle(c); return { schatten: cs.textShadow, px: parseFloat(cs.fontSize) }; }, id);
    const mm = /rgba\(0, 0, 0, ([\d.]+)\) (-?[\d.]+)px (-?[\d.]+)px ([\d.]+)px/.exec(sch.schatten);
    if (aus) pruefe(`${name}: weisse Schrift: der Schatten der Bühne bleibt wie in 6.3.1 (Versatz 1 px)`, !!mm && Number(mm[3]) === 1, sch.schatten);
    else pruefe(`${name}: weisse Schrift: Schatten ohne Versatz, Unschärfe 0,12 · Schrifthöhe, Deckkraft 0,4 (wie ctx.shadowBlur)`, !!mm && Number(mm[2]) === 0 && Number(mm[3]) === 0 && Math.abs(Number(mm[4]) - sch.px * 0.12) <= 0.15 && Math.abs(Number(mm[1]) - 0.4) <= 0.01, `${sch.schatten} (Schrifthöhe ${sch.px})`);
    pruefe(`${name}: keine Seitenfehler`, s.fehler.length === 0, s.fehler.join(' | '));
    await s.schliessen();
  }
});


// ── Lauf ────────────────────────────────────────────────────────────────────────────────────────
const srv = await starteServer();
const browser = await chromium.launch();
const auswahl = szenarien.filter((x) => (nur === 'kern' ? x.kern : !nur || x.name.startsWith(nur)));
for (const sz of auswahl) {
  const t0 = Date.now();
  const vorher = fehler.length;
  try { await sz.fn(browser, srv); } catch (e) { n++; fehler.push(`${sz.name}: Ausnahme ${e.message.split('\n')[0]}`); console.log(`  ✗ ${sz.name}: Ausnahme ${e.message.split('\n').slice(0, 3).join(' / ')}`); if (process.env.V6_ABBRUCH) process.exit(1); }
  console.log(`${fehler.length === vorher ? '✓' : '✗'} ${sz.name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
await browser.close(); await srv.stop();
console.log(fehler.length ? `\n${fehler.length} von ${n} Prüfungen FEHLGESCHLAGEN` : `\n${n} Prüfungen bestanden`);
process.exit(fehler.length ? 1 : 0);
