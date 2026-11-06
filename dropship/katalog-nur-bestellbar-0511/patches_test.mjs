// Test für patches.mjs, die Daten (Variantenkarte, Ausblenden) und die Liquid-Dateien. Kein Netz, kein Shopify.
//   node dropship/katalog-nur-bestellbar-0511/patches_test.mjs
// Prüft: Ausgangsstand (MD5), jede Ankerstelle genau einmal (fehlt/doppelt -> Fehler), doppeltes Einspielen abgelehnt, Syntax des JS, nur markierte Zeilen im JS geändert und die Zeilen 449 bis 460
// (Beschreibung/Optionen: anderer Auftrag) unberührt, Sprachdateien (nur die vorgesehenen Schlüssel ändern sich), die Texte, die Datei Ausblenden (40 Modelle, 126 Varianten), die Variantenkarte und
// das Rendern der Liquid-Dateien mit dem echten Ruby-Liquid (Titelkacheln, Shopliste, Sektion mit Labels und Manifest).
// PRUEFSUMME_IGNORIEREN=1 überspringt den Vergleich mit daten/pruefstand.json (nur für die Mutationsprobe: sie soll am Verhalten erkannt werden, nicht an der Prüfsumme).
// OHNE_LIQUID=1 überspringt den Ruby-Teil.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { DATEIEN, NEUE_DATEIEN, MD5_VOR, MARKE, TEXTE, NEUE_SCHLUESSEL, CSS_NEU, anwenden, ausblendenText } from './patches.mjs';
import { rendere, flach, sprachJson, SNIPPET_ATTRAPPEN, produkt, rubyLiquidGems } from './liquid_helfer.mjs';

const HIER = new URL('.', import.meta.url).pathname;
const md5 = (s) => createHash('md5').update(s).digest('hex');
let n = 0, fehler = 0;
const ok = (bed, text) => { n++; if (!bed) { fehler++; console.log('  ✗', text); } };
const gleich = (ist, soll, text) => ok(JSON.stringify(ist) === JSON.stringify(soll), `${text}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);
const wirft = (fn, muster, text) => { try { fn(); ok(false, `${text}: warf nicht`); } catch (e) { ok(muster.test(e.message), `${text}: falsche Meldung «${e.message}»`); } };

const ALT = Object.values(DATEIEN), NEU = Object.values(NEUE_DATEIEN);
const sichName = (f) => f.replace('/', '__') + '.vor';
const sich = Object.fromEntries(ALT.map((f) => [f, readFileSync(HIER + 'sicherung/' + sichName(f), 'utf8')]));
const daten = { ausblenden: JSON.parse(readFileSync(HIER + 'daten/ausblenden-quelle.json', 'utf8')), karte: readFileSync(HIER + 'daten/variantenkarte.json', 'utf8') };
const soll = anwenden(sich, daten);

// ---------- 1. Ausgangsstand, Prüfsumme, Determinismus ----------
ok(ALT.every((f) => md5(sich[f]) === MD5_VOR[f]), 'Sicherung gleich MD5_VOR');
gleich(Object.keys(soll).sort(), [...ALT, ...NEU].sort(), 'anwenden liefert elf Dateien');
gleich(Object.fromEntries(Object.entries(anwenden(sich, daten)).map(([k, v]) => [k, md5(v)])), Object.fromEntries(Object.entries(soll).map(([k, v]) => [k, md5(v)])), 'anwenden ist deterministisch');
if (process.env.PRUEFSUMME_IGNORIEREN !== '1') {
  const pruef = JSON.parse(readFileSync(HIER + 'daten/pruefstand.json', 'utf8')).md5;
  gleich(Object.fromEntries(Object.keys(pruef).map((f) => [f, md5(soll[f])])), pruef, 'Soll-Stand gleich daten/pruefstand.json (Nachbildung des Browsertests)');
}

// ---------- 2. Ankerstellen: genau einmal ----------
const ohne = (text, teil) => { ok(text.split(teil).length === 2, `Testvoraussetzung: «${teil.slice(0, 40)}» kommt genau einmal vor`); return text.replace(teil, ''); };
const doppelt = (text, teil) => text.replace(teil, teil + teil);
const ANKER = {
  [DATEIEN.JS]: [
    'const variantsFor = product => list(product.variants).filter(v => id(v.id));', '    const load = async () => {\n',
    'loaded = true; root.dataset.sourceCount = String(products.length); renderGroups(); refreshTypes();', "categoryChildren('0').filter(c=>id(c.id)!=='277')];", 'types.add(option);',
    'node.hidden=!categories.has(key);node.disabled=false;', "node.setAttribute('aria-pressed',String(selected)); const count = node.querySelector('[data-lcl-audience-count]');", ":t('empty'));",
    "const cta = button(t('details'), () => openDetails(product, cta),'lcl-card-cta'); copy.append(cta);", 'const data=offersFor(selected);const offer=data.requiresChoice ?', "t('original_variants',{count:variants.length})",
    'const raw = await readAsset(config.assets?.index);', "result.textContent = t('results',{count:filtered.length});", "} catch { showMessage(t('load_error'),true); retry.hidden = false; root.dataset.loadState = 'error'; }",
    'if(product)openDetails(product,null);}', 'data.offers.forEach(item=>chooser.add(new Option(',
  ],
  [DATEIEN.SECTION]: [`      "offer_unavailable": {{ 'luxe_clothing.offer_unavailable' | t | json }},\n`, `<p class="lcl-dialog-notice">{{ 'luxe_clothing.notice' | t }}</p>`],
  [DATEIEN.MANIFEST]: [`{"index": {{ 'luxe-clothing-index.json' | asset_url | json }}, "details": {`],
  [DATEIEN.COVER]: ['href="{{ cover_product.url }}?view=luxe-studio"', "target.searchParams.get('view') === 'luxe-studio'"],
  [DATEIEN.CATEGORY]: ['href="{{ hero_product.url }}?view=luxe-studio"', '<a class="lxc-card-image" href="{{ item.url }}?view=luxe-studio"', '<h3><a href="{{ item.url }}?view=luxe-studio">', "target.searchParams.has('view')", `<a class="lxc-card-cta" href="{{ item.url }}?view=luxe-studio">{% if section.settings.compact_shop_list %}{{ 'luxe_category.draft_cta' | t }}`],
  [DATEIEN.DE]: ['"shape_tree": "Baum"\n  }', '"notice": "Produktkatalog zur Auswahl.', '"end_note": "Grössen', '"intro": "Von T-Shirts und Kinderkleidung', '"shop_intro": "Wähle ein vorhandenes', '"preview_note": "Gestaltungsvorschau'],
  [DATEIEN.EN]: ['"shape_tree": "Tree"\n  }', '"notice": "Product catalogue.', '"end_note": "Sizes', '"intro": "From T-shirts and kidswear', '"shop_intro": "Choose an existing', '"preview_note": "Design preview'],
  [DATEIEN.FR]: ['"shape_tree": "Sapin"\n  }'],
};
for (const [datei, anker] of Object.entries(ANKER)) {
  for (const a of anker) {
    const kaputt = { ...sich, [datei]: ohne(sich[datei], a) };
    wirft(() => anwenden(kaputt, daten), /./, `Anker fehlt (${datei}: «${a.slice(0, 45).replace(/\n/g, '\\n')}»)`);
  }
}
// doppelte Anker: nur dort prüfbar, wo der Anker ein einzelnes Textstück ist (Sprachdateien prüfen den Block anders)
for (const datei of [DATEIEN.JS, DATEIEN.SECTION, DATEIEN.MANIFEST, DATEIEN.COVER, DATEIEN.CATEGORY]) {
  for (const a of ANKER[datei]) wirft(() => anwenden({ ...sich, [datei]: doppelt(sich[datei], a) }, daten), /Anker «.*» kommt 2× vor/, `Anker doppelt (${datei}: «${a.slice(0, 45).replace(/\n/g, '\\n')}»)`);
}
// zweites Einspielen auf das Ergebnis wird abgelehnt
for (const f of ALT) wirft(() => anwenden({ ...sich, [f]: soll[f] }, daten), /schon|Marke|Block|Anker/, `doppeltes Einspielen abgelehnt (${f})`);

// ---------- 3. JS ----------
const jsAlt = sich[DATEIEN.JS], jsNeu = soll[DATEIEN.JS];
try { new vm.Script(jsNeu, { filename: 'luxe-clothing.js' }); ok(true, ''); } catch (e) { ok(false, 'JS-Syntax: ' + e.message); }
ok(jsNeu.trimEnd().endsWith(`/* ${MARKE} */`), 'JS: Schlussmarke');
const altZeilen = jsAlt.split('\n'), neuZeilen = jsNeu.split('\n');
const altMenge = new Set(altZeilen);
const helferStart = neuZeilen.findIndex((z) => z.includes(`/* ${MARKE}: nur Modelle mit bestellbarem Shopangebot`));
const helferEnde = neuZeilen.findIndex((z, i) => i > helferStart && z.startsWith('    const load = async'));
ok(helferStart > 0 && helferEnde > helferStart, 'JS: Helferblock gefunden');
const neueZeilen = neuZeilen.map((z, i) => ({ z, i })).filter(({ z }) => !altMenge.has(z));
const unmarkiert = neueZeilen.filter(({ z, i }) => !z.includes(MARKE) && !(i >= helferStart && i < helferEnde));
gleich(unmarkiert.map((x) => x.z.slice(0, 80)), [], 'JS: jede geänderte Zeile trägt die Marke (oder liegt im Helferblock)');
// vorhandene Zeilen sind nur geändert, nie gelöscht (ausser den 8 ersetzten Zeilen): alte Zeilen, die im Neuen fehlen, sind genau die Anker-Zeilen
const neuMenge = new Set(neuZeilen);
const verschwunden = altZeilen.filter((z) => !neuMenge.has(z));
ok(verschwunden.length <= 18 && verschwunden.every((z) => /variantsFor|renderCard|const cta = |sourceCount|entries=|types\.add|categoryShortcuts|buttons\.forEach|showMessage|original_variants|const data=offersFor|const count=el|\.hidden|const raw = await|result\.textContent|initialProduct|data\.requiresChoice && data\.offers\.length/.test(z) || z.includes('const entries')), `JS: nur Ankerzeilen verändert (verschwunden: ${verschwunden.length})`);
// Zeilen 449 bis 460 der Vorlage (Beschreibung, Optionen, Positionen, Masse: Katalogtexte-Auftrag) kommen unverändert und zusammenhängend im Neuen vor
const block = altZeilen.slice(448, 460).join('\n');
ok(jsAlt.split('\n').slice(448, 460).length === 12 && /placements|lcl-description/.test(block), 'Testvoraussetzung: Zeilen 449 bis 460 sind die Texte-Zeilen');
ok(jsNeu.includes(block), 'JS: Zeilen 449 bis 460 der Vorlage unverändert und zusammenhängend');
// Kernzusagen im Text
for (const [teil, text] of [
  ['lxVids.has(id(v.id))', 'variantsFor filtert auf bestellbare'], ["offersFor({id:vid})", 'Angebote je Variante geprüft'], ['o.available!==false', 'available nicht false'],
  ['hide.modelle', 'Ausblenden: Modelle gelesen'], ['hide.varianten', 'Ausblenden: Varianten gelesen'], ["root.dataset.hideState='unavailable'", 'Ausblenden defensiv (Fehler gefangen)'],
  ["throw new Error('Invalid variant map')", 'fehlende Variantenkarte = Ladefehler'], ["x.hash='lspod-start'", 'Ziel mit Editor-Anker'], ["lcl-button lcl-design-cta lcl-card-design", 'Karten-Knopf'],
  ["t('design_cta')+': '+titleForProduct(product)", 'Karten-Knopf mit Namen für Screenreader'], ["t(products.length?'empty':'none_orderable')", 'Satz bei null Modellen'], ['if(count>0)types.add(option)', 'Typ-Liste ohne leere Kategorien'],
  ["t('orderable_variants'/* " + MARKE + " */,{count:variants.length})", 'Anzahl bestellbarer Ausführungen'], ["variants.length===1?t('orderable_variants_one')", 'Einzahl bestellbare Ausführung'],
  ["t(filtered.length===1?'results_one':'results'", 'Einzahl Ergebniszeile'], ["lxEarly(); /* " + MARKE + " */ const raw = await", 'Karte und Ausblenden parallel zum Index'], ["const map = await lxLoads.map", 'Variantenkarte aus dem Vorabruf'],
  ["throw new Error('LX_RELOAD')", 'veraltetes Dokument = eigener Fehler'], ["t(lxReload?'reload_needed':'load_error')", 'eigener Satz bei veraltetem Dokument'], ["retry.hidden = lxReload", 'kein nutzloser Knopf bei veraltetem Dokument'],
  ["showMessage(t('model_unavailable'))", 'Satz bei Direktlink auf ein verborgenes Modell'], ["root.classList.toggle('lcl-no-models',!products.length)", 'Klasse bei null Modellen'],
  ["data.offers.filter(item=>item.available!==false)", 'nicht lieferbare Angebote nicht zur Wahl'], ["t('notice_shoes')", 'Schuh-Satz nur bei Europa-Grössen'], ["/^EU\\b/i.test(displaySize(s,p))", 'Schuh-Satz prüft die angezeigte Grösse'], ['data.offers.length>1&&!priceChoiceId', 'Vorwahl bei zwei Angeboten'], ["(match.requiresChoice && match.offers.length<2)", 'unklare Angebote zählen nicht'],
]) ok(jsNeu.includes(teil), `JS enthält: ${text}`);
ok(!jsNeu.includes('view=luxe-studio'), 'JS: kein Link auf die Vorschau');

// ---------- 4. CSS ----------
const cssNeu = soll[DATEIEN.CSS];
ok(cssNeu.startsWith(sich[DATEIEN.CSS].replace(/\s*$/, '\n')) && cssNeu.endsWith(CSS_NEU), 'CSS: nur angehängt');
ok(/\.lcl-card \.lcl-card-design\{[^}]*margin:auto 0 8px;min-height:44px/.test(cssNeu), 'CSS: Knopf auf Karten mindestens 44 px hoch');
ok(/\.lcl-card \.lcl-card-design\+\.lcl-card-cta\{margin-top:0\}/.test(cssNeu), 'CSS: Details-Knopf direkt unter dem Gestalten-Knopf');
ok(/\.lcl-catalog\.lcl-no-models \.lcl-discovery,\.lcl-catalog\.lcl-no-models \.lcl-result-line\{display:none\}/.test(cssNeu), 'CSS: bei null Modellen keine leere Filterfläche');

// ---------- 5. Sprachdateien ----------
const json = { de: sprachJson(soll[DATEIEN.DE]), en: sprachJson(soll[DATEIEN.EN]), fr: sprachJson(soll[DATEIEN.FR]) };
const jsonAlt = { de: sprachJson(sich[DATEIEN.DE]), en: sprachJson(sich[DATEIEN.EN]), fr: sprachJson(sich[DATEIEN.FR]) };
for (const sp of ['de', 'en', 'fr']) {
  const neu = json[sp].luxe_clothing, alt = jsAlt0(sp);
  for (const k of NEUE_SCHLUESSEL) if (TEXTE[sp][k] !== undefined) gleich(neu[k], TEXTE[sp][k], `${sp}: ${k}`);
  gleich(neu.none_orderable, TEXTE[sp].none_orderable, `${sp}: none_orderable`); gleich(neu.orderable_variants, TEXTE[sp].orderable_variants, `${sp}: orderable_variants`); gleich(neu.notice, TEXTE[sp].notice, `${sp}: notice`);
  ok(neu.orderable_variants.includes('[count]') && !neu.orderable_variants_one.includes('[count]'), `${sp}: orderable_variants trägt [count], die Einzahl nicht`);
  // alle anderen Schlüssel des Blocks unverändert (ersetzt: notice, intro; neu: die Schlüssel mit Text in dieser Sprache)
  const erwartet = { ...alt, notice: TEXTE[sp].notice, ...(TEXTE[sp].intro !== undefined ? { intro: TEXTE[sp].intro } : {}), ...Object.fromEntries(NEUE_SCHLUESSEL.filter((k) => TEXTE[sp][k] !== undefined).map((k) => [k, TEXTE[sp][k]])) };
  gleich(neu, erwartet, `${sp}: luxe_clothing sonst unverändert`);
  const rest = { ...json[sp] }, restAlt = { ...jsonAlt[sp] }; delete rest.luxe_clothing; delete restAlt.luxe_clothing;
  if (sp !== 'fr') {
    for (const k of ['end_note', 'shop_intro', 'preview_note']) gleich(rest.luxe_category[k], TEXTE[sp][k], `${sp}: luxe_category.${k}`);
    restAlt.luxe_category = { ...restAlt.luxe_category, end_note: TEXTE[sp].end_note, shop_intro: TEXTE[sp].shop_intro, preview_note: TEXTE[sp].preview_note };
  }
  gleich(rest, restAlt, `${sp}: übrige Blöcke unverändert`);
  // keiner der sichtbaren Texte widerspricht dem neuen Stand (echter Bestell-Editor, nur Bestellbares)
  const sichtbar = [neu.notice, neu.dialog_notice, neu.intro || '', (json[sp].luxe_category || {}).end_note || '', (json[sp].luxe_category || {}).shop_intro || '', (json[sp].luxe_category || {}).preview_note || ''].join(' | ');
  ok(!/Vorschau|preview|noch nicht bestellt|nicht möglich|cannot yet|not yet|Individuelle Motive|Gestaltungsentwurf|design draft|alle anderen/.test(sichtbar.replace(/Produktkatalog/g, '')), `${sp}: kein Text verspricht noch eine Vorschau oder sagt «noch nicht bestellbar»: ${sichtbar.slice(0, 120)}`);
  ok(!/Kinder|kidswear/.test(neu.intro || '') && !/Schuh|[Ss]hoe/.test(neu.notice + ' ' + neu.dialog_notice), `${sp}: intro nennt keine Kinderkleidung, notice und dialog_notice keine Schuhe (der Schuh-Satz steht in notice_shoes)`);
  ok(/Schuh|[Ss]hoe|Pointure/.test(neu.notice_shoes), `${sp}: notice_shoes nennt die Schuhe`);
  ok(!(neu.dialog_notice || '').includes('Produktseite') && !(neu.dialog_notice || '').includes('product page'), `${sp}: dialog_notice wiederholt den Satz «Gestaltet und bestellt wird auf der Produktseite» nicht`);
  ok(soll[{ de: DATEIEN.DE, en: DATEIEN.EN, fr: DATEIEN.FR }[sp]].startsWith(sich[{ de: DATEIEN.DE, en: DATEIEN.EN, fr: DATEIEN.FR }[sp]].match(/^\/\*[\s\S]*?\*\/\n/)[0]), `${sp}: Kommentarkopf der Sprachdatei erhalten`);
}
function jsAlt0(sp) { return jsonAlt[sp].luxe_clothing; }
// kein Schlüssel kommt in einem Block zweimal vor (JSON.parse liest bei doppelten Schlüsseln nur den letzten und verschweigt den Fehler)
for (const [sp, f] of [['de', DATEIEN.DE], ['en', DATEIEN.EN], ['fr', DATEIEN.FR]]) {
  for (const block of ['luxe_clothing', 'luxe_category']) {
    const text = soll[f]; const m = text.match(new RegExp('"' + block + '": \\{'));
    if (!m) continue;
    const start = text.indexOf(m[0]) + m[0].length - 1; let tiefe = 0, inStr = false, esc = false, ende = start;
    for (let i = start; i < text.length; i++) { const c = text[i]; if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; } if (c === '"') inStr = true; else if (c === '{') tiefe++; else if (c === '}') { tiefe--; if (tiefe === 0) { ende = i; break; } } }
    const schluessel = [...text.slice(start + 1, ende).matchAll(/^ {4}"([^"]+)": /gm)].map((x) => x[1]);
    const doppelt = schluessel.filter((k, i) => schluessel.indexOf(k) !== i);
    gleich(doppelt, [], `${sp}: Block ${block} hat keinen doppelten Schlüssel`);
    ok(schluessel.length > 15, `${sp}: Block ${block} gelesen (${schluessel.length} Schlüssel)`);
  }
}
ok(!/ß/.test(Object.values(TEXTE.de).join(' ')), 'de: Schweizer Rechtschreibung (kein ß)');
gleich([TEXTE.de.results_one, TEXTE.de.orderable_variants_one, TEXTE.en.results_one, TEXTE.en.orderable_variants_one], ['1 Modell in dieser Auswahl', '1 bestellbare Ausführung', '1 model in this selection', '1 orderable variant'], 'Einzahl-Texte de/en');
ok(!('results_one' in TEXTE.fr), 'fr: results_one fehlt bewusst (results ist dort auch nicht übersetzt, beide fallen auf Englisch zurück)');
ok(/nur Modelle/.test(TEXTE.de.notice) && !/alle anderen noch nicht|Produktkatalog zur Auswahl/.test(TEXTE.de.notice), 'de: Hinweis sagt «nur Modelle», nicht mehr «alle anderen noch nicht»');
ok(/only see models/.test(TEXTE.en.notice) && !/all others not yet/.test(TEXTE.en.notice), 'en: Hinweis sagt «only see models»');
ok(TEXTE.de.notice.length < 230 && TEXTE.en.notice.length < 230, 'Hinweise bleiben kurz (unter 230 Zeichen)');
ok(/^[^.]*\.$/.test(TEXTE.de.none_orderable.split(' Bitte')[0]) || TEXTE.de.none_orderable.endsWith('vorbei.'), 'de: ehrlicher Satz bei null Modellen');

// ---------- 6. Ausblenden-Datei ----------
const aus = JSON.parse(soll[NEUE_DATEIEN.AUSBLENDEN]);
gleich([aus.schemaVersion, aus.modelle.length, Object.values(aus.varianten).reduce((s, a) => s + a.length, 0), Object.keys(aus.varianten).length], [1, 40, 126, 35], 'Ausblenden: 40 Modelle, 126 Varianten in 35 Modellen');
gleich(aus.modelle, [...aus.modelle].sort((a, b) => a - b), 'Ausblenden: Modelle sortiert');
gleich(aus.modelle, daten.ausblenden.modelle_ausblenden.map(Number).sort((a, b) => a - b), 'Ausblenden: Modelle gleich der Quelle');
for (const [m, v] of Object.entries(daten.ausblenden.varianten_ausblenden)) gleich(aus.varianten[m], v.map(Number).sort((a, b) => a - b), `Ausblenden: Varianten von ${m} gleich der Quelle`);
ok(soll[NEUE_DATEIEN.AUSBLENDEN] === ausblendenText(daten.ausblenden), 'Ausblenden: Text gleich ausblendenText()');
ok(aus.stand === '2026-11-05' && /GEMESSEN/.test(aus.quelle), 'Ausblenden: Stand und Quelle gesetzt');

// ---------- 7. Variantenkarte ----------
const karte = JSON.parse(soll[NEUE_DATEIEN.KARTE]);
const alleV = Object.values(karte.modelle).flat();
gleich([karte.schemaVersion, Object.keys(karte.modelle).length, alleV.length, new Set(alleV.map((z) => z[0])).size], [1, 572, 13160, 13160], 'Karte: 572 Modelle, 13 160 Varianten, keine Nummer doppelt');
ok(alleV.every((z) => Number.isInteger(z[0]) && z[0] > 0 && (z[1] === null || typeof z[1] === 'string') && (z[2] === null || typeof z[2] === 'string')), 'Karte: jede Zeile [Nummer, Farbe|null, Grösse|null]');
ok(karte.modelle['71'].length === 628 && karte.modelle['19'].length === 3 && karte.modelle['686'].length === 46, 'Karte: bekannte Modelle haben die erwartete Variantenzahl (T-Shirt 628, Tasse 3, Samsung 46)');
ok(Object.keys(aus.varianten).every((m) => aus.varianten[m].every((v) => karte.modelle[m].some((z) => z[0] === v))), 'Karte: jede auszublendende Variante liegt in ihrem Modell');
// Gegenprobe gegen die 51 Datenschalen (9 MB, nicht im Repo): SCHALEN_DIR oder der Scratch-Ordner mit den Lesekopien; fehlen sie, wird das gemeldet und übersprungen
{
  const dir = process.env.SCHALEN_DIR || '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/ds/work/bauer/schalen';
  if (existsSync(dir + '/assets__luxe-clothing-details-s001.json')) {
    const { karteAusSchalen, karteAlsText, pruefeGegenIndex } = await import('./variantenkarte_bauen.mjs');
    ok(karteAlsText(karteAusSchalen(dir)) === soll[NEUE_DATEIEN.KARTE], 'Karte: gleich dem Neubau aus den 51 Datenschalen (jede Variantennummer, Farbe und Grösse)');
    if (existsSync(dir + '/assets__luxe-clothing-index.json')) gleich(pruefeGegenIndex(karte.modelle, JSON.parse(readFileSync(dir + '/assets__luxe-clothing-index.json', 'utf8'))), [], 'Karte: stimmt mit dem Index überein');
  } else console.log('  (Gegenprobe der Variantenkarte gegen die Datenschalen übersprungen: SCHALEN_DIR fehlt)');
}
ok(aus.modelle.every((m) => karte.modelle[String(m)]), 'Karte: jedes auszublendende Modell kommt vor');

// ---------- 8. Liquid mit dem echten Ruby-Liquid ----------
if (process.env.OHNE_LIQUID === '1') console.log('  (Ruby-Liquid übersprungen: OHNE_LIQUID=1)');
else if (!rubyLiquidGems()) { ok(false, 'Ruby-Liquid nicht gefunden (RUBY_LIQUID_GEMS setzen oder OHNE_LIQUID=1)'); }
else {
  const trDe = flach(sprachJson(soll[DATEIEN.DE])), trDeAlt = flach(sprachJson(sich[DATEIEN.DE]));
  const handles = ['unisex-t-shirt-selbst-gestalten', 'bio-jutebeutel-selbst-gestalten', 'keramik-tasse-selbst-gestalten'];
  const all_products = Object.fromEntries(handles.map((h, i) => [h, produkt(h, 100 + i, 900 + i, h)]));
  const items = Array.from({ length: 5 }, (_, i) => produkt('prod-' + i, 200 + i, 700 + i, `Titel ${i} – Selbst gestalten`));
  const colls = Object.fromEntries(['selbst-gestalten-1', 'sg-bekleidung', 'sg-taschen', 'sg-wohnen', 'sg-trinken', 'sg-accessoires'].map((h) => [h, { handle: h, url: '/collections/' + h, products: items }]));
  const ctxKat = (kompakt) => ({ collections: colls, collection: colls['selbst-gestalten-1'], all_products, section: { id: 'main', settings: { compact_shop_list: kompakt } }, request: { locale: { iso_code: 'de' } } });
  const links = (html) => (html.match(/<a [^>]*href="[^"]*"/g) || []).map((a) => a.match(/href="([^"]*)"/)[1]);

  // 8a. Titelkacheln
  for (const [name, quelle, tr] of [['Soll', soll[DATEIEN.COVER], trDe], ['Ist', sich[DATEIEN.COVER], trDeAlt]]) {
    const r = rendere({ main: quelle, templates: SNIPPET_ATTRAPPEN, context: { all_products }, translations: tr });
    gleich(r.fehler, [], `Titelkacheln (${name}): Liquid ohne Fehler`);
    const l = links(r.ausgabe);
    if (name === 'Soll') {
      gleich(l, handles.map((h, i) => `/products/${h}?variant=${900 + i}#lspod-start`), 'Titelkacheln: drei Links auf den echten Editor mit Variante');
      ok(!r.ausgabe.includes('view=luxe-studio'), 'Titelkacheln: kein Link mehr auf die Vorschau');
    } else gleich(l, handles.map((h) => `/products/${h}?view=luxe-studio`), 'Titelkacheln (Ist): drei Vorschau-Links (Messgerät erkennt den Unterschied)');
  }
  // 8b. Shopliste (kompakt = Betrieb, nicht kompakt = Kopfbereich mit Held-Kacheln)
  const kat = {};
  // beide mit den neuen Texten gerendert: so unterscheiden sich Ist und Soll nur durch die Links und den Knopftext, nicht durch end_note
  for (const kompakt of [true, false]) for (const [name, quelle, tr] of [['Soll', soll[DATEIEN.CATEGORY], trDe], ['Ist', sich[DATEIEN.CATEGORY], trDe]]) {
    const r = rendere({ main: quelle, templates: SNIPPET_ATTRAPPEN, context: ctxKat(kompakt), translations: tr });
    gleich(r.fehler, [], `Shopliste ${kompakt ? 'kompakt' : 'voll'} (${name}): Liquid ohne Fehler`);
    kat[`${kompakt}-${name}`] = r.ausgabe;
  }
  const sk = kat['true-Soll'], sv = kat['false-Soll'];
  gleich(links(sk).filter((l) => l.includes('#lspod-start')).length, 15, 'Shopliste kompakt: 5 Produkte × 3 Links auf den Editor');
  gleich(links(sk).filter((l) => l.includes('#lspod-start')).slice(0, 3), ['/products/prod-0?variant=700#lspod-start', '/products/prod-0?variant=700#lspod-start', '/products/prod-0?variant=700#lspod-start'], 'Shopliste: Link-Form /products/<handle>?variant=<id>#lspod-start');
  ok(!sk.includes('view=luxe-studio') && !sv.includes('view=luxe-studio'), 'Shopliste: kein Link auf die Vorschau (kompakt und voll)');
  gleich((sk.match(/class="lxc-card-cta"[^>]*>Jetzt selbst gestalten/g) || []).length, 5, 'Shopliste kompakt: Knopftext «Jetzt selbst gestalten» (5 ×)');
  ok(!sk.includes('Entwurf öffnen'), 'Shopliste kompakt: «Entwurf öffnen» weg');
  gleich((sv.match(/class="lxc-card-cta"[^>]*>Selbst gestalten/g) || []).length, 5, 'Shopliste voll: Knopftext «Selbst gestalten» unverändert');
  gleich(links(sv).filter((l) => l.includes('#lspod-start')).length, 15 + 3, 'Shopliste voll: 15 Karten-Links + 3 Held-Links auf den Editor');
  gleich(links(sv).filter((l) => l.startsWith('/collections/')).length, 6, 'Shopliste: Kategorie-Links unverändert (view=luxe-gestalten)');
  // Gegenprobe: Soll == Ist nach Umschreiben der vier Linkarten und des Knopftextes (keine ungewollte Änderung sonst)
  const alsSoll = (html, kompakt) => (kompakt ? html.split('Entwurf öffnen').join('Jetzt selbst gestalten') : html).replace(/href="(\/products\/([^"?]+))\?view=luxe-studio"/g, (_m, pfad, h) => `href="${pfad}?variant=${(items.find((i) => i.handle === h) || all_products[h]).selected_or_first_available_variant.id}#lspod-start"`);
  ok(alsSoll(kat['true-Ist'], true) === sk, 'Shopliste kompakt: Soll gleich Ist nach Umschreiben der Links (sonst nichts geändert)');
  ok(alsSoll(kat['false-Ist'], false) === sv, 'Shopliste voll: Soll gleich Ist nach Umschreiben der Links (sonst nichts geändert)');

  // 8c. Sektion: Labels, Manifest, Titelkacheln im Kopf
  const templates = { ...SNIPPET_ATTRAPPEN };
  const labels = {};
  for (const [sp, spKey] of [['de', DATEIEN.DE], ['en', DATEIEN.EN], ['fr', DATEIEN.FR]]) {
    for (const stand of ['Soll', 'Ist']) {
      const q = stand === 'Soll' ? soll : sich;
      // Shopify fällt bei einem fehlenden Schlüssel auf die Standardsprache (en.default.json) zurück: so auch hier (fr.json hat nur wenige Schlüssel)
      const tr = { ...flach(sprachJson(q[DATEIEN.EN])), ...flach(sprachJson(q[spKey])) };
      const r = rendere({
        main: q[DATEIEN.SECTION], translations: tr,
        templates: { ...templates, 'luxe-clothing-asset-manifest': q[DATEIEN.MANIFEST], 'luxe-selfdesign-cover': q[DATEIEN.COVER] },
        context: { section: { id: 'cat' }, all_products, request: { locale: { iso_code: sp } } },
      });
      gleich(r.fehler, [], `Sektion ${sp} (${stand}): Liquid ohne Fehler`);
      const m = r.ausgabe.match(/<script type="application\/json" data-lcl-config>([\s\S]*?)<\/script>/);
      ok(!!m, `Sektion ${sp} (${stand}): Konfiguration gefunden`);
      let cfg = null; try { cfg = JSON.parse(m[1]); } catch (e) { ok(false, `Sektion ${sp} (${stand}): Konfiguration ist kein JSON: ${e.message}`); }
      labels[`${sp}-${stand}`] = { cfg, html: r.ausgabe };
    }
    const s = labels[`${sp}-Soll`], i = labels[`${sp}-Ist`];
    if (!s.cfg || !i.cfg) continue;
    gleich(Object.keys(s.cfg.labels).filter((k) => !(k in i.cfg.labels)).sort(), [...NEUE_SCHLUESSEL].sort(), `Sektion ${sp}: genau die ${NEUE_SCHLUESSEL.length} neuen Labels`);
    gleich(Object.keys(i.cfg.labels).filter((k) => !(k in s.cfg.labels)), [], `Sektion ${sp}: kein Label verloren`);
    gleich(s.cfg.labels.none_orderable, TEXTE[sp].none_orderable, `Sektion ${sp}: Label none_orderable trägt den Satz`); gleich(s.cfg.labels.orderable_variants, TEXTE[sp].orderable_variants, `Sektion ${sp}: Label orderable_variants`);
    gleich(s.cfg.labels.notice, TEXTE[sp].notice, `Sektion ${sp}: Label notice trägt den neuen Hinweis`);
    for (const k of Object.keys(i.cfg.labels)) if (!['notice', 'intro'].includes(k) && JSON.stringify(i.cfg.labels[k]) !== JSON.stringify(s.cfg.labels[k])) ok(false, `Sektion ${sp}: Label ${k} hat sich unerwartet geändert`);
    for (const k of NEUE_SCHLUESSEL) if (TEXTE[sp][k] !== undefined) gleich(s.cfg.labels[k], TEXTE[sp][k], `Sektion ${sp}: Label ${k}`); else gleich(s.cfg.labels[k], TEXTE.en[k], `Sektion ${sp}: Label ${k} fällt auf die Standardsprache (Englisch) zurück`);
    gleich(s.cfg.labels.intro, TEXTE[sp].intro !== undefined ? TEXTE[sp].intro : TEXTE.en.intro, `Sektion ${sp}: Label intro`);
    gleich(Object.keys(s.cfg.assets).filter((k) => !(k in i.cfg.assets)).sort(), ['ausblenden', 'variantenkarte'], `Sektion ${sp}: Manifest hat genau zwei neue Dateien`);
    ok(/\/assets\/luxe-clothing-ausblenden\.json\?v=/.test(s.cfg.assets.ausblenden) && /\/assets\/luxe-clothing-variantenkarte\.json\?v=/.test(s.cfg.assets.variantenkarte), `Sektion ${sp}: Manifest-Adressen auf die neuen Dateien`);
    ok(/^\/assets\/luxe-clothing-[a-z\d-]+\.json$/i.test(new URL(s.cfg.assets.ausblenden, 'https://luxestyle.ch').pathname.replace(/^.*\/assets/, '/assets')) && /^\/assets\/luxe-clothing-[a-z\d-]+\.json$/i.test(new URL(s.cfg.assets.variantenkarte, 'https://luxestyle.ch').pathname.replace(/^.*\/assets/, '/assets')), `Sektion ${sp}: Dateinamen erfüllen die Prüfung assetUrl() des JS`);
    gleich(Object.keys(s.cfg.assets.details).length, 51, `Sektion ${sp}: 51 Datenschalen im Manifest`);
    gleich(s.cfg.assets.index, i.cfg.assets.index, `Sektion ${sp}: Index-Adresse unverändert`);
    const hinweis = (h) => (h.match(/<p class="lcl-notice">([^<]*)<\/p>/) || [])[1];
    gleich(hinweis(s.html), TEXTE[sp].notice.replace(/&/g, '&amp;'), `Sektion ${sp}: sichtbarer Hinweis im Kopf`);
    const hinweisDialog = (h) => (h.match(/<p class="lcl-dialog-notice">([^<]*)<\/p>/) || [])[1];
    gleich(hinweisDialog(s.html), TEXTE[sp].dialog_notice.replace(/&/g, '&amp;'), `Sektion ${sp}: Hinweis im Dialog ist der kürzere Text`);
    gleich(hinweisDialog(i.html), hinweis(i.html), `Sektion ${sp}: Ist-Stand hatte im Dialog denselben Text wie im Kopf (Messgerät erkennt den Unterschied)`);
  }
  ok(!labels['de-Soll'].html.includes('view=luxe-studio'), 'Sektion: kein Vorschau-Link in den Titelkacheln des Kopfes');
  gleich((labels['de-Soll'].html.match(/href="[^"]*lspod-start"/g) || []).length, 3, 'Sektion: drei Titelkacheln auf den Editor');
ok(/target\.hash === '#lspod-start'/.test(labels['de-Soll'].html) && !/target\.hash === '#lspod-start'/.test(labels['de-Ist'].html), 'Sektion: das Vorschau-Skript der Titelkacheln erkennt die Editor-Ziele (Ist: nicht)');
}

console.log(`${n} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
