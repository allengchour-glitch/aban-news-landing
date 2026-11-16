// Baut templates/collection.lxbewegt.json aus der LIVE gelesenen templates/collection.json (live/…):
// gleiche Abschnitte und Reihenfolge, nur lux_hero rendert zusaetzlich lx-kopf-bewegt (vor und nach dem Kopf).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const HIER = path.dirname(new URL(import.meta.url).pathname);
export const ALT = "{% render 'lx-kopf-kompakt' %}";
export const NEU = "{% render 'lx-kopf-bewegt', teil: 'kopf' %}{% render 'lx-kopf-kompakt' %}{% render 'lx-kopf-bewegt', teil: 'fuss' %}";
export function ohneKommentar(s) { const t = s.trimStart(); if (t.startsWith('/*')) return t.slice(t.indexOf('*/') + 2).trimStart(); return t; }
export function umbauen(jsonText) {
  const d = JSON.parse(ohneKommentar(jsonText));
  const h = d.sections && d.sections.lux_hero;
  if (!h || h.type !== 'custom-liquid') throw new Error('lux_hero fehlt oder ist kein custom-liquid');
  if (h.settings.custom_liquid !== ALT) throw new Error('lux_hero hat nicht den erwarteten Inhalt: ' + JSON.stringify(h.settings.custom_liquid).slice(0, 120));
  h.settings.custom_liquid = NEU;
  return d;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const quelle = fs.readFileSync(path.join(HIER, 'live', 'templates', 'collection.json'), 'utf8');
  const d = umbauen(quelle);
  const aus = JSON.stringify(d, null, 2) + '\n';
  fs.mkdirSync(path.join(HIER, 'theme', 'templates'), { recursive: true });
  fs.writeFileSync(path.join(HIER, 'theme', 'templates', 'collection.lxbewegt.json'), aus);
  const alt = JSON.parse(ohneKommentar(quelle));
  // Gegenprobe: ausser lux_hero.custom_liquid alles gleich
  const a = JSON.parse(JSON.stringify(alt)); a.sections.lux_hero.settings.custom_liquid = NEU;
  console.log('Vorlage gebaut,', aus.length, 'Zeichen, md5', crypto.createHash('md5').update(aus).digest('hex'), '| sonst gleich:', JSON.stringify(a) === JSON.stringify(d));
}
