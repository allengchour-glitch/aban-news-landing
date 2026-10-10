// mobilfunk.mjs — Geräte mit SIM, die nur 2G/3G können, nicht verkaufen (10.10.2026). Regel: automation/data/mobilfunk_netz_regel.json,
// dieselbe Datei liest automation/mobilfunk_netz_pruefen.py (Bestand + Wächter). Gegenprobe: `node automation/mobilfunk.mjs --test`.
// Anlass: In der Schweiz ist 2G seit Januar 2023 abgeschaltet (Swisscom, Salt, Sunrise), 3G folgt 2025/26 — ein 2G-GPS-Tracker
// ortet hier nichts, eine 2G-Kinderuhr setzt keinen Notruf ab. Die Importer legen solche Geräte als ENTWURF an.
import fs from 'fs';
const R = JSON.parse(fs.readFileSync(new URL('./data/mobilfunk_netz_regel.json', import.meta.url), 'utf8'));
// Python-Muster → JS: (?i) gibt es nicht, Flags 'i'; \b funktioniert für ASCII gleich.
const rx = s => new RegExp(s, 'i');
const KAND = rx(R.kandidat_titel), NICHT = rx(R.nicht_titel), NEU = rx(R.neu), ALT = rx(R.alt), SIM = rx(R.sim);
const BT = rx(R.bluetooth), WLAN = rx(R.wlan), PERSON = /kinder|kids?\b|child|senior|elderly|baby/i;

export function istKandidat(titel) { return KAND.test(titel || '') && !NICHT.test(titel || ''); }

// Gleiches Urteil wie urteil() in mobilfunk_netz_pruefen.py.
export function urteil(titel, text) {
  const t = String(titel || ''), x = String(text || '');
  if (NEU.test(x)) return '4g';
  if (ALT.test(x)) {
    if (/alarm/i.test(t) && WLAN.test(x)) return 'teilweise-2g';
    if (/smartwatch|smart watch/i.test(t) && !PERSON.test(t + ' ' + x.slice(0, 300)) && BT.test(x)) return 'teilweise-2g';
    return 'nur-2g-3g';
  }
  if (SIM.test(x)) return 'unklar-sim';
  if (BT.test(x)) return 'bluetooth';
  return 'unklar';
}

// Für die Importer: true = als Entwurf anlegen (Tag R.draft_tag). Text = CJ-Name + Beschreibung + Variantennamen.
export function nurAltnetz(titel, text) {
  return istKandidat(titel) && urteil(titel, `${titel} ${text}`) === 'nur-2g-3g';
}
export const DRAFT_TAG = R.draft_tag;

if (process.argv[1] && process.argv[1].endsWith('mobilfunk.mjs') && process.argv.includes('--test')) {
  let f = 0;
  for (const k of R.kanarien) {
    const u = urteil(k.text, k.text);
    if (u !== k.soll) { f++; console.log(`  ✗ ${k.text.slice(0, 60)} → ${u} (soll ${k.soll})`); }
  }
  console.log(f ? `MOBILFUNK-JS ${R.kanarien.length - f}/${R.kanarien.length}` : `MOBILFUNK-JS OK ${R.kanarien.length}/${R.kanarien.length}`);
  process.exit(f ? 1 : 0);
}
