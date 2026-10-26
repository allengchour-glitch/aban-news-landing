import { verengtPasst, baueVerengt, VERENGT_DATEN } from './kategorien_verengt.mjs';
let ok = 0, fehl = 0;
const ist = (n, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };
const regel = { appliedDisjunctively: true, rules: [{ column: 'TITLE', relation: 'CONTAINS', condition: 'schutzhülle für' }, { column: 'TITLE', relation: 'CONTAINS', condition: 'handyhülle' }] };
const d = { handle: 'handy-huellen', titel: 'Handyhüllen', ruleSet: regel, ausschlussG: ['Animals & Pet Supplies', 'Home & Garden'], ausschlussTitel: 'airtag|halsband|staubschutz', min: 3 };
const p = (title, g = '') => ({ title, g, tags: [] });
ist('echte Hülle', verengtPasst(d, p('Handyhülle Silikon für iPhone 15', 'Electronics > Communications > Telephony')), true);
ist('Hundehalsband fällt über die Google-Kategorie', verengtPasst(d, p('Schutzhülle für Hundehalsband', 'Animals & Pet Supplies > Pet Supplies')), false);
ist('AirTag-Hülle fällt über das Titelmuster', verengtPasst(d, p('Schutzhülle für AirTag', 'Electronics > Electronics Accessories')), false);
ist('Gegenprobe: ohne Google-Kategorie bleibt es drin', verengtPasst(d, p('Handyhülle Leder')), true);
ist('Gegenprobe: Titel passt gar nicht zur Grundregel', verengtPasst(d, p('Sonnenhut', 'Electronics')), false);
ist('nurG: Whitelist', verengtPasst({ ...d, ausschlussG: [], nurG: ['Electronics'] }, p('Handyhülle', 'Apparel & Accessories')), false);
const [k] = baueVerengt([d]);
ist('Format wie kategorien.mjs', [k.id, k.handle, k.tag, k.min, k.bestehend], ['v-handy-huellen', 'handy-huellen', 'sort-handy-huellen', 3, true]);
ist('Daten sind eine Liste', Array.isArray(VERENGT_DATEN), true);
for (const e of VERENGT_DATEN) {
  ist(`Daten ${e.handle}: Pflichtfelder`, !!(e.handle && e.titel && e.ruleSet?.rules?.length), true);
  if (e.ausschlussTitel) { let gut = true; try { new RegExp(e.ausschlussTitel, 'i'); } catch { gut = false; } ist(`Daten ${e.handle}: Regex gültig`, gut, true); }
}
console.log(`${ok} ok, ${fehl} Fehler`); process.exit(fehl ? 1 : 0);
