#!/usr/bin/env node
/**
 * dubletten_draften.mjs — Doppelt angelegte Produkte stilllegen (DRAFT, nie löschen)
 * =================================================================================
 * Befund (dropship/FEHLERSUCHE-14-08.md, 14.08.2026), drei Gruppen:
 *
 *  A) fortura  — 77 Fortura-Lieferanten-SKUs stehen gleichzeitig als eigenes
 *     Einzelgrössen-Produkt UND als Variante im Sammelprodukt: 130 aktive Produkte.
 *     Beide Kopien sind tracked+DENY und führen dieselbe Menge → derselbe Lagerbestand
 *     wird zweimal verkauft (live nachgezählt: 750 Stück doppelt geführt).
 *  B) cjpraefix — 20 Paare (40 Produkte) mit identischer CJ-Varianten-SKU, einmal roh
 *     importiert mit «CJ-»-Präfix, einmal veredelt ohne Präfix. Preise 14.90 gegen
 *     39.90 für dieselbe Ware; alle 40 im Google-Kanal (Duplicate Offer).
 *  C) bild — Produkte mit byte-identischem Hauptbild und erkennbar derselben Ware.
 *     Ermittelt über alle 31'398 aktiven Produkte: erst Content-Length je Hauptbild
 *     (HEAD), dann MD5 der ersten 48 KB nur innerhalb der Grössen-Kollisionen.
 *     Ergebnis: 240 bildgleiche Gruppen / 580 Produkte. Davon sind aber die
 *     WENIGSTEN Dubletten — siehe Fehltreffer unten. Übrig blieben 51 Paare.
 *
 * Wer gewinnt, wer geht auf DRAFT
 * -------------------------------
 *  A) Es bleibt das Produkt mit MEHR Varianten (das Sammelprodukt mit Grössenwahl).
 *     Harte Bedingung: JEDE SKU des Verlierers muss im Gewinner vorkommen — sonst
 *     würde Ware aus dem Verkauf fallen. Diese Prüfung hat 2 Fehltreffer gefangen
 *     (siehe unten) und ist deshalb im Code, nicht nur im Probelauf.
 *  B) Es bleibt die veredelte Kopie OHNE «CJ-»-Präfix.
 *     ⚠️ Hier wäre die Faustregel «das mit weniger Bildern draften» FALSCH gewesen:
 *     die rohe Kopie hat meist MEHR Medien (8 gegen 5), ist aber die schlechtere —
 *     Maschinentitel («Fashionable Open-toe Thick-soled High-heeled Slides»),
 *     Lieferantencode im Farbwert («88662 Light Brown»), Preis auf/unter dem
 *     Preisboden von CHF 14.90 und nur 6 statt 7–8 Verkaufskanäle. Bewertungen
 *     entscheiden nichts: live geprüft, alle 40 haben judgeme.number_of_reviews = 0.
 *  C) Es bleibt das Produkt mit mehr Medien; bei Gleichstand das mit Bewertungen,
 *     dann das ältere. Produkte MIT Bewertungen werden nie gedraftet.
 *
 * Fehltreffer aus dem Probelauf (bewusst AUSGENOMMEN)
 * ---------------------------------------------------
 *  - «Kostüm Hexe Magie schwarz» 15469860389249 trägt fortura-CK4194140, das
 *    Sammelprodukt nur CK4194140H — ähnliche, aber ANDERE SKU. Kein Duplikat der
 *    Grösse, sondern eine Grösse, die es nur hier gibt.
 *  - «Dirndl retro ohne Bluse» 15469974454657 führt Grösse 36 und 38, das
 *    Sammelprodukt erst ab 40. Eine aufgeteilte Grössenreihe, keine Dublette.
 *  Beide bleiben ACTIVE. Allgemein statt Ausnahmeliste: die SKU-Deckungsprüfung.
 *
 *  Gruppe C war fast durchweg Fehltreffer — von 240 bildgleichen Gruppen blieben 51:
 *  - 34 Gruppen sind die POD-Schweiz-Editionen: DASSELBE Motiv auf Sticker, Magnet,
 *    Tasche, Kissen und Mauspad. Das Hauptbild ist die Design-Datei, nicht das
 *    Produktfoto. Fünf verschiedene Artikel, ein Bild — wer hier draftet, löscht
 *    vier verkaufbare Produkte je Motiv. **Ein gleiches Bild beweist keine Dublette,
 *    wenn das Bild das MOTIV zeigt und nicht den Artikel.**
 *  - 55 Gruppen sind Farb-, Grössen- oder Modellfamilien, die sich EIN Katalogfoto
 *    teilen: «ZQ-K26 Rotes» / «ZQ-K26 Blaues», 6× «Yoga-Hose · Modell 3/5/…»,
 *    13 Leinwandbilder mit demselben Rahmen-Foto, «Damenuhr Bellevue B39 (Ø 35 mm)»
 *    / «B42-2 (Ø 40 mm)», «18650 Akku» / «18650 Akku 10er-Pack».
 *  - Ein Set ist keine Dublette seines Einzelteils: «Zirkonia-Kette «Stella»» gegen
 *    «Kleeblatt-Glücks-Duo · 2-teilig», «Geburtsstein-Armband «Aura»» gegen
 *    «Geschenkset «Aura» · 3-teilig».
 *  - Verneinung gelesen: «Induktions-Wok MIT Antihaft» gegen «Induktions-Pfanne
 *    OHNE Antihaft-Beschichtung» ist ein Gegensatz, keine Umformulierung.
 *  Die maschinellen Wachen dagegen stehen unten (SET/FARBE/MODELL/EINHEIT/ohne);
 *  was sie durchliessen, wurde von Hand geprüft — 37 weitere Paare fielen dabei
 *  heraus, u. a. «Fächer für Rave» gegen «Bolero Rave», «Feuerdrache Diamond
 *  Painting» gegen «Diamond Painting: Traktor», «Kugelkettchen» gegen
 *  «Buchstaben-Halskette» und alle Fortura-Paare mit Grösse/Alter im Titel.
 *
 * Bewusst NICHT angefasst
 * -----------------------
 *  - Bestandsmengen: der Doppelverkauf verschwindet dadurch, dass die zweite Seite
 *    nicht mehr kaufbar ist. An Lagerzahlen wird nichts geschrieben (CLAUDE.md:
 *    «Vor jeder Bestandskorrektur den Lieferanten fragen»).
 *  - Die 6 CJ-Paare, bei denen die rohe Kopie zusätzliche FARBEN führt (120
 *    Varianten, davon 3 echte Grössen). Sie fallen mit dem DRAFT weg; das ist der
 *    bewusst gezahlte Preis dafür, dass der Shop sich nicht mehr selbst unterbietet.
 *    Steht als offener Punkt im Bericht.
 *
 * Ledger: dropship/_dubletten_gedraftet.txt — eine Zeile je Produkt, sofort
 * geschrieben (appendFileSync), damit ein Abbruch nichts verliert. Nur eine ECHTE
 * Antwort der API wird eingetragen; jeder Fehlschlag bleibt offen und wird beim
 * nächsten Lauf erneut versucht.
 *
 * Aufruf:  node automation/dubletten_draften.mjs <plan.json> [--scharf]
 *          ohne --scharf nur Probelauf (zählt und zeigt, schreibt nichts).
 */
import fs from 'fs';
import path from 'path';

const TOKEN_FILE = '/tmp/cj_shop_token.txt';
const ENDPOINT = 'https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json';
const LEDGER = path.join(process.cwd(), 'dropship/_dubletten_gedraftet.txt');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function gql(query, variables = {}, tries = 6) {
  const tok = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  let last = '';
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      });
      const t = await r.text();
      let j;
      try { j = JSON.parse(t); } catch { last = 'keine JSON-Antwort: ' + t.slice(0, 160); await sleep(2000 * (i + 1)); continue; }
      if (j.errors) {
        const m = JSON.stringify(j.errors);
        if (/THROTTLED/i.test(m)) { last = m; await sleep(3000 * (i + 1)); continue; }
        throw new Error(m);
      }
      return j.data;
    } catch (e) { last = e.message; await sleep(2000 * (i + 1)); }
  }
  // Regel 6: eine gescheiterte Anfrage ist kein Ergebnis.
  throw new Error('API antwortete nicht (' + tries + ' Versuche): ' + last);
}

const Q_PRODUKT = `query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id title status tags
  mediaCount{count}
  variants(first:100){nodes{sku}}
  jm: metafield(namespace:"judgeme", key:"review_widget_data"){value} } } }`;

const M_DRAFT = `mutation($p:ProductInput!){ productUpdate(input:$p){ product{ id status tags } userErrors{ field message } } }`;

function bewertungen(p) {
  try { return JSON.parse(p.jm.value).number_of_reviews || 0; } catch { return 0; }
}

async function ladeLive(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20).map(x => 'gid://shopify/Product/' + x);
    const d = await gql(Q_PRODUKT, { ids: chunk });
    const got = d.nodes.filter(Boolean).length;
    if (got !== chunk.length) throw new Error('unvollständige Antwort: ' + got + '/' + chunk.length);
    for (const n of d.nodes) out[n.id.split('/').pop()] = n;
    await sleep(350);
  }
  return out;
}

async function main() {
  const planFile = process.argv[2];
  const scharf = process.argv.includes('--scharf');
  if (!planFile) { console.error('Aufruf: node automation/dubletten_draften.mjs <plan.json> [--scharf]'); process.exit(1); }
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));

  const erledigt = new Set(
    fs.existsSync(LEDGER)
      ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t')[0])
      : []
  );

  const ids = [...new Set(plan.flatMap(x => [String(x.loser), String(x.winner)]))];
  console.log('Plan: ' + plan.length + ' Paare, ' + ids.length + ' Produkte — live nachladen …');
  const live = await ladeLive(ids);

  const machen = [], uebersprungen = [];
  for (const x of plan) {
    const l = live[String(x.loser)], w = live[String(x.winner)];
    const merk = (grund) => uebersprungen.push({ id: x.loser, titel: l ? l.title : '?', grund });
    if (!l || !w) { merk('Produkt nicht auffindbar'); continue; }
    if (erledigt.has(String(x.loser))) { merk('schon im Ledger'); continue; }
    if (l.status !== 'ACTIVE') { merk('nicht mehr ACTIVE (' + l.status + ')'); continue; }
    if (w.status !== 'ACTIVE') { merk('Gewinner ' + x.winner + ' ist nicht ACTIVE — dann darf der Verlierer bleiben'); continue; }
    if (bewertungen(l) > 0 && bewertungen(l) >= bewertungen(w)) { merk('hat ' + bewertungen(l) + ' Bewertungen'); continue; }

    if (x.gruppe === 'fortura') {
      // harte Deckungsprüfung: keine SKU darf aus dem Verkauf fallen
      const ls = l.variants.nodes.map(v => v.sku).filter(Boolean);
      const ws = w.variants.nodes.map(v => v.sku).filter(Boolean);
      const fehlt = ls.filter(s => !ws.includes(s));
      if (fehlt.length) { merk('SKU nur hier vorhanden: ' + fehlt.join(',')); continue; }
    }
    machen.push({ ...x, ltitel: l.title, wtitel: w.title, tags: l.tags });
  }

  console.log('\n--- ' + (scharf ? 'SCHARF' : 'PROBELAUF') + ' ---');
  for (const m of machen) console.log(`DRAFT ${m.loser} "${m.ltitel}"   bleibt: ${m.winner} "${m.wtitel}"`);
  console.log('\nzu draften: ' + machen.length);
  for (const s of uebersprungen) console.log(`  übersprungen ${s.id} "${s.titel}" → ${s.grund}`);
  if (!scharf) { console.log('\n(Probelauf — nichts geschrieben. Mit --scharf ausführen.)'); return; }

  let ok = 0, fehler = 0;
  for (const m of machen) {
    const tags = [...new Set([...(m.tags || []), 'duplikat-auto-draft', 'dublette-' + m.gruppe, 'dublette-original-' + m.winner])];
    try {
      const d = await gql(M_DRAFT, { p: { id: 'gid://shopify/Product/' + m.loser, status: 'DRAFT', tags } });
      const ue = d.productUpdate.userErrors;
      if (ue && ue.length) throw new Error(JSON.stringify(ue));
      if (d.productUpdate.product.status !== 'DRAFT') throw new Error('Status blieb ' + d.productUpdate.product.status);
      // Regel 5: sofort schreiben, nicht sammeln.
      fs.appendFileSync(LEDGER, `${m.loser}\t${m.gruppe}\t${m.winner}\t${new Date().toISOString()}\t${m.ltitel.replace(/\s+/g, ' ')}\n`);
      ok++;
      console.log(`  ✓ ${m.loser} → DRAFT`);
    } catch (e) {
      fehler++;
      console.log(`  ✗ ${m.loser} bleibt OFFEN: ${e.message}`);
    }
    await sleep(400);
  }
  console.log(`\ngedraftet: ${ok}, offen geblieben: ${fehler}`);
}

main().catch(e => { console.error('ABBRUCH: ' + e.message); process.exit(1); });
