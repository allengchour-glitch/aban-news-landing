// Tests für die reine Logik des Bestellwegs (lib/printful_bestellweg.mjs), kein Netz. Lauf: /opt/node22/bin/node automation/lib/printful_bestellweg_test.mjs
// Prüfdaten: Auszug aus dem ECHTEN Printful-Katalog (dropship/pod-auswahl/bestellweg_katalog_auszug.json: Tasse 19, T-Shirt 71, Kappe 206,
// Poster 268, Kapuzenjacke 388, Strick 769, Hülle 798; gelesen 05.11.2026) und die echten Mitschnitte der Platzierung. Das Verhalten des ganzen Skripts (gefälschtes fetch)
// prüft automation/printful_sync_test.mjs.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { produktInfoAusAntwort } from './printful_platzierung.mjs';
import {
  adresseProblem, dateienAusEigenschaften, variantAusSku, skuWaehlen, istPod, technikFamilie, garnOption, optionenPruefen, technikPruefen, konfliktePruefen,
  dateiMasse, druckdateiFuer, wirklicheDpi, aufloesungPruefen, MIN_DPI_VORGABE, KOSTEN_REGEL, kostenPruefen, statusBewerten, dateienStatus, externalId, empfaengerAus,
  befundTag, befundPlan, versuche, versuchTag, MAX_VERSUCHE, esc, kontrolleLesen, kleineKopieUrl, planeBestellung, ERLAUBTE_HOSTS, BESTAETIGT, REVIEW_TAG,
} from './printful_bestellweg.mjs';

let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };
const wahr = (n, c, info = '') => ist(n + (c ? '' : ' ' + info), !!c, true);
const lade = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
const KAT = lade('../../dropship/pod-auswahl/bestellweg_katalog_auszug.json').produkte;
const U = (x) => 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1/' + x + '.png';
const A = (key, value) => ({ key, value });
const arten = (bf) => bf.map((b) => b.art);

// ═══════════════════════════════════════ Adresse einer Druckdatei
for (const [n, w, soll] of [
  ['Cloudinary https', U('a'), null], ['Shopify-CDN', 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/a.png', null], ['http statt https', 'http://res.cloudinary.com/x/a.png', 'keine https-Adresse'],
  ['fremder Host', 'https://evil.example.com/a.png', 'Host «evil.example.com» ist nicht erlaubt'], ['interne Adresse (SSRF)', 'https://169.254.169.254/latest/meta-data', 'Host «169.254.169.254» ist nicht erlaubt'],
  ['localhost', 'https://localhost/a.png', 'Host «localhost» ist nicht erlaubt'], ['Zugangsdaten in der Adresse', 'https://u:p@res.cloudinary.com/a.png', 'Adresse enthält Zugangsdaten'],
  ['Host nur im Pfad', 'https://evil.example.com/res.cloudinary.com/a.png', 'Host «evil.example.com» ist nicht erlaubt'], ['Host als Unterdomäne eines erlaubten Hosts', 'https://res.cloudinary.com.evil.com/a.png', 'Host «res.cloudinary.com.evil.com» ist nicht erlaubt'],
  ['Grossbuchstaben im Host', 'https://RES.Cloudinary.com/a.png', null], ['Leerzeichen', 'https://res.cloudinary.com/a b.png', 'Adresse enthält Leerzeichen'], ['kein URL', 'javascript:alert(1)', 'keine https-Adresse'], ['leer', '', 'keine gültige Adresse'],
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
  ist('Karte nennt «back», es gibt aber keine Datei dafür: weicher Befund «karte-ohne-datei»', [arten(r4.probleme), r4.probleme[0].hart], [['karte-ohne-datei'], false]);
  const r5 = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (back)', U('h')), A('_pod_karte', '{"v":6,"pl":["front"]}')]);
  ist('Datei für «back», aber nicht in der Karte: weicher Befund «datei-ohne-karte», Datei bleibt', [arten(r5.probleme), r5.dateien.length], [['datei-ohne-karte'], 2]);
  for (const [n, k] of [['kein JSON', '{"v":6,"pl":['], ['Version 5', '{"v":5,"pl":["front"]}'], ['ohne Platzierungsliste', '{"v":6}'], ['ein Array', '[1,2]'], ['null', 'null'], ['leer', '']]) {
    const x = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', U('v')), A('_pod_karte', k)]);
    ist(`kaputte Karte (${n}): weicher Befund «karte-unlesbar», die Datei bleibt gültig`, [arten(x.probleme), x.karte, x.dateien.length], [['karte-unlesbar'], null, 1]);
  }
  const r6 = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (front)', U('w'))]);
  ist('dieselbe Platzierung zweimal: harter Befund «datei-doppelt», die erste Datei bleibt', [arten(r6.probleme), r6.probleme[0].hart, r6.dateien.length], [['datei-doppelt'], true, 1]);
  const r7 = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', 'https://evil.example.com/x.png')]);
  ist('Druckdatei von fremdem Host: harter Befund «datei-adresse», keine Datei', [arten(r7.probleme), r7.probleme[0].hart, r7.dateien.length, /nicht erlaubt/.test(r7.probleme[0].text)], [['datei-adresse'], true, 0, true]);
  const r8 = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', '   '), A('🖼️ Druckdatei (back)', '')]);
  ist('leere Druckdatei-Eigenschaften: keine Datei, KEIN Problem (Editor schreibt sie für unbenutzte Seiten)', [r8.dateien.length, r8.probleme], [0, []]);
  const r9 = dateienAusEigenschaften([A('🖼️ Druckdatei (front)', U('v')), A('Vorne · 🖼️ Druckdatei', U('w'))]);
  ist('Schlüssel von v5 und v6 gemischt: harter Befund «schluessel-gemischt»', [arten(r9.probleme), r9.probleme[0].hart], [['schluessel-gemischt'], true]);
}
// v5 (wie die alte pickFiles): «Hinten»/«Back» → Rückseite, alles andere Vorderseite
for (const [n, k, seite] of [['Vorne · 🖼️ Druckdatei', 'Vorne · 🖼️ Druckdatei', 'front'], ['Hinten · 🖼️ Druckdatei', 'Hinten · 🖼️ Druckdatei', 'back'], ['🖼️ Druckdatei (Vorne)', '🖼️ Druckdatei (Vorne)', 'front'],
  ['🖼️ Druckdatei (Hinten)', '🖼️ Druckdatei (Hinten)', 'back'], ['🖼️ Druckdatei (nur eine Seite)', '🖼️ Druckdatei', 'front'], ['englisch Front', 'Front · 🖼️ Print file', 'front'], ['englisch Back', 'Back · 🖼️ Print file', 'back'], ['Kleinschreibung hinten', 'hinten druckdatei', 'back']]) {
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
ist('SKU: die beiden widersprechen sich → weicher Befund «sku-widerspruch» (nennt beide Nummern)', [arten(skuWaehlen({ positionSku: 'a_111', variantenSku: 'a_222' }).probleme), skuWaehlen({ positionSku: 'a_111', variantenSku: 'a_222' }).probleme[0].hart, /111/.test(skuWaehlen({ positionSku: 'a_111', variantenSku: 'a_222' }).probleme[0].text) && /222/.test(skuWaehlen({ positionSku: 'a_111', variantenSku: 'a_222' }).probleme[0].text)], [['sku-widerspruch'], false, true]);
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
  ist('Stickerei ohne Garnfarben: weicher Befund «optionen», Pflichtoption thread_colors_chest_left', [arten(e.befunde), e.befunde[0].hart, /Pflichtoption «thread_colors_chest_left» fehlt/.test(e.befunde[0].text)], [['optionen'], false, true]);
  const e2 = optionenPruefen({ produkt: roh(71), typen: ['embroidery_chest_left'], angegeben: { thread_colors_chest_left: '#FFFFFF, #cc3333' } });
  ist('Stickerei mit Garnfarben (Text mit Komma, Kleinbuchstaben): Liste in der Katalogschreibweise, kein Befund', [e2.optionen, e2.befunde], [[{ id: 'thread_colors_chest_left', value: ['#FFFFFF', '#CC3333'] }], []]);
  const e3 = optionenPruefen({ produkt: roh(71), typen: ['embroidery_chest_left'], angegeben: { thread_colors_chest_left: ['#FFFFFF', '#123456'] } });
  ist('Garnfarbe, die es nicht gibt (#123456): Befund, nichts davon wird gesendet', [e3.optionen, /#123456/.test(e3.befunde[0].text)], [[], true]);
  const e4 = optionenPruefen({ produkt: roh(71), typen: ['default'], angegeben: { gibt_es_nicht: 'x' } });
  ist('unbekannte Option: Befund «optionen», nicht gesendet', [e4.optionen, /gibt es bei diesem Printful-Produkt nicht/.test(e4.befunde[0].text)], [[], true]);
  const e5 = optionenPruefen({ produkt: roh(71), typen: ['embroidery_chest_left', 'embroidery_sleeve_left_top'], angegeben: { thread_colors_chest_left: '#000000' } });
  ist('zwei Stickereien, nur für eine Garnfarben: Befund nennt die andere', [e5.befunde.length, /thread_colors_sleeve_left_top/.test(e5.befunde[0].text)], [1, true]);
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
  ist('Kapuzenjacke (CUT-SEW) mit stitch_color im Katalog: Pflicht «stitch_color» fehlt → Befund', [arten(j.befunde), /stitch_color/.test(j.befunde[0].text)], [['optionen'], true]);
  const j2 = optionenPruefen({ produkt: roh(388), typen: ['default'], angegeben: { stitch_color: 'black' } });
  ist('stitch_color = black → gesendet', [j2.optionen, j2.befunde], [[{ id: 'stitch_color', value: 'black' }], []]);
  const j3 = optionenPruefen({ produkt: roh(388), typen: ['default'], angegeben: { stitch_color: 'Pink' } });
  ist('stitch_color = Pink (nicht erlaubt) → Befund mit den erlaubten Werten', [j3.optionen, /white, black/.test(j3.befunde[0].text)], [[], true]);
  const j4 = optionenPruefen({ produkt: roh(388), typen: ['default'], angegeben: { stitch_color: 'White' } });
  ist('stitch_color: Titel statt Schlüssel («White») wird auf «white» abgebildet', j4.optionen, [{ id: 'stitch_color', value: 'white' }]);
  const k = optionenPruefen({ produkt: roh(206), typen: ['embroidery_front_large'], angegeben: {} });
  ist('Kappe: Stickerei vorne gross verlangt thread_colors_front_large', /thread_colors_front_large/.test(k.befunde[0].text), true);
  const s = optionenPruefen({ produkt: roh(769), typen: ['default'], angegeben: {} });
  ist('Strick (KNITWEAR): yarn_colors ist Pflicht (Annahme)', [arten(s.befunde), /yarn_colors/.test(s.befunde[0].text)], [['optionen'], true]);
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
  ist('Dateien: Auftrag ohne Artikel → ok (nichts zu prüfen)', [dateienStatus({}).art, dateienStatus(null).art, dateienStatus({ items: [{}] }).art], ['ok', 'ok', 'ok']);
}

// ═══════════════════════════════════════ Kennung, Empfänger, Tags
for (const [n, soll] of [['#1034', 'LX1034'], ['1034', 'LX1034'], ['#SW-1034', 'LXSW1034'], ['', null], [null, null], ['#', null], ['# ä ö', null], ['#' + '9'.repeat(40), 'LX' + '9'.repeat(30)]]) ist(`externalId(${JSON.stringify(n)})`, externalId(n), soll);
ist('externalId: höchstens 32 Zeichen', externalId('#' + '9'.repeat(100)).length <= 32, true);
{
  const o = { email: 'a@b.ch', shippingAddress: { name: 'Max Muster', address1: 'Weg 1', address2: '', city: 'Basel', provinceCode: 'BS', countryCodeV2: 'CH', zip: '4000', phone: '+41' } };
  const e = empfaengerAus(o);
  ist('Empfänger vollständig', [e.befunde, e.recipient.name, e.recipient.country_code, e.recipient.zip, e.recipient.email], [[], 'Max Muster', 'CH', '4000', 'a@b.ch']);
  ist('Empfänger: Name aus Vor- und Nachname', empfaengerAus({ shippingAddress: { firstName: 'Eva', lastName: 'Beispiel', address1: 'x', city: 'y', zip: '1', countryCodeV2: 'CH' } }).recipient.name, 'Eva Beispiel');
  ist('Empfänger ohne Adresse → harter Befund «adresse»', [empfaengerAus({}).befunde[0].art, empfaengerAus({}).befunde[0].hart, empfaengerAus({}).recipient], ['adresse', true, null]);
  const l = empfaengerAus({ shippingAddress: { name: 'X', address1: '', city: 'Basel', zip: '', countryCodeV2: '' } });
  ist('Empfänger unvollständig → harter Befund nennt Strasse, PLZ, Land', [l.befunde[0].hart, /Strasse, PLZ, Land/.test(l.befunde[0].text)], [true, true]);
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
const bestellung = (zeilen, extra = {}) => ({ id: 'gid://shopify/Order/1', name: '#T1', lineItems: { pageInfo: { hasNextPage: false }, edges: zeilen.map((node) => ({ node })) }, ...extra });
const plane = (zeilen, io = mkIo(), cfg) => planeBestellung(bestellung(zeilen), io, cfg);
{
  const io = mkIo();
  const p = await plane([zeile()], io);
  ist('Plan T-Shirt vorne (v6): ein Artikel, Typ «default» (dt), Variante 4025, Menge 1, Erlös 29.90, KEIN Befund', [p.items, p.befunde, p.erloesChf, p.pod], [[{ variant_id: 4025, quantity: 1, files: [{ type: 'default', url: U('v') }], external_id: '9001' }], [], 29.9, 1]);
  ist('…Zugriffe: eine Variantenabfrage, eine Druckdaten-Abfrage (Produkt 71), eine Kopfzeile, eine Kontrolle', [io.log.produkt, io.log.druck, io.log.kopf.length, io.log.kontrolle.length], [[4025], [71], 1, 1]);
}
{
  const p = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (back)', U('h')), A('🖼️ Druckdatei (sleeve_left)', U('a')), karte6(['front', 'back', 'sleeve_left'], { dt: { front: 'default' } })] })]);
  ist('Plan T-Shirt vorne+hinten+Ärmel: drei Dateien mit den echten Typen, kein Befund', [p.items[0].files.map((f) => f.type), p.befunde], [['default', 'back', 'sleeve_left'], []]);
}
{
  const p = await plane([zeile({ quantity: 3, discountedTotalSet: { shopMoney: { amount: '89.70', currencyCode: 'CHF' } } })]);
  ist('Plan: Menge 3 und Erlös der Position', [p.items[0].quantity, p.erloesChf], [3, 89.7]);
  const p2 = await plane([zeile({ quantity: 0 }), zeile({ id: 'gid://shopify/LineItem/9002', quantity: 'x' })]);
  ist('Plan: unsinnige Menge → 1', p2.items.map((i) => i.quantity), [1, 1]);
}
{ // v5-Positionen wie bisher: Vorne/Hinten über den Printful-Typ der Variante
  const p = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (Vorne)', U('v')), A('🖼️ Druckdatei (Hinten)', U('h'))] })]);
  ist('Plan v5 vorne+hinten auf T-Shirt: front/back, kein Befund', [p.items[0].files.map((f) => f.type), p.befunde], [['front', 'back'], []]);
  const t = await plane([zeile({ sku: '1_1320', variant: { sku: '1_1320' }, product: { productType: 'Tassen', tags: ['wunschdesign'] }, customAttributes: [A('🖼️ Druckdatei (Vorne)', U('v'))] })], mkIo({ produkt: () => prodVon(19) }));
  ist('Plan v5 Tasse (nur «default»): Typ default, Auflösung der Tasse geprüft, kein Befund', [t.items[0].files.map((f) => f.type), t.befunde], [['default'], []]);
}
{ // Fertig-Produkt mit Metafeld
  const p = await plane([zeile({ customAttributes: [], product: { productType: 'Poster', tags: ['wunschdesign'], metafield: { value: 'https://bilder.luxestyle.ch/motiv.png' } }, sku: '9_19515', variant: { sku: '9_19515' } })], mkIo({ produkt: () => prodVon(268), kopf: () => ({ status: 200, bytes: png(7000, 5000) }) }));
  ist('Plan Fertig-Produkt: Metafeld custom.print_file als Vorderseite (jeder https-Host, es gehört dem Besitzer)', [p.items[0].files, p.befunde], [[{ type: 'default', url: 'https://bilder.luxestyle.ch/motiv.png' }], []]);
  const m2 = await plane([zeile({ customAttributes: [], product: { productType: 'x', tags: ['wunschdesign'], metafield: { value: 'http://bilder.luxestyle.ch/motiv.png' } } })]);
  ist('Plan Metafeld mit http → keine Datei → harter Befund «keine-druckdatei»', arten(m2.befunde), ['keine-druckdatei']);
  const m3 = await plane([zeile({ customAttributes: [], product: { productType: 'x', tags: ['wunschdesign'], metafield: { value: 'kein url' } } })]);
  ist('Plan Metafeld ohne Adresse → harter Befund', [arten(m3.befunde), m3.befunde[0].hart], [['keine-druckdatei'], true]);
}
// harte Befunde
{
  const io = mkIo();
  const p = await plane([zeile({ sku: 'kaputt', variant: { sku: 'auch kaputt' } })], io);
  ist('SKU ohne Variante → hart «ohne-variante», kein Artikel, KEINE Netzabfrage', [arten(p.befunde), p.befunde[0].hart, p.items.length, io.log.produkt.length], [['ohne-variante'], true, 0, 0]);
  const k = await plane([zeile({ customAttributes: [] })], mkIo());
  ist('keine Druckdatei → hart «keine-druckdatei»', [arten(k.befunde), k.befunde[0].hart, k.items.length], [['keine-druckdatei'], true, 0]);
  const f = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', 'https://evil.example.com/x.png')] })], io);
  ist('Druckdatei von fremdem Host → hart «datei-adresse» + «keine-druckdatei», keine Abfrage der Adresse', [arten(f.befunde), io.log.kopf.length, io.log.kontrolle.length], [['datei-adresse', 'keine-druckdatei'], 0, 0]);
  const n = await plane([zeile({ product: { productType: 'x', tags: ['sale'] }, customAttributes: [A('🖼️ Druckdatei (front)', U('v'))] })], mkIo());
  ist('Druckdatei-Eigenschaft an einem Produkt ohne POD-Tag → hart «druckdatei-ohne-pod», nichts wird gedruckt', [arten(n.befunde), n.befunde[0].hart, n.items.length, n.pod], [['druckdatei-ohne-pod'], true, 0, 0]);
  const nk = await plane([zeile({ product: { tags: [] }, customAttributes: [karte6(['front'])] })], mkIo());
  ist('…auch eine bloße _pod_karte ohne Tag', arten(nk.befunde), ['druckdatei-ohne-pod']);
  const g = await plane([zeile({ product: { tags: ['sale'] }, customAttributes: [] })], mkIo());
  ist('Position ohne POD-Tag und ohne Eigenschaften (Fortura, CJ): still übergangen, kein Befund', [g.befunde, g.items, g.pod], [[], [], 0]);
  const m = await planeBestellung({ id: 'x', name: '#1', lineItems: { pageInfo: { hasNextPage: true }, edges: [{ node: zeile() }] } }, mkIo());
  ist('mehr als 50 Positionen (hasNextPage) → hart «positionen-viele» (weitere Editor-Positionen könnten fehlen)', [arten(m.befunde), m.befunde[0].hart, m.items.length], [['positionen-viele'], true, 1]);
  const d = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (front)', U('w'))] })], mkIo());
  ist('doppelte Platzierung in den Eigenschaften → hart «datei-doppelt»', [arten(d.befunde).includes('datei-doppelt'), d.befunde.find((b) => b.art === 'datei-doppelt').hart], [true, true]);
  const nf = await plane([zeile()], mkIo({ kopf: () => ({ status: 404, bytes: null }) }));
  ist('Druckdatei liefert 404 → hart «datei-nicht-erreichbar»', [arten(nf.befunde), nf.befunde[0].hart], [['datei-nicht-erreichbar'], true]);
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
  ist('Datei 600×800 auf dem T-Shirt (50 dpi < 75) → weich «aufloesung», Artikel bleibt im Plan', [arten(w.befunde), w.befunde[0].hart, w.items.length, /zu klein/.test(w.befunde[0].text), /50 dpi/.test(w.befunde[0].text)], [['aufloesung'], false, 1, true, true]);
  const g = await plane([zeile()], mkIo({ kopf: () => ({ status: 200, bytes: png(900, 1200) }) }));
  ist('Datei 900×1200 = genau 75 dpi → ok', g.befunde, []);
  const x = await plane([zeile()], mkIo({ kopf: () => ({ status: 200, bytes: Buffer.from('<html>') }) }));
  ist('Datei ohne lesbare Kopfzeile → weich «aufloesung» (nicht prüfbar, kein Freispruch)', [arten(x.befunde), /nicht lesbar/.test(x.befunde[0].text)], [['aufloesung'], true]);
  const x2 = await plane([zeile()], mkIo({ kopf: () => ({ status: 503, bytes: null }) }));
  ist('Datei antwortet 503 → weich «aufloesung» mit HTTP-Status', [arten(x2.befunde), /HTTP 503/.test(x2.befunde[0].text)], [['aufloesung'], true]);
  const x3 = await plane([zeile()], mkIo({ kopf: () => ({ status: 0, bytes: null }) }));
  ist('Netzfehler beim Lesen der Datei → weich', arten(x3.befunde), ['aufloesung']);
  const jp = await plane([zeile()], mkIo({ kopf: () => ({ status: 200, bytes: jpg(1800, 2400) }) }));
  ist('JPEG-Datei wird ebenso gemessen', jp.befunde, []);
  const k1 = await plane([zeile()], mkIo({ kontrolle: () => ({ art: 'fail', text: 'FAIL - leer' }) }));
  ist('Kontrolle FAIL → weich «kontrolle-fail»', [arten(k1.befunde), k1.befunde[0].hart, /FAIL - leer/.test(k1.befunde[0].text)], [['kontrolle-fail'], false, true]);
  const k2 = await plane([zeile()], mkIo({ kontrolle: () => ({ art: 'technisch', text: 'HTTP 402' }) }));
  ist('Kontrolle technisch gescheitert → weich «kontrolle-technisch» (gibt NICHT frei)', [arten(k2.befunde), /HTTP 402/.test(k2.befunde[0].text)], [['kontrolle-technisch'], true]);
  const k3 = await plane([zeile()], mkIo({ kontrolle: () => ({ art: 'fehlt', text: 'keine Prüfung eingerichtet' }) }));
  ist('Kontrolle nicht eingerichtet → weich «kontrolle-fehlt»', arten(k3.befunde), ['kontrolle-fehlt']);
  const pl = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (hood)', U('v'))] })], mkIo());
  ist('unbekannte Platzierung «hood» → weich «platzierung», Typ bleibt «hood»', [arten(pl.befunde).includes('platzierung'), pl.items[0].files[0].type], [true, 'hood']);
  const dp = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (default)', U('v')), A('🖼️ Druckdatei (front)', U('w'))] })], mkIo());
  ist('«default» und «front» zugleich → weich «platzierung» (dieselbe Platzierung)', [arten(dp.befunde), /zwei Druckdateien für dieselbe Platzierung/.test(dp.befunde[0].text)], [['platzierung'], true]);
  const nl = await plane([zeile()], mkIo({ produkt: () => NICHT_LESBAR }));
  ist('Printful-Variante nicht lesbar → weich: Platzierung nicht gesichert, Druckdaten fehlen (kein Produkt), Pixelgrösse ohne Katalog nicht prüfbar', [arten(nl.befunde).includes('platzierung'), arten(nl.befunde).includes('druckdaten'), arten(nl.befunde).includes('aufloesung'), nl.befunde.every((b) => !b.hart)], [true, true, true, true]);
  const dd = await plane([zeile()], mkIo({ druckdaten: () => ({ art: 'fehler', text: 'HTTP 429' }) }));
  ist('Druckdaten nicht lesbar (429) → weich «druckdaten» (Text nennt HTTP 429), «aufloesung» (keine Katalog-Grösse); Konflikte nicht prüfbar nur bei mehreren Platzierungen', [arten(dd.befunde), /HTTP 429/.test(dd.befunde[0].text)], [['druckdaten', 'aufloesung'], true]);
  const ddm = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (back)', U('h'))] })], mkIo({ druckdaten: () => ({ art: 'fehler', text: 'x' }) }));
  ist('…bei zwei Platzierungen kommt «konflikt» (nicht prüfbar) dazu', arten(ddm.befunde).includes('konflikt'), true);
  const kf = await plane([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), A('🖼️ Druckdatei (front_large)', U('w'))] })], mkIo({ kopf: () => ({ status: 200, bytes: png(2250, 2700) }) }));
  ist('front + front_large → weich «konflikt»', [arten(kf.befunde), kf.befunde[0].hart], [['konflikt'], false]);
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
  ist('Zwei POD-Positionen, eine ohne Variante: Artikel der ersten bleibt im Plan, der Befund ist HART (der Kleber legt dann keinen Teilauftrag an)', [q.items.length, arten(q.befunde), q.befunde[0].hart, /Tasse/.test(q.befunde[0].text)], [1, ['ohne-variante'], true, true]);
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
  ist('Kappe 206, Stickerei embroidery_front ohne Angaben: weicher Befund «optionen» (Katalog führt keine Garnfarben-Option), nichts gesendet', [arten(k.befunde), k.befunde[0].hart, /führt der Printful-Katalog keine Garnfarben-Option/.test(k.befunde[0].text), k.optionen], [['optionen'], false, true, []]);
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
  ist('«1801 Weiss» (Name gibt es nicht): Befund, der den ganzen Wert nennt statt «1801» und «Weiss» getrennt', [o('1801 Weiss').optionen, o('1801 Weiss').befunde.length, /1801/.test(o('1801 Weiss').befunde[0].text)], [[], 1, true]);
}
// Nahtfarbe: Vorgabe des Besitzers (GL2 Fund 3)
{
  const j = (angegeben, vorgaben) => optionenPruefen({ produkt: roh(388), typen: ['front'], angegeben, vorgaben });
  ist('Jacke 388 (Option stitch_color): ohne Angabe und ohne Vorgabe → Befund «Pflichtoption stitch_color fehlt»', [arten(j({}, {}).befunde), /stitch_color/.test(j({}, {}).befunde[0].text)], [['optionen'], true]);
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
  ist('Menge: ohne brauchbare Zahlen bleibt es bei 1 (wie bisher)', q4.items.map((i) => i.quantity), [1, 1]);
  const q5 = await planeBestellung(bestellung([zeile({ quantity: 2, currentQuantity: 5 })]), mkIo());
  ist('Menge: currentQuantity über der bestellten Menge (unsinnig) → gilt, Erlös nicht erhöht', [q5.items[0].quantity, q5.positionenChf], [5, 29.9]);
}
// Karte des Editors v6 gegen die gekaufte SKU (GL1 Fund 11)
{
  const mit = (extra) => zeile({ customAttributes: [A('🖼️ Druckdatei (front)', U('v')), karte6(['front'], { dt: { front: 'default' }, ...extra })] });
  const ok1 = await plane([mit({ m: 71, pv: 4025 })]);
  ist('Karte nennt Produkt 71 und Variante 4025 wie die SKU 5599797_4025: kein Befund', ok1.befunde, []);
  const v = await plane([mit({ m: 71, pv: 4026 })]);
  ist('Karte nennt Variante 4026, gekauft wurde 4025: weicher Befund «karte-widerspruch» (Entwurf)', [arten(v.befunde), v.befunde[0].hart, /4026/.test(v.befunde[0].text), /4025/.test(v.befunde[0].text)], [['karte-widerspruch'], false, true, true]);
  const m = await plane([mit({ m: 19, pv: 4025 })]);
  ist('Karte nennt Produkt 19, die Variante gehört zu 71: weicher Befund «karte-widerspruch»', [arten(m.befunde), /Produkt 19/.test(m.befunde[0].text)], [['karte-widerspruch'], true]);
  const s2 = await plane([mit({ m: '71', pv: '4025' })]);
  ist('Zahlen als Text («71», «4025») gelten wie Zahlen', s2.befunde, []);
  const x = await plane([mit({ pv: 'abc', m: null })]);
  ist('Unlesbare Angaben in der Karte (kein Zahlenwert): kein Befund (sie sind optional)', x.befunde, []);
  const n = await plane([zeile()]);
  ist('Karte ohne pv und m (wie der Editor v5 es nicht kennt): kein Befund', n.befunde, []);
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
  } else console.log('(Workflow-Datei nicht ausgecheckt → Workflow-Prüfungen übersprungen)');
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
