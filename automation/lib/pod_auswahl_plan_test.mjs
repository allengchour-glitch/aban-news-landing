// Tests für den Plan «Selbst gestalten: Material + Modelle» gegen die ECHTEN Daten (dropship/pod-auswahl/*.json, gemessen 27.10.2026). Kein Netz.
// Lauf: /opt/node22/bin/node automation/lib/pod_auswahl_plan_test.mjs
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { planeAlles, materialMetafeldBefund, pfIdAusSku, setzeMaterialBlock, materialBlock, modellVergleich, benoetigteVersandIds, tabellenZeilen, tabelleCsv, tabelleMarkdown, zollZeile, kanonisch, formatCm, passendeFormate, preisleiterBefunde, textBefunde, kollisionenVon, kollisionsBefunde, umstellungsRechnung, umstellungsText, aktionenFuerHash, hashVon, materialOptionAbweichungen, pruefePlan } from './pod_auswahl_plan.mjs';
import { SPEC, MARKE_AUF, MARKE_ZU, ZUSATZ_BELEGE } from './pod_auswahl_spec.mjs';
import { ladePaket } from './pod_auswahl_daten.mjs';
import { endpreis, nettoOhneKundenversand, REGEL } from './pod_preise.mjs';
import { platzierungFuer } from './printful_platzierung.mjs';
import { blockVon, ohneBlock } from './pod_auswahl_schreiben.mjs';

let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 400)}\n   soll: ${JSON.stringify(b).slice(0, 400)}`); } };
const wahr = (n, c, info = '') => ist(n + (c ? '' : ' ' + info), !!c, true);

const paket = ladePaket();
const { katalog, beschreibungen, versand, bestand, skuPruefung, skuIndex, skuIndexAbgeschnitten } = paket;
const klon = (x) => JSON.parse(JSON.stringify(x));
const planen = (ueber = {}) => planeAlles({ katalog, beschreibungen, versand, bestand, skuPruefung, skuIndex, skuIndexAbgeschnitten, ...ueber });
const plan = planen();
const P = (h) => plan.produkte.find((p) => p.handle === h);
const HANDLES = SPEC.map((s) => s.handle);

// ── Datenpaket selbst
ist('Datenpaket: Katalog hat die 17 gebrauchten Printful-Produkte', Object.keys(katalog).map(Number).sort((a, b) => a - b), [3, 71, 146, 171, 181, 267, 268, 304, 380, 438, 456, 586, 601, 684, 686, 798, 821]);
wahr('Datenpaket: Versandraten vorhanden (Stand 27.10.2026)', paket.meta.versand.stand === '2026-10-27' && Object.keys(versand).length >= 200, String(Object.keys(versand).length));
wahr('Datenpaket: jede Versandrate hat Betrag in USD oder einen Fehlertext', Object.values(versand).every((r) => typeof r.usd === 'number' || typeof r.fehler === 'string'));
ist('Versand: keine Fehlerraten', Object.entries(versand).filter(([, r]) => r.fehler).map(([k]) => k), []);
// Gegenprobe gegen den Roh-Schnappschuss, wenn er auf diesem Rechner liegt (in der CI fehlt er → übersprungen)
if (existsSync('/tmp/pod/katalog_pod.json')) {
  const roh = JSON.parse(readFileSync('/tmp/pod/katalog_pod.json', 'utf8'));
  let abw = [];
  for (const [id, p] of Object.entries(katalog)) for (const v of p.variants) { const r = roh[id]?.variants.find((x) => x.id === v.id); if (!r || r.price !== v.price || (r.avail?.EU ?? null) !== v.eu || r.size !== v.size) abw.push(`${id}/${v.id}`); }
  ist('Katalog-Datenpaket stimmt mit /tmp/pod/katalog_pod.json überein (Preis, EU-Lager, Grösse)', abw.slice(0, 5), []);
} else console.log('(kein /tmp/pod/katalog_pod.json → Roh-Gegenprobe übersprungen)');

// ── Aufbau
ist('fünf Produkte in der Reihenfolge der Spezifikation', plan.produkte.map((p) => p.handle), HANDLES);
ist('keine Verstösse im Plan', plan.verstoesse, []);
wahr('Plan-Hash ist ein SHA-256', /^[0-9a-f]{64}$/.test(plan.hash));
ist('Plan-Hash ist stabil (zweite Berechnung gleich)', planen().hash, plan.hash);

// ── Option-Namen und Reihenfolge: Material zuerst
const optNamen = (h) => P(h).optionen.nachher.map((o) => o.name);
ist('Poster: Optionen Material → Grösse', optNamen('poster-zum-selbstgestalten'), ['Material', 'Grösse']);
ist('Hoodie: Optionen Material → Grösse', optNamen('unisex-hoodie-selbst-gestalten'), ['Material', 'Grösse']);
ist('T-Shirt: Optionen Material → Grösse', optNamen('unisex-t-shirt-selbst-gestalten'), ['Material', 'Grösse']);
ist('iPhone: Optionen Material → Handymodell', optNamen('hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten'), ['Material', 'Handymodell']);
ist('Samsung: Optionen Material → Handymodell', optNamen('samsung-huelle-selbst-gestalten'), ['Material', 'Handymodell']);
for (const p of plan.produkte) ist(`${p.handle}: Positionen 1..n`, p.optionen.nachher.map((o) => o.position), p.optionen.nachher.map((_, i) => i + 1));
const werte = (h, n) => P(h).optionen.nachher.find((o) => o.name === n).werte;
ist('Poster: Material-Werte exakt', werte('poster-zum-selbstgestalten', 'Material'), ['Poster matt', 'Foto-Glanzpapier', 'Leinwand', 'Gerahmt · Schwarz', 'Gerahmt · Weiss', 'Gerahmt · Eiche']);
ist('Poster: Grösse-Beschriftungen unverändert', werte('poster-zum-selbstgestalten', 'Grösse'), ['30×40 cm', '50×70 cm', '70×100 cm', 'A2 (42×59,4 cm)']);
ist('Hoodie: Material-Werte exakt', werte('unisex-hoodie-selbst-gestalten', 'Material'), ['Sweatshirt (Rundhals)', 'Premium-Baumwolle', 'Bio-Baumwolle']);
ist('T-Shirt: Material-Werte exakt', werte('unisex-t-shirt-selbst-gestalten', 'Material'), ['Ringgarn-Baumwolle', 'Klassische Baumwolle', 'Bio-Baumwolle', 'Heavyweight-Baumwolle']);
ist('iPhone: Material-Werte exakt', werte('hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten', 'Material'), ['Hartschale MagSafe', 'Hartschale', 'Klare Hülle']);
ist('Samsung: Material-Werte exakt', werte('samsung-huelle-selbst-gestalten', 'Material'), ['Hartschale matt', 'Hartschale glänzend', 'Klare Hülle', 'Slim-Hülle']);
ist('T-Shirt/Hoodie: Grösse-Beschriftungen unverändert (nur die vorhandenen)', [werte('unisex-t-shirt-selbst-gestalten', 'Grösse'), werte('unisex-hoodie-selbst-gestalten', 'Grösse')],
  [['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'], ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']]);
ist('iPhone: Modelle = die 16 vorhandenen, keine neuen', werte('hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten', 'Handymodell'), bestand['hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten'].options[0].values);

// ── Anzahl Varianten je Produkt (von Hand gezählt, siehe Kommentar), höchstens 100
const anz = (h) => [P(h).summe.bestehend, P(h).summe.neu, P(h).summe.gesamt];
ist('Poster: 4 vorhandene + 14 neu (Glanz 3, Leinwand 3, Rahmen 3+3+2: Schwarz 50×70 hat kein EU-Lager)', anz('poster-zum-selbstgestalten'), [4, 14, 18]);
ist('Hoodie: 8 vorhandene + 11 neu (Premium 6: 4XL ohne EU-Lager; Bio 5: S–2XL)', anz('unisex-hoodie-selbst-gestalten'), [8, 11, 19]);
ist('T-Shirt: 9 vorhandene + 24 neu (Klassisch 8, Bio 9, Heavyweight 7)', anz('unisex-t-shirt-selbst-gestalten'), [9, 24, 33]);
ist('iPhone: 16 vorhandene + 32 neu (je 16 Modelle)', anz('hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten'), [16, 32, 48]);
ist('Samsung: 84 neu (23 + 23 + 18 + 20)', anz('samsung-huelle-selbst-gestalten'), [0, 84, 84]);
for (const p of plan.produkte) wahr(`${p.handle}: höchstens 100 Varianten`, p.summe.gesamt <= 100);
ist('Samsung: Varianten je Material', ['Hartschale matt', 'Hartschale glänzend', 'Klare Hülle', 'Slim-Hülle'].map((m) => P('samsung-huelle-selbst-gestalten').neu.filter((v) => v.optionen.Material === m).length), [23, 23, 18, 20]);
ist('Summe neuer Varianten', plan.summe.neueVarianten, 14 + 11 + 24 + 32 + 84);

// ── SKUs: eindeutig, enden auf eine Printful-Nummer, die im Katalog des gemeinten Produkts liegt (unabhängig aus Spezifikation + Katalog geprüft)
for (const s of SPEC) {
  const p = P(s.handle);
  const alle = [...p.bestehende, ...p.neu];
  ist(`${s.handle}: keine doppelten SKUs`, new Set(alle.map((v) => v.sku)).size, alle.length);
  for (const v of p.neu) {
    const mat = s.materialien.find((m) => m.wert === v.optionen.Material);
    const nr = pfIdAusSku(v.sku);
    const kat = katalog[String(mat.printfulProdukt)];
    wahr(`${s.handle}: ${v.sku} liegt im Katalog von Produkt ${mat.printfulProdukt}`, kat.variants.some((x) => x.id === nr));
    ist(`${s.handle}: SKU-Form ${v.sku}`, v.sku, `${s.skuPraefix}_${nr}`);
    const kv = kat.variants.find((x) => x.id === nr);
    ist(`${s.handle}: ${v.sku} hat EU-Lager`, kv.eu, 'in_stock');
    ist(`${s.handle}: ${v.sku} Einkauf = Katalogpreis`, v.einkaufUsd, Number(kv.price));
  }
}
// SKU-Nummern gehören über ALLE neuen Varianten zu genau einem Printful-Produkt (keine Mischung zwischen Material A und B)
{
  const proNr = new Map(); let zwiespalt = 0;
  for (const p of plan.produkte) for (const v of p.neu) { const k = pfIdAusSku(v.sku); const bisher = proNr.get(k); if (bisher && bisher !== v.printfulProdukt) zwiespalt++; proNr.set(k, v.printfulProdukt); }
  ist('Printful-Nummer gehört nie zu zwei Produkten', zwiespalt, 0);
}

// ── Preise: unabhängig nachgerechnet (Brute Force), nie unter der Regel
function sollPreis(ekUsd, vsUsd) {
  const e = Math.round(ekUsd * 90 + 1e-9), v = Math.round(vsUsd * 90 + 1e-9), rw = Math.max(e * 2.3, e + 1200);
  for (let p = 90; p <= 14990; p += 100) { const er = p + (p < 5000 ? 700 : 0); if (p >= rw - 1e-9 && er - (Math.round(er * 0.034 + 1e-9) + 30) - e - v >= 1200) return p / 100; }
  return null;
}
{
  let falsch = [], n = 0;
  for (const p of plan.produkte) for (const v of p.neu) {
    n++;
    const soll = sollPreis(v.einkaufUsd, v.versandUsd);
    if (soll !== v.preisChf) falsch.push([v.sku, soll, v.preisChf]);
    if (!(v.nettoChf >= 12)) falsch.push([v.sku, 'netto', v.nettoChf]);
    if (!(v.preisChf >= v.richtwertChf - 0.005)) falsch.push([v.sku, 'richtwert', v.preisChf, v.richtwertChf]);
    if (!(v.preisChf <= 149.90)) falsch.push([v.sku, 'über 149.90', v.preisChf]);
    if (Math.round(v.preisChf * 100) % 100 !== 90) falsch.push([v.sku, 'nicht X.90', v.preisChf]);
    if (v.versandUsd !== versand[String(pfIdAusSku(v.sku))].usd) falsch.push([v.sku, 'Versand ≠ Messung']);
  }
  ist(`alle ${n} neuen Preise = kleinster X.90 über Richtwert und Netto ≥ 12 (unabhängig gerechnet)`, falsch.slice(0, 4), []);
}
{ const l = P('poster-zum-selbstgestalten').neu.find((v) => v.optionen.Material === 'Leinwand' && v.optionen['Grösse'] === '70×100 cm');
  ist('Leinwand 70×100 cm (Printful 19321, 28×40 Zoll): Preis 141.90 ≤ 149.90, als «abgeleitet» gekennzeichnet', [l?.sku, l?.preisChf, l?.abgeleitet], ['9000001_19321', 141.90, true]); }
{ const g = P('poster-zum-selbstgestalten').neu.find((v) => v.sku === '9000001_6875');
  ist('Poster Glanz 30×40 (12×16 Zoll) = von Hand gerechnetes Beispiel (Einkauf 13.53, Versand 10.49 USD)', [g.einkaufUsd, g.versandUsd, g.preisChf], [13.53, 10.49, 28.90]); }

// ── Vorhandene Varianten unverändert (SKU, Preis, ID, inventoryPolicy), nur Material = erster Wert
for (const s of SPEC.filter((x) => x.art === 'erweitern')) {
  const p = P(s.handle), b = bestand[s.handle];
  ist(`${s.handle}: vorhandene Varianten (SKU, Preis, ID) unverändert`, p.bestehende.map((v) => [v.id, v.sku, v.preisChf]), b.variants.map((v) => [v.id, v.sku, Number(v.price)]));
  wahr(`${s.handle}: vorhandene Varianten bekommen den ersten Material-Wert «${s.bestand.wert}»`, p.bestehende.every((v) => v.optionen.Material === s.bestand.wert));
  ist(`${s.handle}: erster Material-Wert ist der der vorhandenen Varianten`, p.optionen.nachher[0].werte[0], s.bestand.wert);
  ist(`${s.handle}: Plan fasst vorhandene Optionswerte nicht an`, p.optionen.nachher.slice(1).map((o) => [o.name, o.werte]), b.options.map((o) => [o.name, o.values]));
}

// ── nicht angelegt: Gründe stimmen mit dem Katalog überein
const na = (h) => P(h).nichtAngelegt;
{ const x = na('poster-zum-selbstgestalten').filter((n) => n.code === 'eu-lager');
  ist('Poster: «Gerahmt · Schwarz» 50×70 (Printful 9358) ohne EU-Lager → nicht angelegt', x.map((n) => [n.material, n.zweiter, n.pf]), [['Gerahmt · Schwarz', '50×70 cm', 9358]]); }
{ const x = na('unisex-hoodie-selbst-gestalten').filter((n) => n.code === 'eu-lager').map((n) => [n.material, n.zweiter, n.pf]);
  ist('Hoodie: Premium 4XL (53494) ohne EU-Lager → nicht angelegt', x, [['Premium-Baumwolle', '4XL', 53494]]); }
{ const x = na('unisex-hoodie-selbst-gestalten').filter((n) => n.code === 'groesse-unbekannt').map((n) => [n.material, n.zweiter]);
  ist('Hoodie: Premium XS (53489) gehört nicht zu den Beschriftungen des Hoodies → nicht angelegt', x, [['Premium-Baumwolle', 'XS']]); }
{ const x = na('unisex-t-shirt-selbst-gestalten').filter((n) => n.code === 'nicht-im-katalog').map((n) => n.material + '/' + n.zweiter).sort();
  ist('T-Shirt: Katalog führt Gildan XS, Comfort Colors XS und 5XL nicht', x, ['Heavyweight-Baumwolle/5XL', 'Heavyweight-Baumwolle/XS', 'Klassische Baumwolle/XS']); }
ist('Samsung: die drei Galaxy S10 der Slim-Hülle (Printful 16919/16921/16923) ohne EU-Lager', na('samsung-huelle-selbst-gestalten').filter((n) => n.code === 'eu-lager').map((n) => n.pf).sort((a, b) => a - b), [16919, 16921, 16923]);
ist('Samsung: nichts wegen Variantengrenze weggelassen', na('samsung-huelle-selbst-gestalten').filter((n) => n.code === 'limit').length, 0);
ist('iPhone/Hoodie/T-Shirt/Poster: nichts wegen fehlender Versandrate oder zu hohem Preis weggelassen', plan.produkte.flatMap((p) => p.nichtAngelegt).filter((n) => n.code === 'versand-unbekannt' || n.code === 'preis-ueber-grenze').length, 0);

// ── Befund: die vorhandenen Hoodie-SKUs sind bei Printful ein Sweatshirt (Produkt 145), nicht der Hoodie 146
{
  const b = P('unisex-hoodie-selbst-gestalten').befunde.filter((x) => x.schwere === 'blocker' && x.code === 'sku-anderes-produkt');
  ist('Hoodie: genau ein Blocker-Befund «sku-anderes-produkt»', b.map((x) => [x.code, x.printfulProdukt, x.erwartet, x.skus.length]), [['sku-anderes-produkt', 145, 146, 8]]);
  wahr('Hoodie-Befund nennt Printful-Produkt und Gildan 18000', /145/.test(b[0].text) && /Gildan 18000/.test(b[0].text));
  const blocker = (h) => P(h).befunde.filter((x) => x.schwere === 'blocker').map((x) => x.code).sort();
  ist('Blocker-Befunde je Produkt (Codes): Poster, Hoodie und iPhone tragen zusätzlich «material-metafeld» (T-Shirt hat kein Material-Metafeld, Samsung ist neu)', HANDLES.map(blocker),
    [['material-metafeld'], ['material-metafeld', 'sku-anderes-produkt', 'sku-in-anderem-produkt'], ['sku-in-anderem-produkt'], ['magsafe-irrefuehrend', 'material-metafeld'], []]);
  ist('Farbe der vorhandenen Hoodie-SKUs ist White (wie die neuen Materialien)', skuPruefung['5426'].farbe, 'White');
}

// ── Platzierung: jede geplante SKU ergibt mit dem Printful-Typ die richtige Platzierung (Hülle/Poster default, Textil front)
for (const p of plan.produkte) for (const v of p.neu) {
  const kat = katalog[String(v.printfulProdukt)];
  const prod = { typ: kat.type, dateien: kat.files.map((f) => f.split(':')[0]).filter((x) => x !== 'preview') };
  ist(`Platzierung ${v.sku} (${kat.type})`, platzierungFuer({ produkt: prod, seite: 'front' }), kat.type === 'T-SHIRT' ? 'front' : 'default');
}

// ── Beschreibung: Block zwischen den Marken, idempotent, Rest unverändert
for (const p of plan.produkte.filter((x) => x.art === 'erweitern')) {
  const n = p.beschreibung.nachher;
  ist(`${p.handle}: Marke «auf» genau einmal`, n.split(MARKE_AUF).length - 1, 1);
  ist(`${p.handle}: Marke «zu» genau einmal`, n.split(MARKE_ZU).length - 1, 1);
  ist(`${p.handle}: Block wird in die Beschreibung gesetzt`, blockVon(n), p.beschreibung.block);
  ist(`${p.handle}: ohne Block ist die Beschreibung die alte (Zeilenumbruch nach dem Block abgerechnet)`, n.replace(p.beschreibung.block + '\n', ''), bestand[p.handle].descriptionHtml);
  ist(`${p.handle}: setzeMaterialBlock ist idempotent`, setzeMaterialBlock(n, p.beschreibung.block), n);
  ist(`${p.handle}: Block liegt vor dem Rückgabe-Hinweis`, n.indexOf(MARKE_AUF) < n.indexOf('<div class="ls-pod-retoure"'), true);
  ist(`${p.handle}: Designer-Block und Lieferzeit unverändert dabei`, ['<div class="lspod-designer"', 'class="ls-liefer"', 'ls-pod-retoure'].every((t) => n.includes(t)), true);
}
{ // Ersetzen statt Verdoppeln, wenn schon ein alter Block da ist
  const alt = bestand['poster-zum-selbstgestalten'].descriptionHtml.replace('<div class="ls-pod-retoure"', `${MARKE_AUF}ALT${MARKE_ZU}<div class="ls-pod-retoure"`);
  const neu = setzeMaterialBlock(alt, P('poster-zum-selbstgestalten').beschreibung.block);
  ist('alter Block wird ersetzt, nicht ergänzt', [neu.split(MARKE_AUF).length - 1, neu.includes('ALT')], [1, false]);
  let fehler = ''; try { setzeMaterialBlock('x ' + MARKE_AUF + ' y', 'b'); } catch (e) { fehler = e.message; }
  wahr('halbe Marke → Fehler statt Raten', /unvollständig/.test(fehler));
}

// ── «Materialien im Vergleich»: jede Angabe ist belegt (Textstelle steht wörtlich in der Printful-Beschreibung, jede Zahl kommt im Beleg vor)
{
  const sp = (s) => String(s).replace(/\s+/g, ' ').trim();
  const zahlen = (s) => new Set((String(s).match(/\d*[.,]?\d+/g) || []).map((x) => parseFloat(x.replace(',', '.'))));
  let n = 0, schlecht = [];
  for (const s of SPEC) for (const e of s.vergleich) for (const f of e.fakten) {
    n++;
    const q = beschreibungen[String(f.b.p)];
    if (!q) { schlecht.push([f.t, 'Beleg-Produkt fehlt']); continue; }
    if (!sp(q[f.b.feld]).includes(sp(f.b.z))) schlecht.push([f.t, 'Textstelle nicht gefunden', f.b.z]);
    for (const z of zahlen(f.t)) if (!zahlen(f.b.z).has(z)) schlecht.push([f.t, 'Zahl ohne Beleg', z]);
    if (f.b.fehlt) {   // «ohne …»-Angabe: das Wort fehlt in Titel UND Beschreibung des Produkts, das Vergleichsprodukt (MagSafe-Ausführung) trägt es im Titel
      const w = f.b.fehlt.toLowerCase(), v = beschreibungen[String(f.b.vergleichMit)];
      if (sp(q.title + ' ' + q.desc).toLowerCase().includes(w)) schlecht.push([f.t, '«fehlt»-Wort kommt doch vor', f.b.fehlt]);
      if (!v || !sp(v.title).toLowerCase().includes(w)) schlecht.push([f.t, 'Vergleichsprodukt trägt das Wort nicht im Titel', f.b.vergleichMit]);
    }
  }
  ist(`alle ${n} Materialangaben belegt (Textstelle wörtlich vorhanden, Zahlen im Beleg)`, schlecht.slice(0, 4), []);
  ist('«ohne MagSafe»-Angaben: genau zwei (Hartschale 601 gegen 798, Klare Hülle 181 gegen 799), beide mit Vergleichsprodukt im Datenpaket', SPEC.flatMap((x) => x.vergleich.flatMap((e) => e.fakten)).filter((x) => x.b.fehlt).map((x) => [x.b.p, x.b.vergleichMit, !!beschreibungen[String(x.b.vergleichMit)]]), [[601, 798, true], [181, 799, true]]);
  ist('Zusatz-Beleg Produkt 145 (Sweatshirt) im Datenpaket', [ZUSATZ_BELEGE, !!beschreibungen['145']], [[145], true]);
  // jede Materialwahl hat einen Eintrag im Vergleich
  for (const s of SPEC) for (const m of s.materialien) wahr(`${s.handle}: «${m.wert}» steht im Vergleich`, s.vergleich.some((e) => e.werte.includes(m.wert)));
  // keine Heilsversprechen / medizinische Aussagen
  const alleTexte = plan.produkte.map((p) => p.beschreibung.block).join('\n');
  ist('keine Heilsversprechen im Block', /(heilt|gesund|lindert|therap|allerg|antibakter|garantiert|bestes|beste )/i.test(alleTexte), false);
  wahr('Zollmasse im Poster-Text: «12×16″ ≈ 30×40 cm»', P('poster-zum-selbstgestalten').beschreibung.block.includes('12×16″ ≈ 30×40 cm'));
  wahr('Zollmasse im Poster-Text: Leinwand «20×28″ ≈ 50×70 cm»', P('poster-zum-selbstgestalten').beschreibung.block.includes('20×28″ ≈ 50×70 cm'));
  wahr('Zollmasse im Poster-Text: A2 «16,5×23,3″ ≈ A2 (42×59,4 cm)»', P('poster-zum-selbstgestalten').beschreibung.block.includes('16,5×23,3″ ≈ A2 (42×59,4 cm)'));
  ist('Zollzeile aus den neuen Varianten', zollZeile([{ material: 'Leinwand', katalogGroesse: '12″×16″', zweiter: '30×40 cm' }], 'Leinwand'), 'Zollformate: 12×16″ ≈ 30×40 cm');
}
{ // der Block enthält das Hoodie-Sweatshirt-Merkmal und den «fällt klein aus»-Hinweis
  const h = P('unisex-hoodie-selbst-gestalten').beschreibung.block;
  wahr('Hoodie-Block nennt «Rundhals-Sweatshirt» beim Sweatshirt (Rundhals)', /Sweatshirt \(Rundhals\):<\/strong>[^<]*Rundhals-Sweatshirt/.test(h));
  wahr('Hoodie-Block: Premium «fällt klein aus»', /Premium-Baumwolle:<\/strong>[^<]*fällt klein aus/.test(h));
  wahr('HTML-Zeichen im Block sind maskiert (keine rohen & < >)', !/&(?!amp;|lt;|gt;)/.test(h.replace(/<!--[\s\S]*?-->/g, '')));
}

// ── Samsung-Produkt: Payload
{
  const s = P('samsung-huelle-selbst-gestalten'), np = s.neuesProdukt;
  ist('Samsung: Status DRAFT, Handle, Titel', [s.status, np.handle, np.titel, np.status], ['DRAFT', 'samsung-huelle-selbst-gestalten', 'Samsung-Hülle selbst gestalten', 'DRAFT']);
  ist('Samsung: Produktart und Anbieter wie beim iPhone-Produkt', [np.produktart, np.vendor], [bestand[np.vorlage].productType, bestand[np.vorlage].vendor]);
  wahr('Samsung: Tags enthalten wunschdesign, printful_personalized_product, selbst-gestalten-Familie (sg-accessoires)', ['wunschdesign', 'printful_personalized_product', 'sg-accessoires', 'huelle', 'natel', 'sort-handy-huellen'].every((t) => np.tags.includes(t)));
  ist('Samsung: Tags sind eine Teilmenge der iPhone-Tags plus «samsung» (ohne bild-ok und Halterungen)', np.tags.filter((t) => !bestand[np.vorlage].tags.includes(t)), ['samsung']);
  wahr('Samsung: kein «bild-ok», keine MagSafe-Halterungs-Sortierung', !np.tags.includes('bild-ok') && !np.tags.includes('sort-handy-halterungen'));
  ist('Samsung: Metafelder (Lieferzeit pod, Google-Kategorie Handyhüllen, gender, age)', np.metafelder.filter((m) => ['lieferzeit', 'google_product_category', 'gender', 'age_group'].includes(m.key)).map((m) => `${m.namespace}.${m.key}=${m.value}`).sort(),
    ['custom.lieferzeit={"ch":"7–14","tier":"pod","weg":"Druck auf Bestellung"}', 'mm-google-shopping.age_group=adult', 'mm-google-shopping.gender=unisex', 'mm-google-shopping.google_product_category=Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases']);
  ist('Samsung: Metafelder gleich dem iPhone-Produkt bei Lieferzeit', JSON.parse(np.metafelder.find((m) => m.key === 'lieferzeit').value), { ch: '7–14', tier: 'pod', weg: 'Druck auf Bestellung' });
  ist('Samsung: drei Bilder vom Printful-Katalog, https (Hartschale, Klar, Slim)', [np.bilder.length, np.bilder.every((b) => /^https:\/\/files\.cdn\.printful\.com\//.test(b.url) && b.alt.includes('Samsung'))], [3, true]);
  ist('Samsung: keine zwei Bilder mit derselben Adresse oder demselben Alt-Text (matt und glänzend waren byte-identisch)', [new Set(np.bilder.map((b) => b.url)).size, new Set(np.bilder.map((b) => b.alt)).size], [3, 3]);
  wahr('Samsung: kein Alt-Text behauptet «matt» oder «glänzend» (das Bild zeigt es nicht)', np.bilder.every((b) => !/matt|glänzend/i.test(b.alt)));
  { const m = np.metafelder.find((x) => x.key === 'material').value;
    wahr('Samsung: Metafeld «material» nennt Polycarbonat für alle und das TPU-Innenfutter ausdrücklich nur bei der Hartschale', /^Polycarbonat/.test(m) && /Hartschale/.test(m) && /Polyurethan \(TPU\)/.test(m), m); }
  const h = s.beschreibung.nachher;
  wahr('Samsung: Beschreibung ohne iPhone/MagSafe/Apple', !/iphone|magsafe|apple/i.test(h));
  wahr('Samsung: Beschreibung nennt Samsung und den Editor-Baustein mit Platzhaltern', /Samsung/.test(h) && h.includes('class="lspod-designer"') && h.includes('__ERSTE_VARIANTE__') && h.includes('__ERSTES_BILD__'));
  wahr('Samsung: Editor-Skript wie beim iPhone-Produkt', h.includes(bestand[np.vorlage].descriptionHtml.match(/<script src="([^"]*lspod-designer[^"]*)"/)[1]));
  wahr('Samsung: Lieferzeit- und Rückgabe-Baustein wortgleich übernommen', h.includes(bestand[np.vorlage].descriptionHtml.match(/<p class="ls-liefer"[\s\S]*?<\/p>/)[0]) && h.includes(bestand[np.vorlage].descriptionHtml.match(/<div class="ls-pod-retoure"[\s\S]*?<\/div>/)[0]));
  wahr('Samsung: Block «Materialien im Vergleich» zwischen den Marken, vier Materialien', blockVon(h) === s.beschreibung.block && ['Hartschale matt / Hartschale glänzend', 'Klare Hülle', 'Slim-Hülle'].every((m) => s.beschreibung.block.includes(m)));
  wahr('Samsung: Galaxy-Reihe «S20 bis S26» im Text', /Galaxy S20 bis S26/.test(h));
  const modelle = werte('samsung-huelle-selbst-gestalten', 'Handymodell');
  wahr('Samsung: Modellnamen in deutscher Schreibweise «Samsung Galaxy S25 Ultra»', modelle.includes('Samsung Galaxy S25 Ultra') && modelle.every((m) => /^Samsung Galaxy S\d+( Plus| Ultra| FE)?$/.test(m)));
  ist('Samsung: 23 Modelle, aufsteigend (S20 … S26)', [modelle.length, modelle[0], modelle[modelle.length - 1], [...modelle].sort(modellVergleich).join() === modelle.join()], [23, 'Samsung Galaxy S20', 'Samsung Galaxy S26 Ultra', true]);
  ist('Samsung: Galaxy S10 kommt nicht vor (kein EU-Lager)', modelle.some((m) => /S10/.test(m)), false);
  ist('Samsung: Modellreihenfolge Basis < Plus < Ultra < FE je Generation', modelle.slice(0, 4), ['Samsung Galaxy S20', 'Samsung Galaxy S20 Plus', 'Samsung Galaxy S20 Ultra', 'Samsung Galaxy S20 FE']);
  ist('Samsung: Hartschale matt = Printful 686 Matte, glänzend = 686 Glossy (Stichprobe S25 Ultra)', ['Hartschale matt', 'Hartschale glänzend', 'Klare Hülle', 'Slim-Hülle'].map((m) => s.neu.find((v) => v.optionen.Material === m && v.optionen.Handymodell === 'Samsung Galaxy S25 Ultra')?.sku), ['9000001_21474', '9000001_21473', '9000001_21483', '9000001_21480']);
}

// ── Aufbau der Varianten-Reihenfolge und Tabelle
{
  const z = tabellenZeilen(plan);
  ist('Tabelle: eine Zeile je Variante (vorhanden + neu)', z.length, 4 + 8 + 9 + 16 + plan.summe.neueVarianten);
  ist('Tabelle: zehn Spalten', new Set(z.map((r) => r.length)), new Set([10]));
  wahr('Tabelle: Markdown-Kopf mit den verlangten Spalten (+ Netto ohne Kundenversand vor dem Status)', tabelleMarkdown(plan).startsWith('| Produkt | Material | Grösse/Modell | SKU | Einkauf USD | Versand USD | Preis CHF | Netto-Gewinn CHF | Netto ohne Kundenversand CHF | Status |'));
  wahr('Tabelle: doppelt vorhandene Varianten sind in der Statusspalte gekennzeichnet (14)', z.filter((r) => /GIBT ES SCHON IN EINEM ANDEREN PRODUKT/.test(r[9])).length === 14);
  { const g = z.find((r) => r[3] === '9000001_6875'); ist('Tabelle: Poster Glanz 30×40 (Einkauf 13.53 USD = 1218 Rp, Versand 10.49 USD = 944 Rp): Netto 12.76 mit (3590 − 152 − 1218 − 944 = 1276), 6.00 ohne Kundenversand (2890 − 128 − 1218 − 944 = 600)', [g[7], g[8]], ['12.76', '6.00']); }
  ist('Tabelle: CSV-Zeilen = Zeilen + Kopf', tabelleCsv(plan).split('\n').length, z.length + 1);
}

// ── Randfälle des Plans (abgeänderte Eingaben)
{ // Versandrate fehlt → Variante wird nicht angelegt, nicht geraten
  const v2 = klon(versand); delete v2['6875'];
  const p = planen({ versand: v2 }); const x = p.produkte.find((q) => q.handle === 'poster-zum-selbstgestalten');
  ist('fehlende Versandrate → «versand-unbekannt», nicht angelegt', [x.nichtAngelegt.filter((n) => n.code === 'versand-unbekannt').map((n) => n.pf), x.neu.some((v) => v.pf === 6875)], [[6875], false]);
}
{ // Preis über 149.90 → nicht angelegt
  const v2 = klon(versand); v2['19321'].usd = 90;
  const x = planen({ versand: v2 }).produkte.find((q) => q.handle === 'poster-zum-selbstgestalten');
  ist('Leinwand 70×100 bei Versand 90 USD → über 149.90 → nicht angelegt', [x.nichtAngelegt.filter((n) => n.code === 'preis-ueber-grenze').map((n) => n.pf), x.neu.some((v) => v.pf === 19321)], [[19321], false]);
}
{ // Fortsetzung nach Teilerfolg: Option und eine Variante sind schon im Shop
  const b2 = klon(bestand); const pr = b2['poster-zum-selbstgestalten'];
  pr.options.unshift({ name: 'Material', position: 1, values: ['Poster matt', 'Foto-Glanzpapier'] }); pr.options.forEach((o, i) => { o.position = i + 1; });
  pr.variants.forEach((v) => v.selectedOptions.unshift({ name: 'Material', value: 'Poster matt' }));
  pr.variants.push({ id: 'gid://shopify/ProductVariant/1', sku: '9000001_6875', price: '28.90', inventoryPolicy: 'CONTINUE', selectedOptions: [{ name: 'Material', value: 'Foto-Glanzpapier' }, { name: 'Grösse', value: '30×40 cm' }] });
  const x = planen({ bestand: b2 }).produkte.find((q) => q.handle === 'poster-zum-selbstgestalten');
  ist('Fortsetzung: schon angelegte Variante zählt als «schonDa», nicht als neu', [x.schonDa.map((v) => v.sku), x.neu.length, x.summe.gesamt, x.optionen.optionSchonDa], [['9000001_6875'], 13, 18, true]);
  ist('Fortsetzung: vorhandene (ursprüngliche) Varianten bleiben 4', x.bestehende.length, 4);
}
{ // Plan-Hash ändert sich, wenn der Shop sich ändert (Preis einer vorhandenen Variante)
  const b2 = klon(bestand); b2['poster-zum-selbstgestalten'].variants[0].price = '26.90';
  wahr('Hash ändert sich bei geändertem Shop-Preis', planen({ bestand: b2 }).hash !== plan.hash);
  const b3 = klon(bestand); b3['unisex-hoodie-selbst-gestalten'].descriptionHtml += '<p>neu</p>';
  wahr('Hash ändert sich bei geänderter Beschreibung', planen({ bestand: b3 }).hash !== plan.hash);
  ist('Hash: kanonische Darstellung ist schlüsselreihenfolge-unabhängig', kanonisch({ a: 1, b: [2, { d: 1, c: 2 }] }), kanonisch({ b: [2, { c: 2, d: 1 }], a: 1 }));
}
{ // Variantengrenze: bei 60 statt 100 werden die ältesten Modelle weggelassen und im Bericht genannt
  const spec2 = klon(SPEC); spec2.find((s) => s.handle === 'samsung-huelle-selbst-gestalten').maxVarianten = 60;
  const x = planeAlles({ spec: spec2, katalog, beschreibungen, versand, bestand, skuPruefung }).produkte.find((q) => q.handle === 'samsung-huelle-selbst-gestalten');
  const modelle = x.optionen.nachher[1].werte;
  ist('Grenze 60: höchstens 60 Varianten, ältestes Modell (S20) zuerst weggelassen', [x.neu.length <= 60, x.neu.length > 40, modelle[0] === 'Samsung Galaxy S20', modelle.includes('Samsung Galaxy S26 Ultra')], [true, true, false, true]);
  ist('Grenze 60: jede weggelassene Variante steht als «limit» im Bericht (84 geplant − verbleibende)', x.nichtAngelegt.filter((n) => n.code === 'limit').length, 84 - x.neu.length);
  ist('Grenze 60: Modellnamen der Optionswerte = Modelle der verbleibenden Varianten', [...new Set(x.neu.map((v) => v.optionen.Handymodell))].sort(), [...modelle].sort());
}
{ // ONLY: nur ein Produkt
  const x = planeAlles({ katalog, beschreibungen, versand, bestand, skuPruefung, nur: ['unisex-t-shirt-selbst-gestalten'] });
  ist('nur=… plant nur dieses Produkt', x.produkte.map((p) => p.handle), ['unisex-t-shirt-selbst-gestalten']);
}
{ // fehlendes Produkt im Bestand → klarer Fehler
  const b2 = klon(bestand); delete b2['unisex-hoodie-selbst-gestalten'];
  let m = ''; try { planen({ bestand: b2 }); } catch (e) { m = e.message; }
  wahr('Produkt fehlt im Bestand → Fehler mit Handle', /unisex-hoodie-selbst-gestalten/.test(m));
}
{ // Versand-IDs: Plan braucht Raten für genau die neuen Varianten (EU-Lager) und die vorhandenen SKUs
  const ids = benoetigteVersandIds({ katalog, bestand });
  const soll = new Set(plan.produkte.flatMap((p) => [...p.neu.map((v) => v.pf), ...p.bestehende.map((v) => v.pf)]));
  ist('benoetigteVersandIds deckt alle geplanten Varianten', [...soll].every((i) => ids.includes(i)), true);
  wahr('benoetigteVersandIds holt nichts für Modelle ausserhalb der Shop-Beschriftungen', ids.length <= soll.size + 8, `${ids.length} vs ${soll.size}`);
}
{ // Block-Bau mit leerem Vergleich → leer (kein leerer Marker-Block)
  ist('materialBlock ohne passende Werte → ""', materialBlock({ vergleich: [{ werte: ['X'], fakten: [{ t: 'a' }] }], vorhandeneWerte: ['Y'] }), '');
}

// ═════════════════════════════════════════════════════════ Korrekturrunde 27.10.2026 (Prüfbefunde)
// ── Dieselbe Printful-Variante schon als eigenes Produkt im Shop (SKU-Index): 14 Varianten
{
  const T = P('unisex-t-shirt-selbst-gestalten'), H = P('unisex-hoodie-selbst-gestalten');
  const kt = T.befunde.filter((b) => b.code === 'sku-in-anderem-produkt'), kh = H.befunde.filter((b) => b.code === 'sku-in-anderem-produkt');
  ist('T-Shirt: ein Kollisionsbefund «Klassische Baumwolle» mit klassisches-unisex-t-shirt-selbst-gestalten (8)', kt.map((b) => [b.schwere, b.material, b.andereHandle, b.andereStatus, b.anzahl]), [['blocker', 'Klassische Baumwolle', 'klassisches-unisex-t-shirt-selbst-gestalten', 'ACTIVE', 8]]);
  ist('Hoodie: ein Kollisionsbefund «Premium-Baumwolle» mit premium-hoodie-selbst-gestalten (6, DRAFT)', kh.map((b) => [b.schwere, b.material, b.andereHandle, b.andereStatus, b.anzahl]), [['blocker', 'Premium-Baumwolle', 'premium-hoodie-selbst-gestalten', 'DRAFT', 6]]);
  const alle = [...kt, ...kh].flatMap((b) => b.kollisionen);
  ist('Insgesamt 14 doppelte Printful-Varianten', alle.length, 14);
  // Preise dort / hier (Messung am 27.10.2026): T-Shirt-Gildan S–XL 23.90 gegen 24.90, XL 26.90 gegen 26.90 (5XL: 38.90 gegen 36.90) …
  const dort = Object.fromEntries(alle.map((k) => [k.pf, [k.anderePreisChf, k.planPreisChf]]));
  ist('Preise im Einzelprodukt gegen Plan (11576–11580, 12650–12652)', [11576, 11577, 11578, 11579, 11580, 12650, 12651, 12652].map((n) => dort[n]), [[23.9, 24.9], [23.9, 24.9], [23.9, 24.9], [23.9, 24.9], [26.9, 26.9], [30.9, 28.9], [34.9, 32.9], [38.9, 36.9]]);
  ist('Preise im Einzel-Hoodie gegen Plan (10774–10778, 13421)', [10774, 10775, 10776, 10777, 10778, 13421].map((n) => dort[n]), [[56.9, 57.9], [56.9, 57.9], [56.9, 57.9], [56.9, 57.9], [60.9, 61.9], [64.9, 66.9]]);
  // Netto des Einzelprodukts: Gildan 5000 S, Einkauf 9.44 USD (850 Rp), Versand 10.39 USD (935 Rp): bei 23.90 Erlös 3090, Gebühr 105 + 30 = 135 → 3090 − 135 − 850 − 935 = 1170
  const s11576 = alle.find((k) => k.pf === 11576);
  ist('Netto des aktiven Gildan-Produkts bei 23.90 = 11.70 (unter der Regel von 12)', [s11576.andererNettoChf, s11576.andererNettoChf < REGEL.nettoMin], [11.70, true]);
  wahr('Befundtext nennt die Netto-Regel des Einzelprodukts, den Handle und beide Wege (OHNE=… / BEFUND_OK=…)', /unter der Netto-Regel/.test(kt[0].text) && /klassisches-unisex-t-shirt-selbst-gestalten/.test(kt[0].text) && /OHNE=unisex-t-shirt-selbst-gestalten:Klassische Baumwolle/.test(kt[0].text) && /BEFUND_OK=unisex-t-shirt-selbst-gestalten:sku-in-anderem-produkt/.test(kt[0].text));
  wahr('Hoodie-Befund nennt die Tags des DRAFT-Produkts (ghost-sale-risiko, keine-lieferanten-ref)', /ghost-sale-risiko/.test(kh[0].text) && /keine-lieferanten-ref/.test(kh[0].text));
  for (const h of ['poster-zum-selbstgestalten', 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten', 'samsung-huelle-selbst-gestalten']) ist(`${h}: keine Kollision mit anderen Produkten`, P(h).befunde.filter((b) => b.code === 'sku-in-anderem-produkt').length, 0);
  // ohne Index: nicht geprüft, kein Raten
  const ohneIdx = planeAlles({ katalog, beschreibungen, versand, bestand, skuPruefung });
  ist('ohne SKU-Index: Hinweis «nicht geprüft» je Produkt, keine Kollisionsbefunde', [ohneIdx.produkte.filter((p) => p.befunde.some((b) => b.code === 'sku-index-nicht-geprueft')).length, ohneIdx.produkte.flatMap((p) => p.befunde).filter((b) => b.code === 'sku-in-anderem-produkt').length], [5, 0]);
  // unvollständig gelesener Index wird gemeldet
  const abg = planen({ skuIndexAbgeschnitten: ['viel-varianten'] });
  wahr('abgeschnittener Index → Hinweis «sku-index-unvollstaendig»', abg.produkte.every((p) => p.befunde.some((b) => b.code === 'sku-index-unvollstaendig' && /viel-varianten/.test(b.text))));
  // Eigene Handles zählen nie als «anderes Produkt»
  const eigen = klon(skuIndex); eigen['10774'].push({ handle: 'unisex-hoodie-selbst-gestalten', titel: 't', status: 'ACTIVE', tags: [], sku: '1726823_10774', preis: '1.00', optionen: 'S' });
  ist('SKU-Index-Eintrag des eigenen Produkts wird ignoriert (kein Befund mit dem eigenen Handle als «anderes Produkt»)', planen({ skuIndex: eigen }).produkte[1].befunde.filter((b) => b.code === 'sku-in-anderem-produkt').map((b) => b.andereHandle), ['premium-hoodie-selbst-gestalten']);
  // Reine Funktionen
  const ctx = { skuIndex: { 5: [{ handle: 'x', status: 'ACTIVE', tags: [], sku: '1_5', preis: '10.00' }, { handle: 'y', status: 'DRAFT', tags: ['t'], sku: '2_5', preis: '12.00' }] }, regel: REGEL };
  const ks = kollisionenVon([{ material: 'M', zweiter: 'S', pf: 5, sku: '9_5', preisChf: 20, einkaufUsd: 5, versandUsd: 5 }], 'eigen', ctx);
  ist('kollisionenVon: zwei andere Produkte, Netto dort gerechnet (10.00 CHF: Erlös 17.00, Gebühr 0.58 + 0.30, Einkauf 4.50, Versand 4.50 → 7.12)', [ks.length, ks[0].andererNettoChf, ks[1].andereStatus], [2, 7.12, 'DRAFT']);
  ist('kollisionenVon: das eigene Produkt (Handle x) zählt nie als «anderes Produkt»', kollisionenVon([{ material: 'M', zweiter: 'S', pf: 5, sku: '9_5', preisChf: 20, einkaufUsd: 5, versandUsd: 5 }], 'x', ctx).map((k) => k.andereHandle), ['y']);
  ist('kollisionsBefunde: ein Befund je Material und fremdem Produkt', kollisionsBefunde(ks, 'eigen', REGEL).map((b) => [b.material, b.andereHandle, b.anzahl]), [['M', 'x', 1], ['M', 'y', 1]]);
}
// ── OHNE=handle:Material
{ // das ausgeschlossene Material gehört in den Hash der Aktionen (auch wenn es sonst keine Variante ändert)
  const a1 = klon(plan), a2 = klon(plan); a2.produkte[0].nichtAngelegt.push({ code: 'ausgeschlossen', material: 'Leinwand', zweiter: '*' });
  ist('aktionenFuerHash: ein ausgeschlossenes Material ändert den Hash', hashVon(aktionenFuerHash(a1)) !== hashVon(aktionenFuerHash(a2)), true);
}
{
  const ohne = [{ handle: 'unisex-t-shirt-selbst-gestalten', material: 'Klassische Baumwolle' }, { handle: 'unisex-hoodie-selbst-gestalten', material: 'Premium-Baumwolle' }];
  const x = planen({ ohne });
  const T = x.produkte.find((p) => p.handle === 'unisex-t-shirt-selbst-gestalten'), H = x.produkte.find((p) => p.handle === 'unisex-hoodie-selbst-gestalten');
  ist('OHNE: T-Shirt 16 neue Varianten ohne «Klassische Baumwolle», Hoodie 5 ohne «Premium-Baumwolle»', [T.neu.length, H.neu.length, T.optionen.nachher[0].werte, H.optionen.nachher[0].werte], [16, 5, ['Ringgarn-Baumwolle', 'Bio-Baumwolle', 'Heavyweight-Baumwolle'], ['Sweatshirt (Rundhals)', 'Bio-Baumwolle']]);
  ist('OHNE: keine Kollisions-Blocker mehr, der Hoodie behält den Sweatshirt-Blocker', [T.befunde.filter((b) => b.schwere === 'blocker').length, H.befunde.filter((b) => b.schwere === 'blocker').map((b) => b.code)], [0, ['sku-anderes-produkt', 'material-metafeld']]);
  ist('OHNE: ausgeschlossene Materialien stehen als «ausgeschlossen» im Bericht', [T, H].map((p) => p.nichtAngelegt.filter((n) => n.code === 'ausgeschlossen').map((n) => n.material)), [['Klassische Baumwolle'], ['Premium-Baumwolle']]);
  wahr('OHNE: Plan-Hash ändert sich', x.hash !== plan.hash);
  ist('OHNE: Block nennt das ausgelassene Material nicht', [T.beschreibung.block.includes('Klassische Baumwolle'), H.beschreibung.block.includes('Premium-Baumwolle')], [false, false]);
  ist('OHNE steht im Plan', x.ohne, ohne);
  ist('OHNE: dieselben Eingaben, derselbe Hash', planen({ ohne }).hash, x.hash);
  const fehler = (o) => { try { planen({ ohne: o }); return ''; } catch (e) { return e.message; } };
  wahr('OHNE: unbekanntes Produkt → Fehler', /unbekanntes Produkt/.test(fehler([{ handle: 'gibt-es-nicht', material: 'x' }])));
  wahr('OHNE: unbekanntes Material → Fehler mit Liste', /kein Material von/.test(fehler([{ handle: 'unisex-t-shirt-selbst-gestalten', material: 'Seide' }])));
  wahr('OHNE: das vorhandene Material kann man nicht ausschliessen', /vorhandene Material/.test(fehler([{ handle: 'unisex-t-shirt-selbst-gestalten', material: 'Ringgarn-Baumwolle' }])));
  const sam = planen({ ohne: [{ handle: 'samsung-huelle-selbst-gestalten', material: 'Slim-Hülle' }] }).produkte.find((p) => p.handle === 'samsung-huelle-selbst-gestalten');
  ist('OHNE gilt auch für das neue Samsung-Produkt (64 statt 84 Varianten)', [sam.neu.length, sam.optionen.nachher[0].werte], [64, ['Hartschale matt', 'Hartschale glänzend', 'Klare Hülle']]);
}
// ── Netto ohne Kundenversand
{
  const alle = plan.produkte.flatMap((p) => p.neu);
  let schlecht = [];
  for (const v of alle) {
    const soll = nettoOhneKundenversand({ preisChf: v.preisChf, einkaufUsd: v.einkaufUsd, versandUsd: v.versandUsd });
    if (v.nettoOhneVersandChf !== soll) schlecht.push([v.sku, 'Wert', v.nettoOhneVersandChf, soll]);
    if (v.preisChf >= 50 && v.nettoOhneVersandChf !== v.nettoChf) schlecht.push([v.sku, 'ab 50 gleich']);
    if (v.preisChf < 50 && !(v.nettoOhneVersandChf < v.nettoChf - 6)) schlecht.push([v.sku, 'unter 50: mindestens 6 CHF weniger']);
  }
  ist(`alle ${alle.length} neuen Varianten tragen «Netto ohne Kundenversand» (ab 50 gleich, darunter 6–7 CHF tiefer)`, schlecht.slice(0, 3), []);
  const hin = (h) => P(h).befunde.find((b) => b.code === 'netto-nur-mit-kundenversand');
  ist('Hinweis «Netto nur mit Kundenversand»: Poster 3, T-Shirt 21, iPhone 32, Samsung 84; Hoodie keiner (alle Preise ab 57.90)', HANDLES.map((h) => hin(h)?.anzahl ?? 0), [3, 0, 21, 32, 84]);
  ist('Hinweis nennt das tiefste Netto: T-Shirt Gildan S 24.90 → 5.90 (von Hand: 2490 − 115 − 850 − 935)', [hin('unisex-t-shirt-selbst-gestalten').tiefstesNettoChf, /5\.90/.test(hin('unisex-t-shirt-selbst-gestalten').text)], [5.9, true]);
  ist('vorhandene Varianten tragen die Spalte ebenfalls', P('poster-zum-selbstgestalten').bestehende.every((v) => typeof v.nettoOhneVersandChf === 'number'), true);
}
// ── Lücken im Katalog bei fester Zuordnung (Poster) + Formate
{
  const l = na('poster-zum-selbstgestalten').filter((n) => n.code === 'nicht-im-katalog').map((n) => n.material + '/' + n.zweiter).sort();
  ist('Poster: fünf Katalog-Lücken stehen im Bericht (Glanz/70×100, Leinwand/A2, Rahmen ×3 /70×100)', l, ['Foto-Glanzpapier/70×100 cm', 'Gerahmt · Eiche/70×100 cm', 'Gerahmt · Schwarz/70×100 cm', 'Gerahmt · Weiss/70×100 cm', 'Leinwand/A2 (42×59,4 cm)']);
  ist('formatCm: cm', [formatCm('30×40 cm'), formatCm('A2 (42×59,4 cm)'), formatCm('70×100 cm')], [[30, 40], [42, 59.4], [70, 100]]);
  const zoll = formatCm('12″×16″'); ist('formatCm: Zoll 12″×16″ ≈ 30,5×40,6 cm', [Math.round(zoll[0] * 10) / 10, Math.round(zoll[1] * 10) / 10], [30.5, 40.6]);
  const a2 = formatCm('A2 (16.5″×23.3″)'); ist('formatCm: A2 in Zoll ≈ 41,9×59,2 cm', [Math.round(a2[0] * 10) / 10, Math.round(a2[1] * 10) / 10], [41.9, 59.2]);
  ist('formatCm: ohne Mass → null', [formatCm('iPhone 14'), formatCm('XL'), formatCm(undefined)], [null, null, null]);
  ist('passendeFormate: 70×100 cm trifft Leinwand 28″×40″ (Nr. 19321), Glanzpapier hat nichts', [passendeFormate(katalog['3'], '70×100 cm').map((v) => v.id), passendeFormate(katalog['171'], '70×100 cm').map((v) => v.id)], [[19321], []]);
  ist('passendeFormate: 2 %-Toleranz: Leinwand 16″×24″ ist KEIN A2 (3,2 % / 2,6 % daneben)', passendeFormate(katalog['3'], 'A2 (42×59,4 cm)').map((v) => v.id), []);
  // Katalog führt ein passendes Format, die Spezifikation hat keine Nummer → «ohne-zuordnung» mit Kandidat
  const k2 = klon(katalog); k2['171'].variants.push({ id: 424242, name: 'x', size: '28″×40″', color: null, price: '30.00', in_stock: true, eu: 'in_stock' });
  const x = planen({ katalog: k2 }).produkte[0].nichtAngelegt.find((n) => n.material === 'Foto-Glanzpapier' && n.zweiter === '70×100 cm');
  ist('Katalog mit Format 28″×40″ aber ohne Zuordnung → «ohne-zuordnung» mit Nummer', [x.code, /424242/.test(x.grund)], ['ohne-zuordnung', true]);
}
{ // Preisleiter
  const e = (material, zweiter, preisChf, sku) => ({ optionen: { Material: material }, zweiter, preisChf, sku, einkaufUsd: 10 });
  ist('preisleiterBefunde: A2 billiger als 30×40 → Hinweis', preisleiterBefunde([e('G', '30×40 cm', 28.9, 'a'), e('G', 'A2 (42×59,4 cm)', 25.9, 'b'), e('G', '50×70 cm', 36.9, 'c')], []).map((b) => [b.code, b.material, b.paare]), [['preisleiter-nicht-monoton', 'G', [['a', 'b']]]]);
  ist('preisleiterBefunde: monotone Leiter → nichts', preisleiterBefunde([e('G', '30×40 cm', 25.9, 'a'), e('G', 'A2 (42×59,4 cm)', 28.9, 'b'), e('G', '50×70 cm', 36.9, 'c')], []), []);
  ist('preisleiterBefunde: Textilgrössen nach Reihenfolge der Beschriftungen', preisleiterBefunde([e('T', 'M', 30, 'm'), e('T', 'S', 31, 's')], ['S', 'M', 'L']).length, 1);
  ist('preisleiterBefunde: gleicher Preis ist kein Verstoss', preisleiterBefunde([e('T', 'S', 30, 's'), e('T', 'M', 30, 'm')], ['S', 'M']), []);
  const hp = (h) => P(h).befunde.filter((b) => b.code === 'preisleiter-nicht-monoton').map((b) => b.material);
  ist('im echten Plan nur Poster/Foto-Glanzpapier (A2 25.90 < 30×40 28.90)', HANDLES.map(hp), [['Foto-Glanzpapier'], [], [], [], []]);
}
// ── Texte ausserhalb des Blocks: MagSafe, Zitate, Verschwinden nach der Korrektur
{
  const I = P('hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten');
  const m = I.befunde.find((b) => b.code === 'magsafe-irrefuehrend');
  ist('iPhone: Blocker «magsafe-irrefuehrend» mit Fundstellen im Titel und im Text', [m.schwere, m.stellen.some((x) => x.wo === 'Titel' && /MagSafe/.test(x.zitat)), m.stellen.some((x) => x.wo === 'Text')], ['blocker', true, true]);
  ist('iPhone: der Befund nennt, für welche Materialien es NICHT stimmt', m.stellen.every((x) => x.nichtFuer.join() === 'Hartschale,Klare Hülle'), true);
  wahr('iPhone: Befundtext nennt Rückgabe-Ausschluss und alle drei Wege', /Rückgabe/.test(m.text) && /entmagsafen/.test(m.text) && /OHNE=/.test(m.text) && /799/.test(m.text));
  wahr('iPhone: Bild-Adresse mit «magsafe» im data-img-front zählt nicht als Fundstelle', !m.stellen.some((x) => /cdn\.shopify/.test(x.zitat)));
  ist('iPhone: Hinweis «Mattes oder glänzendes Finish»', I.befunde.filter((b) => b.code === 'text-ausserhalb-block').length, 1);
  // Titel und Text von Hand korrigiert → Blocker verschwindet von selbst
  const b2 = klon(bestand); const ip = b2['hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten'];
  ip.title = 'Hardcase iPhone®-Hülle – Selbst gestalten'; ip.descriptionHtml = ip.descriptionHtml.replace(/MagSafe/g, 'Hülle').replace('Mattes oder glänzendes Finish', 'Mattes Finish');
  ist('iPhone: nach der Korrektur von Titel und Text keine Text-Befunde mehr', planen({ bestand: b2 }).produkte[3].befunde.filter((b) => b.code === 'magsafe-irrefuehrend' || b.code === 'text-ausserhalb-block').length, 0);
  // Fundstellen im Materialblock selbst zählen nicht (dort steht MagSafe® absichtlich)
  const b3 = klon(bestand); const ip3 = b3['hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten']; ip3.title = 'Hardcase iPhone®-Hülle – Selbst gestalten'; ip3.descriptionHtml = ip3.descriptionHtml.replace(/MagSafe/g, 'Hülle').replace('Mattes oder glänzendes Finish', 'Mattes Finish');
  const x3 = planen({ bestand: b3 }).produkte[3];
  wahr('iPhone: Block mit «MagSafe®» erzeugt keinen Befund', x3.beschreibung.block.includes('MagSafe') && !x3.befunde.some((b) => b.code === 'magsafe-irrefuehrend'));
  // andere Produkte: Hinweise mit Zitaten
  const tx = (h) => P(h).befunde.filter((b) => b.code === 'text-ausserhalb-block');
  ist('Poster/Hoodie/T-Shirt: je ein Hinweis «Text ausserhalb des Blocks»', ['poster-zum-selbstgestalten', 'unisex-hoodie-selbst-gestalten', 'unisex-t-shirt-selbst-gestalten'].map((h) => tx(h).length), [1, 1, 1]);
  wahr('T-Shirt-Hinweis zitiert 142 g/m², «Vorgewaschener Stoff» und die Produktdetails «Material: Baumwolle, Polyester»', ['142 g/m²', 'Vorgewaschener Stoff', 'Material: Baumwolle, Polyester'].every((t) => tx('unisex-t-shirt-selbst-gestalten')[0].text.includes(t)));
  wahr('Hoodie-Hinweis zitiert «50 % Baumwolle, 50 % Polyester»', tx('unisex-hoodie-selbst-gestalten')[0].text.includes('50 % Baumwolle, 50 % Polyester'));
  wahr('Poster-Hinweis zitiert «Premium-Matt-Papier» und den Grössenbereich', ['Premium-Matt-Papier', '30×40 bis 70×100 cm'].every((t) => tx('poster-zum-selbstgestalten')[0].text.includes(t)));
  ist('Samsung: keine Text-Befunde (Text neu und materialneutral)', P('samsung-huelle-selbst-gestalten').befunde.filter((b) => /text|magsafe/.test(b.code)).length, 0);
  // Reine Funktion
  const k = [{ code: 'c', schwere: 'hinweis', stellen: [{ muster: 'Foo \\d+', gilt: ['A'] }], problem: 'P.', vorschlag: 'V.' }];
  ist('textBefunde: Treffer nur, wenn ein geplantes Material nicht in «gilt» steht', [textBefunde(k, { titel: '', html: '<p>Foo 12</p>', materialien: ['A'] }).length, textBefunde(k, { titel: '', html: '<p>Foo 12</p>', materialien: ['A', 'B'] }).length, textBefunde(k, { titel: '', html: '<p>nichts</p>', materialien: ['A', 'B'] }).length], [0, 1, 0]);
  ist('textBefunde: Text im Materialblock zählt nicht', textBefunde(k, { titel: '', html: `<p>x</p>${MARKE_AUF}<p>Foo 12</p>${MARKE_ZU}`, materialien: ['A', 'B'] }).length, 0);
  ist('textBefunde: Tags und Attribute zählen nicht (Klartext)', textBefunde(k, { titel: '', html: '<div data-x="Foo 12"></div>', materialien: ['A', 'B'] }).length, 0);
}
// ── Block: Haupttext-Bezug, MagSafe-Klarstellung, Wortlaut der Angaben
{
  const bl = (h) => P(h).beschreibung.block;
  ist('Block nennt, worauf sich der Haupttext bezieht (Poster matt, Sweatshirt (Rundhals), Ringgarn-Baumwolle, Hartschale MagSafe)', ['poster-zum-selbstgestalten', 'unisex-hoodie-selbst-gestalten', 'unisex-t-shirt-selbst-gestalten', 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten'].map((h) => /Die Beschreibung weiter oben bezieht sich auf «([^»]+)»/.exec(bl(h))?.[1]), ['Poster matt', 'Sweatshirt (Rundhals)', 'Ringgarn-Baumwolle', 'Hartschale MagSafe']);
  wahr('Samsung-Block (neues Produkt) trägt diesen Satz nicht', !bl('samsung-huelle-selbst-gestalten').includes('Die Beschreibung weiter oben'));
  const ip = bl('hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten');
  ist('iPhone-Block: «ohne MagSafe®-Magnete» bei «Hartschale» und «Klare Hülle», «eingebaute MagSafe®-Magnete» bei «Hartschale MagSafe»', [/Hartschale:<\/strong>[^<]*ohne MagSafe®-Magnete/.test(ip), /Klare Hülle:<\/strong>[^<]*ohne MagSafe®-Magnete/.test(ip), /Hartschale MagSafe:<\/strong>[^<]*eingebaute MagSafe®-Magnete/.test(ip), (ip.match(/ohne MagSafe®-Magnete/g) || []).length], [true, true, true, 2]);
  const hd = bl('unisex-hoodie-selbst-gestalten');
  wahr('Hoodie Premium: EINE Stoffangabe «ohne Zuordnung», nicht zwei scheinbar widersprüchliche', /Aussenseite 100 % Baumwolle; zusätzlich ohne Zuordnung genannt: 65 % ringgesponnene Baumwolle, 35 % Polyester/.test(hd) && !/weitere Herstellerangabe/.test(hd));
  ist('Hoodie: beide Grössenhinweise sagen «bei diesem Material»', [/eine Grösse grösser bestellen/.test(hd) && /bei diesem Material eine Grösse grösser bestellen/.test(hd), /bei diesem Material eine Grösse kleiner bestellen/.test(hd)], [true, true]);
  wahr('Leinwand: «Leinwand insgesamt 3,18 cm (1,25″) dick» statt Stoffdicke', P('poster-zum-selbstgestalten').beschreibung.block.includes('Leinwand insgesamt 3,18 cm (1,25″) dick') && !P('poster-zum-selbstgestalten').beschreibung.block.includes('Mischgewebe, 3,18 cm'));
  wahr('iPhone Klare Hülle: Schutzfolie «kann» enthalten sein', ip.includes('kann innen eine Schutzfolie enthalten, die vor dem Gebrauch entfernt werden muss') && !ip.includes('Schutzfolie auf der Innenseite vor dem Gebrauch entfernen'));
}

// ── Hoodie-Befund «sku-anderes-produkt»: die drei Wege des Besitzers mit gerechneten Zahlen (Umstellung auf Printful 146 / Gildan 18500, White)
{
  const spec = SPEC.find((x) => x.handle === 'unisex-hoodie-selbst-gestalten');
  const rech = umstellungsRechnung({ spec, bestandProdukt: bestand[spec.handle], ctx: { katalog, versand, skuPruefung, regel: REGEL } });
  ist('Umstellung: acht Grössen, S–5XL', rech.map((r) => r.groesse), ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']);
  ist('Umstellung: Nummern 5522–5529 des Hoodies Gildan 18500 in White', [...rech.map((r) => r.pfNeu)].sort((a, b) => a - b), [5522, 5523, 5524, 5525, 5526, 5527, 5528, 5529]);
  ist('Umstellung: Einkauf S–XL 22.63 USD statt 19.17 USD (Sweatshirt), 5XL 30.63 statt 27.17', [rech[0].einkaufNeuUsd, rech[0].einkaufJetztUsd, rech[7].einkaufNeuUsd, rech[7].einkaufJetztUsd], [22.63, 19.17, 30.63, 27.17]);
  ist('Umstellung: Versand des Hoodies gemessen (11.39 USD, STANDARD CH am 27.10.2026)', [...new Set(rech.map((r) => r.versandNeuUsd))], [11.39]);
  // Von Hand (S): Einkauf 22.63 USD × 0.90 = 2037 Rp, Versand 11.39 USD × 0.90 = 1025 Rp; Richtwert max(2037 × 2.3 = 4685.1, 2037 + 1200) = 4685.1 → kleinster X.90 darüber = 46.90;
  // unter 50 → Erlös 4690 + 700 = 5390, Gebühr round(5390 × 0.034) = 183 + 30 = 213, Netto 5390 − 213 − 2037 − 1025 = 2115 (21.15 ≥ 12, der Richtwert bindet)
  ist('Umstellung (S von Hand: Netto 21.15): Preis nach Regel', endpreis({ einkaufUsd: 22.63, versandUsd: 11.39 }).nettoChf, 21.15);
  ist('Umstellung: Preise nach Regel S–XL 46.90, 2XL 51.90, 3XL 55.90, 4XL 59.90, 5XL 63.90 (vorher 38.90 … 55.90)', [rech.map((r) => r.preisNeu), rech.map((r) => r.preisJetzt)], [[46.9, 46.9, 46.9, 46.9, 51.9, 55.9, 59.9, 63.9], [38.9, 38.9, 38.9, 38.9, 43.9, 47.9, 51.9, 55.9]]);
  const b = P('unisex-hoodie-selbst-gestalten').befunde.find((x) => x.code === 'sku-anderes-produkt');
  wahr('Befundtext nennt alle drei Wege und die gerechneten Preise (S 38.90 → 46.90, 5XL 55.90 → 63.90)', /\(1\)[^;]*Sweatshirt \(Rundhals\)/.test(b.text) && /\(2\)[^;]*Gildan 18500[^;]*5522–5529/.test(b.text) && /S 38\.90 → 46\.90/.test(b.text) && /5XL 55\.90 → 63\.90/.test(b.text) && /\(3\)[^;]*zwei Produkte/.test(b.text) && /BEFUND_OK=unisex-hoodie-selbst-gestalten:sku-anderes-produkt/.test(b.text), b.text.slice(-400));
  wahr('Befundtext sagt, dass die Umstellung nicht Teil des Werkzeugs ist', /NICHT Teil dieses Werkzeugs/.test(b.text));
  // fehlt die Versandrate des gemeinten Produkts: der Preis bleibt leer, es wird nichts geschätzt
  const v2 = klon(versand); for (const id of [5522, 5523]) delete v2[String(id)];
  const r2 = umstellungsRechnung({ spec, bestandProdukt: bestand[spec.handle], ctx: { katalog, versand: v2, skuPruefung, regel: REGEL } });
  ist('Umstellung ohne Versandrate: Preis leer statt geschätzt (S, M), die übrigen bleiben', [r2[0].preisNeu, r2[1].preisNeu, r2[2].preisNeu], [null, null, 46.9]);
  wahr('Befundtext nennt die fehlende Versandrate (VERSAND_HOLEN=1)', /fehlt die gemessene Versandrate[^;]*VERSAND_HOLEN=1/.test(umstellungsText(spec, spec.handle, r2)));
  ist('Umstellung ohne Katalogeintrag des gemeinten Produkts → null, Text ohne Zahlen', [umstellungsRechnung({ spec, bestandProdukt: bestand[spec.handle], ctx: { katalog: {}, versand, skuPruefung, regel: REGEL } }), /Einkauf/.test(umstellungsText(spec, spec.handle, null))], [null, false]);
  // benoetigteVersandIds nennt die Nummern des gemeinten Produkts, damit die Rechnung nie auf eine fehlende Rate trifft
  const ids = benoetigteVersandIds({ katalog, bestand });
  ist('benoetigteVersandIds enthält 5522–5529 (gemeintes Produkt in White)', [5522, 5523, 5524, 5525, 5526, 5527, 5528, 5529].map((i) => ids.includes(i)), Array(8).fill(true));
}

// ── Produkt-Metafeld «Material» (Befund 13): ein Wert, mehrere Materialien → Blocker, nie geschrieben
{
  const mf = (h, wert) => { const b = klon(bestand); if (wert === 'fehlt') delete b[h].materialMetafeld; else b[h].materialMetafeld = wert; return planeAlles({ katalog, beschreibungen, versand, bestand: b, skuPruefung, skuIndex, skuIndexAbgeschnitten, nur: [h] }).produkte[0]; };
  const code = (p) => p.befunde.filter((x) => x.code.startsWith('material-metafeld')).map((x) => [x.schwere, x.code]);
  const PO = 'poster-zum-selbstgestalten';
  ist('Datenpaket: Metafeld «Material» gelesen (Poster, Hoodie, iPhone gesetzt, T-Shirt leer; am 27.10.2026 frisch gemessen)', ['poster-zum-selbstgestalten', 'unisex-hoodie-selbst-gestalten', 'unisex-t-shirt-selbst-gestalten', 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten'].map((h) => bestand[h].materialMetafeld),
    ['Papier (matt)', 'Baumwolle, Polyester, Elastan', null, 'Polycarbonat, Polyurethan (TPU)']);
  ist('Poster mit Wert «Papier (matt)» → Blocker material-metafeld', code(mf(PO, 'Papier (matt)')), [['blocker', 'material-metafeld']]);
  const b = mf(PO, 'Papier (matt)').befunde.find((x) => x.code === 'material-metafeld');
  wahr('Befundtext: nennt den Wert, beide Verwendungen, dass das Werkzeug das Feld NIE schreibt, beide Wege und den Bestätigungsbefehl',
    [/«Papier \(matt\)»/, /Merchant-Center-Attribut/, /Spezifikationen & Details/, /schreibt dieses Feld NIE/, /\(a\) das Feld vor LIVE leeren/, /\(b\) es bewusst stehen lassen/, /BEFUND_OK=poster-zum-selbstgestalten:material-metafeld/].every((re) => re.test(b.text)), b.text.slice(0, 200));
  ist('Poster mit leerem Feld (null, leer, Leerzeichen) → kein Befund: er verschwindet von selbst, sobald der Besitzer es geleert hat', [code(mf(PO, null)), code(mf(PO, '')), code(mf(PO, '  '))], [[], [], []]);
  ist('Datenpaket ohne dieses Feld → nur Hinweis «material-metafeld-ungeprueft», kein stilles Durchwinken, keine Sperre', code(mf(PO, 'fehlt')), [['hinweis', 'material-metafeld-ungeprueft']]);
  ist('Mit nur EINEM Material (alles ausgeschlossen) gibt es nichts zu widersprechen', materialMetafeldBefund({ handle: 'h', bestandWert: 'a', materialWerte: ['a'], wert: 'x' }), []);
  ist('Das Metafeld ändert den Plan-Hash nicht (es wird nie geschrieben)', [mf(PO, 'Papier (matt)').beschreibung.nachher === mf(PO, null).beschreibung.nachher, hashVon(aktionenFuerHash({ produkte: [mf(PO, 'A')] })) === hashVon(aktionenFuerHash({ produkte: [mf(PO, 'B')] }))], [true, true]);
}

// ── Plan-Hash bei der Wiederaufnahme (Befund 10): neu + schon angelegt zählen zusammen
{
  const p0 = P('poster-zum-selbstgestalten');
  const halb = klon(bestand); const hb = halb['poster-zum-selbstgestalten'];
  hb.options = [{ name: 'Material', position: 1, values: ['Poster matt', 'Foto-Glanzpapier'] }, { name: 'Grösse', position: 2, values: [...hb.options[0].values] }];
  hb.variants = hb.variants.map((v) => ({ ...v, selectedOptions: [{ name: 'Material', value: 'Poster matt' }, ...v.selectedOptions] }));
  for (const n of p0.neu.filter((x) => x.optionen.Material === 'Foto-Glanzpapier')) hb.variants.push({ id: 'gid://shopify/ProductVariant/' + n.pf, sku: n.sku, price: n.preisChf.toFixed(2), inventoryPolicy: 'CONTINUE', selectedOptions: [{ name: 'Material', value: n.optionen.Material }, { name: 'Grösse', value: n.optionen['Grösse'] }] });
  const p1 = planeAlles({ katalog, beschreibungen, versand, bestand: halb, skuPruefung, skuIndex, skuIndexAbgeschnitten, nur: ['poster-zum-selbstgestalten'] });
  ist('Halbzustand (ein Material schon da): weniger neue, mehr schonDa, gleiche Summe', [p1.produkte[0].neu.length, p1.produkte[0].schonDa.length, p1.produkte[0].neu.length + p1.produkte[0].schonDa.length], [p0.neu.length - 3, 3, p0.neu.length]);
  ist('Halbzustand: DERSELBE Plan-Hash wie vor dem Abbruch (der geprüfte Plan bleibt gültig)', p1.hash, planeAlles({ katalog, beschreibungen, versand, bestand, skuPruefung, skuIndex, skuIndexAbgeschnitten, nur: ['poster-zum-selbstgestalten'] }).hash);
}

// ── Vorhandene Option «Material» muss zum Plan passen (Szenario S6: von Hand angelegt, Fremdwerte): schon der Plan meldet es als Verstoss, der Plan ist dann nicht ausführbar
{
  const planWerte = ['Poster matt', 'Foto-Glanzpapier', 'Leinwand'];
  const basis = { matName: 'Material', bestandsWert: 'Poster matt', planWerte, bestehende: [{ sku: 'A' }, { sku: 'B' }], schonDa: [{ sku: 'C', optionen: { Material: 'Foto-Glanzpapier' } }] };
  const mat = (m) => (sku) => (sku in m ? m[sku] : undefined);
  ist('materialOptionAbweichungen: keine Option «Material» → nichts zu melden', materialOptionAbweichungen({ ...basis, optionWerte: null, materialVon: mat({}) }), []);
  ist('materialOptionAbweichungen: nicht gelesen (undefined) zählt wie keine Option', materialOptionAbweichungen({ ...basis, optionWerte: undefined, materialVon: mat({}) }), []);
  ist('materialOptionAbweichungen: eigener Halbzustand (Werte im Plan, Bestandswert, Plan-Material) → leer', materialOptionAbweichungen({ ...basis, optionWerte: ['Poster matt', 'Foto-Glanzpapier'], materialVon: mat({ A: 'Poster matt', B: 'Poster matt', C: 'Foto-Glanzpapier' }) }), []);
  const fremd = materialOptionAbweichungen({ ...basis, optionWerte: ['Holz'], materialVon: mat({ A: 'Holz', B: 'Holz' }) });
  ist('materialOptionAbweichungen: Fremdwert «Holz» und Varianten mit «Holz» statt dem Bestandswert → 3 Meldungen', [fremd.length, /Werte, die der Plan nicht kennt: «Holz»/.test(fremd[0]), /Variante A: Material «Holz» ≠ «Poster matt»/.test(fremd[1])], [3, true, true]);
  ist('materialOptionAbweichungen: nur ein Fremdwert (leer, kein Variante) genügt', materialOptionAbweichungen({ ...basis, optionWerte: ['Poster matt', 'Holz'], materialVon: mat({ A: 'Poster matt', B: 'Poster matt', C: 'Foto-Glanzpapier' }) }).length, 1);
  ist('materialOptionAbweichungen: nur eine vorhandene Variante mit anderem Material genügt', materialOptionAbweichungen({ ...basis, optionWerte: ['Poster matt'], materialVon: mat({ A: 'Poster matt', B: 'Leinwand', C: 'Foto-Glanzpapier' }) }).length, 1);
  ist('materialOptionAbweichungen: schon angelegte Variante mit falschem Material wird gemeldet', materialOptionAbweichungen({ ...basis, optionWerte: ['Poster matt'], materialVon: mat({ A: 'Poster matt', B: 'Poster matt', C: 'Leinwand' }) }).map((x) => /Variante C/.test(x)), [true]);
  ist('materialOptionAbweichungen: fehlende Variante (undefined) meldet diese Funktion nicht, das tut die Vorab-Prüfung der vorhandenen Varianten', materialOptionAbweichungen({ ...basis, optionWerte: ['Poster matt'], materialVon: mat({}) }), []);
  ist('materialOptionAbweichungen: Variante ohne Wert für die Option (null) wird gemeldet', materialOptionAbweichungen({ ...basis, optionWerte: ['Poster matt'], materialVon: mat({ A: null, B: 'Poster matt', C: 'Foto-Glanzpapier' }) }).length, 1);

  // im echten Plan: vorhandene Option «Material» von Hand mit «Holz» angelegt
  const holz = klon(bestand); const hp = holz['poster-zum-selbstgestalten'];
  hp.options.unshift({ name: 'Material', position: 1, values: ['Holz'] }); hp.options.forEach((o, i) => { o.position = i + 1; });
  hp.variants.forEach((v) => v.selectedOptions.unshift({ name: 'Material', value: 'Holz' }));
  const ph = planen({ bestand: holz, nur: ['poster-zum-selbstgestalten'] });
  ist('Plan mit von Hand angelegter Option «Material» («Holz»): optionPruefung nennt Fremdwert und die vier Varianten, schon der Trockenlauf hat Verstösse', [ph.produkte[0].optionPruefung.length, ph.verstoesse.filter((x) => /Option «Material» im Shop hat Werte, die der Plan nicht kennt: «Holz»/.test(x)).length, ph.verstoesse.length], [5, 1, 5]);
  ist('Plan mit «Holz»: Verstoss beginnt mit dem Handle (Ausgabe des Trockenlaufs)', ph.verstoesse[0].startsWith('poster-zum-selbstgestalten: '), true);
  ist('echter Plan (keine Option «Material» im Shop): optionPruefung leer, keine Verstösse', [plan.produkte.map((p) => (p.optionPruefung || []).length), plan.verstoesse], [[0, 0, 0, 0, 0], []]);
  ist('Halbzustand (eigene Option mit Plan-Werten und Bestandswert) ist KEIN Verstoss', (() => {
    const halb = klon(bestand); const hb = halb['poster-zum-selbstgestalten'];
    hb.options = [{ name: 'Material', position: 1, values: ['Poster matt', 'Foto-Glanzpapier'] }, { name: 'Grösse', position: 2, values: [...hb.options[0].values] }];
    hb.variants = hb.variants.map((v) => ({ ...v, selectedOptions: [{ name: 'Material', value: 'Poster matt' }, ...v.selectedOptions] }));
    const px = planen({ bestand: halb, nur: ['poster-zum-selbstgestalten'] }); return [px.produkte[0].optionen.optionSchonDa, px.produkte[0].optionPruefung, px.verstoesse];
  })(), [true, [], []]);
  // Runde 4: die schon angelegten Varianten (`schonDa`) werden an die Prüfung der vorhandenen Option «Material» WEITERGEGEBEN (Mutant `schonDa,` → `schonDa: [],` blieb unbemerkt)
  { const halb = klon(bestand); const hb = halb['poster-zum-selbstgestalten']; const p0 = P('poster-zum-selbstgestalten');
    hb.options = [{ name: 'Material', position: 1, values: ['Poster matt', 'Foto-Glanzpapier', 'Leinwand'] }, { name: 'Grösse', position: 2, values: [...hb.options[0].values] }];
    hb.variants = hb.variants.map((v) => ({ ...v, selectedOptions: [{ name: 'Material', value: 'Poster matt' }, ...v.selectedOptions] }));
    const fg = p0.neu.filter((x) => x.optionen.Material === 'Foto-Glanzpapier');
    fg.forEach((n, i) => hb.variants.push({ id: 'gid://shopify/ProductVariant/' + n.pf, sku: n.sku, price: n.preisChf.toFixed(2), inventoryPolicy: 'CONTINUE', selectedOptions: [{ name: 'Material', value: i === 0 ? 'Leinwand' : n.optionen.Material }, { name: 'Grösse', value: n.optionen['Grösse'] }] }));
    const px = planen({ bestand: halb, nur: ['poster-zum-selbstgestalten'] });
    ist('schonDa wird an die Prüfung der Option «Material» weitergegeben: eine schon angelegte Variante mit anderem Material ist schon im Trockenlauf ein Verstoss', [px.produkte[0].schonDa.length, px.produkte[0].optionPruefung, px.verstoesse], [fg.length, [`Variante ${fg[0].sku}: Material «Leinwand» ≠ «Foto-Glanzpapier» (Plan)`], [`poster-zum-selbstgestalten: Variante ${fg[0].sku}: Material «Leinwand» ≠ «Foto-Glanzpapier» (Plan)`]]); }
  // Grenze (README «Optionen lesen»): ein leerer Wert einer ANDEREN Option (hier «Grösse»), der im Shop liegen blieb, gehört zu den vorhandenen Werten: der Plan nimmt ihn mit, der Hash ändert sich (neuer Trockenlauf nötig)
  { const mitRest = klon(bestand); mitRest['poster-zum-selbstgestalten'].options[0].values.push('XXL-Rest');
    const pr = planen({ bestand: mitRest, nur: ['poster-zum-selbstgestalten'] });
    ist('leerer Rest-Wert in «Grösse»: im Plan unter den vorhandenen Werten, der Plan-Hash ändert sich, es gibt keine Verstösse', [pr.produkte[0].optionen.nachher[1].werte.includes('XXL-Rest'), pr.hash === planen({ nur: ['poster-zum-selbstgestalten'] }).hash, pr.verstoesse], [true, false, []]); }
  ist('optionPruefung ändert den Plan-Hash nicht (nur die Ausführbarkeit)', hashVon(aktionenFuerHash({ produkte: [{ ...P('poster-zum-selbstgestalten'), optionPruefung: ['x'] }] })), hashVon(aktionenFuerHash({ produkte: [{ ...P('poster-zum-selbstgestalten'), optionPruefung: [] }] })));
  ist('pruefePlan meldet jede Abweichung der Option «Material» mit Handle', pruefePlan({ produkte: [{ ...P('poster-zum-selbstgestalten'), optionPruefung: ['a', 'b'] }], regel: plan.regel }, { katalog, skuPruefung }).filter((x) => /^poster-zum-selbstgestalten: [ab]$/.test(x)), ['poster-zum-selbstgestalten: a', 'poster-zum-selbstgestalten: b']);
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
