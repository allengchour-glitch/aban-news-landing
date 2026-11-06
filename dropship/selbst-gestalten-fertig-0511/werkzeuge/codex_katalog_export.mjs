// Übergabe an Codex (05.11.2026): kompakte Katalogdaten aus der Inventur (nur lesend, ohne Netz).
//   node codex_katalog_export.mjs [SCRATCH_ORDNER] [ZIEL_ORDNER]
// Liest: <SCRATCH>/katalog/<id>.json (Printful, GEMESSEN 05.11.), versand_alle.json (Schweizer Versandrate), katalog_abgleich.json (Shop-Produkte je Katalogmodell)
// Schreibt: <ZIEL>/modelle.json, titel_offen.csv, groessen_markiert.csv
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { modellkarteBauen } from './modellkarte.mjs';
import { titelDe } from '../../../automation/pod_modell/glossar.mjs';

const SCR = process.argv[2] || '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/sg';
const ZIEL = process.argv[3] || new URL('../../codex-katalog/', import.meta.url).pathname;
mkdirSync(ZIEL, { recursive: true });
const versand = existsSync(SCR + '/versand_alle.json') ? JSON.parse(readFileSync(SCR + '/versand_alle.json', 'utf8')) : {};
const abgleich = JSON.parse(readFileSync(SCR + '/katalog_abgleich.json', 'utf8'));
// Shop-Handles je Katalogmodell (alle SKU-Endungen, nicht nur die erste Variante)
const shopJe = {};
for (const z of abgleich.zeilen || []) for (const id of z.produkte_aus_variant_ids || (z.printful_produkt_id ? [z.printful_produkt_id] : [])) (shopJe[id] ||= new Set()).add(z.handle);
const csv = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';

const ids = readdirSync(SCR + '/katalog').filter((f) => /^\d+\.json$/.test(f)).map((f) => parseInt(f, 10)).sort((a, b) => a - b);
const modelle = [], titelOffen = ['id;typ;titelEn;titelDe_vorschlag;unbekannte_woerter'], groessen = ['id;typ;titelEn;wert;anzeige;markiert;grund'];
for (const id of ids) {
  const karte = modellkarteBauen(JSON.parse(readFileSync(`${SCR}/katalog/${id}.json`, 'utf8')));
  const t = titelDe(karte);
  const v = versand[id] || null;
  const rate = v?.raten?.[0] || null;
  const technischOk = karte.technischeKlasse !== 'UNGEEIGNET';
  const bestellbarCH = !!rate && technischOk;
  const farben = karte.optionen?.farbe || [], groessenOpt = karte.optionen?.groesse || [];
  modelle.push({
    id, typ: karte.typ, titelEn: karte.titelEn, titelDe: t.titel, titelDeQuelle: t.quelle, titelDeUnbekannt: t.unbekannt || [],
    klasse: karte.technischeKlasse, klasseNachEULieferbarkeit: karte.klasse,
    versandCH: rate ? { rateUsd: Number(rate.rateUsd), tageMin: rate.tageMin, tageMax: rate.tageMax } : null, versandFehler: rate ? null : (v?.fehler || 'nicht gemessen'),
    bestellbarCH, grund: !rate ? 'keine Schweizer Versandrate' : !technischOk ? 'technisch ungeeignet (' + (karte.technischerGrundCode || '') + ')' : null,
    platzierungen: (karte.platzierungen || []).map((p) => p.id || p.key).filter(Boolean),
    nVarianten: (karte.varianten || []).length, farben: farben.map((f) => f.name).filter(Boolean), groessen: groessenOpt.map((g) => g.anzeige || g.wert),
    shopHandles: [...(shopJe[id] || [])],
  });
  if ((t.unbekannt || []).length || t.quelle !== 'glossar') titelOffen.push([id, karte.typ, csv(karte.titelEn), csv(t.titel), csv((t.unbekannt || []).join(', '))].join(';'));
  for (const g of groessenOpt) if (g.markiert || g.geaendert === false && /\b(oz|lb|in|inch|"|″)\b/i.test(g.wert || '')) groessen.push([id, karte.typ, csv(karte.titelEn), csv(g.wert), csv(g.anzeige), g.markiert ? 'ja' : 'nein', csv(g.grund || '')].join(';'));
}
writeFileSync(ZIEL + 'modelle.json', JSON.stringify({ erstellt: 'Inventur 05.11.2026 (Printful-API, GEMESSEN)', schemaModellkarte: 1, anzahl: modelle.length, bestellbarCH: modelle.filter((m) => m.bestellbarCH).length, modelle }, null, 0));
writeFileSync(ZIEL + 'titel_offen.csv', titelOffen.join('\n') + '\n');
writeFileSync(ZIEL + 'groessen_markiert.csv', groessen.join('\n') + '\n');
const klassen = modelle.reduce((m, x) => { const k = x.bestellbarCH ? x.klasse : 'NICHT_BESTELLBAR'; m[k] = (m[k] || 0) + 1; return m; }, {});
console.log('Modelle', modelle.length, '| bestellbar in die Schweiz', modelle.filter((m) => m.bestellbarCH).length, '|', JSON.stringify(klassen), '| Titel offen', titelOffen.length - 1, '| Grössen markiert', groessen.length - 1);
