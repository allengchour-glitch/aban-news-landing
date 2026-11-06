// Mutationsprobe: verändert je einen Satz in patches.mjs, apply.mjs oder daten/ und prüft, dass die Tests es bemerken.
//   NODE_PATH=$(/opt/node22/bin/npm root -g) node dropship/katalog-nur-bestellbar-0511/mutationsprobe.mjs
// Hinweis «voll»: ein sechstes Element im Mutanten lässt den Browsertest ohne SCHNELL laufen (390 px nötig)
// Umgebung: PARALLEL=3 (Vorgabe) Anzahl gleichzeitiger Mutanten; NUR=<Teil des Namens> nur passende Mutanten; LOG=<Datei> Ausgabe der fehlschlagenden Tests (Vorgabe: Scratch)
// Pro Mutant läuft eine Kopie des Pakets in einem Wegwerfordner:
//   - patches_test.mjs (mit PRUEFSUMME_IGNORIEREN=1: die Prüfsumme in daten/pruefstand.json würde jede Änderung sofort melden und nichts über das Verhalten sagen)
//   - JS-, CSS- und Daten-Mutanten zusätzlich test_nur_bestellbar.cjs gegen die Live-Seite aus dem Zwischenspeicher (LOKAL=1; CSS-Mutanten mit 390 px, die übrigen SCHNELL=1)
//   - apply.mjs-Mutanten apply_test.mjs; Wächter-Mutanten (waechter_kern.mjs) waechter_test.mjs
// Ein Mutant gilt als erkannt, wenn mindestens ein Test fehlschlägt; die Ausgabe nennt, WELCHER Test es war und ob schon der Browsertest allein es bemerkt hätte.
// Vor den Mutanten läuft der unveränderte Stand einmal durch alle Tests (Referenzlauf, muss grün sein). Ein «?» ist ein Mutant, dessen Muster nicht vorkommt (Fehlalarm der Probe, zu beheben).
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const HIER = new URL('.', import.meta.url).pathname;
const LOG = process.env.LOG || '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/ds/work/bauer/probe_log.txt';
const PARALLEL = Number(process.env.PARALLEL || 3);
const M = '${MARKE}';

// [datei, art, name, alt, neu]   art: js | css | liquid | text | daten | apply
const MUTANTEN = [
  // ---- JS: Kern «nur bestellbar» ----
  ['patches.mjs', 'js', 'JS: Varianten nicht auf bestellbare beschränkt', "(lxVids === null || lxVids.has(id(v.id)))", "(true)"],
  ['patches.mjs', 'js', 'JS: Verfügbarkeit ignoriert (nur «Angebot da»)', "!match.offers.some(o=>o.available!==false) ||", "!match.offers.length ||"],
  ['patches.mjs', 'js', 'JS: unklares zweites Angebot zählt als bestellbar', " || (match.requiresChoice && match.offers.length<2))return;", ")return;"],
  ['patches.mjs', 'js', 'JS: Zusatzschutz für Modelle ignoriert', "if(!row || hideModels.has(row.model) || hideVariants.has(vid))return;", "if(!row || hideVariants.has(vid))return;"],
  ['patches.mjs', 'js', 'JS: Zusatzschutz für Varianten ignoriert', "if(!row || hideModels.has(row.model) || hideVariants.has(vid))return;", "if(!row || hideModels.has(row.model))return;"],
  ['patches.mjs', 'js', 'JS: Fehler der Ausblenden-Datei nicht gefangen', "catch{root.dataset.hideState='unavailable';}", "catch(e){throw e;}"],
  ['patches.mjs', 'js', 'JS: fehlende Variantenkarte wird still als leer behandelt', "const map = await lxLoads.map;", "const map = await lxLoads.map.catch(()=>({schemaVersion:1,modelle:{}}));"],
  ['patches.mjs', 'js', 'JS: Ausblenden-Datei mit falschem Schlüssel gelesen (modelle)', "list(hide.modelle).forEach(m=>hideModels.add(id(m)))", "list(hide.modellen).forEach(m=>hideModels.add(id(m)))"],
  ['patches.mjs', 'js', 'JS: Ausblenden-Datei mit falschem Schlüssel gelesen (varianten)', "Object.values(hide.varianten||{})", "Object.values(hide.variante||{})"],
  ['patches.mjs', 'js', 'JS: Modelle nicht eingeschränkt (Filter lässt alle durch)', "products = products.filter(p=>byModel.has(id(p.id))).map(p=>{", "products = products.filter(p=>true).map(p=>{ if(!byModel.has(id(p.id)))return p;"],
  ['patches.mjs', 'js', 'JS: Farben der Karten nicht eingeschränkt', "colors:list(p.colors).filter(c=>colors.has(colorValue(c))),", "colors:list(p.colors),"],
  ['patches.mjs', 'js', 'JS: Grössen der Karten nicht eingeschränkt', "sizes:list(p.sizes).filter(s=>sizes.has(s)),", "sizes:list(p.sizes),"],
  ['patches.mjs', 'js', 'JS: Farbe-Grösse-Paare nicht eingeschränkt', ".filter(s=>pairs.get(key)?.has(s))", ".filter(s=>true)"],
  ['patches.mjs', 'js', 'JS: Gruppen ohne Modell bleiben', ".filter(c=>products.some(p=>categoryIds(p).includes(id(c.id))))", ""],
  ['patches.mjs', 'js', 'JS: Typ-Liste zeigt leere Kategorien', "if(count>0)types.add(option);", "types.add(option);"],
  ['patches.mjs', 'js', 'JS: Kurzwahl bleibt ohne Modell sichtbar', "||!products.some(p=>categoryIds(p).includes(key));", ";"],
  ['patches.mjs', 'js', 'JS: Sonderauswahl bleibt ohne Modell sichtbar', "node.hidden=node.dataset.lclAudience!=='all'&&!products.some(p=>matchesAudience(p,node.dataset.lclAudience));", ""],
  ['patches.mjs', 'js', 'JS: Sonderauswahl «Alle» wird auch versteckt', "node.hidden=node.dataset.lclAudience!=='all'&&!products.some(", "node.hidden=!products.some("],
  ['patches.mjs', 'js', 'JS: kein ehrlicher Satz bei null Modellen', "t(products.length?'empty':'none_orderable')", "t('empty')"],
  ['patches.mjs', 'js', 'JS: Satz bei null Modellen auch bei leerer Suche', "t(products.length?'empty':'none_orderable')", "t(filtered.length?'empty':'none_orderable')"],
  ['patches.mjs', 'js', 'JS: Karte ohne Knopf', "const buy = lxCardCta(product); if (buy) copy.append(buy);", ""],
  ['patches.mjs', 'js', 'JS: Knopf der Karte ohne Editor-Anker', "x.hash='lspod-start';return x.href;", "return x.href;"],
  ['patches.mjs', 'js', 'JS: Knopf der Karte führt auf die Vorschau', "x.hash='lspod-start';return x.href;", "x.hash='lspod-start';x.searchParams.set('view','luxe-studio');return x.href;"],
  ['patches.mjs', 'js', 'JS: Knopf unter «Auswahl & Details»', `const buy = lxCardCta(product); if (buy) copy.append(buy); /* ${M} */ const cta = button(t('details'), () => openDetails(product, cta),'lcl-card-cta'); copy.append(cta);`, `const cta = button(t('details'), () => openDetails(product, cta),'lcl-card-cta'); copy.append(cta); const buy = lxCardCta(product); if (buy) copy.append(buy); /* ${M} */`],
  ['patches.mjs', 'js', 'JS: Knopf ohne Namen für Screenreader', "link.setAttribute('aria-label',t('design_cta')+': '+titleForProduct(product));", ""],
  ['patches.mjs', 'js', 'JS: Knopf ohne Kartenklasse', "'lcl-button lcl-design-cta lcl-card-design'", "'lcl-button lcl-design-cta'", 'voll'],
  ['patches.mjs', 'js', 'JS: keine Vorwahl bei zwei Angeboten', "if(data.requiresChoice&&data.offers.length>1&&!priceChoiceId){const first=data.offers.find(item=>item.available!==false);if(first)priceChoiceId=id(first.variantId);}", ""],
  ['patches.mjs', 'js', 'JS: Anzahl-Zeile nennt wieder «Originalvarianten»', "t('orderable_variants'/* ${MARKE} */,{count:variants.length})", "t('original_variants'/* ${MARKE} */,{count:variants.length})"],
  ['patches.mjs', 'js', 'JS: Variantenkarte wird nicht gelesen (Modelle der Karte leer)', "Object.entries(map.modelle).forEach(([model,variants])=>list(variants)", "Object.entries({}).forEach(([model,variants])=>list(variants)"],
  ['patches.mjs', 'js', 'JS: Farbe und Grösse der Karte vertauscht', "rows.set(v,{model:id(model),color:string(row[1]),size:string(row[2])})", "rows.set(v,{model:id(model),color:string(row[2]),size:string(row[1])})"],
  ['patches.mjs', 'js', 'JS: Modellnummer der Karte falsch', "rows.set(v,{model:id(model),", "rows.set(v,{model:id(model)+'0',"],
  // ---- CSS ----
  ['patches.mjs', 'css', 'CSS: Knopf auf der Karte nur 20 px hoch', ".lcl-card .lcl-card-design{margin:auto 0 8px;min-height:44px;", ".lcl-card .lcl-card-design{margin:auto 0 8px;min-height:20px;"],
  ['patches.mjs', 'css', 'CSS: Knopf nicht unten bündig', ".lcl-card .lcl-card-design{margin:auto 0 8px;", ".lcl-card .lcl-card-design{margin:0 0 8px;"],
  ['patches.mjs', 'css', 'CSS: Details-Knopf rutscht nach unten', ".lcl-card .lcl-card-design+.lcl-card-cta{margin-top:0}", ""],
  ['patches.mjs', 'css', 'CSS: Abstand zwischen den Knöpfen 40 px', "margin:auto 0 8px;min-height:44px", "margin:auto 0 40px;min-height:44px"],
  ['patches.mjs', 'css', 'CSS: CSS nicht angehängt', "return text.replace(/\\s*$/, '\\n') + CSS_NEU;", "return text;"],
  // ---- Liquid ----
  ['patches.mjs', 'liquid', 'Liquid: Titelkacheln zeigen noch auf die Vorschau', "let t = einmal(text, `href=\"{{ cover_product.url }}?view=luxe-studio\"`, `href=\"{{ ${editorLink('cover_product')}`, 'Cover-Link');", "let t = text;"],
  ['patches.mjs', 'liquid', 'Liquid: Shopliste Bild-Link zeigt noch auf die Vorschau', "t = einmal(t, `<a class=\"lxc-card-image\" href=\"{{ item.url }}?view=luxe-studio\"`, `<a class=\"lxc-card-image\" href=\"{{ ${editorLink('item')}`, 'Category Bild-Link');", ""],
  ['patches.mjs', 'liquid', 'Liquid: Shopliste Titel-Link zeigt noch auf die Vorschau', "t = einmal(t, `<h3><a href=\"{{ item.url }}?view=luxe-studio\">`, `<h3><a href=\"{{ ${editorLink('item')}>`, 'Category Titel-Link');", ""],
  ['patches.mjs', 'liquid', 'Liquid: Shopliste Held-Link zeigt noch auf die Vorschau', "t = einmal(t, `href=\"{{ hero_product.url }}?view=luxe-studio\"`, `href=\"{{ ${editorLink('hero_product')}`, 'Category Hero-Link');", ""],
  ['patches.mjs', 'liquid', 'Liquid: Link ohne Variante', "const editorLink = (drop) => `${drop}.url }}?variant={{ ${drop}.selected_or_first_available_variant.id }}#lspod-start\"`;", "const editorLink = (drop) => `${drop}.url }}#lspod-start\"`;"],
  ['patches.mjs', 'liquid', 'Liquid: Link ohne Editor-Anker', "#lspod-start\"`;\nfunction cover", "\"`;\nfunction cover"],
  ['patches.mjs', 'liquid', 'Liquid: Knopftext der Shopliste bleibt «Entwurf öffnen»', "{{ 'luxe_clothing.design_cta' | t }}`, 'Category Knopf');", "{{ 'luxe_category.draft_cta' | t }}`, 'Category Knopf');"],
  ['patches.mjs', 'liquid', 'Liquid: Manifest ohne Variantenkarte', ", \"variantenkarte\": {{ 'luxe-clothing-variantenkarte.json' | asset_url | json }}", ""],
  ['patches.mjs', 'liquid', 'Liquid: Manifest ohne Ausblenden', ", \"ausblenden\": {{ 'luxe-clothing-ausblenden.json' | asset_url | json }}", ""],
  ['patches.mjs', 'liquid', 'Liquid: Sektion gibt das Label none_orderable nicht weiter', "const neu = NEUE_SCHLUESSEL.map((k) => `      \"${k}\": {{ 'luxe_clothing.${k}' | t | json }},\\n`).join('');", "const neu = NEUE_SCHLUESSEL.slice(1).map((k) => `      \"${k}\": {{ 'luxe_clothing.${k}' | t | json }},\\n`).join('');"],
  ['patches.mjs', 'liquid', 'Liquid: Sektion ohne json-Filter', "`      \"${k}\": {{ 'luxe_clothing.${k}' | t | json }},\\n`).join('');\n  let t = einmal(text, anker", "`      \"${k}\": {{ 'luxe_clothing.${k}' | t }},\\n`).join('');\n  let t = einmal(text, anker"],
  // ---- Texte und Sprachdateien ----
  ['patches.mjs', 'text', 'Text: Hinweis sagt noch «alle anderen noch nicht»', "notice: 'Hier siehst du nur Modelle, die du bei LuxeStyle gestalten und bestellen kannst.", "notice: 'Produktkatalog zur Auswahl. Modelle mit dem Knopf «Jetzt selbst gestalten» lassen sich im Shop gestalten und bestellen, alle anderen noch nicht."],
  ['patches.mjs', 'text', 'Text: Satz bei null Modellen mit ß', "none_orderable: 'Im Moment ist kein Modell zum Selbstgestalten bestellbar. Bitte schau später wieder vorbei.'", "none_orderable: 'Im Moment ist kein Modell zum Selbstgestalten bestellbar. Bitte schau später wieder vorbei, wir räumen auf, weiß man ja.'"],
  ['patches.mjs', 'text', 'Text: orderable_variants ohne Zähler', "orderable_variants: '[count] bestellbare Ausführungen'", "orderable_variants: 'bestellbare Ausführungen'"],
  ['patches.mjs', 'text', 'Text: end_note verspricht weiter eine Vorschau (de)', "end_note: 'Grössen, Farben und Ausführungen hängen vom gewählten Produkt ab.',", "end_note: 'Grössen, Farben und Ausführungen hängen vom gewählten Produkt ab. Dein Entwurf bleibt eine Vorschau.',"],
  ['patches.mjs', 'text', 'Text: englischer Hinweis nennt noch die alte Regel', "notice: 'You only see models that you can design and order at LuxeStyle.", "notice: 'Product catalogue. Models with the «Design it yourself now» button can be designed and ordered in the shop, all others not yet."],
  ['patches.mjs', 'text', 'Text: notice wird angehängt statt ersetzt (doppelter Schlüssel)', "const r = ersetzeZeile(block, k, t[k]);", "const r = k === 'notice' ? null : ersetzeZeile(block, k, t[k]);"],
  ['patches.mjs', 'text', 'Text: Sprachdatei verliert den Kommentarkopf', "let aus = text.slice(0, a) + block + text.slice(e + 1);", "let aus = text.slice(text.indexOf('{')).slice(0, a - text.indexOf('{')) + block + text.slice(e + 1);"],
  ['patches.mjs', 'text', 'Text: Anker-Prüfung gelockert (zweimal reicht)', "if (teile.length !== 2) throw new Error(`Anker «${name}»", "if (teile.length < 2) throw new Error(`Anker «${name}»"],
  ['patches.mjs', 'text', 'Text: Marke nicht an das Ende des JS', "return t.replace(/\\s*$/, '\\n') + `/* ${MARKE} */\\n`;", "return t;"],
  ['patches.mjs', 'text', 'Text: Ausblenden-Datei ohne Varianten', "\"varianten\":{\\n${zeilen.join(',\\n')}\\n}}\\n`;", "\"varianten\":{}}\\n`;"],
  ['patches.mjs', 'text', 'Text: Ausblenden-Datei ohne Modell 484', "const modelle = zahlen(q.modelle_ausblenden);", "const modelle = zahlen(q.modelle_ausblenden).filter((m) => m !== 484);"],
  // ---- Daten ----
  ['daten/variantenkarte.json', 'daten', 'Daten: Variantenkarte tauscht Farbe einer Ausführung des T-Shirts (Modell 71)', "\"71\":[[4025,\"Aqua\",\"2XL\"]", "\"71\":[[4025,\"Aquax\",\"2XL\"]"],
  ['daten/variantenkarte.json', 'daten', 'Daten: Variantenkarte ordnet eine Ausführung dem falschen Modell zu', "\"19\":[[1320,", "\"19\":[[9990001,"],
  ['daten/ausblenden-quelle.json', 'daten', 'Daten: Ausblenden-Quelle ohne eine Variante', "\"71\": [\n9369\n],", "\"71\": [],"],
  // ---- apply.mjs ----
  ['apply.mjs', 'apply', 'apply: Schritt 1 und 2 vertauscht', "const SCHRITT2 = [DATEIEN.CSS, DATEIEN.JS];", "const SCHRITT2 = [DATEIEN.CSS, DATEIEN.JS, DATEIEN.CATEGORY];"],
  ['apply.mjs', 'apply', 'apply: MD5-Wächter weg', "const ausgang = ALT.every((n) => jetzt[n].md5 === MD5_VOR[n]) && NEU.every((n) => !jetzt[n]);\nif (!ausgang && ", "const ausgang = true;\nif (false && "],
  ['apply.mjs', 'apply', 'apply: neue Dateien dürfen schon da sein', "&& NEU.every((n) => !jetzt[n]);\nif (!ausgang && ", ";\nif (!ausgang && "],
  ['apply.mjs', 'apply', 'apply: Merkliste nicht geschrieben', "writeFileSync(MERKLISTE, JSON.stringify({ erstellt", "void (JSON.stringify({ erstellt"],
  ['apply.mjs', 'apply', 'apply: Warten auf Schritt 1 übersprungen', "if (!(await warteBisGleich(sollMd5, SCHRITT1, 150000))) {", "if (false) {"],
  ['apply.mjs', 'apply', 'apply: Prüfsumme im Wartepunkt ignoriert', "const offen = namen.filter((n) => (soll[n] === null ? nach[n] != null : nach[n]?.md5 !== soll[n]));", "const offen = [];"],
  ['apply.mjs', 'apply', 'apply: Sicherung nicht gegen Ausgangsstand geprüft', "if (md5(sich[n]) !== MD5_VOR[n]) {", "if (false) {"],
  ['apply.mjs', 'apply', 'apply: Rücknahme erkennt fremde Dateien nicht', "if (fremde.length && !FREMD_OK) {", "if (false) {"],
  ['apply.mjs', 'apply', 'apply: Rücknahme schreibt auch unveränderte Dateien', "const zuSchreiben = ALT.filter((n) => zustand[n] === 'neu' || zustand[n] === 'fremd');", "const zuSchreiben = ALT.slice();"],
  ['apply.mjs', 'apply', 'apply: Rücknahme löscht die neuen Dateien nicht', "const zuLoeschen = NEU_BEHALTEN ? [] : NEU.filter((n) => zustand[n] === 'neu' || zustand[n] === 'fremd');", "const zuLoeschen = [];"],
  ['apply.mjs', 'apply', 'apply: Rücknahme löscht, ohne vorher zurückzuschreiben', "if (rueck1.length) await schreiben(sich, rueck1);\n    if (zuLoeschen.length) {", "if (zuLoeschen.length) {"],
  ['apply.mjs', 'apply', 'apply: NEUE_BEHALTEN wird ignoriert', "const zuLoeschen = NEU_BEHALTEN ? [] : NEU", "const zuLoeschen = NEU"],
  ['apply.mjs', 'apply', 'apply: Löschfehler ohne Abbruch', "console.error(TEILZUSTAND); process.exit(5); }\n}\n// Wartet", "console.error(TEILZUSTAND); }\n}\n// Wartet"],
  ['apply.mjs', 'apply', 'apply: Rücknahme Code nach Texten', "if (rueck2.length) await schreiben(sich, rueck2);\n    if (rueck2.length && rueck1.length && !(await", "if (rueck1.length) await schreiben(sich, rueck1);\n    if (rueck2.length) await schreiben(sich, rueck2);\n    if (false && rueck2.length && rueck1.length && !(await"],
  ['apply.mjs', 'apply', 'apply: Ausnahme beim Schreiben still', "  process.exit(7);\n}\nprocess.exit(endCode);", "  process.exit(0);\n}\nprocess.exit(endCode);"],
  ['apply.mjs', 'apply', 'apply: Teilzustand beim erneuten LIVE nicht erkannt', "|| NEU.some((n) => jetzt[n]) || (merk && ALT.some((n) => jetzt[n].md5 === merk[n] && merk[n] !== MD5_VOR[n]));", ";"],
  ['apply.mjs', 'apply', 'apply: userErrors ohne Abbruch', "console.error(TEILZUSTAND); process.exit(5); }\n}\nasync function loeschen", "console.error(TEILZUSTAND); }\n}\nasync function loeschen"],
  ['apply.mjs', 'apply', 'apply: Rücklesen meldet immer gut', "endCode = (await pruefenNachSchreiben(sollMd5, 'neu')) ? 0 : 6;", "endCode = 0;"],
  ['apply.mjs', 'apply', 'apply: Rücklesen nach Rücknahme meldet immer gut', "rueckCode = (await pruefenNachSchreiben(sollNachher, 'zurück')) ? 0 : 6;", "rueckCode = 0;"],
  ['apply.mjs', 'apply', 'apply: fremde neue Datei wird nicht erkannt', "if (fremdNeu.length) {", "if (false) {"],
  ['apply.mjs', 'apply', 'apply: Hinweis auf passende Anker fehlt', "console.error('  Hinweis: Die Anker von patches.mjs passen noch auf den aktuellen Live-Stand.", "console.error('  ');void ('  Hinweis: Die Anker von patches.mjs passen noch auf den aktuellen Live-Stand."],
  ['apply.mjs', 'apply', 'apply: Sicherung nur der JS-Datei', "for (const n of ALT) if (!existsSync(sichDatei(n))) writeFileSync(sichDatei(n), alt[n]);", "for (const n of [DATEIEN.JS]) if (!existsSync(sichDatei(n))) writeFileSync(sichDatei(n), alt[n]);"],
  ['apply.mjs', 'apply', 'apply: Löschen mit Dateinamen als Objekte', "{ id: th.id, files: namen })).themeFilesDelete;", "{ id: th.id, files: namen.map((f) => ({ filename: f })) })).themeFilesDelete;"],
  // ---- Korrekturrunde 06.11.2026: neue JS-Stellen ----
  ['patches.mjs', 'js', 'JS: Einzahl der Ergebniszeile fehlt', "t(filtered.length===1?'results_one':'results',{count:filtered.length})", "t('results',{count:filtered.length})"],
  ['patches.mjs', 'js', 'JS: Einzahl der Ergebniszeile gilt auch bei null Treffern', "t(filtered.length===1?'results_one':'results'", "t(filtered.length<2?'results_one':'results'"],
  ['patches.mjs', 'js', 'JS: Einzahl der bestellbaren Ausführungen fehlt', "(variants.length===1?t('orderable_variants_one'):t('orderable_variants'/* ${MARKE} */,{count:variants.length}))", "t('orderable_variants'/* ${MARKE} */,{count:variants.length})"],
  ['patches.mjs', 'js', 'JS: Einzahl der bestellbaren Ausführungen gilt auch bei zwei', "variants.length===1?t('orderable_variants_one')", "variants.length<3?t('orderable_variants_one')"],
  ['patches.mjs', 'js', 'JS: Karte und Ausblenden starten erst nach dem Index', "lxEarly(); /* ${MARKE} */ const raw = await readAsset(config.assets?.index);", "/* ${MARKE} */ const raw = await readAsset(config.assets?.index);"],
  ['patches.mjs', 'js', 'JS: Karte und Ausblenden starten erst nach dem Index (Aufruf hinter den Index-Abruf verschoben)', "lxEarly(); /* ${MARKE} */ const raw = await readAsset(config.assets?.index);", "/* ${MARKE} */ const raw = await readAsset(config.assets?.index); lxEarly();"],
  ['patches.mjs', 'js', 'JS: Vorabruf der Ausblenden-Datei fehlt', "lxLoads.hide=config.assets?.ausblenden?go(config.assets.ausblenden):null;", "lxLoads.hide=config.assets?.ausblenden?readAsset(config.assets.ausblenden):null;"],
  ['patches.mjs', 'js', 'JS: veraltetes Dokument zeigt den allgemeinen Ladefehler', "t(lxReload?'reload_needed':'load_error')", "t('load_error')"],
  ['patches.mjs', 'js', 'JS: veraltetes Dokument zeigt den nutzlosen Knopf «Erneut versuchen»', "retry.hidden = lxReload;", "retry.hidden = false;"],
  ['patches.mjs', 'js', 'JS: veraltetes Dokument zeigt alle 572 Modelle (fail-open)', "      if(!lxLoads.map) throw new Error('LX_RELOAD');", "      if(!lxLoads.map) return;"],
  ['patches.mjs', 'js', 'JS: Ladefehler der Karte wird zum Neuladen-Satz', "lxReload = !!lxErr && lxErr.message === 'LX_RELOAD';", "lxReload = !!lxErr;"],
  ['patches.mjs', 'js', 'JS: Direktlink auf ein verborgenes Modell bleibt stumm', "else showMessage(t('model_unavailable'));", ""],
  ['patches.mjs', 'js', 'JS: Direktlink meldet auch bei einem sichtbaren Modell', "if(product)openDetails(product,null);else showMessage(t('model_unavailable'));", "if(product)openDetails(product,null);showMessage(t('model_unavailable'));"],
  ['patches.mjs', 'js', 'JS: nicht lieferbare Angebote stehen zur Wahl', "(data.offers.some(item=>item.available!==false)?data.offers.filter(item=>item.available!==false):data.offers /* ${MARKE} */).forEach(", "(data.offers /* ${MARKE} */).forEach("],
  // (Mutant «Angebotsauswahl leer, wenn alle Angebote unlieferbar sind» gestrichen: gleichwertig, der Zweig ist unerreichbar, weil variantsFor nur Ausführungen mit mindestens einem lieferbaren Angebot durchlässt)
  ['patches.mjs', 'js', 'JS: Schuh-Satz immer', "if(products.some(p=>list(p.sizes).some(s=>/^EU\\\\b/i.test(displaySize(s,p))))){", "if(true){"],
  ['patches.mjs', 'js', 'JS: Schuh-Satz nie', "if(products.some(p=>list(p.sizes).some(s=>/^EU\\\\b/i.test(displaySize(s,p))))){", "if(false){"],
  ['patches.mjs', 'js', 'JS: Schuh-Satz nur im Kopf, nicht im Dialog', "[['.lcl-notice','notice'],['.lcl-dialog-notice','dialog_notice']]", "[['.lcl-notice','notice']]"],
  ['patches.mjs', 'js', 'JS: Klasse bei null Modellen fehlt', "root.classList.toggle('lcl-no-models',!products.length);", ""],
  ['patches.mjs', 'js', 'JS: Klasse bei null Modellen gilt immer', "root.classList.toggle('lcl-no-models',!products.length);", "root.classList.toggle('lcl-no-models',true);"],
  // ---- CSS, Liquid, Texte ----
  ['patches.mjs', 'css', 'CSS: leere Filterfläche bleibt bei null Modellen sichtbar', ".lcl-catalog.lcl-no-models .lcl-discovery,.lcl-catalog.lcl-no-models .lcl-result-line{display:none}", ""],
  ['patches.mjs', 'liquid', 'Liquid: der Dialog trägt weiter den langen Hinweis', "  t = einmal(t, `<p class=\"lcl-dialog-notice\">{{ 'luxe_clothing.notice' | t }}</p>`, `<p class=\"lcl-dialog-notice\">{{ 'luxe_clothing.dialog_notice' | t }}</p>`, 'Section Dialog-Hinweis');", ""],
  ['patches.mjs', 'liquid', 'Liquid: Vorschau-Skript der Titelkacheln erkennt die Editor-Ziele nicht', "  t = einmal(t, `target.searchParams.get('view') === 'luxe-studio'`, `(target.searchParams.get('view') === 'luxe-studio' || target.hash === '#lspod-start')`, 'Cover Vorschau-Skript');", ""],
  ['patches.mjs', 'liquid', 'Liquid: Vorschau-Skript der Shopliste erkennt die Editor-Ziele nicht', "  t = einmal(t, `target.searchParams.has('view')`, `(target.searchParams.has('view') || target.hash === '#lspod-start')`, 'Category Vorschau-Skript');", ""],
  ['patches.mjs', 'text', 'Text: shop_intro verspricht noch einen Entwurf (de)', "shop_intro: 'Wähle ein Produkt und gestalte es auf der Produktseite mit deinem eigenen Motiv.',", "shop_intro: 'Wähle ein vorhandenes Shopprodukt und öffne den Gestaltungsentwurf. Individuelle Motive können hier noch nicht bestellt werden.',"],
  ['patches.mjs', 'text', 'Text: shop_intro verspricht noch einen Entwurf (en)', "shop_intro: 'Choose a product and design it on the product page with your own artwork.',", "shop_intro: 'Choose an existing shop product and open its design draft. Custom designs cannot yet be ordered here.',"],
  ['patches.mjs', 'text', 'Text: preview_note sagt noch «nicht möglich» (de)', "preview_note: 'Wähle ein Produkt, gestalte es auf der Produktseite mit deinem eigenen Motiv und bestelle es dort.',", "preview_note: 'Gestaltungsvorschau: Entwurf ausprobieren. Eine Bestellung mit eigenem Design ist hier noch nicht möglich.',"],
  ['patches.mjs', 'text', 'Text: intro nennt wieder Kinderkleidung (de)', "intro: 'Von T-Shirts und Hoodies bis zu Tassen, Taschen und Handyhüllen.", "intro: 'Von T-Shirts und Kinderkleidung bis zu Tassen, Taschen und Handyhüllen."],
  ['patches.mjs', 'text', 'Text: intro nennt wieder kidswear (en)', "intro: 'From T-shirts and hoodies to mugs, bags and phone cases.", "intro: 'From T-shirts and kidswear to mugs, bags and phone cases."],
  ['patches.mjs', 'text', 'Text: Hinweis trägt wieder den Schuh-Satz (de)', "Gestaltet und bestellt wird auf der Produktseite im Shop.',\n    dialog_notice:", "Gestaltet und bestellt wird auf der Produktseite im Shop. Schuhgrössen: Europa-Tabelle des Herstellers, «ca.» = ungefähr.',\n    dialog_notice:"],
  ['patches.mjs', 'text', 'Text: Dialog-Hinweis wiederholt den Satz zur Produktseite (de)', "dialog_notice: 'Hier siehst du nur Ausführungen, die du bei LuxeStyle gestalten und bestellen kannst.',", "dialog_notice: 'Hier siehst du nur Ausführungen, die du bei LuxeStyle gestalten und bestellen kannst. Gestaltet und bestellt wird auf der Produktseite im Shop.',"],
  ['patches.mjs', 'text', 'Text: Einzahl «1 Modelle» (de)', "results_one: '1 Modell in dieser Auswahl',", "results_one: '1 Modelle in dieser Auswahl',"],
  ['patches.mjs', 'text', 'Text: Einzahl «1 bestellbare Ausführungen» (de)', "orderable_variants_one: '1 bestellbare Ausführung',", "orderable_variants_one: '1 bestellbare Ausführungen',"],
  ['patches.mjs', 'text', 'Text: Einzahl fehlt in der Sektion (ein Label weniger)', "'orderable_variants_one', 'results_one', 'reload_needed'", "'results_one', 'reload_needed'"],
  // ---- apply.mjs: gleichzeitige Schreiber ----
  ['apply.mjs', 'apply', 'apply: kein frisches Lesen kurz vor dem Schreiben', "const abw = [...ALT.filter((n) => frisch[n]?.md5 !== MD5_VOR[n]), ...NEU.filter((n) => frisch[n])];", "const abw = [];"],
  ['apply.mjs', 'apply', 'apply: kein frisches Lesen vor Schritt 2', "const fremdAenderung = SCHRITT2.filter((n) => vorSchritt2[n]?.md5 !== MD5_VOR[n]);", "const fremdAenderung = [];"],
  ['apply.mjs', 'apply', 'apply: vor Schritt 2 wird nur das JS geprüft', "const fremdAenderung = SCHRITT2.filter((n) => vorSchritt2[n]?.md5 !== MD5_VOR[n]);", "const fremdAenderung = [DATEIEN.JS].filter((n) => vorSchritt2[n]?.md5 !== MD5_VOR[n]);"],
  ['apply.mjs', 'apply', 'apply: vor Schritt 2 wird nur das CSS geprüft', "const fremdAenderung = SCHRITT2.filter((n) => vorSchritt2[n]?.md5 !== MD5_VOR[n]);", "const fremdAenderung = [DATEIEN.CSS].filter((n) => vorSchritt2[n]?.md5 !== MD5_VOR[n]);"],
  ['apply.mjs', 'apply', 'apply: Abbruch vor Schritt 2 mit Exit 0', "    process.exit(4);\n  }\n  await schreiben(neu, SCHRITT2);", "    process.exit(0);\n  }\n  await schreiben(neu, SCHRITT2);"],
  ['apply.mjs', 'apply', 'apply: Rücknahme fasst eine fremd veränderte Datei ohne Marke an (Exit 3)', "'alt' : unberuehrt(n) ? 'unberuehrt' : 'fremd';", "'alt' : 'fremd';"],
  ['apply.mjs', 'apply', 'apply: «unberührt» erkennt die Marke nicht', "!jetzt[n].content.includes(MARKE);", "jetzt[n].content.includes(MARKE);"],
  ['apply.mjs', 'apply', 'apply: «unberührt» gilt für alle Dateien', "const unberuehrt = (n) => SCHRITT2.includes(n) && ", "const unberuehrt = (n) => "],
  ['apply.mjs', 'apply', 'apply: FREMD_UEBERSCHREIBEN schreibt auch unberührte Dateien', "const zuSchreiben = ALT.filter((n) => zustand[n] === 'neu' || zustand[n] === 'fremd');", "const zuSchreiben = ALT.filter((n) => zustand[n] === 'neu' || zustand[n] === 'fremd' || zustand[n] === 'unberuehrt');"],
  ['apply.mjs', 'apply', 'apply: Rücklesen nach der Rücknahme kennt unberührte Dateien nicht', "...Object.fromEntries(ALT.filter((n) => zustand[n] === 'unberuehrt').map((n) => [n, jetzt[n].md5])), ", ""],
  ['apply.mjs', 'apply', 'apply: Rücknahme ohne frisches Lesen vor Texten/Liquid', "if (!(await nochGleich([...rueck1, ...zuLoeschen]))) process.exit(3);", ""],
  ['apply.mjs', 'apply', 'apply: Rücknahme ohne frisches Lesen vor dem Löschen', "if (!(await nochGleich(zuLoeschen))) process.exit(3);", ""],
  ['apply.mjs', 'apply', 'apply: Rücknahme prüft bei Abweichung nur die Texte, nicht die zu löschenden Dateien', "if (!(await nochGleich([...rueck1, ...zuLoeschen]))) process.exit(3);", "if (!(await nochGleich([...rueck1]))) process.exit(3);"],
  ['apply.mjs', 'apply', 'apply: Rücknahme ignoriert nicht sichtbares CSS/JS (Exit 6 fehlt)', "if (rueck2.length && rueck1.length && !(await warteBisGleich(alt, rueck2, 150000))) {", "if (rueck2.length && rueck1.length && (await warteBisGleich(alt, rueck2, 150000), false)) {"],
  ['apply.mjs', 'apply', 'apply: Rücknahme ignoriert nicht sichtbare Texte (Exit 6 fehlt)', "if (rueck1.length && !(await warteBisGleich(alt, rueck1, 150000))) {", "if (rueck1.length && (await warteBisGleich(alt, rueck1, 150000), false)) {"],
  ['apply.mjs', 'apply', 'apply: Rücknahme wartet nicht auf die Texte vor dem Löschen', "if (rueck1.length && !(await warteBisGleich(alt, rueck1, 150000))) {", "if (false) {"],
  ['apply.mjs', 'apply', 'apply: Rücknahme meldet nicht sichtbares CSS/JS mit Exit 0', "Texte, Liquid und neue Dateien NICHT angefasst. ' + WIEDERHOLBAR); process.exit(6); }", "Texte, Liquid und neue Dateien NICHT angefasst. ' + WIEDERHOLBAR); process.exit(0); }"],
  ['apply.mjs', 'apply', 'apply: angehaltene Rücknahme meldet Exit 0', "if (!(await nochGleich([...rueck1, ...zuLoeschen]))) process.exit(3);", "if (!(await nochGleich([...rueck1, ...zuLoeschen]))) process.exit(0);"],
  // ---- Wächter ----
  ['waechter_kern.mjs', 'waechter', 'Wächter: Sammlung über der Grenze erst ab 55', "anzahl !== null && anzahl > GRENZE) meld('ALARM'", "anzahl !== null && anzahl > GRENZE + 5) meld('ALARM'"],
  ['waechter_kern.mjs', 'waechter', 'Wächter: Warnschwelle erst über 45', "anzahl >= WARNSCHWELLE) meld('WARNUNG'", "anzahl > WARNSCHWELLE) meld('WARNUNG'"],
  ['waechter_kern.mjs', 'waechter', 'Wächter: leere Liste bei getaggten Produkten ist kein Alarm', "if (angebote.length === 0 && ((getaggt ?? 0) > 0 ||", "if (angebote.length === 0 && ((getaggt ?? 0) > 9999 ||"],
  ['waechter_kern.mjs', 'waechter', 'Wächter: leere Liste ohne getaggte Produkte ist auch Alarm', "if (angebote.length === 0 && ((getaggt ?? 0) > 0 ||", "if (angebote.length === 0 && (true ||"],
  ['waechter_kern.mjs', 'waechter', 'Wächter: Zusatzschutz-Alter erst ab 15 Tagen', "alterTage > ALTER_TAGE", "alterTage > ALTER_TAGE + 1"],
  ['waechter_kern.mjs', 'waechter', 'Wächter: Zusatzschutz ohne Stand ist in Ordnung', "if (alterTage === null) meld('WARNUNG', 'ausblenden-veraltet', 'Die Zusatzschutz-Datei trägt keinen Stand.');", ""],
  ['waechter_kern.mjs', 'waechter', 'Wächter: ausgeblendete Varianten zählen als sichtbar', "if (hideM.has(m) || hideV.has(vid)) {", "if (hideM.has(m)) {"],
  ['waechter_kern.mjs', 'waechter', 'Wächter: ausgeblendete Modelle zählen als sichtbar', "if (hideM.has(m) || hideV.has(vid)) {", "if (hideV.has(vid)) {"],
  ['waechter_kern.mjs', 'waechter', 'Wächter: nicht lieferbare Angebote zählen als sichtbar', "if (os.some((o) => o.available !== false)) { modelle.add(m);", "if (os.length) { modelle.add(m);"],
  ['waechter_kern.mjs', 'waechter', 'Wächter: Angebot ohne Karteneintrag bleibt unbemerkt', "if (!m) { ohneKarte.push(vid); continue; }", "if (!m) { continue; }"],
  ['waechter_kern.mjs', 'waechter', 'Wächter: kein Alarm bei null sichtbaren Modellen', "if (angebote.length > 0 && sichtbar === 0) meld('ALARM'", "if (false) meld('ALARM'"],
  ['waechter_kern.mjs', 'waechter', 'Wächter: Produkte ohne Angebot bleiben unbemerkt', "getaggt > produkteMitAngebot.size && ", "false && "],
  ['waechter_kern.mjs', 'waechter', 'Wächter: Exitcode des Alarms ist 3', "stufe === 'ALARM' ? 4 :", "stufe === 'ALARM' ? 3 :"],
  ['waechter_kern.mjs', 'waechter', 'Wächter: fehlende Karte bleibt unbemerkt', "if (!karte || !karte.modelle) meld('WARNUNG', 'karte-fehlt',", "if (false) meld('WARNUNG', 'karte-fehlt',"],

];

const NUR = process.env.NUR || '';
const liste = MUTANTEN.filter((m) => !NUR || m[2].includes(NUR));
// die Umgebung bleibt erhalten (PLAYWRIGHT_BROWSERS_PATH, NODE_PATH, RUBY_LIQUID_GEMS); die Tests selbst brauchen keine Shop-Zugangsdaten und lesen sie nicht
const env = (extra = {}) => ({ ...process.env, ...extra });
const lauf = (dir, datei, extra = {}) => new Promise((resolve) => {
  const p = spawn(process.execPath, [join(dir, datei)], { env: env(extra) });
  let aus = ''; p.stdout.on('data', (d) => { aus += d; }); p.stderr.on('data', (d) => { aus += d; });
  const kill = setTimeout(() => p.kill('SIGKILL'), 420000);
  p.on('close', (code) => { clearTimeout(kill); resolve({ code, aus }); });
});
const kopie = () => { const d = mkdtempSync(join(tmpdir(), 'lxmut-')); cpSync(HIER, d, { recursive: true, filter: (s) => !/\/(sicherung\/eingespielt\.json)$/.test(s) }); return d; };

async function testen(dir, art, voll = false) {
  const erg = { patches: null, apply: null, browser: null, waechter: null };
  const p = await lauf(dir, 'patches_test.mjs', { PRUEFSUMME_IGNORIEREN: '1' }); erg.patches = p;
  if (art === 'apply') erg.apply = await lauf(dir, 'apply_test.mjs');
  if (art === 'waechter') erg.waechter = await lauf(dir, 'waechter_test.mjs');
  if (['js', 'css', 'daten'].includes(art)) erg.browser = await lauf(dir, 'test_nur_bestellbar.cjs', { LOKAL: '1', PRUEFSUMME_IGNORIEREN: '1', ...(art === 'css' || voll ? {} : { SCHNELL: '1' }) });
  return erg;
}

console.log('Referenzlauf (unveränderter Stand) …');
{
  const dir = kopie(); const e = await testen(dir, 'js'); const a = await lauf(dir, 'apply_test.mjs'); const w = await lauf(dir, 'waechter_test.mjs');
  rmSync(dir, { recursive: true, force: true });
  if (e.patches.code !== 0 || e.browser.code !== 0 || a.code !== 0 || w.code !== 0) { console.log('Referenzlauf NICHT grün:', { patches: e.patches.code, browser: e.browser.code, apply: a.code, waechter: w.code }); console.log((e.patches.aus + e.browser.aus + a.aus + w.aus).split('\n').filter((z) => /✗| - |FEHLER|ABBRUCH/.test(z)).slice(0, 12).join('\n')); process.exit(2); }
  console.log('Referenzlauf grün (patches_test, Browsertest, apply_test, waechter_test).');
}
writeFileSync(LOG, `Mutationsprobe ${new Date().toISOString()}\n`);
let erkannt = 0, nurText = 0; const uebrig = [], nichtAnwendbar = []; let naechster = 0;
async function arbeiter() {
  while (naechster < liste.length) {
    const [datei, art, name, alt, neu, option] = liste[naechster++];
    const dir = kopie(); const p = join(dir, datei); const text = readFileSync(p, 'utf8'); const teile = text.split(alt);
    if (teile.length !== 2) { console.log('  ?', name, '- Muster kommt', teile.length - 1, '× vor (Mutant nicht anwendbar)'); nichtAnwendbar.push(name); rmSync(dir, { recursive: true, force: true }); continue; }
    writeFileSync(p, teile[0] + neu + teile[1]);
    const e = await testen(dir, art, option === 'voll'); rmSync(dir, { recursive: true, force: true });
    const stufen = ['patches', 'apply', 'browser', 'waechter'].filter((k) => e[k] && e[k].code !== 0);
    const bemerkt = stufen.length > 0;
    if (bemerkt) { erkannt++; if (art !== 'apply' && stufen.length === 1 && stufen[0] === 'patches' && ['js', 'css'].includes(art)) nurText++; } else uebrig.push(name);
    console.log(bemerkt ? `  erkannt (${stufen.join('+')})` : '  ÜBERLEBT', name);
    appendFileSync(LOG, `\n### ${bemerkt ? 'erkannt' : 'ÜBERLEBT'} (${stufen.join('+')}) ${name}\n` + stufen.map((k) => (e[k].aus || '').split('\n').filter((z) => /✗| - |FEHLER|ABBRUCH|Error/.test(z)).slice(0, 3).join('\n')).join('\n') + '\n');
  }
}
await Promise.all(Array.from({ length: PARALLEL }, arbeiter));
console.log(`Mutationsprobe: ${erkannt} von ${liste.length} erkannt` + (nichtAnwendbar.length ? `; nicht anwendbar (?): ${nichtAnwendbar.join('; ')}` : '') + (uebrig.length ? `; übrig: ${uebrig.join('; ')}` : '') + `; davon JS/CSS-Mutanten, die nur der Zeichenkettentest (nicht der Browsertest) bemerkte: ${nurText}`);
process.exit(erkannt === liste.length && !nichtAnwendbar.length ? 0 : 1);
