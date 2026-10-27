// Tests für den Plan «Selbst gestalten: Material + Modelle» gegen die ECHTEN Daten (dropship/pod-auswahl/*.json, gemessen 27.10.2026). Kein Netz.
// Lauf: /opt/node22/bin/node automation/lib/pod_auswahl_plan_test.mjs
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { planeAlles, pfIdAusSku, setzeMaterialBlock, materialBlock, modellVergleich, benoetigteVersandIds, tabellenZeilen, tabelleCsv, tabelleMarkdown, zollZeile, kanonisch } from './pod_auswahl_plan.mjs';
import { SPEC, MARKE_AUF, MARKE_ZU, ZUSATZ_BELEGE } from './pod_auswahl_spec.mjs';
import { ladePaket } from './pod_auswahl_daten.mjs';
import { endpreis, REGEL } from './pod_preise.mjs';
import { platzierungFuer } from './printful_platzierung.mjs';
import { blockVon, ohneBlock } from './pod_auswahl_schreiben.mjs';

let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 400)}\n   soll: ${JSON.stringify(b).slice(0, 400)}`); } };
const wahr = (n, c, info = '') => ist(n + (c ? '' : ' ' + info), !!c, true);

const paket = ladePaket();
const { katalog, beschreibungen, versand, bestand, skuPruefung } = paket;
const klon = (x) => JSON.parse(JSON.stringify(x));
const planen = (ueber = {}) => planeAlles({ katalog, beschreibungen, versand, bestand, skuPruefung, ...ueber });
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
ist('Hoodie: Material-Werte exakt', werte('unisex-hoodie-selbst-gestalten', 'Material'), ['Baumwoll-Mix', 'Premium-Baumwolle', 'Bio-Baumwolle']);
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
  const b = P('unisex-hoodie-selbst-gestalten').befunde.filter((x) => x.schwere === 'blocker');
  ist('Hoodie: genau ein Blocker-Befund «sku-anderes-produkt»', b.map((x) => [x.code, x.printfulProdukt, x.erwartet, x.skus.length]), [['sku-anderes-produkt', 145, 146, 8]]);
  wahr('Hoodie-Befund nennt Printful-Produkt und Gildan 18000', /145/.test(b[0].text) && /Gildan 18000/.test(b[0].text));
  for (const h of HANDLES.filter((x) => x !== 'unisex-hoodie-selbst-gestalten')) ist(`${h}: kein Blocker-Befund`, P(h).befunde.filter((x) => x.schwere === 'blocker').length, 0);
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
  }
  ist(`alle ${n} Materialangaben belegt (Textstelle wörtlich vorhanden, Zahlen im Beleg)`, schlecht.slice(0, 4), []);
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
  wahr('Hoodie-Block nennt «Rundhals-Sweatshirt» beim Baumwoll-Mix', /Baumwoll-Mix:<\/strong>[^<]*Rundhals-Sweatshirt/.test(h));
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
  ist('Samsung: vier Bilder vom Printful-Katalog, https', [np.bilder.length, np.bilder.every((b) => /^https:\/\/files\.cdn\.printful\.com\//.test(b.url) && b.alt.includes('Samsung'))], [4, true]);
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
  ist('Tabelle: neun Spalten', new Set(z.map((r) => r.length)), new Set([9]));
  wahr('Tabelle: Markdown-Kopf mit den verlangten Spalten', tabelleMarkdown(plan).startsWith('| Produkt | Material | Grösse/Modell | SKU | Einkauf USD | Versand USD | Preis CHF | Netto-Gewinn CHF | Status |'));
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

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
