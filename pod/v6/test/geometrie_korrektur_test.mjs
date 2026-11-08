/**
 * Prüfungen zur gemessenen Druckflächen-Korrektur (pod/v6/werkzeug/geometrie_korrektur.json, Messung 08.11.2026,
 * dropship/tshirt-nachmessung-0811). Reine Logik und Dateien, kein Netz, kein Browser.
 *   node pod/v6/test/geometrie_korrektur_test.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modellkarteBauen } from '../../../dropship/selbst-gestalten-fertig-0511/werkzeuge/modellkarte.mjs';
import { korrekturTabelle, korrekturFuer, korrigiereVorlage, korrigiereModellkarte, korrigiereKartenJson, korrigiereVorschauJson } from '../werkzeug/geometrie_korrektur.mjs';
import { bauen } from '../../../dropship/selbst-gestalten-fertig-0511/rollout-v63/build.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HIER, '../../../');
const KATALOG = join(REPO, 'dropship/selbst-gestalten-fertig-0511/target-katalog-20261108/katalog');
const MAPS = join(REPO, 'pod/v6/maps');
let ok = 0, fehler = 0;
function pruefe(name, bedingung, info = '') { if (bedingung) { ok++; } else { fehler++; console.log('  ✗ ' + name + (info ? ' · ' + info : '')); } }
function wirft(name, fn, teil) { try { fn(); pruefe(name, false, 'warf nicht'); } catch (e) { pruefe(name, String(e.message).includes(teil), e.message.slice(0, 120)); } }
const katalog = (id) => JSON.parse(readFileSync(join(KATALOG, id + '.json'), 'utf8'));
const T = korrekturTabelle();
const FELD = { links: 'flaecheLinks', oben: 'flaecheOben', breite: 'flaecheBreite', hoehe: 'flaecheHoehe' };
const KURZ = { links: 'fl', oben: 'fo', breite: 'fb', hoehe: 'fh' };

// 1. Tabelle gegen den Katalog und Plausibilität
pruefe('Tabelle: Schema 1, Quelle und Messdatum genannt', T.schema === 1 && /tshirt-nachmessung-0811/.test(T.quelle) && /^2026-11-08$/.test(T.gemessen));
pruefe('Tabelle: nur 71 und 586 (456 stimmt auf 0,25 px und bleibt unkorrigiert)', JSON.stringify(Object.keys(T.modelle).sort()) === '["586","71"]' && !!T.ohne_korrektur['456']);
for (const [modell, plat] of Object.entries(T.modelle)) for (const [pid, k] of Object.entries(plat)) {
  const roh = modellkarteBauen(katalog(modell));
  const p = roh.platzierungen.find((x) => x.id === pid);
  pruefe(`Modell ${modell} ${pid}: «katalog» der Tabelle = Zahlen von GET /templates im Katalog`, !!p && Object.entries(FELD).every(([kurz, lang]) => Number(p.vorlage[lang]) === k.katalog[kurz]));
  const w = k.wirksam, tw = p.vorlage.vorlageBreite, th = p.vorlage.vorlageHoehe;
  pruefe(`Modell ${modell} ${pid}: wirksame Fläche liegt in der Vorlage`, w.links >= 0 && w.oben >= 0 && w.links + w.breite <= tw && w.oben + w.hoehe <= th);
  const aspektKatalog = k.katalog.breite / k.katalog.hoehe, aspektWirksam = w.breite / w.hoehe;
  pruefe(`Modell ${modell} ${pid}: das Seitenverhältnis bleibt (Abweichung höchstens 0,5 %)`, Math.abs(aspektWirksam / aspektKatalog - 1) < 0.005, `${aspektKatalog.toFixed(4)} gegen ${aspektWirksam.toFixed(4)}`);
  const f = w.breite / k.katalog.breite;
  pruefe(`Modell ${modell} ${pid}: Massstab zwischen 0,98 und 1,03, Lage höchstens 40 Vorlagenpixel verschoben`, f > 0.98 && f < 1.03 && Math.abs(w.oben - k.katalog.oben) <= 40 && Math.abs(w.links - k.katalog.links) <= 40, `f=${f.toFixed(4)}`);
}

// 2. korrigiereVorlage / korrigiereModellkarte
const roh71 = modellkarteBauen(katalog('71'));
const vl = roh71.platzierungen.find((p) => p.id === 'front').vorlage;
const vorher = JSON.stringify(vl);
const neu = korrigiereVorlage(71, 'front', vl);
pruefe('korrigiereVorlage: ändert genau die vier Flächenfelder', Object.keys(vl).every((k) => (Object.values(FELD).includes(k) ? true : JSON.stringify(neu[k]) === JSON.stringify(vl[k]))) && Object.entries(FELD).every(([kurz, lang]) => neu[lang] === T.modelle['71'].front.wirksam[kurz]));
pruefe('korrigiereVorlage: die Eingabe bleibt unverändert (Kopie)', JSON.stringify(vl) === vorher && neu !== vl);
pruefe('ohne Eintrag (Modell 456, Platzierung «back» von 71) bleibt dieselbe Vorlage', korrigiereVorlage(456, 'front', vl) === vl && korrigiereVorlage(71, 'back', vl) === vl);
wirft('Schutz: eine Ausgangsfläche, die nicht der Messung entspricht, bricht ab', () => korrigiereVorlage(71, 'front', { ...vl, flaecheOben: 531 }), 'GEOMETRIE_KORREKTUR_VERALTET');
wirft('Schutz: eine schon korrigierte Vorlage nicht noch einmal korrigieren', () => korrigiereVorlage(71, 'front', neu), 'GEOMETRIE_KORREKTUR_VERALTET');
wirft('Schutz: eine korrigierte Fläche ausserhalb der Vorlage wird abgelehnt', () => korrigiereVorlage(71, 'front', vl, { modelle: { 71: { front: { katalog: T.modelle['71'].front.katalog, wirksam: { links: 2500, oben: 500, breite: 1021, hoehe: 1361 } } } } }), 'GEOMETRIE_KORREKTUR_UNGUELTIG');
const kk = korrigiereModellkarte(roh71);
pruefe('korrigiereModellkarte: «front» korrigiert, die übrigen Platzierungen gleich', kk.platzierungen.every((p, i) => (p.id === 'front' ? p.vorlage.flaecheOben === 498.8 : p === roh71.platzierungen[i])));
pruefe('korrigiereModellkarte: Modell 456 gibt dieselbe Karte zurück', korrigiereModellkarte(modellkarteBauen(katalog('456'))).platzierungen.length > 0 && (() => { const r = modellkarteBauen(katalog('456')); return korrigiereModellkarte(r) === r; })());

// 3. Auslieferungsdateien: die Karten und Vorschaudaten tragen die Korrektur, 456 nicht
const dateien = readdirSync(MAPS).filter((n) => n.endsWith('.karte.json') || n.endsWith('.vorschau.json'));
let gesehen = { 71: 0, 586: 0, 456: 0 };
for (const n of dateien) {
  const d = JSON.parse(readFileSync(join(MAPS, n), 'utf8'));
  for (const [modell, m] of Object.entries(d.modelle ?? {})) {
    if (!['71', '586', '456'].includes(modell)) continue;
    gesehen[modell]++;
    if (n.endsWith('.karte.json')) {
      const f = m.platzierungen.find((p) => p.id === 'front')?.vorlage;
      const soll = modell === '456' ? modellkarteBauen(katalog('456')).platzierungen.find((p) => p.id === 'front').vorlage : null;
      pruefe(`${n} Modell ${modell}: Karte trägt ${modell === '456' ? 'die Katalogfläche (unkorrigiert)' : 'die wirksame Fläche'}`,
        !!f && Object.entries(FELD).every(([kurz, lang]) => f[lang] === (modell === '456' ? soll[lang] : T.modelle[modell].front.wirksam[kurz])));
    } else {
      const f = m.vorlagen?.front;
      pruefe(`${n} Modell ${modell}: Vorschau trägt ${modell === '456' ? 'die Katalogfläche (unkorrigiert)' : 'die wirksame Fläche'}`,
        !!f && Object.entries(KURZ).every(([kurz, lang]) => f[lang] === (modell === '456' ? T.ohne_korrektur && modellkarteBauen(katalog('456')).platzierungen.find((p) => p.id === 'front').vorlage[FELD[kurz]] : T.modelle[modell].front.wirksam[kurz])));
    }
  }
}
pruefe('Auslieferungsdateien: Modell 71, 586 und 456 kommen vor (Karte und Vorschau)', gesehen[71] >= 2 && gesehen[586] >= 2 && gesehen[456] >= 2, JSON.stringify(gesehen));

// 4. Der Rollout-Bau erzeugt genau diese Dateien (Karten = Audit-Belege + Korrektur; ohne die Korrektur im Bau wäre das rot)
const bau = bauen({ write: false, panelModels: [84] });
let verglichen = 0;
for (const o of bau.outputs) {
  pruefe(`Bau = Datei: ${o.asset}`, readFileSync(join(MAPS, o.asset), 'utf8') === o.text); verglichen++;
  if (o.previewText) { pruefe(`Bau = Datei: ${o.previewAsset}`, readFileSync(join(MAPS, o.previewAsset), 'utf8') === o.previewText); verglichen++; }
}
pruefe('Bau: alle 18 Produkte verglichen', bau.outputs.length === 18 && verglichen >= 18);
pruefe('korrigiereKartenJson und korrigiereVorschauJson sind im Bau wirksam (Quelle gegen Ergebnis unterscheidet sich)', (() => {
  const quelle = JSON.parse(readFileSync(join(REPO, 'dropship/selbst-gestalten-fertig-0511/rollout-v63/source/audit/assets/lspod-15422811439489.karte.json'), 'utf8'));
  return quelle.modelle['71'].platzierungen.find((p) => p.id === 'front').vorlage.flaecheOben === 530 && JSON.parse(bau.outputs.find((o) => o.asset === 'lspod-15422811439489.karte.json').text).modelle['71'].platzierungen.find((p) => p.id === 'front').vorlage.flaecheOben === 498.8;
})());

// 5. Zweimaliges Anwenden auf fertige JSON-Dateien bricht ab (kein stilles Doppel-Korrigieren)
const fertig = JSON.parse(bau.outputs.find((o) => o.asset === 'lspod-15422811439489.karte.json').text);
wirft('korrigiereKartenJson auf eine schon korrigierte Karte bricht ab', () => korrigiereKartenJson(fertig), 'GEOMETRIE_KORREKTUR_VERALTET');
const fertigV = JSON.parse(bau.outputs.find((o) => o.asset === 'lspod-15422811439489.karte.json').previewText);
wirft('korrigiereVorschauJson auf schon korrigierte Vorschaudaten bricht ab', () => korrigiereVorschauJson(fertigV), 'GEOMETRIE_KORREKTUR_VERALTET');
pruefe('korrekturFuer: Modell 71 «front» da, 456 nicht', !!korrekturFuer(71, 'front') && korrekturFuer(456, 'front') === null);

console.log(fehler ? `${fehler} von ${ok + fehler} Prüfungen FEHLGESCHLAGEN` : `${ok} Prüfungen bestanden`);
process.exit(fehler ? 1 : 0);
