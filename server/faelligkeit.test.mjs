/* Gegenprobe der Faelligkeitspruefung — isoliert, mit einem Wegwerf-Verzeichnis.
   Die Frage ist nicht "legt sie an?", sondern "legt sie GENAU EINMAL an?" */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const T = fs.mkdtempSync(path.join(os.tmpdir(), 'faellig-'));
const OFFEN = path.join(T, 'offen'), FERTIG = path.join(T, 'erledigt'), WDH = path.join(T, 'wiederkehrend');
[OFFEN, FERTIG, WDH].forEach(d => fs.mkdirSync(d, { recursive: true }));
fs.writeFileSync(path.join(WDH, 'storefront.json'), JSON.stringify(
  { id: 'storefront', alle_tage: 1, warum: 'test', vorlage: { typ: 'skript', skript: 'x.mjs' } }));
fs.writeFileSync(path.join(WDH, 'woechentlich.json'), JSON.stringify(
  { id: 'woche', alle_tage: 7, warum: 'test', vorlage: { typ: 'skript', skript: 'y.mjs' } }));

const sicherer_name = s => typeof s === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(s) && !s.startsWith('.');
function faellige_anlegen(jetzt) {
  const heute = new Date(jetzt).toISOString().slice(0, 10);
  let gelegt = 0;
  for (const datei of fs.readdirSync(WDH).filter(f => f.endsWith('.json')).sort()) {
    const v = JSON.parse(fs.readFileSync(path.join(WDH, datei), 'utf8'));
    const id = sicherer_name(v.id) ? v.id : path.basename(datei, '.json');
    const alle_tage = Number.isInteger(v.alle_tage) && v.alle_tage > 0 ? v.alle_tage : 1;
    let schon = false;
    for (let i = 0; i < alle_tage && !schon; i++) {
      const tag = new Date(jetzt - i * 86400000).toISOString().slice(0, 10);
      const n = `${id}-${tag}.json`;
      if (fs.existsSync(path.join(FERTIG, n)) || fs.existsSync(path.join(OFFEN, n))) schon = true;
    }
    if (schon) continue;
    fs.writeFileSync(path.join(OFFEN, `${id}-${heute}.json`), '{}');
    gelegt++;
  }
  return gelegt;
}

const TAG1 = Date.parse('2026-09-18T09:00:00Z');
let ok = true;
const pruefe = (was, ist, soll) => { const g = ist === soll; if (!g) ok = false;
  console.log(`${g ? '  ok  ' : '  FEHL'} ${was}: ${ist} (erwartet ${soll})`); };

pruefe('erster Lauf legt beide an', faellige_anlegen(TAG1), 2);
// ⚠️ DER ENTSCHEIDENDE FALL: der Runner laeuft alle 5 Minuten weiter, waehrend der
// Auftrag noch OFFEN liegt. Ohne die offen/-Pruefung waeren das 288 Kopien am Tag.
pruefe('zweiter Lauf (Auftrag noch offen)', faellige_anlegen(TAG1 + 300000), 0);
let n = 0; for (let i = 0; i < 50; i++) n += faellige_anlegen(TAG1 + i * 300000);
pruefe('50 weitere Laeufe am selben Tag', n, 0);

// Quittung geschrieben, offener Auftrag weg — trotzdem nicht neu anlegen.
fs.renameSync(path.join(OFFEN, 'storefront-2026-09-18.json'), path.join(FERTIG, 'storefront-2026-09-18.json'));
fs.renameSync(path.join(OFFEN, 'woche-2026-09-18.json'), path.join(FERTIG, 'woche-2026-09-18.json'));
pruefe('nach der Quittung, selber Tag', faellige_anlegen(TAG1 + 3600000), 0);

// Naechster Tag: der taegliche ist faellig, der woechentliche NICHT.
pruefe('Tag 2: nur der taegliche', faellige_anlegen(TAG1 + 86400000), 1);
fs.renameSync(path.join(OFFEN, 'storefront-2026-09-19.json'), path.join(FERTIG, 'storefront-2026-09-19.json'));
// Tag 8: der woechentliche wieder faellig (7 Tage Fenster ueberschritten).
pruefe('Tag 8: woechentlicher wieder faellig',
       faellige_anlegen(TAG1 + 7 * 86400000) >= 1, true);

fs.rmSync(T, { recursive: true, force: true });
console.log(ok ? '✅ Faelligkeit legt genau einmal an' : '❌ Faelligkeit ist unsicher');
process.exit(ok ? 0 : 1);
