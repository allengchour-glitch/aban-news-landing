// Mutationsprobe: verändert je einen Satz in patches.mjs, etiketten.mjs, apply.mjs oder daten/ und prüft, dass patches_test.mjs oder apply_test.mjs es bemerkt.
//   node dropship/katalog-einheiten-0411/mutationsprobe.mjs
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const HIER = new URL('.', import.meta.url).pathname;

const MUTANTEN = [
  // patches.mjs
  ['patches.mjs', 'Anker-Prüfung lockern', 'if (teile.length !== 2) throw new Error(`Anker', 'if (teile.length < 2) throw new Error(`Anker'],
  ['patches.mjs', 'Filter-Option nicht ändern', "new Option(joinSizeLabels(labels,value),value)", "new Option(labels.length===1?labels[0]:metricText(value),value)"],
  ['patches.mjs', 'Filter-Chip nicht ändern', "`joinSizeLabels(sizeLabels,sizeFilter.value)`, 'JS Filter-Chip'", "`sizeLabels.length===1?sizeLabels[0]:metricText(sizeFilter.value)`, 'JS Filter-Chip'"],
  ['patches.mjs', 'Filter sortiert nicht numerisch', "{numeric:true}", "{numeric:false}"],
  ['patches.mjs', 'nicht lieferbar bekommt Knopf', 'if(offer.available===false){priceBox', 'if(offer.available===true){priceBox'],
  ['patches.mjs', 'neuer Schlüssel fehlt', "const NEUE_SCHLUESSEL = ['design_cta', ", "const NEUE_SCHLUESSEL = ["],
  ['patches.mjs', 'Wortlaut wie Vorschau-Seite', "design_cta: 'Jetzt selbst gestalten'", "design_cta: 'Jetzt gestalten'"],
  ['patches.mjs', 'CSS nicht anhängen', "return text.replace(/\\s*$/, '\\n') + CSS_NEU;", "return text;"],
  ['patches.mjs', 'notice nicht ersetzen', "const GEAENDERTE_SCHLUESSEL = ['notice', 'shop_price_note'];", "const GEAENDERTE_SCHLUESSEL = ['shop_price_note'];"],
  ['patches.mjs', 'Section ohne letztes Label', "NEUE_SCHLUESSEL.map((k) => `      \"${k}\": {{", "NEUE_SCHLUESSEL.slice(0, 4).map((k) => `      \"${k}\": {{"],
  ['patches.mjs', 'JS-Marke weglassen', "return t.replace(/\\s*$/, '\\n') + `/* ${MARKE} */\\n`;", "return t;"],
  ['patches.mjs', 'Hinweis immer zeigen', "if(offer)priceBox.append(el('p','lcl-small',t('shop_price_note')))", "priceBox.append(el('p','lcl-small',t('shop_price_note')))"],
  ['patches.mjs', 'Formatprüfung der Galerie weg', "if (JSON.stringify(g, null, 2) + '\\n' !== text) throw", "if (false) throw"],
  ['patches.mjs', 'Galerie-Ausgabe kompakt', "return { text: JSON.stringify(neu, null, 2) + '\\n', stat };", "return { text: JSON.stringify(neu), stat };"],
  ['patches.mjs', 'Section ohne Schutz vor Doppelung', "if (text.includes(\"'luxe_clothing.design_cta'\")) throw new Error('Section trägt die neuen Labels schon');", ""],
  ['patches.mjs', 'Filter verbindet wieder alle Etiketten', "if(eu.length)return eu.sort(cmp).join(' / ');", "if(true)return u.sort(cmp).join(' / ');"],
  ['patches.mjs', 'Filter ohne ml-Bereich', "if(u.length&&m.every(Boolean)&&new Set", "if(false&&m.every(Boolean)&&new Set"],
  ['patches.mjs', 'Sprung ohne Fokus', "var gehe = function () { ziel(); fokus(); setTimeout", "var gehe = function () { ziel(); setTimeout"],
  ['patches.mjs', 'Sprung blockiert Strg-Klick', "if (e.defaultPrevented || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;", "if (e.defaultPrevented) return;"],
  ['patches.mjs', 'Sprung überschreibt history.state', "history.replaceState(history.state, '', '#lspod-start')", "history.replaceState(null, '', '#lspod-start')"],
  ['patches.mjs', 'Randfall ohne Schutz', "else if(!known||!variants.length||data.requiresChoice)priceBox.append(el('p','lcl-price-pending',t('shop_price_unknown')));\\n        else{", "else{"],
  ['patches.mjs', 'kein Wechselknopf bei nicht lieferbar', "if(orderableVariants.length)priceBox.append(switchBtn());}else{const cta", "}else{const cta"],
  ['patches.mjs', 'Wechselknopf ohne Fokus', "const c=priceBox.querySelector('[data-lcl-design-cta]');if(c)c.focus();", ""],
  ['patches.mjs', 'Wechselknopf mit schwachem Rand', "border:1px solid #7a6a50", "border:1px solid #bfae94"],
  // patches.mjs: Liquid, Produktseite, CSS, Texte, Kaufbox (Funde des Einspiel-Prüfers: nur Zeichenketten getestet)
  ['patches.mjs', 'Section-Zeilen ohne json-Filter', "`      \"${k}\": {{ 'luxe_clothing.${k}' | t | json }},\\n`", "`      \"${k}\": {{ 'luxe_clothing.${k}' | t }},\\n`"],
  ['patches.mjs', 'Sprung-Skript vor dem Anker', "return einmal(text, anker, anker + SPRUNG_SKRIPT, 'buy-buttons Skript');", "return einmal(text, anker, SPRUNG_SKRIPT + anker, 'buy-buttons Skript');"],
  ['patches.mjs', 'Wechselknopf nimmt die zweite Ausführung', "||orderableVariants[0];selectedColor", "||orderableVariants[1];selectedColor"],
  ['patches.mjs', 'bestellbar-Filter invertiert', "offersFor(v).offers.some(o=>o.available!==false)", "offersFor(v).offers.some(o=>o.available===false)"],
  ['patches.mjs', 'Knopf-Ziel ohne Editor-Anker', "x.hash='lspod-start'", "x.hash=''"],
  ['patches.mjs', 'Hinweis nicht/noch vertauscht', "t(orderableVariants.length?'variant_not_orderable':'not_orderable')", "t(orderableVariants.length?'not_orderable':'variant_not_orderable')"],
  ['patches.mjs', 'Filter ohne Entdoppelung', "const u=[...new Set(labels)],", "const u=[...labels],"],
  ['patches.mjs', 'englischer Knopftext deutsch', "design_cta: 'Design it yourself now'", "design_cta: 'Jetzt selbst gestalten'"],
  ['patches.mjs', 'Hinweis nennt US-Tabelle', "Schuhgrössen stehen in der Europa-Tabelle des Herstellers", "Schuhgrössen stehen in der US-Tabelle des Herstellers"],
  ['patches.mjs', 'Knopf dunkel auf dunkel', "background:#2b261f;color:#fff!important", "background:#2b261f;color:#463d31!important"],
  ['patches.mjs', 'Knopf nur 4 px hoch', "width:100%;min-height:48px;margin:2px 0 12px", "width:100%;min-height:4px;margin:2px 0 12px"],
  ['patches.mjs', 'Fokusring am Knopf weg', ".lcl-design-cta:focus-visible{outline:2px solid #63584a;outline-offset:3px}", ""],
  ['patches.mjs', 'Sprung animiert', "behavior: 'instant'", "behavior: 'smooth'"],
  // apply.mjs (live schreibendes Skript): Test gegen die Attrappe der Theme-API
  ['apply.mjs', 'apply: Schritt 1 und 2 vertauscht', "const SCHRITT1 = [DATEIEN.DE, DATEIEN.EN, DATEIEN.SECTION, DATEIEN.GALERIE];\nconst SCHRITT2 = [DATEIEN.CSS, DATEIEN.JS, DATEIEN.BUY];", "const SCHRITT2 = [DATEIEN.DE, DATEIEN.EN, DATEIEN.SECTION, DATEIEN.GALERIE];\nconst SCHRITT1 = [DATEIEN.CSS, DATEIEN.JS, DATEIEN.BUY];"],
  ['apply.mjs', 'apply: MD5-Wächter weg', "if (NAMEN.every((n) => jetzt[n].md5 === MD5_VOR[n]) === false) {", "if (false) {"],
  ['apply.mjs', 'apply: Merkliste nicht geschrieben', "writeFileSync(MERKLISTE, JSON.stringify({ erstellt", "void (JSON.stringify({ erstellt"],
  ['apply.mjs', 'apply: Warten auf Schritt 1 übersprungen', "if (!(await warteBisGleich(sollMd5, SCHRITT1, 150000))) {", "if (false) {"],
  ['apply.mjs', 'apply: Prüfsumme im Wartepunkt ignoriert', "const offen = namen.filter((n) => nach[n]?.md5 !== sollMd5[n]);", "const offen = [];"],
  ['apply.mjs', 'apply: Sicherung nicht gegen Ausgangsstand geprüft', "if (md5(sich[n]) !== MD5_VOR[n]) {", "if (false) {"],
  ['apply.mjs', 'apply: Rücknahme erkennt fremde Dateien nicht', "if (fremde.length && !FREMD_OK) {", "if (false) {"],
  ['apply.mjs', 'apply: Rücknahme schreibt auch unveränderte Dateien', "const zuSchreiben = NAMEN.filter((n) => zustand[n] === 'neu' || zustand[n] === 'fremd');", "const zuSchreiben = NAMEN.slice();"],
  ['apply.mjs', 'apply: Rücknahme Code nach Texten', "if (rueck2.length) await schreiben(sich, rueck2);\n    if (rueck2.length && rueck1.length) await warteBisGleich(alt, rueck2, 150000);\n    if (rueck1.length) await schreiben(sich, rueck1);", "if (rueck1.length) await schreiben(sich, rueck1);\n    if (rueck2.length && rueck1.length) await warteBisGleich(alt, rueck1, 150000);\n    if (rueck2.length) await schreiben(sich, rueck2);"],
  ['apply.mjs', 'apply: Ausnahme beim Schreiben still', "  process.exit(7);\n}\nprocess.exit(endCode);", "  process.exit(0);\n}\nprocess.exit(endCode);"],
  ['apply.mjs', 'apply: Teilzustand beim erneuten LIVE nicht erkannt', "|| (merk && NAMEN.some((n) => jetzt[n].md5 === merk[n] && merk[n] !== MD5_VOR[n]));", ";"],
  ['apply.mjs', 'apply: userErrors ohne Abbruch', "console.error(TEILZUSTAND); process.exit(5); }\n}", "console.error(TEILZUSTAND); }\n}"],
  ['apply.mjs', 'apply: Rücklesen nach 6 statt 0', "endCode = (await pruefenNachSchreiben(sollMd5, 'neu')) ? 0 : 6;", "endCode = 0;"],
  // etiketten.mjs und Daten
  ['etiketten.mjs', 'Hersteller-Abweichung nur nach oben', "const abw = passende.map((h) => Math.abs(h.wert - rechnung) / rechnung);", "const abw = passende.map((h) => (h.wert - rechnung) / rechnung);"],
  ['etiketten.mjs', 'Herren 11,5/12 für Produkt 657 nicht unsicher', "'657': ['11.5', '12'],", ""],
  ['daten/etiketten.json', 'Datenetikett falsch (Tasse 11 oz = 326 ml)', "\"id\": 1320,\n    \"originalSize\": \"11 oz\",\n    \"displaySizeCh\": \"325 ml\"", "\"id\": 1320,\n    \"originalSize\": \"11 oz\",\n    \"displaySizeCh\": \"326 ml\""],
  // etiketten.mjs
  ['etiketten.mjs', 'titleDe überschreiben', 'if (titel[pid] && !zeile.titleDe)', 'if (titel[pid])'],
  ['etiketten.mjs', 'Can Cooler ohne Nachbearbeitung', "const ETIKETT_NACHBEARBEITUNG = { '764':", "const ETIKETT_NACHBEARBEITUNG = { '0':"],
  ['etiketten.mjs', 'Deckel-Zusatz nicht übersetzen', "[/ With Lid & Straw$/, ' mit Deckel und Strohhalm']", "[/ With Lid & StrawX$/, ' mit Deckel und Strohhalm']"],
  ['etiketten.mjs', 'Titel trotz Widerspruch', "if (!r || r.konflikt) return null;\n  return String(titel)", "if (!r) return null;\n  return String(titel)"],
  ['etiketten.mjs', 'Hersteller-Toleranz zu weit', 'export const TOLERANZ_HERSTELLER = 0.03;', 'export const TOLERANZ_HERSTELLER = 0.5;'],
  ['etiketten.mjs', 'oz in britischen ml', 'export const OZ_ML = 29.5735295625;', 'export const OZ_ML = 28.4130625;'],
  ['etiketten.mjs', 'Kerzen nicht in g', "if (/\\bCandles\\b/i.test(pfad)) return 'g';", "if (/\\bCandlesX\\b/i.test(pfad)) return 'g';"],
  ['etiketten.mjs', 'unsicher nie markieren', "const unsicher = (UNSICHER[String(produktId)] || []).includes(String(roh));", "const unsicher = false;"],
  ['etiketten.mjs', 'Dezimalpunkt statt Komma', "String(n).replace('.', ',')", "String(n)"],
  ['etiketten.mjs', 'Stoffgewicht nicht schützen', "if (/oz\\.?\\s*\\/\\s*y/i.test(roh)) return null;", ""],
  ['etiketten.mjs', 'Schuhzweig aus', "if (tabellen?.[pid]) label = schuhLabel(pid, roh, tabellen);", "if (false) label = schuhLabel(pid, roh, tabellen);"],
  ['etiketten.mjs', 'Rohwert-Widerspruch ignorieren', "if (vorhanden.originalSize !== e.originalSize) throw new Error(", "if (false) throw new Error("],
  ['etiketten.mjs', 'Slides Damen nicht unsicher', "  '598': ['6.5'],\n", ""],
  ['etiketten.mjs', 'Hersteller-Regex ohne Punkt', "oz\\.?\\s*\\(\\s*(\\d+(?:[.,]\\d+)?)", "oz\\s*\\(\\s*(\\d+(?:[.,]\\d+)?)"],
  ['etiketten.mjs', 'Herstellerwert egal welche oz', "Math.abs(h.oz - oz) < 1e-9", "true"],
  ['etiketten.mjs', 'Varianten doppelt anhängen', "const vorhanden = zeile.variants.find((x) => String(x.id) === String(e.id));", "const vorhanden = null;"],
  ['etiketten.mjs', 'Tiernapf als ml', "  if (/Drinkware & coasters/i.test(pfad)) return 'ml';", "  if (/Drinkware & coasters|Pet products/i.test(pfad)) return 'ml';"],
  ['etiketten.mjs', 'Konflikt trotzdem umrechnen', "return { konflikt: { oz, herstellerWert: passende[0].wert, rechnung: Math.round(rechnung), abweichung: Math.max(...abw) } };", "return { wert: Math.round(rechnung), einheit: kind, quelle: 'rechnung', rechnung: Math.round(rechnung) };"],
];

let erkannt = 0; const uebrig = [];
for (const [datei, name, alt, neu] of MUTANTEN) {
  const dir = mkdtempSync(join(tmpdir(), 'lxmut-'));
  cpSync(HIER, dir, { recursive: true });
  const p = join(dir, datei); const text = readFileSync(p, 'utf8');
  const teile = text.split(alt);
  if (teile.length !== 2) { console.log('  ?', name, '- Muster kommt', teile.length - 1, '× vor (Mutant nicht anwendbar)'); uebrig.push(name + ' (nicht anwendbar)'); rmSync(dir, { recursive: true, force: true }); continue; }
  writeFileSync(p, teile[0] + neu + teile[1]);
  let bemerkt = false;
  for (const test of ['patches_test.mjs', 'apply_test.mjs']) {
    const r = spawnSync(process.execPath, [join(dir, test)], { encoding: 'utf8', timeout: 120000 });
    if (r.status !== 0) { bemerkt = true; break; }
  }
  if (bemerkt) erkannt++; else uebrig.push(name);
  console.log(bemerkt ? '  erkannt ' : '  ÜBERLEBT', name);
  rmSync(dir, { recursive: true, force: true });
}
console.log(`Mutationsprobe: ${erkannt} von ${MUTANTEN.length} erkannt` + (uebrig.length ? `; übrig: ${uebrig.join('; ')}` : ''));
process.exit(erkannt === MUTANTEN.length ? 0 : 1);
