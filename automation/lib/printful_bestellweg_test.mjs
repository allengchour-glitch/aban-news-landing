// Tests für die reine Logik des Bestellwegs (lib/printful_bestellweg.mjs), kein Netz. Lauf: /opt/node22/bin/node automation/lib/printful_bestellweg_test.mjs
// Prüfdaten: Auszug aus dem ECHTEN Printful-Katalog (dropship/pod-auswahl/bestellweg_katalog_auszug.json: Tasse 19, T-Shirt 71, Kappe 206,
// Poster 268, Kapuzenjacke 388, Strick 769, Hülle 798; gelesen 05.11.2026) und die echten Mitschnitte der Platzierung. Das Verhalten des ganzen Skripts (gefälschtes fetch)
// prüft automation/printful_sync_test.mjs.
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { produktInfoAusAntwort } from './printful_platzierung.mjs';
import {
  adresseProblem, dateienAusEigenschaften, variantAusSku, skuWaehlen, istPod, technikFamilie, garnOption, optionenPruefen, technikPruefen, konfliktePruefen,
  dateiMasse, druckdateiFuer, wirklicheDpi, aufloesungPruefen, MIN_DPI_VORGABE, KOSTEN_REGEL, kostenPruefen, statusBewerten, dateienStatus, externalId, empfaengerAus,
  befundTag, befundPlan, versuche, versuchTag, MAX_VERSUCHE, esc, kontrolleLesen, kleineKopieUrl, planeBestellung, ERLAUBTE_HOSTS, BESTAETIGT, REVIEW_TAG,
  modellAusSku, SKU_BASIS, QD_MIN, QD_MAX, standortVon, aufpreisUsd, aufpreisPruefen, paketStandard, paketAusOption,
  adresseNormal, EIGENE_CLOUDINARY_CLOUD, KOSTEN_MIN_USD, entwurfVergleichen, editorProdukt, zahlungPruefen, ANLEGEN_SPERRE_MIN, anlegenTag, anlegenAlterMin,
  vorhandenVergleichen, SCOPES_PFLICHT, scopesBewerten, bestaetigenPlan,
  EIGENER_SHOPIFY_CDN_PFAD, FO_DRUCKBAR, anlegenGesperrt, anspruchGewonnen, bestellStand, bestellAbweichung,
  scharfErlaubt, SYNC_WORKFLOW_REF, uhrBewerten, UHR_GRENZE_MS, anspruchWarteLesen, anspruchLangsam, alsEntwurfAngelegt, dezimalLesen, ANSPRUCH_WARTE_MS_VORGABE, ANSPRUCH_WARTE_MS_MIN, ANSPRUCH_WARTE_MS_MAX, ANSPRUCH_TESTKENNUNG,
  TAG_MAX, BEFUND_ART_MAX, ANSPRUCH_ZUFALL_LAENGE, anspruchZufall, vorhandenArt,
} from './printful_bestellweg.mjs';

let ok = 0, fehl = 0;
const wert = (a) => { if (typeof a !== 'function') return a; try { return a(); } catch (e) { return { Ausnahme: String((e && e.message) || e).slice(0, 200) }; } };
const ist = (n, a0, b) => { const a = wert(a0); const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };
const wahr = (n, c, info = '') => ist(n + (c ? '' : ' ' + info), !!c, true);
const lade = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
const KAT = lade('../../dropship/pod-auswahl/bestellweg_katalog_auszug.json').produkte;
const U = (x) => 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1/' + x + '.png';
const A = (key, value) => ({ key, value });
const arten = (bf) => bf.map((b) => b.art);

// ═══════════════════════════════════════ Adresse einer Druckdatei
for (const [n, w, soll] of [
  ['Cloudinary https', U('a'), null], ['Shopify-CDN', 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/a.png', null], ['http statt https', 'http://res.cloudinary.com/dwyi6kkrl/image/upload/a.png', 'keine https-Adresse'],
  ['fremder Host', 'https://evil.example.com/a.png', 'Host «evil.example.com» ist nicht erlaubt'], ['interne Adresse (SSRF)', 'https://169.254.169.254/latest/meta-data', 'Host «169.254.169.254» ist nicht erlaubt'],
  ['localhost', 'https://localhost/a.png', 'Host «localhost» ist nicht erlaubt'], ['Zugangsdaten in der Adresse', 'https://u:p@res.cloudinary.com/a.png', 'Adresse enthält Zugangsdaten'],
  ['Host nur im Pfad', 'https://evil.example.com/res.cloudinary.com/a.png', 'Host «evil.example.com» ist nicht erlaubt'], ['Host als Unterdomäne eines erlaubten Hosts', 'https://res.cloudinary.com.evil.com/a.png', 'Host «res.cloudinary.com.evil.com» ist nicht erlaubt'],
  ['Grossbuchstaben im Host', 'https://RES.Cloudinary.com/dwyi6kkrl/image/upload/a.png', null], ['Leerzeichen', 'https://res.cloudinary.com/a b.png', 'Adresse enthält Leerzeichen'], ['kein URL', 'javascript:alert(1)', 'keine https-Adresse'], ['leer', '', 'keine gültige Adresse'],
  ['data-Adresse', 'data:image/png;base64,AAAA', 'keine https-Adresse'], ['file-Adresse', 'file:///etc/passwd', 'keine https-Adresse'],
]) ist(`Adresse: ${n}`, adresseProblem(w), soll);
ist('Adresse: eigene Hostliste', adresseProblem('https://bilder.luxestyle.ch/a.png', ['bilder.luxestyle.ch']), null);
ist('Vorgabe-Hosts: nur Cloudinary und Shopify-CDN', [...ERLAUBTE_HOSTS], ['res.cloudinary.com', 'cdn.shopify.com']);

// ═══════════════════════════════════════ Eigenschaften der Position
{
  const karte = JSON.stringify({ v: 6, s: 1, m: 71, pv: 4025, sv: '1', pl: ['front', 'back', 'sleeve_left'], dt: { front: 'default' }, px: ['1800x2400', '1800x2400', '600x525'], ap: 6.1 });
  const r = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (back)', U('h')), A('🖼️ Druckdatei (sleeve_left)', U('a')), A('🎨 Design (front)', 'Text: "Hallo"'), A('_pod_karte', karte)]);
  ist('v6 drei Platzierungen: Datei je Platzierung, dt macht aus «front» den Dateityp «default», sonst die ID selbst', r.dateien.map((d) => [d.platzierung, d.dateiTyp, d.url.slice(-5), d.quelle]), [['front', 'default', 'v.png', 'v6'], ['back', 'back', 'h.png', 'v6'], ['sleeve_left', 'sleeve_left', 'a.png', 'v6']]);
  ist('v6: Seite wird für front/back abgeleitet, Ärmel hat keine', r.dateien.map((d) => d.seite), ['front', 'back', null]);
  ist('v6: kein Problem, Karte gelesen', [r.probleme, r.karte.v], [[], 6]);
  const r2 = dateienAusEigenschaften({ '🖼️ Druckdatei (embroidery_chest_left)': U('s'), '_pod_karte': JSON.stringify({ v: 6, pl: ['embroidery_chest_left'] }) });
  ist('v6 als Objekt statt Liste, Stickerei-Platzierung', [r2.dateien[0].platzierung, r2.dateien[0].dateiTyp, r2.probleme], ['embroidery_chest_left', 'embroidery_chest_left', []]);
  const r3 = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', U('v'))]);
  ist('v6 ohne _pod_karte: Datei gilt, kein Problem (die Karte ist nur eine Gegenprobe)', [r3.dateien.length, r3.karte, r3.probleme], [1, null, []]);
  const r4 = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', U('v')), A('_pod_karte', '{"v":6,"pl":["front","back"]}')]);
  ist('Karte nennt «back», es gibt aber keine Datei dafür: weicher Befund «karte-ohne-datei»', [arten(r4.probleme), r4.probleme[0]?.hart], [['karte-ohne-datei'], false]);
  const r5 = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (back)', U('h')), A('_pod_karte', '{"v":6,"pl":["front"]}')]);
  ist('Datei für «back», aber nicht in der Karte: weicher Befund «datei-ohne-karte», Datei bleibt', [arten(r5.probleme), r5.dateien.length], [['datei-ohne-karte'], 2]);
  for (const [n, k] of [['kein JSON', '{"v":6,"pl":['], ['Version 5', '{"v":5,"pl":["front"]}'], ['ohne Platzierungsliste', '{"v":6}'], ['ein Array', '[1,2]'], ['null', 'null'], ['leer', '']]) {
    const x = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', U('v')), A('_pod_karte', k)]);
    ist(`kaputte Karte (${n}): weicher Befund «karte-unlesbar», die Datei bleibt gültig`, [arten(x.probleme), x.karte, x.dateien.length], [['karte-unlesbar'], null, 1]);
  }
  const r6 = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (front)', U('w'))]);
  ist('dieselbe Platzierung zweimal: harter Befund «datei-doppelt», die erste Datei bleibt', [arten(r6.probleme), r6.probleme[0]?.hart, r6.dateien.length], [['datei-doppelt'], true, 1]);
  const r7 = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', 'https://evil.example.com/x.png')]);
  ist('Druckdatei von fremdem Host: harter Befund «datei-adresse», keine Datei', [arten(r7.probleme), r7.probleme[0]?.hart, r7.dateien.length, /nicht erlaubt/.test(r7.probleme[0]?.text)], [['datei-adresse'], true, 0, true]);
  const r8 = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', '   '), A('🖼️ Druckdatei (back)', '')]);
  ist('leere Druckdatei-Eigenschaften: keine Datei, KEIN Problem (Editor schreibt sie für unbenutzte Seiten)', [r8.dateien.length, r8.probleme], [0, []]);
  const r9 = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', U('v')), A('Vorne · 🖼️ Druckdatei', U('w'))]);
  ist('Schlüssel von v5 und v6 gemischt: harter Befund «schluessel-gemischt»', [arten(r9.probleme), r9.probleme[0]?.hart], [['schluessel-gemischt'], true]);
}
// v5 (wie die alte pickFiles): «Hinten»/«Back» → Rückseite, alles andere Vorderseite
for (const [n, k, seite] of [['Vorne · 🖼️ Druckdatei', 'Vorne · 🖼️ Druckdatei', 'front'], ['Hinten · 🖼️ Druckdatei', 'Hinten · 🖼️ Druckdatei', 'back'], ['🖼️ Druckdatei (Vorne)', '🖼️ Druckdatei (Vorne)', 'front'],
  ['🖼️ Druckdatei (Hinten)', '🖼️ Druckdatei (Hinten)', 'back'], ['🖼️ Druckdatei (nur eine Seite)', '🖼️ Druckdatei', 'front'], ['englisch Front', 'Front · 🖼️ Print file', 'front'], ['englisch Back', 'Back · 🖼️ Print file', 'back'], ['englisch Back in Klammern', '🖼️ Print file (Back)', 'back'], ['Front in Klammern', '🖼️ Druckdatei (Front)', 'front']]) {
  const r = dateienAusEigenschaften([A(k, U('x'))]);
  ist(`v5 «${n}» → ${seite}`, [r.dateien.map((d) => [d.seite, d.platzierung, d.quelle]), r.probleme], [[[seite, null, 'v5']], []]);
}
{
  const r = dateienAusEigenschaften([A('Vorne · 🖼️ Druckdatei', U('v')), A('Hinten · 🖼️ Druckdatei', U('h'))]);
  ist('v5 vorne+hinten: beide Seiten, URLs zugeordnet', r.dateien.map((d) => [d.seite, d.url.slice(-5)]), [['front', 'v.png'], ['back', 'h.png']]);
  const d2 = dateienAusEigenschaften([A('Vorne · 🖼️ Druckdatei', U('v')), A('🖼️ Druckdatei (Vorne)', U('w'))]);
  ist('v5: zwei Dateien für die Vorderseite → harter Befund', arten(d2.probleme), ['datei-doppelt']);
  const f = dateienAusEigenschaften([A('Vorne · 🖼️ Druckdatei', 'http://res.cloudinary.com/x/a.png')]);
  ist('v5 mit http-Adresse: nicht mehr still ignoriert, sondern harter Befund (früher: ohne Meldung übergangen)', [arten(f.probleme), f.dateien.length], [['datei-adresse'], 0]);
  ist('Eigenschaften ohne Druckdatei (Design-Text, Notiz): nichts', dateienAusEigenschaften([A('🎨 Design (front)', 'x'), A('Notiz', 'y')]).dateien.length, 0);
  ist('null/undefined als Eigenschaften', [dateienAusEigenschaften(null).dateien, dateienAusEigenschaften(undefined).probleme], [[], []]);
  ist('Eigenschaften mit null-Wert', dateienAusEigenschaften([{ key: '🖼️ Druckdatei (front)', value: null }]).dateien, []);
}
// Optionen
{
  const r = dateienAusEigenschaften([A('🖼️ Druckdatei (embroidery_chest_left)', U('s')), A('⚙️ Option (thread_colors_chest_left)', '#FFFFFF, #CC3333'), A('⚙️ Option (stitch_color)', 'black'), A('⚙️ Option (lifelike)', 'ja')]);
  ist('Optionen aus ⚙️-Eigenschaften (roh, Typen prüft optionenPruefen)', r.optionen, { thread_colors_chest_left: '#FFFFFF, #CC3333', stitch_color: 'black', lifelike: 'ja' });
  const k = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', U('v')), A('_pod_karte', JSON.stringify({ v: 6, pl: ['front'], o: { thread_colors: ['#000000', '#FFFFFF'], stitch_color: 'white', 'Böse Id': 'x', leer: '' } }))]);
  ist('Optionen aus _pod_karte.o: Liste und Text, ungültige Ids und Leerwerte werden gemeldet, nicht übernommen', [k.optionen, arten(k.probleme)], [{ thread_colors: ['#000000', '#FFFFFF'], stitch_color: 'white' }, ['karte-unlesbar', 'karte-unlesbar']]);
  const g = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', U('v')), A('_pod_karte', JSON.stringify({ v: 6, pl: ['front'], o: { stitch_color: 'white' } })), A('⚙️ Option (stitch_color)', 'black')]);
  ist('⚙️-Eigenschaft gewinnt gegen _pod_karte.o', g.optionen.stitch_color, 'black');
}

// ═══════════════════════════════════════ SKU
for (const [sku, soll] of [['3615382_20688', 20688], ['111_1320 ', 1320], ['abc_12_34', 34], ['5599797_4025', 4025], ['CJ-123', null], ['', null], [null, null], ['x_0', null], ['x_-5', null], ['x_12a', null], ['_9', 9]]) ist(`variantAusSku(${JSON.stringify(sku)})`, variantAusSku(sku), soll);
ist('SKU: Position und Variante gleich → die Nummer, kein Problem', skuWaehlen({ positionSku: 'a_4025', variantenSku: 'a_4025' }).probleme, []);
ist('SKU: Position hat Vorrang vor Variante (Codex-Fund: früher umgekehrt)', skuWaehlen({ positionSku: 'a_111', variantenSku: 'a_222' }).vid, 111);
ist('SKU: die beiden widersprechen sich → weicher Befund «sku-widerspruch» (nennt beide Nummern)', [arten(skuWaehlen({ positionSku: 'a_111', variantenSku: 'a_222' }).probleme), skuWaehlen({ positionSku: 'a_111', variantenSku: 'a_222' }).probleme[0]?.hart, /111/.test(skuWaehlen({ positionSku: 'a_111', variantenSku: 'a_222' }).probleme[0]?.text) && /222/.test(skuWaehlen({ positionSku: 'a_111', variantenSku: 'a_222' }).probleme[0]?.text)], [['sku-widerspruch'], false, true]);
ist('SKU: nur die Variante hat eine Nummer → Rückfall', skuWaehlen({ positionSku: 'kaputt', variantenSku: 'a_222' }).vid, 222);
ist('SKU: nur die Position hat eine → die Position, kein Widerspruch', [skuWaehlen({ positionSku: 'a_111', variantenSku: null }).vid, skuWaehlen({ positionSku: 'a_111', variantenSku: null }).probleme], [111, []]);
ist('SKU: keine Nummer → vid null', skuWaehlen({ positionSku: 'x', variantenSku: 'y' }).vid, null);
ist('SKU: nichts übergeben', skuWaehlen().vid, null);

// ═══════════════════════════════════════ POD-Erkennung
for (const [n, li, soll] of [['Tag wunschdesign', { product: { tags: ['wunschdesign'] } }, true], ['Tag in Grossbuchstaben', { product: { tags: ['WunschDesign'] } }, true], ['Tag printful_personalized_product', { product: { tags: ['x', 'printful_personalized_product'] } }, true],
  ['anderes Tag', { product: { tags: ['sale'] } }, false], ['kein Produkt', { product: null }, false], ['keine Tags', { product: {} }, false], ['nichts', null, false], ['nur Eigenschaft ohne Tag (Kunde kann sie frei setzen)', { product: { tags: [] }, customAttributes: [A('🖼️ Druckdatei (front)', U('x'))] }, false]]) ist(`istPod: ${n}`, istPod(li), soll);

// ═══════════════════════════════════════ Technik und Garnfarben
for (const [t, soll] of [['default', 'STANDARD'], ['front', 'STANDARD'], ['back', 'STANDARD'], ['sleeve_left', 'STANDARD'], ['label_outside', 'STANDARD'], ['embroidery_chest_left', 'EMBROIDERY'], ['embroidery_apparel_front', 'EMBROIDERY'],
  ['front_dtf', 'DTFILM'], ['back_large_dtf', 'DTFILM'], ['long_sleeve_right_dtf', 'DTFILM'], ['front_dtf_hat', 'DTFILM'], ['label_inside_dtf', 'DTFILM'], ['chest_left_dtf', 'DTFILM'], ['front_dtfabric', 'DIRECT-TO-FABRIC'], ['sleeve_left_dtfabric', 'DIRECT-TO-FABRIC'], ['hood', 'STANDARD']]) ist(`Technik von «${t}»`, technikFamilie(t), soll);
// gegen den ganzen Katalog (577 Produkte, GEMESSEN 05.11.): jede Stickerei-Platzierung hat eine Garnfarben-Option
{
  const ALLE = process.env.KATALOG_ALLE || '';   // Ordner mit den 577 Katalogdateien von katalog_holen.mjs (<id>.json); ohne Angabe wird die Probe übersprungen
  if (!ALLE || !existsSync(ALLE)) console.log('(KATALOG_ALLE nicht gesetzt → Katalogprobe der Garnfarben übersprungen)');
  else {
    const { readdirSync } = await import('node:fs');
    let mit = 0, ohne = [], nachId = 0;
    for (const f of readdirSync(ALLE)) {
      const p = JSON.parse(readFileSync(ALLE + '/' + f, 'utf8')).produkt, ids = (p.options || []).map((o) => o.id);
      for (const fl of p.files || []) {
        if (/^embroidery_/.test(fl.id)) nachId++;
        if (/^embroidery_/.test(fl.type || '')) { if (garnOption(fl.type, ids)) mit++; else ohne.push(p.id + ':' + fl.id + ':' + fl.type); }
      }
    }
    // Nach TYP gezählt (nicht nach Datei-ID): die Kappen/Taschen führen ihre Stickerei unter «default», «back», «left», «right». Gegenleser-Fund 05.11.: die Zählung nach ID übersah 133 Dateien von 63 Produkten.
    ist('Gesamtkatalog nach Typ: 637 Stickerei-Platzierungen (504 davon mit Stickerei-ID), 634 mit gefundener Garnfarben-Option; die drei Kappen 99, 206, 252 («embroidery_front») führen keine', [nachId, mit, ohne.sort()], [504, 634, ['206:default:embroidery_front', '252:default:embroidery_front', '99:default:embroidery_front']]);
  }
}
ist('garnOption: genaue Option vor allgemeiner', garnOption('embroidery_chest_left', ['thread_colors', 'thread_colors_chest_left']), 'thread_colors_chest_left');
ist('garnOption: allgemeine thread_colors als Rückfall', garnOption('embroidery_front_large', ['thread_colors', 'notes']), 'thread_colors');
ist('garnOption: apparel_front → thread_colors_apparel', garnOption('embroidery_apparel_front', ['thread_colors_apparel', 'thread_colors_apparel_back']), 'thread_colors_apparel');
ist('garnOption: apparel_back → thread_colors_apparel_back', garnOption('embroidery_apparel_back', ['thread_colors_apparel', 'thread_colors_apparel_back']), 'thread_colors_apparel_back');
ist('garnOption: keine passende Option → null', garnOption('embroidery_chest_left', ['notes', 'license_type']), null);
ist('garnOption: keine Stickerei → null', [garnOption('front', ['thread_colors']), garnOption('', []), garnOption(null, null)], [null, null, null]);

// ═══════════════════════════════════════ Optionen prüfen (echte Optionen des T-Shirts 71, Kappe 206, Jacke 388, Strick 769)
const roh = (pid) => KAT[pid].produkt;
{
  const p = optionenPruefen({ produkt: roh(71), typen: ['default'], angegeben: {} });
  ist('T-Shirt nur Vorderseite (DTG): keine Pflichtoption, keine Optionen, kein Befund', [p.optionen, p.befunde], [[], []]);
  const e = optionenPruefen({ produkt: roh(71), typen: ['embroidery_chest_left'], angegeben: {} });
  ist('Stickerei ohne Garnfarben: weicher Befund «optionen», Pflichtoption thread_colors_chest_left', [arten(e.befunde), e.befunde[0]?.hart, /Pflichtoption «thread_colors_chest_left» fehlt/.test(e.befunde[0]?.text)], [['optionen'], false, true]);
  const e2 = optionenPruefen({ produkt: roh(71), typen: ['embroidery_chest_left'], angegeben: { thread_colors_chest_left: '#FFFFFF, #cc3333' } });
  ist('Stickerei mit Garnfarben (Text mit Komma, Kleinbuchstaben): Liste in der Katalogschreibweise, kein Befund', [e2.optionen, e2.befunde], [[{ id: 'thread_colors_chest_left', value: ['#FFFFFF', '#CC3333'] }], []]);
  const e3 = optionenPruefen({ produkt: roh(71), typen: ['embroidery_chest_left'], angegeben: { thread_colors_chest_left: ['#FFFFFF', '#123456'] } });
  ist('Garnfarbe, die es nicht gibt (#123456): Befund, nichts davon wird gesendet', [e3.optionen, /#123456/.test(e3.befunde[0]?.text)], [[], true]);
  const e4 = (() => { try { return optionenPruefen({ produkt: roh(71), typen: ['default'], angegeben: { gibt_es_nicht: 'x' } }); } catch (err) { return { optionen: [`Ausnahme: ${(err && err.message) || err}`], befunde: [] }; } })();
  ist('unbekannte Option: Befund «optionen», nicht gesendet', [e4.optionen, /gibt es bei diesem Printful-Produkt nicht/.test(e4.befunde[0]?.text)], [[], true]);
  const e5 = optionenPruefen({ produkt: roh(71), typen: ['embroidery_chest_left', 'embroidery_sleeve_left_top'], angegeben: { thread_colors_chest_left: '#000000' } });
  ist('zwei Stickereien, nur für eine Garnfarben: Befund nennt die andere', [e5.befunde.length, /thread_colors_sleeve_left_top/.test(e5.befunde[0]?.text)], [1, true]);
  const b = optionenPruefen({ produkt: roh(71), typen: ['default'], angegeben: { lifelike: 'ja' } });
  ist('bool «lifelike» = ja → true', b.optionen, [{ id: 'lifelike', value: true }]);
  ist('bool «vielleicht» → Befund', optionenPruefen({ produkt: roh(71), typen: [], angegeben: { lifelike: 'vielleicht' } }).befunde.length, 1);
  const n = optionenPruefen({ produkt: roh(71), typen: ['default'], angegeben: { notes: 'Bitte  hell' } });
  ist('Text-Option «notes»', n.optionen, [{ id: 'notes', value: 'Bitte  hell' }]);
  ist('Text-Option über 255 Zeichen → Befund', optionenPruefen({ produkt: roh(71), typen: [], angegeben: { notes: 'x'.repeat(256) } }).befunde.length, 1);
  ist('mehrfach wählbare Option ohne Wert (leere Liste) → Befund', optionenPruefen({ produkt: roh(71), typen: [], angegeben: { thread_colors_chest_left: [] } }).befunde.length, 1);
}
{
  const j = optionenPruefen({ produkt: roh(388), typen: ['default', 'back'], angegeben: {} });
  ist('Kapuzenjacke (CUT-SEW) mit stitch_color im Katalog: Pflicht «stitch_color» fehlt → Befund', [arten(j.befunde), /stitch_color/.test(j.befunde[0]?.text)], [['optionen'], true]);
  const j2 = optionenPruefen({ produkt: roh(388), typen: ['default'], angegeben: { stitch_color: 'black' } });
  ist('stitch_color = black → gesendet', [j2.optionen, j2.befunde], [[{ id: 'stitch_color', value: 'black' }], []]);
  const j3 = optionenPruefen({ produkt: roh(388), typen: ['default'], angegeben: { stitch_color: 'Pink' } });
  ist('stitch_color = Pink (nicht erlaubt) → Befund mit den erlaubten Werten', [j3.optionen, /white, black/.test(j3.befunde[0]?.text)], [[], true]);
  const j4 = optionenPruefen({ produkt: roh(388), typen: ['default'], angegeben: { stitch_color: 'White' } });
  ist('stitch_color: Titel statt Schlüssel («White») wird auf «white» abgebildet', j4.optionen, [{ id: 'stitch_color', value: 'white' }]);
  const k = optionenPruefen({ produkt: roh(206), typen: ['embroidery_front_large'], angegeben: {} });
  ist('Kappe: Stickerei vorne gross verlangt thread_colors_front_large', /thread_colors_front_large/.test(k.befunde[0]?.text), true);
  const s = optionenPruefen({ produkt: roh(769), typen: ['default'], angegeben: {} });
  ist('Strick (KNITWEAR): yarn_colors ist Pflicht (Annahme)', [arten(s.befunde), /yarn_colors/.test(s.befunde[0]?.text)], [['optionen'], true]);
  const tasse = optionenPruefen({ produkt: roh(19), typen: ['default'], angegeben: {} });
  ist('Tasse: keine Pflichtoptionen', [tasse.optionen, tasse.befunde], [[], []]);
}
ist('Optionen des Produkts unbekannt (Variante nicht lesbar), aber Stickerei verlangt: Befund', arten(optionenPruefen({ produkt: null, typen: ['embroidery_chest_left'], angegeben: {} }).befunde), ['optionen']);
ist('Optionen des Produkts unbekannt, nichts verlangt: kein Befund', optionenPruefen({ produkt: null, typen: ['default'], angegeben: {} }).befunde, []);
ist('Optionen des Produkts unbekannt, aber Kunde nennt Optionen: Befund', arten(optionenPruefen({ produkt: null, typen: ['default'], angegeben: { x: '1' } }).befunde), ['optionen']);
ist('technikPruefen: eine Familie → nichts; Stickerei + Direktdruck → Befund; DTF + Direktdruck → Befund', [technikPruefen(['default', 'back']).length, technikPruefen(['embroidery_chest_left', 'default']).length, technikPruefen(['front_dtf', 'back']).length, technikPruefen([]).length, technikPruefen(['front_dtf', 'back_dtf']).length], [0, 1, 1, 0, 0]);
ist('technikPruefen: Text nennt beide Techniken', /EMBROIDERY und STANDARD/.test(technikPruefen(['embroidery_chest_left', 'default'])[0].text), true);

// ═══════════════════════════════════════ Konflikte (echte conflicting_placements des T-Shirts)
{
  const K = KAT[71].templates.conflicting_placements, P = produktInfoAusAntwort({ product: KAT[71].produkt });
  ist('Konflikt: front + back verträglich', konfliktePruefen({ typen: ['default', 'back'], produkt: P, konflikte: K }), []);
  ist('Konflikt: front (als «default») + front_large schliessen sich aus', arten(konfliktePruefen({ typen: ['default', 'front_large'], produkt: P, konflikte: K })), ['konflikt']);
  ist('Konflikt: Reihenfolge egal', arten(konfliktePruefen({ typen: ['front_large', 'default'], produkt: P, konflikte: K })), ['konflikt']);
  ist('Konflikt: front + front_dtf', arten(konfliktePruefen({ typen: ['front', 'front_dtf'], produkt: P, konflikte: K })), ['konflikt']);
  ist('Konflikt: back + label_outside', arten(konfliktePruefen({ typen: ['back', 'label_outside'], produkt: P, konflikte: K })), ['konflikt']);
  ist('Konflikt: sleeve_left + embroidery_wrist_left', arten(konfliktePruefen({ typen: ['sleeve_left', 'embroidery_wrist_left'], produkt: P, konflikte: K })), ['konflikt']);
  ist('Konflikt: Vorder- und beide Ärmel verträglich', konfliktePruefen({ typen: ['default', 'sleeve_left', 'sleeve_right'], produkt: P, konflikte: K }), []);
  ist('Konflikt: einseitig eingetragene Konflikte gelten in beide Richtungen', arten(konfliktePruefen({ typen: ['b', 'a'], konflikte: [{ placement: 'a', conflicts: ['b'] }] })), ['konflikt']);
  ist('Konflikt: Text nennt beide Platzierungen mit ihren Namen (front, nicht default)', /«front» und «front_large»/.test(konfliktePruefen({ typen: ['default', 'front_large'], produkt: P, konflikte: K })[0].text), true);
  ist('Konfliktliste nicht lesbar, mehrere Platzierungen: Befund', arten(konfliktePruefen({ typen: ['default', 'back'], produkt: P, konflikte: null })), ['konflikt']);
  ist('Konfliktliste nicht lesbar, nur eine Platzierung: nichts zu prüfen', konfliktePruefen({ typen: ['default'], produkt: P, konflikte: null }), []);
  ist('Konfliktliste leer: nichts', konfliktePruefen({ typen: ['a', 'b'], konflikte: [] }), []);
  ist('Konfliktliste mit Müll wird übergangen', konfliktePruefen({ typen: ['a', 'b'], konflikte: [null, { placement: 5 }, { placement: 'a' }, { placement: 'a', conflicts: 'b' }] }), []);
  ist('dieselbe Platzierung zweimal ist KEIN Konflikt (das meldet die Platzierung als «doppelt»)', konfliktePruefen({ typen: ['front', 'front'], konflikte: [{ placement: 'front', conflicts: ['front'] }] }), []);
}

// ═══════════════════════════════════════ Dateimasse (PNG/JPEG-Kopfzeile)
const png = (w, h) => { const b = Buffer.alloc(40); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b); b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'latin1'); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); b[24] = 8; b[25] = 6; return b; };
const jpg = (w, h, davor = 0) => { const a = [0xff, 0xd8]; for (let i = 0; i < davor; i++) a.push(0xff, 0xe1, 0x00, 0x06, 1, 2, 3, 4); a.push(0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9); return Buffer.from(a); };
ist('PNG 1800×2400', dateiMasse(png(1800, 2400)), { format: 'png', breite: 1800, hoehe: 2400 });
ist('PNG gross (über 16 Bit): 9933×7016', dateiMasse(png(9933, 7016)), { format: 'png', breite: 9933, hoehe: 7016 });
ist('PNG mit Breite über 2^24 (Vorzeichen-Falle)', dateiMasse(png(20000000, 3)).breite, 20000000);
ist('PNG als Uint8Array', dateiMasse(new Uint8Array(png(10, 20))), { format: 'png', breite: 10, hoehe: 20 });
ist('JPEG 1200×800', dateiMasse(jpg(1200, 800)), { format: 'jpeg', breite: 1200, hoehe: 800 });
ist('JPEG mit vorgeschalteten EXIF-Blöcken', dateiMasse(jpg(3000, 2000, 5)), { format: 'jpeg', breite: 3000, hoehe: 2000 });
for (const [n, b] of [['leer', Buffer.alloc(0)], ['null', null], ['Text', Buffer.from('<html>404</html>')], ['PNG ohne IHDR', (() => { const x = png(5, 5); x.write('IDAT', 12, 'latin1'); return x; })()], ['PNG abgeschnitten', png(5, 5).subarray(0, 20)],
  ['PNG Breite 0', png(0, 10)], ['GIF', Buffer.from('GIF89a' + '\0'.repeat(30))], ['JPEG ohne SOF', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xd9, 0, 0, 0, 0, 0])], ['JPEG Breite 0', jpg(0, 100)], ['WebP', Buffer.from('RIFF\0\0\0\0WEBPVP8 ' + '\0'.repeat(30))]]) ist(`Dateimasse: ${n} → null`, dateiMasse(b), null);

// ═══════════════════════════════════════ Druckdatei des Katalogs und Auflösung
{
  const pf = (pid) => KAT[pid].printfiles;
  ist('Druckdatei T-Shirt 4025 vorne (Platzierungsname «front»)', druckdateiFuer({ printfiles: pf(71), vid: 4025, typ: 'front' }), { breite: 1800, hoehe: 2400, dpi: 150, fillMode: 'fit' });
  ist('Druckdatei T-Shirt: Datei «default» wird über den Alias zu «front»', druckdateiFuer({ printfiles: pf(71), vid: 4025, typ: 'default', produkt: produktInfoAusAntwort({ product: KAT[71].produkt }) }), { breite: 1800, hoehe: 2400, dpi: 150, fillMode: 'fit' });
  ist('Druckdatei T-Shirt «default» OHNE Alias-Wissen → null (die Katalog-Schlüssel heissen front, nicht default)', druckdateiFuer({ printfiles: pf(71), vid: 4025, typ: 'default' }), null);
  ist('Druckdatei T-Shirt Ärmel 600×525', druckdateiFuer({ printfiles: pf(71), vid: 4025, typ: 'sleeve_left' }), { breite: 600, hoehe: 525, dpi: 150, fillMode: 'fit' });
  ist('Druckdatei T-Shirt «front_large» 2250×2700', druckdateiFuer({ printfiles: pf(71), vid: 4025, typ: 'front_large' }), { breite: 2250, hoehe: 2700, dpi: 150, fillMode: 'fit' });
  ist('Druckdatei Tasse 11 oz (Variante 1320)', druckdateiFuer({ printfiles: pf(19), vid: 1320, typ: 'default' }), { breite: 2700, hoehe: 1050, dpi: 300, fillMode: 'fit' });
  ist('Druckdatei Poster (cover)', druckdateiFuer({ printfiles: pf(268), vid: 19515, typ: 'default' }).fillMode, 'cover');
  ist('Druckdatei: Variante unbekannt → null', druckdateiFuer({ printfiles: pf(71), vid: 999999, typ: 'front' }), null);
  ist('Druckdatei: Platzierung unbekannt → null', druckdateiFuer({ printfiles: pf(71), vid: 4025, typ: 'hood' }), null);
  ist('Druckdatei: Antwort ohne Druckdatei-Liste → null', [druckdateiFuer({ printfiles: {}, vid: 1, typ: 'a' }), druckdateiFuer({ printfiles: null, vid: 1, typ: 'a' }), druckdateiFuer()], [null, null, null]);
  ist('Druckdatei: echte API-Form variant_printfiles (nicht verdichtet)', druckdateiFuer({ printfiles: { printfiles: [{ printfile_id: 7, width: 100, height: 200, dpi: 72, fill_mode: 'fit' }], variant_printfiles: [{ variant_id: 5, placements: { default: 7 } }] }, vid: 5, typ: 'default' }), { breite: 100, hoehe: 200, dpi: 72, fillMode: 'fit' });
  ist('Druckdatei: Nullmasse im Katalog → null', druckdateiFuer({ printfiles: { printfiles: [{ printfile_id: 7, width: 0, height: 200, dpi: 72 }], variant_printfiles: [{ variant_id: 5, placements: { default: 7 } }] }, vid: 5, typ: 'default' }), null);
}
{
  const fit = { breite: 1800, hoehe: 2400, dpi: 150, fillMode: 'fit' }, cover = { ...fit, fillMode: 'cover' };
  const near = (n, a, b) => wahr(n + ` (${a.toFixed(3)} ≈ ${b})`, Math.abs(a - b) < 1e-6);
  near('dpi: Datei genau so gross wie die Druckdatei → 150', wirklicheDpi({ breite: 1800, hoehe: 2400 }, fit), 150);
  near('dpi: halbe Grösse → 75', wirklicheDpi({ breite: 900, hoehe: 1200 }, fit), 75);
  near('dpi fit: breite Datei (1800×1200) wird eingepasst → 150, nicht 75', wirklicheDpi({ breite: 1800, hoehe: 1200 }, fit), 150);
  near('dpi cover: breite Datei (1800×1200) füllt die Fläche → 75', wirklicheDpi({ breite: 1800, hoehe: 1200 }, cover), 75);
  near('dpi: v5-Datei 1200×1440 auf dem T-Shirt → 100', wirklicheDpi({ breite: 1200, hoehe: 1440 }, fit), 100);
  near('dpi: Tasse mit v5-Quadrat 1200×1200 auf 2700×1050@300 (fit) → 342.857', wirklicheDpi({ breite: 1200, hoehe: 1200 }, { breite: 2700, hoehe: 1050, dpi: 300, fillMode: 'fit' }), 342.857142857);
  near('dpi: Poster (cover) mit v5-Quadrat 1200×1200 auf 3544×2480@300 → 101.6', wirklicheDpi({ breite: 1200, hoehe: 1200 }, { breite: 3544, hoehe: 2480, dpi: 300, fillMode: 'cover' }), 101.5801354);
  const r = (m, df, min) => aufloesungPruefen({ masse: m, druckdatei: df, minDpi: min });
  ist('Auflösung: genau an der Grenze (75 bei Mindest 75) → ok', r({ breite: 900, hoehe: 1200 }, fit, 75).ok, true);
  ist('Auflösung: knapp darunter (899×1199) → zu klein', r({ breite: 899, hoehe: 1199 }, fit, 75).ok, false);
  ist('Auflösung: Text nennt Pixel, dpi und Mindestwert', /900×1200 px ergeben auf dem Produkt etwa 75 dpi \(Mindestens 75 dpi/.test(r({ breite: 900, hoehe: 1200 }, fit, 75).text), true);
  ist('Auflösung: Mindest-dpi fehlt → Vorgabe 72', [MIN_DPI_VORGABE, r({ breite: 900, hoehe: 1200 }, fit, undefined).ok, r({ breite: 850, hoehe: 1133 }, fit, null).ok], [72, true, false]);
  ist('Auflösung: Mindest-dpi unsinnig (0, Text, negativ) → Vorgabe', [r({ breite: 100, hoehe: 100 }, fit, 0).ok, r({ breite: 100, hoehe: 100 }, fit, 'x').ok, r({ breite: 100, hoehe: 100 }, fit, -5).ok], [false, false, false]);
  ist('Auflösung: Strick mit Mindest 0.5 (echter Katalogwert) → fast alles ok', r({ breite: 10, hoehe: 10 }, { breite: 400, hoehe: 622, dpi: 1, fillMode: 'cover' }, 0.5).ok, false);
}

// ═══════════════════════════════════════ Kosten-Wächter
{
  const costs = (total, extra = {}) => ({ currency: 'USD', subtotal: '7.75', discount: '0.00', shipping: '10.49', tax: '1.47', vat: '0.00', total: String(total), ...extra });
  ist('Regel stimmt mit der Preisformel überein (Kurs 0.90, MWST 8.1 %, Gebühr 3.4 % + 0.30)', KOSTEN_REGEL, { kurs: 0.90, mwst: 0.081, gebuehrProzent: 0.034, gebuehrFix: 0.30 });
  const pfad = fileURLToPath(new URL('../../dropship/selbst-gestalten-fertig-0511/werkzeuge/preisformel.mjs', import.meta.url));
  if (existsSync(pfad)) { const { REGEL } = await import(pfad); ist('…und mit dropship/selbst-gestalten-fertig-0511/werkzeuge/preisformel.mjs (REGEL)', [REGEL.kurs, REGEL.mwst, REGEL.gebuehrProzent, REGEL.gebuehrFix], [KOSTEN_REGEL.kurs, KOSTEN_REGEL.mwst, KOSTEN_REGEL.gebuehrProzent, KOSTEN_REGEL.gebuehrFix]); }
  // echter Auftrag 183834327: total 19.71 USD inkl. tax 1.47 → ohne Steuer 18.24 USD = 16.42 CHF
  const k1 = kostenPruefen({ costs: costs('19.71'), erloesChf: 49.9 });
  ist('Kosten: echte Zahlen (19.71 USD inkl. 1.47 Steuer) gegen 49.90 CHF Erlös → ok', [k1.ok, k1.kostenChf, k1.nettoChf], [true, 16.42, 49.9 / 1.081 - (49.9 * 0.034 + 0.3) - 16.42 > 0 ? Math.round((49.9 / 1.081 - (49.9 * 0.034 + 0.3) - 16.42) * 100) / 100 : null]);
  const k2 = kostenPruefen({ costs: costs('19.71'), erloesChf: 17.9 });
  ist('Kosten: dieselben Kosten gegen 17.90 CHF Erlös → Verlust (Befund «kosten»), Text nennt Kosten, Erlös und Netto', [k2.ok, k2.art, /Verlust/.test(k2.text), /16\.42 CHF/.test(k2.text), /17\.90 CHF/.test(k2.text), k2.nettoChf < 0], [false, 'kosten', true, true, true, true]);
  ist('Kosten: genau 0 Netto → kein Verlust (Grenze ist «unter nettoMin»)', (() => { const e = (16.42 + 0.3) / (1 / 1.081 - 0.034); const x = kostenPruefen({ costs: costs('19.71'), erloesChf: e }); return x.nettoChf >= 0 ? x.ok : 'netto ' + x.nettoChf; })(), true);
  ist('Kosten: nettoMin 4 (Ziel der Preisformel) schlägt früher an', [kostenPruefen({ costs: costs('19.71'), erloesChf: 21, nettoMin: 4 }).ok, kostenPruefen({ costs: costs('19.71'), erloesChf: 21, nettoMin: 0 }).ok], [false, true]);
  ist('Kosten: ohne Printfuls Steuer gerechnet (tax und vat abgezogen)', kostenPruefen({ costs: costs('20.00', { tax: '1.00', vat: '1.00' }), erloesChf: 60 }).kostenChf, 16.2);
  for (const [n, c, e] of [['keine Kosten', null, 50], ['Kosten ohne total', { currency: 'USD' }, 50], ['total leer', costs(''), 50], ['total Text', costs('abc'), 50], ['Kosten in Berechnung (sonst plausible Summe 30 USD)', costs('30', { calculation_status: 'calculating' }), 50], ['Berechnung fehlgeschlagen (sonst plausible Summe 30 USD)', costs('30', { calculation_status: 'failed' }), 50],
    ['Euro statt Dollar', costs('19.71', { currency: 'EUR' }), 50], ['Erlös unbekannt', costs('19.71'), null], ['Erlös 0', costs('19.71'), 0], ['Erlös negativ', costs('19.71'), -5], ['Erlös Text', costs('19.71'), 'x']]) {
    const x = kostenPruefen({ costs: c, erloesChf: e });
    ist(`Kosten unbekannt: ${n} → KEIN grünes Licht (Befund «kosten-unbekannt»)`, [x.ok, x.art, x.nettoChf], [false, 'kosten-unbekannt', null]);
  }
  ist('Kosten: calculation_status «done» wird akzeptiert', kostenPruefen({ costs: costs('19.71', { calculation_status: 'done' }), erloesChf: 60 }).ok, true);
  ist('Kosten: Zahlen als Zahl statt Text', kostenPruefen({ costs: { currency: 'USD', total: 19.71, tax: 1.47 }, erloesChf: 60 }).ok, true);
}

// ═══════════════════════════════════════ Status des Auftrags und seiner Dateien
for (const [s, art, befund] of [['pending', 'bestaetigt', null], ['inprocess', 'bestaetigt', null], ['partial', 'bestaetigt', null], ['fulfilled', 'bestaetigt', null], ['inreview', 'bestaetigt', null], ['PENDING', 'bestaetigt', null],
  ['draft', 'wartet', 'nicht-bestaetigt'], ['failed', 'problem', 'zahlung-fehlgeschlagen'], ['onhold', 'problem', 'angehalten'], ['canceled', 'problem', 'storniert'], ['archived', 'problem', 'status-unbekannt'], ['', 'problem', 'status-unbekannt'], [undefined, 'problem', 'status-unbekannt'], ['irgendwas', 'problem', 'status-unbekannt']]) {
  const x = statusBewerten({ status: s });
  ist(`Status «${s}» → ${art}${befund ? ' / ' + befund : ''}`, [x.art, x.befund], [art, befund]);
}
ist('Status failed nennt den Grund der Karte (Printful: error)', /Invalid Card Number/.test(statusBewerten({ status: 'failed', error: 'Invalid Card Number' }).text), true);
ist('Status nicht bekannt: nichts übergeben', statusBewerten().art, 'problem');
ist('BESTAETIGT: genau diese fünf', [...BESTAETIGT].sort(), ['fulfilled', 'inprocess', 'inreview', 'partial', 'pending']);
{
  const o = (...fs) => ({ items: [{ files: fs }] });
  ist('Dateien: alle ok → ok', dateienStatus(o({ type: 'default', status: 'ok' }, { type: 'preview', status: 'ok' })), { art: 'ok', texte: [] });
  ist('Dateien: eine wartet → wartet', dateienStatus(o({ type: 'default', status: 'waiting' })).art, 'wartet');
  ist('Dateien: Vorschau zählt nicht (auch wenn sie wartet/scheitert)', dateienStatus(o({ type: 'default', status: 'ok' }, { type: 'preview', status: 'failed' }, { type: 'mockup', status: 'waiting' })).art, 'ok');
  const f = dateienStatus(o({ type: 'default', status: 'failed', warning: 'Image resolution too low' }));
  ist('Dateien: failed → Problem mit Warnung', [f.art, /Image resolution too low/.test(f.texte[0])], ['problem', true]);
  ist('Dateien: Status ok, aber Warnung → Problem (Printful warnt)', dateienStatus(o({ type: 'back', status: 'ok', warning: 'Low DPI' })).art, 'problem');
  ist('Dateien: Problem schlägt Warten', dateienStatus(o({ type: 'a', status: 'waiting' }, { type: 'b', status: 'failed' })).art, 'problem');
  ist('Dateien: unbekannter Status → Problem', dateienStatus(o({ type: 'a', status: 'komisch' })).art, 'problem');
  ist('Dateien: leerer Status → Problem', dateienStatus(o({ type: 'a' })).art, 'problem');
  ist('Dateien (Fund 8): ein Auftrag ohne eine einzige Datei (keine Artikel, null, Artikel ohne files, nur Vorschau) ist NIE «ok»: er wartet (leer)', [dateienStatus({}), dateienStatus(null), dateienStatus({ items: [{}] }), dateienStatus(o({ type: 'preview', status: 'ok' }))].map((x) => [x.art, x.leer]), [['wartet', true], ['wartet', true], ['wartet', true], ['wartet', true]]);
  ist('Dateien (Fund 8): mit einer echten Datei ist «leer» nicht gesetzt', [dateienStatus(o({ type: 'front', status: 'ok' })).leer, dateienStatus(o({ type: 'front', status: 'waiting' })).leer], [undefined, false]);
}

// ═══════════════════════════════════════ Kennung, Empfänger, Tags
for (const [n, soll] of [['#1034', 'LX1034'], ['1034', 'LX1034'], ['#SW-1034', 'LXSW1034'], ['', null], [null, null], ['#', null], ['# ä ö', null], ['#' + '9'.repeat(40), 'LX' + '9'.repeat(30)]]) ist(`externalId(${JSON.stringify(n)})`, externalId(n), soll);
ist('externalId: höchstens 32 Zeichen', externalId('#' + '9'.repeat(100)).length <= 32, true);
{
  const o = { email: 'a@b.ch', shippingAddress: { name: 'Max Muster', address1: 'Weg 1', address2: '', city: 'Basel', provinceCode: 'BS', countryCodeV2: 'CH', zip: '4000', phone: '+41' } };
  const e = empfaengerAus(o);
  ist('Empfänger vollständig', [e.befunde, e.recipient.name, e.recipient.country_code, e.recipient.zip, e.recipient.email], [[], 'Max Muster', 'CH', '4000', 'a@b.ch']);
  ist('Empfänger: Name aus Vor- und Nachname', empfaengerAus({ shippingAddress: { firstName: 'Eva', lastName: 'Beispiel', address1: 'x', city: 'y', zip: '1', countryCodeV2: 'CH' } }).recipient.name, 'Eva Beispiel');
  ist('Empfänger ohne Adresse → harter Befund «adresse»', [empfaengerAus({}).befunde[0]?.art, empfaengerAus({}).befunde[0]?.hart, empfaengerAus({}).recipient], ['adresse', true, null]);
  const l = empfaengerAus({ shippingAddress: { name: 'X', address1: '', city: 'Basel', zip: '', countryCodeV2: '' } });
  ist('Empfänger unvollständig → harter Befund nennt Strasse, PLZ, Land', [l.befunde[0]?.hart, /Strasse, PLZ, Land/.test(l.befunde[0]?.text)], [true, true]);
  {                                                                                                         // jede Pflichtangabe einzeln: fehlt genau sie, nennt der harte Befund genau sie (und nur sie)
    const voll = { name: 'Eva Beispiel', address1: 'Gasse 1', city: 'Basel', zip: '4051', countryCodeV2: 'CH' };
    for (const [feld, wort] of [['name', 'Name'], ['address1', 'Strasse'], ['city', 'Ort'], ['zip', 'PLZ'], ['countryCodeV2', 'Land']]) {
      const x = empfaengerAus({ shippingAddress: { ...voll, [feld]: '  ' } });
      ist(`Empfänger Fund 13: fehlt nur «${wort}», ist der Befund hart und nennt genau «${wort}»`, [x.befunde.length, x.befunde[0]?.hart, x.befunde[0]?.text], [1, true, `Lieferadresse unvollständig: ${wort} fehlt`]);
    }
    ist('Empfänger Fund 13: eine vollständige Adresse (Name aus Vor- und Nachname) hat keinen Befund', [empfaengerAus({ shippingAddress: { ...voll, name: undefined, firstName: 'Eva', lastName: 'Beispiel' } }).befunde.length, empfaengerAus({ shippingAddress: voll }).befunde.length], [0, 0]);
  }
  ist('Empfänger: Land wird NICHT mehr still auf CH ergänzt (früher countryCodeV2||CH)', empfaengerAus({ shippingAddress: { name: 'X', address1: 'a', city: 'b', zip: '1' } }).befunde.length, 1);
}
ist('befundTag: Slug', [befundTag('optionen'), befundTag('Kontrolle Fail'), befundTag('zahlung-fehlgeschlagen'), REVIEW_TAG], ['printful-review-optionen', 'printful-review-kontrolle-fail', 'printful-review-zahlung-fehlgeschlagen', 'printful-review']);
{
  const b = (art, text = art) => ({ art, text, hart: false });
  const p1 = befundPlan({ tags: [], befunde: [b('optionen'), b('aufloesung')] });
  ist('Befundplan: neue Bestellung → Tags review + je Art, Alarm mit beiden', [p1.hinzu, p1.alarm, p1.neu.map((x) => x.art)], [['printful-review', 'printful-review-optionen', 'printful-review-aufloesung'], true, ['optionen', 'aufloesung']]);
  const p2 = befundPlan({ tags: ['printful-review', 'printful-review-optionen'], befunde: [b('optionen')] });
  ist('Befundplan: dieselbe Art zum zweiten Mal → keine Tags, KEIN Alarm (genau einmal)', [p2.hinzu, p2.alarm, p2.neu], [[], false, []]);
  const p3 = befundPlan({ tags: ['printful-review', 'printful-review-optionen'], befunde: [b('optionen'), b('konflikt')] });
  ist('Befundplan: eine neue Art kommt dazu → nur diese gemeldet', [p3.hinzu, p3.neu.map((x) => x.art)], [['printful-review-konflikt'], ['konflikt']]);
  const p4 = befundPlan({ tags: [], befunde: [b('optionen', 'a'), b('optionen', 'b')] });
  ist('Befundplan: dieselbe Art mehrfach in einer Liste → EIN Tag, ein Alarm mit beiden Texten (zwei Seiten/Positionen können betroffen sein)', [p4.hinzu, p4.neu.map((x) => x.text)], [['printful-review', 'printful-review-optionen'], ['a', 'b']]);
  ist('Befundplan: keine Befunde → nichts', befundPlan({ tags: ['x'], befunde: [] }), { hinzu: [], neu: [], alarm: false });
  ist('Befundplan: nichts übergeben', befundPlan().alarm, false);
  ist('Befundplan: Tags der Art mit Grossbuchstaben im Befund werden gleich geschlüsselt', befundPlan({ tags: ['printful-review-optionen'], befunde: [b('Optionen')] }).alarm, false);
}
ist('Versuche: zählt das höchste printful-versuch-N', [versuche([]), versuche(['printful-versuch-1']), versuche(['x', 'printful-versuch-2', 'printful-versuch-1']), versuche(['printful-versuch-x']), versuche()], [0, 1, 2, 0, 0]);
ist('Versuchs-Tag und Grenze', [versuchTag(2), MAX_VERSUCHE], ['printful-versuch-2', 3]);
ist('esc maskiert HTML aus Fremdtext', esc('<b>&"x"</b>'), '&lt;b&gt;&amp;"x"&lt;/b&gt;');
ist('esc: null → leer', esc(null), '');

// ═══════════════════════════════════════ Kontrolle (KI)
for (const [t, soll] of [['PASS - sieht gut aus', 'pass'], ['pass', 'pass'], ['  Pass: ok', 'pass'], ['**PASS** - ok', 'pass'], ['FAIL - leer', 'fail'], ['fail', 'fail'], ['"FAIL" - unscharf', 'fail'], ['> PASS', 'pass'],
  ['', null], [null, null], ['Das Bild ist okay, PASS', null], ['passend', null], ['PASSED', null], ['failure', null], ['Sorry, I cannot', null], ['(leere Antwort)', null], ['{"error":{"code":402}}', null]]) ist(`Kontrolle lesen: ${JSON.stringify(t)}`, kontrolleLesen(t), soll);
ist('Kleine Kopie: Cloudinary-Adresse bekommt c_limit,w_1400', kleineKopieUrl('https://res.cloudinary.com/dwyi6kkrl/image/upload/v17/abc.png'), 'https://res.cloudinary.com/dwyi6kkrl/image/upload/c_limit,w_1400/v17/abc.png');
ist('Kleine Kopie: andere Adressen unverändert', [kleineKopieUrl('https://cdn.shopify.com/x.png'), kleineKopieUrl(''), kleineKopieUrl(null)], ['https://cdn.shopify.com/x.png', '', '']);
ist('Kleine Kopie: eigene Breite', kleineKopieUrl('https://res.cloudinary.com/c/image/upload/a.png', 800), 'https://res.cloudinary.com/c/image/upload/c_limit,w_800/a.png');

// ═══════════════════════════════════════ planeBestellung mit gefälschtem Zugriff
const prodVon = (pid) => ({ info: produktInfoAusAntwort({ product: KAT[pid].produkt }), roh: { product: KAT[pid].produkt }, art: 'ok', status: 200 });
const NICHT_LESBAR = { info: null, roh: null, art: 'nicht-lesbar', status: 503 };
const mkIo = (o = {}) => {
  const log = { produkt: [], druck: [], kopf: [], kontrolle: [] };
  return { log, produkt: async (vid) => { log.produkt.push(vid); return o.produkt ? o.produkt(vid) : prodVon(71); },
    druckdaten: async (pid) => { log.druck.push(pid); return o.druckdaten ? o.druckdaten(pid) : { art: 'ok', printfiles: KAT[pid].printfiles, templates: KAT[pid].templates }; },
    kopf: async (url) => { log.kopf.push(url); return o.kopf ? o.kopf(url) : { status: 200, bytes: png(1800, 2400) }; },
    kontrolle: async (url) => { log.kontrolle.push(url); return o.kontrolle ? o.kontrolle(url) : { art: 'ok', text: 'PASS' }; } };
};
const karte6 = (pl, extra = {}) => A('_pod_karte', JSON.stringify({ v: 6, s: 1, pl, ...extra }));
const zeile = (o = {}) => ({ id: 'gid://shopify/LineItem/9001', quantity: 1, sku: '5599797_4025', title: 'T-Shirt selbst gestalten', discountedTotalSet: { shopMoney: { amount: '29.90', currencyCode: 'CHF' } },
  product: { productType: 'T-Shirts', tags: ['wunschdesign'], metafield: null }, variant: { sku: '5599797_4025' }, customAttributes: [A('🖼️ Druckdatei (front)', U('v')), karte6(['front'], { dt: { front: 'default' } })], ...o });
/** Fulfillment-Orders der Bestellung (Form der Admin-Abfrage): ein Händler-Standort («Shop location»), alle Positionen darin; `ort` und `status` änderbar. */
const FO_HAENDLER = { id: 'gid://shopify/Location/1', name: 'Shop location', isFulfillmentService: false };
const FO_DIENST = { id: 'gid://shopify/Location/2', name: 'Printful', isFulfillmentService: true };
const fulfillmentOrders = (ids, ort = FO_HAENDLER, status = 'OPEN') => ({ edges: [{ node: { id: 'gid://shopify/FulfillmentOrder/1', status, assignedLocation: { location: ort }, lineItems: { edges: ids.map((id) => ({ node: { lineItem: { id } } })) } } }] });
const bestellung = (zeilen, extra = {}) => ({ id: 'gid://shopify/Order/1', name: '#T1', lineItems: { pageInfo: { hasNextPage: false }, edges: zeilen.map((node) => ({ node })) }, fulfillmentOrders: fulfillmentOrders(zeilen.map((z) => z.id)), ...extra });
/** Paket «alles bezahlt»: alle Platzierungen des Printful-Produkts sind im Shop-Preis gedeckt. Die älteren Prüfungen betreffen nicht den Preis; `plane` nimmt es, wenn kein cfg übergeben wird. Die Prüfungen zum Aufpreis übergeben ihr cfg ausdrücklich (`{}` = Standard «nur Vorderseite bezahlt»). */
const paketAlles = (z, k) => ({ bezahlt: ((k && KAT[k.produktId] && KAT[k.produktId].produkt.files) || []).flatMap((f) => [f.id, f.type]), quelle: 'Test: alles bezahlt' });
const plane = (zeilen, io = mkIo(), cfg) => planeBestellung(bestellung(zeilen), io, cfg === undefined ? { paket: paketAlles } : cfg);
{
  const io = mkIo();
  const p = await plane([zeile()], io);
  ist('Plan T-Shirt vorne (v6): ein Artikel, Typ «default» (dt), Variante 4025, Menge 1, Erlös 29.90, KEIN Befund', [p.items, p.befunde, p.erloesChf, p.pod], [[{ variant_id: 4025, quantity: 1, files: [{ type: 'default', url: U('v') }], external_id: '9001' }], [], 29.9, 1]);
  ist('…Zugriffe: eine Variantenabfrage, eine Druckdaten-Abfrage (Produkt 71), eine Kopfzeile, eine Kontrolle', [io.log.produkt, io.log.druck, io.log.kopf.length, io.log.kontrolle.length], [[4025], [71], 1, 1]);
}
{
  const p = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (back)', U('h')), A('🖼️ Druckdatei (sleeve_left)', U('a')), karte6(['front', 'back', 'sleeve_left'], { dt: { front: 'default' } })] })]);
  ist('Plan T-Shirt vorne+hinten+Ärmel: drei Dateien mit den echten Typen, kein Befund', () => [p.items[0].files.map((f) => f.type), p.befunde], [['default', 'back', 'sleeve_left'], []]);
}
{
  const p = await plane([zeile({ quantity: 3, discountedTotalSet: { shopMoney: { amount: '89.70', currencyCode: 'CHF' } } })]);
  ist('Plan: Menge 3 und Erlös der Position', [p.items[0].quantity, p.erloesChf], [3, 89.7]);
  const p2 = await plane([zeile({ quantity: 0 }), zeile({ id: 'gid://shopify/LineItem/9002', quantity: 'x' })]);
  ist('Plan: unsinnige Menge (0 ohne currentQuantity, Text) → KEIN Artikel, zwei harte Befunde «menge-unlesbar» (früher: 1 Stück geraten; Gegenleser 10.11.2026)', [p2.items.length, arten(p2.befunde), p2.befunde.map((b) => b.hart)], [0, ['menge-unlesbar', 'menge-unlesbar'], [true, true]]);
}
{ // v5-Positionen wie bisher: Vorne/Hinten über den Printful-Typ der Variante
  const p = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (Vorne)', U('v')), A('🖼️ Druckdatei (Hinten)', U('h'))] })]);
  ist('Plan v5 vorne+hinten auf T-Shirt: front/back, kein Befund', [p.items[0].files.map((f) => f.type), p.befunde], [['front', 'back'], []]);
  const t = await plane([zeile({ sku: '1_1320', variant: { sku: '1_1320' }, product: { productType: 'Tassen', tags: ['wunschdesign'] }, customAttributes: [A('🖼️ Druckdatei (Vorne)', U('v'))] })], mkIo({ produkt: () => prodVon(19) }));
  ist('Plan v5 Tasse (nur «default»): Typ default, Auflösung der Tasse geprüft, kein Befund', [t.items[0].files.map((f) => f.type), t.befunde], [['default'], []]);
}
{ // Fertig-Produkt mit Metafeld
  const p = await plane([zeile({ customAttributes: [], product: { productType: 'Poster', tags: ['printful_personalized_product'], metafield: { value: 'https://bilder.luxestyle.ch/motiv.png' } }, sku: '9_19515', variant: { sku: '9_19515' } })], mkIo({ produkt: () => prodVon(268), kopf: () => ({ status: 200, bytes: png(7000, 5000) }) }));
  ist('Plan Fertig-Produkt (Tag printful_personalized_product, KEIN Editor-Produkt): Metafeld custom.print_file als Vorderseite (jeder https-Host, es gehört dem Besitzer)', () => [p.items[0].files, p.befunde], [[{ type: 'default', url: 'https://bilder.luxestyle.ch/motiv.png' }], []]);
  // Härtung 10.11.2026 (Fund 22): ein EDITOR-Produkt (Tag wunschdesign) druckt nie das Muster aus dem Metafeld; ohne Design der Kundin gilt «keine-druckdatei»
  const edit = await plane([zeile({ customAttributes: [], product: { productType: 'Poster', tags: ['wunschdesign', 'printful_personalized_product'], metafield: { value: 'https://bilder.luxestyle.ch/motiv.png' } }, sku: '9_19515', variant: { sku: '9_19515' } })], mkIo({ produkt: () => prodVon(268), kopf: () => ({ status: 200, bytes: png(7000, 5000) }) }));
  ist('Plan Fund 22: Editor-Produkt (Tag wunschdesign) mit Metafeld und OHNE Design der Kundin → harter Befund «keine-druckdatei», kein Artikel (das Muster des Besitzers wird nie gedruckt)', [arten(edit.befunde), edit.befunde[0]?.hart, edit.items.length], [['keine-druckdatei'], true, 0]);
  ist('editorProdukt: nur das Tag wunschdesign (Grossschreibung egal) macht ein Editor-Produkt', [editorProdukt({ product: { tags: ['wunschdesign'] } }), editorProdukt({ product: { tags: ['WunschDesign'] } }), editorProdukt({ product: { tags: ['printful_personalized_product'] } }), editorProdukt({ product: null }), editorProdukt(null)], [true, true, false, false, false]);
  const m2 = await plane([zeile({ customAttributes: [], product: { productType: 'x', tags: ['printful_personalized_product'], metafield: { value: 'http://bilder.luxestyle.ch/motiv.png' } } })]);
  ist('Plan Metafeld mit http → keine Datei → harter Befund «keine-druckdatei»', arten(m2.befunde), ['keine-druckdatei']);
  const m3 = await plane([zeile({ customAttributes: [], product: { productType: 'x', tags: ['printful_personalized_product'], metafield: { value: 'kein url' } } })]);
  ist('Plan Metafeld ohne Adresse → harter Befund', [arten(m3.befunde), m3.befunde[0]?.hart], [['keine-druckdatei'], true]);
}
// harte Befunde
{
  const io = mkIo();
  const p = await plane([zeile({ sku: 'kaputt', variant: { sku: 'auch kaputt' } })], io);
  ist('SKU ohne Variante → hart «ohne-variante», kein Artikel, KEINE Netzabfrage', [arten(p.befunde), p.befunde[0]?.hart, p.items.length, io.log.produkt.length], [['ohne-variante'], true, 0, 0]);
  const k = await plane([zeile({ customAttributes: [] })], mkIo());
  ist('keine Druckdatei → hart «keine-druckdatei»', [arten(k.befunde), k.befunde[0]?.hart, k.items.length], [['keine-druckdatei'], true, 0]);
  const f = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', 'https://evil.example.com/x.png')] })], io);
  ist('Druckdatei von fremdem Host → hart «datei-adresse» + «keine-druckdatei», keine Abfrage der Adresse', [arten(f.befunde), io.log.kopf.length, io.log.kontrolle.length], [['datei-adresse', 'keine-druckdatei'], 0, 0]);
  const n = await plane([zeile({ product: { productType: 'x', tags: ['sale'] }, customAttributes: [A('🖼️ Druckdatei (front)', U('v'))] })], mkIo());
  ist('Druckdatei-Eigenschaft an einem Produkt ohne POD-Tag → hart «druckdatei-ohne-pod», nichts wird gedruckt', [arten(n.befunde), n.befunde[0]?.hart, n.items.length, n.pod], [['druckdatei-ohne-pod'], true, 0, 0]);
  const nk = await plane([zeile({ product: { tags: [] }, customAttributes: [karte6(['front'])] })], mkIo());
  ist('…auch eine bloße _pod_karte ohne Tag', arten(nk.befunde), ['druckdatei-ohne-pod']);
  const g = await plane([zeile({ product: { tags: ['sale'] }, customAttributes: [] })], mkIo());
  ist('Position ohne POD-Tag und ohne Eigenschaften (Fortura, CJ): still übergangen, kein Befund', [g.befunde, g.items, g.pod], [[], [], 0]);
  const m = await planeBestellung({ id: 'x', name: '#1', lineItems: { pageInfo: { hasNextPage: true }, edges: [{ node: zeile() }] }, fulfillmentOrders: fulfillmentOrders(['gid://shopify/LineItem/9001']) }, mkIo());
  ist('mehr als 50 Positionen (hasNextPage) → hart «positionen-viele» (weitere Editor-Positionen könnten fehlen)', [arten(m.befunde), m.befunde[0]?.hart, m.items.length], [['positionen-viele'], true, 1]);
  const d = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (front)', U('w'))] })], mkIo());
  ist('doppelte Platzierung in den Eigenschaften → hart «datei-doppelt»', [arten(d.befunde).includes('datei-doppelt'), d.befunde.find((b) => b.art === 'datei-doppelt').hart], [true, true]);
  const nf = await plane([zeile()], mkIo({ kopf: () => ({ status: 404, bytes: null }) }));
  ist('Druckdatei liefert 404 → hart «datei-nicht-erreichbar»', [arten(nf.befunde), nf.befunde[0]?.hart], [['datei-nicht-erreichbar'], true]);
  const nf2 = await plane([zeile()], mkIo({ kopf: () => ({ status: 410, bytes: null }) }));
  ist('…410 ebenso', arten(nf2.befunde), ['datei-nicht-erreichbar']);
  const ioD = mkIo();
  const dd2 = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('a')), A('🖼️ Druckdatei (front)', U('b'))] })], ioD);
  ist('Position mit hartem Befund (doppelte Platzierung): KEINE Netzabfragen mehr für sie (Variante, Katalog, Datei, KI)', [ioD.log.produkt.length, ioD.log.druck.length, ioD.log.kopf.length, ioD.log.kontrolle.length, dd2.items.length], [0, 0, 0, 0, 0]);
  const nd = await planeBestellung(null, mkIo());
  ist('Bestellung null → kein Absturz, nichts zu tun', [nd.items, nd.pod], [[], 0]);
}
// weiche Befunde
{
  const w = await plane([zeile()], mkIo({ kopf: () => ({ status: 200, bytes: png(600, 800) }) }));
  ist('Datei 600×800 auf dem T-Shirt (50 dpi < 75) → weich «aufloesung», Artikel bleibt im Plan', [arten(w.befunde), w.befunde[0]?.hart, w.items.length, /zu klein/.test(w.befunde[0]?.text), /50 dpi/.test(w.befunde[0]?.text)], [['aufloesung'], false, 1, true, true]);
  const g = await plane([zeile()], mkIo({ kopf: () => ({ status: 200, bytes: png(900, 1200) }) }));
  ist('Datei 900×1200 = genau 75 dpi → ok', g.befunde, []);
  const qdOk = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), karte6(['front'], { dt: { front: 'default' }, qd: 150 })] })]);
  ist('_pod_karte.qd stimmt mit der echten Druckdatei überein und liegt über dem Mindestwert → kein Befund', qdOk.befunde, []);
  const qdKlein = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), karte6(['front'], { dt: { front: 'default' }, qd: 50 })] })], mkIo({ kopf: () => ({ status: 200, bytes: png(600, 800) }) }));
  ist('_pod_karte.qd unter templates.min_dpi → zusätzlich zur echten Auflösungsprüfung ein weicher Befund qd-weicht-ab', [arten(qdKlein.befunde), qdKlein.befunde.every((b) => !b.hart), qdKlein.items.length], [['aufloesung', 'qd-weicht-ab'], true, 1]);
  const qdAnders = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), karte6(['front'], { dt: { front: 'default' }, qd: 116 })] })]);
  ist('_pod_karte.qd weicht von der an der echten Datei gemessenen DPI ab → weicher Befund qd-weicht-ab', [arten(qdAnders.befunde), /116/.test(qdAnders.befunde[0]?.text || '') && /150/.test(qdAnders.befunde[0]?.text || '')], [['qd-weicht-ab'], true]);
  const qdBeschoenigt = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), karte6(['front'], { dt: { front: 'default' }, qd: 150 })] })], mkIo({ kopf: () => ({ status: 200, bytes: png(600, 800) }) }));
  ist('kundenseitig beschönigtes qd gibt eine zu kleine echte Datei nie frei', [arten(qdBeschoenigt.befunde), qdBeschoenigt.befunde.every((b) => !b.hart), qdBeschoenigt.items.length], [['aufloesung', 'qd-weicht-ab'], true, 1]);
  const qdTeilmessung = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (back)', U('h')), karte6(['front', 'back'], { dt: { front: 'default' }, qd: 100 })] })], mkIo({ kopf: (url) => ({ status: 200, bytes: url === U('v') ? png(1800, 2400) : Buffer.from('<html>') }) })).catch((e) => ({ befunde: [{ art: `Ausnahme: ${(e && e.message) || e}` }] }));
  ist('qd wird bei nur teilweise messbaren Platzierungen nicht fälschlich mit dem Teilminimum verglichen', arten(qdTeilmessung.befunde), ['aufloesung']);
  const x = await plane([zeile()], mkIo({ kopf: () => ({ status: 200, bytes: Buffer.from('<html>') }) }));
  ist('Datei ohne lesbare Kopfzeile → weich «aufloesung» (nicht prüfbar, kein Freispruch)', [arten(x.befunde), /nicht lesbar/.test(x.befunde[0]?.text)], [['aufloesung'], true]);
  const x2 = await plane([zeile()], mkIo({ kopf: () => ({ status: 503, bytes: null }) }));
  ist('Datei antwortet 503 → weich «aufloesung» mit HTTP-Status', [arten(x2.befunde), /HTTP 503/.test(x2.befunde[0]?.text)], [['aufloesung'], true]);
  const x3 = await plane([zeile()], mkIo({ kopf: () => ({ status: 0, bytes: null }) }));
  ist('Netzfehler beim Lesen der Datei → weich', arten(x3.befunde), ['aufloesung']);
  const jp = await plane([zeile()], mkIo({ kopf: () => ({ status: 200, bytes: jpg(1800, 2400) }) }));
  ist('JPEG-Datei wird ebenso gemessen', jp.befunde, []);
  const k1 = await plane([zeile()], mkIo({ kontrolle: () => ({ art: 'fail', text: 'FAIL - leer' }) }));
  ist('Kontrolle FAIL → weich «kontrolle-fail»', [arten(k1.befunde), k1.befunde[0]?.hart, /FAIL - leer/.test(k1.befunde[0]?.text)], [['kontrolle-fail'], false, true]);
  const k2 = await plane([zeile()], mkIo({ kontrolle: () => ({ art: 'technisch', text: 'HTTP 402' }) }));
  ist('Kontrolle technisch gescheitert → weich «kontrolle-technisch» (gibt NICHT frei)', [arten(k2.befunde), /HTTP 402/.test(k2.befunde[0]?.text)], [['kontrolle-technisch'], true]);
  const k3 = await plane([zeile()], mkIo({ kontrolle: () => ({ art: 'fehlt', text: 'keine Prüfung eingerichtet' }) }));
  ist('Kontrolle nicht eingerichtet → weich «kontrolle-fehlt»', arten(k3.befunde), ['kontrolle-fehlt']);
  const pl = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (hood)', U('v'))] })], mkIo());
  ist('unbekannte Platzierung «hood» → weich «platzierung», Typ bleibt «hood»', () => [arten(pl.befunde).includes('platzierung'), pl.items[0].files[0].type], [true, 'hood']);
  const dp = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (default)', U('v')), A('🖼️ Druckdatei (front)', U('w'))] })], mkIo());
  ist('«default» und «front» zugleich → weich «platzierung» (dieselbe Platzierung)', [arten(dp.befunde), /zwei Druckdateien für dieselbe Platzierung/.test(dp.befunde[0]?.text)], [['platzierung'], true]);
  const nl = await plane([zeile()], mkIo({ produkt: () => NICHT_LESBAR }));
  ist('Printful-Variante nicht lesbar → weich: Platzierung nicht gesichert, Druckdaten fehlen (kein Produkt), Pixelgrösse ohne Katalog nicht prüfbar', [arten(nl.befunde).includes('platzierung'), arten(nl.befunde).includes('druckdaten'), arten(nl.befunde).includes('aufloesung'), nl.befunde.every((b) => !b.hart)], [true, true, true, true]);
  const dd = await plane([zeile()], mkIo({ druckdaten: () => ({ art: 'fehler', text: 'HTTP 429' }) }));
  ist('Druckdaten nicht lesbar (429) → weich «druckdaten» (Text nennt HTTP 429), «aufloesung» (keine Katalog-Grösse); Konflikte nicht prüfbar nur bei mehreren Platzierungen', [arten(dd.befunde), /HTTP 429/.test(dd.befunde[0]?.text)], [['druckdaten', 'aufloesung'], true]);
  const ddm = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (back)', U('h'))] })], mkIo({ druckdaten: () => ({ art: 'fehler', text: 'x' }) }));
  ist('…bei zwei Platzierungen kommt «konflikt» (nicht prüfbar) dazu', arten(ddm.befunde).includes('konflikt'), true);
  const kf = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (front_large)', U('w'))] })], mkIo({ kopf: () => ({ status: 200, bytes: png(2250, 2700) }) }));
  ist('front + front_large → weich «konflikt»', [arten(kf.befunde), kf.befunde[0]?.hart], [['konflikt'], false]);
  const st = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (embroidery_chest_left)', U('s')), karte6(['embroidery_chest_left'])] })], mkIo({ kopf: () => ({ status: 200, bytes: png(1650, 600) }) }));
  ist('Stickerei ohne Garnfarben → weich «optionen»', arten(st.befunde).includes('optionen'), true);
  const st2 = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (embroidery_chest_left)', U('s')), A('⚙️ Option (thread_colors_chest_left)', '#FFFFFF,#000000'), karte6(['embroidery_chest_left'])] })], mkIo({ kopf: () => ({ status: 200, bytes: png(600, 600) }) }));
  ist('Stickerei mit Garnfarben: Option geht als items[].options mit, kein Befund (der Katalog führt für die Stickerei des T-Shirts keine Druckdatei-Grösse: die Auflösung entfällt dort)', [st2.items[0].options, st2.items[0].files.map((f) => f.type), arten(st2.befunde)], [[{ id: 'thread_colors_chest_left', value: ['#FFFFFF', '#000000'] }], ['embroidery_chest_left'], []]);
  const sw = await plane([zeile({ sku: '1_4025', variant: { sku: '1_999' } })], mkIo());
  ist('SKU Position ≠ SKU Variante → weich «sku-widerspruch», die der Position gilt', [arten(sw.befunde), sw.items[0].variant_id], [['sku-widerspruch'], 4025]);
  const tm = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (embroidery_chest_left)', U('s')), A('🖼️ Druckdatei (back)', U('h')), A('⚙️ Option (thread_colors_chest_left)', '#000000')] })], mkIo({ kopf: () => ({ status: 200, bytes: png(1800, 2400) }) }));
  ist('Stickerei + Direktdruck → weich «technik-gemischt»', arten(tm.befunde).includes('technik-gemischt'), true);
}
// Erlös
{
  const e = await plane([zeile(), zeile({ id: 'gid://shopify/LineItem/9002', discountedTotalSet: { shopMoney: { amount: '10.10', currencyCode: 'CHF' } } })]);
  ist('Erlös: Summe der POD-Positionen', e.erloesChf, 40);
  const e2 = await plane([zeile({ discountedTotalSet: null })]);
  ist('Erlös unbekannt (Feld fehlt) → null', e2.erloesChf, null);
  const e3 = await plane([zeile({ discountedTotalSet: { shopMoney: { amount: '30', currencyCode: 'EUR' } } })]);
  ist('Erlös in EUR → null (keine geratene Umrechnung)', e3.erloesChf, null);
  const e4 = await plane([zeile(), zeile({ id: 'gid://shopify/LineItem/9002', discountedTotalSet: null })]);
  ist('Erlös: eine Position unbekannt → ganze Summe unbekannt', e4.erloesChf, null);
  const e5 = await plane([zeile({ product: { tags: ['sale'] } })]);
  ist('Erlös ohne POD-Position → null', e5.erloesChf, null);
  const e6 = await plane([zeile({ id: 'kein-gid' })]);
  ist('Position ohne numerische ID: kein item.external_id', 'external_id' in e6.items[0], false);
}
// gemischte Bestellung: POD + Fremdware; zwei POD-Positionen, eine kaputt
{
  const p = await plane([zeile(), zeile({ id: 'gid://shopify/LineItem/9003', sku: 'CJ-123', title: 'Lampe', product: { tags: ['cj'] }, customAttributes: [] })]);
  ist('Gemischte Bestellung: nur die POD-Position wird Artikel, die Lampe stört nicht', [p.items.length, p.befunde, p.pod], [1, [], 1]);
  const q = await plane([zeile(), zeile({ id: 'gid://shopify/LineItem/9004', title: 'Tasse', sku: 'zzz', variant: { sku: 'zzz' } })]);
  ist('Zwei POD-Positionen, eine ohne Variante: Artikel der ersten bleibt im Plan, der Befund ist HART (der Kleber legt dann keinen Teilauftrag an)', [q.items.length, arten(q.befunde), q.befunde[0]?.hart, /Tasse/.test(q.befunde[0]?.text)], [1, ['ohne-variante'], true, true]);
}
// Zeitreihenfolge: eine Variante nur einmal gefragt, Fremdtext
{
  const io = mkIo();
  await plane([zeile(), zeile({ id: 'gid://shopify/LineItem/9002' })], io);
  ist('Zwei Positionen derselben Variante: der Cache des Klebers entscheidet über die Abfrage, planeBestellung ruft io.produkt je Position', io.log.produkt, [4025, 4025]);
}


// ═══════════════════════════════════════ NEU (Gegenleser, Runde 2, 05.11.2026)
// Kosten-Wächter: null und negative Summen geben nie frei (GL1 Fund 4)
{
  const c = (total, extra = {}) => ({ currency: 'USD', total: String(total), tax: '0.00', ...extra });
  for (const [n, k] of [['total 0', c('0.00')], ['total 0 als Zahl', { currency: 'USD', total: 0 }], ['total negativ', c('-3.00')], ['total negativ bei negativer Steuer (die Differenz wäre positiv)', c('-1', { tax: '-5' })], ['Steuer = Summe', c('12.70', { tax: '12.70' })], ['Steuer > Summe', c('12.70', { tax: '20.00' })], ['Steuer und MWST zusammen = Summe', c('10', { tax: '5', vat: '5' })]]) {
    const x = kostenPruefen({ costs: k, erloesChf: 50 });
    ist(`Kosten ${n} → «kosten-unbekannt», kein grünes Licht`, [x.ok, x.art, x.kostenChf], [false, 'kosten-unbekannt', null]);
  }
  // Die beiden Untergrenzen sind zwei Prüfungen mit zwei Texten: null und darunter «keine gerechnete Summe», zwischen 0 und 0.50 USD «keine plausible Summe» (fiele die erste weg, bliebe der Befund, aber der Text sagte das Falsche)
  const txt = (total) => kostenPruefen({ costs: { currency: 'USD', total }, erloesChf: 50 }).text;
  ist('Kosten: Summe 0 und negativ sagen «keine gerechnete Summe», 0.30 USD sagt «keine plausible Summe»', [/keine gerechnete Summe/.test(txt('0.00')), /keine gerechnete Summe/.test(txt('-3')), /keine plausible Summe/.test(txt('0.30')), /keine gerechnete Summe/.test(txt('0.30'))], [true, true, true, false]);
  const knapp = kostenPruefen({ costs: { currency: 'USD', total: '19.71', tax: '1.47' }, erloesChf: 21, nettoMin: 4 });
  ist('Kosten: Gewinn über null, aber unter dem Mindestgewinn → Text «Gewinn unter dem Mindestgewinn» (kein «Verlust»)', [knapp.ok, /Gewinn unter dem Mindestgewinn/.test(knapp.text), /Verlust/.test(knapp.text), /Mindest 4\.00/.test(knapp.text)], [false, true, false, true]);
  const echt = kostenPruefen({ costs: { currency: 'USD', total: '19.71', tax: '1.47' }, erloesChf: 23.83, nettoMin: 4 });
  ist('Kosten: #1033 mit bezahltem Versand (Erlös 23.83 CHF) → netto 4.51 CHF, über dem Mindestgewinn', [echt.ok, echt.nettoChf], [true, 4.51]);
}
// Garnfarben: Typ statt Datei-ID, Zusatzstickerei (GL1 Fund 7)
{
  ist('garnOption: Zusatzstickerei addon_embroidery_front → addon_thread_colors_front', garnOption('addon_embroidery_front', ['thread_colors', 'addon_thread_colors_front']), 'addon_thread_colors_front');
  ist('garnOption: Zusatzstickerei ohne passende Option → null (nicht thread_colors)', garnOption('addon_embroidery_front', ['thread_colors']), null);
  ist('garnOption: embroidery_front der Kappe 206 (Katalog ohne passende Option) → null', garnOption('embroidery_front', (roh(206).options || []).map((o) => o.id)), null);
  ist('garnOption: embroidery_front mit allgemeiner Option (Trucker-Cap-Muster) → thread_colors', garnOption('embroidery_front', ['thread_colors', 'thread_colors_3d']), 'thread_colors');
  ist('technikFamilie: addon_embroidery_front ist Stickerei', technikFamilie('addon_embroidery_front'), 'EMBROIDERY');
  ist('technikFamilie: «default» allein ist Standard (die Stickerei zeigt sich erst über den Typ aus der Dateiliste)', technikFamilie('default'), 'STANDARD');
  const k = optionenPruefen({ produkt: roh(206), typen: ['embroidery_front'], angegeben: {} });
  ist('Kappe 206, Stickerei embroidery_front ohne Angaben: weicher Befund «optionen» (Katalog führt keine Garnfarben-Option), nichts gesendet', [arten(k.befunde), k.befunde[0]?.hart, /führt der Printful-Katalog keine Garnfarben-Option/.test(k.befunde[0]?.text), k.optionen], [['optionen'], false, true, []]);
  const k2 = optionenPruefen({ produkt: roh(206), typen: ['embroidery_front_large'], angegeben: { thread_colors_front_large: '#000000' } });
  ist('Kappe 206, embroidery_front_large mit Option thread_colors_front_large: Option gefunden, Wert gültig → gesendet, kein Befund', [k2.optionen, k2.befunde], [[{ id: 'thread_colors_front_large', value: ['#000000'] }], []]);
  const ohneDef = optionenPruefen({ produkt: null, typen: ['embroidery_front'], angegeben: {} });
  ist('Produkt-Optionen nicht lesbar + Stickerei → Befund «nicht prüfbar» (wie bisher)', arten(ohneDef.befunde), ['optionen']);
}
// Garnfarben mit Leerzeichen im Namen (GL2 Fund 11)
{
  const o = (v) => optionenPruefen({ produkt: roh(71), typen: ['embroidery_chest_left'], angegeben: { thread_colors_chest_left: v } });
  ist('Garnfarbe «1801 White» (Name mit Leerzeichen und Nummer): ein Wert, in Katalogschreibweise #FFFFFF', [o('1801 White').optionen, o('1801 White').befunde], [[{ id: 'thread_colors_chest_left', value: ['#FFFFFF'] }], []]);
  ist('«1801 White, 1672 Old Gold» (Komma trennt, Namen mit Leerzeichen bleiben heil)', o('1801 White, 1672 Old Gold').optionen, [{ id: 'thread_colors_chest_left', value: ['#FFFFFF', '#A67843'] }]);
  ist('«#FFFFFF #CC3333» (nur Leerzeichen, kein erlaubter Gesamtwert): zwei Hex-Werte', o('#FFFFFF #CC3333').optionen, [{ id: 'thread_colors_chest_left', value: ['#FFFFFF', '#CC3333'] }]);
  ist('«#FFFFFF;#000000» mit Semikolon', o('#FFFFFF;#000000').optionen, [{ id: 'thread_colors_chest_left', value: ['#FFFFFF', '#000000'] }]);
  ist('«1801 Weiss» (Name gibt es nicht): Befund, der den ganzen Wert nennt statt «1801» und «Weiss» getrennt', [o('1801 Weiss').optionen, o('1801 Weiss').befunde.length, /1801/.test(o('1801 Weiss').befunde[0]?.text)], [[], 1, true]);
}
// Nahtfarbe: Vorgabe des Besitzers (GL2 Fund 3)
{
  const j = (angegeben, vorgaben) => optionenPruefen({ produkt: roh(388), typen: ['front'], angegeben, vorgaben });
  ist('Jacke 388 (Option stitch_color): ohne Angabe und ohne Vorgabe → Befund «Pflichtoption stitch_color fehlt»', [arten(j({}, {}).befunde), /stitch_color/.test(j({}, {}).befunde[0]?.text)], [['optionen'], true]);
  ist('…mit Vorgabe white: options [{stitch_color: white}], kein Befund', [j({}, { stitch_color: 'white' }).optionen, j({}, { stitch_color: 'white' }).befunde], [[{ id: 'stitch_color', value: 'white' }], []]);
  ist('…Vorgabe «Black» (Schreibweise): auf den Schlüssel des Produkts abgebildet', j({}, { stitch_color: 'Black' }).optionen, [{ id: 'stitch_color', value: 'black' }]);
  ist('…die ausdrückliche Wahl der Kundin gewinnt gegen die Vorgabe', j({ stitch_color: 'black' }, { stitch_color: 'white' }).optionen, [{ id: 'stitch_color', value: 'black' }]);
  ist('…Vorgabe, die das Produkt nicht kennt («clear» bei white/black): Befund, nichts gesendet', [j({}, { stitch_color: 'clear' }).optionen, arten(j({}, { stitch_color: 'clear' }).befunde)], [[], ['optionen']]);
  const t = optionenPruefen({ produkt: roh(71), typen: ['default'], angegeben: {}, vorgaben: { stitch_color: 'white' } });
  ist('Produkt ohne stitch_color (T-Shirt 71): die Vorgabe wird nicht gesendet, kein Befund', [t.optionen, t.befunde], [[], []]);
  const nur = optionenPruefen({ produkt: roh(388), typen: [], angegeben: {}, vorgaben: { stitch_color: 'white' } });
  ist('Ohne Druckdatei-Typen (typen leer) wird die Vorgabe nicht gesetzt', nur.optionen, []);
}
// externalId (GL2 Fund 10)
{
  ist('externalId: «#1034-1» und «#10341» kollidieren nicht', [externalId('#1034-1', 'gid://shopify/Order/111'), externalId('#10341', 'gid://shopify/Order/222')], ['LX10341N111', 'LX10341']);
  ist('externalId: der Normalfall «#1034» bleibt LX1034, auch mit ID', externalId('#1034', 'gid://shopify/Order/19118298694023'), 'LX1034');
  ist('externalId: Namen ohne weggelassene Zeichen bleiben wie bisher («#SW1034» → LXSW1034)', externalId('#SW1034', 'gid://shopify/Order/5'), 'LXSW1034');
  ist('externalId: mit weggelassenem Zeichen aber ohne ID → wie bisher (ohne Suffix)', externalId('#1034-1'), 'LX10341');
  ist('externalId: lange Namen mit ID bleiben höchstens 32 Zeichen, die ID bleibt vollständig', [externalId('#' + '9'.repeat(40) + '-1', 'gid://shopify/Order/19118298694023').length, externalId('#' + '9'.repeat(40) + '-1', 'gid://shopify/Order/19118298694023').endsWith('N19118298694023')], [32, true]);
  ist('externalId: nur Sonderzeichen → null', [externalId('#-', 'gid://shopify/Order/5'), externalId('###', 'x')], [null, null]);
}
// JPEG progressiv (SOF2) und Basis (SOF0) werden gelesen (Mutant «SOF2 nicht gelesen»)
{
  const sof = (marker, w, h) => Buffer.from([0xff, 0xd8, 0xff, marker, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9]);
  ist('JPEG progressiv (SOF2) 4000×3000 wird gemessen', dateiMasse(sof(0xc2, 4000, 3000)), { format: 'jpeg', breite: 4000, hoehe: 3000 });
  ist('JPEG SOF1 (erweitert) wird gemessen', dateiMasse(sof(0xc1, 800, 600)), { format: 'jpeg', breite: 800, hoehe: 600 });
  ist('Tabellen-Marker DHT (0xc4) und DAC (0xcc) sind keine Bildkopfzeile', [dateiMasse(sof(0xc4, 800, 600)), dateiMasse(sof(0xcc, 800, 600))], [null, null]);
}
// planeBestellung: Stickerei am Typ, Versand, entfernte Einheiten (GL1 Fund 7, GL2 Fund 1 und 9)
{
  const kappenIo = () => mkIo({ produkt: () => prodVon(206), druckdaten: (pid) => ({ art: 'ok', printfiles: KAT[pid].printfiles, templates: KAT[pid].templates }) });
  const kappe = (attr) => zeile({ sku: '1_7854', variant: { sku: '1_7854' }, product: { productType: 'Kappen', tags: ['wunschdesign'] }, customAttributes: attr });
  const a = await plane([kappe([A('🖼️ Druckdatei (embroidery_front)', U('v')), karte6(['embroidery_front'])])], kappenIo());
  ist('Kappe, ausdrücklich embroidery_front ohne Garnfarben: Befund «optionen» (früher: kein Befund → bestätigt)', arten(a.befunde), ['optionen']);
  const b = await plane([kappe([A('🖼️ Druckdatei (default)', U('v')), karte6(['default'])])], kappenIo());
  ist('Kappe, Datei-ID «default» (Typ embroidery_front laut Dateiliste): Befund «optionen», KEIN Auflösungsbefund (Stickerei hat keine Pixelgrösse im Katalog)', arten(b.befunde), ['optionen']);
  const c = await plane([kappe([A('🖼️ Druckdatei (Vorne)', U('v'))])], kappenIo());
  ist('Kappe, v5 «Vorne» (Platzierung «front», nicht in der Dateiliste der Kappe): bleibt Entwurf (Auflösung nicht prüfbar), nicht still bestätigt', arten(c.befunde).length > 0, true);
  const versand = { currentShippingPriceSet: { shopMoney: { amount: '7.0', currencyCode: 'CHF' } } };
  const pos = (betrag, extra = {}) => zeile({ discountedTotalSet: { shopMoney: { amount: betrag, currencyCode: 'CHF' } }, ...extra });
  const v1 = await planeBestellung(bestellung([pos('16.83')], versand), mkIo());
  ist('Erlös = Positionen + bezahlter Versand: 16.83 + 7.00 = 23.83 (#1033)', [v1.positionenChf, v1.versandChf, v1.erloesChf], [16.83, 7, 23.83]);
  const v2 = await planeBestellung(bestellung([pos('16.83'), pos('16.83', { id: 'gid://shopify/LineItem/9002', product: { productType: 'x', tags: ['cj'] }, customAttributes: [] })], versand), mkIo());
  ist('Mischbestellung: der Versand wird nach Umsatz verteilt (Hälfte)', [v2.positionenChf, v2.versandChf, v2.erloesChf], [16.83, 3.5, 20.33]);
  const v3 = await planeBestellung(bestellung([pos('16.83')], { currentShippingPriceSet: { shopMoney: { amount: '7.0', currencyCode: 'EUR' } } }), mkIo());
  ist('Versand in EUR: kein Anteil (nicht raten)', [v3.versandChf, v3.erloesChf], [0, 16.83]);
  const v4 = await planeBestellung(bestellung([pos('16.83'), pos('10', { id: 'gid://shopify/LineItem/9002', product: { productType: 'x', tags: ['cj'] }, customAttributes: [], discountedTotalSet: { shopMoney: { amount: '10', currencyCode: 'EUR' } } })], versand), mkIo());
  ist('Mischbestellung mit einer Position in EUR: Umsatz unvollständig → kein Versandanteil (vorsichtig)', [v4.versandChf, v4.erloesChf], [0, 16.83]);
  const v5 = await planeBestellung(bestellung([pos('16.83')], { currentShippingPriceSet: null }), mkIo());
  ist('Ohne Versandfeld (alte Daten, Fakes): wie bisher', [v5.versandChf, v5.erloesChf], [0, 16.83]);
  const v6 = await planeBestellung(bestellung([pos('16.83')], { currentShippingPriceSet: { shopMoney: { amount: '-7', currencyCode: 'CHF' } } }), mkIo());
  ist('Negativer oder 0-Versand: kein Anteil', v6.versandChf, 0);
  const v7 = await planeBestellung(bestellung([pos('16.83')], { currentShippingPriceSet: { shopMoney: { amount: '99', currencyCode: 'CHF' } } }), mkIo());
  ist('Der Versandanteil übersteigt nie den bezahlten Versand', v7.versandChf <= 99, true);
  const q1 = await planeBestellung(bestellung([zeile({ quantity: 3, currentQuantity: 2, discountedTotalSet: { shopMoney: { amount: '90', currencyCode: 'CHF' } } })]), mkIo());
  ist('Menge: currentQuantity 2 von 3 → 2 gedruckt, Erlös anteilig 60.00', [q1.items[0].quantity, q1.positionenChf, q1.entfernt], [2, 60, 0]);
  const q2 = await planeBestellung(bestellung([zeile({ quantity: 1, currentQuantity: 0 })]), mkIo());
  ist('Menge: currentQuantity 0 → Position übergangen, kein Artikel, kein Befund, entfernt = 1, pod = 0', [q2.items.length, q2.befunde, q2.entfernt, q2.pod, q2.erloesChf], [0, [], 1, 0, null]);
  const q3 = await planeBestellung(bestellung([zeile({ quantity: 1, currentQuantity: 0, customAttributes: [A('🖼️ Druckdatei (front)', 'https://evil.example.com/x.png')] })]), mkIo());
  ist('…auch mit schlechter Druckdatei: eine entfernte Position löst keinen Befund aus', q3.befunde, []);
  const q4 = await planeBestellung(bestellung([zeile({ quantity: 0 }), zeile({ id: 'gid://shopify/LineItem/9002', quantity: 'x' })]), mkIo());
  ist('Menge: ohne brauchbare Zahlen wird NICHTS gedruckt: kein Artikel, harter Befund «menge-unlesbar» (nie ein geratenes Stück)', [q4.items.length, arten(q4.befunde), q4.befunde[0]?.hart, /nicht lesbar/.test(q4.befunde[0]?.text || '')], [0, ['menge-unlesbar', 'menge-unlesbar'], true, true]);
  const q5 = await planeBestellung(bestellung([zeile({ quantity: 2, currentQuantity: 5 })]), mkIo());
  ist('Menge: currentQuantity über der bestellten Menge (unsinnig) → gilt, Erlös nicht erhöht', [q5.items[0].quantity, q5.positionenChf], [5, 29.9]);
}
// Karte des Editors v6 gegen die gekaufte SKU (GL1 Fund 11)
{
  const mit = (extra) => zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), karte6(['front'], { dt: { front: 'default' }, ...extra })] });
  const ok1 = await plane([mit({ m: 71, pv: 4025 })]);
  ist('Karte nennt Produkt 71 und Variante 4025 wie die SKU 5599797_4025: kein Befund', ok1.befunde, []);
  const v = await plane([mit({ m: 71, pv: 4026 })]);
  ist('Karte nennt Variante 4026, gekauft wurde 4025: HARTER Befund «karte-widerspruch» (WP6: sonst würde das falsche Produkt gedruckt), kein Artikel', [arten(v.befunde), v.befunde[0]?.hart, /4026/.test(v.befunde[0]?.text), /4025/.test(v.befunde[0]?.text), v.items.length], [['karte-widerspruch'], true, true, true, 0]);
  const m = await plane([mit({ m: 19, pv: 4025 })]);
  ist('Karte nennt Produkt 19, die Variante gehört zu 71: HARTER Befund «karte-widerspruch», kein Artikel', [arten(m.befunde), m.befunde[0]?.hart, /Produkt 19/.test(m.befunde[0]?.text), m.items.length], [['karte-widerspruch'], true, true, 0]);
  const s2 = await plane([mit({ m: '71', pv: '4025' })]);
  ist('Zahlen als Text («71», «4025») gelten wie Zahlen', s2.befunde, []);
  const x = await plane([mit({ pv: 'abc', m: null })]);
  ist('Unlesbare Angaben in der Karte (kein Zahlenwert): kein Befund (sie sind optional)', x.befunde, []);
  const n = await plane([zeile()]);
  ist('Karte ohne pv und m (wie der Editor v5 es nicht kennt): kein Befund', n.befunde, []);
}
// ═══════════════════════════════════════ WP6 (06.11.2026): neue Schreibweise «_Druckdatei», _vorschau, qd, Karte gegen SKU, Bestellung ohne Design
// Prüfdaten: die ECHTE Kaufanfrage der Canary-Tasse «Keramik-Tasse mit farbiger Innenseite» (Printful 403, Variante 17197 Blau/15 oz; abgefangen im Browser am 06.11.2026,
// dropship/selbst-gestalten-fertig-0511/fabrik/lauf-0611/README.md) und ein Auszug der ECHTEN Printful-Antworten dazu (GET /products/variant/17197, /mockup-generator/printfiles/403 und /templates/403,
// gelesen 06.11.2026 ca. 15:00 UTC, auf die benutzten Felder gekürzt). Die Cloudinary-Datei der Anfrage misst 2700×1140 px (Kopfzeile gelesen) = die Druckdatei 44 der Variante.
{
  const TASSE = JSON.parse('{"antwort":{"variant":{"id":17197,"product_id":403,"size":"15 oz","color":"Blue"},"product":{"id":403,"type":"MUG","title":"White Ceramic Mug with Color Inside","files":[{"id":"default","type":"default","title":"Print file","additional_price":null,"options":[]},{"id":"preview","type":"mockup","title":"Mockup","additional_price":null,"options":[]}],"options":[{"id":"license_type","title":"License type","type":"multi_select","values":{"CLC":"Collegiate Licensing Company","AFFINITY":"Affinity","BR":"BR","EX":"EX","NCAA":"NCAA","FAN":"Fan","BCOMPLY":"BrandComply","TAG":"Tag","DLH":"DLH","CORE81":"Core81"},"additional_price":null,"additional_price_breakdown":[]}],"techniques":[{"key":"SUBLIMATION","display_name":"Sublimation","is_default":true}]}},"printfiles":{"product_id":403,"available_placements":{"default":"Print file"},"printfiles":[{"printfile_id":43,"width":2700,"height":1050,"dpi":300,"fill_mode":"fit","can_rotate":false},{"printfile_id":44,"width":2700,"height":1140,"dpi":300,"fill_mode":"fit","can_rotate":false}],"variant_printfiles":[{"variant_id":11051,"placements":{"default":43}},{"variant_id":17197,"placements":{"default":44}}]},"templates":{"min_dpi":150,"conflicting_placements":[]}}');
  const DATEI_T = 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1793976626/xy1jxggytwmgpyvh4m1v.png';
  const VORSCHAU_T = 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1793976700/klmnopqrst.jpg';
  const KARTE_T = { v: 6, m: 403, pv: 17197, sv: '68134397739399', pl: ['default'], ap: 0 };           // genau so schrieb sie der Editor 6.2.0 beim Kaufklick
  const TEXT_T = A('🎨 Design (default)', 'Text: "Test Entwurf"');
  const ALT = '🖼️ Druckdatei (default)', NEU = '_Druckdatei (default)';
  const eigT = (schluessel = ALT, extra = {}, mehr = []) => [TEXT_T, A(schluessel, DATEI_T), A('_pod_karte', JSON.stringify({ ...KARTE_T, ...extra })), ...mehr];
  const prodT = { info: produktInfoAusAntwort(TASSE.antwort), roh: TASSE.antwort, art: 'ok', status: 200 };
  const ioT = (o = {}) => mkIo({ produkt: () => prodT, druckdaten: () => ({ art: 'ok', printfiles: TASSE.printfiles, templates: TASSE.templates }), kopf: () => ({ status: 200, bytes: png(2700, 1140) }), ...o });
  const TITEL_T = 'Keramik-Tasse mit farbiger Innenseite selbst gestalten';
  const tasse = (props, o = {}) => zeile({ title: TITEL_T, sku: '9100403_17197', variant: { sku: '9100403_17197' }, discountedTotalSet: { shopMoney: { amount: '27.90', currencyCode: 'CHF' } },
    product: { productType: 'Tassen & Becher', tags: ['wunschdesign', 'printful_personalized_product', 'sg-fabrik'], metafield: null }, customAttributes: props, ...o });
  const kurz = (r) => ({ d: r.dateien.map((d) => [d.platzierung, d.dateiTyp, d.seite, d.quelle, d.schluessel, d.url.slice(-8)]), p: r.probleme.map((x) => `${x.hart ? 'H' : 'w'}:${x.art}`) });

  // ── (1) Parser: ALTE und NEUE Schreibweise zu 100 %
  ist('WP6 alt: die echte Anfrage der Canary-Tasse (v6.2.0) wird gelesen: eine Datei «default», Karte da, kein Problem', kurz(dateienAusEigenschaften(eigT(ALT))), { d: [['default', 'default', 'front', 'v6', 'alt', 'yvh4m1v.png'.slice(-8)]], p: [] });
  ist('WP6 neu: dieselbe Anfrage mit «_Druckdatei (default)» ergibt dieselbe Datei als v6 (früher: v5, Vorderseite geraten, dazu «karte-ohne-datei»)', kurz(dateienAusEigenschaften(eigT(NEU))), { d: [['default', 'default', 'front', 'v6', 'neu', 'yvh4m1v.png'.slice(-8)]], p: [] });
  {
    // Alle Platzierungs-IDs der Muster (Katalog: front, back, Ärmel, Etiketten, Stickerei, DTF, Tasche …): alt und neu liefern Zeile für Zeile dasselbe, nur die Schreibweise unterscheidet sich
    const ids = ['default', 'front', 'back', 'sleeve_left', 'sleeve_right', 'label_outside', 'label_inside', 'embroidery_chest_left', 'embroidery_front_large', 'front_dtf', 'front_dtfabric', 'long_sleeve_left_dtf', 'left', 'right', 'a1', 'x_1_2'];
    let gleich = 0, fehlt = [];
    for (const id of ids) {
      const karte = A('_pod_karte', JSON.stringify({ v: 6, pl: [id], dt: { [id]: 'dateityp_' + id } }));
      const a = dateienAusEigenschaften([A(`🖼️ Druckdatei (${id})`, U(id)), karte]), n = dateienAusEigenschaften([A(`_Druckdatei (${id})`, U(id)), karte]);
      const norm = (r) => JSON.stringify({ ...kurz(r), d: kurz(r).d.map((x) => x.filter((_, i) => i !== 4)) });
      if (norm(a) === norm(n) && a.dateien.length === 1 && n.dateien[0]?.quelle === 'v6' && n.dateien[0]?.platzierung === id && n.dateien[0]?.dateiTyp === 'dateityp_' + id) gleich++; else fehlt.push(id);
    }
    ist(`WP6: alle ${ids.length} Platzierungs-IDs werden in alter und neuer Schreibweise gleich gelesen (ID, Dateityp aus dt, Quelle v6)`, [gleich, fehlt], [ids.length, []]);
  }
  {
    const karte = karte6(['front', 'back', 'sleeve_left'], { dt: { front: 'default' } });
    const r = dateienAusEigenschaften([A('_Druckdatei (front)', U('v')), A('_Druckdatei (back)', U('h')), A('_Druckdatei (sleeve_left)', U('a')), A('🎨 Design (front)', 'Text: "Hallo"'), karte]);
    ist('WP6 neu mit drei Platzierungen: Dateityp «default» für die Vorderseite (dt), Rückseite back, Ärmel ohne Seite; kein Problem', [r.dateien.map((d) => [d.platzierung, d.dateiTyp, d.seite]), r.probleme], [[['front', 'default', 'front'], ['back', 'back', 'back'], ['sleeve_left', 'sleeve_left', null]], []]);
    const o = dateienAusEigenschaften({ '_Druckdatei (embroidery_chest_left)': U('s'), _pod_karte: JSON.stringify({ v: 6, pl: ['embroidery_chest_left'] }) });
    ist('WP6 neu als Objekt statt Liste (Stickerei-Platzierung)', [o.dateien.map((d) => [d.platzierung, d.quelle]), o.probleme], [[['embroidery_chest_left', 'v6']], []]);
    const l = dateienAusEigenschaften([A('_Druckdatei (front)', '  '), A('_Druckdatei (back)', '')]);
    ist('WP6 neu: leere Druckdatei-Eigenschaften = keine Datei, KEIN Problem (wie bei der alten Schreibweise)', [l.dateien.length, l.probleme], [0, []]);
    const f = dateienAusEigenschaften([A('_Druckdatei (front)', 'https://evil.example.com/x.png')]);
    ist('WP6 neu: Datei von fremdem Host → harter Befund «datei-adresse», keine Datei', [arten(f.probleme), f.probleme[0]?.hart, f.dateien.length], [['datei-adresse'], true, 0]);
    const k = dateienAusEigenschaften([A('_Druckdatei (front)', U('v')), A('_Druckdatei (back)', U('h')), A('_pod_karte', '{"v":6,"pl":["front"]}')]);
    ist('WP6 neu: Datei für «back», aber nicht in der Karte → weicher Befund «datei-ohne-karte» (wie alt)', [arten(k.probleme), k.dateien.length], [['datei-ohne-karte'], 2]);
    const d = dateienAusEigenschaften([A('_Druckdatei (front)', U('v')), A('_Druckdatei (front)', U('w'))]);
    ist('WP6 neu: dieselbe Platzierung zweimal in neuer Schreibweise → harter Befund «datei-doppelt», die erste Datei bleibt', [arten(d.probleme), d.probleme[0]?.hart, d.dateien.length, d.dateien[0]?.url.slice(-5)], [['datei-doppelt'], true, 1, 'v.png']);
  }
  // gemischte Schlüssel
  for (const [n, eig, soll] of [
    ['alt und neu für DIESELBE Platzierung', [A('🖼️ Druckdatei (default)', DATEI_T), A('_Druckdatei (default)', DATEI_T), A('_pod_karte', JSON.stringify(KARTE_T))], ['schluessel-gemischt']],
    ['alt (front) und neu (back) für verschiedene Platzierungen', [A('🖼️ Druckdatei (front)', U('v')), A('_Druckdatei (back)', U('h'))], ['schluessel-gemischt']],
    ['neu (front) und Editor 5 («Vorne · 🖼️ Druckdatei»)', [A('_Druckdatei (front)', U('v')), A('Vorne · 🖼️ Druckdatei', U('w'))], ['schluessel-gemischt']],
    ['alt und Editor 5', [A('🖼️ Druckdatei (front)', U('v')), A('Hinten · 🖼️ Druckdatei', U('w'))], ['schluessel-gemischt']],
    ['alle drei Schreibweisen', [A('🖼️ Druckdatei (front)', U('v')), A('_Druckdatei (back)', U('w')), A('Vorne · 🖼️ Druckdatei', U('x'))], ['schluessel-gemischt']],
  ]) {
    const r = dateienAusEigenschaften(eig);
    ist(`WP6 gemischte Schlüssel (${n}): genau EIN harter Befund «schluessel-gemischt», kein zusätzliches «datei-doppelt»`, [arten(r.probleme), r.probleme.every((x) => x.hart)], [soll, true]);
  }
  {
    const r = dateienAusEigenschaften(eigT(ALT, {}, [A(NEU, DATEI_T)]));
    wahr('WP6 gemischt: der Text nennt beide schreibweisen und bleibt unter 300 Zeichen (Telegram-Zeile)', /🖼️ Druckdatei/.test(r.probleme[0]?.text) && /_Druckdatei/.test(r.probleme[0]?.text) && r.probleme[0]?.text.length < 300);
  }
  // nicht lesbare neue Schlüssel: nie als Editor 5 (= Vorderseite) deuten
  for (const [n, k] of [['Grossbuchstabe in der ID', '_Druckdatei (Front)'], ['ohne Klammern', '_Druckdatei'], ['Kleinschreibung des Wortes', '_druckdatei (front)'], ['Leerzeichen in der ID', '_Druckdatei (sleeve left)'], ['Leerzeichen am Ende', '_Druckdatei (front) '], ['leere ID', '_Druckdatei ()'], ['Zusatz hinter der Klammer', '_Druckdatei (front) x']]) {
    const r = dateienAusEigenschaften([A(k, U('v'))]);
    ist(`WP6 nicht lesbarer neuer Schlüssel (${n}): harter Befund «datei-schluessel», KEINE Datei (früher: als Editor 5 gelesen, Vorderseite geraten)`, [arten(r.probleme), r.probleme[0]?.hart, r.dateien.length], [['datei-schluessel'], true, 0]);
  }
  ist('WP6 nicht lesbarer Schlüssel mit leerem Wert: kein Befund (wie bei jeder leeren Druckdatei-Eigenschaft)', dateienAusEigenschaften([A('_Druckdatei (Front)', '')]).probleme, []);
  ist('WP6 der Text zum nicht lesbaren Schlüssel kürzt Fremdtext auf 60 Zeichen', dateienAusEigenschaften([A('_Druckdatei (' + 'X'.repeat(500) + ')', U('v'))]).probleme[0]?.text.length < 400, true);
  { // Härtung 10.11.2026 (Fund 2/23): ein Schlüssel, der nach Druckdatei klingt, aber keine BEKANNTE Schreibweise ist, wird nie als Vorderseite geraten
    const x = dateienAusEigenschaften([A('Meine _Druckdatei (front)', U('v'))]);
    ist('WP6/Fund 2 «_Druckdatei» mitten im Schlüssel («Meine _Druckdatei (front)») ist KEIN bekannter Schlüssel: harter Befund «datei-schluessel», keine Datei (früher still Editor 5 = Vorderseite)', [arten(x.probleme), x.probleme[0]?.hart, x.dateien.length], [['datei-schluessel'], true, 0]);
    for (const k of ['🖼️ Druckdatei (Sleeve_left)', 'Rückseite Druckdatei', 'Druckdatei (sleeve_left)', '🖼️ Druckdatei (rücken)', 'Print file (back2)', 'hinten druckdatei', '🖼️ Druckdatei (Sleeve-Left)', 'PRINT FILE', 'Print  file', 'DRUCKDATEI (front)', '_druckdatei (front)', '_Druckdatei(front)', '_Druckdatei (Front)', '🖼️ Druckdatei (front) ', 'Vorne · Druckdatei · extra']) {
      const r = dateienAusEigenschaften([A(k, U('x'))]);
      ist(`Fund 2/23 unbekannter Schlüssel «${k}»: harter Befund «datei-schluessel», keine Datei`, [arten(r.probleme), r.probleme[0] && r.probleme[0]?.hart, r.dateien.length], [['datei-schluessel'], true, 0]);
    }
    ist('Fund 2/23 unbekannter Schlüssel mit LEEREM Wert: kein Befund (der Editor schreibt leere Eigenschaften für unbenutzte Seiten)', dateienAusEigenschaften([A('Rückseite Druckdatei', '')]).probleme, []);
    ist('Fund 2/23 Eigenschaften ohne «Druckdatei» im Namen (Notiz, Design-Text, _vorschau) lösen keinen Befund aus', dateienAusEigenschaften([A('Notiz', U('x')), A('🎨 Design (front)', 'Text'), A('_vorschau', U('x'))]).probleme, []);
    const g = dateienAusEigenschaften([A('Vorne · 🖼️ Druckdatei', U('v')), A('Rückseite Druckdatei', U('h'))]);
    ist('Fund 2/23 bekannter und unbekannter Schlüssel zusammen: die Vorderseite bleibt, der unbekannte ist ein harter Befund (der Kleber legt dann keinen Auftrag an)', [g.dateien.map((d) => d.seite), arten(g.probleme)], [['front'], ['datei-schluessel']]);
  }

  // ── (4) _vorschau ist nie eine Druckdatei
  {
    const r1 = dateienAusEigenschaften([A('_vorschau', VORSCHAU_T)]);
    ist('WP6 _vorschau allein: keine Datei, kein Problem', [r1.dateien.length, r1.probleme], [0, []]);
    for (const st of [ALT, NEU]) {
      const r = dateienAusEigenschaften(eigT(st, {}, [A('_vorschau', VORSCHAU_T)]));
      ist(`WP6 _vorschau neben «${st}»: genau eine Datei (die Druckdatei), die Vorschau wird nicht gelesen, kein Problem`, [r.dateien.map((d) => d.url.slice(-8)), r.probleme], [[DATEI_T.slice(-8)], []]);
    }
    const r3 = dateienAusEigenschaften([A('_vorschau', 'https://evil.example.com/v.jpg'), A('_Druckdatei (front)', U('v'))]);
    ist('WP6 _vorschau von fremdem Host: ignoriert (der Parser prüft und liest sie nie), die Druckdatei gilt', [r3.dateien.length, r3.probleme], [1, []]);
    const r4 = dateienAusEigenschaften([A('_vorschau', VORSCHAU_T), A('Vorne · 🖼️ Druckdatei', U('v'))]);
    ist('WP6 _vorschau neben Editor 5: keine Mischung (die Vorschau zählt zu keiner Schreibweise)', [r4.dateien.length, r4.probleme], [1, []]);
    // in der ganzen Planung: die Vorschau wird nie abgerufen, nie als Datei gesendet
    const io = ioT();
    const p = await plane([tasse(eigT(NEU, {}, [A('_vorschau', VORSCHAU_T)]))], io);
    ist('WP6 Plan mit _vorschau: ein Artikel mit genau EINER Datei (die Druckdatei), Kopfzeile und KI-Kontrolle nur für sie, kein Befund', [p.items[0].files, io.log.kopf, io.log.kontrolle, p.befunde], [[{ type: 'default', url: DATEI_T }], [DATEI_T], [DATEI_T], []]);
    const io2 = ioT();
    const ohne = await plane([tasse([TEXT_T, A('_vorschau', VORSCHAU_T), A('_pod_karte', JSON.stringify(KARTE_T))])], io2);
    ist('WP6 Plan: nur _vorschau und Karte, keine Druckdatei → harter Befund «keine-druckdatei», die Vorschau wird NICHT als Datei genommen und nicht abgerufen', [arten(ohne.befunde), ohne.items.length, io2.log.kopf, io2.log.produkt], [['keine-druckdatei'], 0, [], []]);
  }

  // ── (2) qd: nur weicher Befund
  {
    const q = (qd) => dateienAusEigenschaften(eigT(ALT, { qd }));
    ist('WP6 qd: ohne qd → qd null, kein Problem (Text ohne Foto, alte Editoren)', [dateienAusEigenschaften(eigT(ALT)).qd, dateienAusEigenschaften(eigT(ALT)).probleme], [null, []]);
    ist('WP6 qd: 100 wird gelesen, kein Problem', [q(100).qd, q(100).probleme], [100, []]);
    ist('WP6 qd: Grenzen 1 und 1000 gelten', [q(QD_MIN).qd, q(QD_MAX).qd, q(QD_MIN).probleme, q(QD_MAX).probleme], [1, 1000, [], []]);
    ist('WP6 qd: die Grenzen sind 1 und 1000', [QD_MIN, QD_MAX], [1, 1000]);
    for (const [n, w] of [['0', 0], ['1001', 1001], ['-5', -5], ['1.5', 1.5], ['Text «100»', '100'], ['true', true], ['Liste', [100]], ['Objekt', { a: 1 }], ['sehr gross', 1e12]]) {
      const r = q(w);
      ist(`WP6 qd unbrauchbar (${n}): qd null, WEICHER Befund «aufloesung-angabe», die Datei bleibt gültig`, [r.qd, arten(r.probleme), r.probleme[0]?.hart, r.dateien.length], [null, ['aufloesung-angabe'], false, 1]);
    }
    ist('WP6 qd: JSON null gilt wie «fehlt» (kein Befund)', [q(null).qd, q(null).probleme], [null, []]);
    ist('WP6 qd im Text des Befunds ist gekürzt (Fremdwert)', q('x'.repeat(5000)).probleme[0]?.text.length < 300, true);
    ist('WP6 qd wird auch aus einer Karte mit Optionen o und Stickerei gelesen (nur die Karte zählt)', dateienAusEigenschaften([A('_Druckdatei (front)', U('v')), A('_pod_karte', JSON.stringify({ v: 6, pl: ['front'], qd: 222, o: { stitch_color: 'white' } }))]).qd, 222);
    ist('WP6 qd ohne gültige Karte (kaputtes JSON): qd null', dateienAusEigenschaften([A('_Druckdatei (front)', U('v')), A('_pod_karte', '{"v":6,"qd":150,"pl":[')]).qd, null);
    ist('WP6 qd mit Karte von Version 5 (nicht lesbar): qd null', dateienAusEigenschaften([A('_Druckdatei (front)', U('v')), A('_pod_karte', '{"v":5,"qd":150,"pl":["front"]}')]).qd, null);
  }
  {
    // planeBestellung mit den echten Tassen-Daten
    const mitQd = async (qd, o = {}, extraIo = {}) => plane([tasse(eigT(NEU, { qd }), o)], ioT(extraIo));
    const gut = await plane([tasse(eigT(NEU))], ioT());
    ist('WP6 Plan Canary-Tasse in NEUER Schreibweise (echte Daten): ein Artikel Variante 17197 mit Datei «default», KEIN Befund (früher: weich «karte-ohne-datei», nie automatisch bestätigt)', [gut.items.map((i) => [i.variant_id, i.quantity, i.files.map((f) => f.type)]), gut.befunde], [[[17197, 1, ['default']]], []]);
    const alt = await plane([tasse(eigT(ALT))], ioT());
    ist('WP6 Plan Canary-Tasse in ALTER Schreibweise (echte Daten): derselbe Artikel, kein Befund', [alt.items, alt.befunde], [gut.items, []]);
    // Vertrag von PR #3031 (Codex, 09.11.2026): qd wird gegen templates.min_dpi UND gegen das abgerundete Minimum der echten Dateien gehalten (nur bei vollständig messbaren Platzierungen), jede Abweichung ist ein weicher «qd-weicht-ab».
    // Die Tasse: Datei 2700×1140 px = 300 dpi, Mindest-dpi 150 (Katalog 403). ANMERKUNG: der Editor schreibt die dpi des FOTOS (höchstens die Dichte der Datei), also kann qd bei einem Foto unter der Druckdichte legitim unter der Messung liegen;
    // die Prüfung meldet das trotzdem (nur weich, Entwurf). Ob das gewollt ist, steht in der Antwort dieses Auftrags unter «risiken».
    for (const [n, qd, soll] of [['qd 300 (gleich der Messung der Datei)', 300, []], ['qd 222 (ein 2000-px-Foto, unter der Dichte der Datei)', 222, ['w:qd-weicht-ab']], ['qd 150 (genau die Mindest-dpi der Tasse, unter der Messung 300)', 150, ['w:qd-weicht-ab']], ['qd 149 (unter der Mindest-dpi)', 149, ['w:qd-weicht-ab']], ['qd 60 (hochgezogenes Foto)', 60, ['w:qd-weicht-ab']], ['qd 400 (mehr als die Datei trägt)', 400, ['w:qd-weicht-ab']]]) {
      const r = await mitQd(qd);
      ist(`WP6 Plan Tasse mit ${n}: ${soll.length ? soll.join(', ') : 'kein Befund'}, der Artikel bleibt (Entwurf wird es durch den weichen Befund)`, [r.befunde.map((b) => `${b.hart ? 'H' : 'w'}:${b.art}`), r.items.length], [soll, 1]);
    }
    {
      const r = await mitQd(149);
      ist('WP6 qd-weicht-ab nennt beide Gründe (unter dem Mindestwert UND anders als die Messung) mit den Zahlen', [/149/.test(r.befunde[0]?.text), /150/.test(r.befunde[0]?.text), /300/.test(r.befunde[0]?.text), r.befunde[0]?.text.length < 400, r.befunde[0]?.hart], [true, true, true, true, false]);
    }
    // eine zu kleine DATEI bleibt trotz hohem qd ein Befund: die Messung an der Datei gilt, qd ist keine Freigabe
    const klein = await mitQd(300, {}, { kopf: () => ({ status: 200, bytes: png(900, 380) }) });
    ist('WP6 Plan: ein hohes qd (300) löscht den Befund «aufloesung» der zu kleinen Datei NICHT (900×380 px = 100 dpi) und fügt die Abweichung hinzu', klein.befunde.map((b) => `${b.hart ? 'H' : 'w'}:${b.art}`), ['w:aufloesung', 'w:qd-weicht-ab']);
    const ohneMess = await mitQd(500, {}, { druckdaten: () => ({ art: 'fehler', text: 'HTTP 500' }) });
    ist('WP6 Plan: Druckdaten des Katalogs nicht lesbar → «druckdaten» und «aufloesung» bleiben, qd wird weder mit dem Katalog noch mit einer Messung verglichen', ohneMess.befunde.map((b) => b.art), ['druckdaten', 'aufloesung']);
    const nied = await mitQd(50, {}, { druckdaten: () => ({ art: 'fehler', text: 'HTTP 500' }) });
    ist('WP6 Plan: Druckdaten nicht lesbar und qd 50 → ebenfalls kein qd-Vergleich (weder Mindest-dpi noch Messung bekannt)', nied.befunde.map((b) => b.art), ['druckdaten', 'aufloesung']);
    // mehrere Platzierungen: qd gegen die beste Messung (T-Shirt 71: Vorderseite 1800×2400 bei 150 dpi)
    const shirt = (qd, kopf) => plane([zeile({ customAttributes: [A('_Druckdatei (front)', U('v')), A('_Druckdatei (back)', U('h')), karte6(['front', 'back'], { dt: { front: 'default' }, qd })] })], mkIo({ kopf: kopf || (() => ({ status: 200, bytes: png(1800, 2400) })) }));
    ist('WP6 Plan T-Shirt (150 dpi): qd 150 → kein Befund', (await shirt(150)).befunde, []);
    ist('WP6 Plan T-Shirt (150 dpi): qd 200 behauptet mehr als die Dateien tragen → «qd-weicht-ab»', (await shirt(200)).befunde.map((b) => b.art), ['qd-weicht-ab']);
    ist('WP6 Plan T-Shirt: qd 70 unter der Mindest-dpi 75 → «qd-weicht-ab»', (await shirt(70)).befunde.map((b) => b.art), ['qd-weicht-ab']);
  }

  // ── (3) Karte gegen SKU
  ist('WP6 modellAusSku: Schema <9100000+Modell>_<Variante>', [modellAusSku('9100403_17197'), modellAusSku('9100019_77 '), modellAusSku('9199999_1'), modellAusSku('9100001_1')], [403, 19, 99999, 1]);
  ist('WP6 modellAusSku: ältere Schemata, Fremdes und Grenzen → null (8481330 und 9448929 sind echte alte Vorsilben, GEMESSEN an sku_index.json)', ['9448929_10774', '8481330_4025', '9000001_8948', '5599797_4025', '9100000_1', '9200000_1', '9100403', '9100403_', 'x9100403_1', '', null, undefined].map(modellAusSku), Array(12).fill(null));
  ist('WP6 SKU_BASIS ist 9100000 (wie automation/pod_modell/plan.mjs)', SKU_BASIS, 9100000);
  {
    const r = await plane([tasse(eigT(NEU))], ioT());
    ist('WP6 Karte {m:403, pv:17197} gegen SKU 9100403_17197: kein Befund', r.befunde, []);
    for (const [n, extra, text] of [
      ['pv weicht von der SKU ab (17196 statt 17197)', { pv: 17196 }, /17196/],
      ['m weicht vom SKU-Modell ab (404 statt 403)', { m: 404 }, /Produkt 404/],
      ['beide weichen ab', { m: 404, pv: 17196 }, /17196/],
      ['pv als Text («17196»)', { pv: '17196' }, /17196/],
    ]) {
      const io = ioT();
      const w = await plane([tasse(eigT(NEU, extra))], io);
      ist(`WP6 Karte widerspricht der SKU (${n}): HARTER Befund «karte-widerspruch», KEIN Artikel, keine Netzabfrage (Variante, Datei, KI-Kontrolle)`, [arten(w.befunde).filter((x, i, l) => l.indexOf(x) === i), w.befunde.every((b) => b.hart), w.items.length, io.log.produkt, io.log.kopf, io.log.kontrolle, text.test(w.befunde.map((b) => b.text).join(' '))], [['karte-widerspruch'], true, 0, [], [], [], true]);
    }
    const bei = await plane([tasse(eigT(NEU, { m: 404, pv: 17196 }))], ioT());
    ist('WP6 beide Widersprüche zugleich: beide Texte da (Variante UND Produkt), je ein Befund', bei.befunde.length, 2);
    const nullKarte = await plane([tasse(eigT(NEU, { pv: null, m: null }))], ioT());
    ist('WP6 Karte mit pv und m = null (Editor kannte sie nicht): kein Befund', nullKarte.befunde, []);
    const keine = await plane([tasse([TEXT_T, A(NEU, DATEI_T)])], ioT());
    ist('WP6 FEHLENDE Karte (alte Bestellung, v5-Weg): kein Befund und derselbe Artikel', [keine.befunde, keine.items.length], [[], 1]);
    const alteSku = await plane([zeile({ customAttributes: [A('_Druckdatei (front)', U('v')), karte6(['front'], { dt: { front: 'default' }, m: 71, pv: 4025 })] })]);
    ist('WP6 alte SKU «5599797_4025» (kein 91…-Schema): das Modell wird nur gegen das Produkt der Variante geprüft, kein Befund', alteSku.befunde, []);
    // Produkt der Variante laut Printful gegen m (alte SKU): hart, und danach keine weiteren Netzabfragen für diese Position
    const io = mkIo();
    const pm = await planeBestellung(bestellung([zeile({ customAttributes: [A('_Druckdatei (front)', U('v')), karte6(['front'], { dt: { front: 'default' }, m: 19, pv: 4025 })] })]), io);
    ist('WP6 m der Karte (19) gegen das Produkt der Variante laut Printful (71): HART, kein Artikel, keine Datei-/KI-Abfragen mehr (nur die Variantenabfrage lief)', [arten(pm.befunde), pm.befunde[0]?.hart, pm.items.length, io.log.produkt, io.log.druck, io.log.kopf, io.log.kontrolle], [['karte-widerspruch'], true, 0, [4025], [], [], []]);
    // zwei Positionen: nur die widersprüchliche scheitert, die andere wird geplant (der Kleber legt wegen des harten Befunds trotzdem keinen Auftrag an)
    const zwei = await plane([tasse(eigT(NEU)), tasse(eigT(NEU, { pv: 11051 }), { id: 'gid://shopify/LineItem/9002' })], ioT());
    ist('WP6 zwei Positionen, die zweite mit falscher Karte: ein Artikel geplant, ein harter Befund (der Kleber legt dann keinen Auftrag an)', [zwei.items.length, arten(zwei.befunde), zwei.befunde[0]?.hart], [1, ['karte-widerspruch'], true]);
  }

  // ── (5) Bestellung ohne Design
  {
    const ohne = async (props, o = {}, ioX = ioT()) => ({ r: await plane([tasse(props, o)], ioX), io: ioX });
    const a = await ohne([]);
    ist('WP6 ohne Design, ganz ohne Eigenschaften: genau ein HARTER Befund «keine-druckdatei», kein Artikel, KEINE Netzabfrage', [arten(a.r.befunde), a.r.befunde[0]?.hart, a.r.items.length, a.io.log.produkt, a.io.log.kopf, a.io.log.kontrolle], [['keine-druckdatei'], true, 0, [], [], []]);
    ist('WP6 ohne Design: die Meldung sagt, dass es keinen Printful-Auftrag und keine Nachricht an die Kundin gibt, nennt den Ablauf (OHNE-DESIGN.md) und das Fehlen des Editor-Eintrags', [/KEIN Printful-Auftrag/.test(a.r.befunde[0]?.text), /KEINE Nachricht an die Kundin/.test(a.r.befunde[0]?.text), /dropship\/wp6-0611\/OHNE-DESIGN\.md/.test(a.r.befunde[0]?.text), /kein Editor-Eintrag/.test(a.r.befunde[0]?.text)], [true, true, true, true]);
    const b = await ohne([TEXT_T, A('_pod_karte', JSON.stringify(KARTE_T))]);
    ist('WP6 ohne Design, aber mit Editor-Eintrag (Upload gescheitert?): NUR «keine-druckdatei» (das weiche «karte-ohne-datei» ist dieselbe Ursache und steht nicht zusätzlich), Text sagt «Editor-Eintrag da»', [arten(b.r.befunde), /Editor-Eintrag da/.test(b.r.befunde[0]?.text), b.r.items.length], [['keine-druckdatei'], true, 0]);
    const c = await ohne([A('_vorschau', VORSCHAU_T), TEXT_T]);
    ist('WP6 ohne Design, nur Vorschau und Designtext: «keine-druckdatei»', arten(c.r.befunde), ['keine-druckdatei']);
    const lang = await ohne([], { title: 'T'.repeat(255) });
    ist('WP6 ohne Design bei 255 Zeichen Titel: der Text bleibt unter 300 Zeichen (der Kleber kürzt dort) und der Verweis auf den Ablauf bleibt sichtbar', [lang.r.befunde[0]?.text.length < 300, /OHNE-DESIGN\.md/.test(lang.r.befunde[0]?.text)], [true, true]);
    const weitere = await ohne([TEXT_T, A('_pod_karte', JSON.stringify({ ...KARTE_T, pl: ['front', 'back'] }))]);
    ist('WP6 ohne Design, Karte mit zwei Platzierungen: weiter nur EIN Befund (die zwei «karte-ohne-datei» entfallen)', arten(weitere.r.befunde), ['keine-druckdatei']);
    // eine andere Position der Bestellung bleibt unberührt: ihre weichen Befunde werden nicht gelöscht
    const gemischt = await plane([tasse([]), tasse(eigT(NEU, { qd: 60 }), { id: 'gid://shopify/LineItem/9002' })], ioT());
    ist('WP6 zwei Positionen, die erste ohne Design: der Befund der zweiten (qd 60 → «qd-weicht-ab») bleibt erhalten', arten(gemischt.befunde), ['keine-druckdatei', 'qd-weicht-ab']);
    const davor = await plane([tasse(eigT(NEU, { pl: ['default', 'back'] }), { id: 'gid://shopify/LineItem/9003' }), tasse([], { id: 'gid://shopify/LineItem/9004' })], ioT());
    ist('WP6 zwei Positionen, die ERSTE mit einem weichen «karte-ohne-datei» (Karte nennt «back», nur «default» da), die zweite ohne Design: der Befund der ersten bleibt', arten(davor.befunde), ['karte-ohne-datei', 'keine-druckdatei']);
    const ohneNurKarte = await plane([tasse([A('_pod_karte', '{"v":6,"pl":["front"],"qd":100}')]), tasse(eigT(NEU, {}), { id: 'gid://shopify/LineItem/9002' })], ioT());
    ist('WP6 «karte-ohne-datei» der ersten Position wird entfernt, sonst nichts: die zweite Position ist gut', [arten(ohneNurKarte.befunde), ohneNurKarte.items.length], [['keine-druckdatei'], 1]);
  }
}
// ═══════════════════════════════════════ Phase 1 (09.11.2026): Dienst-Standort, Aufpreis-Platzierungen gegen das bezahlte Paket, Kosten-Obergrenze, Editor 6.4.0 Ende zu Ende
{
  // ── (a) Standort der Position
  const ID1 = 'gid://shopify/LineItem/9001', ID2 = 'gid://shopify/LineItem/9002';
  const art = (o, id) => standortVon(o, id).art;
  ist('Standort: Position in offener Fulfillment-Order eines Händler-Standorts → frei', art({ fulfillmentOrders: fulfillmentOrders([ID1]) }, ID1), 'frei');
  ist('Standort: Dienst-Standort («Printful», isFulfillmentService true) → dienst, mit dem Namen', standortVon({ fulfillmentOrders: fulfillmentOrders([ID1], FO_DIENST) }, ID1), { art: 'dienst', name: 'Printful' });
  ist('Standort: Dienst-Standort ohne Namen → die Standort-ID statt eines leeren Namens', standortVon({ fulfillmentOrders: fulfillmentOrders([ID1], { id: 'gid://shopify/Location/9', isFulfillmentService: true }) }, ID1).name, 'gid://shopify/Location/9');
  ist('Standort: zwei Positionen, die erste am Dienst, die zweite am Händler: jede für sich', [art({ fulfillmentOrders: { edges: [fulfillmentOrders([ID1], FO_DIENST).edges[0], fulfillmentOrders([ID2]).edges[0]] } }, ID1), art({ fulfillmentOrders: { edges: [fulfillmentOrders([ID1], FO_DIENST).edges[0], fulfillmentOrders([ID2]).edges[0]] } }, ID2)], ['dienst', 'frei']);
  ist('Standort: dieselbe Position in zwei Fulfillment-Orders (geteilt), eine am Dienst → dienst', art({ fulfillmentOrders: { edges: [fulfillmentOrders([ID1]).edges[0], fulfillmentOrders([ID1], FO_DIENST).edges[0]] } }, ID1), 'dienst');
  for (const st of ['CLOSED', 'CANCELLED', 'closed']) ist(`Standort: Fulfillment-Order ${st} zählt nicht (veraltet): nur sie vorhanden → unklar`, art({ fulfillmentOrders: fulfillmentOrders([ID1], FO_DIENST, st) }, ID1), 'unklar');
  ist('Standort: geschlossene Dienst-Order UND offene Händler-Order für dieselbe Position → UNKLAR (hat der Dienst schon gedruckt? Gegenleser 10.11.2026; früher «frei»)', standortVon({ fulfillmentOrders: { edges: [fulfillmentOrders([ID1], FO_DIENST, 'CLOSED').edges[0], fulfillmentOrders([ID1]).edges[0]] } }, ID1).art, 'unklar');
  for (const st of ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'SCHEDULED', 'INCOMPLETE']) ist(`Standort: Fulfillment-Order ${st} am Dienst zählt`, art({ fulfillmentOrders: fulfillmentOrders([ID1], FO_DIENST, st) }, ID1), 'dienst');
  ist('Standort: Position steht in keiner Fulfillment-Order → unklar', art({ fulfillmentOrders: fulfillmentOrders([ID2]) }, ID1), 'unklar');
  ist('Standort: keine Positions-ID → unklar (nie «frei» geraten)', [art({ fulfillmentOrders: fulfillmentOrders([ID1]) }, undefined), art({ fulfillmentOrders: fulfillmentOrders([ID1]) }, '')], ['unklar', 'unklar']);
  for (const [n, o] of [['fehlt', {}], ['null', { fulfillmentOrders: null }], ['edges keine Liste', { fulfillmentOrders: { edges: null } }], ['keine Bestellung', null], ['leere Liste', { fulfillmentOrders: { edges: [] } }]]) ist(`Standort: fulfillmentOrders ${n} → unklar`, art(o, ID1), 'unklar');
  for (const [n, ort] of [['Standort null', null], ['Flag fehlt', { id: 'l' }], ['Flag null', { id: 'l', isFulfillmentService: null }], ['Flag als Text «false»', { id: 'l', isFulfillmentService: 'false' }]]) {
    const fo = { edges: [{ node: { status: 'OPEN', assignedLocation: ort === null ? null : { location: ort }, lineItems: { edges: [{ node: { lineItem: { id: ID1 } } }] } } }] };
    ist(`Standort: ${n} → unklar (nur ein ausdrückliches false gilt als Händler-Standort)`, art({ fulfillmentOrders: fo }, ID1), 'unklar');
  }
  ist('Standort: Flag als Text «true» ist KEIN Dienst und KEIN Händler → unklar', art({ fulfillmentOrders: fulfillmentOrders([ID1], { id: 'l', isFulfillmentService: 'true' }) }, ID1), 'unklar');

  // ── (a) im Plan
  {
    const io = mkIo();
    const p = await planeBestellung(bestellung([zeile()], { fulfillmentOrders: fulfillmentOrders([ID1], FO_DIENST) }), io, { paket: paketAlles });
    ist('Plan: Position am Dienst-Standort «Printful» → HARTER Befund «dienst-standort», KEIN Artikel, keine einzige Netzabfrage (Variante, Katalog, Datei, KI)', [arten(p.befunde), p.befunde[0]?.hart, p.items.length, io.log.produkt, io.log.druck, io.log.kopf, io.log.kontrolle], [['dienst-standort'], true, 0, [], [], [], []]);
    ist('Plan Dienst-Standort: der Text nennt den Standort, den Doppeldruck und bleibt unter 300 Zeichen (Telegram-Zeile)', [/Printful/.test(p.befunde[0]?.text), /Doppeldruck/.test(p.befunde[0]?.text), p.befunde[0]?.text.length < 300], [true, true, true]);
    ist('Plan Dienst-Standort: der Erlös der Position zählt weiter mit (die Bestellung bleibt vollständig gerechnet)', [p.pod, p.erloesChf], [1, 29.9]);
  }
  {
    const z2 = zeile({ id: ID2 });
    const p = await planeBestellung(bestellung([zeile(), z2], { fulfillmentOrders: { edges: [fulfillmentOrders([ID1], FO_DIENST).edges[0], fulfillmentOrders([ID2]).edges[0]] } }), mkIo(), { paket: paketAlles });
    ist('Plan: zwei Editor-Positionen, die erste am Dienst-Standort: ein harter Befund, die zweite wird geplant (der Kleber legt wegen des harten Befunds trotzdem KEINEN Auftrag an)', [arten(p.befunde), p.befunde[0]?.hart, p.items.map((i) => i.external_id)], [['dienst-standort'], true, ['9002']]);
  }
  {
    const nd = await plane([zeile()], mkIo(), undefined);
    ist('Plan: Händler-Standort («Shop location») → kein Befund (Normalfall)', nd.befunde, []);
    const ohne = await planeBestellung({ id: 'o', name: '#T1', lineItems: { pageInfo: { hasNextPage: false }, edges: [{ node: zeile() }] } }, mkIo(), { paket: paketAlles });
    ist('Plan Fund 4/21: Bestelldaten OHNE Fulfillment-Orders → HARTER Befund «dienst-standort-unklar» (nie als frei gelesen), KEIN Artikel (sonst entstünde neben dem Auftrag der Printful-App ein zweiter Entwurf)', [arten(ohne.befunde), ohne.befunde[0]?.hart, ohne.items.length], [['dienst-standort-unklar'], true, 0]);
    const leer = await planeBestellung(bestellung([zeile()], { fulfillmentOrders: { edges: [] } }), mkIo(), { paket: paketAlles });
    ist('Plan Fund 4/21: leere Liste der Fulfillment-Orders (das Token sieht die Order nicht) → hart «dienst-standort-unklar», kein Artikel', [arten(leer.befunde), leer.befunde[0]?.hart, leer.items.length], [['dienst-standort-unklar'], true, 0]);
    const hinweis = await planeBestellung(bestellung([zeile()], { fulfillmentOrders: { edges: [] } }), mkIo(), { paket: paketAlles, scopeHinweis: 'dem Token fehlt das Recht read_third_party_fulfillment_orders' });
    ist('Plan Fund 21: fehlt dem Token ein Zugriffsrecht (cfg.scopeHinweis), nennt der Befundtext es als mögliche Ursache', /dem Token fehlt das Recht read_third_party_fulfillment_orders/.test(hinweis.befunde[0]?.text), true);
    const abgeschnitten = await planeBestellung(bestellung([zeile()], { fulfillmentOrders: { ...fulfillmentOrders([ID1]), pageInfo: { hasNextPage: true } } }), mkIo(), { paket: paketAlles });
    ist('Plan Fund 4: mehr Fulfillment-Orders als eine Abfrage liefert (hasNextPage) → hart «dienst-standort-unklar», kein Artikel', [arten(abgeschnitten.befunde), abgeschnitten.befunde[0]?.hart, abgeschnitten.items.length], [['dienst-standort-unklar'], true, 0]);
    // «unklar» bricht die Prüfung der Position ab wie «dienst»: weder eine fehlende Variante noch ein fehlendes Design noch eine Netzabfrage kommen dazu (sonst stünde neben der Meldung «Standort unklar» eine zweite, die vom Wesentlichen ablenkt)
    for (const [n, z] of [['SKU ohne Printful-Variante', { sku: 'KAPUTT', variant: { sku: 'KAPUTT' } }], ['kein Design der Kundin', { customAttributes: [] }]]) {
      const ioU = mkIo();
      const u = await planeBestellung(bestellung([zeile(z)], { fulfillmentOrders: { edges: [] } }), ioU, { paket: paketAlles });
      ist(`Plan Fund 4: «dienst-standort-unklar» und ${n}: genau ein Befund, kein Artikel, keine Netzabfrage`, [arten(u.befunde), u.items.length, ioU.log.produkt, ioU.log.druck, ioU.log.kopf, ioU.log.kontrolle], [['dienst-standort-unklar'], 0, [], [], [], []]);
    }
    const cj = await planeBestellung(bestellung([zeile({ product: { productType: 'x', tags: ['cj'] }, customAttributes: [] })], { fulfillmentOrders: fulfillmentOrders([ID1], FO_DIENST) }), mkIo(), { paket: paketAlles });
    ist('Plan: eine Nicht-Editor-Position am Dienst-Standort wird nicht angefasst (kein Befund, kein Artikel)', [cj.befunde, cj.items.length], [[], 0]);
    const ohneDesign = await planeBestellung(bestellung([zeile({ customAttributes: [] })], { fulfillmentOrders: fulfillmentOrders([ID1], FO_DIENST) }), mkIo(), { paket: paketAlles });
    ist('Plan: am Dienst-Standort UND ohne Design → nur «dienst-standort» (der Dienst druckt selbst; die Design-Frage stellt sich dem Sync nicht)', arten(ohneDesign.befunde), ['dienst-standort']);
  }

  // ── (b) Aufpreis-Platzierungen
  const R71 = KAT[71].produkt, R19 = KAT[19].produkt;
  ist('Aufpreis (Katalog 71): Vorderseite «default» und «front» sind im Grundpreis (additional_price null)', [aufpreisUsd(R71, 'default'), aufpreisUsd(R71, 'front')], [0, 0]);
  ist('Aufpreis (Katalog 71): Rückseite 5.95, Ärmel 2.49, Etikett innen 0.99, Stickerei Brust 2.95 USD', ['back', 'sleeve_left', 'label_inside', 'embroidery_chest_left'].map((t) => aufpreisUsd(R71, t)), [5.95, 2.49, 0.99, 2.95]);
  ist('Aufpreis: Tasse «default» → 0; unbekannte Platzierung, kein Katalog, Katalog ohne Dateiliste → null (unbekannt)', [aufpreisUsd(R19, 'default'), aufpreisUsd(R71, 'gibt_es_nicht'), aufpreisUsd(null, 'back'), aufpreisUsd({}, 'back'), aufpreisUsd({ files: 'x' }, 'back')], [0, null, null, null, null]);
  ist('Aufpreis: das Mockup («preview») ist keine Platzierung', aufpreisUsd(R71, 'preview'), null);
  ist('Aufpreis: nicht lesbarer Preis («abc», negativ) → unbekannt, nie 0', [aufpreisUsd({ files: [{ id: 'back', type: 'back', additional_price: 'abc' }] }, 'back'), aufpreisUsd({ files: [{ id: 'back', type: 'back', additional_price: '-1' }] }, 'back')], [null, null]);
  ist('Aufpreis: Zahl statt Text und 0 → 0 bzw. Zahl; mehrere Einträge für dieselbe Platzierung → der höchste Preis', [aufpreisUsd({ files: [{ id: 'back', type: 'back', additional_price: 0 }] }, 'back'), aufpreisUsd({ files: [{ id: 'back', type: 'back', additional_price: 3 }] }, 'back'), aufpreisUsd({ files: [{ id: 'a', type: 'back', additional_price: '1.5' }, { id: 'back', type: 'back', additional_price: '4' }] }, 'back')], [0, 3, 4]);
  ist('Paket Standard: nur Vorderseite bezahlt (keine Aufpreis-Platzierung gedeckt), mit Quelle', [paketStandard().bezahlt, typeof paketStandard().quelle], [[], 'string']);
  {
    const ap = (typen, bezahlt, roh = R71) => aufpreisPruefen({ roh, typen, bezahlt }).map((b) => `${b.hart ? 'H' : 'w'}:${b.art}`);
    ist('aufpreisPruefen: nur Vorderseite → kein Befund', ap(['default'], []), []);
    ist('aufpreisPruefen: Rückseite, bezahlt ist nur die Vorderseite → hart «aufpreis-unbezahlt»', ap(['default', 'back'], []), ['H:aufpreis-unbezahlt']);
    ist('aufpreisPruefen: Rückseite und Ärmel, nur die Rückseite bezahlt → hart, genau für den Ärmel', [ap(['back', 'sleeve_left'], ['back']), aufpreisPruefen({ roh: R71, typen: ['back', 'sleeve_left'], bezahlt: ['back'] })[0]?.text.includes('sleeve_left')], [['H:aufpreis-unbezahlt'], true]);
    ist('aufpreisPruefen: Rückseite und Ärmel beide bezahlt → kein Befund', ap(['default', 'back', 'sleeve_left'], ['back', 'sleeve_left']), []);
    ist('aufpreisPruefen: zwei unbezahlte Platzierungen → je ein Befund', ap(['back', 'sleeve_left', 'sleeve_right'], []), ['H:aufpreis-unbezahlt', 'H:aufpreis-unbezahlt', 'H:aufpreis-unbezahlt']);
    ist('aufpreisPruefen: bezahlt als Katalog-Datei-ID oder als Typname gilt (front_large hat id und type)', [ap(['front_large'], ['front_large']), ap(['front_dtf'], ['front_dtf'])], [[], []]);
    ist('aufpreisPruefen: bezahltes Paket nicht bestimmbar (null) deckt keinen Aufpreis', [ap(['default', 'back'], null), aufpreisPruefen({ roh: R71, typen: ['back'], bezahlt: null })[0]?.text.includes('nicht bestimmbar')], [['H:aufpreis-unbezahlt'], true]);
    ist('aufpreisPruefen: Tasse und Poster (ohne Aufpreis) sind mit jedem Paket frei', [ap(['default'], null, R19), ap(['default'], [], KAT[268].produkt)], [[], []]);
    ist('aufpreisPruefen: Preis der Platzierung unlesbar (ohne Katalog) → WEICH «aufpreis-unbekannt», nie hart; die Vorderseite braucht keinen Katalog', [ap(['default', 'back'], [], null), ap(['front'], [], null), ap(['default'], [], null)], [['w:aufpreis-unbekannt'], [], []]);
    ist('aufpreisPruefen: unbekannter Preis, aber die Platzierung ist bezahlt → trotzdem «aufpreis-unbekannt» (die Höhe ist nicht prüfbar)', ap(['back'], ['back'], null), ['w:aufpreis-unbekannt']);
    ist('aufpreisPruefen: die Meldung nennt Platzierung, Preis in USD und bleibt unter 300 Zeichen', (() => { const t = aufpreisPruefen({ roh: R71, typen: ['back'], bezahlt: [], quelle: 'Standard: nur Vorderseite bezahlt' })[0].text; return [/«back»/.test(t), /5\.95 USD/.test(t), t.length < 300]; })(), [true, true, true]);
    ist('aufpreisPruefen: nichts übergeben', aufpreisPruefen(), []);
  }
  {
    const pos = (opts) => ({ variant: { sku: 'x', selectedOptions: opts } });
    const paket = paketAusOption({ option: 'Druck', pakete: { 'Nur Vorderseite': [], 'Vorder- und Rückseite': ['back'] } });
    ist('paketAusOption: Wert «Vorder- und Rückseite» → back bezahlt', paket(pos([{ name: 'Farbe', value: 'Weiss' }, { name: 'Druck', value: 'Vorder- und Rückseite' }])).bezahlt, ['back']);
    ist('paketAusOption: «Nur Vorderseite» → nichts bezahlt', paket(pos([{ name: 'Druck', value: 'Nur Vorderseite' }])).bezahlt, []);
    ist('paketAusOption: Name der Option ohne Rücksicht auf Gross-/Kleinschreibung, Wert ohne Leerraum am Rand', paket(pos([{ name: 'druck', value: ' Vorder- und Rückseite ' }])).bezahlt, ['back']);
    ist('paketAusOption: unbekannter Wert → bezahlt null (nicht bestimmbar), nie «alles»', paket(pos([{ name: 'Druck', value: 'Mit Ärmeln' }])).bezahlt, null);
    ist('paketAusOption: Wert wie ein Eigenschaftsname der Objekt-Prototypen («constructor») ist unbekannt', paket(pos([{ name: 'Druck', value: 'constructor' }])).bezahlt, null);
    ist('paketAusOption: Option fehlt an der Variante / keine selectedOptions / keine Position → Vorgabe (nur Vorderseite)', [paket(pos([{ name: 'Farbe', value: 'Weiss' }])).bezahlt, paket({ variant: { sku: 'x' } }).bezahlt, paket(null).bezahlt, paket(undefined).bezahlt], [[], [], [], []]);
    ist('paketAusOption: eigene Vorgabe, wenn die Option fehlt', paketAusOption({ pakete: {}, vorgabe: ['back'] })(pos([])).bezahlt, ['back']);
    ist('paketAusOption: die Rückgabe ist eine Kopie (das Paket der Fabrik wird nicht verändert)', (() => { const l = ['back']; const f = paketAusOption({ pakete: { A: l } }); const r = f(pos([{ name: 'Druck', value: 'A' }])).bezahlt; r.push('x'); return l; })(), ['back']);
  }
  {
    // Plan mit dem Standard-Paket (cfg {}): T-Shirt 71 mit Rückseite
    const zr = (extra = {}) => zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (back)', U('h')), karte6(['front', 'back'], { dt: { front: 'default' }, ap: 6.1 })], ...extra });
    const io = mkIo();
    const p = await planeBestellung(bestellung([zr()]), io, {});
    ist('Plan Standard-Paket: Vorder- UND Rückseite gedruckt, nur die Vorderseite bezahlt → HARTER Befund «aufpreis-unbezahlt», KEIN Artikel, keine Katalog-, Datei- oder KI-Abfrage nach dem Befund', [arten(p.befunde), p.befunde[0]?.hart, p.items.length, io.log.produkt, io.log.druck, io.log.kopf, io.log.kontrolle], [['aufpreis-unbezahlt'], true, 0, [4025], [], [], []]);
    const ohneAp = await planeBestellung(bestellung([zr({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (back)', U('h')), karte6(['front', 'back'], { dt: { front: 'default' }, ap: 0 })] })]), mkIo(), {});
    ist('Plan: die Angabe _pod_karte.ap (Browserwert) deckt nichts, auch nicht mit ap 0 oder ap 6.1: weiter hart', [arten(ohneAp.befunde), ohneAp.items.length], [['aufpreis-unbezahlt'], 0]);
    const nurVorn = await planeBestellung(bestellung([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), karte6(['front'], { dt: { front: 'default' }, ap: 99 })] })]), mkIo(), {});
    ist('Plan: nur die Vorderseite mit erfundenem ap 99 → kein Befund (ap erzeugt nie einen Befund)', [nurVorn.befunde, nurVorn.items.length], [[], 1]);
    const bez = await planeBestellung(bestellung([zr()]), mkIo(), { paket: () => ({ bezahlt: ['back'], quelle: 'Test' }) });
    ist('Plan mit bezahlter Rückseite: kein Befund, Artikel mit den Dateien «default» und «back»', [bez.befunde, bez.items[0].files.map((f) => f.type)], [[], ['default', 'back']]);
    const aermel = await planeBestellung(bestellung([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (sleeve_left)', U('a')), A('🖼️ Druckdatei (sleeve_right)', U('b')), karte6(['front', 'sleeve_left', 'sleeve_right'], { dt: { front: 'default' } })] })]), mkIo(), { paket: () => ({ bezahlt: ['sleeve_left'], quelle: 'Test' }) });
    ist('Plan: linker Ärmel bezahlt, rechter Ärmel nicht → hart, genau «sleeve_right»', [arten(aermel.befunde), aermel.befunde.length, /Gedruckt würde «sleeve_right»/.test(aermel.befunde[0]?.text), /bezahlt: sleeve_left/.test(aermel.befunde[0]?.text)], [['aufpreis-unbezahlt'], 1, true, true]);
    const unb = await planeBestellung(bestellung([zr()]), mkIo(), { paket: () => ({ bezahlt: null, quelle: 'Test' }) });
    ist('Plan: eine Paket-Funktion, die null liefert → hart (Paket nicht bestimmbar)', [arten(unb.befunde), unb.items.length], [['aufpreis-unbezahlt'], 0]);
    const kaputt = await planeBestellung(bestellung([zr()]), mkIo(), { paket: () => null });
    ist('Plan: eine Paket-Funktion, die nichts Brauchbares liefert (null) → wie «nicht bestimmbar», nie «alles bezahlt»', arten(kaputt.befunde), ['aufpreis-unbezahlt']);
    const opt = await planeBestellung(bestellung([zr({ variant: { sku: '5599797_4025', selectedOptions: [{ name: 'Druck', value: 'Vorder- und Rückseite' }] } })]), mkIo(), { paket: paketAusOption({ pakete: { 'Vorder- und Rückseite': ['back'] } }) });
    ist('Plan mit Paket aus der Option «Druck» (Variante trägt «Vorder- und Rückseite»): kein Befund', opt.befunde, []);
    const opt2 = await planeBestellung(bestellung([zr({ variant: { sku: '5599797_4025', selectedOptions: [{ name: 'Druck', value: 'Nur Vorderseite' }] } })]), mkIo(), { paket: paketAusOption({ pakete: { 'Nur Vorderseite': [], 'Vorder- und Rückseite': ['back'] } }) });
    ist('Plan mit Paket aus der Option «Druck» (Variante trägt «Nur Vorderseite», gedruckt wird die Rückseite) → hart', arten(opt2.befunde), ['aufpreis-unbezahlt']);
    // Katalog nicht lesbar: der Preis der Rückseite ist unbekannt
    const nl = await planeBestellung(bestellung([zr()]), mkIo({ produkt: () => NICHT_LESBAR }), {});
    ist('Plan: Printful-Variante nicht lesbar (Rückfall): Rückseite mit unbekanntem Preis → weich «aufpreis-unbekannt» (die Platzierung ist ohnehin nicht gesichert)', [arten(nl.befunde).includes('aufpreis-unbekannt'), nl.befunde.filter((b) => b.art === 'aufpreis-unbekannt').every((b) => !b.hart)], [true, true]);
    // die Paket-Funktion bekommt die Position und Kontext
    let gesehen = null;
    await planeBestellung(bestellung([zr()]), mkIo(), { paket: (position, k) => { gesehen = [position.id, k.vid, k.produktId]; return { bezahlt: ['back'], quelle: 't' }; } });
    ist('Paket-Funktion bekommt die Position und den Kontext (Printful-Variante, Printful-Produkt)', gesehen, [ID1, 4025, 71]);
  }

  // ── (d) Kosten-Obergrenze
  {
    const c = (total, extra = {}) => ({ currency: 'USD', subtotal: '7.75', discount: '0.00', shipping: '10.49', tax: '1.47', vat: '0.00', total: String(total), ...extra });
    const k = (o) => kostenPruefen({ costs: c(20), erloesChf: 90, ...o });
    ist('Obergrenze: Summe 20 USD über der Grenze 19.99 → weich «kosten-obergrenze» mit beiden Zahlen', [k({ maxUsd: 19.99 }).ok, k({ maxUsd: 19.99 }).art, /20\.00/.test(k({ maxUsd: 19.99 }).text), /19\.99/.test(k({ maxUsd: 19.99 }).text), /PRINTFUL_MAX_KOSTEN_USD/.test(k({ maxUsd: 19.99 }).text)], [false, 'kosten-obergrenze', true, true, true]);
    ist('Obergrenze: Summe genau gleich der Grenze ist erlaubt (Grenze ist «über»)', k({ maxUsd: 20 }).ok, true);
    ist('Obergrenze: aus bei null, 0, undefined, Text, negativ, NaN (Vorgabe aus)', [null, 0, undefined, 'abc', -5, NaN, '', false].map((m) => k({ maxUsd: m }).ok), Array(8).fill(true));
    ist('Obergrenze als Text («19.99») gilt', k({ maxUsd: '19.99' }).art, 'kosten-obergrenze');
    ist('Obergrenze gilt auch ohne bekannten Erlös (Erlös null → sonst «kosten-unbekannt»)', [kostenPruefen({ costs: c(20), erloesChf: null, maxUsd: 10 }).art, kostenPruefen({ costs: c(20), erloesChf: null }).art], ['kosten-obergrenze', 'kosten-unbekannt']);
    ist('Obergrenze: noch nicht gerechnete Kosten bleiben «kosten-unbekannt» (kein Freispruch, keine Obergrenze ohne Summe)', [kostenPruefen({ costs: c(20, { calculation_status: 'calculating' }), erloesChf: 90, maxUsd: 10 }).art, kostenPruefen({ costs: c(''), erloesChf: 90, maxUsd: 10 }).art], ['kosten-unbekannt', 'kosten-unbekannt']);
    ist('Obergrenze ist kein Freispruch: darunter gilt der Mindestgewinn weiter (Verlust bleibt «kosten»)', [kostenPruefen({ costs: c(20), erloesChf: 17.9, maxUsd: 500 }).art, kostenPruefen({ costs: c(20), erloesChf: 90, maxUsd: 500 }).ok], ['kosten', true]);
    ist('Obergrenze rechnet die Summe der Karte (inklusive Versand und Steuer), nicht die Ware ohne Steuer', kostenPruefen({ costs: c(20, { tax: '5.00' }), erloesChf: 200, maxUsd: 19 }).art, 'kosten-obergrenze');
  }

  // ── weitere Randfälle der Aufpreis- und qd-Prüfung (Mutationsprobe: jede Zeile schliesst eine Lücke)
  {
    const ap = (typen, bezahlt, roh) => aufpreisPruefen({ roh, typen, bezahlt }).map((b) => `${b.hart ? 'H' : 'w'}:${b.art}`);
    ist('aufpreisPruefen: auch ein kleiner Aufpreis (Etikett innen 0.99 USD) braucht ein bezahltes Paket', [ap(['label_inside'], [], KAT[71].produkt), ap(['label_inside'], ['label_inside'], KAT[71].produkt)], [['H:aufpreis-unbezahlt'], []]);
    ist('aufpreisPruefen: die Platzierung wird auch über ihren Typnamen gedeckt (Kappe 206: Datei-ID «back» hat den Typ «embroidery_back», Aufpreis 2.95)', [ap(['back'], ['embroidery_back'], KAT[206].produkt), ap(['back'], ['back'], KAT[206].produkt), ap(['back'], ['embroidery_front'], KAT[206].produkt)], [[], [], ['H:aufpreis-unbezahlt']]);
    ist('aufpreisUsd: bei mehreren Einträgen für dieselbe Platzierung zählt der höchste Preis, in jeder Reihenfolge', [aufpreisUsd({ files: [{ id: 'a', type: 'back', additional_price: '4' }, { id: 'back', type: 'back', additional_price: '1.5' }] }, 'back'), aufpreisUsd({ files: [{ id: 'a', type: 'back', additional_price: '1.5' }, { id: 'back', type: 'back', additional_price: '4' }] }, 'back')], [4, 4]);
    ist('aufpreisUsd: ein Katalog mit leerer Dateiliste ist «unbekannt», nicht 0', [aufpreisUsd({ files: [] }, 'back'), aufpreisUsd({ files: [{ id: 'preview', type: 'mockup', additional_price: null }] }, 'preview')], [null, null]);
    ist('aufpreisPruefen: eine Platzierung, die der Katalog nicht kennt, ist kein Aufpreis, aber der Preis ist unbekannt (weich, ausser Vorderseite)', [ap(['gibt_es_nicht'], [], KAT[71].produkt), ap(['front'], [], { files: [] })], [['w:aufpreis-unbekannt'], []]);
  }
  {
    // qd gegen die abgerundete Messung: eine Datei von 1795×2395 px misst 149,58 dpi; der Editor schreibt qd abgerundet (149), nicht gerundet (150)
    const messung = aufloesungPruefen({ masse: { breite: 1795, hoehe: 2395 }, druckdatei: { breite: 1800, hoehe: 2400, dpi: 150, fillMode: 'fit' }, minDpi: 75 }).dpi;
    ist('Voraussetzung des Abrundungs-Tests: die Messung liegt bei x,5 oder höher (Abrunden und Runden unterscheiden sich)', [Math.floor(messung), Math.round(messung)], [149, 150]);
    const mk = (qd, px) => plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), karte6(['front'], { dt: { front: 'default' }, qd })] })], mkIo({ kopf: () => ({ status: 200, bytes: png(...px) }) }));
    ist('qd = abgerundete Messung (149 bei 149,58 dpi) → kein qd-Befund', arten((await mk(149, [1795, 2395])).befunde), []);
    ist('qd = gerundete Messung (150 bei 149,58 dpi) → «qd-weicht-ab» (der Editor rundet nie auf)', arten((await mk(150, [1795, 2395])).befunde), ['qd-weicht-ab']);
    // Mindestwert allein (ohne vollständige Messung): zwei Platzierungen, eine Datei nicht lesbar → kein Vergleich mit der Messung, aber qd 50 < 75 bleibt ein Befund
    const teil = (qd) => plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (back)', U('h')), karte6(['front', 'back'], { dt: { front: 'default' }, qd })] })], mkIo({ kopf: (url) => ({ status: 200, bytes: url === U('v') ? png(1800, 2400) : Buffer.from('<html>') }) }));
    ist('qd 50 unter dem Mindestwert 75, eine der zwei Dateien nicht messbar → «qd-weicht-ab» (nur wegen des Mindestwerts) neben «aufloesung»', [arten((await teil(50)).befunde), /unter dem Mindestwert 75/.test((await teil(50)).befunde.find((b) => b.art === 'qd-weicht-ab')?.text || ''), /gemessen/.test((await teil(50)).befunde.find((b) => b.art === 'qd-weicht-ab')?.text || '')], [['aufloesung', 'qd-weicht-ab'], true, false]);
    ist('qd genau auf dem Mindestwert (75) und eine Datei nicht messbar → kein qd-Befund', arten((await teil(75)).befunde), ['aufloesung']);
    ist('qd weicht ab: der Befund ist weich und die Meldung bleibt unter 400 Zeichen', (await mk(150, [1795, 2395])).befunde.every((b) => !b.hart && b.text.length < 400), true);
    // zwei Platzierungen mit verschiedener Dichte: qd ist das MINIMUM über alle Fotos, verglichen wird mit dem Minimum der Messungen (nicht mit dem Maximum)
    const zwei = (qd) => plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (back)', U('h')), karte6(['front', 'back'], { dt: { front: 'default' }, qd })] })], mkIo({ kopf: (url) => ({ status: 200, bytes: url === U('v') ? png(1800, 2400) : png(900, 1200) }) }));
    ist('Dateien mit 150 und 75 dpi, qd 75 (= Minimum der Messungen) → kein qd-Befund; qd 150 (= Maximum) → «qd-weicht-ab»', [arten((await zwei(75)).befunde), arten((await zwei(150)).befunde)], [[], ['qd-weicht-ab']]);
    // ein Widerspruch der Karte (m) hält die Position an, ohne dass der Aufpreis noch einen zweiten Befund meldet (der Widerspruch steht allein)
    const wid = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (back)', U('h')), karte6(['front', 'back'], { dt: { front: 'default' }, m: 19, pv: 4025 })] })], mkIo(), {});
    ist('Karte nennt Produkt 19, die Variante gehört zu 71, dazu eine unbezahlte Rückseite → NUR «karte-widerspruch» (die Position wird nach dem Widerspruch nicht weiter geprüft)', [arten(wid.befunde), wid.items.length], [['karte-widerspruch'], 0]);
  }
}

// ═══════════════════════════════════════ Editor 6.4.0 Ende zu Ende: die ECHTEN Warenkorb-Eigenschaften (Mitschnitt des Editors in Chromium, mitschnitt_erzeugen.mjs)
{
  const M = lade('../../dropship/selbst-gestalten-fertig-0511/bestellweg/editor_640_mitschnitt.json');
  const fall = (n) => M.faelle.find((f) => f.name === n);
  const editorDatei = fileURLToPath(new URL('../../pod/v6/lspod-designer-v6-6.4.0.js', import.meta.url));
  ist('E2E: der Mitschnitt stammt von Editor 6.4.0, ohne Seitenfehler im Browser', [M.editorVersion, M.faelle.length, M.faelle.every((f) => f.seitenfehler.length === 0)], ['6.4.0', 6, true]);
  if (existsSync(editorDatei)) ist('E2E: der Mitschnitt gehört zur Editor-Datei im Repo (sha256; die Datei ist unveränderlich, bei einer neuen Fassung den Mitschnitt neu erzeugen)', M.editorSha256, createHash('sha256').update(readFileSync(editorDatei)).digest('hex'));
  else console.log('(pod/v6/lspod-designer-v6-6.4.0.js nicht ausgecheckt → Abgleich der Editor-Datei übersprungen)');
  const attr = (f) => Object.entries(f.anfrage.properties).map(([key, value]) => A(key, value));
  const png = (b, h) => { const x = Buffer.alloc(64); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(x); x.writeUInt32BE(13, 8); x.write('IHDR', 12, 'latin1'); x.writeUInt32BE(b, 16); x.writeUInt32BE(h, 20); return x; };
  const aufbau = (f, o = {}) => {
    const modell = f.name.startsWith('tasse') ? 19 : 71, vid = f.anfrage.properties._pod_karte ? JSON.parse(f.anfrage.properties._pod_karte).pv : null;
    const sku = o.sku || `${SKU_BASIS + modell}_${vid}`;
    const z = zeile({ sku, variant: { sku }, title: modell === 19 ? 'Keramik-Tasse selbst gestalten' : 'T-Shirt selbst gestalten', customAttributes: o.attrs || attr(f) });
    const io = mkIo({ produkt: () => prodVon(modell), kopf: (url) => { const u = f.uploads.find((x) => x.url === url); return u && u.breite ? { status: 200, bytes: png(u.breite, u.hoehe) } : { status: 404, bytes: null }; } });
    return { z, io, modell };
  };
  const plan = async (f, cfg, o) => { const { z, io } = aufbau(f, o); const p = await planeBestellung(bestellung([z]), io, cfg); return { p, io }; };
  const kurz = (b) => b.map((x) => `${x.hart ? 'H' : 'w'}:${x.art}`);
  const typen = (p) => (p.items[0] ? p.items[0].files.map((x) => x.type) : []);

  // Eigenschaften lesen: Schlüssel und Werte so, wie der Editor sie schreibt
  for (const f of M.faelle) {
    const r = dateienAusEigenschaften(attr(f));
    const k = r.karte;
    ist(`E2E ${f.name}: der Parser liest die echten Eigenschaften ohne Problem (Schlüssel «🖼️ Druckdatei (<ID>)», Karte v6)`, [r.probleme, k && k.v, r.dateien.every((d) => d.quelle === 'v6' && d.schluessel === 'alt')], [[], 6, true]);
    ist(`E2E ${f.name}: «_vorschau» ist vorhanden und wird nie als Druckdatei gelesen (Dateien = Platzierungen der Karte)`, [Object.keys(f.anfrage.properties).includes('_vorschau'), r.dateien.length, r.dateien.map((d) => d.platzierung)], [true, k.pl.length, k.pl]);
    ist(`E2E ${f.name}: «🎨 Design (<ID>)» steht für jede Platzierung (Text für Menschen), der Parser ignoriert ihn`, [k.pl.every((id) => Object.keys(f.anfrage.properties).includes(`🎨 Design (${id})`)), Object.keys(f.anfrage.properties).filter((x) => /^🎨 Design/.test(x)).length], [true, k.pl.length]);
  }
  ist('E2E: Rückseite und Ärmel stehen unter den ID-Schlüsseln «back» und «sleeve_left» (mit Unterstrich) und werden als solche gelesen', [dateienAusEigenschaften(attr(fall('t-shirt-71-vorne-foto-und-ruecken-text'))).dateien.map((d) => [d.platzierung, d.dateiTyp, d.seite]), dateienAusEigenschaften(attr(fall('t-shirt-71-vorne-text-und-aermel'))).dateien.map((d) => [d.platzierung, d.dateiTyp, d.seite])],
    [[['front', 'default', 'front'], ['back', 'back', 'back']], [['front', 'default', 'front'], ['sleeve_left', 'sleeve_left', null]]]);

  // Pläne
  {
    const { p, io } = await plan(fall('t-shirt-71-vorne-text'), {});
    ist('E2E T-Shirt vorne, nur Text: kein Befund, ein Artikel mit Typ «default», Variante 4025, nur die Druckdatei abgerufen (nicht die Vorschau)', [p.befunde, typen(p), p.items[0]?.variant_id, io.log.kopf.length, io.log.kopf.every((u) => u === fall('t-shirt-71-vorne-text').anfrage.properties['🖼️ Druckdatei (front)']), io.log.kontrolle.length], [[], ['default'], 4025, 1, true, 1]);
    ist('E2E T-Shirt vorne, nur Text: _pod_karte trägt kein qd (kein Foto), das fehlende qd ist kein Befund', [JSON.parse(fall('t-shirt-71-vorne-text').anfrage.properties._pod_karte).qd, p.befunde.length], [undefined, 0]);
  }
  {
    const f = fall('t-shirt-71-vorne-foto-1200');
    const { p } = await plan(f, {});
    ist('E2E T-Shirt vorne, Foto 1200×1200: qd 150 = die Dichte der Druckdatei (1800×2400 bei 150 dpi) → kein Befund', [JSON.parse(f.anfrage.properties._pod_karte).qd, p.befunde, typen(p)], [150, [], ['default']]);
  }
  {
    // BEKANNTER FEHLALARM, hier festgehalten (Fund Phase 1, 09.11.2026): qd ist die dpi des FOTOS (kleinste Auflösung aller Fotos, höchstens die Dichte der Druckdatei), die Druckdatei selbst hat immer ihre eigene Dichte (150).
    // Ein Foto von 500×500 px (qd 83, über der Sperre 75 des Editors) ist ein erlaubter Kauf, löst aber «qd-weicht-ab» aus, weil `qd !== abgerundete Messung der Datei` gilt (PR #3031). Folge: weich, Entwurf, Telegram-Meldung, kein Bestätigen.
    // Ändert jemand die Regel (Vorschlag: nur qd UNTER dem Katalog-Minimum oder ÜBER der Messung melden), muss dieser Test bewusst mit angepasst werden.
    const f = fall('t-shirt-71-vorne-foto-500');
    const { p } = await plan(f, {});
    ist('E2E T-Shirt vorne, Foto 500×500: qd 83 (Editor erlaubt den Kauf, Minimum 75) → heute weicher Befund «qd-weicht-ab» (BEKANNTER FEHLALARM, siehe Kommentar), der Artikel bleibt', [JSON.parse(f.anfrage.properties._pod_karte).qd, kurz(p.befunde), /83/.test(p.befunde[0]?.text || '') && /150/.test(p.befunde[0]?.text || ''), p.items.length], [83, ['w:qd-weicht-ab'], true, 1]);
  }
  {
    const f = fall('t-shirt-71-vorne-foto-und-ruecken-text');
    const { p, io } = await plan(f, {});
    ist('E2E T-Shirt mit Rückseite, Standard-Paket (nur Vorderseite bezahlt): HARTER Befund «aufpreis-unbezahlt», kein Artikel, nach dem Befund keine Datei-/KI-Abfrage', [kurz(p.befunde), p.items.length, io.log.kopf, io.log.kontrolle], [['H:aufpreis-unbezahlt'], 0, [], []]);
    ist('E2E: der angezeigte Aufpreis ap (6.1) steht in der Karte und deckt trotzdem nichts', JSON.parse(f.anfrage.properties._pod_karte).ap, 6.1);
    const bez = await plan(f, { paket: () => ({ bezahlt: ['back'], quelle: 'Test' }) });
    ist('E2E T-Shirt mit Rückseite, Rückseite bezahlt: kein Befund, Dateien «default» und «back», beide abgerufen und kontrolliert, qd 150 passt zur Messung', [bez.p.befunde, typen(bez.p), bez.io.log.kopf.length, bez.io.log.kontrolle.length], [[], ['default', 'back'], 2, 2]);
    const falsch = JSON.parse(JSON.stringify(f.anfrage.properties)); falsch._pod_karte = JSON.stringify({ ...JSON.parse(falsch._pod_karte), ap: 0 });
    const lüge = await plan(f, {}, { attrs: Object.entries(falsch).map(([key, value]) => A(key, value)) });
    ist('E2E: ein im Browser auf ap 0 gesetzter Aufpreis ändert nichts (weiter hart)', kurz(lüge.p.befunde), ['H:aufpreis-unbezahlt']);
  }
  {
    const f = fall('t-shirt-71-vorne-text-und-aermel');
    const { p } = await plan(f, {});
    ist('E2E T-Shirt mit linkem Ärmel, Standard-Paket → hart, der Text nennt «sleeve_left» (2.49 USD)', [kurz(p.befunde), /sleeve_left/.test(p.befunde[0]?.text), /2\.49 USD/.test(p.befunde[0]?.text)], [['H:aufpreis-unbezahlt'], true, true]);
    const bez = await plan(f, { paket: () => ({ bezahlt: ['sleeve_left'], quelle: 'Test' }) });
    ist('E2E T-Shirt mit linkem Ärmel, Ärmel bezahlt: kein Befund, Dateien «default» und «sleeve_left» (600×525 px = die Ärmel-Druckdatei bei 150 dpi)', [bez.p.befunde, typen(bez.p)], [[], ['default', 'sleeve_left']]);
  }
  {
    const f = fall('tasse-19-text');
    const { p } = await plan(f, {});
    ist('E2E Tasse (Printful 19, SKU 9100019_1320): kein Befund, Typ «default», Variante 1320; die Tasse hat keinen Aufpreis, das Standard-Paket genügt', [p.befunde, typen(p), p.items[0]?.variant_id], [[], ['default'], 1320]);
  }
  {
    // die Karte nennt Produkt und Variante des Kaufs: gleicht sie die SKU an, passt alles; ein anderer SKU-Wert ist hart
    const f = fall('t-shirt-71-vorne-text');
    const k = JSON.parse(f.anfrage.properties._pod_karte);
    ist('E2E: pv und m der Karte (Editor 6.4.0) gleichen der SKU des gekauften Produkts', [k.m, k.pv], [71, 4025]);
    const andere = await plan(f, {}, { sku: '9100071_8923' });
    ist('E2E: ist die gekaufte SKU eine andere Variante (8923) als die Karte (4025) → hart «karte-widerspruch», kein Artikel', [kurz(andere.p.befunde), andere.p.items.length], [['H:karte-widerspruch'], 0]);
    const anderes = await plan(f, {}, { sku: '9100019_4025' });
    ist('E2E: ist die SKU ein anderes Modell (19) als m der Karte (71) → hart «karte-widerspruch»', [kurz(anderes.p.befunde).includes('H:karte-widerspruch'), anderes.p.items.length], [true, 0]);
  }
  {
    // die ganze Bestellung am Dienst-Standort: der Sync legt nichts an, auch wenn Design und Karte stimmen
    const f = fall('t-shirt-71-vorne-text');
    const { z, io } = aufbau(f);
    const p = await planeBestellung(bestellung([z], { fulfillmentOrders: fulfillmentOrders([z.id], FO_DIENST) }), io, {});
    ist('E2E: dasselbe T-Shirt am Dienst-Standort «Printful» → hart «dienst-standort», kein Artikel, keine Netzabfrage', [kurz(p.befunde), p.items.length, io.log.produkt, io.log.kopf], [['H:dienst-standort'], 0, [], []]);
  }
}

// ═══════════════════════════════════════ Nachtrag 10.11.2026: Ausmass der harten Sperre «dienst-standort» (Funde der Gegenleser p1-bestellweg)
// Die Sperre ist kein Randfall: 11 der 17 aktiven Editor-Produkte haben Varianten am Fulfillment-Service-Standort «Printful», bei 4 davon liegen nur einige Varianten dort (geteilt).
// Die Rohdaten der Messung stehen in standort_messung_1011.json; SYNC.md (Abschnitt 7.2 und 7.8) und die README müssen dieselben Zahlen nennen, damit der Besitzer-Entscheid auf ihnen beruht.
{
  const S = lade('../../dropship/selbst-gestalten-fertig-0511/bestellweg/standort_messung_1011.json');
  const aktiv = S.produkte.filter((p) => p.status === 'ACTIVE' && p.tagWunschdesign);
  const amDienst = aktiv.filter((p) => p.amDienst > 0), geteilt = amDienst.filter((p) => p.amDienst < p.varianten);
  const summe = (l, f) => l.reduce((a, p) => a + p[f], 0);
  const varianten = summe(aktiv, 'varianten'), variantenDienst = summe(aktiv, 'amDienst');
  ist('Standort-Messung: die Rohdaten sind in sich stimmig (Dienst + Händler = Varianten, wo beide gelesen sind; nie mehr als die Varianten; geteilt nur mit gelesenen Händler-Varianten)', S.produkte.filter((p) => (p.amHaendler !== null ? p.amDienst + p.amHaendler !== p.varianten : p.amDienst > p.varianten) || (p.amDienst > 0 && p.amDienst < p.varianten && p.amHaendler === null)).map((p) => p.handle), []);
  ist('Standort-Messung: Zahlen aus den Rohdaten (aktive Editor-Produkte, davon mit Varianten am Dienst, davon geteilt; Varianten, davon am Dienst)', [aktiv.length, amDienst.length, geteilt.length, varianten, variantenDienst], [17, 11, 4, 213, 53]);
  ist('Standort-Messung: bei jedem geteilten Produkt liegt die ERSTE Variante am Dienst-Standort (sie wäre die Vorauswahl, wenn die Produktseite nach Position wählt: ungemessen)', geteilt.map((p) => p.ersteVarianteAmDienst), [true, true, true, true]);
  ist('Standort-Messung: Bestellungen #1003 bis #1039 gelesen, keine mit Fulfillment-Order am Dienst-Standort, #1017 ohne Fulfillment-Order', [S.bestellungen.gelesen, S.bestellungen.mitFulfillmentOrder + S.bestellungen.ohneFulfillmentOrder.length, S.bestellungen.amDienstStandort, S.bestellungen.ohneFulfillmentOrder], [37, 37, 0, ['#1017']]);
  // die Texte nennen dieselben Zahlen (SYNC.md liegt im CI-Auszug nicht aus: dann übersprungen)
  const nennt = [`${amDienst.length} von ${aktiv.length} aktiven Editor-Produkten`, `${variantenDienst} von ${varianten} Varianten`, `${geteilt.length} davon geteilt`, `GEMESSEN ${S.stand.datum}`];
  for (const [name, rel, extra] of [['SYNC.md', '../../dropship/wp6-0611/SYNC.md', true], ['README.md des Bestellwegs', '../../dropship/selbst-gestalten-fertig-0511/bestellweg/README.md', false]]) {
    const pfad = fileURLToPath(new URL(rel, import.meta.url));
    if (!existsSync(pfad)) { console.log(`(${name} nicht ausgecheckt → Zahlen-Abgleich übersprungen)`); continue; }
    const t = readFileSync(pfad, 'utf8');
    ist(`Standort-Messung: ${name} nennt das Ausmass (${nennt.join('; ')})`, nennt.filter((s) => !t.includes(s)), []);
    if (extra) ist('Standort-Messung: SYNC.md sagt nicht mehr «nicht gezählt» und nennt das Messrezept sowie die Voraussetzung vor der Freigabedatei', [/nicht\*\* gezählt/.test(t), /inventoryLevels/.test(t), /Vor der Freigabedatei/.test(t)], [false, true, true]);
  }
}

// Workflow: ein Zeitplan, Handstart standardmässig nur lesen, Einstellungen durchgereicht (GL1/GL2 Funde 2, 3, 9)
{
  const wf = fileURLToPath(new URL('../../.github/workflows/printful-sync.yml', import.meta.url));
  if (existsSync(wf)) {
    const t = readFileSync(wf, 'utf8');
    const aktiv = t.split('\n').filter((l) => /^\s*-\s*cron:/.test(l));
    ist('Workflow: höchstens EIN aktiver Zeitplan (Repo-Regel «Crons einzeln, max. 1×/Tag», SHARED-MEMORY Cron-Nulldiät)', aktiv.length <= 1, true);
    ist('Workflow: der Handstart steht standardmässig auf «Nur testen» (ein Klick ohne Haken schreibt nichts)', /dry_run:[\s\S]*?default: true/.test(t), true);
    for (const v of ['PRINTFUL_MIN_NETTO_CHF', 'PRINTFUL_STITCH_COLOR', 'PRINTFUL_DATEI_HOSTS', 'PRINTFUL_KI_MODELL', 'PRINTFUL_KI_KONTROLLE', 'PRINTFUL_AUTO_CONFIRM']) ist(`Workflow reicht ${v} durch`, new RegExp(v + ': \\$\\{\\{').test(t), true);
    ist('Workflow: der Zeitplan schreibt nur mit der Freigabedatei', /EREIGNIS" = "schedule"[\s\S]*?PRINTFUL-SYNC-FREI\.txt/.test(t), true);
    // WP6 (06.11.2026): Standardwerte und Durchreichen der Entscheide des Besitzers
    ist('Workflow WP6: PRINTFUL_AUTO_CONFIRM hat den Standard «0» (Besitzer-Entscheid 05.11.: Printful-Aufträge bleiben Entwürfe, bis er es ändert)', /PRINTFUL_AUTO_CONFIRM: \$\{\{ secrets\.PRINTFUL_AUTO_CONFIRM \|\| vars\.PRINTFUL_AUTO_CONFIRM \|\| '0' \}\}/.test(t), true);
    ist('Workflow WP6: PRINTFUL_KI_KONTROLLE hat den Standard «aus» (Besitzer-Entscheid 05.11.: erste Aufträge von Hand sichten)', /PRINTFUL_KI_KONTROLLE: \$\{\{ secrets\.PRINTFUL_KI_KONTROLLE \|\| vars\.PRINTFUL_KI_KONTROLLE \|\| 'aus' \}\}/.test(t), true);
    ist('Workflow WP6: PRINTFUL_MIN_NETTO_CHF kommt aus Secret oder Variable und hat KEINEN eigenen Standardwert (leer = der Standard des Skripts, 4 CHF)', /PRINTFUL_MIN_NETTO_CHF: \$\{\{ secrets\.PRINTFUL_MIN_NETTO_CHF \|\| vars\.PRINTFUL_MIN_NETTO_CHF \}\}/.test(t), true);
    ist('Workflow Phase 1: PRINTFUL_MAX_KOSTEN_USD kommt aus Secret oder Variable und hat KEINEN Standardwert (leer = Obergrenze aus)', /PRINTFUL_MAX_KOSTEN_USD: \$\{\{ secrets\.PRINTFUL_MAX_KOSTEN_USD \|\| vars\.PRINTFUL_MAX_KOSTEN_USD \}\}/.test(t), true);
    ist('Workflow Phase 1: PRINTFUL_PAKET_BEZAHLT wird bewusst NICHT durchgereicht (das bezahlte Paket ist keine Einstellung des Workflows)', /PRINTFUL_PAKET_BEZAHLT/.test(t.replace(/#[^\n]*/g, '')), false);
    ist('Workflow WP6: der Handstart ist der einzige scharfe Weg ohne Freigabedatei (Eingabe «dry_run», Standard true), die Datei bleibt Bedingung des Zeitplans', [/workflow_dispatch:/.test(t), /type: boolean\s+default: true/.test(t)], [true, true]);
    // jede Datei, die Sync und Bibliothek einlesen, muss im sparse-checkout stehen (sonst «Cannot find module» im Lauf)
    {
      const lies = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
      const importe = (quelle, basis) => [...quelle.matchAll(/from '(\.\/[^']+\.mjs)'/g)].map((m) => (basis + m[1].slice(2)));
      const noetig = ['automation/printful_sync.mjs', ...importe(lies('../printful_sync.mjs'), 'automation/'), ...importe(lies('./printful_bestellweg.mjs'), 'automation/lib/'), ...importe(lies('./printful_platzierung.mjs'), 'automation/lib/')];
      const fehlen = [...new Set(noetig)].filter((x) => !t.includes('            ' + x + '\n'));
      ist('Workflow WP6: alle Dateien, die der Sync einliest, stehen im sparse-checkout', fehlen, []);
    }
  } else console.log('(Workflow-Datei nicht ausgecheckt → Workflow-Prüfungen übersprungen)');
}

// ═══════════════════════════════════════ HÄRTUNG 10.11.2026 (Gegenprüfung P1, 27 bestätigte Funde): reine Logik der neuen Regeln
// Grundsatz: wo Geld bewegt wird, ist Unbekanntes, Unlesbares und Fehlendes nie «in Ordnung».
{
  // ── Adresse (Fund 3): eigene Cloud unter /image/upload/, kein Port, kein Rückstrich, Host exakt
  const fremd = 'Cloudinary-Adresse nicht aus der eigenen Cloud unter /image/upload/';
  for (const [n, w, soll] of [
    ['fremde Cloudinary-Cloud', 'https://res.cloudinary.com/andere-cloud/image/upload/v1/a.png', fremd],
    ['Cloud-Name nur als Präfix einer fremden Cloud', 'https://res.cloudinary.com/dwyi6kkrl2/image/upload/v1/a.png', fremd],
    ['/image/fetch/ holt eine Fremdadresse', 'https://res.cloudinary.com/dwyi6kkrl/image/fetch/https%3A%2F%2Fevil.example%2Fx.png', fremd],
    ['video/upload statt image/upload', 'https://res.cloudinary.com/dwyi6kkrl/video/upload/v1/a.mp4', fremd],
    ['Pfad ohne Cloud-Name', 'https://res.cloudinary.com/image/upload/v1/a.png', fremd],
    ['Port', 'https://res.cloudinary.com:8443/dwyi6kkrl/image/upload/v1/a.png', 'Adresse enthält einen Port'],
    ['Rückstrich-Trick (WHATWG liest den Host als res.cloudinary.com)', 'https://res.cloudinary.com\\@evil.example/dwyi6kkrl/image/upload/a.png', 'Adresse enthält einen Rückstrich'],
    ['Host mit Endung xres.cloudinary.com', 'https://xres.cloudinary.com/dwyi6kkrl/image/upload/v1/a.png', 'Host «xres.cloudinary.com» ist nicht erlaubt'],
    ['Host res.cloudinary.com.evil.example', 'https://res.cloudinary.com.evil.example/dwyi6kkrl/image/upload/v1/a.png', 'Host «res.cloudinary.com.evil.example» ist nicht erlaubt'],
    ['Shopify-CDN braucht keine Cloud-Bindung', 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/a.png', null],
    ['eigene Cloud mit grossgeschriebenem Host', 'https://RES.CLOUDINARY.COM/dwyi6kkrl/image/upload/v1/a.png', null],
  ]) ist(`Adresse Fund 3: ${n}`, adresseProblem(w), soll);
  ist('Adresse Fund 3: mit `eigeneCloud: false` (Produkt-Metafeld des Besitzers) entfällt nur die Pfadbindung, nicht Host, Port, Rückstrich', [adresseProblem('https://res.cloudinary.com/andere/image/fetch/x', undefined, { eigeneCloud: false }), adresseProblem('https://res.cloudinary.com:81/a.png', undefined, { eigeneCloud: false }), adresseProblem('https://evil.example/a.png', undefined, { eigeneCloud: false })], [null, 'Adresse enthält einen Port', 'Host «evil.example» ist nicht erlaubt']);
  ist('Adresse Fund 3: adresseNormal liefert die normalisierte Schreibweise (Host klein), die abgerufen und weitergegeben wird', adresseNormal(' https://RES.Cloudinary.com/dwyi6kkrl/image/upload/v1/Gross.PNG '), 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1/Gross.PNG');
  ist('Adresse Fund 3: die eigene Cloud heisst wie im Editor (pod/v6: CLOUD_NAME)', EIGENE_CLOUDINARY_CLOUD, 'dwyi6kkrl');
  const gross = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', 'https://RES.Cloudinary.com/dwyi6kkrl/image/upload/v1/G.png')]);
  ist('Adresse Fund 3: die Datei trägt die NORMALISIERTE Adresse (kleingeschriebener Host)', gross.dateien[0].url, 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1/G.png');
  const eigene = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', 'https://res.cloudinary.com/andere/image/upload/v1/G.png')]);
  ist('Adresse Fund 3: Druckdatei aus fremder Cloudinary-Cloud → harter Befund «datei-adresse», keine Datei', [arten(eigene.probleme), eigene.probleme[0]?.hart, eigene.dateien.length], [['datei-adresse'], true, 0]);
}

{
  // ── Eigenschaften (Fund 2/23): bekannte v5-Schreibweisen bleiben, alles andere mit «Druckdatei» ist ein harter Befund
  for (const [k, seite] of [['🖼 Druckdatei', 'front'], ['Druckdatei', 'front'], ['Print file', 'front'], ['Print file (Back)', 'back'], ['Druckdatei (Hinten)', 'back'], ['Hinten · Druckdatei', 'back'], ['Back · Print file', 'back'], ['🖼 Druckdatei (Vorne)', 'front']]) {
    const r = dateienAusEigenschaften([A(k, U('x'))]);
    ist(`Fund 2/23 bekannte v5-Schreibweise «${k}» → ${seite}, kein Befund`, [r.dateien.map((d) => d.seite), r.probleme], [[seite], []]);
  }
}

{
  // ── Kosten (Fund 8): Währung Pflicht, strenge Zahlen, Untergrenze
  const bew = (costs, extra = {}) => kostenPruefen({ costs, erloesChf: 49.9, nettoMin: 0, ...extra });
  ist('Kosten Fund 8: Währung fehlt oder leer → «kosten-unbekannt» (nie still als USD gelesen)', [bew({ total: '12.70' }).art, bew({ currency: '', total: '12.70' }).art, bew({ currency: '  ', total: '12.70' }).art], ['kosten-unbekannt', 'kosten-unbekannt', 'kosten-unbekannt']);
  ist('Kosten Fund 8: Währung EUR → «kosten-unbekannt» (nennt die Währung), klein geschriebenes «usd» gilt', [bew({ currency: 'EUR', total: '12.70' }).text.includes('EUR'), bew({ currency: 'usd', total: '12.70', tax: '0.95' }).ok], [true, true]);
  for (const [n, t] of [['Hexzahl 0x10', '0x10'], ['1e1', '1e1'], ['Array', ['12.70']], ['true', true], ['Objekt', { a: 1 }], ['Komma 12,70', '12,70'], ['NaN', 'NaN'], ['Infinity', 'Infinity'], ['leer', ''], ['null', null]]) ist(`Kosten Fund 8: Summe «${n}» ist keine Zahl → «kosten-unbekannt»`, bew({ currency: 'USD', total: t }).art, 'kosten-unbekannt');
  ist('Kosten Fund 8: Untergrenze 0.50 USD (darunter keine plausible Summe), genau 0.50 wird weiter gerechnet', [KOSTEN_MIN_USD, bew({ currency: 'USD', total: '0.49' }).art, bew({ currency: 'USD', total: '0.5' }).art, bew({ currency: 'USD', total: 0.001 }).art], [0.5, 'kosten-unbekannt', null, 'kosten-unbekannt']);
  ist('Kosten Fund 8: Steuer als Hexzahl zählt nicht als Abzug (strenge Zahl)', bew({ currency: 'USD', total: '12.70', tax: '0x10' }).kostenChf, bew({ currency: 'USD', total: '12.70' }).kostenChf);
}

{
  // ── Entwurf gegen das Gesendete (Fund 8)
  const gesendet = [{ variant_id: 4025, quantity: 1, files: [{ type: 'front' }] }];
  const dat = (...t) => t.map((x) => ({ type: x, status: 'ok' }));
  ist('Entwurf Fund 8: gleiche Variante, Menge und Dateitypen (plus Vorschau/Mockup) → ok', entwurfVergleichen({ items: [{ variant_id: 4025, quantity: 1, files: [...dat('front'), { type: 'preview' }, { type: 'mockup' }] }] }, gesendet).ok, true);
  ist('Entwurf Fund 8: keine Artikel / null / Zahl der Artikel falsch → Abweichung', [entwurfVergleichen({ items: [] }, gesendet).ok, entwurfVergleichen(null, gesendet).ok, entwurfVergleichen({ items: [{}, {}] }, gesendet).ok, entwurfVergleichen({ items: [{}] }, []).ok], [false, false, false, false]);
  ist('Entwurf Fund 8: andere Variante / andere Menge / anderer Dateityp → Abweichung mit beiden Zahlen im Text', [entwurfVergleichen({ items: [{ variant_id: 999, quantity: 1, files: dat('front') }] }, gesendet).texte.join(' ').match(/999.*4025/) !== null, entwurfVergleichen({ items: [{ variant_id: 4025, quantity: 2, files: dat('front') }] }, gesendet).texte.join(' ').match(/Menge 2.*gesendet wurde 1/) !== null, entwurfVergleichen({ items: [{ variant_id: 4025, quantity: 1, files: dat('back') }] }, gesendet).ok, entwurfVergleichen({ items: [{ variant_id: 4025, quantity: 1, files: dat('front', 'back') }] }, gesendet).ok], [true, true, false, false]);
  ist('Entwurf Fund 8: Printful nennt Variante und Menge noch nicht und hängt noch keine Datei an → kein Widerspruch (das ist «wartet», nicht «abweichend»)', entwurfVergleichen({ items: [{}] }, gesendet).ok, true);
  ist('Entwurf Fund 8: Reihenfolge der Dateien egal', entwurfVergleichen({ items: [{ variant_id: 1, quantity: 1, files: dat('back', 'front') }] }, [{ variant_id: 1, quantity: 1, files: [{ type: 'front' }, { type: 'back' }] }]).ok, true);
}

{
  // ── Zahlung am Knoten (Fund 0/1)
  const gut = { test: false, cancelledAt: null, displayFinancialStatus: 'PAID' };
  for (const [n, k, art] of [
    ['bezahlt, nicht storniert, kein Test', gut, 'ok'], ['PAID klein geschrieben', { ...gut, displayFinancialStatus: 'paid' }, 'ok'],
    ['Testbestellung trotz PAID', { ...gut, test: true }, 'test'], ['storniert', { ...gut, cancelledAt: '2026-11-10T10:00:00Z' }, 'storniert'],
    ['PENDING', { ...gut, displayFinancialStatus: 'PENDING' }, 'nicht-bezahlt'], ['REFUNDED', { ...gut, displayFinancialStatus: 'REFUNDED' }, 'nicht-bezahlt'], ['PARTIALLY_REFUNDED', { ...gut, displayFinancialStatus: 'PARTIALLY_REFUNDED' }, 'nicht-bezahlt'],
    ['AUTHORIZED', { ...gut, displayFinancialStatus: 'AUTHORIZED' }, 'nicht-bezahlt'], ['VOIDED', { ...gut, displayFinancialStatus: 'VOIDED' }, 'nicht-bezahlt'],
    ['test fehlt', { cancelledAt: null, displayFinancialStatus: 'PAID' }, 'unlesbar'], ['test null', { ...gut, test: null }, 'unlesbar'], ['test als Text «false»', { ...gut, test: 'false' }, 'unlesbar'],
    ['cancelledAt fehlt', { test: false, displayFinancialStatus: 'PAID' }, 'unlesbar'], ['displayFinancialStatus fehlt', { test: false, cancelledAt: null }, 'unlesbar'], ['displayFinancialStatus leer', { ...gut, displayFinancialStatus: '' }, 'unlesbar'], ['displayFinancialStatus keine Zeichenkette', { ...gut, displayFinancialStatus: 1 }, 'unlesbar'],
    ['null', null, 'unlesbar'], ['Zahl', 5, 'unlesbar'], ['leeres Objekt', {}, 'unlesbar'],
  ]) { ist(`Zahlung Fund 0/1: ${n} → ${art}`, () => { const r = zahlungPruefen(k); return [r.art, r.ok]; }, [art, art === 'ok']); }
}

{
  // ── Markierung vor dem Anlegen (Fund 6)
  const t0 = Date.UTC(2026, 10, 10, 13, 37, 0);
  ist('Markierung Fund 6: Tag in UTC mit Datum und Uhrzeit, Sperre 60 Minuten', [anlegenTag(t0), ANLEGEN_SPERRE_MIN], ['printful-anlegen-20261110t1337', 60]);
  ist('Markierung Fund 6: Tag zum Jahreswechsel und mit führenden Nullen', anlegenTag(Date.UTC(2027, 0, 2, 3, 4)), 'printful-anlegen-20270102t0304');
  ist('Markierung Fund 6: Alter der JÜNGSTEN Markierung in vollen Minuten; andere Tags und Müll zählen nicht', [anlegenAlterMin(['printful-synced', 'printful-anlegen-20261110t1237', anlegenTag(t0 - 5 * 60000), 'printful-anlegen-kaputt', 'printful-anlegen-20261110t1337x'], t0 + 59000), anlegenAlterMin([], t0), anlegenAlterMin(['x'], t0), anlegenAlterMin(null, t0)], [5, null, null, null]);
  ist('Markierung Fund 6: eine Markierung aus der Zukunft (Uhrenabweichung) ist nie negativ', anlegenAlterMin([anlegenTag(t0 + 90 * 60000)], t0), 0);
  ist('Markierung Fund 6: Grenze 59/60/61 Minuten', [59, 60, 61].map((m) => anlegenAlterMin([anlegenTag(t0 - m * 60000)], t0)), [59, 60, 61]);
}

{
  // ── Schon vorhandener Printful-Auftrag (Fund 9)
  const z = zeile();
  const o = bestellung([z], { email: 'a@b.ch', shippingAddress: { name: 'Max Muster', address1: 'Weg 1', city: 'Basel', countryCodeV2: 'CH', zip: '4000' } });
  const gut = { recipient: { name: 'Max Muster', zip: '4000', country_code: 'CH' }, items: [{ quantity: 1 }] };
  ist('Vorhanden Fund 9: Empfänger und Menge passen → ok', vorhandenVergleichen(gut, o), { ok: true, texte: [] });
  ist('Vorhanden Fund 9: Name in anderer Reihenfolge, Gross-/Kleinschreibung und Satzzeichen egal; PLZ mit Leerzeichen; Land klein', vorhandenVergleichen({ recipient: { name: 'MUSTER, max', zip: '40 00', country_code: 'ch' }, items: [{ quantity: 1 }] }, o).ok, true);
  for (const [n, order, teil] of [
    ['anderer Name', { ...gut, recipient: { ...gut.recipient, name: 'Erika Beispiel' } }, 'Name'], ['andere PLZ', { ...gut, recipient: { ...gut.recipient, zip: '8000' } }, 'PLZ'], ['anderes Land', { ...gut, recipient: { ...gut.recipient, country_code: 'DE' } }, 'Land'],
    ['andere Menge', { ...gut, items: [{ quantity: 3 }] }, 'Stückzahl'], ['Menge als Text unlesbar', { ...gut, items: [{ quantity: 'x' }] }, 'Stückzahl'], ['kein Empfänger', { items: [{ quantity: 1 }] }, 'Empfänger'], ['Empfänger kein Objekt', { recipient: 'x', items: [{ quantity: 1 }] }, 'Empfänger'],
    ['keine Artikel', { recipient: gut.recipient }, 'Artikel'], ['Artikel keine Liste', { recipient: gut.recipient, items: 'x' }, 'Artikel'],
  ]) { ist(`Vorhanden Fund 9: ${n} → nicht ok, Text nennt «${teil}»`, () => { const r = vorhandenVergleichen(order, o); return [r.ok, r.texte.some((t) => t.includes(teil))]; }, [false, true]); }
  ist('Vorhanden Fund 9: die Texte tragen keine Kundendaten (kein Name, keine PLZ)', vorhandenVergleichen({ recipient: { name: 'Erika Beispiel', zip: '8000', country_code: 'DE' }, items: [{ quantity: 3 }] }, o).texte.join(' ').match(/Muster|Erika|4000|8000|Basel/), null);
  const o2 = bestellung([z, zeile({ id: 'gid://shopify/LineItem/9002', quantity: 2, currentQuantity: 2 }), zeile({ id: 'gid://shopify/LineItem/9003', quantity: 4, currentQuantity: 0 }), zeile({ id: 'gid://shopify/LineItem/9004', product: { productType: 'x', tags: ['cj'], metafield: null } })], { shippingAddress: o.shippingAddress });
  ist('Vorhanden Fund 9: Soll-Menge = Editor-Positionen ohne entfernte Einheiten (1 + 2; die entfernte und die Nicht-POD-Position zählen nicht)', [vorhandenVergleichen({ ...gut, items: [{ quantity: 3 }] }, o2).ok, vorhandenVergleichen({ ...gut, items: [{ quantity: 1 }, { quantity: 2 }] }, o2).ok, vorhandenVergleichen({ ...gut, items: [{ quantity: 7 }] }, o2).ok], [true, true, false]);
  ist('Vorhanden Fund 9: die Bestellung hat keine Lieferadresse → nicht ok', vorhandenVergleichen(gut, bestellung([z], { shippingAddress: null })).ok, false);
}

{
  // ── Zugriffsrechte des Tokens (Fund 21)
  ist('Rechte Fund 21: beide Standortarten lesbar (read oder write)', [scopesBewerten(['read_orders', 'read_merchant_managed_fulfillment_orders', 'read_third_party_fulfillment_orders']), scopesBewerten(['write_merchant_managed_fulfillment_orders', 'write_third_party_fulfillment_orders'])], [{ art: 'ok', fehlt: [] }, { art: 'ok', fehlt: [] }]);
  ist('Rechte Fund 21: fehlt eines, wird es mit dem read_-Namen genannt', [scopesBewerten(['read_orders', 'read_merchant_managed_fulfillment_orders']), scopesBewerten(['read_third_party_fulfillment_orders']), scopesBewerten([])], [{ art: 'fehlt', fehlt: ['read_third_party_fulfillment_orders'] }, { art: 'fehlt', fehlt: ['read_merchant_managed_fulfillment_orders'] }, { art: 'fehlt', fehlt: ['read_merchant_managed_fulfillment_orders', 'read_third_party_fulfillment_orders'] }]);
  ist('Rechte Fund 21: keine Liste (Abfrage gescheitert) → «unbekannt», nie «ok»', [scopesBewerten(null), scopesBewerten(undefined), scopesBewerten('x')], [{ art: 'unbekannt', fehlt: [] }, { art: 'unbekannt', fehlt: [] }, { art: 'unbekannt', fehlt: [] }]);
  ist('Rechte Fund 21: write_ der EINEN Art ersetzt read_ der ANDEREN nicht', scopesBewerten(['write_merchant_managed_fulfillment_orders']).fehlt, ['read_third_party_fulfillment_orders']);
  ist('Rechte Fund 21: SCOPES_PFLICHT nennt genau diese zwei Rechte', SCOPES_PFLICHT.map((a) => a[0]), ['read_merchant_managed_fulfillment_orders', 'read_third_party_fulfillment_orders']);
}

{
  // ── Wann bestätigt der Sync selbst? (Fund 7)
  for (const [n, p, soll] of [
    ['AUTO_CONFIRM aus', { autoConfirm: false, ki: 'pflicht', maxKostenAus: false }, [false, null]],
    ['Vorgabe ohne Angaben', {}, [false, null]],
    ['AUTO_CONFIRM an, aber keine Kostenobergrenze → Konfigurationsfehler', { autoConfirm: true, ki: 'pflicht', maxKostenAus: true }, [false, 'Kostenobergrenze']],
    ['AUTO_CONFIRM an, Obergrenze da, KI aus → nie bestätigen (kein Konfigurationsfehler)', { autoConfirm: true, ki: 'aus', maxKostenAus: false }, [false, null]],
    ['KI mit anderem Wert als «pflicht» zählt als aus', { autoConfirm: true, ki: 'ja', maxKostenAus: false }, [false, null]],
    ['AUTO_CONFIRM an, Obergrenze, KI pflicht → bestätigen', { autoConfirm: true, ki: 'pflicht', maxKostenAus: false }, [true, null]],
  ]) { const r = bestaetigenPlan(p); ist(`Bestätigen Fund 7: ${n}`, [r.bestaetigen, r.konfigFehler && (r.konfigFehler.includes(soll[1]) ? soll[1] : r.konfigFehler)], soll); }
  ist('Bestätigen Fund 7: wer nicht bestätigt, nennt den Grund', [bestaetigenPlan({}).grund, bestaetigenPlan({ autoConfirm: true, ki: 'aus', maxKostenAus: false }).grund.includes('KI-Kontrolle'), bestaetigenPlan({ autoConfirm: true, ki: 'pflicht', maxKostenAus: false }).grund], ['automatisches Bestätigen ist aus (PRINTFUL_AUTO_CONFIRM=0)', true, null]);
}

{
  // ── Standort (Fund 4/21): Seitenköpfe und Status
  const z = zeile(), id = z.id;
  const fo = (extra = {}, ort = { id: 'l1', name: 'Shop location', isFulfillmentService: false }, status = 'OPEN', ids = [id]) => ({ pageInfo: { hasNextPage: false }, edges: [{ node: { id: 'f', status, assignedLocation: { location: ort }, lineItems: { pageInfo: { hasNextPage: false }, edges: ids.map((i) => ({ node: { lineItem: { id: i } } })) }, ...extra } }] });
  ist('Standort Fund 4: ein offener Händler-Standort, alle Seitenköpfe false → frei', standortVon({ fulfillmentOrders: fo() }, id).art, 'frei');
  ist('Standort Fund 4: Seitenkopf der Order-Liste hasNextPage → unklar (die Position könnte in einer Dienst-Order jenseits der Grenze stehen)', standortVon({ fulfillmentOrders: { ...fo(), pageInfo: { hasNextPage: true } } }, id).art, 'unklar');
  ist('Standort Fund 4: Seitenkopf der Positionsliste hasNextPage → unklar', standortVon({ fulfillmentOrders: fo({ lineItems: { pageInfo: { hasNextPage: true }, edges: [{ node: { lineItem: { id } } }] } }) }, id).art, 'unklar');
  ist('Standort Fund 4: ein gefundener Dienst-Standort bleibt «dienst», auch wenn die Liste abgeschnitten ist', standortVon({ fulfillmentOrders: { ...fo({}, FO_DIENST), pageInfo: { hasNextPage: true } } }, id), { art: 'dienst', name: 'Printful' });
  ist('Standort Fund 21: nur CLOSED/CANCELLED Orders → die Position steht in keiner OFFENEN Order → unklar', [standortVon({ fulfillmentOrders: fo({}, undefined, 'CLOSED') }, id).art, standortVon({ fulfillmentOrders: fo({}, undefined, 'CANCELLED') }, id).art, standortVon({ fulfillmentOrders: fo({}, FO_DIENST, 'CLOSED') }, id).art], ['unklar', 'unklar', 'unklar']);
  ist('Standort Fund 21: andere Position in der Order → unklar; leere Liste → unklar; ohne Liste → unklar; ohne Positions-ID → unklar', [standortVon({ fulfillmentOrders: fo({}, undefined, 'OPEN', ['andere']) }, id).art, standortVon({ fulfillmentOrders: { pageInfo: { hasNextPage: false }, edges: [] } }, id).art, standortVon({}, id).art, standortVon({ fulfillmentOrders: fo() }, undefined).art], ['unklar', 'unklar', 'unklar', 'unklar']);
  ist('Standort Fund 18 (D3): Dienst-Order UND zweite Order mit unlesbarem Standort für dieselbe Position → «dienst» (hart), nicht nur «unklar»', standortVon({ fulfillmentOrders: { pageInfo: { hasNextPage: false }, edges: [fo({}, FO_DIENST).edges[0], fo({}, { id: 'l9', name: 'x' }).edges[0]] } }, id).art, 'dienst');
  ist('Standort Fund 4: Standort ohne isFulfillmentService-Flag → unklar (nie «frei» geraten)', [standortVon({ fulfillmentOrders: fo({}, { id: 'l', name: 'x' }) }, id).art, standortVon({ fulfillmentOrders: fo({ assignedLocation: null }) }, id).art], ['unklar', 'unklar']);
}

{
  // ── Aufpreis (Fund 8): ein fehlendes Preisfeld ist «unbekannt», nie «gratis»
  const roh = (files) => ({ files });
  ist('Aufpreis Fund 8: Feld additional_price fehlt → null (unbekannt)', [aufpreisUsd(roh([{ type: 'back', id: 'back' }]), 'back'), aufpreisUsd(roh([{ type: 'back', id: 'back', additional_price: null }]), 'back')], [null, 0]);
  ist('Aufpreis Fund 8: eine Datei desselben Typs ohne Feld macht die Auskunft unbekannt, auch wenn eine andere einen Preis hat', aufpreisUsd(roh([{ type: 'back', id: 'back', additional_price: '2.5' }, { type: 'back', id: 'x' }]), 'back'), null);
  ist('Aufpreis Fund 8: «2.50», 0, ""-Preis und unlesbarer/negativer Preis', [aufpreisUsd(roh([{ type: 'back', id: 'back', additional_price: '2.50' }]), 'back'), aufpreisUsd(roh([{ type: 'back', id: 'back', additional_price: 0 }]), 'back'), aufpreisUsd(roh([{ type: 'back', id: 'back', additional_price: '' }]), 'back'), aufpreisUsd(roh([{ type: 'back', id: 'back', additional_price: 'x' }]), 'back'), aufpreisUsd(roh([{ type: 'back', id: 'back', additional_price: -1 }]), 'back')], [2.5, 0, 0, null, null]);
  const ap = aufpreisPruefen({ roh: roh([{ type: 'back', id: 'back' }]), typen: ['back'], bezahlt: [] });
  ist('Aufpreis Fund 8: fehlendes Preisfeld bei der Rückseite → weicher Befund «aufpreis-unbekannt» (kein Auftrag ohne Freigabe von Hand), bei der Vorderseite keiner', [ap.map((b) => [b.art, b.hart]), aufpreisPruefen({ roh: roh([{ type: 'default', id: 'default' }]), typen: ['default'], bezahlt: [] })], [[['aufpreis-unbekannt', false]], []]);
}

// ═══════════════════════════════════════ ZWEITE RUNDE 10.11.2026 (drei Gegenleser nach der Härtung P1): reine Logik
{
  // ── Linse 1, Fund 6: Herkunft der Druckdatei (eigener Datei-Pfad im Shopify-CDN, nur Grösse/Qualität/Format bei Cloudinary)
  const C = 'https://res.cloudinary.com/dwyi6kkrl/image/upload/';
  ist('R2 Adresse: der eigene Datei-Pfad im Shopify-CDN ist als Konstante festgeschrieben', EIGENER_SHOPIFY_CDN_PFAD, '/s/files/1/0943/6856/3585/');
  for (const [n, w, soll] of [
    ['Shopify-CDN, eigene Dateien', 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/a.png', null],
    ['Shopify-CDN, Dateien eines FREMDEN Shops', 'https://cdn.shopify.com/s/files/1/9999/9999/9999/files/a.png', 'Shopify-CDN-Adresse nicht aus den eigenen Dateien des Shops'],
    ['Shopify-CDN, anderer Bereich', 'https://cdn.shopify.com/shopifycloud/x/a.png', 'Shopify-CDN-Adresse nicht aus den eigenen Dateien des Shops'],
    ['Shopify-CDN, Pfad nur ähnlich (ohne den letzten Schrägstrich)', 'https://cdn.shopify.com/s/files/1/0943/6856/35850/files/a.png', 'Shopify-CDN-Adresse nicht aus den eigenen Dateien des Shops'],
    ['Cloudinary ohne Transformation', C + 'v1/a.png', null], ['Cloudinary im Ordner «mock»', C + 'mock/1.png', null], ['Cloudinary im Ordner «pod_uploads» (kein Kürzel)', C + 'pod_uploads/v1/a.png', null],
    ['Cloudinary Grösse und Format', C + 'c_limit,w_1400/v1/a.png', null], ['Cloudinary Qualität und Format', C + 'q_auto,f_auto/v1/a.png', null], ['Cloudinary dpr', C + 'dpr_2.0/v1/a.png', null],
  ]) ist(`R2 Adresse: ${n}`, adresseProblem(w), soll);
  for (const [n, w, muster] of [
    ['Überlagerung l_fetch mit Fremdadresse', C + 'l_fetch:aHR0cHM6Ly9ldmlsLmV4YW1wbGUveC5wbmc=/x.png', /Transformation/], ['Unterlage u_', C + 'u_evil/v1/x.png', /Transformation/],
    ['Effekt e_blur', C + 'e_blur:500/v1/x.png', /Transformation/], ['benannte Transformation t_', C + 't_named/v1/x.png', /Transformation/], ['erlaubte plus verbotene Angabe', C + 'c_limit,l_x/v1/x.png', /Transformation/],
    ['Grösse mit absurder Zahl', C + 'w_99999999/v1/x.png', /Transformation/], ['Datei fehlt (Pfad endet auf /)', C + 'v1/', /Dateinamen/], ['Prozentzeichen im Dateinamen', C + 'v1/a%20b.png', /Dateinamen/],
    ['Doppelpunkt im Dateinamen', C + 'v1/l_fetch:abc', /Dateinamen/], ['Prozentzeichen im Ordnernamen', C + 'a%20b/v1/x.png', /Pfadstück/], ['Gleichheitszeichen im Ordnernamen', C + 'a=b/v1/x.png', /Pfadstück/],
  ]) wahr(`R2 Adresse: ${n} → abgewiesen`, (adresseProblem(w) || '') !== '' && muster.test(adresseProblem(w) || ''), String(adresseProblem(w)));
  ist('R2 Adresse: das Produkt-Metafeld des Besitzers (eigeneCloud:false) darf weiter jeden Pfad nennen', [adresseProblem('https://cdn.shopify.com/s/files/1/9999/9999/9999/files/a.png', ['cdn.shopify.com'], { eigeneCloud: false }), adresseProblem(C + 'l_fetch:abc/x.png', ['res.cloudinary.com'], { eigeneCloud: false })], [null, null]);

  // ── Linse 1, Fund 1: Fulfillment-Order-Status ist eine Whitelist
  const ID1 = 'gid://shopify/LineItem/9001';
  const foNode = (status, ort = FO_HAENDLER, ids = [ID1]) => ({ node: { id: 'f-' + status, status, assignedLocation: { location: ort }, lineItems: { edges: ids.map((id) => ({ node: { lineItem: { id } } })) } } });
  const stand = (...nodes) => standortVon({ fulfillmentOrders: { edges: nodes } }, ID1);
  ist('R2 Standort: der einzige druckbare Status ist OPEN (IN_PROGRESS seit der Schlussprüfung nicht mehr, Fund G5)', [...FO_DRUCKBAR], ['OPEN']);
  for (const st of ['OPEN', 'open']) ist(`R2 Standort: ${st} am Händler-Standort → frei`, stand(foNode(st)).art, 'frei');
  for (const st of ['IN_PROGRESS', 'ON_HOLD', 'SCHEDULED', 'INCOMPLETE', 'REQUEST_DECLINED', 'WEIRD', '']) ist(`R2 Standort: «${st || '(leer)'}» am Händler-Standort → gehalten (nie druckbar)`, stand(foNode(st)), { art: 'gehalten', status: st ? st.toUpperCase() : '(leer)' });
  ist('R2 Standort: ein Status ohne Wert (fehlt ganz) → gehalten', standortVon({ fulfillmentOrders: { edges: [{ node: { assignedLocation: { location: FO_HAENDLER }, lineItems: { edges: [{ node: { lineItem: { id: ID1 } } }] } } }] } }, ID1).art, 'gehalten');
  ist('R2 Standort: gehalten am DIENST-Standort → dienst (der Dienst hat Vorrang)', stand(foNode('ON_HOLD', FO_DIENST)).art, 'dienst');
  ist('R2 Standort: gehalten UND offen für dieselbe Position → gehalten', stand(foNode('ON_HOLD'), foNode('OPEN')).art, 'gehalten');
  ist('R2 Standort: eine gehaltene Order einer ANDEREN Position stört nicht', standortVon({ fulfillmentOrders: { edges: [foNode('OPEN'), foNode('ON_HOLD', FO_HAENDLER, ['gid://shopify/LineItem/8888'])] } }, ID1).art, 'frei');
  ist('R2 Standort: eine geschlossene Dienst-Order neben einer offenen Händler-Order → unklar, der Grund nennt die geschlossene Order', [stand(foNode('CLOSED', FO_DIENST), foNode('OPEN')).art, /GESCHLOSSENEN/.test(stand(foNode('CLOSED', FO_DIENST), foNode('OPEN')).grund)], ['unklar', true]);
  ist('R2 Standort: eine geschlossene Order mit nicht lesbarem Standort neben einer offenen → unklar', stand(foNode('CLOSED', { id: 'l' }), foNode('OPEN')).art, 'unklar');
  ist('R2 Standort: eine geschlossene Order OHNE Standort neben einer offenen → unklar', standortVon({ fulfillmentOrders: { edges: [{ node: { status: 'CLOSED', assignedLocation: null, lineItems: { edges: [{ node: { lineItem: { id: ID1 } } }] } } }, foNode('OPEN')] } }, ID1).art, 'unklar');
  ist('R2 Standort: eine geschlossene HÄNDLER-Order neben einer offenen (Teillieferung) → frei', stand(foNode('CLOSED'), foNode('OPEN')).art, 'frei');
  ist('R2 Standort: eine STORNIERTE Dienst-Order neben einer offenen Händler-Order → frei (storniert = nichts gedruckt)', stand(foNode('CANCELLED', FO_DIENST), foNode('OPEN')).art, 'frei');
  ist('R2 Standort: eine geschlossene Dienst-Order einer ANDEREN Position stört nicht', standortVon({ fulfillmentOrders: { edges: [foNode('CLOSED', FO_DIENST, ['gid://shopify/LineItem/8888']), foNode('OPEN')] } }, ID1).art, 'frei');
  {
    const io = mkIo();
    const p = await planeBestellung(bestellung([zeile()], { fulfillmentOrders: { edges: [foNode('ON_HOLD')] } }), io, { paket: paketAlles });
    ist('R2 Plan: Order ON_HOLD → HARTER Befund «fulfillment-gehalten», kein Artikel, keine Netzabfrage, der Text nennt den Status, das Tag und bleibt unter 450 Zeichen', [arten(p.befunde), p.befunde[0]?.hart, p.items.length, io.log.produkt, io.log.druck, io.log.kopf, io.log.kontrolle, /ON_HOLD/.test(p.befunde[0]?.text), /printful-review/.test(p.befunde[0]?.text), p.befunde[0]?.text.length < 450], [['fulfillment-gehalten'], true, 0, [], [], [], [], true, true, true]);
    const gut = await planeBestellung(bestellung([zeile(), zeile({ id: 'gid://shopify/LineItem/9002', customAttributes: [A('🖼️ Druckdatei (front)', U('w'))] })]), mkIo(), { paket: paketAlles });
    ist('R2 Plan: positionIds nennt genau die Positionen, aus denen ein Artikel entstand', gut.positionIds, ['gid://shopify/LineItem/9001', 'gid://shopify/LineItem/9002']);
    const teil = await planeBestellung(bestellung([zeile(), zeile({ id: 'gid://shopify/LineItem/9002', quantity: 1, currentQuantity: 0 })]), mkIo(), { paket: paketAlles });
    ist('R2 Plan: eine entfernte Position steht nicht in positionIds', teil.positionIds, ['gid://shopify/LineItem/9001']);
  }

  // ── Linse 1, Fund 5: eine unlesbare Menge ist ein harter Befund, nie «1»
  for (const [n, z] of [['quantity 0 ohne currentQuantity', { quantity: 0 }], ['quantity als Text', { quantity: 'x' }], ['quantity negativ', { quantity: -2 }], ['quantity fehlt', { quantity: undefined }]]) {
    const p = await planeBestellung(bestellung([zeile(z)]), mkIo(), { paket: paketAlles });
    ist(`R2 Menge: ${n} → harter Befund «menge-unlesbar», kein Artikel`, [arten(p.befunde), p.befunde[0]?.hart, p.items.length], [['menge-unlesbar'], true, 0]);
  }
  {
    const nichtPod = await planeBestellung(bestellung([zeile({ quantity: 'x', product: { productType: 'x', tags: ['cj'] }, customAttributes: [] })]), mkIo(), { paket: paketAlles });
    ist('R2 Menge: eine unlesbare Menge bei einer NICHT-POD-Position ist kein Befund (sie interessiert den Sync nicht)', [nichtPod.befunde, nichtPod.items.length], [[], 0]);
    const o = bestellung([zeile({ quantity: 'x' })]);
    ist('R2 Menge: der Vergleich mit einem vorhandenen Printful-Auftrag nennt die unlesbare Menge (nie «1» geraten)', vorhandenVergleichen({ recipient: { name: 'T', zip: '4000', country_code: 'CH' }, items: [{ quantity: 1 }] }, { ...o, shippingAddress: { name: 'T', address1: 'x', city: 'Basel', countryCodeV2: 'CH', zip: '4000' } }).texte, ['die Menge einer Position der Bestellung ist nicht lesbar', 'die Stückzahl weicht ab (Printful 1, Bestellung 0)']);
  }

  // ── Linse 2, Fund 2: Dateien JEDES Artikels
  {
    const art = (f) => ({ variant_id: 1, quantity: 1, files: f });
    const ok = (t = 'front') => ({ type: t, status: 'ok' }), vor = { type: 'preview', status: 'ok' };
    ist('R2 Dateien: zwei Artikel, beide mit Datei → ok', dateienStatus({ items: [art([ok(), vor]), art([ok(), vor])] }).art, 'ok');
    ist('R2 Dateien: zwei Artikel, nur der ERSTE mit Datei → wartet (teilweise), nicht ok', dateienStatus({ items: [art([ok(), vor]), art([])] }), { art: 'wartet', texte: [], leer: false, teilweise: true });
    ist('R2 Dateien: zwei Artikel, nur der ZWEITE mit Datei → wartet (teilweise)', dateienStatus({ items: [art([]), art([ok()])] }).teilweise, true);
    ist('R2 Dateien: ein Artikel nur mit Vorschau-Datei zählt als ohne Datei', dateienStatus({ items: [art([ok()]), art([vor])] }).art, 'wartet');
    ist('R2 Dateien: ein Artikel ohne das Feld files', dateienStatus({ items: [art([ok()]), { variant_id: 1, quantity: 1 }] }).art, 'wartet');
    ist('R2 Dateien: kein Artikel hat eine Datei → wartet, leer (wie bisher)', dateienStatus({ items: [art([]), art([])] }), { art: 'wartet', texte: [], leer: true, teilweise: false });
    ist('R2 Dateien: ein Problem einer Datei geht vor «wartet»', dateienStatus({ items: [art([{ type: 'front', status: 'failed' }]), art([])] }).art, 'problem');
    const plan = [{ variant_id: 1, quantity: 1, files: [{ type: 'front' }] }, { variant_id: 1, quantity: 1, files: [{ type: 'front' }] }];
    ist('R2 Entwurf: zwei Artikel, beide gleich dem Gesendeten → ok', entwurfVergleichen({ items: [art([ok(), vor]), art([ok(), vor])] }, plan).ok, true);
    const t1 = entwurfVergleichen({ items: [art([ok(), vor]), art([])] }, plan);
    ist('R2 Entwurf: nur der erste Artikel führt eine Datei → NICHT ok, der Text nennt Artikel 2', [t1.ok, /Artikel 2: Printful führt noch keine Datei/.test(t1.texte.join(' '))], [false, true]);
    ist('R2 Entwurf: nur der zweite Artikel führt eine Datei → NICHT ok, der Text nennt Artikel 1', [entwurfVergleichen({ items: [art([]), art([ok()])] }, plan).ok, /Artikel 1: Printful führt noch keine Datei/.test(entwurfVergleichen({ items: [art([]), art([ok()])] }, plan).texte.join(' '))], [false, true]);
    ist('R2 Entwurf: noch KEIN Artikel führt eine Datei → ok (das ist «wartet», Sache von dateienStatus)', entwurfVergleichen({ items: [art([]), art([])] }, plan).ok, true);
    ist('R2 Entwurf: ein Artikel, den der Plan ohne Datei sendet, zählt beim Vergleich nicht als fehlend', entwurfVergleichen({ items: [art([ok()]), art([])] }, [plan[0], { variant_id: 1, quantity: 1, files: [] }]).ok, true);
  }

  // ── Linse 1, Fund 3: Anspruch vor dem Anlegen (Zeichenkette nach Schreibzeit geordnet, die kleinste gewinnt)
  {
    const T0 = Date.UTC(2026, 10, 10, 9, 37, 12, 345);
    ist('R2 Anspruch: ohne Zufallsteil die alte Form (Minute)', anlegenTag(T0), 'printful-anlegen-20261110t0937');
    ist('R2 Anspruch: mit Zufallsteil Sekunden und Millisekunden dazu', () => anlegenTag(T0, 'ab1'), 'printful-anlegen-20261110t0937-12345-ab1');
    ist('R2 Anspruch: Zufallsteil wird klein geschrieben', () => anlegenTag(T0, 'AB1'), 'printful-anlegen-20261110t0937-12345-ab1');
    for (const z of ['', 'ab', 'abcd', 'ab12cd34', 'a'.repeat(13), 'a c', 'a-c', 'äbc']) { let f = null; try { anlegenTag(T0, z); } catch (e) { f = e.message; } wahr(`R2 Anspruch: ungültiger Zufallsteil «${z}» wirft`, typeof f === 'string' && /Zufallsteil/.test(f), String(f)); }
    ist('R2 Anspruch: die frühere Zeit hat die kleinere Zeichenkette (über Sekunde, Minute, Stunde und Tag)', [anlegenTag(T0 - 1, 'zzz') < anlegenTag(T0, 'aaa'), anlegenTag(T0 - 60000, 'zzz') < anlegenTag(T0, 'aaa'), anlegenTag(T0 - 86400000, 'zzz') < anlegenTag(T0, 'aaa')], [true, true, true]);
    ist('R2 Anspruch: anlegenAlterMin liest beide Formen (Minuten-Auflösung)', [anlegenAlterMin([anlegenTag(T0)], T0 + 5 * 60000), anlegenAlterMin([anlegenTag(T0, 'ab1')], T0 + 5 * 60000), anlegenAlterMin([anlegenTag(T0, 'ab1'), anlegenTag(T0 - 3600000, 'aaa')], T0 + 5 * 60000)], [5, 5, 5]);
    ist('Tag-Länge Anspruch: die bis zum 11.11.2026 gebildete LANGE Form (8 Zufallszeichen, 45 Zeichen) wird weiter als Markierung gelesen (Alter, Sperre)', [anlegenAlterMin(['printful-anlegen-20261110t0937-12345-ab12cd34'], T0 + 5 * 60000), 'printful-anlegen-20261110t0937-12345-ab12cd34'.length], [5, 45]);
    ist('R2 Anspruch: ein Tag mit falschem Suffix wird nicht als Markierung gelesen', anlegenAlterMin(['printful-anlegen-20261110t0937-1234-ab12cd34', 'printful-anlegen-20261110t0937-12345-xy', 'printful-anlegen-20261110t0937-12345-AB12CD34'], T0), null);
    ist('R2 Sperre: genau ANLEGEN_SPERRE_MIN Minuten alt sperrt NICHT mehr, eine weniger sperrt, keine Markierung sperrt nicht', [anlegenGesperrt(ANLEGEN_SPERRE_MIN - 1), anlegenGesperrt(ANLEGEN_SPERRE_MIN), anlegenGesperrt(ANLEGEN_SPERRE_MIN + 1), anlegenGesperrt(0), anlegenGesperrt(null)], [true, false, false, true, false]);
    const mein = anlegenTag(T0, 'bbb');
    const g = (tags) => anspruchGewonnen(tags, mein, T0 + 1000);
    ist('R2 Anspruch: nur die eigene Markierung → gewonnen', g([mein]).ok, true);
    ist('R2 Anspruch: ein früherer Anspruch eines anderen → verloren, der Grund nennt ihn', [g([mein, anlegenTag(T0 - 5000, 'aaa')]).ok, /früher markiert/.test(g([mein, anlegenTag(T0 - 5000, 'aaa')]).grund)], [false, true]);
    ist('R2 Anspruch: ein späterer Anspruch eines anderen → gewonnen (der andere unterliegt)', g([mein, anlegenTag(T0 + 5000, 'aaa')]).ok, true);
    ist('R2 Anspruch: gleiche Zeit, kleinerer Zufallsteil des anderen → verloren; grösserer → gewonnen', [g([mein, anlegenTag(T0, 'aaa')]).ok, g([mein, anlegenTag(T0, 'ccc')]).ok], [false, true]);
    ist('R2 Anspruch: ein früherer Anspruch aus der alten Form (nur Minute) → verloren, ein späterer alter → gewonnen', [g([mein, anlegenTag(T0 - 60000)]).ok, g([mein, anlegenTag(T0 + 120000)]).ok], [false, true]);
    ist('R2 Anspruch: ein früherer Anspruch von vor mehr als 60 Minuten ist nicht mehr aktiv → gewonnen', g([mein, anlegenTag(T0 - 70 * 60000, 'aaa')]).ok, true);
    ist('R2 Anspruch: ein früherer Anspruch von vor 59 Minuten ist noch aktiv → verloren', g([mein, anlegenTag(T0 - 59 * 60000, 'aaa')]).ok, false);
    ist('R2 Anspruch: die eigene Markierung fehlt in der Liste → nicht gewonnen (nie raten)', [g([]).ok, g([anlegenTag(T0 - 5000, 'aaa')]).ok, anspruchGewonnen(null, mein, T0).ok], [false, false, false]);
    ist('R2 Anspruch: die Art trennt «verloren» (ein anderer war früher) von «eigene-fehlt» (Lesefehler, muss sichtbar werden) und «gewonnen»', [g([mein]).art, g([mein, anlegenTag(T0 - 5000, 'aaa')]).art, g([]).art, g([anlegenTag(T0 - 5000, 'aaa')]).art, anspruchGewonnen(null, mein, T0).art], ['gewonnen', 'verloren', 'eigene-fehlt', 'eigene-fehlt', 'eigene-fehlt']);
    ist('R2 Anspruch: fremde Tags (printful-synced, Versuchszähler) stören nicht', g([mein, 'printful-synced', 'printful-versuch-2', 'wunschdesign']).ok, true);
  }

  // ── Linse 1, Fund 2: Stand der Bestellung beim Planen gegen das frische Lesen
  {
    const adresse = { name: 'T', address1: 'x', city: 'Basel', countryCodeV2: 'CH', zip: '4000' };
    const z = (id, q = 1, cq = q) => ({ id, quantity: q, currentQuantity: cq });
    const n = (extra = {}) => ({ id: 'gid://shopify/Order/1', email: 'a@b.ch', shippingAddress: { ...adresse }, lineItems: { edges: [{ node: z('gid://shopify/LineItem/1') }, { node: z('gid://shopify/LineItem/2', 2) }] }, fulfillmentOrders: { edges: [foNode('OPEN', FO_HAENDLER, ['gid://shopify/LineItem/1']), foNode('OPEN', FO_HAENDLER, ['gid://shopify/LineItem/2'])] }, ...extra });
    const soll = bestellStand(n(), ['gid://shopify/LineItem/1']);
    const abw = (x, s = soll) => bestellAbweichung(x, s);
    ist('R2 Stand: unverändert → keine Abweichung', abw(n()), null);
    ist('R2 Stand: die Reihenfolge der Positionen spielt keine Rolle', abw(n({ lineItems: { edges: [{ node: z('gid://shopify/LineItem/2', 2) }, { node: z('gid://shopify/LineItem/1') }] } })), null);
    for (const [name, x, art, muster] of [
      ['Strasse', n({ shippingAddress: { ...adresse, address1: 'y' } }), 'geaendert', /Lieferadresse/], ['PLZ', n({ shippingAddress: { ...adresse, zip: '3000' } }), 'geaendert', /Lieferadresse/], ['Land', n({ shippingAddress: { ...adresse, countryCodeV2: 'US' } }), 'geaendert', /Lieferadresse/],
      ['Telefon', n({ shippingAddress: { ...adresse, phone: '+41 1' } }), 'geaendert', /Lieferadresse/], ['E-Mail', n({ email: 'x@y.ch' }), 'geaendert', /E-Mail/], ['Adresse entfernt (null)', n({ shippingAddress: null }), 'geaendert', /Lieferadresse/],
      ['Menge einer Position', n({ lineItems: { edges: [{ node: z('gid://shopify/LineItem/1', 3) }, { node: z('gid://shopify/LineItem/2', 2) }] } }), 'geaendert', /Positionen oder Mengen/],
      ['Position erstattet (currentQuantity 0)', n({ lineItems: { edges: [{ node: z('gid://shopify/LineItem/1', 1, 0) }, { node: z('gid://shopify/LineItem/2', 2) }] } }), 'geaendert', /Positionen oder Mengen/],
      ['Position entfernt', n({ lineItems: { edges: [{ node: z('gid://shopify/LineItem/2', 2) }] } }), 'geaendert', /Positionen oder Mengen/],
      ['Position hinzugekommen', n({ lineItems: { edges: [{ node: z('gid://shopify/LineItem/1') }, { node: z('gid://shopify/LineItem/2', 2) }, { node: z('gid://shopify/LineItem/3') }] } }), 'geaendert', /Positionen oder Mengen/],
      ['Fulfillment-Order gehalten', n({ fulfillmentOrders: { edges: [foNode('ON_HOLD', FO_HAENDLER, ['gid://shopify/LineItem/1'])] } }), 'geaendert', /ON_HOLD/],
      ['Fulfillment-Order am Dienst-Standort', n({ fulfillmentOrders: { edges: [foNode('OPEN', FO_DIENST, ['gid://shopify/LineItem/1'])] } }), 'geaendert', /Dienst-Standort/],
      ['Fulfillment-Order geschlossen (Position in keiner offenen)', n({ fulfillmentOrders: { edges: [foNode('CLOSED', FO_HAENDLER, ['gid://shopify/LineItem/1'])] } }), 'geaendert', /nicht mehr eindeutig/],
    ]) { const r = abw(x); ist(`R2 Stand: ${name} → ${art}`, [r && r.art, r ? muster.test(r.text) : null], [art, true]); }
    for (const [name, x] of [['shippingAddress', n({ shippingAddress: undefined })], ['email', n({ email: undefined })], ['lineItems', n({ lineItems: undefined })], ['lineItems.edges', n({ lineItems: {} })], ['fulfillmentOrders', n({ fulfillmentOrders: undefined })], ['fulfillmentOrders.edges', n({ fulfillmentOrders: {} })]]) {
      const r = abw(x);
      ist(`R2 Stand: das Feld ${name} fehlt in der Antwort → unlesbar (nie «unverändert»)`, [r && r.art, r && r.text.length > 10], ['unlesbar', true]);
    }
    ist('R2 Stand: Fulfillment-Orders sind ohne geplante Positionen kein Pflichtfeld', abw(n({ fulfillmentOrders: undefined }), bestellStand(n(), [])), null);
    ist('R2 Stand: keine Bestellung / kein Stand → unlesbar', [abw(null).art, abw(n(), null).art], ['unlesbar', 'unlesbar']);
    ist('R2 Stand: bestellStand wandelt die Positions-IDs in Texte', bestellStand(n(), [1, 'x']).positionIds, ['1', 'x']);
  }
}


// ═══════════════════════════════════════ SCHLUSSPRÜFUNG 10.11.2026 (zwei unabhängige Schlussprüfer): Funde G1 bis G5, reine Logik
{
  // ── G1 (a): scharf nur in GitHub Actions
  ist('G1 scharfErlaubt: der Trockenlauf ist überall erlaubt (mit und ohne Actions, mit und ohne Ausnahme)', [scharfErlaubt({ dry: true }), scharfErlaubt({ dry: true, githubActions: 'false' }), scharfErlaubt({ dry: true, lokalScharf: '1' }), scharfErlaubt()], Array(4).fill({ ok: true, lokal: false, grund: null }));
  ist('G1 scharfErlaubt: scharf in Actions (GITHUB_ACTIONS genau «true») im Workflow printful-sync.yml ist erlaubt und gilt nicht als «lokal»', scharfErlaubt({ dry: false, githubActions: 'true', workflowRef: 'eigentuemer/aban-news-landing/.github/workflows/printful-sync.yml@refs/heads/main' }), { ok: true, lokal: false, grund: null });
  for (const ga of [undefined, null, '', 'false', 'TRUE', 'True', ' true', 'true ', '1', 'yes', true, 1]) {
    const r = scharfErlaubt({ dry: false, githubActions: ga });
    ist(`G1 scharfErlaubt: scharf mit GITHUB_ACTIONS=${JSON.stringify(ga)} (nicht genau die Zeichenkette «true») ist NICHT erlaubt; der Grund nennt GITHUB_ACTIONS, die Concurrency-Gruppe und die Ausnahme`, [r.ok, r.lokal, /GITHUB_ACTIONS/.test(r.grund) && /Concurrency-Gruppe/.test(r.grund) && /PRINTFUL_LOKAL_SCHARF=1/.test(r.grund)], [false, false, true]);
  }
  ist('G1 scharfErlaubt: die Ausnahme PRINTFUL_LOKAL_SCHARF=1 (auch « 1 » mit Leerraum) erlaubt scharf ausserhalb von Actions und wird als «lokal» gekennzeichnet (Warnzeile im Kleber)', [scharfErlaubt({ dry: false, lokalScharf: '1' }), scharfErlaubt({ dry: false, githubActions: 'false', lokalScharf: ' 1 ' })], Array(2).fill({ ok: true, lokal: true, grund: null }));
  for (const ls of ['', '0', '2', '11', 'true', 'ja', 'yes', 'on', 'an', 'x', true]) ist(`G1 scharfErlaubt: PRINTFUL_LOKAL_SCHARF=${JSON.stringify(ls)} ist KEINE Ausnahme (nur genau «1»)`, scharfErlaubt({ dry: false, lokalScharf: ls }).ok, false);
  ist('G1 scharfErlaubt: in Actions bleibt «lokal» falsch, auch wenn die Ausnahme zusätzlich gesetzt ist (keine Warnzeile im Workflow)', scharfErlaubt({ dry: false, githubActions: 'true', workflowRef: 'eigentuemer/aban-news-landing/.github/workflows/printful-sync.yml@refs/heads/main', lokalScharf: '1' }), { ok: true, lokal: false, grund: null });
  // Gegenprüfung 11.11.2026: GITHUB_ACTIONS=true genügt nur zusammen mit GITHUB_WORKFLOW_REF des Workflows printful-sync.yml (ein anderer Workflow hätte die Concurrency-Gruppe nicht)
  for (const ref of [undefined, '', 'a/b/.github/workflows/printful-reprice.yml@refs/heads/main', 'a/b/.github/workflows/printful-sync.yaml@refs/heads/main', 'a/b/.github/workflows/x/printful-sync.yml@refs/heads/main',
    'a/b/.github/workflows/printful-sync.yml@', 'a/b/.github/workflows/printful-sync.yml', 'printful-sync.yml@refs/heads/main', 'a/b/.github/workflows/printful-sync.yml@refs/heads/main x', ' a/b/.github/workflows/printful-sync.yml@main',
    'a/b/.github/workflows/kopie-printful-sync.yml@main', 'a/b/.github/workflows/printful-sync.ymlx@main', 'a/b/c/.github/workflows/printful-sync.yml@main']) {
    const r = scharfErlaubt({ dry: false, githubActions: 'true', workflowRef: ref });
    ist(`GP G1 scharfErlaubt: GITHUB_ACTIONS=true mit GITHUB_WORKFLOW_REF=${JSON.stringify(ref)} ist NICHT erlaubt; der Grund nennt GITHUB_WORKFLOW_REF und printful-sync.yml`, [r.ok, r.lokal, /GITHUB_WORKFLOW_REF/.test(r.grund || '') && /printful-sync\.yml/.test(r.grund || '')], [false, false, true]);
  }
  ist('GP G1 scharfErlaubt: dieselben falschen Workflows mit PRINTFUL_LOKAL_SCHARF=1 laufen als «lokal» (mit Warnzeile)', scharfErlaubt({ dry: false, githubActions: 'true', workflowRef: 'a/b/.github/workflows/printful-reprice.yml@refs/heads/main', lokalScharf: '1' }), { ok: true, lokal: true, grund: null });
  ist('GP G1 scharfErlaubt: GITHUB_WORKFLOW_REF des Sync-Workflows OHNE GITHUB_ACTIONS=true genügt nicht', [scharfErlaubt({ dry: false, workflowRef: 'eigentuemer/aban-news-landing/.github/workflows/printful-sync.yml@refs/heads/main' }).ok, scharfErlaubt({ dry: false, githubActions: 'TRUE', workflowRef: 'eigentuemer/aban-news-landing/.github/workflows/printful-sync.yml@refs/heads/main' }).ok], [false, false]);
  ist('GP G1 SYNC_WORKFLOW_REF: Besitzer und Repo mit Punkt, Bindestrich, Unterstrich; jede Ref (Zweig, Tag, Pull Request) wird angenommen', ['o.n-e/r_e.po/.github/workflows/printful-sync.yml@refs/heads/main', 'o/r/.github/workflows/printful-sync.yml@refs/tags/v1', 'o/r/.github/workflows/printful-sync.yml@refs/pull/7/merge'].map((x) => SYNC_WORKFLOW_REF.test(x)), [true, true, true]);
  // Uhr gegen den Date-Kopf von Shopify
  {
    const kopf = 'Wed, 11 Nov 2026 10:49:01 GMT', t = Date.parse(kopf);
    ist('GP Uhr: Grenze 60 s; ein Versatz bis 60 s ist erlaubt (in beide Richtungen, genau 60 000 ms noch)', [UHR_GRENZE_MS, uhrBewerten(t, kopf), uhrBewerten(t + 60000, kopf).ok, uhrBewerten(t - 60000, kopf).ok, uhrBewerten(t + 1500, kopf).versatzMs], [60000, { ok: true, versatzMs: 0, grund: null }, true, true, 1500]);
    ist('GP Uhr: über 60 s daneben (vor oder nach, auch Stunden) ist NICHT erlaubt; der Grund nennt die Sekunden', [uhrBewerten(t + 60001, kopf).ok, uhrBewerten(t - 60001, kopf).ok, uhrBewerten(t + 3600000, kopf).versatzMs, /weicht um -7200 s/.test(uhrBewerten(t - 7200000, kopf).grund)], [false, false, 3600000, true]);
    ist('GP Uhr: ein fehlender oder unlesbarer Kopf ist NICHT erlaubt (nicht messbar = nicht sicher); nur die Form des HTTP-Kopfs gilt', ['', null, undefined, '2026', '1', 'gestern', '2026-11-11T10:49:01Z', 'Wed, 11 Nov 2026 10:49:01 UTC', 'Wed, 11 Nov 2026 10:49:01'].map((k) => uhrBewerten(t, k).ok), Array(9).fill(false));
    ist('GP Uhr: eine nicht messbare eigene Zeit ist NICHT erlaubt', [uhrBewerten(NaN, kopf).ok, uhrBewerten(undefined, kopf).ok, uhrBewerten(null, kopf).ok], [false, false, false]);
  }

  // ── G1 (b): Wartezeit vor dem Nachlesen der Markierung
  ist('G1 Wartezeit: Vorgabe 3000 ms, kleinster Wert eines echten Laufs 2000 ms, grösster 60000 ms; die Test-Kennung heisst «nur-attrappe»', [ANSPRUCH_WARTE_MS_VORGABE, ANSPRUCH_WARTE_MS_MIN, ANSPRUCH_WARTE_MS_MAX, ANSPRUCH_TESTKENNUNG], [3000, 2000, 60000, 'nur-attrappe']);
  for (const leer of [undefined, null, '', '   ']) ist(`G1 anspruchWarteLesen(${JSON.stringify(leer)}): die Vorgabe 3000 ms, kein Fehler, keine Test-Kennung`, anspruchWarteLesen(leer), { ms: 3000, fehler: null, test: false });
  ist('G1 anspruchWarteLesen: 2000, 3000, « 4500 » und 60000 gelten ohne Test-Kennung', ['2000', '3000', ' 4500 ', '60000'].map((w) => anspruchWarteLesen(w).ms), [2000, 3000, 4500, 60000]);
  for (const w of ['0', '1', '1999', '02', '0000']) {
    const r = anspruchWarteLesen(w);
    ist(`G1 anspruchWarteLesen(«${w}») OHNE Test-Kennung: Fehler (unter 2000), kein Wert; die Meldung nennt die Variable`, [r.ms, typeof r.fehler === 'string' && /PRINTFUL_ANSPRUCH_WARTE_MS/.test(r.fehler) && /2000/.test(r.fehler)], [null, true]);
  }
  for (const k of [undefined, '', '1', 'true', 'NUR-ATTRAPPE', 'nur-attrappe ', ' nur-attrappe', 'attrappe']) ist(`G1 anspruchWarteLesen(«1999») mit FALSCHER Test-Kennung ${JSON.stringify(k)}: weiter ein Fehler (nur genau «nur-attrappe» gilt)`, [anspruchWarteLesen('1999', { testKennung: k }).ms, anspruchWarteLesen('1999', { testKennung: k }).test], [null, false]);
  ist('G1 anspruchWarteLesen: MIT Test-Kennung gelten 0, 1, 400 und 1999', ['0', '1', '400', '1999'].map((w) => anspruchWarteLesen(w, { testKennung: 'nur-attrappe' })), [0, 1, 400, 1999].map((ms) => ({ ms, fehler: null, test: true })));
  for (const w of ['abc', '-1', '3000.5', '1e4', '0x10', '3 000', '3000ms', '+3000', '60001', '9999999999']) for (const k of [undefined, 'nur-attrappe']) {
    const r = anspruchWarteLesen(w, { testKennung: k });
    ist(`G1 anspruchWarteLesen(«${w}»${k ? ', mit Test-Kennung' : ''}): keine ganze Zahl von Millisekunden bis 60000 → Fehler, kein Wert`, [r.ms, typeof r.fehler === 'string' && /PRINTFUL_ANSPRUCH_WARTE_MS/.test(r.fehler)], [null, true]);
  }
  ist('G1 anspruchLangsam: das eigene Schreiben darf höchstens die HALBE Wartezeit dauern (genau die Hälfte gilt noch als schnell)', [anspruchLangsam(0, 3000), anspruchLangsam(1500, 3000), anspruchLangsam(1501, 3000), anspruchLangsam(3000, 3000), anspruchLangsam(200, 400), anspruchLangsam(201, 400)], [false, false, true, true, false, true]);
  ist('G1 anspruchLangsam: eine nicht messbare Dauer gilt als langsam (nie raten); bei Wartezeit 0 (nur mit Test-Kennung) gibt es keine Grenze', [anspruchLangsam(NaN, 3000), anspruchLangsam(undefined, 3000), anspruchLangsam(99999, 0), anspruchLangsam(NaN, 0)], [true, true, false, false]);
  {
    const T0 = Date.UTC(2026, 10, 10, 9, 37, 12, 345), mein = anlegenTag(T0, 'bbb');
    const spaeter = anlegenTag(T0 + 5000, 'aaa'), frueher = anlegenTag(T0 - 5000, 'aaa'), alt = anlegenTag(T0 - 70 * 60000, 'aaa');
    const g = (tags, allein) => anspruchGewonnen(tags, mein, T0 + 1000, { allein });
    ist('G1 Regel «nur allein» (das eigene Schreiben war langsam): ganz allein → gewonnen', [g([mein], true).ok, g([mein], true).art], [true, 'gewonnen']);
    ist('G1 Regel «nur allein»: eine SPÄTERE aktive Markierung eines anderen → NICHT gewonnen, Art «nicht-allein» (ohne die Regel gewänne dieser Lauf als «kleinster»)', [g([mein, spaeter], true).ok, g([mein, spaeter], true).art, /zu lange/.test(g([mein, spaeter], true).grund), g([mein, spaeter], false).ok], [false, 'nicht-allein', true, true]);
    ist('G1 Regel «nur allein»: eine FRÜHERE Markierung eines anderen bleibt ein gewöhnlicher Verlust (Art «verloren»)', g([mein, frueher], true).art, 'verloren');
    ist('G1 Regel «nur allein»: eine nicht mehr aktive Markierung (70 Minuten alt) und fremde Tags zählen nicht als zweiter Lauf', [g([mein, alt], true).ok, g([mein, 'printful-synced', 'cj-shipped', 'printful-versuch-1'], true).ok], [true, true]);
    ist('G1 Regel «nur allein»: fehlt die eigene Markierung, bleibt es «eigene-fehlt» (Lesefehler)', g([spaeter], true).art, 'eigene-fehlt');
    ist('G1 anspruchGewonnen ohne vierte Angabe verhält sich wie bisher (allein = false)', [anspruchGewonnen([mein, spaeter], mein, T0 + 1000).ok, anspruchGewonnen([mein, frueher], mein, T0 + 1000).art], [true, 'verloren']);
    // T5 (Tests-Prüfer): fremde Tags, die alphabetisch VOR «printful-anlegen-» stehen, zählen nicht als Anspruch (sonst bliebe die Bestellung still liegen)
    ist('T5 Anspruch: fremde Tags, die alphabetisch VOR «printful-anlegen-» sortieren («cj-shipped», «Aktion», «a1», «0815»), stören nicht → gewonnen', [g(['cj-shipped', 'Aktion', 'a1', '0815', mein], false), g(['cj-shipped', 'Aktion', 'a1', '0815', mein], true)], Array(2).fill({ ok: true, grund: null, art: 'gewonnen' }));
    ist('T5 Anspruch: auch ein Tag, das nur so ÄHNLICH aussieht («printful-anlegen», «printful-anlegen-x», «printful-anlege-20261110t0937»), ist kein Anspruch', g(['printful-anlegen', 'printful-anlegen-x', 'printful-anlege-20261110t0937', mein], true).ok, true);
  }

  // ── G2: nur «draft» ist ein Entwurf
  ist('G2 alsEntwurfAngelegt: «draft» (auch «Draft», « DRAFT ») ist ein Entwurf', ['draft', 'Draft', ' DRAFT '].map((s) => alsEntwurfAngelegt({ id: 1, status: s })), Array(3).fill({ ok: true, status: 'draft' }));
  for (const s of ['pending', 'inprocess', 'fulfilled', 'failed', 'onhold', 'canceled', 'drafts', 'draft2', 'x']) ist(`G2 alsEntwurfAngelegt: Status «${s}» ist KEIN Entwurf`, alsEntwurfAngelegt({ id: 1, status: s }), { ok: false, status: s });
  for (const [n, r] of [['Status fehlt', { id: 1 }], ['Status leer', { id: 1, status: '' }], ['Status null', { id: 1, status: null }], ['Status eine Zahl', { id: 1, status: 1 }], ['Status wahr', { id: 1, status: true }], ['Status ein Objekt', { id: 1, status: { a: 'draft' } }], ['kein Ergebnis', null], ['Ergebnis ist Text', 'draft']]) ist(`G2 alsEntwurfAngelegt: ${n} → KEIN Entwurf (nie raten), Anzeige «(fehlt)»`, alsEntwurfAngelegt(r), { ok: false, status: '(fehlt)' });

  // ── G4: Einstellungen streng als Dezimalzahl
  ist('G4 dezimalLesen: «4», «0», «2.50», «-1», « 12.70 », «007» und die Zahl 4 sind Zahlen', ['4', '0', '2.50', '-1', ' 12.70 ', '007', 4].map(dezimalLesen), [4, 0, 2.5, -1, 12.7, 7, 4]);
  for (const w of ['0x10', '1e2', '1E2', 'Infinity', '-Infinity', 'NaN', 'abc', '60abc', '4,5', '+4', '4.', '.5', '1 000', '', '   ', 'aus', null, undefined, true, [4], {}]) ist(`G4 dezimalLesen(${JSON.stringify(w)}): keine Dezimalzahl → null (Number() läse «0x10» als 16 und «1e2» als 100)`, dezimalLesen(w), null);

  // ── G3: Fertigware druckt das feste Motiv des Besitzers; eine mitgegebene Datei-Eigenschaft ersetzt es nie
  {
    const fertig = (attrs, extra = {}) => zeile({ customAttributes: attrs, product: { productType: 'Poster', tags: ['printful_personalized_product'], metafield: { value: 'https://bilder.luxestyle.ch/motiv.png' } }, sku: '9_19515', variant: { sku: '9_19515' }, ...extra });
    for (const [n, attrs] of [['v6 «🖼️ Druckdatei (front)»', [A('🖼️ Druckdatei (front)', U('kunde'))]], ['v6 neu «_Druckdatei (front)»', [A('_Druckdatei (front)', U('kunde'))]], ['v5 «🖼️ Druckdatei (Vorne)»', [A('🖼️ Druckdatei (Vorne)', U('kunde'))]], ['v6 mit Karte', [A('🖼️ Druckdatei (front)', U('kunde')), karte6(['front'], { dt: { front: 'default' } })]]]) {
      const io = mkIo({ produkt: () => prodVon(268), kopf: () => ({ status: 200, bytes: png(7000, 5000) }) });
      const p = await plane([fertig(attrs)], io);
      ist(`G3 Fertigware mit Datei-Eigenschaft der Kundin (${n}): harter Befund «datei-bei-fertigware», KEIN Artikel, keine Netzabfrage (weder Variante noch Datei noch KI)`, [arten(p.befunde).filter((a) => a === 'datei-bei-fertigware').length, p.befunde.filter((b) => b.art === 'datei-bei-fertigware').every((b) => b.hart), p.items.length, io.log.produkt.length, io.log.kopf.length, io.log.kontrolle.length], [1, true, 0, 0, 0, 0]);
    }
    const p0 = await plane([fertig([])], mkIo({ produkt: () => prodVon(268), kopf: () => ({ status: 200, bytes: png(7000, 5000) }) }));
    ist('G3 Gegenprobe: Fertigware OHNE Datei-Eigenschaft druckt weiter das feste Motiv aus dem Metafeld', () => [p0.items[0].files, arten(p0.befunde)], [[{ type: 'default', url: 'https://bilder.luxestyle.ch/motiv.png' }], []]);
    const ed = await plane([zeile()]);
    ist('G3 Gegenprobe: ein EDITOR-Produkt (Tag wunschdesign) druckt weiter die Datei der Kundin', [ed.items.length, arten(ed.befunde).includes('datei-bei-fertigware')], [1, false]);
    const text = (await plane([fertig([A('🖼️ Druckdatei (front)', U('kunde'))])])).befunde.find((b) => b.art === 'datei-bei-fertigware').text;
    ist('G3 Der Befundtext nennt die Fertigware, enthält die Adresse der Kundendatei NICHT und bleibt unter 450 Zeichen', [/Fertigware/.test(text), /cloudinary/.test(text), text.length < 450], [true, false, true]);
  }

  // ── G5: Fulfillment-Order IN_PROGRESS ist nicht mehr druckbar
  {
    const ID1 = 'gid://shopify/LineItem/9001';
    const fo = (status) => ({ edges: [{ node: { id: 'f', status, assignedLocation: { location: FO_HAENDLER }, lineItems: { edges: [{ node: { lineItem: { id: ID1 } } }] } } }] });
    ist('G5 Standort: druckbar ist NUR «OPEN»', [...FO_DRUCKBAR], ['OPEN']);
    ist('G5 Standort: IN_PROGRESS (in Arbeit, teilweise erfüllt) am Händler-Standort → gehalten', [standortVon({ fulfillmentOrders: fo('IN_PROGRESS') }, ID1), standortVon({ fulfillmentOrders: fo('in_progress') }, ID1)], Array(2).fill({ art: 'gehalten', status: 'IN_PROGRESS' }));
    const io = mkIo();
    const p = await planeBestellung(bestellung([zeile()], { fulfillmentOrders: fo('IN_PROGRESS') }), io, { paket: paketAlles });
    ist('G5 Plan: Fulfillment-Order IN_PROGRESS → HARTER Befund «fulfillment-gehalten», kein Artikel, keine Netzabfrage; der Text nennt den Status und «teilweise erfüllt»', [arten(p.befunde), p.befunde[0]?.hart, p.items.length, io.log.produkt.length, /IN_PROGRESS/.test(p.befunde[0]?.text), /teilweise erfüllt/.test(p.befunde[0]?.text), p.befunde[0]?.text.length < 450], [['fulfillment-gehalten'], true, 0, 0, true, true, true]);
    const o = { ...bestellung([zeile()]), email: 'a@b.ch', shippingAddress: { name: 'T', address1: 'x', city: 'Basel', countryCodeV2: 'CH', zip: '4000' } };
    const soll = bestellStand(o, [ID1]);
    ist('G5 Frisches Lesen: wechselt die Fulfillment-Order nach dem Planen auf IN_PROGRESS, gilt die Bestellung als geändert (kein Anlegen, kein Bestätigen)', [bestellAbweichung(o, soll), bestellAbweichung({ ...o, fulfillmentOrders: fo('IN_PROGRESS') }, soll)?.art, /IN_PROGRESS/.test(bestellAbweichung({ ...o, fulfillmentOrders: fo('IN_PROGRESS') }, soll)?.text)], [null, 'geaendert', true]);
  }
}

// ═══════════════════════════════════════ Workflow-Schalter (Fund 12/20/24): das Verhalten, nicht nur der Text
// Der Schritt «Schreiben oder nur lesen?» aus printful-sync.yml wird ausgeführt (bash, leeres Verzeichnis, gefälschte Ausgabedateien), der Ausdruck für DRY_RUN nach den Regeln von GitHub Actions ausgewertet
// (Wahrheit: leere Zeichenkette, false, null sind falsch; die Zeichenkette '0' ist wahr; && liefert den ersten falschen Wert, sonst den letzten; || den ersten wahren, sonst den letzten).
{
  const pfad = (rel) => fileURLToPath(new URL(rel, import.meta.url));
  const inCI = process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true';
  // In der CI zählt eine nicht ausgecheckte Datei als FEHLER (früher: Konsolenzeile und still weiter, 3 Prüfungen fehlten); lokal wird übersprungen.
  const braucht = (rel, name) => {
    if (existsSync(pfad(rel))) return true;
    if (inCI) ist(`CI: ${name} muss im sparse-checkout des Jobs stehen (sonst läuft die zugehörige Prüfung still nicht)`, 'fehlt', 'da');
    else console.log(`(${name} nicht ausgecheckt → übersprungen)`);
    return false;
  };
  const wahrheit = (v) => v !== '' && v !== false && v !== null && v !== undefined;
  const ausdruck = (expr, ctx) => {
    const term = (s) => {
      s = s.trim(); let m;
      if ((m = /^([\w.]+) == '([^']*)'$/.exec(s))) return String(ctx[m[1]] ?? '') === m[2];
      if ((m = /^'([^']*)'$/.exec(s))) return m[1];
      throw new Error('Ausdruck nicht unterstützt: ' + s);
    };
    const und = (s) => { let w = true; for (const t of s.split(' && ')) { w = term(t); if (!wahrheit(w)) return w; } return w; };
    let w = ''; for (const t of expr.split(' || ')) { w = und(t); if (wahrheit(w)) return w; } return w;
  };
  ist('Ausdrucks-Auswerter: Probe an bekannten Fällen (&& liefert den letzten Wert, || den ersten wahren)', [ausdruck("a == '1' && '0' || '1'", { a: '1' }), ausdruck("a == '1' && '0' || '1'", { a: '2' }), ausdruck("a == '1' && '0' || '1'", {}), ausdruck("a == '1' && '' || 'x'", { a: '1' })], ['0', '1', '1', 'x']);
  const schritt = (t, id) => {
    const z = t.split('\n'); const i = z.findIndex((l) => new RegExp(`^\\s*id: ${id}\\s*$`).test(l)); if (i < 0) return null;
    const r = z.findIndex((l, k) => k > i && /^\s*run: \|\s*$/.test(l)); if (r < 0) return null;
    const ein = /^(\s*)/.exec(z[r])[1].length, k = [];
    for (let n = r + 1; n < z.length; n++) { const l = z[n]; if (l.trim() === '') { k.push(''); continue; } if (/^(\s*)/.exec(l)[1].length <= ein) break; k.push(l.slice(ein + 2)); }
    return k.join('\n');
  };
  const wfSync = '../../.github/workflows/printful-sync.yml';
  if (braucht(wfSync, '.github/workflows/printful-sync.yml')) {
    const t = readFileSync(pfad(wfSync), 'utf8');
    const skript = schritt(t, 'modus');
    ist('Workflow Fund 12: der Schritt «modus» ist als bash-Block lesbar', typeof skript === 'string' && skript.includes('GITHUB_OUTPUT'), true);
    const lauf = (ereignis, eingabe, datei) => {
      const dir = mkdtempSync(join(tmpdir(), 'pfmodus-'));
      try {
        if (datei) { mkdirSync(join(dir, 'dropship'), { recursive: true }); writeFileSync(join(dir, 'dropship', 'PRINTFUL-SYNC-FREI.txt'), 'frei\n'); }
        const out = join(dir, 'out.txt'), sum = join(dir, 'sum.txt'); writeFileSync(out, ''); writeFileSync(sum, '');
        const env = { PATH: process.env.PATH, GITHUB_OUTPUT: out, GITHUB_STEP_SUMMARY: sum };
        if (ereignis !== undefined) env.EREIGNIS = ereignis;
        if (eingabe !== undefined) env.DRY_EINGABE = eingabe;
        const r = spawnSync('bash', ['-e', '-c', skript], { cwd: dir, env, encoding: 'utf8' });
        const m = /^dry=(.*)$/m.exec(readFileSync(out, 'utf8'));
        return { status: r.status, dry: m ? m[1] : null, zeilen: (readFileSync(out, 'utf8').match(/^dry=/gm) || []).length };
      } finally { rmSync(dir, { recursive: true, force: true }); }
    };
    // [Ereignis, Eingabe «Nur testen», Freigabedatei da?, erwartet dry]
    for (const [e, ein, datei, soll] of [
      ['schedule', '', false, '1'], ['schedule', '', true, '0'], ['schedule', undefined, true, '0'], ['schedule', 'false', false, '1'], ['schedule', 'true', true, '0'],
      ['workflow_dispatch', 'false', false, '0'], ['workflow_dispatch', 'false', true, '0'], ['workflow_dispatch', 'true', true, '1'], ['workflow_dispatch', 'true', false, '1'],
      ['workflow_dispatch', '', true, '1'], ['workflow_dispatch', undefined, true, '1'], ['workflow_dispatch', 'FALSE', false, '1'], ['workflow_dispatch', '0', false, '1'], ['workflow_dispatch', 'no', false, '1'],
      ['push', 'false', true, '1'], ['repository_dispatch', 'false', true, '1'], ['pull_request', 'false', true, '1'], ['workflow_call', 'false', true, '1'], ['', 'false', true, '1'], [undefined, 'false', true, '1'], [undefined, undefined, false, '1'],
    ]) {
      const r = lauf(e, ein, datei);
      ist(`Workflow Fund 12: Ereignis «${e}», Eingabe «${ein}», Freigabedatei ${datei ? 'da' : 'fehlt'} → dry=${soll}`, [r.status, r.dry, r.zeilen], [0, soll, 1]);
    }
    const expr = (/DRY_RUN: \$\{\{ (.+?) \}\}/.exec(t) || [])[1];
    ist('Workflow Fund 5/12: der Sync-Schritt reicht DRY_RUN aus dem Ergebnis des Schritts «modus» durch (kein anderer Weg)', [typeof expr, /steps\.modus\.outputs\.dry/.test(expr || ''), (t.match(/^\s*DRY_RUN:/gm) || []).length], ['string', true, 1]);
    for (const [dry, soll] of [['0', '0'], ['1', '1'], ['', '1'], [undefined, '1'], ['2', '1'], ['false', '1']]) ist(`Workflow Fund 12: Ausdruck von DRY_RUN bei Ergebnis «${dry}» → «${soll}» (nur ausdrücklich «0» schreibt; fehlt das Ergebnis, bleibt es Trockenlauf)`, ausdruck(expr, { 'steps.modus.outputs.dry': dry }), soll);
    ist('Workflow Fund 12: der Handstart steht auf «Nur testen» (Standard true)', /dry_run:[\s\S]*?type: boolean\s+default: true/.test(t), true);
    ist('Workflow Fund 7: PRINTFUL_MAX_KOSTEN_USD wird durchgereicht, die KI-Kontrolle steht standardmässig auf «aus»', [/PRINTFUL_MAX_KOSTEN_USD: \$\{\{/.test(t), /PRINTFUL_KI_KONTROLLE: \$\{\{ secrets\.PRINTFUL_KI_KONTROLLE \|\| vars\.PRINTFUL_KI_KONTROLLE \|\| 'aus' \}\}/.test(t)], [true, true]);
  }
  const wfPreis = '../../.github/workflows/printful-reprice.yml';
  if (braucht(wfPreis, '.github/workflows/printful-reprice.yml')) {
    const t = readFileSync(pfad(wfPreis), 'utf8');
    const dry = (/DRY_RUN: \$\{\{ (.+?) \}\}/.exec(t) || [])[1], senken = (/SENKEN: \$\{\{ (.+?) \}\}/.exec(t) || [])[1];
    ist('Workflow Fund 10: Preisanpassung: DRY_RUN=0 nur bei apply=true, SENKEN nur bei senken=true', [dry && ['true', 'false', '', undefined].map((v) => ausdruck(dry, { 'github.event.inputs.apply': v })), senken && ['true', 'false', '', undefined].map((v) => ausdruck(senken, { 'github.event.inputs.senken': v }))], [['0', '1', '1', '1'], ['1', '', '', '']]);
    ist('Workflow Fund 10: der Handstart der Preisanpassung hat «apply» und «senken» mit Standard false', [/apply:[\s\S]*?default: false/.test(t), /senken:[\s\S]*?default: false/.test(t)], [true, true]);
    ist('Workflow Fund 10: SENKEN wird aus der Eingabe «senken» gesetzt und sonst leer gelassen (Vorgabe: nur Erhöhungen)', /SENKEN: \$\{\{ github\.event\.inputs\.senken == 'true' && '1' \|\| '' \}\}/.test(t), true);
  }

  // ── CI-Verdrahtung (Fund 11/15/16/17/26): die Tests und ihre Quellen müssen im Job laufen können
  const wfCi = '../../.github/workflows/luxestyle-automation-tests.yml';
  if (braucht(wfCi, '.github/workflows/luxestyle-automation-tests.yml')) {
    const t = readFileSync(pfad(wfCi), 'utf8');
    const zeilen = t.split('\n');
    const abschnitt = (von, bis) => { const a = zeilen.findIndex((l) => von.test(l)); if (a < 0) return []; const rest = zeilen.slice(a + 1); const b = rest.findIndex((l) => bis.test(l)); return b < 0 ? rest : rest.slice(0, b); };
    const eintraege = (l) => l.map((x) => x.trim()).filter((x) => x.startsWith('- ') || /^[\w./*@-]+$/.test(x)).map((x) => x.replace(/^- /, '').replace(/^'|'$/g, '').trim());
    const paths = eintraege(abschnitt(/^\s{4}paths:\s*$/, /^\s{2}\S|^\S|^  workflow_dispatch/));
    const jobTests = zeilen.slice(zeilen.findIndex((l) => /^  tests:\s*$/.test(l)), zeilen.findIndex((l) => /^  lagerbestand:\s*$/.test(l)));
    const sp = (() => { const a = jobTests.findIndex((l) => /sparse-checkout: \|\s*$/.test(l)); const r = []; for (let i = a + 1; i < jobTests.length && /^\s{12}\S/.test(jobTests[i]); i++) r.push(jobTests[i].trim()); return r; })();
    const glob = (m) => new RegExp('^' + m.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
    const imPfadfilter = (f) => paths.some((m) => glob(m).test(f));
    const imAuszug = (f) => sp.some((m) => (m.includes('*') ? glob(m).test(f) : f === m || f.startsWith(m.replace(/\/$/, '') + '/')));
    ist('CI Fund 16: Pfadfilter und sparse-checkout des Jobs «tests» sind lesbar (sonst wären die folgenden Prüfungen leer)', [paths.length > 20, sp.length > 20, jobTests.length > 50], [true, true, true]);
    const ausgefuehrt = new Set([...jobTests.join('\n').matchAll(/^\s+node (\S+\.mjs)\b/gm)].map((m) => m[1]));
    const nurPruefen = new Set([...jobTests.join('\n').matchAll(/^\s+node --check (\S+\.mjs)\b/gm)].map((m) => m[1]));
    ist('CI Fund 11/15: der Test der Preisanpassung läuft in der CI, ebenso Sync- und Bestellweg-Test', ['automation/printful_reprice_test.mjs', 'automation/printful_sync_test.mjs', 'automation/lib/printful_bestellweg_test.mjs', 'automation/lib/printful_platzierung_test.mjs'].filter((x) => !ausgefuehrt.has(x)), []);
    ist('CI Fund 15: die Schreibskripte des Bestellwegs und der Preisanpassung stehen in der Liste «node --check»', ['automation/printful_sync.mjs', 'automation/lib/printful_bestellweg.mjs', 'automation/printful_reprice.mjs'].filter((x) => !nurPruefen.has(x)), []);
    ist('CI Fund 15/19: die Mutationsprobe des Bestellwegs läuft in der CI mit --pruefen (die volle Probe ist ein eigener Handstart)', /node dropship\/selbst-gestalten-fertig-0511\/bestellweg\/mutation\.mjs --pruefen/.test(jobTests.join('\n')), true);
    // Jede Datei, die der Test einliest, muss im Pfadfilter stehen (sonst löst eine Änderung den Job nicht aus) UND im Auszug des Jobs (sonst läuft die Prüfung still nicht oder mit «Cannot find module»)
    const noetig = ['automation/printful_sync.mjs', 'automation/printful_sync_test.mjs', 'automation/printful_reprice.mjs', 'automation/printful_reprice_test.mjs', 'automation/lib/printful_bestellweg.mjs', 'automation/lib/printful_bestellweg_test.mjs', 'automation/lib/printful_platzierung.mjs',
      'dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs', 'dropship/selbst-gestalten-fertig-0511/bestellweg/standort_messung_1011.json', 'dropship/wp6-0611/SYNC.md', ...['6.2.0', '6.3.0', '6.3.1', '6.4.0', '6.4.1'].map((v) => `pod/v6/lspod-designer-v6-${v}.js`), '.github/workflows/printful-sync.yml', '.github/workflows/printful-reprice.yml', '.github/workflows/luxestyle-automation-tests.yml'];
    ist('CI Fund 16/26: alle Dateien des Bestellwegs (Quellen, Tests, SYNC.md, Editor 6.4.0, Workflows) stehen im Pfadfilter', noetig.filter((f) => !imPfadfilter(f)), []);
    ist('CI Fund 16/26: …und im sparse-checkout des Jobs «tests» (sonst werden die Abgleiche still übersprungen)', noetig.filter((f) => !imAuszug(f)), []);
    ist('CI Fund 17: das Zeitlimit des Jobs «tests» ist gesetzt und lässt Luft für die Messung (mindestens 10 Minuten)', (() => { const m = /timeout-minutes: (\d+)/.exec(jobTests.join('\n')); return m ? Number(m[1]) >= 10 : false; })(), true);
  }

  // ── ZWEITE RUNDE 10.11.2026 (Gegenleser Linse 2, Fund 1/3/4/6): die übrige Verdrahtung der Workflows wird festgehalten, nicht nur der Schritt «modus»
  {
    // Blöcke des YAML ohne Parser: der Text unter einer Überschrift bis zur nächsten Zeile mit gleichem oder kleinerem Einzug
    const block = (text, kopf) => {
      const z = text.split('\n'); const i = z.findIndex((l) => l === kopf || l.trimEnd() === kopf);
      if (i < 0) return null;
      const ein = /^(\s*)/.exec(z[i])[1].length, r = [];
      for (let k = i + 1; k < z.length; k++) { const l = z[k]; if (l.trim() === '' || /^\s*#/.test(l)) { r.push(l); continue; } if (/^(\s*)/.exec(l)[1].length <= ein) break; r.push(l); }
      return r.join('\n');
    };
    const ohneKommentar = (text) => text.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
    if (braucht(wfSync, '.github/workflows/printful-sync.yml')) {
      const t = readFileSync(pfad(wfSync), 'utf8'), c = ohneKommentar(t);
      const conc = block(c, 'concurrency:') || '';
      ist('R2 Workflow Sync (L2/1): die Concurrency-Gruppe ist der FESTE Text «printful-sync» (kein ${{ }}, nie eine Gruppe je Lauf) und bricht laufende Läufe NICHT ab (cancel-in-progress genau false)', [/^\s+group: printful-sync\s*$/m.test(conc), /\$\{\{/.test(conc), /^\s+cancel-in-progress: false\s*$/m.test(conc)], [true, false, true]);
      const tm = /timeout-minutes: (\d+)/.exec(c);
      ist('R2 Workflow Sync (L2/1): das Zeitlimit des Jobs ist gesetzt, mindestens 5 und höchstens 20 Minuten (ein hängender Lauf hält die Concurrency-Gruppe)', [!!tm, tm ? Number(tm[1]) >= 5 && Number(tm[1]) <= 20 : null], [true, true]);
      const crons = [...c.matchAll(/^\s*-\s*cron:\s*'([^']*)'\s*$/gm)].map((m) => m[1]);
      ist('R2 Workflow Sync (L2/3): genau EIN Zeitplan, und er läuft einmal täglich (feste Minute und Stunde, sonst nur Sterne)', [crons.length, crons.length === 1 && /^\d{1,2} \d{1,2} \* \* \*$/.test(crons[0])], [1, true]);
      ist('R2 Workflow Sync: der Zeitplan ist nicht auskommentiert und es gibt keine weiteren Auslöser ausser Handstart (on: nur schedule und workflow_dispatch)', [...(block(c, 'on:') || '').split('\n').filter((l) => /^  \S/.test(l)).map((l) => l.trim())], ['schedule:', 'workflow_dispatch:']);
      const sparse = (block(c, '        with:') || '').split('\n').filter((l) => /^\s{12}\S/.test(l)).map((l) => l.trim());
      ist('R2 Workflow Sync (L2/3): die Freigabedatei steht im sparse-checkout (sonst wäre sie im Lauf nie da und der Zeitplan bliebe für immer Trockenlauf)', sparse.includes('dropship/PRINTFUL-SYNC-FREI.txt'), true);
      const eingaben = block(c, '    inputs:') || '';
      const eingabeNamen = eingaben.split('\n').filter((l) => /^      \w+:/.test(l)).map((l) => l.trim().replace(':', ''));
      const dryEnv = (/^\s*DRY_EINGABE: \$\{\{ github\.event\.inputs\.(\w+) \}\}\s*$/m.exec(c) || [])[1];
      ist('R2 Workflow Sync (L2/3): die Umgebungsvariable DRY_EINGABE zeigt auf eine Eingabe, die der Handstart wirklich hat (heisst sie anders, bliebe der Handstart für immer Trockenlauf)', [eingabeNamen.includes(dryEnv), dryEnv], [true, 'dry_run']);
      ist('R2 Workflow Sync (L2/3): der Schritt «modus» liest genau diese Umgebungsvariable und das Ereignis', [/\$DRY_EINGABE/.test(schritt(t, 'modus') || ''), /\$EREIGNIS/.test(schritt(t, 'modus') || ''), /EREIGNIS: \$\{\{ github\.event_name \}\}/.test(c)], [true, true, true]);
      for (const [name, wert] of [['PRINTFUL_API_KEY', 'secrets.PRINTFUL_API_KEY'], ['PRINTFUL_STORE_ID', 'secrets.PRINTFUL_STORE_ID'], ['MAX', 'secrets.PRINTFUL_MAX || vars.PRINTFUL_MAX'], ['GEMINI_API_KEY', 'secrets.GEMINI_API_KEY'], ['SHOPIFY_SHOP', 'secrets.SHOPIFY_SHOP'], ['SHOPIFY_CLIENT_ID', 'secrets.SHOPIFY_CLIENT_ID'],
        ['SHOPIFY_CLIENT_SECRET', 'secrets.SHOPIFY_CLIENT_SECRET'], ['SHOPIFY_ADMIN_TOKEN', 'secrets.SHOPIFY_ADMIN_TOKEN'], ['TELEGRAM_BOT_TOKEN', 'secrets.TELEGRAM_BOT_TOKEN'], ['TELEGRAM_CHAT_ID', 'secrets.TELEGRAM_CHAT_ID']]) {
        ist(`R2 Workflow Sync (L2/3): ${name} wird aus ${wert.replace(/ \|\| /, ' oder ')} durchgereicht`, new RegExp(`^\\s+${name}: \\$\\{\\{ ${wert.replace(/[.|]/g, '\\$&')} \\}\\}\\s*$`, 'm').test(c), true);
      }
      ist('R2 Workflow Sync (L2/3): die Rechte sind genau «contents: read» (kein write)', [(block(c, 'permissions:') || '').split('\n').filter((l) => l.trim()).map((l) => l.trim()), /:\s*write\b/.test(c)], [['contents: read'], false]);
      ist('R2 Workflow Sync: der Auslieferungszustand ist Trockenlauf-sicher (Standard der Handstart-Eingabe true, kein DRY_RUN fest auf 0)', [/default: true/.test(eingaben), /DRY_RUN: '?0'?\s*$/m.test(c)], [true, false]);
    }
    if (braucht(wfPreis, '.github/workflows/printful-reprice.yml')) {
      const t = readFileSync(pfad(wfPreis), 'utf8'), c = ohneKommentar(t);
      const eingabe = (name) => { const z = (block(c, '    inputs:') || '').split('\n'); const i = z.findIndex((l) => l.trim() === name + ':'); if (i < 0) return ''; const r = []; for (let k = i + 1; k < z.length && /^\s{8}/.test(z[k]); k++) r.push(z[k].trim()); return r.join('\n'); };
      ist('R2 Workflow Preise (L2/4): «apply» hat den Standard false (ein Klick ohne Haken schreibt keine Preise), «senken» ebenso', [/default: false/.test(eingabe('apply')), /default: true/.test(eingabe('apply')), /default: false/.test(eingabe('senken')), /default: true/.test(eingabe('senken'))], [true, false, true, false]);
      ist('R2 Workflow Preise (L2/4): der Standard-Tag der Eingabe ist «wunschdesign» (die Editor-Produkte), der Aufschlag 2.3', [/default: 'wunschdesign'/.test(eingabe('tag')), /default: '2\.3'/.test(eingabe('markup'))], [true, true]);
      ist('R2 Workflow Preise (L2/4): ist die Eingabe «tag» leer, gilt ebenfalls «wunschdesign» (nicht die Fertigware)', /TAG: \$\{\{ github\.event\.inputs\.tag \|\| 'wunschdesign' \}\}/.test(c), true);
      ist('R2 Workflow Preise (L2/4): es gibt NUR den Handstart (kein schedule, kein push)', (block(c, 'on:') || '').split('\n').filter((l) => /^  \S/.test(l)).map((l) => l.trim()), ['workflow_dispatch:']);
      ist('R2 Workflow Preise (L2/4): die Rechte sind genau «contents: read»; die Concurrency-Gruppe ist fest und bricht nicht ab', [(block(c, 'permissions:') || '').split('\n').filter((l) => l.trim()).map((l) => l.trim()), /:\s*write\b/.test(c), /^\s+group: printful-reprice\s*$/m.test(block(c, 'concurrency:') || ''), /^\s+cancel-in-progress: false\s*$/m.test(block(c, 'concurrency:') || '')], [['contents: read'], false, true, true]);
    }
    if (braucht(wfCi, '.github/workflows/luxestyle-automation-tests.yml')) {
      const t = readFileSync(pfad(wfCi), 'utf8');
      const zeilen = t.split('\n');
      const jobTests = zeilen.slice(zeilen.findIndex((l) => /^  tests:\s*$/.test(l)), zeilen.findIndex((l) => /^  lagerbestand:\s*$/.test(l)));
      const lauf = (datei) => jobTests.filter((l) => new RegExp(`^\\s+node ${datei.replace(/[.]/g, '\\.')}\\s*(#.*)?$`).test(l)).length;
      ist('R2 CI (L2/6): die Tests des Bestellwegs laufen als EINE reine «node <Datei>»-Zeile (kein «|| true», kein «;», kein «&&» dahinter), genau einmal', ['automation/printful_reprice_test.mjs', 'automation/printful_sync_test.mjs', 'automation/lib/printful_bestellweg_test.mjs', 'automation/lib/printful_platzierung_test.mjs'].map(lauf), [1, 1, 1, 1]);
      ist('R2 CI (L2/6): auch die Mutationsprobe (--pruefen) ist eine reine Zeile', jobTests.filter((l) => /^\s+node dropship\/selbst-gestalten-fertig-0511\/bestellweg\/mutation\.mjs --pruefen\s*(#.*)?$/.test(l)).length, 1);
      ist('R2 CI (L2/6): im Job «tests» steht weder «continue-on-error» noch «|| true» noch «set +e»', [/continue-on-error/.test(jobTests.filter((l) => !/^\s*#/.test(l)).join('\n')), /\|\| true\b/.test(jobTests.filter((l) => !/^\s*#/.test(l)).join('\n')), /set \+e/.test(jobTests.join('\n'))], [false, false, false]);
      const tm = /timeout-minutes: (\d+)/.exec(jobTests.filter((l) => !/^\s*#/.test(l)).join('\n'));
      ist('R2 CI (L2/7): das Zeitlimit des Jobs «tests» liegt zwischen 20 und 30 Minuten (lokal gemessen rund 600 s Schritte, also über 60 % von 15 Minuten; die Doku nennt keine «obere Schranke» mehr und SYNC.md 7.7 nennt 20)', [!!tm, tm ? Number(tm[1]) >= 20 && Number(tm[1]) <= 30 : null], [true, true]);
    }
  }

  // ── SCHLUSSPRÜFUNG 10.11.2026 (Tests-Prüfer T1, T2, T6, T7; Geld-Prüfer G1): Verdrahtung, die bisher kein Test festhielt
  {
    const ohneKommentar = (text) => text.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
    const repo = fileURLToPath(new URL('../../', import.meta.url));
    const TESTS = ['automation/lib/printful_bestellweg_test.mjs', 'automation/printful_sync_test.mjs', 'automation/printful_reprice_test.mjs', 'automation/lib/printful_platzierung_test.mjs', 'automation/printful_tracking_test.mjs'];
    if (braucht(wfCi, '.github/workflows/luxestyle-automation-tests.yml')) {
      const t = readFileSync(pfad(wfCi), 'utf8'), zeilen = t.split('\n');
      const job = zeilen.slice(zeilen.findIndex((l) => /^  tests:\s*$/.test(l)), zeilen.findIndex((l) => /^  lagerbestand:\s*$/.test(l))).filter((l) => !/^\s*#/.test(l));
      const schritte = []; for (const l of job) { if (/^      - /.test(l)) schritte.push([l]); else if (schritte.length) schritte[schritte.length - 1].push(l); }   // jeder Schritt beginnt mit «      - »
      const ohneRest = (l) => l.trim().replace(/\s+#.*$/, '');
      const mit = schritte.filter((s) => s.some((l) => TESTS.some((d) => ohneRest(l) === 'node ' + d)));
      // T7: auch der Test der Rückmeldung (printful_tracking_test.mjs, Geldpfad Printful → Shopify) gehört in die geforderte Liste
      ist('T1/T7 CI: alle fünf Tests des Bestellwegs samt Rückmeldung stehen in EINEM Schritt des Jobs «tests», jeder als reine Zeile', [mit.length, mit[0] ? TESTS.filter((d) => mit[0].filter((l) => ohneRest(l) === 'node ' + d).length !== 1) : TESTS], [1, []]);
      const s = mit[0] || [];
      ist('T1 CI: der Job «tests» hat keine Bedingung («if:» auf Job-Ebene; sonst liefe er zum Beispiel nur beim Handstart und bei Pull Requests nie)', job.filter((l) => /^    if\s*:/.test(l)), []);
      ist('T1 CI: der Schritt mit den Bestellweg-Tests hat weder «if:» noch ein eigenes Zeitlimit noch «continue-on-error» noch eine eigene Shell', s.filter((l) => /^        (if|timeout-minutes|continue-on-error|shell|working-directory)\s*:/.test(l)), []);
      const envSchluessel = (zs, ein) => { const i = zs.findIndex((l) => new RegExp(`^ {${ein}}env:\\s*$`).test(l)); if (i < 0) return []; const r = []; for (let k = i + 1; k < zs.length && new RegExp(`^ {${ein + 2}}\\S`).test(zs[k]); k++) r.push(zs[k].trim().split(':')[0]); return r; };
      ist('T1 CI: der Schritt setzt als Umgebung nur CJ_PAUSE_MS (ein leer gesetztes CI oder GITHUB_ACTIONS machte aus «Datei fehlt im Auszug» einen stillen Übersprung)', envSchluessel(s, 8), ['CJ_PAUSE_MS']);
      ist('T1 CI: nirgends im Workflow wird CI oder GITHUB_ACTIONS gesetzt (weder am Schritt noch am Job noch global)', [ohneKommentar(t).split('\n').filter((l) => /^\s*(CI|GITHUB_ACTIONS)\s*:/.test(l)), envSchluessel(job, 4), envSchluessel(ohneKommentar(t).split('\n'), 0)], [[], [], []]);
      const r = s.findIndex((l) => /^        run: \|\s*$/.test(l));
      const block = r < 0 ? [] : s.slice(r + 1);
      const letzte = Math.max(-1, ...TESTS.map((d) => block.findIndex((l) => ohneRest(l) === 'node ' + d)));
      ist('T1 CI: der Schritt hat genau einen «run: |»-Block, und bis zur letzten Testzeile des Bestellwegs steht darin nichts ausser reinen «node <Datei>»-Zeilen (kein «exit 0», «true», «:», «return», kein «;», «&&», «||»)', [s.filter((l) => /^        run:/.test(l)).length, r >= 0, letzte >= 0, block.slice(0, letzte + 1).filter((l) => l.trim() !== '' && !/^ {10}node [\w./-]+\.mjs( --pruefen)?\s*(#.*)?$/.test(l))], [1, true, true, []]);
      ist('T2 CI: der Job «tests» läuft mit Node 22 (genau eine Angabe)', job.filter((l) => /node-version\s*:/.test(l)).map((l) => l.trim()), ["node-version: '22'"]);
      // T6: die Freigabedatei schaltet den Zeitplan scharf; ein Pull Request, der NUR sie legt, muss die Tests auslösen, und der Auszug des Jobs muss sie enthalten (sonst sähe die Prüfung unten sie in der CI nie)
      const eintraege = (von, bis) => { const a = zeilen.findIndex((l) => von.test(l)); if (a < 0) return []; const rest = zeilen.slice(a + 1); const b = rest.findIndex((l) => bis.test(l)); return (b < 0 ? rest : rest.slice(0, b)).map((x) => x.trim().replace(/^- /, '').replace(/^'|'$/g, '')); };
      const sparse = (() => { const a = job.findIndex((l) => /sparse-checkout: \|\s*$/.test(l)); const x = []; for (let i = a + 1; a >= 0 && i < job.length && /^\s{12}\S/.test(job[i]); i++) x.push(job[i].trim()); return x; })();
      ist('T6 CI: die Freigabedatei dropship/PRINTFUL-SYNC-FREI.txt steht im Pfadfilter («paths:») UND im sparse-checkout des Jobs «tests»', [eintraege(/^\s{4}paths:\s*$/, /^\s{2}\S|^\S/).includes('dropship/PRINTFUL-SYNC-FREI.txt'), sparse.includes('dropship/PRINTFUL-SYNC-FREI.txt')], [true, true]);
    }
    if (braucht(wfSync, '.github/workflows/printful-sync.yml')) {
      const c = ohneKommentar(readFileSync(pfad(wfSync), 'utf8'));
      ist('T2 Workflow Sync: genau EIN Schritt startet ein Skript, einzeilig und ohne Zusatz: «node automation/printful_sync.mjs»', [...c.matchAll(/^\s+run: (?!\|)(.*)$/gm)].map((m) => m[1].trim()), ['node automation/printful_sync.mjs']);
      ist('T2 Workflow Sync: im ganzen Workflow startet node kein anderes Skript', [...c.matchAll(/\bnode\s+(\S+\.(?:mjs|cjs|js))/g)].map((m) => m[1]), ['automation/printful_sync.mjs']);
      ist('T2 Workflow Sync: der Lauf nutzt Node 22 (genau eine Angabe)', [...c.matchAll(/node-version\s*:\s*(.*)$/gm)].map((m) => m[1].trim()), ["'22'"]);
      ist('G1 Workflow Sync: der Workflow setzt GITHUB_ACTIONS nicht selbst (der Läufer setzt es; nur dort darf der Sync schreiben)', /^\s*GITHUB_ACTIONS\s*:/m.test(c), false);
    }
    // G1: die drei Schalter des Rennens gehören in KEINE Workflow-Datei: die Wartezeit (nur für Tests senkbar), die Ausnahme für den eigenen Rechner und die Test-Kennung. Geprüft wird jede ausgecheckte Workflow-Datei, auch ihre Kommentare.
    {
      const dir = join(repo, '.github', 'workflows');
      const dateien = existsSync(dir) ? readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort() : [];
      const pflicht = ['printful-sync.yml', 'printful-reprice.yml', 'luxestyle-automation-tests.yml'];
      if (pflicht.map((f) => braucht('../../.github/workflows/' + f, '.github/workflows/' + f)).every(Boolean)) {
        const VERBOTEN = ['PRINTFUL_ANSPRUCH_WARTE_MS', 'PRINTFUL_LOKAL_SCHARF', 'PRINTFUL_ANSPRUCH_TESTKENNUNG', ANSPRUCH_TESTKENNUNG];
        ist('G1 Workflows: in KEINER Workflow-Datei steht PRINTFUL_ANSPRUCH_WARTE_MS, PRINTFUL_LOKAL_SCHARF, PRINTFUL_ANSPRUCH_TESTKENNUNG oder der Wert der Test-Kennung (auch nicht in einem Kommentar)', dateien.flatMap((f) => { const t = readFileSync(join(dir, f), 'utf8'); return VERBOTEN.filter((v) => t.includes(v)).map((v) => `${f}: ${v}`); }), []);
        ist('G1 Workflows: die drei Workflows des Bestellwegs gehören zu den geprüften Dateien', pflicht.filter((f) => !dateien.includes(f)), []);
      }
    }
    // T6: der Stand der Freigabe ist eine AUSDRÜCKLICHE Testzeile. Wer dropship/PRINTFUL-SYNC-FREI.txt legt, schaltet den täglichen Lauf scharf und muss diese Zeile bewusst auf «liegt» ändern (im selben Pull Request).
    {
      const freigabe = (wurzel) => (existsSync(join(wurzel, 'dropship', 'PRINTFUL-SYNC-FREI.txt')) ? 'liegt' : 'fehlt');
      ist('T6 Freigabedatei dropship/PRINTFUL-SYNC-FREI.txt FEHLT (Stand: noch nicht freigegeben, der Zeitplan liest nur). Wer sie legt, schaltet den Zeitplan scharf und ändert diese Zeile bewusst auf «liegt»', freigabe(repo), 'fehlt');
      const d = mkdtempSync(join(tmpdir(), 'pffrei-'));
      try {
        mkdirSync(join(d, 'dropship'));
        const leer = freigabe(d); writeFileSync(join(d, 'dropship', 'PRINTFUL-SYNC-FREI.txt'), 'frei\n');
        ist('T6 Gegenprobe des Messgeräts: ein Ordner ohne die Datei ist «fehlt», mit der Datei «liegt»', [leer, freigabe(d)], ['fehlt', 'liegt']);
      } finally { rmSync(d, { recursive: true, force: true }); }
    }
  }
}


// ═══════════════════════════════════════ Mutationsskript: Verteilung der vollen Probe auf mehrere Prozesse (SHARD=<i>/<n>)
// Die volle Probe dauert mit den gehärteten Tests über eine Stunde; mit SHARD teilen sich mehrere Prozesse die Mutanten. Jeder Mutant muss in genau einem Teil liegen, sonst bliebe einer ungeprüft oder liefe doppelt.
{
  const mut = new URL('../../dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs', import.meta.url);
  if (existsSync(fileURLToPath(mut))) {
    const { shardLesen, imShard, MUTANTEN } = await import(mut.href);
    ist('SHARD: keine Angabe oder leer → null (alle Mutanten)', [shardLesen(undefined), shardLesen(''), shardLesen('  ')], [null, null, null]);
    ist('SHARD: «2/3» und « 1/1 » werden gelesen', [shardLesen('2/3'), shardLesen(' 1/1 ')], [{ i: 2, n: 3 }, { i: 1, n: 1 }]);
    for (const falsch of ['0/3', '4/3', '1/0', 'a', '2/', '/3', '1/2/3', '-1/3', '1.5/3']) {
      let fehler = null; try { shardLesen(falsch); } catch (e) { fehler = e.message; }
      ist(`SHARD: «${falsch}» ist ungültig und bricht ab (kein stilles Überspringen)`, typeof fehler === 'string' && /SHARD/.test(fehler), true);
    }
    for (const n of [1, 2, 3, 4, 7]) {
      const zaehler = new Array(MUTANTEN.length).fill(0);
      for (let i = 1; i <= n; i++) MUTANTEN.forEach((_, nr) => { if (imShard(nr, { i, n })) zaehler[nr]++; });
      ist(`SHARD: bei ${n} Teilen liegt jeder der ${MUTANTEN.length} Mutanten in genau einem Teil`, zaehler.every((z) => z === 1), true);
    }
    ist('SHARD: ohne Teilung gehört jeder Mutant dazu', [imShard(0, null), imShard(424, null)], [true, true]);
    // ZWEITE RUNDE 10.11.2026 (Gegenleser Linse 2, Fund 8): eine Zeitüberschreitung, ein Signal oder ein Startfehler des Kindprozesses heisst NICHT «erkannt» (der Test hat dann nichts festgestellt)
    const { testen } = await import(mut.href);
    const TEST_DATEIEN = ['automation/printful_reprice_test.mjs', 'automation/lib/printful_bestellweg_test.mjs', 'automation/lib/printful_platzierung_test.mjs', 'automation/printful_sync_test.mjs'];
    const wurzel = (ersteDatei) => {
      const d = mkdtempSync(join(tmpdir(), 'mutation-testen-'));
      TEST_DATEIEN.forEach((f, i) => { mkdirSync(join(d, f, '..'), { recursive: true }); writeFileSync(join(d, f), i === 0 ? ersteDatei : 'process.exit(0);\n'); });
      return d;
    };
    const einordnen = (ersteDatei, limit) => { const d = wurzel(ersteDatei); try { return testen(d, limit); } finally { rmSync(d, { recursive: true, force: true }); } };
    ist('Probe (Einordnung): alle vier Testdateien grün → null (nichts erkannt)', einordnen('process.exit(0);\n', 5000), null);
    ist('Probe (Einordnung): eine benannte Prüfung ist rot (Zeile «✗ …», Exit 1) → «pruefung»', einordnen("console.log('✗ eine Prüfung'); process.exit(1);\n", 5000)?.art, 'pruefung');
    ist('Probe (Einordnung): Ausnahme ohne rote Prüfung → «ausnahme»', einordnen("throw new TypeError('x');\n", 5000)?.art, 'ausnahme');
    const haengt = einordnen('setInterval(() => {}, 1000);\n', 600);
    ist('Probe (Einordnung): ein hängender Test (Zeitüberschreitung) ist «ungeklaert», NICHT erkannt', [haengt?.art, /ETIMEDOUT/.test(String(haengt?.grund))], ['ungeklaert', true]);
    const signal = einordnen("process.kill(process.pid, 'SIGKILL');\nsetInterval(() => {}, 1000);\n", 5000);
    ist('Probe (Einordnung): ein vom Signal beendeter Test ist «ungeklaert»', [signal?.art, /SIGKILL/.test(String(signal?.grund))], ['ungeklaert', true]);
    ist('Probe (Einordnung): die erste rote Datei gewinnt, die Reihenfolge der Dateien bleibt (reprice, bestellweg, platzierung, sync)', einordnen("console.log('✗ x'); process.exit(1);\n", 5000)?.datei, 'printful_reprice_test.mjs');
  } else console.log('(mutation.mjs nicht ausgecheckt → SHARD-Prüfung übersprungen)');
}

// ═══════════════════════════════════════ Editor-Vertrag über ALLE ausgelieferten Fassungen (Fund 16/26)
// Der Mitschnitt (editor_640_mitschnitt.json) stammt nur von 6.4.0. Damit eine spätere Fassung die Warenkorb-Eigenschaften nicht still anders schreibt, muss der Schreibweg (von «var druckUrls» bis zum Ende von
// «formularSynchronisieren», darin podKarteWert und die Schlüssel) in JEDER ausgelieferten Datei derselbe Code sein. Aufrufe, die nur die Ansicht auffrischen (vorschauPlanen, entwurfPlanen, kontrastBuehnePlanen),
// zählen nicht. Ändert sich der Schreibweg, schlägt dieser Test fehl: dann Mitschnitt für die neue Fassung erzeugen (mitschnitt_erzeugen.mjs) und den Parser gegen ihn prüfen.
{
  const fassungen = ['6.2.0', '6.3.0', '6.3.1', '6.4.0', '6.4.1'];
  const pfad = (v) => fileURLToPath(new URL(`../../pod/v6/lspod-designer-v6-${v}.js`, import.meta.url));
  const schreibweg = (t) => {
    const a = t.indexOf('var druckUrls = {};'); if (a < 0) return null;
    const f = t.indexOf('function formularSynchronisieren() {', a); if (f < 0) return null;
    let i = t.indexOf('{', f), d = 0;
    for (; i < t.length; i++) { if (t[i] === '{') d++; else if (t[i] === '}') { d--; if (!d) break; } }
    return t.slice(a, i + 1).replace(/(^|\s)\/\/[^\n]*/g, '$1').replace(/\b(?:vorschauPlanen|entwurfPlanen|kontrastBuehnePlanen)\(\);/g, '').replace(/\s+/g, ' ');   // Zeilenkommentare (nach Leerraum), Ansichts-Aufrufe und Leerraum zählen nicht
  };
  const inCI = process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true';
  const hashes = new Map();
  for (const v of fassungen) {
    if (!existsSync(pfad(v))) { if (inCI) ist(`CI: pod/v6/lspod-designer-v6-${v}.js muss im sparse-checkout des Jobs stehen`, 'fehlt', 'da'); else console.log(`(Editor ${v} nicht ausgecheckt → Vertragsvergleich übersprungen)`); continue; }
    const b = schreibweg(readFileSync(pfad(v), 'utf8'));
    ist(`Editor-Vertrag: in ${v} ist der Schreibweg (podKarteWert … formularSynchronisieren) auffindbar`, b !== null && b.includes('function podKarteWert'), true);
    if (b) hashes.set(v, createHash('sha256').update(b).digest('hex').slice(0, 16));
  }
  ist('Editor-Vertrag: alle ausgelieferten Fassungen schreiben die Warenkorb-Eigenschaften mit demselben Code (sonst gilt der Mitschnitt von 6.4.0 für die neue Fassung nicht)', [...new Set(hashes.values())].length <= 1, true);
}

// ═══════════════════════════════════════ GEGENPRÜFUNG 11.11.2026 (zwei Gegenprüfer nach der Schlussprüfung): reine Logik
{
  // ── Tag-Länge: Shopify lässt je Order-Tag höchstens 40 Zeichen zu (QUELLE shopify.dev, Order.tags). Die Markierung war 45 Zeichen lang, drei Befund-Tags 42 bis 48.
  const T0 = Date.UTC(2026, 10, 10, 9, 37, 12, 345);
  ist('Tag-Länge: TAG_MAX ist 40, der Name einer Befundart darf 24 Zeichen lang sein, der Zufallsteil der Markierung hat 3 Zeichen', [TAG_MAX, BEFUND_ART_MAX, ANSPRUCH_ZUFALL_LAENGE], [40, 24, 3]);
  ist('Tag-Länge Anspruch: die Markierung mit Zufallsteil ist GENAU 40 Zeichen lang (Mitternacht am Jahresanfang, letzte Millisekunde des Jahres, einstellige Millisekunde)', [T0, Date.UTC(2027, 0, 1, 0, 0, 0, 0), Date.UTC(2026, 11, 31, 23, 59, 59, 999), Date.UTC(2030, 5, 15, 12, 0, 0, 7)].map((ms) => anlegenTag(ms, 'zz9').length), [40, 40, 40, 40]);
  ist('Tag-Länge Anspruch: die alte Form ohne Zufallsteil ist 30 Zeichen lang', anlegenTag(T0).length, 30);
  ist('Tag-Länge Anspruch: würde die Markierung länger als 40 Zeichen (Jahr 10000), wirft anlegenTag, statt ein zu langes Tag zu liefern', (() => { try { return anlegenTag(Date.UTC(10000, 0, 1), 'abc').length; } catch (e) { return /40/.test(e.message) ? 'wirft' : e.message; } })(), 'wirft');
  ist('Tag-Länge anspruchZufall: genau 3 Zeichen a-z0-9 aus 4 Zufallsbytes (die Bytes als Zahl modulo 36³ = 46 656; Array, Uint8Array und Buffer)', [anspruchZufall([0, 0, 0, 0]), anspruchZufall([0, 0, 0, 35]), anspruchZufall([0, 0, 0, 36]), anspruchZufall([0, 0, 182, 63]), anspruchZufall([0, 0, 182, 64]), anspruchZufall(new Uint8Array([255, 255, 255, 255])), anspruchZufall(Buffer.from([1, 2, 3, 4]))], ['000', '00z', '010', 'zzz', '000', '1z3', 'f44']);
  ist('Tag-Länge anspruchZufall: zu wenige Bytes, kein Byte-Array oder Werte ausserhalb 0 bis 255 werfen (nie ein fester oder leerer Zufallsteil)', [[], [1, 2, 3], null, undefined, 'abcd', [1, 2, 3, 256], [1, 2, 3, -1], [1, 2, 3, 1.5]].map((b) => { try { return anspruchZufall(b); } catch { return 'wirft'; } }), Array(8).fill('wirft'));
  ist('Tag-Länge anspruchZufall: jeder Wert ergibt eine gültige Markierung von 40 Zeichen, die als Markierung gelesen wird', [[0, 0, 0, 0], [255, 255, 255, 255], [9, 8, 7, 6]].map((b) => { const t = anlegenTag(T0, anspruchZufall(b)); return [t.length, anlegenAlterMin([t], T0 + 60000)]; }), [[40, 1], [40, 1], [40, 1]]);
  ist('Tag-Länge befundTag: ein Name über 24 Zeichen wird auf 40 Zeichen gekürzt (ohne Bindestrich am Ende), ein kurzer bleibt unverändert', [befundTag('x'.repeat(30)).length, befundTag('abcdefghijklmnopqrstuvw-yz'), befundTag('kein-entwurf'), befundTag('abcdefghijklmnopqrstuvwx')], [40, 'printful-review-abcdefghijklmnopqrstuvw', 'printful-review-kein-entwurf', 'printful-review-abcdefghijklmnopqrstuvwx']);
  ist('Tag-Länge befundPlan: auch eine gekürzte Art wird beim nächsten Lauf wiedererkannt (kein zweiter Alarm), und kein Tag des Plans ist länger als 40 Zeichen', (() => { const lang = 'eine-sehr-lange-befundart-ueber-24-zeichen'; const b = [{ art: lang, text: 't', hart: true }]; const p1 = befundPlan({ tags: [], befunde: b }); const p2 = befundPlan({ tags: p1.hinzu, befunde: b }); return [p1.hinzu.filter((x) => x.length > 40), p1.alarm, p2.alarm, p2.hinzu]; })(), [[], true, false, []]);
  // JEDER Name im Quelltext, der eine Befundart sein kann: alle Zeichenketten in Kleinbuchstaben mit Bindestrich in den drei Quelldateien des Bestellwegs (eine Obermenge: auch «printful-synced» oder «retry-after» zählen mit)
  const quellen = ['../printful_sync.mjs', './printful_bestellweg.mjs', './printful_platzierung.mjs'].map((r) => readFileSync(fileURLToPath(new URL(r, import.meta.url)), 'utf8')).join('\n');
  const namen = [...new Set([...quellen.matchAll(/'([a-z][a-z0-9]*(?:-[a-z0-9]+)+)'/g)].map((m) => m[1]))];
  ist('Tag-Länge: das Messgerät findet die Namen im Quelltext (über 50, darunter die neuen kurzen und die aus einem Ausdruck gebildeten)', [namen.length > 50, ['kein-entwurf', 'datei-bei-fertigware', 'zahlung-fehlgeschlagen', 'bestellung-geaendert', 'zahlung-unlesbar', 'vorhanden-failed', 'vorhanden-problem', 'wiederholt-gescheitert'].filter((n) => !namen.includes(n))], [true, []]);
  ist('Tag-Länge: KEIN solcher Name im Quelltext ist länger als 24 Zeichen (sonst würde sein Tag «printful-review-<art>» gekürzt)', namen.filter((n) => n.length > BEFUND_ART_MAX), []);
  ist('Tag-Länge: jedes Tag, das der Sync aus diesen Namen bilden kann, hat höchstens 40 Zeichen; ebenso die festen Tags und der Versuchszähler', [...namen.map(befundTag), REVIEW_TAG, 'printful-synced', 'printful-confirmed', versuchTag(MAX_VERSUCHE), versuchTag(999999)].filter((x) => x.length > TAG_MAX), []);
  ist('Tag-Länge vorhandenArt: ein kurzer Name für jeden Problem-Status eines schon vorhandenen Auftrags; Unbekanntes (auch ein geerbter Schlüssel) heisst «vorhanden-problem»', ['zahlung-fehlgeschlagen', 'angehalten', 'storniert', 'status-unbekannt', 'etwas-neues', 'toString', undefined].map(vorhandenArt), ['vorhanden-failed', 'vorhanden-angehalten', 'vorhanden-storniert', 'vorhanden-unbekannt', 'vorhanden-problem', 'vorhanden-problem', 'vorhanden-problem']);
  ist('Tag-Länge vorhandenArt: für JEDEN Status, den statusBewerten als Problem meldet, gibt es eine eigene Art, und ihr Tag ist höchstens 40 Zeichen lang', (() => { const a = ['failed', 'onhold', 'canceled', 'archived', '', 'xyz'].map((s) => statusBewerten({ status: s })).filter((s) => s.art === 'problem').map((s) => vorhandenArt(s.befund)); return [a.map(befundTag).filter((x) => x.length > 40), new Set(a).size, a.includes('vorhanden-problem'), a.length]; })(), [[], 4, false, 6]);
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
