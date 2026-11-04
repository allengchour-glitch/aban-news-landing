// Mutationsprobe: verändert je einen Satz in patches.mjs oder etiketten.mjs und prüft, dass patches_test.mjs es bemerkt.
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
  const r = spawnSync(process.execPath, [join(dir, 'patches_test.mjs')], { encoding: 'utf8' });
  const bemerkt = r.status !== 0;
  if (bemerkt) erkannt++; else uebrig.push(name);
  console.log(bemerkt ? '  erkannt ' : '  ÜBERLEBT', name);
  rmSync(dir, { recursive: true, force: true });
}
console.log(`Mutationsprobe: ${erkannt} von ${MUTANTEN.length} erkannt` + (uebrig.length ? `; übrig: ${uebrig.join('; ')}` : ''));
process.exit(erkannt === MUTANTEN.length ? 0 : 1);
